/* Where does it head? The horizon workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a fraction with the same power on top and
 * underneath shown, and four numbers offered; a wrong pick is shut, named as
 * the slip it is and checked by the biggest-power part of the gap f(x) − L,
 * which is not 0; the right pick counts, toasts, divides top and bottom by
 * the biggest power, and deals a new fraction, and a first try is counted
 * apart. Every button is named, the hands-on workshop steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('zpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => HzPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#zpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#hzTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const PV = `(\\(−\\d+(/\\d+)?\\)|\\d+(/\\d+)?)`;
const N = '−?\\d+';
const PN = '(\\(−\\d+\\)|\\d+)';
const PL = '−?\\d*(x²|x)?( [+−] \\d*(x²|x)?)*';
const AWAY = ['hzSets', 'hzFig', 'hzStep', 'hzRead', 'hzGoalPanel'];

module.exports = {
  name: 'hzpick',
  title: 'Where does it head? · pick where a fraction heads as x grows',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the horizon workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a fraction and pick which of four numbers it heads for\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHorizon');
    t.eq('the horizon workshop opens', await t.screen(), 's-horizon');
    t.eq('stepping it out by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6262));
    await t.tapText(/Where does it head\?/);
    t.eq('where does it head is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the fractions, figure, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('zpBox').innerText)).startsWith(
      'As x grows without end, the biggest power on top and the biggest underneath take over'));
    const q = await t.ev(() => document.getElementById('zpQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the fraction is shown', new RegExp(`^f\\(x\\) = \\(${PL}\\)/\\(${PL}\\)$`).test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#zpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the gap's biggest power ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (turns the ratio upside down|is the numbers with no x, ${N} over ${N}|is f at x = 1, every number on top|is the x numbers, ${N} over ${N}|puts the top’s x² number over the bottom’s x number)`).test(r), r);
      t.ok('and checked by the gap’s biggest power', new RegExp(`Check ${L}: if f headed for ${SV}, the gap f\\(x\\) − ${PV} would shrink to 0\\. Its top is the top of f minus ${PV} times the bottom, and the (x²|x) part of that is ${N} − ${PV} × ${PN} = ${SV}, not 0\\. So as x grows the gap heads for ${SV} over ${N}, not 0\\.`).test(r), r);
      t.ok('and that number is shut and told as not where f heads', await t.ev(i => { const b = document.querySelectorAll('#zpPick button')[i];
        return b.disabled && /\. Not where f heads$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(HzPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick divides by the biggest power', new RegExp(`^That was it: divide top and bottom by (x²|x), every other term shrinks to 0, and f heads for ${N} over ${N}, which is ${SV}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is where f heads, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new fraction with all four open', await t.ev(() => [...document.querySelectorAll('#zpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(HzPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = HzPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#zpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'HORIZON GAZER / 5 horizons read');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hzTab button, #zpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Step it out by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its fractions, figure, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('zpPick')));
    t.ok('where does it head changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Horizon.tab = 'hand'; UI.go('s-title'); });
  }
};
