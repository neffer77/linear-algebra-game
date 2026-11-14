/* The matrix workshop: a 2×2 matrix turned by hand, the plane redrawn on each
 * tap.
 *
 * These checks open it from the Tome, turn its numbers through the buttons a
 * player presses, and assert that the readout follows: where î and ĵ land,
 * the determinant worked out and what it does to the square, and the
 * directions the matrix keeps. They make goals the way a player would and
 * check each is ticked once and only when it is true, that the range holds at
 * its ends, that it fits a phone, and that nothing is added to the save.
 * In Match the shape a matrix is shown only as a dashed picture, and each
 * column is judged on its own until both are on their marks.
 */
'use strict';

const { sleep } = require('./harness');

/* Turn the workshop to M with a press of a real button: the matrix is set one
   step short in its top-left number, and the last step is the + or − a player
   presses. Setting it number by number would pass through matrices on the way
   that make goals of their own, and the goals ticked would depend on the order
   the numbers were turned in rather than on the matrix asked for. */
async function setM(t, M) {
  await t.ev(M => {
    const up = M[0][0] > Workshop.LO;
    Workshop.M = M.map(r => r.slice());
    Workshop.M[0][0] += up ? -1 : 1;
    document.querySelectorAll('#wsMat .wsCell')[0].querySelectorAll('button')[up ? 1 : 0].click();
  }, M);
  await sleep(60);
}
const read = t => t.ev(() => document.getElementById('wsRead').innerText);
const ticked = t => t.ev(() => [...document.querySelectorAll('#wsGoals .wsGoal.done')].map(g => g.dataset.goal));

