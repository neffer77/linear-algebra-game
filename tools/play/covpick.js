/* Which A? The cover-up workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a fraction (px + q)/((x − r)(x − s)) is shown split
 * as A/(x − r) + B/(x − s), and four numbers offered; a wrong pick is shut,
 * named as the slip it is and checked against the cleared equation at x = r;
 * the right pick counts, toasts, works A by cover-up and checks it, and deals
 * a new fraction, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => CovPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#cqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#cvTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const I = '\\(?−?\\d+\\)?';
const AWAY = ['cvSets', 'cvFig', 'cvStep', 'cvKeep', 'cvRead', 'cvGoalPanel'];

module.exports = {
  name: 'covpick',
  title: 'Which A? · pick a partial fraction by cover-up',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the cover-up workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a fraction split in two, and pick which of four numbers is A\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCover');
    t.eq('the cover-up workshop opens', await t.screen(), 's-cover');
    t.eq('covering up by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5252));
    await t.tapText(/Which A\?/);
    t.eq('which A is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the fractions, drawing, stepper, keep button, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('cqBox').innerText)).startsWith(
      'Cover-up: clear the fractions and px + q = A(x − s) + B(x − r) holds for every x.'));
    t.ok('the fraction is shown split as A and B', /^f\(x\) = \(−?\d?x( [+−] \d)?\)\/\(.+\) = A\/(x|\(x [+−] \d\)) \+ B\/(x|\(x [+−] \d\))$/.test(
      await t.ev(() => document.getElementById('cqQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#cqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: A = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is B|takes the leftover|puts x = |is the top)`).test(r), r);
    t.ok('and checked against the cleared equation at x = r', new RegExp(`Check ${L}: at x = −?\\d the cleared equation reads −?\\d+ = A × ${I}\\. If A were ${N}, that is \\(?${N}\\)? × ${I} = ${N}, not −?\\d+\\.`).test(r), r);
    t.ok('and that number is shut and told as not A', await t.ev(i => { const b = document.querySelectorAll('#cqPick button')[i];
      return b.disabled && /\. Not A$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(CovPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works A by cover-up and checks it', new RegExp(`^That was it: cover up x( [+−] \\d)? and put x = −?\\d into the rest: the top is ${I} × ${I} \\+ ${I} = −?\\d+, what is left of the bottom is −?\\d − ${I} = −?\\d+, so A = −?\\d+\\/${I}( = ${N})?, and \\(?${N}\\)? × ${I} = −?\\d+, the top\\. Here is a new fraction\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is A, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new fraction with all four open', await t.ev(() => [...document.querySelectorAll('#cqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(CovPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = CovPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#cqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'COVER-UP ARTIST / 5 fractions split');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cvTab button, #cqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#cqPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Cover it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its fractions, drawing, stepper, keep button, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('cqPick')));
    t.ok('which A changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Cover.tab = 'hand'; UI.go('s-title'); });
  }
};
