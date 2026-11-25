/* Where does it close in? The endless area workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: an endless integral of a/xᵖ is shown, and four
 * numbers offered; a wrong pick is shut, named as the slip it is and checked
 * by the slope of the area out to b; the right pick counts, toasts, works
 * c × (p − 1) back to a, and deals a new curve, and a first try is counted
 * apart. Every button is named, the hands-on workshop steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('taRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => TailPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#taPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tlTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['tlSets', 'tlFig', 'tlStep', 'tlRead', 'tlGoalPanel'];

module.exports = {
  name: 'tailpick',
  title: 'Where does it close in? · pick what an endless area adds up to',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the endless area workshop can be turned round', await t.ev(() =>
      /Then turn it round: see an endless area, and pick which of four numbers it closes in on\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTail');
    t.eq('the endless area workshop opens', await t.screen(), 's-tail');
    t.eq('pushing it out by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5353));
    await t.tapText(/Where does it close in\?/);
    t.eq('where does it close in is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('taBox').innerText)).startsWith(
      'An endless area is a limit: integrate out to b, then let b run to ∞.'));
    t.ok('the endless integral is shown', /^∫₁\^∞ −?\d+\/x[²³⁴⁵⁶⁷] dx$/.test(
      await t.ev(() => document.getElementById('taQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#taPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (divides by \\d, the power before|takes the power down|has the sign turned round|multiplies by \\d where)`).test(r), r);
    t.ok('and checked by the slope of the area out to b', new RegExp(`Check ${L}: the area out to b is c·\\(1 − 1/b[²³⁴⁵⁶]?\\), and its slope in b is c × \\d/b[²³⁴⁵⁶⁷], which must be the curve itself, −?\\d+/b[²³⁴⁵⁶⁷], so c × \\d must be −?\\d+\\. With c = ${N} that is \\(?${N}\\)? × \\d = ${N}, not −?\\d+\\.`).test(r), r);
    t.ok('and that number is shut and told as not where it closes in', await t.ev(i => { const b = document.querySelectorAll('#taPick button')[i];
      return b.disabled && /\. Not where it closes in$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(TailPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works c × (p − 1) back to a', new RegExp(`^That was it: c = −?\\d+(/\\d)?( = ${N})?, and \\(?${N}\\)? × \\d = −?\\d+, so the area out to b, c·\\(1 − 1/b[²³⁴⁵⁶]?\\), grows at the curve's own rate and closes in on c as b runs out forever\\. Here is a new curve\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is where it closes in, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#taPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(TailPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = TailPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#taPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'AREA TAMER / 5 endless areas measured');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tlTab button, #taPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#taPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Push it out by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('taPick')));
    t.ok('where does it close in changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Tail.tab = 'hand'; UI.go('s-title'); });
  }
};
