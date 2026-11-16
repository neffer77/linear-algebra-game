/* The arc length workshop: measuring a curve with chords.
 *
 * These checks open it from the Tome and drive it through its buttons: on
 * the line one chord measures 5 and doubling keeps it exactly 5; on the cubic
 * one chord falls short of 17/12 by about 0.0601, four chords are each worked
 * by Pythagoras, doubling from 2 to 4 cuts the gap to about a quarter, and 16
 * chords come within 0.001; on the quarter circle 16 chords give π/2 to two
 * places and doubling cuts the gap only to about a third. The buttons stop
 * at 1 and 32 chords, starting over goes back to one, every button and the
 * drawing are named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('arcwRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#arcwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#arcwSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#arcwSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => ['curve', 'chord', 'node'].map(k => document.querySelectorAll(`#arcwFig [data-k="${k}"]`).length).join());

module.exports = {
  name: 'arclen',
  title: 'Arc length workshop · measuring a curve with chords',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lynette');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the arc length workshop', await t.showing('tomeArcLen'));
    await t.tap('tomeArcLen');
    t.eq('and one tap opens it', await t.screen(), 's-arclen');

    // --- the line ---
    let r = await read(t);
    t.ok('it gives the true length first', /y = \(3\/4\)x from 0 to 4\. f′\(x\) = 3\/4, so the true length is ∫₀⁴ √\(1 \+ 9\/16\) dx = \(5\/4\) × 4 = 5\./.test(r), r);
    t.ok('and measures the one chord by Pythagoras', /Chord 1, from x = 0 to 4: run 4, rise 3, length √\(4² \+ 3²\) = 5\. The one chord measures exactly 5, the true length: a straight line is its own chord\./.test(r), r);
    t.ok('with the runs alone beside it', /The runs alone add up to b − a = 4, far less: forget the rise and you measure only the width\./.test(r), r);
    t.eq('the line is the pressed curve', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a move', await found(t), []);
    t.ok('there is nothing to halve or start over yet', await off(t, 'arcwFewer') && await off(t, 'arcwAgain'));
    t.eq('the figure draws the curve, one chord and its two ends', await marks(t), '1,1,2');
    await press(t, 'arcwMore');
    r = await read(t);
    t.ok('two chords still make exactly 5', /Together the 2 chords measure exactly 5, the true length.*You doubled the chords from 1 to 2, and the total is still exactly 5: a straight line has no corners to cut\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('line'));
    t.ok('with a toast', /✓ A line is its own chord/.test(await toast(t)), await toast(t));
    t.eq('two chords are drawn, with three ends', await marks(t), '1,2,3');

    // --- the cubic ---
    await pick(t, 1);
    r = await read(t);
    t.ok('the cubic\'s length is a perfect square under the root', /Here 1 \+ f′² = \(x²\/2 \+ 1\/\(2x²\)\)², a perfect square, so the true length is ∫₁² \(x²\/2 \+ 1\/\(2x²\)\) dx = 17\/12 ≈ 1\.4167\./.test(r), r);
    t.ok('and one chord falls short', /The one chord measures ≈ 1\.3566, short of the true length by about 0\.0601: each chord cuts a corner off the curve, so chords always come up short\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('short'));
    await press(t, 'arcwMore', 2);
    r = await read(t);
    t.ok('four chords are each worked', /Chord 1, from x = 1 to 1\.25: run 0\.25, rise 0\.0589, length √\(0\.25² \+ 0\.0589²\) ≈ 0\.2568\..*Chord 4, from x = 1\.75 to 2: run 0\.25, rise 0\.4044, length √\(0\.25² \+ 0\.4044²\) ≈ 0\.4754\./.test(r), r);
    t.ok('and doubling cuts the gap to about a quarter', /You doubled the chords from 2 to 4, and the gap went from 0\.01656 to 0\.00421, 0\.2544 times as much\. Each chord is half as long and cuts a corner about an eighth as deep, and there are twice as many, so the gap falls to about a quarter\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('quarter'));
    t.ok('not yet within 0.001', !(await found(t)).includes('close'));
    await press(t, 'arcwMore', 2);
    r = await read(t);
    t.ok('16 chords are counted, not listed', /16 chords, each with run \(b − a\)\/16 = 0\.0625: too many to list one by one/.test(r) && !/Chord 1,/.test(r), r);
    t.ok('and come within 0.001', /Together the 16 chords measure ≈ 1\.4164, short of the true length by about 0\.00026/.test(r), r);
    t.ok('which is found', (await found(t)).includes('close'));
    await press(t, 'arcwMore', 3);
    t.ok('the chords stop at 32', /^.*32 chords, each with run \(b − a\)\/32 ≈ 0\.0313/.test(await read(t)) && await off(t, 'arcwMore'));
    t.eq('thirty-two chords are drawn', await marks(t), '1,32,33');
    await press(t, 'arcwFewer');
    t.ok('halving goes back to 16 and drops the doubling note', /16 chords/.test(await read(t)) && !/You doubled/.test(await read(t)));
    await press(t, 'arcwAgain');
    t.ok('starting over goes back to one chord', /The one chord measures/.test(await read(t)) && await off(t, 'arcwAgain') && await off(t, 'arcwFewer'));

    // --- the quarter circle ---
    await pick(t, 2);
    t.ok('the circle\'s length is π/2', /a quarter of a circle of radius 1\. Its true length is a quarter of 2π, π\/2 ≈ 1\.5708\./.test(await read(t)));
    await press(t, 'arcwMore', 3);
    t.ok('8 chords do not yet give 1.57', !(await found(t)).includes('pi'));
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      document.getElementById('arcwMore').click();
      Celebrate.banner = real;
      return seen;
    });
    r = await read(t);
    t.ok('16 chords give π/2 to two places', /Together the 16 chords measure ≈ 1\.5685, short of the true length by about 0\.0023/.test(r), r);
    t.ok('and doubling cuts the gap only to about a third', /You doubled the chords from 8 to 16, and the gap went from 0\.00652 to 0\.0023, 0\.3528 times as much\. Near x = 1 the circle stands straight up, so the chords there cut deeper corners than anywhere else, and the gap falls only to about a third\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'line', 'pi', 'quarter', 'short', 'third']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('arcwGoals').innerText)));
    t.eq('the last one brings a banner', banners.join(), 'MASTER OF THE MEASURE / every curve laid straight');

    // --- every button and the drawing are named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-arclen button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#arcwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Measure the line y = 3/4 x from 0 to 4 | Measure the curve y = x cubed over 6 plus 1 over 2x from 1 to 2 | Measure a quarter circle y = square root of 1 minus x squared from 0 to 1');
    await press(t, 'arcwAgain'); await press(t, 'arcwMore', 2);
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#arcwFig svg').getAttribute('aria-label')),
      'a quarter circle y = square root of 1 minus x squared from 0 to 1 in gold, with 4 straight chords in blue joining points on it');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the arc length workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { ArcLen.pick(0); UI.go('s-title'); });
  }
};
