/* The cross product workshop: an arrow square to two others.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * floor u opens with v = ⟨1, 1, 1⟩, every part worked from the other two
 * slots and nothing found; v turned flat into the floor sends u × v straight
 * up, and stretched gives an area of 6; on the tilted u, v turned to −u makes
 * the zero vector; on the target set v is turned until u × v is ⟨2, 2, 1⟩;
 * and swapping the order turns it round, which finishes the hunt. Picking
 * again puts u first, the steppers stop at ±3, every button is named, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('crRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#crFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#crGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#crSets button')[k].click(), k);
const shown = t => t.ev(() => [0, 1, 2].map(i => document.getElementById('crV' + i).innerText).join(' | '));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => [...document.querySelectorAll('#crFig [data-k]')].map(e => e.dataset.k).filter(k => /^(u|v|w|zero|area)$/.test(k)).sort().join(' '));

module.exports = {
  name: 'cross',
  title: 'Cross product workshop · an arrow square to two others',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the cross product workshop', await t.showing('tomeCross'));
    await t.tap('tomeCross');
    t.eq('and one tap opens it', await t.screen(), 's-cross');

    // --- the floor u, as it opens ---
    let r = await read(t);
    t.ok('it names both arrows', /u = ⟨2, 0, 0⟩ and v = ⟨1, 1, 1⟩, and the green arrow is u × v\./.test(r), r);
    t.ok('works the first part from the other two slots', /First part, from the other two slots: u₂v₃ − u₃v₂ = \(0\)\(1\) − \(0\)\(1\) = 0\./.test(r), r);
    t.ok('and the second, round the corner', /Second part, from the other two slots: u₃v₁ − u₁v₃ = \(0\)\(1\) − \(2\)\(1\) = −2\./.test(r), r);
    t.ok('adds them up into an arrow', /So u × v = ⟨0, −2, 2⟩\./.test(r), r);
    t.ok('checks it is square to both', /It is square to both: u · \(u × v\) = \(2\)\(0\) \+ \(0\)\(−2\) \+ \(0\)\(2\) = 0, and v · \(u × v\) = \(1\)\(0\) \+ \(1\)\(−2\) \+ \(1\)\(2\) = 0\./.test(r), r);
    t.ok('and reads its length as an area', /Its length, √\(0² \+ \(−2\)² \+ 2²\) = √8 ≈ 2\.8284, is the area of the shaded parallelogram that u and v span\./.test(r), r);
    t.eq('the steppers read v', await shown(t), 'v₁ = 1 | v₂ = 1 | v₃ = 1');
    t.eq('the caption says how the 3D is drawn', await cap(t), 'Drawn in 3D with the floor tilted toward you: x comes toward you, down to the left, y runs to the right and z goes straight up, and dashed lines drop each tip to the floor. u is blue, v is gold, the green arrow is their cross product, and the shaded parallelogram is the one u and v span.');
    t.eq('three arrows and the parallelogram are drawn', await marks(t), 'area u v w');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- flat in the floor ---
    await press(t, 'crV0Lo'); await press(t, 'crV2Lo');
    r = await read(t);
    t.eq('each stepper moves one part by 1', await shown(t), 'v₁ = 0 | v₂ = 1 | v₃ = 0');
    t.ok('u × v points straight up', /So u × v = ⟨0, 0, 2⟩\..*It points straight up the z-axis, so u and v both lie flat in the floor\./.test(r), r);
    t.eq('straight up is found', await found(t), ['up']);
    t.ok('with a toast', /✓ Straight up/.test(await toast(t)), await toast(t));
    await press(t, 'crV1Hi', 2);
    r = await read(t);
    t.ok('an area of 6', /√\(0² \+ 0² \+ 6²\) = √36 = 6, is the area of the shaded parallelogram/.test(r), r);
    t.eq('the area is found', await found(t), ['area', 'up']);

    // --- the tilted u ---
    await pick(t, 1);
    t.eq('a new u starts v again', await shown(t), 'v₁ = 0 | v₂ = 1 | v₃ = 1');
    await press(t, 'crV0Lo'); await press(t, 'crV2Lo', 3);
    r = await read(t);
    t.ok('v turned to −u crosses to nothing', /So u × v = ⟨0, 0, 0⟩\. u × v is the zero vector: v = −1·u points along the same line as u, so the two span no area, and no one direction is square to both\./.test(r), r);
    t.eq('and the drawing shows a dot, not an arrow', await marks(t), 'u v zero');
    t.eq('the zero vector is found', await found(t), ['area', 'up', 'zero']);

    // --- the target ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the target set gives the general form', /With u = ⟨1, −1, 0⟩, every u × v comes out as ⟨−v₃, −v₃, v₁ \+ v₂⟩\. The target is ⟨2, 2, 1⟩, and this is not it yet\./.test(r), r);
    await press(t, 'crV0Lo'); await press(t, 'crV2Lo', 3);
    r = await read(t);
    t.ok('and v can be turned onto it', /So u × v = ⟨2, 2, 1⟩\. .*The target is ⟨2, 2, 1⟩, and this is it\./.test(r), r);
    t.eq('the target is hit', await found(t), ['aim', 'area', 'up', 'zero']);

    // --- the swap ---
    await press(t, 'crSwap');
    r = await read(t);
    t.ok('swapping puts v first in every part', /The order is swapped, so the green arrow is v × u\. First part, from the other two slots: v₂u₃ − v₃u₂ = \(1\)\(0\) − \(−2\)\(−1\) = −2\./.test(r), r);
    t.ok('and turns the arrow round', /Swapping the order turns it round: v × u = −\(u × v\), and u × v = ⟨2, 2, 1⟩\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['aim', 'area', 'flip', 'up', 'zero']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('crGoals').innerText)));
    t.eq('the swap button says it is pressed', await t.ev(() => [document.getElementById('crSwap').innerText, document.getElementById('crSwap').getAttribute('aria-pressed')].join(' | ')), 'Put u first again | true');
    await pick(t, 0);
    t.eq('picking again puts u first', await t.ev(() => [document.getElementById('crSwap').innerText, document.getElementById('crSwap').getAttribute('aria-pressed')].join(' | ')), 'Swap the order | false');

    // --- the steppers' ends ---
    await press(t, 'crV0Hi', 9);
    t.eq('up stops at 3', await shown(t), 'v₁ = 3 | v₂ = 1 | v₃ = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('crV0Hi').disabled));
    await press(t, 'crV0Lo', 9);
    t.eq('down stops at −3', await shown(t), 'v₁ = −3 | v₂ = 1 | v₃ = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('crV0Lo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Cross.moveV(0, -1); return Cross.v.join(); }), '-3,1,1');

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-cross .wsCell button, #crSets button, #crSwap')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each u button reads its u', await t.ev(() =>
      [...document.querySelectorAll('#crSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'On the floor: u = ⟨2, 0, 0⟩ | Tilted: u = ⟨1, −1, 2⟩ | Hit a target: u = ⟨1, −1, 0⟩');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /u × v = ⟨0, −2, 2⟩ in green, square to u = ⟨2, 0, 0⟩ in blue and v = ⟨−3, 1, 1⟩ in gold, length about 2\.8284/.test(document.querySelector('#crFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the cross product workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
