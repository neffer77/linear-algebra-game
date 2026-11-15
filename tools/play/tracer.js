/* The slope tracer workshop: what the slopes of a curve draw.
 *
 * These checks open it from the Tome and drive it through its buttons: sin x
 * opens at x = 0 with one slope marked and nothing found; π/2 has a flat
 * tangent at the top of a hump; π falls as steeply as sin x ever does;
 * stepping back to −π marks every stop and the dots trace cos x, drawn
 * dashed; cos x falls fastest at π/2; three slopes of eˣ land on eˣ itself;
 * and ln x has slope 2 at x = 0.5, which finishes the hunt. Each stop leaves
 * one dot, the stepper stops at its ends, every button is named, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tcRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#tcFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#tcGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tcSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('tcX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const dots = t => t.ev(() => document.querySelectorAll('#tcFig [data-k="dot"]').length);
const traced = t => t.ev(() => !!document.querySelector('#tcFig [data-k="traced"]'));

module.exports = {
  name: 'tracer',
  title: 'Slope tracer workshop · the derivative as a curve',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the slope tracer workshop', await t.showing('tomeTracer'));
    await t.tap('tomeTracer');
    t.eq('and one tap opens it', await t.screen(), 's-tracer');

    // --- sin x at 0 ---
    let r = await read(t);
    t.ok('it names the curve and what the dots are', /f\(x\) = sin x\. Step x along: at each stop the tangent's slope is worked out and marked as a gold dot at that height\./.test(r), r);
    t.ok('works the slope with a nudge', /At x = 0: f\(0\) = 0\. Nudge 0\.001 either side and f rises by about 0\.002 over 0\.002, so the tangent's slope here is about 1\./.test(r), r);
    t.ok('and says it is as steep as it gets', /A slope of 1 is as steep as sin x ever gets: it climbs fastest here/.test(r), r);
    t.ok('and counts the marks', /Marked so far: 1 of 9 stops\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 0');
    t.eq('one stop leaves one dot', await dots(t), 1);
    t.eq('the caption says what is drawn', await cap(t), 'The curve is f, in blue, with its tangent in green. Each gold dot is a slope you have marked, drawn at the height of that slope. Mark every stop and the curve they trace appears dashed in gold.');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- the top of the hump ---
    await press(t, 'tcXHi', 2);
    r = await read(t);
    t.eq('the stepper counts in quarters of π', await shown(t), 'x = π/2');
    t.ok('the nudge sees no change', /At x = π\/2: f\(π\/2\) = 1\. Nudge 0\.001 either side and f does not change over 0\.002, so the tangent's slope here is about 0\./.test(r), r);
    t.ok('so the tangent is flat on top', /The slope is 0: the tangent lies flat, at the top of a hump\./.test(r), r);
    t.eq('each stop passed leaves its dot', await dots(t), 3);
    t.eq('the flat tangent is found', await found(t), ['flat']);
    t.ok('with a toast', /✓ A flat tangent/.test(await toast(t)), await toast(t));

    // --- the steepest fall ---
    await press(t, 'tcXHi', 2);
    r = await read(t);
    t.ok('at π it falls as steeply as it can', /f falls by about 0\.002 over 0\.002, so the tangent's slope here is about −1\. A slope of −1 is as steep as sin x ever gets: it falls fastest here/.test(r), r);
    t.eq('the steepest fall is found', await found(t), ['flat', 'steep']);
    t.ok('and the forward button is off at the last stop', await t.ev(() => document.getElementById('tcXHi').disabled));

    // --- every stop ---
    await press(t, 'tcXLo', 8);
    r = await read(t);
    t.eq('back at −π', await shown(t), 'x = −π');
    t.eq('all nine stops are marked', await dots(t), 9);
    t.ok('and the dots trace cos x', /Every stop is marked, and the dots trace out cos x: the derivative of sin x is cos x\. Here cos\(−π\) = −1, the same as the slope\./.test(r), r);
    t.ok('drawn dashed through them', await traced(t));
    t.eq('the trace is found', await found(t), ['flat', 'steep', 'trace']);
    t.ok('and the back button is off at the first stop', await t.ev(() => document.getElementById('tcXLo').disabled));

    // --- cos x ---
    await pick(t, 1);
    t.eq('a new curve starts at x = 0', await shown(t), 'x = 0');
    t.eq('with its own single dot', await dots(t), 1);
    t.ok('and no traced curve yet', !(await traced(t)));
    await press(t, 'tcXHi', 2);
    r = await read(t);
    t.ok('cos x falls fastest at π/2', /At x = π\/2: f\(π\/2\) = 0\..*slope here is about −1\. A slope of −1 is as steep as cos x ever gets: it falls fastest here/.test(r), r);
    t.eq('the fastest fall of cos is found', await found(t), ['cos', 'flat', 'steep', 'trace']);

    // --- eˣ ---
    await pick(t, 2);
    await press(t, 'tcXHi', 2);
    r = await read(t);
    t.ok('the slope of eˣ is its own height', /At x = 1: f\(1\) ≈ 2\.7183\. Nudge 0\.001 either side and f rises by about 0\.0054366 over 0\.002, so the tangent's slope here is about 2\.7183\. The slope, about 2\.7183, is the height f\(1\) itself: the dot lands on the curve\./.test(r), r);
    t.eq('three slopes of eˣ are found', await found(t), ['cos', 'exp', 'flat', 'steep', 'trace']);

    // --- ln x ---
    await pick(t, 3);
    t.eq('ln x starts at 2.5', await shown(t), 'x = 2.5');
    await press(t, 'tcXLo', 4);
    r = await read(t);
    t.ok('ln x has slope 2 at 0.5', /At x = 0\.5: f\(0\.5\) ≈ −0\.6931\..*slope here is about 2\. A slope of 2 at x = 0\.5: ln x climbs fastest near 0 and flattens as x grows, because its slope is 1 ÷ x\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cos', 'exp', 'flat', 'ln', 'steep', 'trace']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('tcGoals').innerText)));

    // --- the stepper's ends ---
    t.ok('the back button is off at 0.5', await t.ev(() => document.getElementById('tcXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Tracer.moveX(-1); return Tracer.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-tracer .wsCell button, #tcSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#tcSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = sin x | f(x) = cos x | f(x) = eˣ | f(x) = ln x');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = ln x in blue, with its tangent at x = 0\.5, slope about 2, and 5 slopes marked as gold dots/.test(document.querySelector('#tcFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the slope tracer workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
