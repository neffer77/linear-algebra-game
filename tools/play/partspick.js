/* Which number alone? The parts workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: an integral to split shown and four numbers
 * offered; a wrong pick is shut, named as the slip it is and checked by the
 * product rule, which does not give back the integrand; the right pick
 * counts, toasts, works the parts through and deals a new integral, and a
 * first try is counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('bqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => PartsPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#bqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#bpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const AWAY = ['bpSets', 'bpFig', 'bpOpts', 'bpRead', 'bpGoalPanel'];

module.exports = {
  name: 'partspick',
  title: 'Which number alone? · pick the number integration by parts leaves alone',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the parts workshop can be turned round', await t.ev(() =>
      /Then turn it round: see an integral to split, and pick which of four numbers stands alone in the answer\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeParts');
    t.eq('the parts workshop opens', await t.screen(), 's-parts');
    t.eq('picking a split by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6863));
    await t.tapText(/Which number alone\?/);
    t.eq('which number alone is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the integrals, the figure, the split buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('bqBox').innerText)).startsWith(
      'Split it: u = ax + b, to differentiate, and dv = eᵏˣ dx, to integrate.'));
    const q = await t.ev(() => document.getElementById('bqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the integral and its answer with B alone are shown', /^∫ \(−?\d?x [+−] \d\)·e⁻?[²³]?ˣ dx = \((−?\d?x|\(−?\d\/\d\)x) \+ B\)·e⁻?[²³]?ˣ \+ C$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#bqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the product rule ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (adds the ∫ v du where parts takes it away|divides by −?\\d only once in the ∫ v du|multiplies by −?\\d where it should divide|drops the −?\\d\\.|stops at uv and forgets the ∫ v du|divides the −?\\d by −?\\d twice|takes du = dx)`).test(r), r);
      t.ok('and checked by the product rule', new RegExp(`Check ${L}: by the product rule the slope of \\(.+ \\+ B\\)·\\S+ is \\(${SV} \\+ \\S+ × \\(.+ \\+ B\\)\\)·\\S+, which must be the integrand \\(.+\\)·\\S+, so the number on its own, ${SV} \\+ \\S+ × B, must be (−?\\d)\\. With B = ${SV} that is ${SV} \\+ \\S+ × \\S+ = ${SV}, not \\3\\.`).test(r), r);
      t.ok('and that number is shut and told as not the number alone', await t.ev(i => { const b = document.querySelectorAll('#bqPick button')[i];
        return b.disabled && /\. Not the number alone$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(PartsPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the parts through', new RegExp(`^That was it: u = .+ and v = \\S+/\\S+, so B = −?\\d/\\S+ − \\S+/\\d = ${SV}, and ${SV} \\+ \\S+ × \\S+ = −?\\d, so the product rule gives back the integrand\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} stands alone, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new integral with all four open', await t.ev(() => [...document.querySelectorAll('#bqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(PartsPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = PartsPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#bqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'PARTS MASTER / 5 integrals split');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#bpTab button, #bqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Pick a split by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its integrals, figure, split buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('bqPick')));
    t.ok('which number alone changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Parts.tab = 'hand'; UI.go('s-title'); });
  }
};
