/* Which total? The cistern workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a spring's flow f(t) = ct² + at + b and an hour T
 * shown, and four totals offered; a wrong pick is shut, named as the slip it
 * is and checked by differentiating its G, which is not the flow at the hour
 * it names; the right pick counts, toasts, works F(T) out term by term and
 * deals a new spring, and a first try is counted apart. Every button is
 * named, the hands-on workshop steps aside and comes back, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cwRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => CisternPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#cwPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ciTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const V = '\\d+(/\\d+)?';
const SV = '−?\\d+(/\\d+)?';
const POLY = '−?\\d*(t³|t²|t)?(/\\d+)?( [+−] \\d*(t³|t²|t)?(/\\d+)?)*';
const AWAY = ['ciSets', 'ciFig', 'ciStep', 'ciRead', 'ciGoalPanel'];

module.exports = {
  name: 'cisternpick',
  title: 'Which total? · pick how much a spring has filled after so many hours',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the cistern workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a spring’s flow, and pick which of four numbers is the total after so many hours\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCistern');
    t.eq('the cistern workshop opens', await t.screen(), 's-cistern');
    t.eq('stepping it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which total\?/);
    t.eq('which total is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the springs, figure, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('cwBox').innerText)).startsWith(
      'The total after T hours is the area under the flow from 0 to T: F(T) = ∫₀ᵀ f(t) dt,'));
    const q = await t.ev(() => document.getElementById('cwQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the flow is shown', new RegExp(`^An empty cistern fills at f\\(t\\) = ${POLY} barrels an hour\\.$`).test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#cwPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four totals are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${V}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by differentiating ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is the flow at hour \\d|holds the flow at its hour-\\d value all along|holds the flow at its starting value all along|forgets to divide by 2|forgets to divide by 3|drops the \\d)`).test(r), r);
      t.ok(`and checked by differentiating its G`, new RegExp(`Check ${L}: ${L} is G\\(\\d\\) for G\\(t\\) = ${POLY}\\. A total climbs exactly as fast as the water flows, so G′\\(t\\) must be the flow f\\(t\\) = ${POLY}\\. Here G′\\(t\\) = ${POLY}, and at t = \\d that is ${SV}, not f\\(\\d\\) = ${SV}\\.`).test(r), r);
      t.ok('and that total is shut and told as not the total', await t.ev(i => { const b = document.querySelectorAll('#cwPick button')[i];
        return b.disabled && /\. Not the total$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(CisternPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works F(T) out term by term', new RegExp(`^That was it: F\\(t\\) = ${POLY}, so F\\(\\d\\) = ${SV}( [+−] ${V})* = ${V} barrels\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the total, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new spring with all four open', await t.ev(() => [...document.querySelectorAll('#cwPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(CisternPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = CisternPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#cwPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'CISTERN KEEPER / 5 totals read');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ciTab button, #cwPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its springs, figure, stepper, readout and goals', back);
    t.ok('and the four totals are put away', await t.ev(() => !document.getElementById('cwPick')));
    t.ok('which total changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Cistern.tab = 'hand'; UI.go('s-title'); });
  }
};
