/* The product rule workshop: a field that grows by two strips and a corner.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * line field, x + 1 wide and 2x + 1 deep, is 3 × 5 = 15 at x = 2; at h = 1 it
 * gains a side strip of 5, a top strip of 6 and a corner of 2, and the readout
 * says the corner still counts; closing in to h = 0.001 brings the rate within
 * 0.002 of f′g + fg′ = 11 and names f′ × g′ = 2 as only the corner's size. The
 * drawing has four pieces, the strips sit against the field and shrink with h.
 * The square's two strips are equal, the mixed field's corner outgrows its top
 * strip at h = 1, and closing in on both finishes the hunt. The stepper stops
 * at its ends, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('pdRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#pdFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#pdGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#pdSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('pdH').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const rects = t => t.ev(() => [...document.querySelectorAll('#pdFig svg rect')].map(r => ['x', 'y', 'width', 'height'].map(a => +r.getAttribute(a))));

module.exports = {
  name: 'product',
  title: 'Product rule workshop · two strips and a corner',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the product rule workshop', await t.showing('tomeProduct'));
    await t.tap('tomeProduct');
    t.eq('and one tap opens it', await t.screen(), 's-product');

    // --- it opens on the line field with h = 1 ---
    let r = await read(t);
    t.ok('it names the field and its area', /The field is f\(x\) = x \+ 1 wide and g\(x\) = 2x \+ 1 deep, so its area is f × g\. At x = 2 it is 3 × 5 = 15\./.test(r), r);
    t.ok('it reads how the sides grow', /With h = 1, x = 2 \+ 1 = 3: the width grows by Δf = 1 and the depth by Δg = 2\./.test(r), r);
    t.ok('and the two strips and the corner', /So the area gains a side strip Δf × g = 5, a top strip f × Δg = 6 and a corner Δf × Δg = 2, 13 in all\./.test(r), r);
    t.ok('then each per unit of h', /Per unit of h, the side strip adds 5, the top strip 6 and the corner 2, so the area grows at 13\./.test(r), r);
    t.ok('and where the strips are heading', /So the strips head for f′g = 1 × 5 = 5 and fg′ = 3 × 2 = 6, and the corner for 0: the area grows at f′g \+ fg′ = 5 \+ 6 = 11\. That is the product rule\./.test(r), r);
    t.ok('far out it says the corner still counts', /That is 2 from 11: at this step the corner still counts\. Bring h closer to 0\./.test(r), r);
    t.eq('the stepper reads h', await shown(t), 'h = 1');
    t.eq('the caption names the colours', await cap(t), 'The gold field is f × g at x = 2. As x moves on by h, blue is the side strip, Δf × g, green the top strip, f × Δg, and red the corner, Δf × Δg.');
    let R = await rects(t);
    t.eq('the drawing has the field, two strips and a corner', R.length, 4);
    const k0 = R[0][2] / 3;
    t.ok('drawn to one scale', Math.abs(R[0][3] - 5 * k0) < 0.05 && Math.abs(R[1][2] - 1 * k0) < 0.05 && Math.abs(R[2][3] - 2 * k0) < 0.05, JSON.stringify(R));
    t.ok('with the side strip against the field', Math.abs(R[1][0] - (R[0][0] + R[0][2])) < 0.05);
    t.ok('and the top strip on top of it', Math.abs(R[2][1] + R[2][3] - R[0][1]) < 0.05);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /side strip/.test(document.querySelector('#pdFig svg').getAttribute('aria-label'))));
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the line field is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#pdSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- close in ---
    await press(t, 'pdHLo', 4);
    r = await read(t);
    t.eq('h steps to 0.001', await shown(t), 'h = 0.001');
    t.ok('the corner is tiny', /a corner Δf × Δg = 0\.000002, 0\.011002 in all\./.test(r), r);
    t.ok('the rate is 11.002', /so the area grows at 11\.002\./.test(r), r);
    t.ok('and the readout names f′ × g′ as only the corner', /That is 0\.002 from 11: the corner has all but vanished\. Multiplying the slopes, f′ × g′ = 2, only sizes that vanishing corner, which is why it is not the derivative\./.test(r), r);
    t.eq('running the line field down is found', await found(t), ['lin']);
    t.ok('its toast starts with a capital', /✓ Ran the line field down/.test(await toast(t)), await toast(t));
    R = await rects(t);
    t.ok('the strips have shrunk to slivers', R[1][2] < 0.2 && R[2][3] < 0.2, JSON.stringify(R));

    // --- the square ---
    await pick(t, 1);
    t.eq('a new field starts h again', await shown(t), 'h = 1');
    t.eq('its two equal strips are found', await found(t), ['even', 'lin']);
    r = await read(t);
    t.ok('the square gives two equal strips', /So the strips head for f′g = 1 × 3 = 3 and fg′ = 3 × 1 = 3, and the corner for 0: the area grows at f′g \+ fg′ = 3 \+ 3 = 6\./.test(r), r);
    await press(t, 'pdHLo', 3);
    r = await read(t);
    t.ok('at h = 0.01 it is 6.01', /so the area grows at 6\.01\. That is 0\.01 from 6/.test(r), r);
    t.eq('running the square down is found', await found(t), ['even', 'lin', 'sq']);

    // --- the mixed field ---
    await pick(t, 2);
    r = await read(t);
    t.ok('far out the corner outgrows the top strip', /a side strip Δf × g = 6, a top strip f × Δg = 1 and a corner Δf × Δg = 3, 10 in all\./.test(r), r);
    t.eq('which is found', await found(t), ['corner', 'even', 'lin', 'sq']);
    t.ok("x²'s slope is worked at the point", /Δf\/h heads for f′\(1\) = 2 × 1 = 2 and Δg\/h for g′\(1\) = 1\./.test(r), r);
    await press(t, 'pdHLo', 4);
    r = await read(t);
    t.ok('closing in it is about 5.004', /the corner about 0\.002, so the area grows at about 5\.004\. That is 0\.004 from 5/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['corner', 'even', 'lin', 'mix', 'sq']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('pdGoals').innerText)));

    // --- the stepper's ends ---
    t.ok('h stops at 0.001, its button off', await t.ev(() => document.getElementById('pdHLo').disabled));
    await press(t, 'pdHHi', 9);
    t.eq('going up stops at 1', await shown(t), 'h = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('pdHHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Product.moveH(-1); return Product.h(); }), 1);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-product .wsCell button, #pdSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each field button reads its sides', await t.ev(() =>
      [...document.querySelectorAll('#pdSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Line: (x + 1)(2x + 1) | Square: x × x | Mixed: x²(x + 1)');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the product rule workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
