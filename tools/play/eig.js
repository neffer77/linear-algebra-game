/* The eigenvector hunt: one arrow, four matrices.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works Av for the numbers on screen and says how far Av is knocked
 * off v's line; ⟨1, 1⟩ is stretched by 3 and ⟨1, −1⟩ left as it was on the
 * first matrix, each ticked only then; the third matrix flips ⟨1, −1⟩ with
 * λ = −1, and ⟨2, −2⟩ is a longer eigenvector on the same line; the second
 * matrix's two directions finish the hunt; the quarter-turn has none and
 * says so; the arrow of length 0 is never counted; the steppers stop at ±2
 * even pressed past it, and every button is named. It fits a phone and adds
 * nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('egRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#egFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#egGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const btn = (i, up) => `${up ? 'Raise' : 'Lower'} v's ${i ? 'second' : 'first'} number`;
const press = (t, i, up, n) => t.ev(([label, n]) => {
  const b = document.querySelector(`#egVec button[aria-label="${label}"]`);
  for (let k = 0; k < n; k++) document.querySelector(`#egVec button[aria-label="${label}"]`).click();
  return !!b;
}, [btn(i, up), n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#egMats button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'eig',
  title: 'Eigenvector hunt · the directions a matrix only stretches',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the eigenvector hunt', await t.showing('tomeEig'));
    await t.tap('tomeEig');
    t.eq('and one tap opens it', await t.screen(), 's-eig');

    // --- it opens on the first matrix with v = ⟨1, 0⟩ ---
    let r = await read(t);
    t.ok('it works Av for the numbers on screen', /Av = ⟨2·1 \+ 1·0, 1·1 \+ 2·0⟩ = ⟨2 \+ 0, 1 \+ 0⟩ = ⟨2, 1⟩\./.test(r), r);
    t.ok('and says how far Av is knocked off v\'s line', /Av is knocked about 27° off v's line, so v is not an eigenvector/.test(r), r);
    t.ok('the caption says Av has left the line', /has left v's dashed line/.test(await cap(t)));
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('a figure of v and Av is drawn', await t.ev(() => !!document.querySelector('#egFig canvas.fig')));
    t.eq('the first matrix is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#egMats button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false,false');

    // --- ⟨1, 1⟩ is stretched by 3 ---
    await press(t, 1, true);
    r = await read(t);
    t.ok('v = ⟨1, 1⟩ stays on its line, stretched by 3', /Av = ⟨3, 3⟩ = 3 × ⟨1, 1⟩: v stays on its own line, so it is an eigenvector with λ = 3\./.test(r), r);
    t.ok('and the whole line is named', /Every arrow along this line is one too/.test(r), r);
    t.ok('the caption says Av lies on the line', /lies on v's dashed line/.test(await cap(t)));
    t.eq('stretched by 3 is found', await found(t), ['sym3']);
    t.ok('the toast names it, starting with a capital', /✓ Find a direction it only stretches/.test(await toast(t)), await toast(t));

    // --- ⟨1, −1⟩ is left as it was ---
    await press(t, 1, false, 2);
    r = await read(t);
    t.ok('the sums are written with minus, not + −', /= ⟨2 − 1, 1 − 2⟩ = ⟨1, −1⟩\./.test(r), r);
    t.ok('v = ⟨1, −1⟩ is left exactly where it was', /Av = v: the matrix leaves this arrow exactly where it was, so v is an eigenvector with λ = 1\./.test(r), r);
    t.eq('left as it was is found', await found(t), ['sym1', 'sym3']);

    // --- the third matrix turns ⟨1, −1⟩ right round ---
    await pick(t, 2);
    r = await read(t);
    t.ok('on the third matrix ⟨1, −1⟩ is flipped', /Av = ⟨−1, 1⟩ = −1 × ⟨1, −1⟩: v stays on its own line, flipped to the other side, so it is an eigenvector with λ = −1\./.test(r), r);
    t.eq('the flip is found', await found(t), ['flip', 'sym1', 'sym3']);
    await press(t, 0, true);
    await press(t, 1, false);
    r = await read(t);
    t.ok('⟨2, −2⟩ is an eigenvector too, at twice the length', /= −1 × ⟨2, −2⟩/.test(r), r);
    t.eq('a longer eigenvector is found', await found(t), ['flip', 'long', 'sym1', 'sym3']);

    // --- the second matrix's two directions finish the hunt ---
    await pick(t, 1);
    t.ok('on the second matrix ⟨2, −2⟩ is stretched by 2', /λ = 2\./.test(await read(t)));
    await press(t, 1, true, 2);
    t.ok('and ⟨2, 0⟩ by 3', /Av = ⟨6, 0⟩ = 3 × ⟨2, 0⟩/.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['flip', 'long', 'sym1', 'sym3', 'tri2', 'tri3']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('egGoals').innerText)));

    // --- the quarter-turn keeps no direction ---
    await pick(t, 3);
    r = await read(t);
    t.ok('the quarter-turn knocks ⟨2, 0⟩ exactly 90° off', /Av is knocked 90° off v's line/.test(r), r);
    t.ok('and says it has no real eigenvectors at all', /no direction stays on its line: it has no real eigenvectors at all/.test(r), r);

    // --- the zero arrow; the steppers' ends ---
    await press(t, 0, false, 2);
    r = await read(t);
    t.ok('v = ⟨0, 0⟩ is never counted', /v = ⟨0, 0⟩ is never counted as an eigenvector/.test(r), r);
    t.eq('the caption says why', await cap(t), 'An arrow of length 0 has no line to stay on.');
    await press(t, 1, true, 2);
    t.ok('v\'s second number stops at 2', await t.ev(l => document.querySelector(`#egVec button[aria-label="${l}"]`).disabled, btn(1, true)));
    t.eq('and a press past it changes nothing', await t.ev(() => { Eigen.step(1, 1); return Eigen.v[1]; }), 2);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#egVec button, #egMats button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('each matrix button reads its rows', /^Matrix 2: rows 3, 1 and 0, 2$/.test(await t.ev(() =>
      document.querySelectorAll('#egMats button')[1].getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the eigenvector hunt changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
