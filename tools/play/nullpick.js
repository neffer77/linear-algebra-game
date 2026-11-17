/* Which arrow is crushed? The null space workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a flat A is drawn and four arrows offered; a wrong
 * pick is shut, named as the slip it is and dotted with both rows; the right
 * pick counts, toasts, dots to 0 with both rows and deals a new A, and a first
 * try is counted apart. Every button is named, the hands-on workshop steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('npRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => NullPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#npPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#nsTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'nullpick',
  title: 'Which arrow is crushed? · pick the null space out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the null space workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a flat A, and pick which of four arrows it crushes\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeNull');
    t.eq('the null space workshop opens', await t.screen(), 's-null');
    t.eq('setting v by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(4242));
    await t.tapText(/Which is crushed\?/);
    t.eq('which is crushed is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the matrices, v, the drawing, the readout and the goals step aside',
      await hidden(t, 'nsSets') && await hidden(t, 'nsVec') && await hidden(t, 'nsFig') && await hidden(t, 'nsRead') && await hidden(t, 'nsGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('npBox').innerText)).startsWith(
      'The second row of A is a multiple of the first, so A is flat'));
    t.ok('A is drawn and read out', await t.ev(() => { const a = document.getElementById('npA');
      return /^A has rows ⟨−?\d, −?\d⟩ and ⟨−?\d, −?\d⟩$/.test(a.getAttribute('aria-label')) && a.querySelectorAll('.mtx .col').length === 2; }));
    const labels = await t.ev(() => [...document.querySelectorAll('#npPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four arrows are offered', labels.length, 4);
    t.ok('each is named by its entries', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: ⟨−?\\d, −?\\d⟩$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is the first row itself|swaps the entries of|changes a sign but leaves the entries|points along the line every Av lands on)`).test(r), r);
    t.ok('and dotted with both rows', new RegExp(`Check ${L} the way the workshop checks v: ⟨.+⟩ · ${L} = .+ = −?\\d+, and ⟨.+⟩ · ${L} = .+ = −?\\d+\\. So A sends ${L} to ⟨−?\\d+, −?\\d+⟩, not ⟨0, 0⟩\\.`).test(r), r);
    t.ok('and that arrow is shut and told as not crushed', await t.ev(i => { const b = document.querySelectorAll('#npPick button')[i];
      return b.disabled && /\. Not crushed$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const a0 = await t.ev(() => JSON.stringify(NullPick.round.A));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick dots to 0 with both rows', /^That was it, v = ⟨−?\d, −?\d⟩: ⟨.+⟩ · v = .+ = 0, and ⟨.+⟩ · v = .+ = 0\. Every multiple of v is crushed too, so the null space is the whole line through ⟨−?\d, −?\d⟩\. Here is a new A\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ A crushes ${'PQRS'[ri]}, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new A with all four open', await t.ev(() => [...document.querySelectorAll('#npPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(NullPick.round.A)) !== a0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = NullPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#npPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'NULL SPACE READER / 5 crushed arrows picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#nsTab button, #npPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#npPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four arrows sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Set v by hand/);
    t.ok('the hand workshop comes back, with its matrices, v, drawing and goals', !(await hidden(t, 'nsSets')) && !(await hidden(t, 'nsVec')) && !(await hidden(t, 'nsFig')) && !(await hidden(t, 'nsGoalPanel')));
    t.ok('and the four arrows are put away', await t.ev(() => !document.getElementById('npPick')));
    t.ok('which is crushed changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Kernel.tab = 'hand'; UI.go('s-title'); });
  }
};
