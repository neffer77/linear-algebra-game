/* Which number in front? The swap workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: an integral to swap shown and four numbers
 * offered; a wrong pick is shut, named as the slip it is and checked by the
 * chain rule, which does not give back the integrand; the right pick counts,
 * toasts, works the swap through and deals a new integral, and a first try
 * is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('usRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SwapPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#usPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#swTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const AWAY = ['swSets', 'swFig', 'swOpts', 'swRead', 'swGoalPanel'];

module.exports = {
  name: 'swappick',
  title: 'Which number in front? · pick the k a u-substitution leaves in front',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the swap workshop can be turned round', await t.ev(() =>
      /Then turn it round: see an integral to swap, and pick which of four numbers goes in front of the answer\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSwap');
    t.eq('the swap workshop opens', await t.screen(), 's-swap');
    t.eq('picking a u by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6566));
    await t.tapText(/Which number in front\?/);
    t.eq('which number in front is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the integrals, the figure, the u buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('usBox').innerText)).startsWith(
      'Swap u for the bracket, u = axᵐ + b.'));
    const q = await t.ev(() => document.getElementById('usQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the integral and its answer with k in front are shown', /^∫ \d*x²?\(−?\d?x[²³] \+ \d\)[²³⁴⁵] dx = k·\(−?\d?x[²³] \+ \d\)[³⁴⁵⁶] \+ C$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#usPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the chain rule ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (swaps dx for du as if they were the same|multiplies by −?\\d+ where it should divide|divides by \\d, the power before it is raised|drops the −?\\d from du|integrates the x²? outside the bracket on its own as well|divides the wrong way round|forgets the \\d that x[²³] brings down)`).test(r), r);
      t.ok('and checked by the chain rule', new RegExp(`Check ${L}: by the chain rule the slope of k·\\(.+\\). is k × \\d × \\(.+\\). × −?\\d+x.?, which must be the integrand .+, so k × \\d × \\S+ = k × \\S+ must be (\\d+)\\. With k = ${SV} that is \\S+ × \\S+ = ${SV}, not \\1\\.`).test(r), r);
      t.ok('and that number is shut and told as not the number in front', await t.ev(i => { const b = document.querySelectorAll('#usPick button')[i];
        return b.disabled && /\. Not the number in front$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(SwapPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the swap through', new RegExp(`^That was it: u = .+ and du = −?\\d+x.? dx, so k = \\d+ ÷ \\S+ ÷ \\d = ${SV}, and \\S+ × \\S+ = \\d+, so the chain rule gives back the integrand\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} goes in front, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new integral with all four open', await t.ev(() => [...document.querySelectorAll('#usPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(SwapPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SwapPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#usPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'BRACKET BREAKER / 5 integrals swapped');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#swTab button, #usPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Pick a u by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its integrals, figure, u buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('dqPick')));
    t.ok('which number in front changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Swap.tab = 'hand'; UI.go('s-title'); });
  }
};
