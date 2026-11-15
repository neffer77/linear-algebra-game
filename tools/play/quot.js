/* The quotient workshop: the slope of f/g.
 *
 * These checks open it from the Tome and drive it through its buttons: x² over
 * x + 1 opens at x = 1 with slope 0.75 and nothing found; x = 0 has a flat
 * tangent; x = −1 is a gap with no slope at all; swapping the top gives minus
 * the slope and forgetting the square gives twice it there, and the nudge
 * catches both; on x over x² + 1 the top of the bump is at x = 1 and the
 * forgotten square is right by luck at x = 0; on 1 over x² + 1 the reciprocal
 * rule shows and y rises left of 0. The stepper stops at its ends, every
 * button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('qoRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#qoFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#qoGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#qoSets button')[k].click(), k);
const mode = (t, k) => t.ev(k => document.querySelectorAll('#qoModes button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#qoModes button')].map(b => b.getAttribute('aria-pressed')).join());
const shown = t => t.ev(() => document.getElementById('qoX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const has = (t, k) => t.ev(k => !!document.querySelector(`#qoFig [data-k="${k}"]`), k);

module.exports = {
  name: 'quot',
  title: 'Quotient workshop · the slope of f/g',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the quotient rule workshop', await t.showing('tomeQuot'));
    await t.tap('tomeQuot');
    t.eq('and one tap opens it', await t.screen(), 's-quot');

    // --- x² over x + 1 at x = 1 ---
    let r = await read(t);
    t.ok('it names f, g and their derivatives', /y = f\/g with f\(x\) = x² and g\(x\) = x \+ 1, so f′\(x\) = 2x and g′\(x\) = 1\./.test(r), r);
    t.ok('works the rule with every value', /The quotient rule: dy\/dx = \(f′g − fg′\)\/g² = \(\(2\)\(2\) − \(1\)\(1\)\)\/\(2\)² = 3\/4 = 0\.75\./.test(r), r);
    t.ok('and checks it with a nudge', /Check with a nudge: from x = 0\.999 to 1\.001, y goes from about 0\.49925 to about 0\.50075, so Δy\/Δx ≈ 0\.75\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 1');
    t.eq('the rule is the pressed method', await pressed(t), 'true,false,false');
    t.eq('the caption names the colours', await cap(t), 'The curve is y = f/g, in blue, with a dashed gap where g = 0. The green line is the tangent the quotient rule gives at the gold point, and a slip\'s line is drawn dashed in red.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('the tangent is drawn, with no slip line', await has(t, 'tan') && !(await has(t, 'slip')));

    // --- the slips at x = 1 ---
    await mode(t, 1);
    r = await read(t);
    t.ok('the swapped top gives minus the slope', /The slip swaps the top: \(fg′ − f′g\)\/g² = \(\(1\)\(1\) − \(2\)\(2\)\)\/\(2\)² = −3\/4 = −0\.75\./.test(r), r);
    t.ok('and the nudge catches it', /So the swapped top is wrong: it gives exactly minus the slope\. Subtraction cares about order, and f′g comes first\. The slope is 0\.75\./.test(r), r);
    t.eq('the swap is found', await found(t), ['swap']);
    t.ok('with a toast', /✓ Order matters on top/.test(await toast(t)), await toast(t));
    t.ok('and the slip\'s line is drawn beside the tangent', await has(t, 'slip') && await has(t, 'tan'));
    t.eq('the slip is the pressed method', await pressed(t), 'false,true,false');
    await mode(t, 2);
    r = await read(t);
    t.ok('forgetting the square divides by g', /The slip forgets to square g: \(f′g − fg′\)\/g = \(\(2\)\(2\) − \(1\)\(1\)\)\/\(2\) = 3\/2 = 1\.5\./.test(r), r);
    t.ok('and is caught too', /So forgetting the square is wrong: the rule divides by g² = 4, not by g = 2\. The slope is 0\.75\./.test(r), r);
    t.eq('the square is found', await found(t), ['square', 'swap']);

    // --- a flat tangent and the gap ---
    await mode(t, 0);
    await press(t, 'qoXLo', 2);
    r = await read(t);
    t.eq('the stepper moves half a step at a time', await shown(t), 'x = 0');
    t.ok('x = 0 has a flat tangent', /That agrees with dy\/dx = 0: the top f′g − fg′ is 0 here, so the tangent is flat\./.test(r), r);
    t.eq('the flat tangent is found', await found(t), ['flat', 'square', 'swap']);
    await press(t, 'qoXLo', 2);
    r = await read(t);
    t.ok('at x = −1 there is no y', /g\(−1\) = 0, so y = f\/g is not defined at x = −1: the curve has a gap here, and there is no slope to find\./.test(r), r);
    t.ok('and no slope is worked', !/quotient rule:/.test(r), r);
    t.ok('the gap is marked and no point is drawn', await has(t, 'gap-here') && !(await has(t, 'pt')) && !(await has(t, 'tan')));
    t.eq('the gap is found', await found(t), ['flat', 'hole', 'square', 'swap']);

    // --- x over x² + 1 ---
    await pick(t, 2);
    t.eq('a new fraction starts at x = 2', await shown(t), 'x = 2');
    t.eq('and back on the rule', await pressed(t), 'true,false,false');
    t.ok('this one has no gap', !(await has(t, 'gap')) && !(await has(t, 'gap-here')));
    await press(t, 'qoXLo', 2);
    r = await read(t);
    t.ok('the top of the bump is at x = 1', /\(\(1\)\(2\) − \(1\)\(2\)\)\/\(2\)² = 0\/4 = 0\..*the tangent is flat\./.test(r), r);
    t.eq('the peak is found', await found(t), ['flat', 'hole', 'peak', 'square', 'swap']);
    await press(t, 'qoXLo', 2);
    await mode(t, 2);
    r = await read(t);
    t.ok('at x = 0 the forgotten square agrees', /\(\(1\)\(1\) − \(0\)\(0\)\)\/\(1\) = 1\/1 = 1\./.test(r), r);
    t.ok('and says it is luck', /It gets it right here by luck: g\(0\) = 1, and 1² = 1, so squaring changes nothing\. Anywhere else it would be wrong\./.test(r), r);
    t.eq('luck is found', await found(t), ['flat', 'hole', 'luck', 'peak', 'square', 'swap']);

    // --- 1 over x² + 1 ---
    await pick(t, 1);
    r = await read(t);
    t.ok('the reciprocal rule shows', /Here f′ = 0, so only −fg′ is left on top: that is the reciprocal rule, \(1\/g\)′ = −g′\/g²\./.test(r), r);
    t.ok('and y falls at x = 1', /y falls as x rises here\./.test(r), r);
    await press(t, 'qoXLo', 4);
    r = await read(t);
    t.ok('y rises at x = −1', /\(\(0\)\(2\) − \(1\)\(−2\)\)\/\(2\)² = 2\/4 = 0\.5\..*y rises as x rises here\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['flat', 'hole', 'luck', 'peak', 'rise', 'square', 'swap']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('qoGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'qoXHi', 14);
    t.eq('right stops at 3', await shown(t), 'x = 3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('qoXHi').disabled));
    await press(t, 'qoXLo', 14);
    t.eq('left stops at −3', await shown(t), 'x = −3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('qoXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Quot.moveX(-1); return Quot.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-quot .wsCell button, #qoSets button, #qoModes button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each fraction button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#qoSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'y = x² over x + 1 | y = 1 over x² + 1 | y = x over x² + 1');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /y = 1 over x² \+ 1 in blue, with its tangent at x = −3, slope 0\.06/.test(document.querySelector('#qoFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the quotient rule workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