module.exports = {
  name: 'workshop',
  title: 'Matrix workshop · turn a matrix by hand and watch the plane bend',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ines');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // --- the Tome opens it ---
    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the workshop', await t.showing('tomeWorkshop'));
    await t.tap('tomeWorkshop');
    t.eq('and one tap opens it', await t.screen(), 's-workshop');

    // --- it starts on the identity, with nothing made ---
    let r = await read(t);
    t.ok('it starts with î and ĵ where they began', /î lands on ⟨1, 0⟩/.test(r) && /ĵ lands on ⟨0, 1⟩/.test(r), r);
    t.ok('with the determinant worked out', /det = ad − bc = 1·1 − 0·0 = 1 − 0 = 1/.test(r), r);
    t.ok('and every direction kept, scaled by 1', /Every direction stays on its line: each arrow is scaled by 1/.test(r), r);
    t.eq('no goal is ticked before anything is turned', await ticked(t), []);
    t.ok('a figure of the plane is drawn', await t.ev(() => !!document.querySelector('#wsFig canvas.fig')));

    // --- the buttons turn the numbers, and the readout follows ---
    await setM(t, [[2, 0], [0, 1]]);
    r = await read(t);
    t.ok('raising the top-left stretches î', /î lands on ⟨2, 0⟩/.test(r), r);
    t.ok('and the area doubles', /= 2\. So the unit square becomes a shape of area 2, the same way round/.test(r), r);
    t.ok('two directions are kept, scaled by 1 and 2', /λ = 1 and λ = 2/.test(r), r);
    t.eq('the stretch goal is ticked', await ticked(t), ['stretch']);

    // a negative entry is bracketed in the working, and the sign folds in
    await setM(t, [[1, -2], [3, 1]]);
    r = await read(t);
    t.ok('ĵ lands on the second column', /ĵ lands on ⟨−2, 1⟩/.test(r), r);
    t.ok('a negative is bracketed and the minus folds into a plus',
      /1·1 − \(−2\)·3 = 1 \+ 6 = 7/.test(r), r);
    t.ok('this one turns every arrow', /No direction stays on its line/.test(r), r);
    t.ok('and so the spin goal is ticked', (await ticked(t)).includes('spin'));

    // --- goals are ticked when made, and stay ticked ---
    await setM(t, [[1, 0], [0, -1]]);
    t.ok('a reflection flips the square', /flipped over: the minus sign is the flip/.test(await read(t)));
    await setM(t, [[1, 2], [2, 4]]);
    r = await read(t);
    t.ok('a dependent matrix presses it flat', /pressed flat onto a line: its area becomes 0/.test(r), r);
    t.ok('and keeps the direction it is pressed onto, scaled by 5', /λ = 0 and λ = 5/.test(r), r);
    await setM(t, [[1, 1], [0, 1]]);
    t.ok('a shear keeps one direction only', /One direction stays on its line, scaled by λ = 1/.test(await read(t)));
    const got = await ticked(t);
    t.eq('each goal made so far is ticked, and only those',
      got.slice().sort(), ['flat', 'flip', 'shear', 'spin', 'stretch']);
    t.ok('the count says so', /5 of 9 made/.test(await t.ev(() => document.getElementById('wsGoals').innerText)));

    // --- the range holds at its ends ---
    const ends = await t.ev(() => {
      Workshop.M = [[4, 0], [0, -4]]; Workshop.render();
      const b = [...document.querySelectorAll('#wsMat .wsCell')];
      const up = b[0].querySelectorAll('button')[1], down = b[3].querySelectorAll('button')[0];
      up.click(); down.click();
      return { m: Workshop.M, upOff: up.disabled, downOff: document.querySelectorAll('#wsMat .wsCell')[3].querySelectorAll('button')[0].disabled };
    });
    t.eq('a number stops at 4 and at −4', ends.m, [[4, 0], [0, -4]]);
    t.ok('and the button that would pass it is greyed out', ends.downOff, JSON.stringify(ends));

    // --- every button is named for what it does ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#wsMat button')]
      .filter(b => !/^(Lower|Raise) the (top|bottom)-(left|right) number$/.test(b.getAttribute('aria-label') || '')).length);
    t.eq('each of the eight buttons says which number it moves and which way', unnamed, 0);

    // --- start again goes back to the identity, and keeps what was made ---
    await t.tapText(/Start again/);
    t.eq('start again puts the identity back', await t.ev(() => Workshop.M), [[1, 0], [0, 1]]);
    t.eq('and what was made stays made', (await ticked(t)).length, 5);

    // --- surprise me stays in range ---
    const sur = await t.ev(() => {
      let ok = true;
      for (let i = 0; i < 40; i++) { Workshop.surprise(); if (Workshop.M.flat().some(v => v < -3 || v > 3)) ok = false; }
      return ok;
    });
    t.ok('surprise me always draws numbers from −3 to 3', sur);

    // --- it fits a phone ---
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // --- all nine made ---
    for (const M of [[[0, 1], [1, 0]], [[0, -1], [1, 0]], [[2, 0], [0, 3]], [[3, 0], [0, 3]]]) await setM(t, M);
    t.eq('every goal can be made with the buttons', (await ticked(t)).length, 9);

    // --- match the shape: a matrix shown only as its picture ---
    await t.tapText(/Match the shape/);
    const m0 = await t.ev(() => ({
      goal: Workshop.goal, pressed: document.querySelector('#wsMode [aria-pressed="true"]').textContent,
      task: document.getElementById('wsTask').innerText, read: document.getElementById('wsRead').innerText,
      goals: document.getElementById('wsGoalPanel').style.display, surprise: document.getElementById('wsSurprise').style.display
    }));
    t.ok('match the shape is a mode you can switch to, and says it is on', /Match the shape/.test(m0.pressed), m0.pressed);
    t.ok('it says how to read the dashed shape', /dashed î ends on the grid: those two numbers are the first column/.test(m0.task), m0.task);
    t.ok('the target is never given as numbers', !m0.task.includes('⟨') && !m0.read.includes(JSON.stringify(m0.goal)), m0.task);
    t.ok('the goals and Surprise me step aside while matching', m0.goals === 'none' && m0.surprise === 'none', JSON.stringify(m0));
    t.ok('nothing is matched yet', /0 matched this visit/.test(m0.task), m0.task);

    // the grid can be read without counting: numbers on the axes, the dashed
    // arrows named, and a view sized to the shapes rather than fixed wide
    const drawn = await t.ev(() => {
      const said = [], real = CanvasRenderingContext2D.prototype.fillText;
      let spec = null; const render = Figure.render;
      CanvasRenderingContext2D.prototype.fillText = function (s, ...r) { said.push(String(s)); return real.call(this, s, ...r); };
      Figure.render = function (s, ...r) { spec = s; return render.call(this, s, ...r); };
      try { Workshop.render(); } finally { CanvasRenderingContext2D.prototype.fillText = real; Figure.render = render; }
      return { said, ticks: spec.ticks, span: spec.span === undefined ? null : spec.span };
    });
    t.ok('the axes carry their numbers while matching', drawn.ticks === true && ['1', '2', '−1', '−2'].every(n => drawn.said.includes(n)), JSON.stringify(drawn.said));
    t.ok('the dashed î and ĵ are named as well as the gold ones', drawn.said.filter(s => s === 'î').length === 2 && drawn.said.filter(s => s === 'ĵ').length === 2, JSON.stringify(drawn.said));
    t.ok('the view is sized to the shapes, not fixed wide', drawn.span === null, String(drawn.span));

    // one column right is named, the other not yet
    const G = m0.goal;
    await setM(t, [[G[0][0], G[0][1] === 2 ? 1 : G[0][1] + 1], [G[1][0], G[1][1]]]);
    let task = await t.ev(() => document.getElementById('wsTask').innerText);
    t.ok('with the first column right, î is on its mark and ĵ is not yet', /î ✓ on its mark · ĵ not yet/.test(task), task);

    // the whole matrix right is a match, and a new shape follows
    await setM(t, G);
    const m1 = await t.ev(() => ({ goal: Workshop.goal, task: document.getElementById('wsTask').innerText }));
    t.ok('matching both columns counts one shape', /1 matched this visit/.test(m1.task), m1.task);
    t.ok('and a different shape is set at once', JSON.stringify(m1.goal) !== JSON.stringify(G), JSON.stringify([G, m1.goal]));
    t.ok('which is never flat', await t.ev(() => Workshop.det(Workshop.goal) !== 0));

    // back to free play, and the goals return
    await t.tapText(/Free play/);
    t.ok('free play brings the goals back', await t.ev(() => document.getElementById('wsGoalPanel').style.display === '' && document.getElementById('wsTask').style.display === 'none'));

    // --- nothing is stored ---
    t.ok('the workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
