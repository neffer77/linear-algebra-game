/* Which slope of ln y? The log slope workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a product of powers is shown at a point, and four
 * numbers offered; a wrong pick is shut and named as the slip it is, and
 * checked at the first piece of ln y it gets wrong; the right pick is worked
 * piece by piece, counts, toasts and deals a new curve, and a first try is
 * counted apart. Every button is named, the hand-worked curves step aside
 * and come back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LnPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#lqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lgTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'lnpick',
  title: 'Which slope of ln y? · pick y′ ÷ y for a product of powers',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the log slope workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a product of powers, and pick which of four numbers is the slope of ln y\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLogDiff');
    t.eq('the log slope workshop opens', await t.screen(), 's-logdiff');
    t.eq('working by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(7474));
    await t.tapText(/Which slope of ln y\?/);
    t.eq('which slope of ln y is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the curves, the figure, the x steps, the rules, the readout and the goals step aside', await hidden(t, 'lgSets') && await hidden(t, 'lgFig') && await hidden(t, 'lgXRow') && await hidden(t, 'lgModes') && await hidden(t, 'lgRead') && await hidden(t, 'lgGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('lqBox').innerText)).startsWith(
      'Taking ln turns a product into a sum and a power into a number in front'));
    t.ok('the curve is shown at a point', /^y = x\S*·\(\S+( [+−] \d+)?\)\S* ÷ \(x [+−] \d\)\S*, at x = \d$/.test(await t.ev(() => document.getElementById('lqQ').innerText.trim())), await t.ev(() => document.getElementById('lqQ').innerText));
    const labels = await t.ev(() => [...document.querySelectorAll('#lqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d+(/\\d+)?$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right'), L = 'ABCD'[wrong];
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (drops the power|drops the \\d inside|adds the piece that divides|brings the powers down but never divides|takes one off each power|divides the wrong way round)`).test(r), r);
    t.ok('and checked at the first piece it gets wrong', new RegExp(`Check ${L}: its slope for the piece .+ is −?\\d+(/\\d+)?, but at x = \\d that piece's slope is .+\\.`).test(r), r);
    t.ok('and that number is shut and told as not the slope of ln y', await t.ev(i => { const b = document.querySelectorAll('#lqPick button')[i];
      return b.disabled && /\. Not the slope of ln y$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(LnPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked piece by piece', /^That was it: ln y = .+ln x \+ \d·ln\(.+\) − .*ln\(x [+−] \d\), and at x = \d the pieces' slopes are .+, .+, −.+, which add to −?\d+(\/\d+)?\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the slope of ln y, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#lqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(LnPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LnPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#lqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'LOG SPLITTER / 5 curves split');

    // --- every button is named, it fits, and the hand-worked curves come back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lgTab button, #lqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#lqPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Work it by hand/);
    t.ok('the curves come back, with the figure, the rules and the goals', !(await hidden(t, 'lgSets')) && !(await hidden(t, 'lgFig')) && !(await hidden(t, 'lgModes')) && !(await hidden(t, 'lgGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('lqPick')));
    t.ok('which slope of ln y changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); LogDiff.tab = 'hand'; UI.go('s-title'); });
  }
};
