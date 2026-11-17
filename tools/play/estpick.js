/* Which estimate? The tangent line workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve, a and x shown and four numbers offered; a
 * wrong pick is shut, named as the slip it is and checked at x = a or one
 * step across; the right pick counts, toasts, works f(a) + f′(a)(x − a)
 * through beside the true value and deals a new curve, and a first try is
 * counted apart. Every button is named,
 * the hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tlqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => EstPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#tlqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tlwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(?:/\\d+)?';
const AWAY = ['tlwSets', 'tlwFig', 'tlwMoveRow', 'tlwRead', 'tlwGoalPanel'];

module.exports = {
  name: 'estpick',
  title: 'Which estimate? · pick the tangent line\'s estimate of a curve',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the tangent line workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve and an x near a, and pick which of four numbers is the tangent's estimate\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTanLine');
    t.eq('the tangent line workshop opens', await t.screen(), 's-tanline');
    t.eq('stepping by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(6260));
    await t.tapText(/Which estimate\?/);
    t.eq('which estimate is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, the figure, the step buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('tlqBox').innerText)).startsWith(
      'Near a, a curve and its tangent line are almost the same, so f(x) ≈ L(x) = f(a) + f′(a)(x − a)'));
    const q = await t.ev(() => document.getElementById('tlqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the curve, a and x are shown', /^Estimate (√\d+|∛\d+|1\/\d+\.\d) with the tangent at a = \d+$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#tlqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked where its formula fails ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (leaves off the start|starts at a = |goes x − a = |takes the rise the wrong way|takes the slope of |multiplies the slope by x = )`).test(r), r);
      t.ok('and checked at x = a or one step across', new RegExp(`Check ${L} (at x = a = \\d+: there the tangent touches the curve, so it must give f\\(\\d+\\) = (${SV})\\. ${L}'s formula, .+, gives .+ = ${SV} there, not \\2\\.|one step across: the tangent's slope is f′\\(\\d+\\) = (${SV}), so each 1 that x moves must move it by \\3\\. ${L}'s formula, .+, moves by ${SV}, not \\3\\.)`).test(r), r);
      t.ok('and that number is shut and told as not the estimate', await t.ev(i => { const b = document.querySelectorAll('#tlqPick button')[i];
        return b.disabled && /\. Not the estimate$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(EstPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works f(a) + f′(a)(x − a) through beside the true value', new RegExp(`^That was it: L\\(\\d+(?:\\.\\d)?\\) = ${SV} \\+ \\(?${SV}\\)? × \\(?${SV}\\)? = ${SV} [+−] \\d+(?:/\\d+)? = ${SV}\\. The true (√|∛|1/)\\d+(?:\\.\\d)? ≈ \\d+\\.\\d{4}, so the tangent (overshoots|falls short) by about \\d+\\.\\d{4}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the tangent's estimate, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#tlqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(EstPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = EstPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#tlqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TANGENT TRACKER / 5 estimates made');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tlwTab button, #tlqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Step x by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, figure, step buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('tlqPick')));
    t.ok('which estimate changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); TanLine.tab = 'hand'; UI.go('s-title'); });
  }
};
