/* Which estimate? The Euler step workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: an equation, a start and a step are shown, and four
 * numbers offered; a wrong pick is shut and named as the slip it is, and
 * checked at the first step it gets wrong; the right pick is worked step by
 * step, counts, toasts and deals a new equation, and a first try is counted
 * apart. Every button is named, the hand-worked walk steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('euRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => EulerPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#euPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ewTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'eulerpick',
  title: 'Which estimate? · pick Euler’s estimate after two steps',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the Euler step workshop can be turned round', await t.ev(() =>
      /Then turn it round: see an equation and a step, and pick which of four numbers is Euler’s estimate\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeEulerWalk');
    t.eq('the Euler step workshop opens', await t.screen(), 's-eulerwalk');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(7474));
    await t.tapText(/Which estimate\?/);
    t.eq('which estimate is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the equations, the steps, the figure, the walk buttons, the readout and the goals step aside', await hidden(t, 'ewSets') && await hidden(t, 'ewHs') && await hidden(t, 'ewFig') && await hidden(t, 'ewWalkRow') && await hidden(t, 'ewRead') && await hidden(t, 'ewGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('euBox').innerText)).startsWith(
      'Euler’s method walks y′ = f(x, y) forward in straight steps'));
    t.ok('the equation is shown with its start and step', /^y′ = −?\d?x [+−] \d?y, y\(0\) = −?\d, step h = 1(\/2)?$/.test(await t.ev(() => document.getElementById('euQ').innerText.trim())), await t.ev(() => document.getElementById('euQ').innerText));
    const labels = await t.ev(() => [...document.querySelectorAll('#euPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d+(/\\d+)?$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right'), L = 'ABCD'[wrong];
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (stops after one step|uses the starting slope for both steps|reads each slope at the far end|adds the whole slope|takes h × slope as the new y)`).test(r), r);
    t.ok('and checked at the step it gets wrong', new RegExp(`Check ${L}: (that is y at x = 1(/2)?, after one step|at step [12], from \\(.+\\), .+\\. The slope at that point is .+ = −?\\d+(/\\d+)?, so y rises by 1(/2)? × .+)\\.`).test(r), r);
    t.ok('and that number is shut and told as not Euler’s estimate', await t.ev(i => { const b = document.querySelectorAll('#euPick button')[i];
      return b.disabled && /\. Not Euler’s estimate$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(EulerPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked step by step', /^That was it: from \(0, −?\d\) the slope is .+, so y goes to .+ at x = 1(\/2)?; then from \(.+\) the slope is .+, so y goes to .+ = −?\d+(\/\d+)? at x = [12]\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is Euler’s estimate, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new equation with all four open', await t.ev(() => [...document.querySelectorAll('#euPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(EulerPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = EulerPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#euPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SURE-FOOTED / 5 walks read');

    // --- every button is named, it fits, and the hand-worked walk comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ewTab button, #euPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#euPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Walk it by hand/);
    t.ok('the walk comes back, with its equations, steps, figure and goals', !(await hidden(t, 'ewSets')) && !(await hidden(t, 'ewHs')) && !(await hidden(t, 'ewFig')) && !(await hidden(t, 'ewWalkRow')) && !(await hidden(t, 'ewGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('euPick')));
    t.ok('which estimate changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); EulerWalk.tab = 'hand'; UI.go('s-title'); });
  }
};
