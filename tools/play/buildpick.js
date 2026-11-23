/* Which width holds the most? The biggest build workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a fence and a paddock count shown and four widths
 * offered; a wrong pick is shut, named as the slip it is and checked by the
 * slope of the area, which is not 0 there; the right pick counts, toasts,
 * solves A′(x) = 0 and deals a new pen, and a first try is counted apart.
 * Every button is named, the hands-on workshop steps aside and comes back,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('bbRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => BuildPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#bbPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#opTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const AWAY = ['opSets', 'opFig', 'opStep', 'opRead', 'opGoalPanel'];

module.exports = {
  name: 'buildpick',
  title: 'Which width holds the most? · pick the width of the biggest pen against the wall',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the biggest build workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a fence and a paddock count and pick which of four widths holds the most\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeOptim');
    t.eq('the biggest build workshop opens', await t.screen(), 's-optim');
    t.eq('stepping it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6464));
    await t.tapText(/Which width holds most\?/);
    t.eq('which width holds most is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the builds, figure, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('bbBox').innerText)).startsWith(
      'The pen holds its width times its front.'));
    const q = await t.ev(() => document.getElementById('bbQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the fence and the paddocks are shown', /^\d+ m of fence, [1-4] paddocks? against the castle wall\.$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#bbPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four widths are offered', labels.length, 4);
    t.ok('each is named by its width', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV} m$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the slope of the area ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (is where the fences out from the wall use up all \\d+ m|makes every fence the same length, the front too|is how long the front is at its best|counts \\d fences out from the wall, one for each paddock|counts the wall as a fence too|gives each paddock its own two fences out from the wall)`).test(r), r);
      t.ok('and checked by the slope of the area', new RegExp(`Check ${L}: at the best width the slope A′\\(x\\) = \\d+ − \\d+x is 0\\. At x = ${SV} it is \\d+ − \\d+ × ${SV} = ${SV}, not 0, so a (wider|narrower) pen holds more\\.`).test(r), r);
      t.ok('and that width is shut and told as not holding the most', await t.ev(i => { const b = document.querySelectorAll('#bbPick button')[i];
        return b.disabled && /\. Does not hold the most$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(BuildPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick solves A′(x) = 0', new RegExp(`^That was it: A\\(x\\) = x\\(\\d+ − \\dx\\) = \\d+x − \\dx², so A′\\(x\\) = \\d+ − \\d+x, which is 0 at x = \\d+ ÷ \\d+ = ${SV} m\\. The front is then ${SV} m, and the pen holds ${SV} m²\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} holds the most, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pen with all four open', await t.ev(() => [...document.querySelectorAll('#bbPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(BuildPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = BuildPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#bbPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'PADDOCK PLANNER / 5 best pens fenced');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#opTab button, #bbPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its builds, figure, stepper, readout and goals', back);
    t.ok('and the four widths are put away', await t.ev(() => !document.getElementById('bbPick')));
    t.ok('which width holds most changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Optim.tab = 'hand'; UI.go('s-title'); });
  }
};
