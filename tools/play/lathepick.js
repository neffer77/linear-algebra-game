/* Which volume? The lathe workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve y = a·xⁿ is spun around the x-axis from 0
 * to b, and four volumes offered; a wrong pick is shut, named as the slip it
 * is and checked by its slope in b, which must be the end disk; the right
 * pick counts, toasts, works π∫ y² dx out, and deals a new solid, and a first
 * try is counted apart. Every button is named, the hands-on workshop steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('vlRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LathePick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#vlPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lhTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const V = '\\d*π(?:/\\d+)?';
const Y = '\\d?(?:√x|x[²³]?)';
const X = 'x[¹²³⁴⁵⁶⁷]?';
const B = '\\d?(?:√b|b[²³]?)';
const M = '(?:\\d+|\\(\\d+/\\d+\\))?(?:√b|b(?:\\^\\(\\d+/2\\)|[²³⁴⁵⁶⁷⁸])?)';
const AWAY = ['lhSets', 'lhFig', 'lhStep', 'lhRead', 'lhGoalPanel'];

module.exports = {
  name: 'lathepick',
  title: 'Which volume? · pick the volume of a solid of revolution',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the lathe workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve spun into a solid, and pick which of four numbers is its volume\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLathe');
    t.eq('the lathe workshop opens', await t.screen(), 's-lathe');
    t.eq('measuring it by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5353));
    await t.tapText(/Which volume\?/);
    t.eq('which volume is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the solids, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('vlBox').innerText)).startsWith(
      'Cut the solid into thin slices across the axis.'));
    t.ok('the curve and its ends are shown', new RegExp(`^Spin y = ${Y} around the x-axis, from x = 0 to x = \\d\\.$`).test(
      await t.ev(() => document.getElementById('vlQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#vlPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four volumes are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${V}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (integrates y itself, not y²|integrates y first and squares the answer|divides by \\d, the power of x in y² before it is raised|squares ${Y.slice(3)} but not the \\d in front|is the cylinder around the solid)`).test(r), r);
    t.ok('and checked by its slope in b', new RegExp(`Check ${L}: push the end b out a little and the solid gains one more thin disk there, holding π·y\\(b\\)², so the volume worked out for any b must have the slope π·\\(${B}\\)² = ${M}·π\\. ${L}, worked out for any b, is ${M}·π, whose slope in b is ${M}·π, not ${M}·π\\.`).test(r), r);
    t.ok('and that volume is shut and told as not the volume', await t.ev(i => { const b = document.querySelectorAll('#vlPick button')[i];
      return b.disabled && /\. Not the volume$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(LathePick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works π∫ y² dx out', new RegExp(`^That was it: V = π∫₀[¹²³⁴] \\d*${X} dx = π\\[\\d*${X}/\\d\\]₀[¹²³⁴] = π × \\d+/\\d = ${V}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the volume, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new solid with all four open', await t.ev(() => [...document.querySelectorAll('#vlPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(LathePick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LathePick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#vlPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'MASTER TURNER / 5 solids measured');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lhTab button, #vlPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#vlPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four volumes sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Measure it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its solids, drawing, stepper, readout and goals', back);
    t.ok('and the four volumes are put away', await t.ev(() => !document.getElementById('vlPick')));
    t.ok('which volume changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Lathe.tab = 'hand'; UI.go('s-title'); });
  }
};
