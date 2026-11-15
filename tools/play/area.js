/* The area workshop: rectangles under a curve close in on its integral.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works the sum for the numbers on screen, moving the height to the
 * middle and adding rectangles brings it within 0.1 and then 0.01 of the
 * exact area, the right edge overshoots, x³ puts a rectangle under the axis,
 * one rectangle is worked without a list, the buttons stop at their ends, and
 * goals are ticked when they are found and only then. It fits a phone and
 * adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('arRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#arGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let i = 0; i < n; i++) document.getElementById(id).click(); }, [id, n || 1]);

module.exports = {
  name: 'area',
  title: 'Area workshop · rectangles close in on the integral',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Odile');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the area workshop', await t.showing('tomeArea'));
    await t.tap('tomeArea');
    t.eq('and one tap opens it', await t.screen(), 's-area');

    // --- it opens on x² from 0 to 3, four rectangles, left edges ---
    let r = await read(t);
    t.ok('it works Δx for the numbers on screen', /Δx = \(b − a\) \/ n = \(3 − 0\) \/ 4 = 0\.75 wide, as tall as f at its left edge/.test(r), r);
    t.ok('and the sum, height by height',
      /Sum = Δx × \(f\(0\) \+ f\(0\.75\) \+ f\(1\.5\) \+ f\(2\.25\)\) = 0\.75 × \(0 \+ 0\.5625 \+ 2\.25 \+ 5\.0625\) = 0\.75 × 7\.875 = 5\.90625/.test(r), r);
    t.ok('against the exact area, and how far short it is', /∫ ?0 ?3 ?x² dx = 9\. This sum is short by 3\.09375/.test(r), r);
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('a figure of the rectangles is drawn', await t.ev(() => !!document.querySelector('#arFig canvas.fig')));
    t.ok('the fewer button starts live', await t.ev(() => !document.getElementById('arNLo').disabled));

    // --- the middle, then more rectangles ---
    await t.tapText(/^Middle$/);
    r = await read(t);
    t.ok('midpoints give 8.859375', /= 8\.859375/.test(r), r);
    t.eq('falling short is found', await found(t), ['under']);
    await press(t, 'arNHi', 1);
    t.ok('eight rectangles are summed without listing them', /the 8 heights added\) = 0\.375 × 23\.90625 = 8\.96484375/.test(await read(t)));
    t.eq('within 0.1 is found', await found(t), ['tenth', 'under']);
    t.ok('and its toast keeps the 0.1', /✓ Bring the sum within 0\.1 of the exact area/.test(await t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '))));
    await press(t, 'arNHi', 1);
    r = await read(t);
    t.ok('at sixteen a rounded sum is shown with ≈', /≈ 8\.9912 .*short by about 0\.0088/.test(r), r);
    t.eq('within 0.01 is found', await found(t), ['hundth', 'tenth', 'under']);
    await press(t, 'arNHi', 2);
    t.ok('at 64 it says the sum closes in on the integral', /closes in on the integral/.test(await read(t)));
    t.ok('the count stops at 64', await t.ev(() => document.getElementById('arNHi').disabled));
    t.ok('and says so', /64 rectangles/.test(await t.ev(() => document.getElementById('arN').innerText)));

    // --- the right edge overshoots ---
    await t.tapText(/^Right edge$/);
    t.ok('right edges overshoot x²', /This sum is over by/.test(await read(t)));
    t.eq('overshooting is found', await found(t), ['hundth', 'over', 'tenth', 'under']);

    // --- x³ dips under the axis ---
    await t.tapText(/^Left edge$/);
    await t.tapText(/x³ from −1 to 2/);
    t.eq('a rectangle under the axis is found', await found(t), ['below', 'hundth', 'over', 'tenth', 'under']);
    t.ok('and the count says every goal is found', /5 of 5 found/.test(await t.ev(() => document.getElementById('arGoals').innerText)));
    await press(t, 'arNLo', 6);
    r = await read(t);
    t.ok('one rectangle is worked without a list',
      /= \(2 − \(−1\)\) \/ 1 = 3 wide.*Sum = Δx × f\(−1\) = 3 × \(−1\) = −3 The exact/.test(r), r);
    t.ok('and that sum is short of 15/4 by 6.75', /15\/4 = 3\.75\. This sum is short by 6\.75/.test(r), r);
    t.ok('the count stops at one rectangle', await t.ev(() => document.getElementById('arNLo').disabled
      && document.getElementById('arN').innerText.trim() === '1 rectangle'));

    // --- every button is named ---
    const unnamed = await t.ev(() => ['arNLo', 'arNHi']
      .filter(id => !(document.getElementById(id).getAttribute('aria-label') || '').trim()).length);
    t.eq('each stepper button says what it moves', unnamed, 0);
    t.eq('the pressed curve and rule are marked', await t.ev(() =>
      [...document.querySelectorAll('#arCurves [aria-pressed=true], #arRules [aria-pressed=true]')].map(b => b.innerText.trim())),
      ['x³ from −1 to 2', 'Left edge']);

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the area workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
