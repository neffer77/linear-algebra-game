/* The cover-up workshop: partial fractions.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * two-factor fraction opens at x = 3 with nothing kept or found; keeping the
 * equations at x = 3 and x = 2 solves for A and B together; x = 1 and x = −2
 * cover up everything but one unknown each; the three-factor fraction falls
 * to its three roots; and the repeated factor needs one cover-up and one
 * ordinary equation, which finishes the hunt. The upright line turns red
 * where f is not defined, the keep button names its x and switches off once
 * kept, the stepper stops at its ends, every button is named, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cvRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#cvFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#cvGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const keep = t => press(t, 'cvKeep');
const pick = (t, k) => t.ev(k => document.querySelectorAll('#cvSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('cvX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const tryCol = t => t.ev(() => document.querySelector('#cvFig line[data-k="try"]').getAttribute('stroke'));
const pieces = t => t.ev(() => document.querySelectorAll('#cvFig [data-k="piece"]').length);

module.exports = {
  name: 'cover',
  title: 'Cover-up workshop · partial fractions',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the cover-up workshop', await t.showing('tomeCover'));
    await t.tap('tomeCover');
    t.eq('and one tap opens it', await t.screen(), 's-cover');

    // --- two factors, at x = 3 ---
    let r = await read(t);
    t.ok('it names the fraction and the split', /f\(x\) = \(5x \+ 1\)\/\(\(x − 1\)\(x \+ 2\)\)\. Split it as A\/\(x − 1\) \+ B\/\(x \+ 2\)\./.test(r), r);
    t.ok('and clears the fractions', /Multiply both sides by \(x − 1\)\(x \+ 2\) to clear the fractions: 5x \+ 1 = A\(x \+ 2\) \+ B\(x − 1\), which holds for every x\./.test(r), r);
    t.ok('works the equation at x = 3', /At x = 3: 16 = 5A \+ 2B\. No term vanishes, so this one equation has both unknowns in it\./.test(r), r);
    t.ok('with nothing kept yet', /No equations kept yet: keep the one at an x to use it\. Nothing is found yet\. Still to find: A and B\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 3');
    t.eq('the keep button names its x', await t.ev(() => document.getElementById('cvKeep').innerText), 'Keep the equation at x = 3');
    t.eq('the caption names the colours', await cap(t), 'The blue curve is f, and the dashed lines are where its bottom is 0. The upright line is the x you are trying: gold, or red where f is not defined. Once every unknown is found, the pieces are drawn in faint gold.');
    t.eq('nothing is found before anything is kept', await found(t), []);
    t.eq('and no pieces are drawn', await pieces(t), 0);
    const gold = await tryCol(t);

    // --- two ordinary equations, solved together ---
    await keep(t);
    t.ok('a kept equation switches its button off', await t.ev(() => document.getElementById('cvKeep').disabled));
    await press(t, 'cvXLo');
    t.ok('and a new x switches it back on', await t.ev(() => !document.getElementById('cvKeep').disabled));
    r = await read(t);
    t.ok('it offers to keep the new one', /Equations kept: x = 3\. Keep this one too to use it\./.test(r), r);
    await keep(t);
    r = await read(t);
    t.ok('two equations solve together', /Solving the equations kept at x = 2 and 3 together gives A = 2 and B = 3\./.test(r), r);
    t.ok('the split is written out and integrated', /So f\(x\) = 2\/\(x − 1\) \+ 3\/\(x \+ 2\), and each piece integrates on its own: ∫ f\(x\) dx = 2 ln\|x − 1\| \+ 3 ln\|x \+ 2\| \+ C\./.test(r), r);
    t.ok('and checked at x', /Check at x = 2: the pieces add to 2 \+ 3\/4 = 11\/4, and f\(2\) = 11\/4 too\./.test(r), r);
    t.eq('solving without a root is found', await found(t), ['solve']);
    t.ok('with a toast', /✓ Any x will do/.test(await toast(t)), await toast(t));
    t.eq('the pieces are drawn once found', await pieces(t), 2);

    // --- covering up ---
    await press(t, 'cvXLo');
    r = await read(t);
    t.ok('at x = 1 the B term vanishes', /At x = 1: 6 = 3A\. The B term vanishes, because x − 1 = 0 here, so A = 6 ÷ 3 = 2\./.test(r), r);
    t.ok('though f is not defined there', /f itself is not defined at x = 1, since \(x − 1\)\(x \+ 2\) = 0 there, but the cleared equation still holds/.test(r), r);
    const red = await tryCol(t);
    t.ok('the upright line changes colour where f is not defined', red !== gold, JSON.stringify([gold, red]));
    t.eq('looking is not keeping', await found(t), ['solve']);
    await keep(t);
    t.eq('keeping x = 1 covers up A', await found(t), ['a', 'solve']);
    await press(t, 'cvXLo', 3);
    r = await read(t);
    t.ok('at x = −2 the A term vanishes', /At x = −2: −9 = −3B\. The A term vanishes, because x \+ 2 = 0 here, so B = −9 ÷ \(−3\) = 3\./.test(r), r);
    await keep(t);
    t.eq('keeping x = −2 covers up B', await found(t), ['a', 'b', 'solve']);

    // --- three factors ---
    await pick(t, 1);
    t.eq('a new fraction starts at x = 3', await shown(t), 'x = 3');
    r = await read(t);
    t.ok('with nothing kept for it', /f\(x\) = \(2x² \+ 6x − 2\)\/\(x\(x − 1\)\(x \+ 2\)\)\..*No equations kept yet/.test(r), r);
    await press(t, 'cvXLo', 2); await keep(t);
    await press(t, 'cvXLo'); await keep(t);
    r = await read(t);
    t.ok('x = 0 covers up A', /At x = 0: −2 = −2A\. The B and C terms vanish, because x = 0 here, so A = −2 ÷ \(−2\) = 1\./.test(r), r);
    t.ok('with C still to find', /Found so far: A = 1 and B = 2\. Still to find: C\./.test(r), r);
    await press(t, 'cvXLo', 2); await keep(t);
    r = await read(t);
    t.ok('all three come out', /So f\(x\) = 1\/x \+ 2\/\(x − 1\) − 1\/\(x \+ 2\), and each piece integrates on its own: ∫ f\(x\) dx = ln\|x\| \+ 2 ln\|x − 1\| − ln\|x \+ 2\| \+ C\./.test(r), r);
    t.ok('with no solving needed', !/Solving the equations/.test(r), r);
    t.eq('all three are found', await found(t), ['a', 'b', 'solve', 'three']);

    // --- the repeated factor ---
    await pick(t, 2);
    await press(t, 'cvXLo', 4);
    r = await read(t);
    t.ok('the repeated factor splits into two powers', /f\(x\) = \(3x \+ 5\)\/\(x \+ 1\)²\. Split it as A\/\(x \+ 1\) \+ B\/\(x \+ 1\)²\./.test(r), r);
    t.ok('x = −1 gives B at once', /At x = −1: 2 = B\. The A term vanishes, because x \+ 1 = 0 here, so B = 2 at once\./.test(r), r);
    await keep(t);
    r = await read(t);
    t.ok('and says why A cannot be covered up', /Only B can be covered up: x \+ 1 appears twice in the bottom, so no x makes the A term vanish on its own\./.test(r), r);
    await press(t, 'cvXHi'); await keep(t);
    r = await read(t);
    t.ok('another x finds A', /Solving the equations kept at x = −1 and 0 together gives A = 3 and B = 2\./.test(r), r);
    t.ok('and the squared piece integrates to a power', /∫ f\(x\) dx = 3 ln\|x \+ 1\| − 2\/\(x \+ 1\) \+ C\./.test(r), r);
    t.ok('f(0) is written without a /1', /and f\(0\) = 5 too\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['a', 'b', 'rep', 'solve', 'three']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('cvGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'cvXHi', 10);
    t.eq('up stops at 4', await shown(t), 'x = 4');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('cvXHi').disabled));
    await press(t, 'cvXLo', 10);
    t.eq('down stops at −4', await shown(t), 'x = −4');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('cvXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Cover.moveX(-1); return Cover.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-cover .wsCell button, #cvSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each fraction button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#cvSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Two factors: f(x) = (5x + 1)/((x − 1)(x + 2)) | Three factors: f(x) = (2x² + 6x − 2)/(x(x − 1)(x + 2)) | Repeated: f(x) = (3x + 5)/(x + 1)²');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) in blue, with x = −4 marked/.test(document.querySelector('#cvFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the cover-up workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
