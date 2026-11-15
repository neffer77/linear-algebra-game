/* The eigenvalue detective: the characteristic polynomial.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * first matrix opens at λ = −2 with nothing found; λ = 0 reads det A off the
 * curve; λ = 2 is an eigenvalue, with the arrow A − λI crushes multiplied out
 * and the other eigenvalue found from the trace; the gold point turns green
 * there; the triangular matrix's eigenvalue −1 sits on its diagonal and flips
 * its arrow round; the repeated matrix's 3 counts twice; the turning matrix's
 * curve bottoms out above the axis, which finishes the hunt. The stepper stops
 * at its ends, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cpRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#cpFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#cpGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#cpSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('cpL').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const green = t => t.ev(() => document.querySelector('#cpFig circle[data-k="pt"]').getAttribute('fill') !==
  document.querySelector('#cpFig line[data-k="drop"]').getAttribute('stroke'));

module.exports = {
  name: 'detect',
  title: 'Eigenvalue detective · the characteristic polynomial',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the eigenvalue detective', await t.showing('tomeDetect'));
    await t.tap('tomeDetect');
    t.eq('and one tap opens it', await t.screen(), 's-detect');

    // --- the first matrix at λ = −2 ---
    let r = await read(t);
    t.ok('it names the matrix and what an eigenvalue is', /A has rows 4, 1 and 2, 3\. An eigenvalue is a number λ for which A − λI crushes some arrow to ⟨0, 0⟩, and that happens exactly when det\(A − λI\) = 0\./.test(r), r);
    t.ok('works out A − λI and its determinant', /At λ = −2: A − λI has rows 6, 1 and 2, 5, so det\(A − λI\) = 6 × 5 − 1 × 2 = 28\./.test(r), r);
    t.ok('says that is no eigenvalue', /That is not 0, so λ = −2 is not an eigenvalue: A − λI crushes no arrow but ⟨0, 0⟩\./.test(r), r);
    t.ok('and names the characteristic polynomial', /Worked out for every λ, det\(A − λI\) = λ² − 7λ \+ 10, the characteristic polynomial\. Its λ term is minus the trace times λ and its constant is det A: here the trace is 7 and det A = 10\./.test(r), r);
    t.eq('the stepper reads λ', await shown(t), 'λ = −2');
    t.eq('the caption names the colours', await cap(t), 'The blue curve is det(A − λI) for every λ, and the gold point is the λ you are on. It turns green where the curve meets the axis: an eigenvalue.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('the point is gold off an eigenvalue', !(await green(t)));
    t.ok('the matrices above the drawing are hidden from a screen reader, which hears them in the readout', await t.ev(() => document.getElementById('cpMat').getAttribute('aria-hidden') === 'true'));

    // --- λ = 0 ---
    await press(t, 'cpLHi', 4);
    r = await read(t);
    t.eq('the stepper moves half a step at a time', await shown(t), 'λ = 0');
    t.ok('at 0 the curve reads det A', /At λ = 0, A − λI is A itself, so this is det A = 10: the curve crosses λ = 0 at the determinant\./.test(r), r);
    t.eq('the determinant goal is found', await found(t), ['det']);
    t.ok('with a toast', /✓ At λ = 0 it is det A/.test(await toast(t)), await toast(t));

    // --- the first eigenvalue ---
    await press(t, 'cpLHi', 4);
    r = await read(t);
    t.ok('det(A − λI) is 0 at 2', /At λ = 2: A − λI has rows 2, 1 and 2, 1, so det\(A − λI\) = 2 × 1 − 1 × 2 = 0\./.test(r), r);
    t.ok('the crushed arrow is multiplied out', /λ = 2 is an eigenvalue\. One arrow A − λI crushes is ⟨1, −2⟩, and A sends it to ⟨2, −4⟩, which is 2 × ⟨1, −2⟩: A only stretches it\./.test(r), r);
    t.ok('the other eigenvalue comes from the trace', /The eigenvalues add up to the trace, 4 \+ 3 = 7, so the other one is 7 − 2 = 5\. Check: 2 × 5 = 10, which is det A\./.test(r), r);
    t.eq('the eigenvalue goal is found', await found(t), ['det', 'root']);
    t.ok('and the point turns green', await green(t));
    await press(t, 'cpLHi', 6);
    r = await read(t);
    t.ok('the other eigenvalue checks out too', /One arrow A − λI crushes is ⟨1, 1⟩, and A sends it to ⟨5, 5⟩, which is 5 × ⟨1, 1⟩/.test(r), r);

    // --- the triangular matrix ---
    await pick(t, 1);
    t.eq('a new matrix starts at λ = −2', await shown(t), 'λ = −2');
    t.eq('and picking it finds nothing by itself', await found(t), ['det', 'root']);
    t.ok('the button shows which matrix is on', await t.ev(() => [...document.querySelectorAll('#cpSets button')].map(b => b.getAttribute('aria-pressed')).join() === 'false,true,false,false'));
    await press(t, 'cpLHi', 2);
    r = await read(t);
    t.ok('a negative eigenvalue flips its arrow', /λ = −1 is an eigenvalue\. One arrow A − λI crushes is ⟨1, −2⟩, and A sends it to ⟨−1, 2⟩, which is \(−1\) × ⟨1, −2⟩: A only stretches it, flipping it round since λ is negative\./.test(r), r);
    t.ok('the other is found with negatives in brackets', /3 \+ \(−1\) = 2, so the other one is 2 − \(−1\) = 3\. Check: \(−1\) × 3 = −3, which is det A\./.test(r), r);
    t.ok('and they sit on the diagonal', /A is triangular, with 0 below its diagonal, so det\(A − λI\) is just \(3 − λ\)\(−1 − λ\): its eigenvalues are its diagonal entries, 3 and −1\./.test(r), r);
    t.eq('the triangular goal is found', await found(t), ['det', 'root', 'tri']);

    // --- the repeated matrix ---
    await pick(t, 2);
    await press(t, 'cpLHi', 10);
    r = await read(t);
    t.ok('the repeated eigenvalue counts twice', /This is the only eigenvalue, and it counts twice: 3 \+ 3 = 6 is the trace and 3 × 3 = 9 is det A\. Only the one direction ⟨1, 0⟩ stays on its line\./.test(r), r);
    t.ok('and its polynomial is a perfect square', /det\(A − λI\) = λ² − 6λ \+ 9/.test(r), r);
    t.eq('the repeated goal is found', await found(t), ['det', 'root', 'tri', 'twice']);

    // --- the turning matrix ---
    await pick(t, 3);
    await press(t, 'cpLHi', 8);
    r = await read(t);
    t.ok('the turning matrix is not 0 at 2', /At λ = 2: A − λI has rows 0, −1 and 1, 0, so det\(A − λI\) = 0 × 0 − \(−1\) × 1 = 1\./.test(r), r);
    t.ok('which is the bottom of its curve', /This is the bottom of the curve, at λ = trace\/2 = 2, and it is still 1 above 0\. The curve never reaches the axis, so no real λ works: A turns every arrow off its line and has no real eigenvalues\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['det', 'none', 'root', 'tri', 'twice']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('cpGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'cpLHi', 20);
    t.eq('up stops at 6', await shown(t), 'λ = 6');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('cpLHi').disabled));
    await press(t, 'cpLLo', 20);
    t.eq('down stops at −2', await shown(t), 'λ = −2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('cpLLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Detect.move(-1); return Detect.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-detect .wsCell button, #cpSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each matrix button reads its rows', await t.ev(() =>
      [...document.querySelectorAll('#cpSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Two roots: A has rows 4, 1 and 2, 3 | Triangular: A has rows 3, 2 and 0, −1 | Repeated: A has rows 3, 1 and 0, 3 | Turning: A has rows 2, −1 and 1, 2');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /det\(A − λI\) = λ² − 4λ \+ 5 in blue against λ, with the gold point at λ = −2, height 17/.test(document.querySelector('#cpFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the eigenvalue detective changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
