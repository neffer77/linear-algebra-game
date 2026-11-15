/* The undo workshop: build the matrix B that puts A's move back.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout says where A sends î and ĵ, then works B on each, column by column,
 * and says whether each arrow is home; bringing one arrow home while the
 * other is away is found first, then B with rows 1, −1 and 0, 1 undoes the
 * shear and is named A⁻¹; a new A puts B back to I; the quarter-turn and the
 * tilt each have their own undo, and the flip is its own; the squash has
 * det 0, names the arrow it sends to ⟨0, 0⟩ and says nothing can undo it,
 * which finishes the hunt. The steppers stop at ±2 even pressed past them,
 * and every button is named. It fits a phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('uvRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#uvFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#uvGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const btn = (nm, up) => `${up ? 'Raise' : 'Lower'} B's ${nm} number`;
const press = (t, nm, up, n) => t.ev(([label, n]) => {
  const b = document.querySelector(`#uvB button[aria-label="${label}"]`);
  for (let k = 0; k < n; k++) document.querySelector(`#uvB button[aria-label="${label}"]`).click();
  return !!b;
}, [btn(nm, up), n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#uvMats button')[k].click(), k);
const B = t => t.ev(() => [...document.querySelectorAll('#uvB b')].map(b => b.innerText).join(' '));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'undo',
  title: 'Undo workshop · the matrix that puts a move back',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the undo workshop', await t.showing('tomeUndo'));
    await t.tap('tomeUndo');
    t.eq('and one tap opens it', await t.screen(), 's-undo');

    // --- it opens on the shear with B = I ---
    let r = await read(t);
    t.ok('it says where A sends î and ĵ', /A is a shear: it sends î to ⟨1, 0⟩ and ĵ to ⟨1, 1⟩\./.test(r), r);
    t.ok('it works B on Aî, number by number', /B sends Aî = ⟨1, 0⟩ to ⟨1·1 \+ 0·0, 0·1 \+ 1·0⟩ = ⟨1, 0⟩: î is back home\./.test(r), r);
    t.ok('and on Aĵ, which is still away', /B sends Aĵ = ⟨1, 1⟩ to ⟨1·1 \+ 0·1, 0·1 \+ 1·1⟩ = ⟨1, 1⟩: ĵ should come back to ⟨0, 1⟩\./.test(r), r);
    t.ok('it says what B still has to do', /Not yet: B undoes A only when both arrows come home\./.test(r), r);
    t.eq('B starts as I', await B(t), '1 0 0 1');
    t.eq('the caption names the colours', await cap(t), 'Grey: where A sends î and ĵ. Blue and green: where B then sends them. The rings are home.');
    t.ok('a figure of the arrows is drawn', await t.ev(() => !!document.querySelector('#uvFig canvas.fig')));
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the shear is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#uvMats button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false,false,false');

    // --- one arrow home, the other away ---
    await press(t, 'bottom-right', true);
    r = await read(t);
    t.ok('raising B\'s bottom-right sends ĵ further off', /= ⟨1, 2⟩: ĵ should come back to ⟨0, 1⟩\./.test(r), r);
    t.ok('while î stays home', /î is back home\./.test(r), r);
    t.eq('one arrow home and one away is found', await found(t), ['half']);
    t.ok('its toast starts with a capital', /✓ Brought one arrow home/.test(await toast(t)), await toast(t));

    // --- the shear's undo ---
    await press(t, 'bottom-right', false);
    await press(t, 'top-right', false);
    r = await read(t);
    t.ok('minus signs are bracketed in the working', /⟨1·1 \+ \(−1\)·1, 0·1 \+ 1·1⟩ = ⟨0, 1⟩: ĵ is back home\./.test(r), r);
    t.ok('both home names B as A⁻¹, with its rows', /Both are home, so BA = I and B undoes A: B is A⁻¹, with rows 1, −1 and 0, 1\./.test(r), r);
    t.ok('the shear is not called its own undo', !/its own undo/.test(r), r);
    t.eq('undoing the shear is found', await found(t), ['half', 'shear']);

    // --- the quarter-turn ---
    await pick(t, 1);
    t.eq('a new A puts B back to I', await B(t), '1 0 0 1');
    r = await read(t);
    t.ok('the quarter-turn sends î up and ĵ left', /A is a quarter-turn anticlockwise: it sends î to ⟨0, 1⟩ and ĵ to ⟨−1, 0⟩\./.test(r), r);
    await press(t, 'top-left', false);
    await press(t, 'top-right', true);
    await press(t, 'bottom-left', false);
    await press(t, 'bottom-right', false);
    r = await read(t);
    t.ok('the turn is undone by turning back', /B is A⁻¹, with rows 0, 1 and −1, 0\./.test(r), r);
    t.eq('undoing the quarter-turn is found', await found(t), ['half', 'shear', 'turn']);

    // --- the flip undoes itself ---
    await pick(t, 2);
    await press(t, 'top-left', false);
    await press(t, 'top-right', true);
    await press(t, 'bottom-left', true);
    await press(t, 'bottom-right', false);
    r = await read(t);
    t.ok('the flip\'s undo is the flip', /with rows 0, 1 and 1, 0\. A is its own undo: doing it twice puts everything back\./.test(r), r);
    t.eq('undoing the flip is found', await found(t), ['half', 'self', 'shear', 'turn']);

    // --- the tilt ---
    await pick(t, 3);
    await press(t, 'top-right', false);
    await press(t, 'bottom-left', false);
    await press(t, 'bottom-right', true);
    r = await read(t);
    t.ok('the tilt is undone by rows 1, −1 and −1, 2', /B is A⁻¹, with rows 1, −1 and −1, 2\./.test(r), r);
    t.eq('undoing the tilt is found', await found(t), ['half', 'self', 'shear', 'tilt', 'turn']);

    // --- nothing undoes the squash ---
    await pick(t, 4);
    r = await read(t);
    t.ok('the squash sends both arrows along one line', /A is a squash: it sends î to ⟨1, 2⟩ and ĵ to ⟨2, 4⟩\./.test(r), r);
    t.ok('its determinant is worked and is 0', /det A = 1·4 − 2·2 = 0: A squashes the whole plane onto one line/.test(r), r);
    t.ok('and it names an arrow that lands on ⟨0, 0⟩', /⟨2, −1⟩ lands on ⟨0, 0⟩ just as ⟨0, 0⟩ does\. No B can send one point back to two places, so nothing undoes A\./.test(r), r);
    t.eq('picking it is not yet trying', (await found(t)).includes('none'), false);
    await press(t, 'top-left', true);
    t.ok('turning B still says nothing undoes it', /nothing undoes A/.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['half', 'none', 'self', 'shear', 'tilt', 'turn']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('uvGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 'top-left', true, 3);
    t.ok('B\'s numbers stop at 2', await t.ev(l => document.querySelector(`#uvB button[aria-label="${l}"]`).disabled, btn('top-left', true)));
    t.eq('and a press past it changes nothing', await t.ev(() => { Undo.step(0, 0, 1); return Undo.B[0][0]; }), 2);
    await press(t, 'top-right', false, 4);
    t.ok('and at −2', await t.ev(l => document.querySelector(`#uvB button[aria-label="${l}"]`).disabled, btn('top-right', false)));
    t.eq('and a press past that changes nothing', await t.ev(() => { Undo.step(0, 1, -1); return Undo.B[0][1]; }), -2);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#uvB button, #uvMats button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('each matrix button reads its rows', /^Tilt: rows 2, 1 and 1, 1$/.test(await t.ev(() =>
      document.querySelectorAll('#uvMats button')[3].getAttribute('aria-label'))));
    t.ok('each of B\'s numbers reads its place', /^B's bottom-left number: /.test(await t.ev(() =>
      document.querySelectorAll('#uvB b')[2].getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the undo workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
