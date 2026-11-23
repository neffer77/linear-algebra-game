/* Which slope? The slope workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve and a step shown and four numbers offered;
 * a wrong pick is shut, named as the slip it is and checked by drawing a line
 * of that slope from the first point, which misses the curve at the second;
 * the right pick counts, toasts, works rise over run through and deals a new
 * secant, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('sqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SecantPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#sqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#slTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const AWAY = ['slCurves', 'slFig', 'slStep', 'slSide', 'slRead', 'slGoalPanel'];

module.exports = {
  name: 'secantpick',
  title: 'Which slope? · pick the slope of a secant from four numbers',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the slope workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve and a step, and pick which of four numbers is the secant's slope\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSlope');
    t.eq('the slope workshop opens', await t.screen(), 's-slope');
    t.eq('closing in by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(7027));
    await t.tapText(/Which slope\?/);
    t.eq('which slope is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, the figure, the steppers, the side switch, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('sqBox').innerText)).startsWith(
      'A secant joins two points on a curve, (a, f(a)) and (a + h, f(a + h)).'));
    const q = await t.ev(() => document.getElementById('sqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the curve and the step are shown', /^f\(x\) = −?\d?x²( [+−] \d?x)?( [+−] \d)?, from x = −?\d to x = −?\d+(\/\d+)? \(h = −?\d+(\/\d+)?\)$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#sqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the line they draw ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is the tangent's slope at −?\\d, 2ca \\+ p = −?\\d+: where|is the tangent's slope at the far end, ${SV}\\.|is the rise, f\\(${SV}\\) − f\\(−?\\d\\), not yet divided by the run|divides the wrong way round, run over rise\\.|takes \\(a \\+ h\\)² as a² \\+ h², dropping the 2ah\\.|drops the −?\\d*x\\.)`).test(r), r);
      t.ok('and checked by the line it draws', new RegExp(`Check ${L}: a line of slope ${SV} from \\(−?\\d, ${SV}\\) rises \\(?${SV}\\)? × \\(?${SV}\\)? = ${SV} over the step to x = ${SV}, reaching a height of ${SV}, but the curve is at f\\(${SV}\\) = ${SV} there\\.`).test(r), r);
      t.ok('and that number is shut and told as not the secant\'s slope', await t.ev(i => { const b = document.querySelectorAll('#sqPick button')[i];
        return b.disabled && /\. Not the secant's slope$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(SecantPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works rise over run through', new RegExp(`^That was it: the rise is f\\(${SV}\\) − f\\(−?\\d\\) = ${SV} − \\(?${SV}\\)? = ${SV} over a run of ${SV}, so the slope is \\(?${SV}\\)? ÷ \\(?${SV}\\)? = ${SV}, and c\\(2a \\+ h\\) \\+ p gives the same\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the secant's slope, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new secant with all four open', await t.ev(() => [...document.querySelectorAll('#sqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(SecantPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SecantPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#sqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SECANT SEER / 5 secants read');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#slTab button, #sqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, figure, steppers, side switch, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('sqPick')));
    t.ok('which slope changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Slope.tab = 'hand'; UI.go('s-title'); });
  }
};
