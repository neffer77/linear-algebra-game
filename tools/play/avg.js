/* The water level workshop: the average value as the height an area settles at.
 *
 * These checks open it from the Tome and drive it through its buttons: the bowl
 * x² on [0, 3] opens at level 0 with nothing found; at 2 the curve sticks up
 * more than the gaps take; at 3 the two match and the readout names the
 * average value and why the ends' average 9/2 misses; at 7/2 the gaps win; the
 * ramp levels at 5, the average of its ends; the steep curve at 2; the narrow
 * bowl at 4/3, which finishes the hunt. The shading follows the level, the
 * stepper stops at its ends, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('avRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#avFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#avGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#avSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('avC').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const levelY = t => t.ev(() => +document.querySelector('#avFig line[data-k="level"]').getAttribute('y1'));

module.exports = {
  name: 'avg',
  title: 'Water level workshop · the average value',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the water level workshop', await t.showing('tomeAvg'));
    await t.tap('tomeAvg');
    t.eq('and one tap opens it', await t.screen(), 's-avg');

    // --- the bowl at level 0 ---
    let r = await read(t);
    t.ok('it works the area under the curve', /f\(x\) = x² on \[0, 3\]\. The area under it is ∫₀³ x² dx = \[x³\/3\]₀³ = 9\./.test(r), r);
    t.ok('and what the level holds', /A flat level at height c = 0 across the same width 3 holds c × 3 = 0\./.test(r), r);
    t.ok('with the curve above it the whole way', /The curve never dips below the level, standing above it by 9 − 0 = 9 in all, so the level is too low: raise it\./.test(r), r);
    t.eq('the stepper reads the level', await shown(t), 'c = 0');
    t.eq('the caption names the colours', await cap(t), 'The curve is f, in blue, and the gold line is a flat level at height c. Blue shading is where the curve sticks up above the level, red is the gaps under it. At the average height the two hold the same.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    const y0 = await levelY(t);

    // --- too low ---
    await press(t, 'avCHi', 4);
    r = await read(t);
    t.eq('the level rises half a step at a time', await shown(t), 'c = 2');
    t.ok('the part above and the gaps below are both worked', /the area between them is about 4\.8856; where it dips below, the gaps under the level come to about 1\.8856\. They differ by 9 − 6 = 3, more than 0, so the level is too low: raise it\./.test(r), r);
    t.ok('and the gold line moves up the drawing', await levelY(t) < y0);

    // --- level ---
    await press(t, 'avCHi', 2);
    r = await read(t);
    t.ok('at 3 the two match', /about 3\.4641; where it dips below, the gaps under the level come to about 3\.4641\. They match: 9 − 9 = 0\. The water above fills the gaps below, so c = 3 is the average value, \(1\/3\) × 9 = 3\./.test(r), r);
    t.ok('and the middle of the ends is not it', /The average of the two ends, \(0 \+ 9\)\/2 = 9\/2, is not it: a curve that bends up spends most of its width low/.test(r), r);
    t.eq('the bowl is levelled', await found(t), ['bowl']);
    t.ok('with a toast', /✓ Levelled the bowl/.test(await toast(t)), await toast(t));

    // --- too high ---
    await press(t, 'avCHi', 1);
    r = await read(t);
    t.ok('past it the gaps win', /c = 7\/2 across the same width 3 holds c × 3 = 21\/2\..*They differ by 9 − 21\/2 = −3\/2, less than 0, so the level is too high: lower it\./.test(r), r);
    t.eq('too high is found', await found(t), ['bowl', 'over']);

    // --- the ramp ---
    await pick(t, 1);
    t.eq('a new curve starts at level 0', await shown(t), 'c = 0');
    await press(t, 'avCHi', 5);
    r = await read(t);
    t.ok('the ramp levels at 5', /∫₀⁴ \(2x \+ 1\) dx = \[x² \+ x\]₀⁴ = 20\..*so c = 5 is the average value, \(1\/4\) × 20 = 5\./.test(r), r);
    t.ok('which is the middle of its ends', /For a straight line that is also the average of its two ends, \(1 \+ 9\)\/2 = 5\. Only a straight line lets you take that shortcut\./.test(r), r);
    t.eq('the ramp is levelled', await found(t), ['bowl', 'over', 'ramp']);

    // --- the steep curve ---
    await pick(t, 2);
    await press(t, 'avCHi', 4);
    r = await read(t);
    t.ok('x³ levels at 2, half the middle of its ends', /so c = 2 is the average value, \(1\/2\) × 4 = 2\. The average of the two ends, \(0 \+ 8\)\/2 = 4, is not it/.test(r), r);

    // --- the narrow bowl ---
    await pick(t, 3);
    await press(t, 'avCHi', 4);
    r = await read(t);
    t.eq('its level moves in thirds', await shown(t), 'c = 4/3');
    t.ok('and levels at a fraction', /The area under it is ∫₀² x² dx = \[x³\/3\]₀² = 8\/3\..*They match: 8\/3 − 8\/3 = 0\..*\(1\/2\) × 8\/3 = 4\/3\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['bowl', 'narrow', 'over', 'ramp', 'steep']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('avGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'avCHi', 20);
    t.eq('up stops at the top of the curve', await shown(t), 'c = 4');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('avCHi').disabled));
    t.ok('where the curve never rises above the level', /The curve never rises above the level, falling short of it by 8 − 8\/3 = 16\/3 in all/.test(await read(t)), await read(t));
    await press(t, 'avCLo', 20);
    t.eq('down stops at 0', await shown(t), 'c = 0');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('avCLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Avg.moveC(-1); return Avg.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-avg .wsCell button, #avSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#avSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Bowl: f(x) = x² on [0, 3] | Ramp: f(x) = 2x + 1 on [0, 4] | Steep: f(x) = x³ on [0, 2] | Narrow: f(x) = x² on [0, 2]');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = x² on \[0, 2\] in blue, with a flat level at c = 0 in gold, below the average height/.test(document.querySelector('#avFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the water level workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
