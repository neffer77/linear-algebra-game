/* The Gram–Schmidt workshop: take away the shadow.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * tilted pair opens with nothing taken away and w · u₁ = 10; two copies of
 * u₁ taken away leave w = ⟨−1, 2⟩ at a right angle to u₁, drawn that way,
 * and the readout names that c as the shadow 10/5; one half copy more leans w
 * back; the half pair needs half a copy; and the square pair needs nothing,
 * which finishes the hunt. The stepper stops at its ends, every button is
 * named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gsRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#gsFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#gsGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#gsSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('gsC').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const arrows = t => t.ev(() => Object.fromEntries([...document.querySelectorAll('#gsFig svg line[data-k]')]
  .map(l => [l.dataset.k, ['x1', 'y1', 'x2', 'y2'].map(a => +l.getAttribute(a))])));
const along = s => [s[2] - s[0], s[1] - s[3]];

module.exports = {
  name: 'gram',
  title: 'Gram–Schmidt workshop · take away the shadow',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the Gram–Schmidt workshop', await t.showing('tomeGram'));
    await t.tap('tomeGram');
    t.eq('and one tap opens it', await t.screen(), 's-gram');

    // --- it opens on the tilted pair with nothing taken away ---
    let r = await read(t);
    t.ok('it names the two arrows', /u₁ = ⟨2, 1⟩ is fixed\. Take c copies of it away from u₂ = ⟨3, 4⟩, and what is left is w = u₂ − c·u₁\./.test(r), r);
    t.ok('works w', /With c = 0: w = ⟨3, 4⟩ − 0 × ⟨2, 1⟩ = ⟨3, 4⟩\./.test(r), r);
    t.ok('and says it still leans', /w · u₁ = 3 × 2 \+ 4 × 1 = 10: more than 0, so w still leans along u₁\. Each extra copy taken away lowers w · u₁ by u₁ · u₁ = 5\./.test(r), r);
    t.ok('with its length', /\|w\| = √25 = 5\./.test(r), r);
    t.eq('the stepper reads c', await shown(t), 'c = 0');
    t.eq('the caption names the colours', await cap(t), 'u₁ in gold and u₂ in blue. Dashed gold is the c copies of u₁ taken away, and w in red is what is left of u₂, drawn from the origin and again from the dashed tip to u₂.');
    let A = await arrows(t);
    t.ok('nothing dashed while nothing is taken away', !A.cu && !A.wcopy, JSON.stringify(Object.keys(A)));
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- take away two copies ---
    await press(t, 'gsCHi', 4);
    r = await read(t);
    t.eq('c steps up by halves to 2', await shown(t), 'c = 2');
    t.ok('w is what is left', /w = ⟨3, 4⟩ − 2 × ⟨2, 1⟩ = ⟨−1, 2⟩\./.test(r), r);
    t.ok('at a right angle to u₁', /w · u₁ = \(−1\) × 2 \+ 2 × 1 = 0: w is perpendicular to u₁\./.test(r), r);
    t.ok('and the shortest it can be', /\|w\| = √5 ≈ 2\.2361, the shortest w can be/.test(r), r);
    t.ok('and that c is the shadow', /That c is exactly \(u₂ · u₁\)\/\(u₁ · u₁\) = 10\/5 = 2, the length of u₂'s shadow on u₁ in copies of u₁\. Taking that shadow away is the one step of Gram–Schmidt\./.test(r), r);
    t.eq('the tilted pair is found', await found(t), ['tilt']);
    t.ok('with a toast', /✓ Straightened the tilted pair/.test(await toast(t)), await toast(t));
    A = await arrows(t);
    const w = along(A.w), u = along(A.u1), wc = along(A.wcopy);
    t.ok('the red w is drawn at a right angle to u₁', Math.abs(w[0] * u[0] + w[1] * u[1]) < 0.5, JSON.stringify([w, u]));
    t.ok('and its dashed copy runs from 2u₁ to u₂', Math.abs(wc[0] - w[0]) < 0.05 && Math.abs(wc[1] - w[1]) < 0.05 &&
      Math.abs(A.wcopy[2] - A.u2[2]) < 0.05 && Math.abs(A.wcopy[3] - A.u2[3]) < 0.05, JSON.stringify(A));
    t.ok('the drawing says so to a screen reader', await t.ev(() => /w = ⟨−1, 2⟩ in red, at a right angle to u₁/.test(document.querySelector('#gsFig svg').getAttribute('aria-label'))));

    // --- half a copy too many ---
    await press(t, 'gsCHi', 1);
    r = await read(t);
    t.ok('too much leans w back', /= −2\.5: less than 0, so too much is taken away and w leans back against u₁\./.test(r), r);
    t.eq('taking too much is found', await found(t), ['over', 'tilt']);

    // --- the half pair ---
    await pick(t, 1);
    t.eq('a new pair starts with nothing taken away', await shown(t), 'c = 0');
    await press(t, 'gsCHi', 1);
    r = await read(t);
    t.ok('half a copy straightens it', /w = ⟨1, 2⟩ − 0\.5 × ⟨3, 1⟩ = ⟨−0\.5, 1\.5⟩\. w · u₁ = \(−0\.5\) × 3 \+ 1\.5 × 1 = 0/.test(r), r);
    t.ok('and the shadow is 5/10', /= 5\/10 = 0\.5,/.test(r), r);

    // --- the square pair ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the square pair needs nothing taken away', /u₂ · u₁ = 0 from the start, so u₂ casts no shadow on u₁ and there is nothing to take away/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['half', 'none', 'over', 'tilt']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('gsGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'gsCHi', 12);
    t.eq('taking away stops at 3 copies', await shown(t), 'c = 3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('gsCHi').disabled));
    await press(t, 'gsCLo', 12);
    t.eq('putting back stops at −1', await shown(t), 'c = −1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('gsCLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Gram.moveC(-1); return Gram.c(); }), -1);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-gram .wsCell button, #gsSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each pair button reads its arrows', await t.ev(() =>
      [...document.querySelectorAll('#gsSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Tilted: u₁ = ⟨2, 1⟩, u₂ = ⟨3, 4⟩ | Half: u₁ = ⟨3, 1⟩, u₂ = ⟨1, 2⟩ | Square: u₁ = ⟨1, 1⟩, u₂ = ⟨−2, 2⟩');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the Gram–Schmidt workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
