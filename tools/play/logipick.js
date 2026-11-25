/* Which rate? The logistic workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: r, K and P shown and four numbers offered; a wrong
 * pick is shut, named as the slip it is and checked where its formula must
 * fail; the right pick counts, toasts, works rP(1 − P/K) through and deals a
 * new population, and a first try is counted apart. Every button is named,
 * the hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lgqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LogiPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#lgqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lgwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(?:/\\d+)?';
const AWAY = ['lgwSets', 'lgwFig', 'lgwMoveRow', 'lgwRead', 'lgwGoalPanel'];

module.exports = {
  name: 'logipick',
  title: 'Which rate? · pick dP/dt for a population with a ceiling',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Brisen');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the logistic workshop can be turned round', await t.ev(() =>
      /Then turn it round: see r, K and P, and pick which of four numbers is dP\/dt\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLogiGrow');
    t.eq('the logistic workshop opens', await t.screen(), 's-logistic');
    t.eq('stepping by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5150));
    await t.tapText(/Which rate\?/);
    t.eq('which rate is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the starts, the figure, the step buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('lgqBox').innerText)).startsWith(
      'A population with room for K grows at dP/dt = rP(1 − P/K)'));
    const q = await t.ev(() => document.getElementById('lgqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('r, K and P are shown', /^r = \d+\/\d+, K = \d+, P = \d+$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#lgqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked where its formula fails ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is rP alone|multiplies by P/K|drops the P|drops the r|drops the ÷ K|turns the share upside down|is rK/4)`).test(r), r);
      t.ok('and checked where its formula must fail', new RegExp(`Check ${L} at P = (0|K = \\d+|1): .+ ${L}'s formula, .+, gives .+ = ${SV}(?: there)?, not ${SV}\\.`).test(r), r);
      t.ok('and that number is shut and told as not dP/dt', await t.ev(i => { const b = document.querySelectorAll('#lgqPick button')[i];
        return b.disabled && /\. Not dP\/dt$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(LogiPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works rP(1 − P/K) through', new RegExp(`^That was it: dP/dt = \\(\\d+/\\d+\\) × \\d+ × \\(1 − \\d+/\\d+\\) = \\(\\d+/\\d+\\) × \\d+ × \\(?${SV}\\)? = ${SV}(\\. P is above the ceiling, so the room left is below 0 and P shrinks back toward \\d+)?\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is dP/dt, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new population with all four open', await t.ev(() => [...document.querySelectorAll('#lgqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(LogiPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LogiPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#lgqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'RATE READER / 5 rates worked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lgwTab button, #lgqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Step by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its starts, figure, step buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('lgqPick')));
    t.ok('which rate changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); LogiGrow.tab = 'hand'; UI.go('s-title'); });
  }
};
