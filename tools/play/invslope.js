/* The inverse slope workshop: mirror the curve, flip the slope.
 *
 * These checks open it from the Tome and drive it through its buttons: arcsin
 * opens at u = 0.6 with slope 1/0.8 = 1.25 and nothing found; forgetting to
 * flip gives 0.8 and flipping at u gives 1/cos 0.6, and the nudge catches
 * both; at u = 0 forgetting to flip is right by luck and the slope is 1; at
 * u = 1 the tangent stands straight up; arccos falls most gently at 0, where
 * flipping at u divides by sin 0; and arctan has slope 1/2 at u = 1. The
 * stepper stops at its ends, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ivRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#ivFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#ivGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#ivSets button')[k].click(), k);
const mode = (t, k) => t.ev(k => document.querySelectorAll('#ivModes button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ivModes button')].map(b => b.getAttribute('aria-pressed')).join());
const shown = t => t.ev(() => document.getElementById('ivU').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const has = (t, k) => t.ev(k => !!document.querySelector(`#ivFig [data-k="${k}"]`), k);
const upright = t => t.ev(() => { const l = document.querySelector('#ivFig [data-k="gtan"]'); return !!l && Math.abs(+l.getAttribute('x1') - +l.getAttribute('x2')) < 0.02; });

module.exports = {
  name: 'invslope',
  title: 'Inverse slope workshop · mirror the curve, flip the slope',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the inverse slope workshop', await t.showing('tomeInvSlope'));
    await t.tap('tomeInvSlope');
    t.eq('and one tap opens it', await t.screen(), 's-invslope');

    // --- arcsin at u = 0.6 ---
    let r = await read(t);
    t.ok('it says what arcsin undoes', /g\(u\) = arcsin u undoes f\(x\) = sin x, for x from −π\/2 to π\/2\. Its graph is f’s mirrored in the line y = x\./.test(r), r);
    t.ok('finds x and its mirror point', /At u = 0\.6: x = arcsin 0\.6 ≈ 0\.644, the angle whose sine is 0\.6\. The point \(0\.644, 0\.6\) on f mirrors to \(0\.6, 0\.644\) on g\./.test(r), r);
    t.ok('works f′ at x from an identity', /f′\(x\) = cos x, and on −π\/2 to π\/2, cos x = √\(1 − sin²x\) = √\(1 − 0\.6²\) = 0\.8\./.test(r), r);
    t.ok('flips it', /so the slope flips: g′\(0\.6\) = 1\/f′\(x\) = 1\/0\.8 = 1\.25\./.test(r), r);
    t.ok('and checks it with a nudge', /Check with a nudge: from u = 0\.599 to 0\.601, g goes from about 0\.642252 to about 0\.644752, so Δg\/Δu ≈ 1\.25\./.test(r), r);
    t.eq('the stepper reads u', await shown(t), 'u = 0.6');
    t.eq('flipping at x is the pressed method', await pressed(t), 'true,false,false');
    t.eq('the caption names the colours', await cap(t), 'f is blue and its mirror g is gold, either side of the dashed line y = x. The dotted line joins a point to its mirror image. The green line is g’s tangent, the flipped slope, and a slip’s line is drawn dashed in red.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('the mirror and both tangents are drawn, with no slip line', await has(t, 'mirror') && await has(t, 'gtan') && await has(t, 'ftan') && !(await has(t, 'slip')));

    // --- the slips at u = 0.6 ---
    await mode(t, 1);
    r = await read(t);
    t.ok('forgetting to flip takes the slope of f', /The slip forgets to flip: it takes f′\(x\) = 0\.8 as the slope of g\. But that is the slope of f, the curve before the mirror\./.test(r), r);
    t.ok('and the nudge catches it', /So forgetting to flip is wrong: the slope of g is 1 over the slope of f, here 1\.25\./.test(r), r);
    t.eq('the flip is found', await found(t), ['flip']);
    t.ok('with a toast', /✓ Flip the slope/.test(await toast(t)), await toast(t));
    t.ok('and the slip\'s line is drawn beside the tangent', await has(t, 'slip') && await has(t, 'gtan'));
    t.eq('the slip is the pressed method', await pressed(t), 'false,true,false');
    await mode(t, 2);
    r = await read(t);
    t.ok('flipping at u uses the wrong point', /The slip flips f′ at u: 1\/f′\(0\.6\) = 1\/cos 0\.6 ≈ 1\.212\. But f′ belongs at x ≈ 0\.644/.test(r), r);
    t.ok('and is caught too', /So flipping at u is wrong: f′ has to be taken at x ≈ 0\.644, which gives 1\.25\./.test(r), r);
    t.eq('the wrong point is found', await found(t), ['flip', 'point']);

    // --- u = 0: luck, then a slope of 1 ---
    await mode(t, 1);
    await press(t, 'ivULo', 3);
    r = await read(t);
    t.eq('the stepper moves a fifth at a time', await shown(t), 'u = 0');
    t.ok('forgetting to flip is right by luck at 0', /It gets it right here by luck: f′\(x\) = 1, and 1\/1 = 1, so flipping changes nothing\. Anywhere else it would be wrong\./.test(r), r);
    t.eq('luck is found', await found(t), ['flip', 'luck', 'point']);
    await mode(t, 0);
    r = await read(t);
    t.ok('arcsin has slope 1 at 0', /g′\(0\) = 1\/f′\(x\) = 1\/1 = 1\./.test(r), r);
    t.eq('a slope of 1 is found', await found(t), ['flip', 'luck', 'one', 'point']);

    // --- u = 1: the wall ---
    await press(t, 'ivUHi', 5);
    r = await read(t);
    t.ok('at u = 1 f is flat', /√\(1 − 1²\) = 0\. f′\(x\) = 0: f is flat here, so its mirror stands straight up, and g has no slope at u = 1: 1\/0 is no number\./.test(r), r);
    t.ok('and no nudge is worked', !/nudge/.test(r), r);
    t.ok('g’s tangent stands straight up', await upright(t));
    t.eq('the wall is found', await found(t), ['flip', 'luck', 'one', 'point', 'wall']);

    // --- arccos ---
    await pick(t, 1);
    t.eq('a new inverse starts at u = 0.6', await shown(t), 'u = 0.6');
    t.eq('and back on flipping at x', await pressed(t), 'true,false,false');
    await press(t, 'ivULo', 3);
    r = await read(t);
    t.ok('arccos has slope −1 at 0', /f′\(x\) = −sin x, and on 0 to π, sin x = √\(1 − cos²x\), so f′\(x\) = −√\(1 − 0²\) = −1\. .*g′\(0\) = 1\/f′\(x\) = 1\/\(−1\) = −1\./.test(r), r);
    t.ok('and falls everywhere', /Arccos falls everywhere: cos falls from 0 to π, and the mirror of a falling curve falls too\./.test(r), r);
    t.eq('the gentlest fall is found', await found(t), ['flip', 'gentle', 'luck', 'one', 'point', 'wall']);
    await mode(t, 2);
    r = await read(t);
    t.ok('flipping at u divides by sin 0', /1\/f′\(0\) = −1\/sin 0, but sin 0 = 0, so that is 1\/0, no number at all\./.test(r), r);
    t.ok('and no slip line can be drawn', !(await has(t, 'slip')));

    // --- arctan ---
    await pick(t, 2);
    t.eq('arctan starts at u = 2', await shown(t), 'u = 2');
    await press(t, 'ivULo', 1);
    r = await read(t);
    t.ok('arctan has slope 1/2 at 1', /f′\(x\) = 1\/cos²x = 1 \+ tan²x = 1 \+ 1² = 2\. .*g′\(1\) = 1\/f′\(x\) = 1\/2 = 0\.5\./.test(r), r);
    t.ok('and never stands up', /Arctan never stands straight up: tan is never flat, so 1\/f′ is always a number\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['flip', 'gentle', 'half', 'luck', 'one', 'point', 'wall']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('ivGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'ivUHi', 12);
    t.eq('up stops at 3', await shown(t), 'u = 3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('ivUHi').disabled));
    await press(t, 'ivULo', 12);
    t.eq('down stops at −3', await shown(t), 'u = −3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('ivULo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { InvSlope.moveU(-1); return InvSlope.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-invslope .wsCell button, #ivSets button, #ivModes button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each inverse button names its mirror', await t.ev(() =>
      [...document.querySelectorAll('#ivSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'g(u) = arcsin u, the mirror of sin x | g(u) = arccos u, the mirror of cos x | g(u) = arctan u, the mirror of tan x');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = tan x in blue and its mirror g\(u\) = arctan u in gold, with the point \(−1\.249, −3\) on f mirrored to \(−3, −1\.249\) on g/.test(document.querySelector('#ivFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the inverse slope workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
