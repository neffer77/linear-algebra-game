/* The cofactor workshop: a 3×3 determinant along any line.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * first matrix opens with no line picked and nothing found; row 1 works two
 * minors and skips the 0; column 2 needs only one minor and agrees with row 1,
 * finding two goals at once; row 2's signs go − + −; the triangular matrix
 * starts unpicked again, and its first column leaves just the diagonal; the
 * flattened matrix comes out 0, which finishes the hunt. The grid outlines the
 * picked line and strikes out its zeros, the line buttons sit three to a row,
 * every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cfRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#cfFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#cfGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, k) => t.ev(k => document.querySelectorAll('#cfSets button')[k].click(), k);
const line = (t, k) => t.ev(k => document.querySelectorAll('#cfLines button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const outlined = t => t.ev(() => [...document.querySelectorAll('#cfFig g[data-k="cell"][data-on="true"]')].map(g => `${+g.dataset.i + 1},${+g.dataset.j + 1}`).join(' '));
const struck = t => t.ev(() => document.querySelectorAll('#cfFig line[data-k="skip"]').length);
const pressed = t => t.ev(() => [...document.querySelectorAll('#cfLines button')].map(b => b.getAttribute('aria-pressed')).join());

module.exports = {
  name: 'cof',
  title: 'Cofactor workshop · a 3×3 determinant along any line',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the cofactor workshop', await t.showing('tomeCof'));
    await t.tap('tomeCof');
    t.eq('and one tap opens it', await t.screen(), 's-cof');

    // --- the first matrix, nothing picked ---
    let r = await read(t);
    t.ok('it names the matrix and the checkerboard', /A has rows 2, 0, 1; 3, 0, 4 and 1, 5, 2\. To find det A, pick any row or column and expand along it: each entry times its minor, the 2×2 determinant left when you strike out the entry's row and column, with a sign from the checkerboard \+ − \+ \/ − \+ − \/ \+ − \+\. Pick a row or a column below\./.test(r), r);
    t.eq('the caption says what the grid shows', await cap(t), 'Each cell shows its entry, with its checkerboard sign in the corner. The row or column you expand along is outlined in gold, and a 0 on it is struck out: its term is 0.');
    t.eq('no line is outlined yet', await outlined(t), '');
    t.eq('nothing is found before a line is picked', await found(t), []);
    t.ok('the line buttons sit three to a row', await t.ev(() => { const b = [...document.querySelectorAll('#cfLines button')]; return b.length === 6 && b[0].offsetTop === b[2].offsetTop && b[3].offsetTop > b[2].offsetTop && b[3].offsetTop === b[5].offsetTop; }));

    // --- row 1 ---
    await line(t, 0);
    r = await read(t);
    t.ok('row 1 works its first minor', /Expand along row 1, where the signs go \+ − \+\. Entry \(1, 1\) is 2, with sign \+\. Strike out row 1 and column 1 to leave rows 0, 4 and 5, 2, whose determinant is 0 × 2 − 4 × 5 = −20\. The term is 2 × \(−20\) = −40\./.test(r), r);
    t.ok('and skips the 0', /Entry \(1, 2\) is 0, so its term is 0 whatever its minor is, and there is no need to work the minor out\./.test(r), r);
    t.ok('and adds the terms', /Add the terms: det A = \(−40\) \+ 0 \+ 15 = −25\. The zero on this row saved working out a minor\./.test(r), r);
    t.eq('the grid outlines row 1', await outlined(t), '1,1 1,2 1,3');
    t.eq('and strikes out its 0', await struck(t), 1);
    t.eq('one line alone finds nothing yet', await found(t), []);

    // --- column 2 ---
    await line(t, 4);
    r = await read(t);
    t.ok('column 2 needs one minor', /Entry \(3, 2\) is 5, with sign −\. Strike out row 3 and column 2 to leave rows 2, 1 and 3, 4, whose determinant is 2 × 4 − 1 × 3 = 5\. The term is −5 × 5 = −25\..*The two zeros on this column saved working out two minors\./.test(r), r);
    t.ok('and agrees with row 1', /Every row and column gives the same det A = −25: you have expanded along row 1 and column 2\./.test(r), r);
    t.eq('which finds two goals at once', await found(t), ['quick', 'same']);
    t.ok('with one toast for both', /✓ One minor instead of three · Every line agrees/.test(await toast(t)), await toast(t));
    t.eq('the grid outlines column 2 and strikes out both zeros', [await outlined(t), await struck(t)], ['1,2 2,2 3,2', 2]);
    t.eq('the picked line is marked pressed', await pressed(t), 'false,false,false,false,true,false');

    // --- row 2 ---
    await line(t, 1);
    r = await read(t);
    t.ok('row 2 starts with a minus', /Expand along row 2, where the signs go − \+ −\. Entry \(2, 1\) is 3, with sign −\..*The term is −3 × \(−5\) = 15\./.test(r), r);
    t.eq('the minus row is found', await found(t), ['mid', 'quick', 'same']);

    // --- the triangular matrix ---
    await pick(t, 1);
    t.ok('a new matrix starts with no line picked', /A has rows 3, 1, 4; 0, 2, 5 and 0, 0, −1\..*Pick a row or a column below\./.test(await read(t)));
    t.eq('and no line pressed', await pressed(t), 'false,false,false,false,false,false');
    t.eq('with nothing new found', await found(t), ['mid', 'quick', 'same']);
    await line(t, 3);
    r = await read(t);
    t.ok('its first column leaves the diagonal', /A is triangular, with 0 below its diagonal, so this column leaves one term, and det A is just the diagonal multiplied: 3 × 2 × \(−1\) = −6\./.test(r), r);
    t.eq('the triangular goal is found', await found(t), ['mid', 'quick', 'same', 'tri']);

    // --- the flattened matrix ---
    await pick(t, 2);
    await line(t, 0);
    r = await read(t);
    t.ok('the flattened matrix comes out 0', /Add the terms: det A = \(−3\) \+ 12 \+ \(−9\) = 0\. det A = 0 because row 3 is 2 × row 2 − row 1: the three rows lie in one plane, so A flattens space onto it, and a matrix with det A = 0 has no inverse\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['flat', 'mid', 'quick', 'same', 'tri']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('cfGoals').innerText)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cfLines button, #cfSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each matrix button reads its rows', await t.ev(() =>
      [...document.querySelectorAll('#cfSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Two zeros: A has rows 2, 0, 1; 3, 0, 4 and 1, 5, 2 | Triangular: A has rows 3, 1, 4; 0, 2, 5 and 0, 0, −1 | Flattened: A has rows 1, 2, 3; 4, 5, 6 and 7, 8, 9');
    t.eq('each line button says which line', await t.ev(() =>
      [...document.querySelectorAll('#cfLines button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Expand along row 1 | Expand along row 2 | Expand along row 3 | Expand along column 1 | Expand along column 2 | Expand along column 3');
    t.eq('the grid is named for a screen reader', await t.ev(() => document.querySelector('#cfFig svg').getAttribute('aria-label')), 'A as a grid, row 1 picked');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the cofactor workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
