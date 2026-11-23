/* Which volume? The slice workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a plane over a rectangle shown and four volumes
 * offered; a wrong pick is shut, named as the slip it is and checked by how
 * the volume grows with its far edge, which misses the newest slice's area;
 * the right pick counts, toasts, sweeps the slices across and deals a new
 * solid, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SlicePick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#dqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#scTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '\\d+(/\\d+)?';
const AWAY = ['scSets', 'scHold', 'scFig', 'scStep', 'scRead', 'scGoalPanel'];

module.exports = {
  name: 'slicepick',
  title: 'Which volume? · pick the volume under a plane over a rectangle',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the slice workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a plane over a rectangle, and pick which of four numbers is the volume under it\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSlice');
    t.eq('the slice workshop opens', await t.screen(), 's-slice');
    t.eq('sweeping it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6565));
    await t.tapText(/Which volume\?/);
    t.eq('which volume is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the functions, the hold, the figure, the stepper, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('dqBox').innerText)).startsWith(
      'Hold x still and the solid is cut into a slice'));
    const q = await t.ev(() => document.getElementById('dqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the plane and the rectangle are shown', /^f\(x, y\) = −?\d?x [+−] \d?y \+ \d over 0 ≤ x ≤ [1-4], 0 ≤ y ≤ [1-4]$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#dqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four volumes are offered', labels.length, 4);
    t.ok('each is named by its volume', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by how the volume grows ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (forgets to divide by 2 when it integrates|forgets to divide by 2 in both|runs x from 0 to \\d and y from 0 to \\d, the rectangle turned on its side|is one slice, the one standing on the edge y = 0|counts the steady \\d along one side only)`).test(r), r);
      t.ok('and checked by how the volume grows with its far edge', new RegExp(`Check ${L}: ${L} is G\\(\\d\\) for G\\(t\\) = .+\\. Push the far edge x = t out a little and the solid grows by its newest slice, so G′\\(t\\) must be that slice’s area, A\\(t\\) = ∫₀. f\\(t, y\\) dy = .+\\. Here G′\\(t\\) = .+, and at t = (\\d) that is −?${SV}, not A\\(\\1\\) = −?${SV}\\.`).test(r), r);
      t.ok('and that volume is shut and told as not the volume', await t.ev(i => { const b = document.querySelectorAll('#dqPick button')[i];
        return b.disabled && /\. Not the volume$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(SlicePick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick sweeps the slices across', new RegExp(`^That was it: hold x still and A\\(x\\) = ∫₀. \\(.+\\) dy = .+\\. Sweep it across: V = ∫₀. A\\(x\\) dx = \\[.+\\]₀. = ${SV}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the volume, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new solid with all four open', await t.ev(() => [...document.querySelectorAll('#dqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(SlicePick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SlicePick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#dqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'MASTER SLICER / 5 volumes swept');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#scTab button, #dqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Sweep it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its functions, hold, figure, stepper, readout and goals', back);
    t.ok('and the four volumes are put away', await t.ev(() => !document.getElementById('dqPick')));
    t.ok('which volume changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Slice.tab = 'hand'; UI.go('s-title'); });
  }
};
