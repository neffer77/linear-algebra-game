/* The biggest build workshop: find the shape a fixed fence holds most in.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout states the build, writes what it holds as a formula in x, works it
 * at this x and half a metre either way, and reads the slope; at 5 m the wall
 * paddock holds 150 m² and the readout says one more width does too, but one
 * width alone is not both; at 10 m the tangent is flat and 200 m² is the most;
 * past it the slope is below 0 and widening loses; at 15 m the second 150 m²
 * width is found; the open paddock's best is a square; the box's best cut is
 * 2 cm, and its other flat tangent at 6 cm holds nothing, which finishes the
 * hunt. The figure draws the tangent where x is. The stepper stops at its ends
 * even pressed past them, and every button is named. It fits a phone and adds
 * nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('opRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#opFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#opGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#opSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('opX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const spec = t => t.ev(() => JSON.stringify({ f: window.__opSpec.f, tangent: window.__opSpec.tangent, pt: window.__opSpec.pts[0].slice(0, 2) }));

module.exports = {
  name: 'optim',
  title: 'Biggest build workshop · the most a fixed fence holds',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Brannoc');
    const before = await t.ev(() => JSON.stringify(Game.s));
    // keep the last figure the workshop draws, so its tangent can be read
    await t.ev(() => { const r = Figure.render; Figure.render = function (s, el) { if (el && el.id === 'opFig') window.__opSpec = s; return r.apply(this, arguments); }; });

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the biggest build workshop', await t.showing('tomeOptim'));
    await t.tap('tomeOptim');
    t.eq('and one tap opens it', await t.screen(), 's-optim');

    // --- it opens on the wall paddock at x = 4 ---
    let r = await read(t);
    t.ok('it states the build', /40 m of fence makes three sides of a paddock, and the castle wall is the fourth\./.test(r), r);
    t.ok('and writes what it holds in x', /With width x, the side along the wall is 40 − 2x, so A = x\(40 − 2x\) = 40x − 2x²\./.test(r), r);
    t.ok('it works the area at this x', /At x = 4 m: the side along the wall is 40 − 2·4 = 32 m, so A = 4 × 32 = 128 m²\./.test(r), r);
    t.ok('and half a metre either way', /Half a metre either way: x = 3\.5 holds 115\.5 m² and x = 4\.5 holds 139\.5 m²\./.test(r), r);
    t.ok('and reads the slope', /A′\(x\) = 40 − 4x, so A′\(4\) = 24, above 0: widening it still adds area, about 24 m² for each metre\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 4 m');
    t.eq('the caption names the colours', await cap(t), 'The gold curve is A for each x. The dashed red tangent at x = 4 has slope A′ = 24.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#opFig canvas.fig')));
    t.eq('the figure draws the curve with the tangent at x', await spec(t), '{"f":{"poly":[[-2,2],[40,1]]},"tangent":4,"pt":[4,128]}');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the wall paddock is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#opSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- 150 m² at 5 m, and the readout says it is one of two ---
    await press(t, 'opXHi', 2);
    r = await read(t);
    t.ok('at 5 m it holds 150 m²', /A = 5 × 30 = 150 m²\./.test(r), r);
    t.ok('and the readout says one more width does too', /150 m² is three quarters of the best, 200 m²\. The curve is the same on both sides of its peak at 10, so one more width holds 150 m² too\./.test(r), r);
    t.eq('one width alone is not both', await found(t), []);

    // --- the flat tangent at 10 m ---
    await press(t, 'opXHi', 10);
    r = await read(t);
    t.ok('at 10 m the tangent is flat and 200 m² is the most', /A′\(10\) = 0: the tangent is flat\. A′ is above 0 just left of 10 and below 0 just right of it, so A climbs to here and falls after: 200 m² is the most it can hold\./.test(r), r);
    t.ok('half a metre either way holds less', /x = 9\.5 holds 199\.5 m² and x = 10\.5 holds 199\.5 m²/.test(r), r);
    t.eq('the caption says flat', await cap(t), 'The gold curve is A for each x. The dashed red tangent at x = 10 has slope A′ = 0, flat.');
    t.eq('the figure moves the tangent to x', await spec(t), '{"f":{"poly":[[-2,2],[40,1]]},"tangent":10,"pt":[10,200]}');
    t.eq('the best width is found', await found(t), ['best']);
    t.ok('its toast starts with a capital', /✓ Found the widest-holding paddock/.test(await toast(t)), await toast(t));

    // --- past it, widening loses ---
    await press(t, 'opXHi');
    r = await read(t);
    t.ok('past 10 the slope is below 0', /A′\(10\.5\) = −2, below 0: widening it now loses area, about 2 m² for each metre, so the best is narrower\./.test(r), r);
    t.eq('widening that loses is found', await found(t), ['best', 'falls']);

    // --- the second width for 150 m² ---
    await press(t, 'opXHi', 9);
    r = await read(t);
    t.ok('at 15 m it holds 150 m² again', /A = 15 × 10 = 150 m²\./.test(r), r);
    t.eq('both widths for 150 m² are found', await found(t), ['best', 'falls', 'pair']);

    // --- the open paddock: the best is a square ---
    await pick(t, 1);
    t.eq('a new build starts at its own x', await shown(t), 'x = 4 m');
    r = await read(t);
    t.ok('the open paddock has four sides', /With one side x, the other is 20 − x, so A = x\(20 − x\) = 20x − x²\./.test(r), r);
    await press(t, 'opXHi', 12);
    r = await read(t);
    t.ok('its best is 100 m², a square', /100 m² is the most it can hold\. The best paddock is 10 by 10: a square\./.test(r), r);
    t.eq('the square is found', await found(t), ['best', 'falls', 'pair', 'square']);

    // --- the box ---
    await pick(t, 2);
    r = await read(t);
    t.eq('the box starts at a 1 cm cut', await shown(t), 'x = 1 cm');
    t.ok('the box is worked from its base and depth', /At x = 1 cm: the base is 12 − 2·1 = 10 cm across, so V = 1 × 10 × 10 = 100 cm³\./.test(r), r);
    t.ok('its slope factors', /V′\(x\) = 12x² − 96x \+ 144 = 12\(x − 2\)\(x − 6\), so V′\(1\) = 60, above 0: a deeper cut still adds volume, about 60 cm³ for each centimetre\./.test(r), r);
    await press(t, 'opXHi', 2);
    r = await read(t);
    t.ok('a 2 cm cut holds the most', /V′\(2\) = 0: the tangent is flat\. .* 128 cm³ is the most it can hold\. That is a box 8 by 8 and 2 deep\./.test(r), r);
    t.eq('the biggest box is found', await found(t), ['best', 'box', 'falls', 'pair', 'square']);
    await press(t, 'opXHi');
    t.ok('a deeper cut then loses', /below 0: a deeper cut now loses volume, about 21 cm³ for each centimetre, so the best is a shallower cut\./.test(await read(t)), await read(t));
    await press(t, 'opXHi', 7);
    r = await read(t);
    t.ok('at 6 cm the tangent is flat but holds nothing', /V′\(6\) = 0: the tangent is flat here too, but V = 0: the cuts meet in the middle and there is no base left\. V′ is below 0 just left of 6, so V falls to here: this flat tangent marks the least, not the most\./.test(r), r);
    t.ok('at the end only the smaller side is worked', /Half a centimetre less: x = 5\.5 holds 5\.5 cm³\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['best', 'box', 'falls', 'pair', 'square', 'trap']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('opGoals').innerText)));

    // --- the stepper's ends ---
    t.ok('the cut stops at 6 cm', await t.ev(() => document.getElementById('opXHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Optim.moveX(1); return Optim.x(); }), 6);
    await press(t, 'opXLo', 20);
    t.eq('the cut stops at half a centimetre', await shown(t), 'x = 0.5 cm');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('opXLo').disabled));
    await pick(t, 0);
    await press(t, 'opXLo', 10);
    t.eq('the wall width stops at 1 m', await shown(t), 'x = 1 m');
    t.ok('and at the end only the larger side is worked', /Half a metre more: x = 1\.5 holds 55\.5 m²\./.test(await read(t)), await read(t));
    await press(t, 'opXHi', 40);
    t.eq('and at 19 m at the other end', await shown(t), 'x = 19 m');

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-optim .wsCell button, #opSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('the stepper names the unit', await t.ev(() => document.getElementById('opXHi').getAttribute('aria-label')), 'Make x half a metre bigger');
    t.ok('each build button reads its formula', /^Wall paddock: A = x\(40 − 2x\)/.test(await t.ev(() =>
      document.querySelectorAll('#opSets button')[0].getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the biggest build workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
