/* The implicit slope workshop: y′ without solving for y.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * circle opens at (4, 3) with nothing found, its tangent falling at −4/3 and
 * meeting the radius at a right angle; two steps on, (0, 5) has a flat
 * tangent; back to (5, 0), the formula divides by 0 and the tangent stands
 * straight up; the ellipse's top is flat; and the tilted curve, whose xy term
 * needs the product rule, climbs at (−2, 3), which finishes the hunt. The
 * point wraps round the curve, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('imRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#imFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#imGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#imSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('imK').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const label = t => t.ev(() => document.querySelector('#imFig svg').getAttribute('aria-label'));

module.exports = {
  name: 'implicit',
  title: 'Implicit slope workshop · y′ without solving for y',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the implicit slope workshop', await t.showing('tomeImplicit'));
    await t.tap('tomeImplicit');
    t.eq('and one tap opens it', await t.screen(), 's-implicit');

    // --- the circle at (4, 3) ---
    let r = await read(t);
    t.eq('the point starts at (4, 3)', await shown(t), '(4, 3)');
    t.ok('it differentiates both sides', /x² \+ y² = 25 ties y to x without solving for y, so differentiate both sides with respect to x.*each y term picks up a y′ by the chain rule\./.test(r), r);
    t.ok('and solves for y′', /2x \+ 2y·y′ = 0, so y′ = −x\/y\./.test(r), r);
    t.ok('works the point', /At \(4, 3\): x = 4 and y = 3, so y′ = −4\/3: the tangent falls\./.test(r), r);
    t.ok('checks it with a nudge', /x = 3\.99 gives y ≈ 3\.0133 and x = 4\.01 gives y ≈ 2\.9866.*which is about −1\.3334, matching y′ ≈ −1\.3333\./.test(r), r);
    t.ok('and meets the radius at a right angle', /The radius out to this point has slope y\/x = 3\/4\. The tangent's slope −4\/3 is its negative reciprocal/.test(r), r);
    t.eq('the caption names the lines', await cap(t), 'The curve is in blue and the gold point steps around it. The green line is the tangent there, and the dashed line is the radius out to the point.');
    t.ok('the drawing is named for a screen reader', /x² \+ y² = 25 in blue, with its tangent at \(4, 3\) of slope −4\/3/.test(await label(t)), await label(t));
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- the top of the circle ---
    await press(t, 'imKHi', 2);
    r = await read(t);
    t.eq('two steps on, the top', await shown(t), '(0, 5)');
    t.ok('the tangent lies flat there', /At \(0, 5\): x = 0 and y = 5, so y′ = 0: the tangent lies flat, at the very top of the curve\./.test(r), r);
    t.ok('and the radius is left out where x = 0', !/radius out to this point has slope/.test(r), r);
    t.eq('the flat tangent is found', await found(t), ['flat']);
    t.ok('with a toast', /✓ Found a flat tangent/.test(await toast(t)), await toast(t));

    // --- where y′ divides by 0 ---
    await press(t, 'imKLo', 3);
    r = await read(t);
    t.eq('back three steps to (5, 0)', await shown(t), '(5, 0)');
    t.ok('the formula divides by 0', /At \(5, 0\): y = 0, so the formula for y′ divides by 0 and there is no slope\. The tangent stands straight up, and the curve turns back on itself here\./.test(r), r);
    t.ok('and no nudge can check it', /A nudge cannot check it either: the curve has no point just right of x = 5\./.test(r), r);
    t.ok('the tangent is drawn standing up', /standing straight up/.test(await label(t)), await label(t));
    t.eq('the standing tangent is found', await found(t), ['flat', 'stand']);

    // --- it wraps round ---
    await press(t, 'imKLo');
    t.eq('one more step back wraps round the circle', await shown(t), '(4, −3)');
    await press(t, 'imKHi');
    t.eq('and forward again', await shown(t), '(5, 0)');

    // --- the ellipse ---
    await pick(t, 1);
    t.eq('a new curve starts at its second point', await shown(t), '(4, 1.5)');
    t.ok('the radius is drawn on the circle alone', await t.ev(() => !document.querySelector('#imFig [data-k="radius"]')));
    await press(t, 'imKHi', 2);
    r = await read(t);
    t.ok('the ellipse solves its own y′', /2x \+ 8y·y′ = 0, so y′ = −x\/\(4y\)\./.test(r), r);
    t.ok('and is flat at its top', /At \(0, 2\.5\): x = 0 and 4y = 10, so y′ = 0: the tangent lies flat/.test(r), r);
    t.eq('the top of the ellipse is found', await found(t), ['egg', 'flat', 'stand']);

    // --- the tilted curve ---
    await pick(t, 2);
    await press(t, 'imKHi', 2);
    r = await read(t);
    t.eq('the tilted curve at (−2, 3)', await shown(t), '(−2, 3)');
    t.ok('the xy term takes the product rule', /2x \+ \(y \+ x·y′\) \+ 2y·y′ = 0, the xy term by the product rule, so y′ = −\(2x \+ y\)\/\(x \+ 2y\)\./.test(r), r);
    t.ok('and the tangent climbs', /At \(−2, 3\): 2x \+ y = −1 and x \+ 2y = 4, so y′ = 1\/4: the tangent climbs\./.test(r), r);
    t.ok('the nudge agrees', /which is about 0\.25, matching y′ = 0\.25\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['climb', 'egg', 'flat', 'stand']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('imGoals').innerText)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-implicit .wsCell button, #imSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button reads its equation', await t.ev(() =>
      [...document.querySelectorAll('#imSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Circle: x² + y² = 25 | Ellipse: x² + 4y² = 25 | Tilted: x² + xy + y² = 7');
    t.eq('the chosen curve is marked pressed', await t.ev(() =>
      [...document.querySelectorAll('#imSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'false,false,true');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the implicit slope workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
