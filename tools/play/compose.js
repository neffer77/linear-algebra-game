/* Order Matters: two moves of the plane, one after the other.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout follows î and ĵ through the first move and then the second, gives
 * the pair's columns and its determinant as the product of the two, and says
 * where the other order lands, drawn dashed; shear then turn is not turn then
 * shear, but flip and stretch commute; a flip done twice undoes itself; two
 * quarter-turns make a half-turn; two flips make a quarter-turn; stretch and
 * a flip give det = −2. Every button is named, it fits a phone and it adds
 * nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cmRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#cmFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#cmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, row, id) => t.ev(([row, id]) => {
  const k = ['turn', 'flip', 'swap', 'shear', 'stretch'].indexOf(id);
  document.querySelectorAll(`#${row} button`)[k].click();
}, [row, id]);
// what the figure was asked to draw, caught on its way in
const drawn = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Compose.render(); } finally { Figure.render = real; }
  return { ghost: spec.ghost || null, m: spec.m };
});
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'compose',
  title: 'Order Matters · two moves of the plane, one after the other',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers Order Matters', await t.showing('tomeCompose'));
    await t.tap('tomeCompose');
    t.eq('and one tap opens it', await t.screen(), 's-compose');

    // --- it opens on shear, then turn ---
    let r = await read(t);
    t.ok('it names both moves in order', /First shear to the right, then turn a quarter-turn anticlockwise\./.test(r), r);
    t.ok('it follows î through both', /î goes to ⟨1, 0⟩ under the first move, then to ⟨0, 1⟩ under the second\./.test(r), r);
    t.ok('and ĵ', /ĵ goes to ⟨1, 1⟩ under the first move, then to ⟨−1, 1⟩ under the second\./.test(r), r);
    t.ok('and builds the pair from where they land', /the matrix with columns ⟨0, 1⟩ and ⟨−1, 1⟩, and its determinant is 1 × 1 = 1: the two determinants multiply\./.test(r), r);
    t.ok('the other order lands elsewhere, drawn dashed', /The other way round, î lands on ⟨1, 1⟩ and ĵ on ⟨−1, 0⟩, drawn dashed: the order matters\./.test(r), r);
    t.eq('the caption names both and the dashed other order', await cap(t), 'Gold: first shear, then turn. Dashed: the other way round.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#cmFig canvas.fig')));
    let fig = await drawn(t);
    t.eq('gold is the pair, shear then turn', JSON.stringify(fig.m), '[[0,-1],[1,1]]');
    t.eq('and the other order is drawn dashed', JSON.stringify(fig.ghost), '[[1,-1],[1,0]]');
    t.eq('nothing is found before anything is pressed', await found(t), []);
    t.eq('the picked moves are shown pressed', await t.ev(() =>
      ['cmFirst', 'cmThen'].map(id => [...document.querySelectorAll(`#${id} button`)].findIndex(b => b.getAttribute('aria-pressed') === 'true')).join()), '3,0');

    // --- a flip done twice ---
    await pick(t, 'cmFirst', 'flip');
    await pick(t, 'cmThen', 'flip');
    r = await read(t);
    t.ok('a flip twice brings every arrow back', /Every arrow is back where it began: the second move undoes the first\./.test(r), r);
    t.ok('with the two minus signs multiplying away', /its determinant is \(−1\) × \(−1\) = 1/.test(r), r);
    t.ok('and no other order to try', /Both moves are the same, so there is no other order to try\./.test(r), r);
    t.eq('order and undo are found', await found(t), ['order', 'undo']);

    // --- flip and stretch commute ---
    await pick(t, 'cmThen', 'stretch');
    r = await read(t);
    t.ok('flip then stretch: det = −2', /\(−1\) × 2 = −2: the two determinants multiply\. So the unit square becomes a shape of area 2, flipped over/.test(r), r);
    t.ok('and the other order lands in the same place', /The other way round, î and ĵ land in the same places: for these two moves the order makes no difference\./.test(r), r);
    fig = await drawn(t);
    t.eq('with nothing dashed, since it would lie on top', fig.ghost, null);
    t.ok('the caption says so too', /the other order lands in the same place/.test(await cap(t)), await cap(t));
    t.eq('same and det are found', await found(t), ['det', 'order', 'same', 'undo']);
    t.ok('and the toast keeps the goal whole up to its colon', /✓ Find two different moves whose order makes no difference/.test(await toast(t)), await toast(t));

    // --- two flips make a turn ---
    await pick(t, 'cmThen', 'swap');
    r = await read(t);
    t.ok('flip then swap is a single quarter-turn', /Together they make a single move: quarter-turn anticlockwise\./.test(r), r);
    t.eq('two flips making a turn is found', await found(t), ['det', 'order', 'same', 'turn', 'undo']);

    // --- two quarter-turns ---
    await pick(t, 'cmFirst', 'turn');
    await pick(t, 'cmThen', 'turn');
    r = await read(t);
    t.ok('two quarter-turns make a half-turn', /Every arrow now points the opposite way: together they make a half-turn\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['det', 'half', 'order', 'same', 'turn', 'undo']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('cmGoals').innerText)));

    // --- every button is named ---
    const names = await t.ev(() => [...document.querySelectorAll('#cmFirst button, #cmThen button')].map(b => b.getAttribute('aria-label') || ''));
    t.eq('ten buttons, each named', names.filter(Boolean).length, 10);
    t.eq('each says which move and when', names[0] + ' | ' + names[9], 'First: quarter-turn anticlockwise | Then: stretch to twice as wide');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('Order Matters changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
