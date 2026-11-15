/* The best fit workshop: the line that misses a handful of points least.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout names the line, works each point's miss and adds the misses and
 * their squares; on the line-up, y = x misses every point by 1 and y = x + 1
 * runs through them all; on the scatter, y = 0.5x + 2 is the least-squares
 * line through the average point, and y = x + 2 has misses that add to 0 yet
 * is beaten; with the far point, y = −1 runs through the four in a row but
 * pays 25 for the far one, and y = x is best, which finishes the hunt. The
 * figure draws the line and a red arrow for each miss; the steppers stop at
 * their ends even pressed past them, and every button is named. It fits a
 * phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ftRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#ftFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#ftGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const NM = { m: 'the slope m', c: 'the height c' };
const btn = (w, up) => `${up ? 'Raise' : 'Lower'} ${NM[w]}`;
const press = (t, w, up, n) => t.ev(([label, n]) => {
  const b = document.querySelector(`#ftAmts button[aria-label="${label}"]`);
  for (let k = 0; k < n; k++) document.querySelector(`#ftAmts button[aria-label="${label}"]`).click();
  return !!b;
}, [btn(w, up), n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#ftSets button')[k].click(), k);
const vals = t => t.ev(() => [...document.querySelectorAll('#ftAmts b:not(.dtName)')].map(b => b.innerText).join(' '));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const misses = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Fit.render(); } finally { Figure.render = real; }
  return { arrows: spec.vecs.length, marks: spec.marks.length, eqs: spec.eqs.length };
});

module.exports = {
  name: 'fit',
  title: 'Best fit workshop · the line that misses least',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the best fit workshop', await t.showing('tomeFit'));
    await t.tap('tomeFit');
    t.eq('and one tap opens it', await t.screen(), 's-fit');

    // --- it opens on the line-up with y = 0.5x ---
    let r = await read(t);
    t.ok('it names the line and what a miss is', /The line is y = 0\.5x\. A point's miss is its y minus the line's height at its x\./.test(r), r);
    t.ok('it works each miss, minus signs bracketed', /Misses: at x = −2, −1 − \(−1\) = 0; at x = −1, 0 − \(−0\.5\) = 0\.5; at x = 1, 2 − 0\.5 = 1\.5; at x = 2, 3 − 1 = 2\./.test(r), r);
    t.ok('it adds the misses and their squares', /They add to 0 \+ 0\.5 \+ 1\.5 \+ 2 = 4, and their squares to 0 \+ 0\.25 \+ 2\.25 \+ 4 = 6\.5\./.test(r), r);
    t.ok('and says what one step either way would give', /A smaller total is out there\. One step from here: m down gives 14, m up gives 4, c down gives 11\.5, c up gives 3\.5\./.test(r), r);
    t.eq('m and c start at 0.5 and 0', await vals(t), '0.5 0');
    t.eq('the caption names the rings, the line and the arrows', await cap(t),
      'The gold rings are the points and the blue line is y = 0.5x; each red arrow is a miss, from the line to its point.');
    t.ok('a figure of the points and line is drawn', await t.ev(() => !!document.querySelector('#ftFig canvas.fig')));
    t.eq('it draws a ring per point, the line, and an arrow per miss that is not 0', await misses(t), { arrows: 3, marks: 4, eqs: 1 });
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the line-up is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#ftSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- the same miss everywhere, then none ---
    await press(t, 'm', true);
    r = await read(t);
    t.ok('y = x misses every point by 1', /The line is y = x\..*Every point misses by the same 1: sliding a line up or down adds the same amount to every miss\./.test(r), r);
    t.eq('missing by the same amount is found', await found(t), ['shift']);
    t.ok('its toast starts with a capital', /✓ Every point missed by the same amount/.test(await toast(t)), await toast(t));
    await press(t, 'c', true, 2);
    r = await read(t);
    t.ok('y = x + 1 runs through every point', /The line is y = x \+ 1\..*Every miss is 0: the line runs through every point, so no line can do better\./.test(r), r);
    t.eq('with no arrows left to draw', (await misses(t)).arrows, 0);
    t.eq('running through every point is found', await found(t), ['shift', 'through']);

    // --- the scatter's best line ---
    await pick(t, 1);
    t.eq('a new set of points keeps m and c', await vals(t), '1 1');
    await press(t, 'm', false);
    await press(t, 'c', true, 2);
    r = await read(t);
    t.ok('the scatter\'s misses add to 0 and square to 3.5', /They add to 1 − 1\.5 \+ 0\.5 \+ 0 = 0, and their squares to 1 \+ 2\.25 \+ 0\.25 \+ 0 = 3\.5\./.test(r), r);
    t.ok('y = 0.5x + 2 is named the least-squares line, through the average point', /No line does better: this is the least-squares line, the one with the smallest total of squared misses\. It runs through the average point \(0, 2\)\./.test(r), r);
    t.eq('the scatter\'s best line is found', await found(t), ['best', 'shift', 'through']);

    // --- misses that cancel are not enough ---
    await press(t, 'm', true);
    r = await read(t);
    t.ok('y = x + 2 has misses adding to 0', /They add to 2 − 1 \+ 0 − 1 = 0, and their squares to 4 \+ 1 \+ 0 \+ 1 = 6\./.test(r), r);
    t.ok('and is told that only the squares pick the best line', /The misses add to 0, yet a better line exists: misses above and below cancel out, so only their squares can pick the best line\./.test(r), r);
    t.ok('with the way back to 3.5 one step away', /m down gives 3\.5/.test(r), r);
    t.eq('cancelling misses are found', await found(t), ['best', 'cancel', 'shift', 'through']);

    // --- the far point ---
    await pick(t, 2);
    await press(t, 'm', false, 2);
    await press(t, 'c', false, 6);
    r = await read(t);
    t.ok('y = −1 runs through the four in a row', /The line is y = −1\..*at x = 2, 4 − \(−1\) = 5\./.test(r), r);
    t.ok('and the far point costs 25, more than the best line\'s 10', /The line runs through the four points in a row, but the far point misses by 5, and 5² = 25 is more than the best line's whole total of 10\./.test(r), r);
    t.eq('what the far point costs is found', await found(t), ['best', 'cancel', 'row', 'shift', 'through']);
    await press(t, 'm', true, 2);
    await press(t, 'c', true, 2);
    r = await read(t);
    t.ok('y = x is the best line with the far point', /The line is y = x\..*No line does better.*It runs through the average point \(0, 0\)\./.test(r), r);
    t.ok('and the readout says the far point tilts it', /The far point at \(2, 4\) tilts it off the four in a row: one big miss, squared, outweighs several small ones\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['best', 'cancel', 'far', 'row', 'shift', 'through']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('ftGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 'm', true, 6);
    t.ok('m stops at 2', await t.ev(l => document.querySelector(`#ftAmts button[aria-label="${l}"]`).disabled, btn('m', true)));
    t.eq('and a press past it changes nothing', await t.ev(() => { Fit.step('m', 1); return Fit.m(); }), 2);
    await press(t, 'c', false, 8);
    t.ok('c stops at −3', await t.ev(l => document.querySelector(`#ftAmts button[aria-label="${l}"]`).disabled, btn('c', false)));
    t.eq('and a press past it changes nothing', await t.ev(() => { Fit.step('c', -1); return Fit.c(); }), -3);
    t.ok('the line reads with a minus, not + −', /The line is y = 2x − 3\./.test(await read(t)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ftAmts button, #ftSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('each set of points reads its points', /^Line-up: four points on one line, at \(−2, −1\), \(−1, 0\), \(1, 2\), \(2, 3\)$/.test(await t.ev(() =>
      document.querySelectorAll('#ftSets button')[0].getAttribute('aria-label'))));
    t.ok('each number reads what it is', /^m, the slope: 2$/.test(await t.ev(() =>
      document.querySelectorAll('#ftAmts b:not(.dtName)')[0].getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the best fit workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
