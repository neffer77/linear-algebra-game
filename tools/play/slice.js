/* The slice workshop: a double integral, one variable at a time.
 *
 * These checks open it from the Tome and drive it through its buttons: xy
 * opens holding x = 0.5 with nothing found; x = 0 is a slice with no area;
 * sweeping on to x = 2 adds the slices up to 9; holding y instead and
 * sweeping to y = 3 gives the same 9; on x² every slice across y has the same
 * area; and on x + y the slice at 1 is the average one, which finishes the
 * hunt. The swept part is shaded only once something is swept, the stepper
 * stops at its ends and names the variable it moves, every button is named,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('scRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#scFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#scGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#scSets button')[k].click(), k);
const hold = (t, k) => t.ev(k => document.querySelectorAll('#scHold button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('scT').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const swept = t => t.ev(() => document.querySelectorAll('#scFig [data-k="swept"], #scFig [data-k="under"]').length);

module.exports = {
  name: 'slice',
  title: 'Slice workshop · double integrals',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the slice workshop', await t.showing('tomeSlice'));
    await t.tap('tomeSlice');
    t.eq('and one tap opens it', await t.screen(), 's-slice');

    // --- xy, holding x = 0.5 ---
    let r = await read(t);
    t.ok('it names the function and the rectangle', /f\(x, y\) = xy over the rectangle 0 ≤ x ≤ 2, 0 ≤ y ≤ 3\. Hold x still and the solid under f is cut into slices, each an ordinary integral in y\./.test(r), r);
    t.ok('works the slice', /Hold x = 0\.5: the slice is f\(0\.5, y\) = 0\.5y for y from 0 to 3, and its area is ∫ 0\.5y dy from y = 0 to 3, which is 2\.25\./.test(r), r);
    t.ok('and the slice area for every x', /the slice area is S\(x\) = 4\.5x\./.test(r), r);
    t.ok('and what is swept so far', /Swept from x = 0 to 0\.5: ∫ S\(x\) dx from 0 to 0\.5 = 0\.5625\./.test(r), r);
    t.eq('the stepper reads the held variable', await shown(t), 'x = 0.5');
    t.eq('the caption says what is drawn', await cap(t), 'Left, the rectangle from above, a deeper blue where f is taller, with the slice as a gold line and the part swept so far in gold. Right, each slice\'s area S against where it is cut, with the swept area under it.');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- a slice of nothing ---
    await press(t, 'scTLo');
    r = await read(t);
    t.eq('the slice steps back to x = 0', await shown(t), 'x = 0');
    t.ok('where the slice has no area', /This slice has no area: f is 0 all along it\./.test(r), r);
    t.ok('and nothing is swept', /Nothing is swept yet: step x along to add up the slices\./.test(r), r);
    t.eq('so nothing is shaded as swept', await swept(t), 0);
    t.eq('the empty slice is found', await found(t), ['zero']);
    t.ok('with a toast', /✓ A slice of nothing/.test(await toast(t)), await toast(t));

    // --- sweep to the far edge ---
    await press(t, 'scTHi', 4);
    r = await read(t);
    t.eq('the slice reaches x = 2', await shown(t), 'x = 2');
    t.eq('the swept part is shaded on both sides', await swept(t), 2);
    t.ok('the slices add up to the double integral', /Swept from x = 0 to 2: ∫ S\(x\) dx from 0 to 2 = 9\. That is every slice, so the double integral of xy over the rectangle is 9\./.test(r), r);
    t.eq('the sweep is found', await found(t), ['all', 'zero']);
    t.ok('and its button is off there', await t.ev(() => document.getElementById('scTHi').disabled));

    // --- the other way ---
    await hold(t, 1);
    t.eq('holding y starts the slice again', await shown(t), 'y = 0.5');
    t.ok('the step buttons now name y', await t.ev(() => document.getElementById('scTHi').getAttribute('aria-label') === 'Move the slice on to higher y'));
    r = await read(t);
    t.ok('slicing across y works the other integral', /Hold y = 0\.5: the slice is f\(x, 0\.5\) = 0\.5x for x from 0 to 2, and its area is ∫ 0\.5x dx from x = 0 to 2, which is 1\./.test(r), r);
    await press(t, 'scTHi', 5);
    r = await read(t);
    t.ok('and lands on the same total', /the double integral of xy over the rectangle is 9\. Slicing the other way gave the same 9: over a rectangle the order you integrate in does not matter\./.test(r), r);
    t.eq('the swap is found', await found(t), ['all', 'swap', 'zero']);

    // --- x², sliced across y ---
    await pick(t, 1);
    t.eq('a new function starts the slice again', await shown(t), 'y = 0.5');
    r = await read(t);
    t.ok('every slice is the same', /Every slice has the same area, 9, because f does not change with y\. The total is just 9 × 2 = 18\./.test(r), r);
    t.eq('not found until a second slice is looked at', await found(t), ['all', 'swap', 'zero']);
    await press(t, 'scTHi');
    t.eq('the matching slices are found', await found(t), ['all', 'flat', 'swap', 'zero']);
    await hold(t, 0);
    r = await read(t);
    t.ok('holding x instead, the slices grow', /Hold x = 0\.5: the slice is f\(0\.5, y\) = 0\.25 for y from 0 to 2, and its area is ∫ 0\.25 dy from y = 0 to 2, which is 0\.5\./.test(r), r);
    t.ok('and are not all alike', !/Every slice has the same area/.test(r), r);

    // --- x + y, the average slice ---
    await pick(t, 2);
    await press(t, 'scTHi');
    r = await read(t);
    t.ok('the slice at 1 is the average one', /Hold x = 1: the slice is f\(1, y\) = 1 \+ y for y from 0 to 2, and its area is ∫ \(1 \+ y\) dy from y = 0 to 2, which is 4\..*This slice's area, 4, is the average slice: the total 8 ÷ the width 2 = 4\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['all', 'flat', 'mid', 'swap', 'zero']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('scGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'scTLo', 10);
    t.eq('back stops at 0', await shown(t), 'x = 0');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('scTLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Slice.moveT(-1); return Slice.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-slice .wsCell button, #scSets button, #scHold button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each function button reads its formula and rectangle', await t.ev(() =>
      [...document.querySelectorAll('#scSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x, y) = xy over 0 to 2 by 0 to 3 | f(x, y) = x² over 0 to 3 by 0 to 2 | f(x, y) = x + y over 0 to 2 by 0 to 2');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /The rectangle 0 to 2 by 0 to 2 from above, sliced at x = 0, beside the slice area S\(x\) = 2x \+ 2/.test(document.querySelector('#scFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the slice workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
