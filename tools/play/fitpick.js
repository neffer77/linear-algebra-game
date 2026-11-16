/* Which slope fits best? The best fit workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a few points shown and four numbers offered; a
 * wrong pick is shut, named as the slip it is and checked by the misses from
 * the middle point, each times its x gap, which do not add to 0; the right
 * pick counts, toasts, works the slope from the two sums and deals new
 * points, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('fpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => FitPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#fpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ftTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const PV = `(\\(−\\d+(/\\d+)?\\)|\\d+(/\\d+)?)`;
const N = '−?\\d+';
const PN = '(\\(−\\d+\\)|\\d+)';
const PT = `\\(${N}, ${N}\\)`;
const AWAY = ['ftSets', 'ftAmts', 'ftFig', 'ftRead', 'ftGoalPanel'];

module.exports = {
  name: 'fitpick',
  title: 'Which slope fits best? · pick the slope of the best line through a few points',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the best fit workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a few points and pick which of four numbers is the slope of the best line\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeFit');
    t.eq('the best fit workshop opens', await t.screen(), 's-fit');
    t.eq('setting it by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(6363));
    await t.tapText(/Which slope fits best\?/);
    t.eq('which slope fits best is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the sets, steppers, figure, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('fpBox').innerText)).startsWith(
      'The best line, the one whose squared misses add up to the least, goes through the middle point (x̄, ȳ)'));
    const q = await t.ev(() => document.getElementById('fpQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the points are shown', new RegExp(`^Points: ${PT}(, ${PT}){2,3}$`).test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#fpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the misses times their x gaps ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is the slope from the first point to the last, \\(${N} − ${PN}\\) / \\(${N} − ${PN}\\)\\. The points between count too|is the slope between the first two points alone|is Σxy / Σx², the best line forced through \\(0, 0\\)|is ȳ / x̄, the line from \\(0, 0\\) to the middle point|is Σ\\(y − ȳ\\)² / Σ\\(x − x̄\\)\\(y − ȳ\\), x fitted on y)`).test(r), r);
      t.ok('and checked by the misses times their x gaps', new RegExp(`Check ${L}: on the best line the misses from the middle point, each times its x − x̄, add to 0\\. With slope ${SV} they add to Σ\\(x − x̄\\)\\(y − ȳ\\) − ${PV} × Σ\\(x − x̄\\)² = ${SV} − ${PV} × ${SV} = ${SV}, not 0, so a (bigger|smaller) slope fits better\\.`).test(r), r);
      t.ok('and that number is shut and told as not the best slope', await t.ev(i => { const b = document.querySelectorAll('#fpPick button')[i];
        return b.disabled && /\. Not the best slope$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(FitPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the slope from the two sums', new RegExp(`^That was it: x̄ = ${SV} and ȳ = ${SV}, Σ\\(x − x̄\\)\\(y − ȳ\\) = ${SV} and Σ\\(x − x̄\\)² = ${SV}, so m = ${SV} ÷ ${SV} = ${SV}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the best slope, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and new points with all four open', await t.ev(() => [...document.querySelectorAll('#fpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(FitPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = FitPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#fpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'LINE LAYER / 5 best slopes found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ftTab button, #fpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Set it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its sets, steppers, figure, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('fpPick')));
    t.ok('which slope fits best changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Fit.tab = 'hand'; UI.go('s-title'); });
  }
};
