/* The endless area workshop: an improper integral, ∫₁^∞ dx/xᵖ.
 *
 * These checks open it from the Tome and drive it through its buttons: under
 * 1/x² it opens at b = 1 with no area and nothing found; each press doubles b
 * and each doubling adds half what the one before added, so at b = 128 the
 * area is within 0.01 of 1; under 1/x³ that takes only b = 8; under 1/x every
 * doubling adds the same ln 2 and the area passes 5 at b = 256; under 1/√x it
 * passes 10 at b = 64, which finishes the hunt. The bars follow the doublings,
 * the gold limit shows only where there is one, the stepper stops at its ends,
 * every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tlRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#tlFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#tlGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tlSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('tlB').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const bars = t => t.ev(() => document.querySelectorAll('#tlFig rect[data-k="step"]').length);
const hasLim = t => t.ev(() => !!document.querySelector('#tlFig line[data-k="lim"]'));

module.exports = {
  name: 'tail',
  title: 'Endless area workshop · improper integrals',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the endless area workshop', await t.showing('tomeTail'));
    await t.tap('tomeTail');
    t.eq('and one tap opens it', await t.screen(), 's-tail');

    // --- 1/x² out to b = 1 ---
    let r = await read(t);
    t.ok('it names the curve and its area out to b', /f\(x\) = 1\/x², from x = 1 out to x = b\. Its antiderivative is −1\/x, so the area from 1 to b is 1 − 1\/b\./.test(r), r);
    t.ok('starts with no area', /Out to b = 1: the area is 1 − 1\/1 = 0\./.test(r), r);
    t.ok('and says what a press does', /Push b out: each press doubles it\./.test(r), r);
    t.eq('the stepper reads b', await shown(t), 'b = 1');
    t.eq('no bars yet', await bars(t), 0);
    t.ok('the gold limit shows', await hasLim(t));
    t.eq('the caption says what the bars are', await cap(t), 'Top: the curve from 1 to 8, with the area out to b shaded. Bottom: one bar for each doubling of b, laid end to end from 0, so the last bar ends at the area. The gold dashed line is where the area is heading.');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- doubling ---
    await press(t, 'tlBHi', 2);
    r = await read(t);
    t.eq('each press doubles b', await shown(t), 'b = 4');
    t.ok('the area out to 4', /Out to b = 4: the area is 1 − 1\/4 = 0\.75\./.test(r), r);
    t.ok('each doubling adds half the last', /Doubling b from 2 to 4 added 0\.25, half what the doubling before it added\./.test(r), r);
    t.ok('so the area closes in on 1', /geometric series with r = 1\/2, and the area closes in on ∫₁\^∞ 1\/x² dx = 1\/\(p − 1\) = 1\. Out to 4 it is 0\.25 short of it\./.test(r), r);
    t.eq('one bar per doubling', await bars(t), 2);
    await press(t, 'tlBHi', 4);
    t.eq('at 64 it is not yet within 0.01', await found(t), []);
    await press(t, 'tlBHi');
    r = await read(t);
    t.ok('at 128 it is', /Out to 128 it is about 0\.0078 short of it, within 0\.01\./.test(r), r);
    t.eq('the first area is found', await found(t), ['sq']);
    t.ok('with a toast', /✓ Closed in on 1/.test(await toast(t)), await toast(t));

    // --- 1/x³ ---
    await pick(t, 1);
    t.eq('a new curve starts at b = 1', await shown(t), 'b = 1');
    await press(t, 'tlBHi', 3);
    r = await read(t);
    t.ok('each doubling adds a quarter of the last', /Doubling b from 4 to 8 added about 0\.0234, a quarter of what the doubling before it added\./.test(r), r);
    t.ok('and it closes in on 1/2 fast', /closes in on ∫₁\^∞ 1\/x³ dx = 1\/\(p − 1\) = 1\/2\. Out to 8 it is about 0\.0078 short of it, within 0\.01\./.test(r), r);
    t.eq('the second area is found', await found(t), ['cube', 'sq']);

    // --- 1/x, the borderline ---
    await pick(t, 2);
    t.ok('and no limit line where there is no limit', !(await hasLim(t)));
    await press(t, 'tlBHi', 7);
    t.eq('ln 128 is not yet past 5', await found(t), ['cube', 'sq']);
    await press(t, 'tlBHi');
    r = await read(t);
    t.ok('every doubling adds ln 2', /Doubling b from 128 to 256 added about 0\.6931, exactly what every doubling before it added: ln 2 ≈ 0\.6931\./.test(r), r);
    t.ok('so the area never settles', /the area grows without end even though 1\/x itself falls toward 0: ∫₁\^∞ 1\/x dx diverges\. p = 1 is the borderline\./.test(r), r);
    t.eq('1/x runs away', await found(t), ['cube', 'inv', 'sq']);
    t.ok('the caption says it is redrawn', /Redrawn to fit as it grows\./.test(await cap(t)));

    // --- 1/√x ---
    await pick(t, 3);
    await press(t, 'tlBHi', 6);
    r = await read(t);
    t.ok('2√64 − 2 is 14', /Out to b = 64: the area is 2√64 − 2 = 14\./.test(r), r);
    t.ok('each doubling adds more than the last', /√2 ≈ 1\.4142 times what the doubling before it added\./.test(r), r);
    t.ok('only p > 1 closes in', /Only p > 1 makes each doubling add less than the one before\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cube', 'inv', 'root', 'sq']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('tlGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'tlBHi', 10);
    t.eq('doubling stops at 1024', await shown(t), 'b = 1024');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('tlBHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Tail.moveB(1); return Tail.n; }), 10);
    await press(t, 'tlBLo', 12);
    t.eq('halving stops at 1', await shown(t), 'b = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('tlBLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Tail.moveB(-1); return Tail.n; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-tail .wsCell button, #tlSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#tlSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = 1/x², p = 2 | f(x) = 1/x³, p = 3 | f(x) = 1/x, p = 1 | f(x) = 1/√x, p = 0.5');
    await press(t, 'tlBHi', 3);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = 1\/√x in blue with the area from 1 to 8 shaded, and 3 doublings as bars reaching 3\.6569/.test(document.querySelector('#tlFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the endless area workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
