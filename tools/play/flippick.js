/* Where does it flip? The bend workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a cubic is shown with whole-number coefficients, and
 * four numbers offered; a wrong pick is shut, named as the slip it is and
 * checked by putting it into f″; the right pick counts, toasts, works f″ out
 * to 0 there, and deals a new curve, and a first try is counted apart. Every
 * button is named, the hands-on workshop steps aside and comes back, it fits
 * a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('bkRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => FlipPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#bkPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#bdTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const F2 = 'f″\\(x\\) = −?\\d+x \\+ \\(?−?\\d+\\)?';
const AWAY = ['bdSets', 'bdFig', 'bdStep', 'bdRead', 'bdGoalPanel'];

module.exports = {
  name: 'flippick',
  title: 'Where does it flip? · pick where a cubic changes its bend',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the bend workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a cubic, and pick which of four numbers is where its bend flips\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeBend');
    t.eq('the bend workshop opens', await t.screen(), 's-bend');
    t.eq('sliding it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Where does it flip\?/);
    t.eq('where does it flip is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('bkBox').innerText)).startsWith(
      'The bend flips where the slope of the slope changes sign, so where f″ = 0.'));
    t.ok('the cubic is shown', /^f\(x\) = −?\d?x³ [+−] \d?x²( [+−] \d?x)?( [+−] \d)?$/.test(
      await t.ev(() => document.getElementById('bkQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#bkPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: x = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (loses the sign of b|drops the 2|drops the 6|is −b/\\(2a\\))`).test(r), r);
    t.ok('and checked by putting it into f″', new RegExp(`Check ${L}: ${F2}, and at x = ${N} that is −?\\d+ × \\(?${N}\\)? \\+ \\(?−?\\d+\\)? = ${N}, not 0\\.`).test(r), r);
    t.ok('and that number is shut and told as not where it flips', await t.ev(i => { const b = document.querySelectorAll('#bkPick button')[i];
      return b.disabled && /\. Not where it flips$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(FlipPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works f″ out to 0 there', new RegExp(`^That was it: ${F2} is 0 at x = −?\\d+/\\(?−?\\d+\\)?( = ${N})?, and −?\\d+ × \\(?${N}\\)? \\+ \\(?−?\\d+\\)? = 0, so the bend flips there\\. Here is a new curve\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is where it flips, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#bkPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(FlipPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = FlipPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#bkPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'BEND SPOTTER / 5 bends found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#bdTab button, #bkPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#bkPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Slide it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('bkPick')));
    t.ok('where does it flip changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Bend.tab = 'hand'; UI.go('s-title'); });
  }
};
