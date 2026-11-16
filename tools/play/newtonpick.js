/* Which x₁? The Newton's method workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve and a first guess are shown with f(x₀) and
 * f′(x₀) worked out, and four numbers offered; a wrong pick is shut, named as
 * the slip it is and checked on the tangent; the right pick counts, toasts,
 * works the step, and deals a new curve, and a first try is counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('nkRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => NewtonPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#nkPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#nwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['nwCurves', 'nwFig', 'nwStep', 'nwRead', 'nwGoalPanel'];

module.exports = {
  name: 'newtonpick',
  title: 'Which x₁? · pick where the tangent meets the axis',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the Newton\'s method workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve and a first guess, and pick which of four numbers is the next guess\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeNewton');
    t.eq('the Newton\'s method workshop opens', await t.screen(), 's-newton');
    t.eq('stepping by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which x₁\?/);
    t.eq('which x₁ is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, steppers, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('nkBox').innerText)).startsWith(
      'The tangent at x₀ falls f(x₀) to reach the axis'));
    t.ok('the curve and the first guess are shown', /^f\(x\) = .*x².*, x₀ = −?\d$/.test(await t.ev(() => document.getElementById('nkQ').innerText.replace(/\s+/g, ' ').trim())));
    t.ok('with f(x₀) and f′(x₀) worked out', /^f\(−?\d\) = −?\d+, and f′\(−?\d\) = 2 × .+ = −?\d+\.$/.test(await t.ev(() => document.getElementById('nkAt').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#nkPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: x₁ = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (adds f\\(x₀\\)/f′\\(x₀\\) to x₀|takes away f′\\(x₀\\)/f\\(x₀\\)|is −f\\(x₀\\)/f′\\(x₀\\), the step alone|is x₀ − f\\(x₀\\), the height)`).test(r), r);
    t.ok('and checked on the tangent', new RegExp(`Check ${L} on the tangent at x₀, y = −?\\d+ \\+ \\(?−?\\d+\\)?\\(x − \\(?−?\\d\\)?\\): at x = ${N} its height is ${N}, not 0`).test(r), r);
    t.ok('and that number is shut and told as not x₁', await t.ev(i => { const b = document.querySelectorAll('#nkPick button')[i];
      return b.disabled && /\. Not x₁$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(NewtonPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works the step', new RegExp(`^That was it: x₁ = −?\\d − \\(?−?\\d+\\)?/\\(?−?\\d+\\)? = ${N}, and the tangent y = .+ is 0 there, so x₁ is where it meets the axis\\. Here is a new curve\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is x₁, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#nkPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(NewtonPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = NewtonPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#nkPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TANGENT RIDER / 5 steps taken');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#nwTab button, #nkPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#nkPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Step by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, steppers, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('nkPick')));
    t.ok('which x₁ changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Newton.tab = 'hand'; UI.go('s-title'); });
  }
};
