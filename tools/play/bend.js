/* The bend workshop: the slope of the slope.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * S-curve opens at x = −2 bending down with nothing found; x = −1 is the
 * hilltop, with a flat tangent and f″ = −6; x = 0 is where the bend flips from
 * cap to cup and the slope bottoms out; x = 1 is the valley floor; the shifted
 * curve flips at x = 1; and on x⁴/4 the point x = 0 has f″ = 0 without any
 * flip, which finishes the hunt. The tangent changes colour with the bend,
 * the stepper stops at its ends, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('bdRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#bdFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#bdGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#bdSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('bdX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const tanCol = t => t.ev(() => document.querySelector('#bdFig line[data-k="tan"]').getAttribute('stroke'));

module.exports = {
  name: 'bend',
  title: 'Bend workshop · the slope of the slope',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the bend workshop', await t.showing('tomeBend'));
    await t.tap('tomeBend');
    t.eq('and one tap opens it', await t.screen(), 's-bend');

    // --- the S-curve at x = −2 ---
    let r = await read(t);
    t.ok('it names the curve and both derivatives', /f\(x\) = x³ − 3x, so its slope is f′\(x\) = 3x² − 3, and the slope of that, f″\(x\) = 6x, says how fast the slope itself is changing\./.test(r), r);
    t.ok('works the point', /At x = −2: f\(−2\) = −2, the tangent's slope is f′\(−2\) = 9, and f″\(−2\) = −12\./.test(r), r);
    t.ok('and reads the bend from f″', /f″\(−2\) = −12 is less than 0, which says the same in one number: the curve bends down like a cap and sits below its tangent\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = −2');
    t.eq('the caption names the colours', await cap(t), 'The curve is f, in blue. The short line is its tangent at the gold point: green where the curve bends up, red where it bends down, and gold where f″ = 0.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    const down = await tanCol(t);

    // --- the hilltop ---
    await press(t, 'bdXHi', 2);
    r = await read(t);
    t.eq('the stepper moves half a step at a time', await shown(t), 'x = −1');
    t.ok('the slope either side is falling', /the slope goes from f′\(−1\.5\) = 3\.75 to f′\(−0\.5\) = −2\.25: it is falling\./.test(r), r);
    t.ok('a flat tangent bending down is a hilltop', /The tangent is flat and the curve bends down away from it, so this is a hilltop, a local maximum\. Reading f″ at a flat tangent like this is the second derivative test\./.test(r), r);
    t.eq('the hilltop is found', await found(t), ['top']);
    t.ok('with a toast', /✓ Found the hilltop/.test(await toast(t)), await toast(t));

    // --- the flip ---
    await press(t, 'bdXHi', 2);
    r = await read(t);
    t.ok('at 0 the slope bottoms out', /f′\(−0\.5\) = −2\.25 to f′\(0\.5\) = −2\.25, the same both sides, while f′\(0\) = −3 is lower than either: the slope bottoms out right here and turns from falling to rising\./.test(r), r);
    t.ok('and the bend flips', /f″\(0\) = 0, and half a step either side f″\(−0\.5\) = −3 and f″\(0\.5\) = 3 have opposite signs: the bend flips from cap to cup here\. That is an inflection point, and the tangent crosses the curve\./.test(r), r);
    t.eq('the flip is found', await found(t), ['flip', 'top']);
    const zero = await tanCol(t);

    // --- the valley floor ---
    await press(t, 'bdXHi', 2);
    r = await read(t);
    t.ok('a flat tangent bending up is a valley floor', /f″\(1\) = 6 is more than 0.*so this is a valley floor, a local minimum\./.test(r), r);
    t.eq('the valley floor is found', await found(t), ['flip', 'floor', 'top']);
    const up = await tanCol(t);
    t.ok('the tangent takes three colours for down, flat f″ and up', new Set([down, zero, up]).size === 3, JSON.stringify([down, zero, up]));

    // --- the shifted curve ---
    await pick(t, 1);
    t.eq('a new curve starts at x = −2', await shown(t), 'x = −2');
    await press(t, 'bdXHi', 6);
    r = await read(t);
    t.ok('the shifted curve flips at 1', /f\(x\) = x³\/3 − x².*f″\(1\) = 0, and half a step either side f″\(0\.5\) = −1 and f″\(1\.5\) = 1 have opposite signs/.test(r), r);
    t.ok('with its height worked to four places', /f\(1\) ≈ −0\.6667/.test(r), r);
    t.eq('the shifted flip is found', await found(t), ['flip', 'floor', 'shift', 'top']);

    // --- the flat-bottomed curve ---
    await pick(t, 2);
    await press(t, 'bdXHi', 4);
    r = await read(t);
    t.ok('f″ = 0 at 0', /At x = 0: f\(0\) = 0, the tangent's slope is f′\(0\) = 0, and f″\(0\) = 0\./.test(r), r);
    t.ok('but the slope still rises through it', /f′\(−0\.5\) = −0\.125 to f′\(0\.5\) = 0\.125: it is rising\./.test(r), r);
    t.ok('so the bend does not flip', /are both more than 0: the curve bends up on both sides, so this is not an inflection point\. f″ = 0 says where to look, not that the bend flips\./.test(r), r);
    t.ok('and the test cannot decide, so it looks either side', /the second derivative test cannot tell a hilltop from a valley floor, so look either side: f\(−0\.5\) ≈ 0\.0156 and f\(0\.5\) ≈ 0\.0156 are both higher, so this is a valley floor all the same\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fake', 'flip', 'floor', 'shift', 'top']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('bdGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'bdXHi', 10);
    t.eq('right stops at 2', await shown(t), 'x = 2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('bdXHi').disabled));
    await press(t, 'bdXLo', 10);
    t.eq('left stops at −2', await shown(t), 'x = −2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('bdXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Bend.moveX(-1); return Bend.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-bend .wsCell button, #bdSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#bdSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'S-curve: f(x) = x³ − 3x | Shifted: f(x) = x³/3 − x² | Flat-bottomed: f(x) = x⁴/4');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = x⁴\/4 in blue, with its tangent at x = −2, slope −8, the curve bending up above it/.test(document.querySelector('#bdFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the bend workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
