/* The trapezoid workshop: cutting an area into strips.
 *
 * These checks open it from the Tome and drive it through its buttons: on
 * x² with one strip T = 32, over the area 64/3 by 32/3; doubling to two
 * strips quarters the gap to 8/3; at eight strips T = 43/2 is within 1%,
 * and halving from sixteen takes the gap from 1/24 back to 1/6. The curve
 * that bends down comes out under by 1/6, the straight line is met exactly,
 * and h²/12 × (f′(4) − f′(0)) is checked each time. The strips stop at 1
 * and 16, every button and the drawing are named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tzwRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#tzwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tzwSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tzwSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => ['curve', 'trap', 'gap', 'dot'].map(k => document.querySelectorAll(`#tzwFig [data-k="${k}"]`).length).join());

module.exports = {
  name: 'trapezoid',
  title: 'Trapezoid workshop · cutting an area into strips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Tamsin');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the trapezoid workshop', await t.showing('tomeTrap'));
    await t.tap('tomeTrap');
    t.eq('and one tap opens it', await t.screen(), 's-trapezoid');

    // --- x², one strip ---
    let r = await read(t);
    t.ok('it gives the exact area first', /^f\(x\) = x² on \[0, 4\]\. The exact area is the integral, 64\/3 ≈ 21\.333\./.test(r), r);
    t.ok('and one trapezoid', /With one strip, h = 4, and the heights at the two ends are 0 and 16\. One trapezoid: T = 4\/2 × \(0 \+ 16\) = 32\./.test(r), r);
    t.ok('over the area by a third of it and more', /T is over the area by 32 − 64\/3 = 32\/3, 50% of it: the curve bends up, so each straight top runs above it\./.test(r), r);
    t.ok('checked against h²/12 × (f′(4) − f′(0))', /As a check, h²\/12 × \(f′\(4\) − f′\(0\)\) with f′\(x\) = 2x is 4²\/12 × 8 = 32\/3, the gap with its sign\./.test(r), r);
    t.eq('x² is the pressed curve', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a tap', await found(t), []);
    t.ok('there is nothing fewer or to go back to', await off(t, 'tzwFewer') && await off(t, 'tzwAgain'));
    t.eq('the figure draws the curve, one trapezoid, its sliver and two dots', await marks(t), '1,1,1,2');

    // --- doubling ---
    await press(t, 'tzwMore');
    r = await read(t);
    t.ok('two strips list the heights', /With n = 2 strips, h = 4\/2 = 2, and the heights at x = 0, 2, 4 are 0, 4, 16\./.test(r), r);
    t.ok('and add them, the inside one twice', /T = h\/2 × \(ends \+ 2 × inside\) = 1 × \(0 \+ 16 \+ 2 × 4\) = 24\./.test(r), r);
    t.ok('and the gap falls to a quarter', /Doubling the strips from 1 to 2 took the gap from 32\/3 to 8\/3, a quarter: halving h quarters h²\./.test(r), r);
    t.eq('which is found, with going over', await found(t), ['over', 'quarter']);
    t.ok('with a toast', /✓ .*Half the width, a quarter of the gap/.test(await toast(t)), await toast(t));
    t.eq('two trapezoids, two slivers, three dots', await marks(t), '1,2,2,3');
    await press(t, 'tzwAgain');
    t.ok('one strip goes back to one', /With one strip/.test(await read(t)) && await off(t, 'tzwAgain'));
    t.ok('and one trapezoid is found', (await found(t)).includes('one'));
    await press(t, 'tzwMore', 3);
    r = await read(t);
    t.ok('eight strips sum the inside heights', /With n = 8 strips, h = 4\/8 = 1\/2\. The ends are 0 and 16, and the 7 inside heights add up to 35\./.test(r), r);
    t.ok('to within 1%', /T = h\/2 × \(ends \+ 2 × inside\) = 1\/4 × \(0 \+ 16 \+ 2 × 35\) = 43\/2 ≈ 21\.5\./.test(r) && /T is over the area by 43\/2 − 64\/3 = 1\/6, 0\.78% of it/.test(r), r);
    t.ok('which is found', (await found(t)).includes('close'));
    await press(t, 'tzwMore');
    t.ok('the strips stop at sixteen', /With n = 16 strips/.test(await read(t)) && await off(t, 'tzwMore'));
    await press(t, 'tzwFewer');
    t.ok('halving them takes the gap back up four times', /Halving the strips from 16 to 8 took the gap from 1\/24 to 1\/6, four times as much: doubling h makes h² four times as big\./.test(await read(t)), await read(t));

    // --- bending down ---
    await pick(t, 1);
    r = await read(t);
    t.ok('the curve that bends down keeps eight strips and comes out under', /f\(x\) = 4x − x² on \[0, 4\]\. The exact area is the integral, 32\/3 ≈ 10\.667\..*T is under the area by 32\/3 − 21\/2 = 1\/6, 1\.56% of it: the curve bends down, so each straight top runs below it\./.test(r), r);
    t.ok('with the check below 0', /f′\(x\) = 4 − 2x is \(1\/2\)²\/12 × \(−8\) = −1\/6, the gap with its sign\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('under'));

    // --- the straight line ---
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      document.querySelectorAll('#tzwSets button')[2].click();
      Celebrate.banner = real;
      return seen;
    });
    r = await read(t);
    t.ok('the line is met exactly', /T = h\/2 × \(ends \+ 2 × inside\) = 1\/4 × \(1 \+ 3 \+ 2 × 14\) = 8\. T is the area exactly: the line is straight, so each trapezoid's top lies along it\./.test(r), r);
    t.eq('and no slivers are drawn', await marks(t), '1,8,0,9');
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'exact', 'one', 'over', 'quarter', 'under']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('tzwGoals').innerText)));
    t.eq('the last one brings a banner', banners.join(), 'STRIP MASON / every curve cut into trapezoids');

    // --- every button and the drawing are named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-trapezoid button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#tzwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Cut the area under f(x) = x², which bends up | Cut the area under f(x) = 4x − x², which bends down | Cut the area under f(x) = x/2 + 1, a straight line');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#tzwFig svg').getAttribute('aria-label')),
      'f(x) = x/2 + 1, a straight line, in gold from x = 0 to 4, with the area under it cut into 8 trapezoids in blue that fit it exactly');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the trapezoid workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Trap.pick(0); Trap.again(); UI.go('s-title'); });
  }
};
