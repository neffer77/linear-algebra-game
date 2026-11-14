/* The slope workshop: a secant turned into a tangent as h closes in.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works the secant's slope for the numbers on screen, bringing h to
 * its closest says the slope is heading for f′(a) and draws the tangent, the
 * other side gives the slope from the left, the curves and the point change
 * what is worked, the buttons stop at their ends, and goals are ticked when
 * they are found and only then. It fits a phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('slRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#slGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let i = 0; i < n; i++) document.getElementById(id).click(); }, [id, n || 1]);

module.exports = {
  name: 'slope',
  title: 'Slope workshop · a secant becomes a tangent as h closes in',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ines');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the slope workshop', await t.showing('tomeSlope'));
    await t.tap('tomeSlope');
    t.eq('and one tap opens it', await t.screen(), 's-slope');

    // --- it opens on x² at a = 1 with h = 1 ---
    let r = await read(t);
    t.ok('it works the secant slope for the numbers on screen',
      /slope = \(f\(a \+ h\) − f\(a\)\) \/ h = \(f\(2\) − f\(1\)\) \/ 1 = \(4 − 1\) \/ 1 = 3/.test(r), r);
    t.ok('and asks for h to be brought closer', /Bring h closer to 0/.test(r), r);
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('a figure of the curve is drawn', await t.ev(() => !!document.querySelector('#slFig canvas.fig')));

    // --- bringing h in turns the secant into the tangent ---
    await press(t, 'slHLo', 2);
    r = await read(t);
    t.ok('at h = 0.1 the slope is 2.1', /\(f\(1\.1\) − f\(1\)\) \/ 0\.1 = \(1\.21 − 1\) \/ 0\.1 = 2\.1/.test(r), r);
    await press(t, 'slHLo', 2);
    r = await read(t);
    t.ok('at h = 0.001 it is 2.001', /\/ 0\.001 = 2\.001/.test(r), r);
    t.ok('and it says the slope is heading for f′(1) = 2', /heading for f′\(1\) = 2, the derivative/.test(r), r);
    t.ok('h stops at its closest', await t.ev(() => document.getElementById('slHLo').disabled));
    t.ok('the caption says the secant lies along the tangent',
      /lies along the tangent/.test(await t.ev(() => document.querySelector('#slFig .figcap').innerText)));
    t.eq('getting within 0.01 of f′(a) is found', await found(t), ['close']);

    // --- the other side ---
    await t.tap('slSide');
    r = await read(t);
    t.ok('from the left the working brackets the negative h',
      /\(f\(0\.999\) − f\(1\)\) \/ \(−0\.001\) = \(0\.998001 − 1\) \/ \(−0\.001\) = 1\.999/.test(r), r);
    t.eq('watching from the other side is found', await found(t), ['close', 'left']);

    // --- another curve and another point ---
    await t.tapText(/x³ − 3x/);
    await press(t, 'slAHi', 1);
    r = await read(t);
    t.ok('the steepest point of x³ − 3x is heading for f′(2) = 9', /f′\(2\) = 9/.test(r), r);
    t.ok('the point stops at 2', await t.ev(() => document.getElementById('slAHi').disabled));
    await press(t, 'slALo', 3);
    r = await read(t);
    t.ok('at a = −1 the tangent is flat', /f′\(−1\) = 0/.test(r), r);
    await t.tapText(/4 − x²/);
    r = await read(t);
    t.ok('on 4 − x² at a = −1 it is heading for 2', /f′\(−1\) = 2/.test(r), r);
    await press(t, 'slAHi', 2);
    t.ok('and at a = 1 for −2, falling', /f′\(1\) = −2/.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'fall', 'flat', 'left', 'steep']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('slGoals').innerText)));

    // --- h moves back out, and stops at 1 ---
    await press(t, 'slHHi', 6);
    t.ok('h moves back out and stops at 1 from the left', /h = −1/.test(await t.ev(() => document.getElementById('slH').innerText)));
    t.ok('the button that would pass it is greyed out', await t.ev(() => document.getElementById('slHHi').disabled));

    // --- every button is named ---
    const unnamed = await t.ev(() => ['slALo', 'slAHi', 'slHLo', 'slHHi']
      .filter(id => !(document.getElementById(id).getAttribute('aria-label') || '').trim()).length);
    t.eq('each stepper button says what it moves', unnamed, 0);

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the slope workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
