/* Which coefficient? The Taylor workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: an exponential a·e^(kx) and a power xⁿ are shown,
 * and four numbers offered for the coefficient; a wrong pick is shut, named as
 * the slip it is and checked by Taylor's rule; the right pick counts, toasts,
 * works c × n! back to the slope taken n times, and deals a new term, and a
 * first try is counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('srRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SeriesPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#srPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tyTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const K = '\\(?−?\\d\\)?';
const E = 'e\\^\\(−?\\d?x\\)';
const P = '[²³⁴]';
const AWAY = ['tyCurves', 'tyFig', 'tyStep', 'tyRead', 'tyGoalPanel'];

module.exports = {
  name: 'seriespick',
  title: 'Which coefficient? · pick the number in front of a power of x',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the Taylor workshop can be turned round', await t.ev(() =>
      /Then turn it round: see an exponential, and pick which of four numbers sits in front of a power of x\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTaylor');
    t.eq('the Taylor workshop opens', await t.screen(), 's-taylor');
    t.eq('building it by hand is the pressed mode', await pressed(t), 'true,false,false,false');

    await t.ev(() => R.seed(5353));
    await t.tapText(/Which coefficient\?/);
    t.eq('which coefficient is now the pressed mode', await pressed(t), 'false,true,false,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, drawing, steppers, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('srBox').innerText)).startsWith(
      'Put kx in place of x in eˣ = 1 + x + x²/2! + x³/3! + ….'));
    t.ok('the exponential and the power are shown', new RegExp(`^\\d?${E} = … \\+ c·x${P} \\+ …$`).test(
      await t.ev(() => document.getElementById('srQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#srPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (forgets the factorial|leaves k unraised|divides by \\d, not by \\d!|has the sign turned round|stops the factorial one short)`).test(r), r);
    t.ok('and checked by Taylor\'s rule', new RegExp(`Check ${L}: taking the slope of \\d?${E} (twice|three times|four times) gives \\d × ${K}${P} · ${E}, which is −?\\d+ at 0, and Taylor's rule puts that over \\d! = \\d+ in front of x${P}, so c × \\d+ must be −?\\d+\\. With c = ${N} that is \\(?${N}\\)? × \\d+ = ${N}, not −?\\d+\\.`).test(r), r);
    t.ok('and that number is shut and told as not the coefficient', await t.ev(i => { const b = document.querySelectorAll('#srPick button')[i];
      return b.disabled && /\. Not the coefficient$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(SeriesPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works c × n! back to the slope taken n times', new RegExp(`^That was it: c = −?\\d+/\\d+( = ${N})?, and \\(?${N}\\)? × \\d+ = −?\\d+, the slope of \\d?${E} taken (twice|three times|four times) at 0\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the coefficient, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new term with all four open', await t.ev(() => [...document.querySelectorAll('#srPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(SeriesPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SeriesPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#srPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SERIES READER / 5 coefficients found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tyTab button, #srPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#srPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, drawing, steppers, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('srPick')));
    t.ok('which coefficient changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Taylor.tab = 'hand'; UI.go('s-title'); });
  }
};
