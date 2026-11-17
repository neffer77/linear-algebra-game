/* Which integral? The arc length workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve shown and four integrals offered; a wrong
 * pick is shut, named as the slip it is and checked at one x, where a tiny
 * step's length is worked from the slope; the right pick counts, toasts,
 * works 1 + f′² through and deals a new curve, and a first try is counted
 * apart. Every button is named, the hands-on workshop steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('alqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ArcPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#alqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#arcwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const IV = '∫[₀₁][¹²³] (√\\()?\\(?(1 \\+ )?\\d*x?[¹²³⁴⁵⁶⁷⁸]?\\)? dx';
const AWAY = ['arcwSets', 'arcwFig', 'arcwMoveRow', 'arcwRead', 'arcwGoalPanel'];

module.exports = {
  name: 'arcpick',
  title: 'Which integral? · pick the integral that is a curve’s length',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the arc length workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve, and pick which of four integrals is its length\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeArcLen');
    t.eq('the arc length workshop opens', await t.screen(), 's-arclen');
    t.eq('laying chords by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(4140));
    await t.tapText(/Which integral\?/);
    t.eq('which integral is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, the figure, the chord buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('alqBox').innerText)).startsWith(
      'A tiny step along y = f(x) runs dx and rises f′(x) dx'));
    const q = await t.ev(() => document.getElementById('alqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the curve and where it runs are shown', /^y = \d?x[²³⁴] from x = [01] to x = [123]$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#alqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four integrals are offered', labels.length, 4);
    t.ok('each is named by its integral', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${IV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked at one x ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (leaves off the square root|squares f\\(x\\) = .+, the height|puts f′\\(x\\) = .+ under the root without squaring it|squares the \\d+ in f′|squares the x.? in f′|drops the 1, the run|is the area under the curve)`).test(r), r);
      t.ok('and checked at one x', new RegExp(`Check ${L} at x = ([23]): there the slope is f′\\(\\1\\) = (\\d+), so a tiny step is √\\(1 \\+ \\2²\\) = √\\d+ times its run\\. ${L}'s integrand at x = \\1 is .+, not √\\d+\\.`).test(r), r);
      t.ok('and that integral is shut and told as not the length', await t.ev(i => { const b = document.querySelectorAll('#alqPick button')[i];
        return b.disabled && /\. Not the length$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ArcPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works 1 + f′² through', /^That was it: f′\(x\) = \d+x.?, so 1 \+ f′\(x\)² = 1 \+ \d+x.?, and adding up its root from [01] to [123] gives the length\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the length, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four open', await t.ev(() => [...document.querySelectorAll('#alqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(ArcPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ArcPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#alqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'CURVE MEASURER / 5 lengths set up');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#arcwTab button, #alqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Lay chords by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its curves, figure, chord buttons, readout and goals', back);
    t.ok('and the four integrals are put away', await t.ev(() => !document.getElementById('alqPick')));
    t.ok('which integral changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); ArcLen.tab = 'hand'; UI.go('s-title'); });
  }
};
