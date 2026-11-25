/* Which slope? The inverse slope workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a rising curve f(x) = (x³ + bx + c)/d and a point
 * that f sends to u shown, and four numbers offered; a wrong pick is shut,
 * named as the slip it is and checked against g′(u) × f′(p) = 1, which it
 * misses; the right pick counts, toasts, works f′ at the point out and flips
 * it, and deals a new curve, and a first try is counted apart. Every button
 * is named, the hands-on workshop steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('vpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => InvPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#vpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ivTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const V = '\\d+(/\\d+)?';
const N = '−?\\d+';
const FX = '(\\()?x³ \\+ \\d*x( [+−] \\d+)?(\\)/\\d+)?';
const FP = '(\\()?3x² \\+ \\d(\\)/\\d+)?';
const AWAY = ['ivSets', 'ivFig', 'ivStep', 'ivModes', 'ivRead', 'ivGoalPanel'];

module.exports = {
  name: 'invpick',
  title: 'Which slope? · pick the slope of an inverse at a point',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Percival');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the inverse slope workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a rising curve and a point, and pick which of four numbers is the slope of its inverse there\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeInvSlope');
    t.eq('the inverse slope workshop opens', await t.screen(), 's-invslope');
    t.eq('mirroring it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which slope\?/);
    t.eq('which slope is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, figure, stepper, modes, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('vpBox').innerText)).startsWith(
      'g is the inverse of f: it sends u back to the x that f sends to u.'));
    const q = await t.ev(() => document.getElementById('vpQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the curve and the point are shown', new RegExp(`^f\\(x\\) = ${FX} is always rising, and f\\(${N}\\) = ${N}\\.$`).test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#vpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${V}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked against g′(u) × f′(p) = 1 ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is f′\\(${N}\\) = ${V} itself|takes f′ at u = ${N}, not at x = ${N}|forgets the /\\d+|forgets the 3 that x³ brings down|forgets the \\d*x)`).test(r), r);
      t.ok(`and checked against g′(u) × f′(p) = 1`, new RegExp(`Check ${L}: g undoes f, so g\\(f\\(x\\)\\) = x, whose slope is 1\\. By the chain rule g′\\(${N}\\) × f′\\(${N}\\) must be 1\\. f′\\(x\\) = ${FP}, so f′\\(${N}\\) = ${V}, and ${V} × ${V} = ${V}, not 1\\.`).test(r), r);
      t.ok('and that number is shut and told as not g′(u)', await t.ev(i => { const b = document.querySelectorAll('#vpPick button')[i];
        return b.disabled && /\. Not g′\(u\)$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(InvPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works f′ at the point out and flips it', new RegExp(`^That was it: f′\\(x\\) = ${FP}, so at x = ${N}, the x that f sends to ${N}, f′\\(${N}\\) = ${V}\\. Flipped, g′\\(${N}\\) = ${V}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is g′\\(u\\), picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#vpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(InvPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = InvPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#vpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SLOPE FLIPPER / 5 slopes flipped');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ivTab button, #vpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Mirror it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, figure, stepper, modes, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('vpPick')));
    t.ok('which slope changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); InvSlope.tab = 'hand'; UI.go('s-title'); });
  }
};
