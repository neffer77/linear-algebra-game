/* Which level? The water level workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve on an interval is shown with its area and
 * width, and four numbers offered; a wrong pick is shut, named as the slip it
 * is and checked against what its level holds; the right pick counts, toasts,
 * divides the area by the width, and deals a new curve, and a first try is
 * counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('agRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => AvgPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#agPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#avTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['avSets', 'avFig', 'avStep', 'avRead', 'avGoalPanel'];

module.exports = {
  name: 'avgpick',
  title: 'Which level? · pick the average value of a curve',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the water level workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve and its area, and pick which of four numbers is its average value\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeAvg');
    t.eq('the water level workshop opens', await t.screen(), 's-avg');
    t.eq('levelling by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which level\?/);
    t.eq('which level is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, level, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('agBox').innerText)).startsWith(
      'Pour the area under a curve into a flat tank'));
    t.ok('the curve and its interval are shown', /^f\(x\) = .*x².* on \[−?\d, −?\d\]$/.test(await t.ev(() => document.getElementById('agQ').innerText.replace(/\s+/g, ' ').trim())));
    t.ok('with its area and width', /^The area, ∫ f dx from x = −?\d to x = −?\d, is −?\d+(?:\/\d+)?, and the width is \d\.$/.test(await t.ev(() => document.getElementById('agArea').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#agPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} is (the area itself|the area ÷ 2|the average of the two ends|f at the middle)`).test(r), r);
    t.ok('and checked against what its level holds', new RegExp(`Check ${L}: a level of ${N} across the width \\d holds ${N} × \\d = ${N}, not the area ${N}\\.`).test(r), r);
    t.ok('and that number is shut and told as not the average', await t.ev(i => { const b = document.querySelectorAll('#agPick button')[i];
      return b.disabled && /\. Not the average$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(AvgPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick spreads the area across the width', new RegExp(`^That was it: the area ${N} ÷ the width \\d = ${N}, and a level of ${N} holds ${N} × \\d = ${N}, the area exactly\\. Here is a new curve\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the average, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#agPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(AvgPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = AvgPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#agPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'LEVEL KEEPER / 5 tanks levelled');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#avTab button, #agPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#agPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Level it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, level, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('agPick')));
    t.ok('which level changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Avg.tab = 'hand'; UI.go('s-title'); });
  }
};
