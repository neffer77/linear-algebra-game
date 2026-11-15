/* The Newton's method workshop: follow the tangent down to the axis.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout starts at x₀ = 1 on x² − 2 and says where its tangent meets the
 * axis; the first step jumps past √2 and says why; three steps run √2 down
 * to four places; x₀ = 0 has a flat tangent, no next step, and the step
 * button turns off; on x³ − 2x + 2 the steps from 0 go round 0 and 1 for
 * ever; from −1.5 they run down its one root; on x² − 4x + 3 both roots are
 * run down, which finishes the hunt, while a guess that is a root already
 * stays put and does not count. The steppers stop at their ends even pressed past them, and
 * every button is named. It fits a phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('nwRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#nwFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#nwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#nwCurves button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('nwX').innerText + ' · ' + document.getElementById('nwN').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'newton',
  title: "Newton's method workshop · a tangent's road to a root",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Odile');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok("the Tome offers the Newton's method workshop", await t.showing('tomeNewton'));
    await t.tap('tomeNewton');
    t.eq('and one tap opens it', await t.screen(), 's-newton');

    // --- it opens on x² − 2 at x₀ = 1, with no steps taken ---
    let r = await read(t);
    t.ok('it names f and f′ and the rule for a step', /f\(x\) = x² − 2, so f′\(x\) = 2x\. Each step slides down the tangent to the axis: the next x is x − f\(x\)\/f′\(x\)\./.test(r), r);
    t.ok('and says where the first tangent meets the axis', /Start at x₀ = 1, where f\(x₀\) = −1 and f′\(x₀\) = 2\. Its tangent meets the axis at 1\.5: take a step to go there\./.test(r), r);
    t.eq('the steppers read x₀ and the steps', await shown(t), 'x₀ = 1 · 0 steps');
    t.ok('the caption names the colours', /The dashed red tangent at x₀ meets the axis at the blue point, where the next step lands\./.test(await cap(t)), await cap(t));
    t.ok('a figure of the curve is drawn', await t.ev(() => !!document.querySelector('#nwFig canvas.fig')));
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('x² − 2 is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#nwCurves button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- one step jumps past √2 ---
    await press(t, 'nwNHi');
    r = await read(t);
    t.ok('the step is worked from f and f′', /f\(x₀\) = −1 and f′\(x₀\) = 2, so x₁ = 1 − \(−1\)\/2 = 1\.5\./.test(r), r);
    t.ok('and it says the step jumped past √2, and why', /The step to x₁ jumped right past √2: this curve bends upward, so a tangent from a point below the axis lands beyond the root/.test(r), r);
    t.eq('the step count reads 1 step', await shown(t), 'x₀ = 1 · 1 step');
    t.eq('jumping past a root is found', await found(t), ['jump']);
    t.ok('its toast starts with a capital', /✓ Jumped right past a root/.test(await toast(t)), await toast(t));

    // --- three steps run √2 down ---
    await press(t, 'nwNHi', 2);
    r = await read(t);
    t.ok('a step with rounded numbers says ≈', /f\(x₂\) ≈ 0\.0069 and f′\(x₂\) ≈ 2\.8333, so x₃ = 1\.4167 − 0\.0069\/2\.8333 ≈ 1\.4142\./.test(r), r);
    t.ok('and three steps reach √2 to four places', /Now x₃ ≈ 1\.4142, where f\(x₃\) ≈ 0: that is the root √2 ≈ 1\.4142, to four places\./.test(r), r);
    t.eq('the steps read 3', await shown(t), 'x₀ = 1 · 3 steps');
    t.eq('running √2 down is found', await found(t), ['jump', 'sqrt']);

    // --- a flat tangent at 0 ---
    await press(t, 'nwXLo', 2);
    r = await read(t);
    t.ok('at x₀ = 0 the tangent is flat and there is no step', /Start at x₀ = 0, where f′\(x₀\) = 0: the tangent there is flat, so it never meets the axis and there is no next step\. Start somewhere else\./.test(r), r);
    t.eq('no steps are shown', await shown(t), 'x₀ = 0 · 0 steps');
    t.ok('and the step button is off', await t.ev(() => document.getElementById('nwNHi').disabled));
    t.eq('the caption says why', await cap(t), 'The dashed tangent at the red point is flat: it runs alongside the axis and never meets it.');
    t.eq('a flat tangent is found', await found(t), ['flat', 'jump', 'sqrt']);

    // --- the cubic goes round 0 and 1 for ever ---
    await pick(t, 1);
    r = await read(t);
    t.ok('from 0 the cubic steps to 1', /f\(x₀\) = 2 and f′\(x₀\) = −2, so x₁ = 0 − 2\/\(−2\) = 1\./.test(r), r);
    t.ok('and from 1 back to 0', /f\(x₁\) = 1 and f′\(x₁\) = 1, so x₂ = 1 − 1\/1 = 0\./.test(r), r);
    t.ok('and it says the steps loop for ever', /x₂ = 0 is back where x₀ was: from here the steps go round the same two points for ever and never reach a root\./.test(r), r);
    t.eq('the step count was kept from before', await shown(t), 'x₀ = 0 · 3 steps');
    t.eq('a loop is found', await found(t), ['flat', 'jump', 'loop', 'sqrt']);

    // --- and from −1.5 runs down its root ---
    await press(t, 'nwXLo', 3);
    r = await read(t);
    t.ok('from −1.5 three steps reach the root', /Now x₃ ≈ −1\.7693, where f\(x₃\) ≈ −0\.0001: that is the root ≈ −1\.7693, to four places\./.test(r), r);
    t.eq('the cubic\'s root is found', await found(t), ['far', 'flat', 'jump', 'loop', 'sqrt']);
    t.eq('the caption marks the root', await cap(t), 'The red point sits on the axis: f is 0 there, so it is a root.');

    // --- both roots of x² − 4x + 3 ---
    await pick(t, 2);
    await press(t, 'nwXHi', 9);
    r = await read(t);
    t.ok('x₀ = 3 is a root already and every step stays there', /x₀ = 3 is a root already: f\(x₀\) = 0, so every step stays where it is\./.test(r), r);
    await press(t, 'nwXLo', 5);
    r = await read(t);
    t.ok('from 0.5 three steps reach the root 1', /that is the root 1, to four places\./.test(r), r);
    t.ok('a root you started on does not count, so both roots are not yet found', !(await found(t)).includes('both'), JSON.stringify(await found(t)));
    await press(t, 'nwXHi', 3);
    r = await read(t);
    t.ok('x₀ = 2 has a flat tangent too', /Start at x₀ = 2, where f′\(x₀\) = 0/.test(r), r);
    await press(t, 'nwXHi');
    t.ok('from 2.5 the step jumps past 3', /The step to x₁ jumped right past 3/.test(await read(t)));
    await press(t, 'nwNHi');
    r = await read(t);
    t.ok('and four steps reach the root 3', /Now x₄ ≈ 3, where f\(x₄\) ≈ 0: that is the root 3, to four places\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['both', 'far', 'flat', 'jump', 'loop', 'sqrt']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('nwGoals').innerText)));

    // --- a guess that is a root already; the steppers' ends ---
    await press(t, 'nwXHi', 3);
    t.ok('back at x₀ = 3 the readout says so again', /x₀ = 3 is a root already/.test(await read(t)));
    t.ok('x₀ stops at 3', await t.ev(() => document.getElementById('nwXHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Newton.moveX(1); return Newton.x0(); }), 3);
    await press(t, 'nwNHi', 4);
    t.eq('the steps stop at 6', await shown(t), 'x₀ = 3 · 6 steps');
    t.ok('and the step button is off there', await t.ev(() => document.getElementById('nwNHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Newton.moveN(1); return Newton.path().length - 1; }), 6);
    await press(t, 'nwNLo', 8);
    t.eq('taking back steps stops at 0', await shown(t), 'x₀ = 3 · 0 steps');
    t.ok('and the take-back button is off there', await t.ev(() => document.getElementById('nwNLo').disabled));
    await press(t, 'nwXLo', 20);
    t.eq('x₀ stops at −3', await t.ev(() => Newton.x0()), -3);
    t.ok('and its button is off there', await t.ev(() => document.getElementById('nwXLo').disabled));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-newton .wsCell button, #nwCurves button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each function button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#nwCurves button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = x² − 2 | f(x) = x³ − 2x + 2 | f(x) = x² − 4x + 3');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok("the Newton's method workshop changes nothing in the save", await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
