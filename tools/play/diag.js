/* The diagonal workshop: eigenvectors make P⁻¹AP diagonal.
 *
 * These checks open it from the Tome and drive it by tapping arrows into P's
 * two columns: the symmetric matrix opens with P = I and neither column an
 * eigenvector; (1, 1) clears only its own column of P⁻¹AP; adding (1, −1)
 * makes it diagonal with D = 3 then 1 and the eigenvectors at a right angle;
 * two copies of one arrow leave P with no inverse; the swapped order gives
 * D = 1 then 3; the lopsided matrix diagonalises with (1, 1) and (1, −2);
 * and the shear's one eigenvector, (1, 0), is all it has, so it cannot be
 * diagonalised. Every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dgRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#dgFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#dgGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, k) => t.ev(k => document.querySelectorAll('#dgSets button')[k].click(), k);
const col = (t, k, i) => t.ev(([k, i]) => document.querySelector(`#dgCols [data-col="${k},${i}"]`).click(), [k, i]);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dgCols [data-col]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.col).join(' '));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'diag',
  title: 'Diagonal workshop · eigenvectors make P⁻¹AP diagonal',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the diagonal workshop', await t.showing('tomeDiag'));
    await t.tap('tomeDiag');
    t.eq('and one tap opens it', await t.screen(), 's-diag');

    // --- the symmetric matrix, as it opens ---
    let r = await read(t);
    t.ok('it names A and P', /A has rows \(2, 1\) and \(1, 2\)\. P has columns p₁ = \(1, 0\) and p₂ = \(0, 1\)\./.test(r), r);
    t.ok('and tests each column', /A·p₁ = \(2, 1\), which is not a multiple of p₁ = \(1, 0\), so p₁ is not an eigenvector\. A·p₂ = \(1, 2\), which is not a multiple of p₂ = \(0, 1\), so p₂ is not an eigenvector\./.test(r), r);
    t.ok('then works P⁻¹AP', /det P = \(1\)\(1\) − \(0\)\(0\) = 1\. So P has an inverse, and P⁻¹AP has rows \(2, 1\) and \(1, 2\)\. Neither column is an eigenvector, so neither column of P⁻¹AP is cleared\./.test(r), r);
    t.eq('the opening columns show as pressed', await pressed(t), '0,0 1,1');
    t.eq('the figure is drawn', await t.ev(() => !!document.querySelector('#dgFig canvas')), true);
    t.eq('the caption names the colours', await cap(t), 'p₁ in blue and p₂ in green, each on its dashed line; A·p₁ in gold and A·p₂ in red. An eigenvector\'s A·p stays on its own dashed line.');
    t.eq('nothing is found before anything is tapped', await found(t), []);

    // --- one eigenvector clears one column ---
    await col(t, 0, 2);
    r = await read(t);
    t.ok('(1, 1) is an eigenvector', /A·p₁ = \(3, 3\) = 3·p₁, so p₁ is an eigenvector, with eigenvalue 3\./.test(r), r);
    t.ok('and clears its own column only', /P⁻¹AP has rows \(3, 1\) and \(0, 1\)\. Only p₁ is an eigenvector, so only column 1 of P⁻¹AP is cleared: 3 on the diagonal and 0 beside it\. Column 2 still has 1 off the diagonal\./.test(r), r);
    t.eq('half is found', await found(t), ['half']);
    t.ok('with a toast', /✓ Half cleared/.test(await toast(t)), await toast(t));

    // --- two make it diagonal ---
    await col(t, 1, 3);
    r = await read(t);
    t.ok('with (1, −1) as well, P⁻¹AP is diagonal', /det P = \(1\)\(−1\) − \(1\)\(1\) = −2\. So P has an inverse, and P⁻¹AP has rows \(3, 0\) and \(0, 1\)\. That is diagonal: D has 3 then 1 on its diagonal, the eigenvalues in the order of P's columns\. So A = PDP⁻¹: along each eigenvector, A only stretches\./.test(r), r);
    t.ok('and the symmetric matrix\'s eigenvectors are square', /A is symmetric, and its two eigenvectors meet at a right angle\./.test(r), r);
    t.eq('diagonal is found', await found(t), ['diag', 'half']);

    // --- one line, then the other order ---
    await col(t, 0, 3);
    r = await read(t);
    t.ok('two copies of one arrow leave no inverse', /det P = \(1\)\(−1\) − \(1\)\(−1\) = 0\. So p₁ and p₂ lie on one line, P has no inverse, and P⁻¹AP cannot be formed at all\. P needs two independent columns\./.test(r), r);
    t.eq('no inverse is found', await found(t), ['diag', 'flat', 'half']);
    await col(t, 1, 2);
    r = await read(t);
    t.ok('swapped, D swaps too', /P⁻¹AP has rows \(1, 0\) and \(0, 3\)\. That is diagonal: D has 1 then 3 on its diagonal/.test(r), r);
    t.eq('the order is found', await found(t), ['diag', 'flat', 'half', 'order']);

    // --- the lopsided one ---
    await pick(t, 1);
    t.eq('a new matrix starts its columns again', await pressed(t), '0,0 1,1');
    await col(t, 0, 2); await col(t, 1, 5);
    r = await read(t);
    t.ok('it diagonalises with (1, 1) and (1, −2)', /A·p₁ = \(5, 5\) = 5·p₁, so p₁ is an eigenvector, with eigenvalue 5\. A·p₂ = \(2, −4\) = 2·p₂, so p₂ is an eigenvector, with eigenvalue 2\. det P = \(1\)\(−2\) − \(1\)\(1\) = −3\. So P has an inverse, and P⁻¹AP has rows \(5, 0\) and \(0, 2\)\. That is diagonal: D has 5 then 2/.test(r), r);
    t.ok('its eigenvectors are not square', !/right angle/.test(r), r);
    t.eq('the lopsided one is found', await found(t), ['diag', 'flat', 'half', 'order', 'skew']);

    // --- the shear ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the shear asks for its eigenvectors', /A shear slides arrows sideways\. Look for the arrows it leaves on their own line\./.test(r), r);
    await col(t, 0, 0);
    r = await read(t);
    t.ok('(1, 0) is its eigenvector', /A·p₁ = \(1, 0\) = 1·p₁, so p₁ is an eigenvector, with eigenvalue 1\./.test(r), r);
    t.ok('and there is no second', /P⁻¹AP has rows \(1, 1\) and \(0, 1\)\. Only p₁ is an eigenvector, so only column 1 of P⁻¹AP is cleared: 1 on the diagonal and 0 beside it\. Column 2 still has 1 off the diagonal\. There is no second eigenvector to find: the shear's only eigenvalue is 1, and every eigenvector lies along \(1, 0\)\. With one line of eigenvectors, no P makes P⁻¹AP diagonal, so this shear is not diagonalisable\./.test(r), r);
    t.eq('every goal can be found by tapping', await found(t), ['diag', 'flat', 'half', 'order', 'shear', 'skew']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('dgGoals').innerText)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dgCols button, #dgSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each matrix button names its rows', await t.ev(() =>
      [...document.querySelectorAll('#dgSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Symmetric: A has rows (2, 1) and (1, 2) | Lopsided: A has rows (4, 1) and (2, 3) | Shear: A has rows (1, 1) and (0, 1)');
    t.eq('each arrow button names its column and arrow', await t.ev(() =>
      [document.querySelector('#dgCols [data-col="0,5"]'), document.querySelector('#dgCols [data-col="1,7"]')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Make column 1 of P (1, −2) | Make column 2 of P (−1, 1)');
    t.eq('each column offers eight arrows', await t.ev(() =>
      [...document.querySelectorAll('#dgCols [role=group]')].map(g => g.querySelectorAll('button').length).join(' ')), '8 8');
    t.eq('the matrix picked shows as pressed', await t.ev(() =>
      [...document.querySelectorAll('#dgSets button')].map(b => b.getAttribute('aria-pressed')).join(' ')), 'false false true');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the diagonal workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
