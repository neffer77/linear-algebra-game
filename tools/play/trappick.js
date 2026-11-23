/* Which estimate? The trapezoid workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve, its strips and their heights shown and
 * four numbers offered; a wrong pick is shut, named as the slip it is and
 * checked on f(x) = 1 or f(x) = x, where its rule must miss; the right pick
 * counts, toasts, works T through and deals a new curve, and a first try is
 * counted apart. Every button is named, the hands-on workshop steps aside
 * and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tzqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => TrapPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#tzqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tzwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '\\d+(?:/\\d+)?';
const AWAY = ['tzwSets', 'tzwFig', 'tzwMoveRow', 'tzwRead', 'tzwGoalPanel'];

module.exports = {
  name: 'trappick',
  title: 'Which estimate? · pick the trapezoid rule\'s T',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Talfryn');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the trapezoid workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve, its strips and their heights, and pick which of four numbers is T\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTrap');
    t.eq('the trapezoid workshop opens', await t.screen(), 's-trapezoid');
    t.eq('cutting by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5150));
    await t.tapText(/Which estimate\?/);
    t.eq('which estimate is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, the figure, the strip buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('tzqBox').innerText)).startsWith(
      'Cut [a, b] into n strips of width h = (b − a)/n. T = h/2 ×'));
    const q = await t.ev(() => document.getElementById('tzqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the curve, the interval and the strips are shown', new RegExp(`^f\\(x\\) = \\d?x²(?: \\+ \\d)? on \\[[01], ${SV}\\], n = [234], h = (1/2|1|2)$`).test(q), q);
    const hs = await t.ev(() => document.getElementById('tzqH').innerText.replace(/\s+/g, ' ').trim());
    t.ok('and the heights laid out under it', new RegExp(`^x: ${SV}(, ${SV})+ f\\(x\\): ${SV}(, ${SV})+$`).test(hs), hs);
    const labels = await t.ev(() => [...document.querySelectorAll('#tzqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked on a plain function ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (adds every height once|multiplies by h where the rule has h/2|doubles every height|is the left-hand sum|is the right-hand sum|takes the whole of|is the exact integral)`).test(r), r);
      t.ok('and checked', new RegExp(`(Check ${L}'s rule on f\\(x\\) = (1|x), whose area from [01] to ${SV} is .+: it gives .+ = ${SV}, not ${SV}\\.|Check h: n = [234] strips .+ where ${L} has one ${SV} wide\\.|Check what ${L} is: \\[.+\\] from [01] to ${SV}, the area itself\\.)`).test(r), r);
      t.ok('and that number is shut and told as not T', await t.ev(i => { const b = document.querySelectorAll('#tzqPick button')[i];
        return b.disabled && /\. Not T$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(TrapPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works T through', new RegExp(`^That was it: T = \\(?${SV}\\)? × \\(${SV}( \\+ 2 × \\(?${SV}\\)?)+ \\+ ${SV}\\) = ${SV}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is T, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#tzqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(TrapPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = TrapPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#tzqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TRAPEZOID TALLIER / 5 estimates made');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tzwTab button, #tzqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Cut by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, figure, strip buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('tzqPick')));
    t.ok('which estimate changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Trap.tab = 'hand'; UI.go('s-title'); });
  }
};
