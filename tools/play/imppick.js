/* Which slope? The implicit slope workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve a·x² + b·xy + c·y² = k is shown with a point
 * on it, and four numbers offered; a wrong pick is shut, named as the slip it
 * is and checked against 2ax + by + (bx + 2cy)·y′ = 0; the right pick counts,
 * toasts, works y′ = −(2ax + by)/(bx + 2cy) and checks it, and deals a new
 * curve, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('iyRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ImpPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#iyPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#imTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const I = '\\(?−?\\d+\\)?';
const AWAY = ['imSets', 'imFig', 'imStep', 'imRead', 'imGoalPanel'];

module.exports = {
  name: 'imppick',
  title: 'Which slope? · pick the slope of a curve given implicitly',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the implicit slope workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve and a point, and pick which of four numbers is the slope there\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeImplicit');
    t.eq('the implicit slope workshop opens', await t.screen(), 's-implicit');
    t.eq('stepping by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5252));
    await t.tapText(/Which slope\?/);
    t.eq('which slope is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('iyBox').innerText)).startsWith(
      'For a·x² + b·xy + c·y² = k, differentiate both sides in x, letting y depend on x'));
    t.ok('the curve is shown with its point and a, b and c', /^\d?x² [+−] \d?xy \+ \d?y² = \d+, at the point \(−?\d, −?\d\): a = \d, b = −?\d, c = \d\.$/.test(
      await t.ev(() => document.getElementById('iyQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#iyPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: y′ = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is \\(2ax|is −\\(bx|takes xy|forgets the 2s)`).test(r), r);
    t.ok('and checked against 2ax + by + (bx + 2cy)·y′ = 0', new RegExp(`Check ${L}: if y′ were ${N}, then 2ax \\+ by \\+ \\(bx \\+ 2cy\\)·y′ = −?\\d+ \\+ ${I} × \\(?${N}\\)? = ${N}, not 0, so the point would run off the curve\\.`).test(r), r);
    t.ok('and that number is shut and told as not the slope', await t.ev(i => { const b = document.querySelectorAll('#iyPick button')[i];
      return b.disabled && /\. Not the slope$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ImpPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works y′ = −(2ax + by)/(bx + 2cy) and checks it', new RegExp(`^That was it: 2ax \\+ by = 2 × \\d × ${I} \\+ ${I} × ${I} = −?\\d+ and bx \\+ 2cy = ${I} × ${I} \\+ 2 × \\d × ${I} = −?\\d+, so y′ = −${I}\\/${I} = ${N}, and 2ax \\+ by \\+ \\(bx \\+ 2cy\\)·y′ = −?\\d+ \\+ ${I} × \\(?${N}\\)? = 0: the point stays on the curve\\. Here is a new curve\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the slope, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#iyPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(ImpPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ImpPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#iyPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SLOPE UNVEILER / 5 hidden slopes found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#imTab button, #iyPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#iyPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('iyPick')));
    t.ok('which slope changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Implicit.tab = 'hand'; UI.go('s-title'); });
  }
};
