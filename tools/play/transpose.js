/* The transpose workshop: rows into columns, by hand.
 *
 * These checks open it from the Tome and drive it by tapping cells: the wide
 * matrix opens 2×3 with an empty 3×2 Aᵀ whose slots stay off until an entry
 * is held; 2 copied to its own spot is turned away with the reason and the
 * slip named, then lands where it belongs; 1 on the diagonal stays put; a
 * full first column reads as A's first row; the wide one fills and its shape
 * turns; the square one swaps its off-diagonal pair; and the symmetric one
 * takes entries copied straight across, comes out as itself and finishes the
 * hunt. A held entry can be put back, every cell is named, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tpRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#tpFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#tpGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tpSets button')[k].click(), k);
const take = (t, i, j) => t.ev(([i, j]) => document.querySelector(`#tpFig [data-a="${i},${j}"]`).click(), [i, j]);
const drop = (t, p, q) => t.ev(([p, q]) => document.querySelector(`#tpFig [data-t="${p},${q}"]`).click(), [p, q]);
const move = async (t, i, j, p, q) => { await take(t, i, j); await drop(t, p, q); };
const grid = (t, k) => t.ev(k => [...document.querySelectorAll(`#tpFig [data-${k}]`)].map(b => b.innerText).join(' '), k);
const off = (t, k) => t.ev(k => [...document.querySelectorAll(`#tpFig [data-${k}]`)].filter(b => b.disabled).length, k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'transpose',
  title: 'Transpose workshop · rows into columns, by hand',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the transpose workshop', await t.showing('tomeTranspose'));
    await t.tap('tomeTranspose');
    t.eq('and one tap opens it', await t.screen(), 's-transpose');

    // --- the wide matrix, as it opens ---
    let r = await read(t);
    t.ok('it names the shape and the flipped shape', /A is 2×3, so Aᵀ is 3×2\. Row 1 of A becomes column 1 of Aᵀ, and so on: an entry in row i, column j of A moves to row j, column i\./.test(r), r);
    t.ok('and says what to do', /Tap an entry of A to pick it up\. 0 of 6 slots of Aᵀ filled\./.test(r), r);
    t.eq('A is drawn row by row', await grid(t, 'a'), '1 2 3 4 5 6');
    t.eq('and Aᵀ starts empty', await grid(t, 't'), '· · · · · ·');
    t.eq('its slots are off with nothing held', await off(t, 't'), 6);
    t.eq('the grids are 3 wide and 2 wide', await t.ev(() => [...document.querySelectorAll('#tpFig [data-grid]')].map(g => getComputedStyle(g).gridTemplateColumns.split(' ').length).join(' ')), '3 2');
    t.eq('the caption says how to play and what the edges mean', await cap(t), 'Tap an entry of A, then the slot in Aᵀ where it goes. Gold-edged cells are the main diagonal, where the row and column numbers match; a red edge marks a slot that turned an entry away.');
    t.eq('nothing is found before anything is moved', await found(t), []);

    // --- the copy slip ---
    await take(t, 0, 1);
    r = await read(t);
    t.ok('a held entry is named with where it came from', /You are holding 2, from row 1, column 2 of A\. Tap the slot in Aᵀ where it belongs\./.test(r), r);
    t.eq('it shows as held', await t.ev(() => document.querySelector('#tpFig [data-a="0,1"]').getAttribute('aria-pressed')), 'true');
    t.eq('and the slots switch on', await off(t, 't'), 0);
    await drop(t, 0, 1);
    r = await read(t);
    t.ok('copied to its own spot, it is turned away with the reason', /2 is in row 1, column 2 of A, so it belongs in row 2, column 1 of Aᵀ\. The slot you tapped, row 1, column 2, takes the entry from row 2, column 1 of A, which is 4\. That is the slip everybody makes once: copying an entry to the same spot instead of flipping it across the diagonal\./.test(r), r);
    t.eq('the slip is found', await found(t), ['slip']);
    t.ok('with a toast', /✓ Copied, not flipped/.test(await toast(t)), await toast(t));
    t.eq('the slot stays empty', await grid(t, 't'), '· · · · · ·');
    await drop(t, 1, 0);
    r = await read(t);
    t.ok('then it lands where it belongs', /Yes: 2 was in row 1, column 2 of A, and now sits in row 2, column 1 of Aᵀ\./.test(r), r);
    t.eq('and is written there', await grid(t, 't'), '· · 2 · · ·');
    t.ok('its A cell is used up', await t.ev(() => document.querySelector('#tpFig [data-a="0,1"]').disabled));

    // --- the diagonal, and a column ---
    await move(t, 0, 0, 0, 0);
    r = await read(t);
    t.ok('a diagonal entry stays put', /1 sits on the main diagonal, in row 1, column 1, where the row and column numbers match, so it stays put\./.test(r), r);
    t.eq('the diagonal is found', await found(t), ['diag', 'slip']);
    await move(t, 0, 2, 2, 0);
    r = await read(t);
    t.ok('a full column reads as a row of A', /Column 1 of Aᵀ reads 1, 2, 3 going down, just as row 1 of A reads 1, 2, 3 going across\./.test(r), r);
    t.eq('the column is found', await found(t), ['col', 'diag', 'slip']);
    await move(t, 1, 0, 0, 1); await move(t, 1, 1, 1, 1); await move(t, 1, 2, 2, 1);
    r = await read(t);
    t.ok('filled, the wide matrix has turned tall', /6 of 6 slots of Aᵀ filled\. Aᵀ is complete: every row of A now stands as a column\. Aᵀ is not even the same shape as A: a 2×3 matrix turns into a 3×2\./.test(r), r);
    t.eq('Aᵀ reads row by row', await grid(t, 't'), '1 4 2 5 3 6');
    t.eq('the wide one is found', await found(t), ['col', 'diag', 'slip', 'wide']);

    // --- the square one ---
    await pick(t, 1);
    r = await read(t);
    t.ok('a square matrix keeps its shape', /A is 2×2, so Aᵀ is 2×2 too\./.test(r), r);
    t.eq('and starts empty again', await grid(t, 't'), '· · · ·');
    await take(t, 0, 0); await take(t, 0, 0);
    t.ok('a second tap puts a held entry back', /Tap an entry of A to pick it up\./.test(await read(t)));
    await move(t, 0, 0, 0, 0); await move(t, 0, 1, 1, 0); await move(t, 1, 0, 0, 1); await move(t, 1, 1, 1, 1);
    r = await read(t);
    t.ok('filled, the off-diagonal pair has swapped', /Aᵀ is not A: the diagonal entries 2 and 3 stayed put, while −1 and 5 swapped places\./.test(r), r);
    t.eq('Aᵀ reads row by row', await grid(t, 't'), '2 5 −1 3');
    t.eq('the square one is found', await found(t), ['col', 'diag', 'slip', 'square', 'wide']);

    // --- the symmetric one ---
    await pick(t, 2);
    await move(t, 0, 1, 0, 1);
    r = await read(t);
    t.ok('copied straight, a symmetric entry fits anyway', /7 fits: row 1, column 2 of Aᵀ takes the entry from row 2, column 1 of A, which is also 7\./.test(r), r);
    for (const [i, j] of [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]) await move(t, i, j, i, j);
    r = await read(t);
    t.ok('and comes out as itself', /Aᵀ is complete: every row of A now stands as a column\. And Aᵀ = A: the matrix is symmetric, the same on both sides of its diagonal, so transposing it changes nothing\./.test(r), r);
    t.eq('Aᵀ is A', await grid(t, 't'), await grid(t, 'a'));
    t.eq('every goal can be found by tapping', await found(t), ['col', 'diag', 'slip', 'square', 'sym', 'wide']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('tpGoals').innerText)));
    t.eq('every A cell is used up', await off(t, 'a'), 9);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tpFig button, #tpSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each matrix button names its shape', await t.ev(() =>
      [...document.querySelectorAll('#tpSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Wide: a 2×3 matrix | Square: a 2×2 matrix | Symmetric: a 3×3 matrix');
    t.eq('each cell reads its place and number', await t.ev(() =>
      [document.querySelector('#tpFig [data-a="2,0"]'), document.querySelector('#tpFig [data-t="0,2"]')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Row 3, column 1 of A: −2, already placed | Row 1, column 3 of Aᵀ: −2');
    t.eq('the matrix picked shows as pressed', await t.ev(() =>
      [...document.querySelectorAll('#tpSets button')].map(b => b.getAttribute('aria-pressed')).join(' ')), 'false false true');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the transpose workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
