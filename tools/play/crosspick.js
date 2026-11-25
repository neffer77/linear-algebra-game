/* Which u × v? The cross product workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: u and v are shown, four arrows offered; a wrong pick
 * is shut, named as the slip it is and checked by its dot products with u and
 * v; the right pick counts, toasts, is shown square to both and deals a new
 * pair, and a first try is counted apart. Every button is named, the hands-on
 * workshop steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ckRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => CrossPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#ckPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#crTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'crosspick',
  title: 'Which u × v? · pick the cross product out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the cross product workshop can be turned round', await t.ev(() =>
      /Then turn it round: see u and v, and pick which of four arrows is u × v\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCross');
    t.eq('the cross product workshop opens', await t.screen(), 's-cross');
    t.eq('turning v by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(8181));
    await t.tapText(/Which u × v\?/);
    t.eq('which u × v is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the pairs, the drawing, the steps, the swap, the readout and the goals step aside',
      await hidden(t, 'crSets') && await hidden(t, 'crFig') && await hidden(t, 'crSteps') && await hidden(t, 'crSwapRow') && await hidden(t, 'crRead') && await hidden(t, 'crGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('ckBox').innerText)).startsWith(
      'u × v = ⟨u₂v₃ − u₃v₂, u₃v₁ − u₁v₃, u₁v₂ − u₂v₁⟩'));
    t.ok('u and v are shown', /^u = ⟨−?\d, −?\d, −?\d⟩, v = ⟨−?\d, −?\d, −?\d⟩$/.test(await t.ev(() => document.getElementById('ckUV').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#ckPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four arrows are offered', labels.length, 4);
    t.ok('each is named by its parts', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ⟨−?\\d+, −?\\d+, −?\\d+⟩$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is v × u, the order swapped|adds where every slot should take away|works the middle slot the wrong way round|multiplies matching parts)`).test(r), r);
    t.ok('and checked by its dot products with u and v', new RegExp(`${L}·u = .+ = −?\\d+ and ${L}·v = .+ = −?\\d+`).test(r) && /u × v = ⟨.+⟩ = ⟨−?\d+, −?\d+, −?\d+⟩\./.test(r), r);
    t.ok('and that arrow is shut and told as not u × v', await t.ev(i => { const b = document.querySelectorAll('#ckPick button')[i];
      return b.disabled && /\. Not u × v$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(CrossPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out and shown square to both', /^That was it: u × v = ⟨.+⟩ = ⟨.+⟩, and it is square to both: \(u × v\)·u = .+ = 0, \(u × v\)·v = .+ = 0\. Here is a new pair\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is u × v, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four open', await t.ev(() => [...document.querySelectorAll('#ckPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(CrossPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = CrossPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#ckPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'CROSS READER / 5 cross products picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#crTab button, #ckPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#ckPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four arrows sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Turn v by hand/);
    t.ok('the hand workshop comes back, with its drawing, steps and goals', !(await hidden(t, 'crSets')) && !(await hidden(t, 'crFig')) && !(await hidden(t, 'crSteps')) && !(await hidden(t, 'crGoalPanel')));
    t.ok('and the four arrows are put away', await t.ev(() => !document.getElementById('ckPick')));
    t.ok('which u × v changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Cross.tab = 'hand'; UI.go('s-title'); });
  }
};
