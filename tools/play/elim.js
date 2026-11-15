/* The elimination workshop: two equations solved by hand with row operations.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout lists both equations and the point where their lines cross; k skips
 * 0 and stops at ±3; R2 − 3·R1 clears x out of row 2, worked entry by entry;
 * dividing by −2 leaves y = 2 and says the line has not moved; R1 − 2·R2
 * leaves x = 1 and the system solved; undo and Start again put rows back; the
 * second system takes a swap, an add, a divide and an add; the third ends in
 * 0 = 2 and draws only one line; the fourth ends in 0 = 0. A divide that would
 * leave fractions is not offered, every button is named, it fits a phone and
 * adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('elRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#elFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#elGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const op = (t, label) => t.ev(label => {
  const b = document.querySelector(`#elOps button[aria-label="${label}"]`);
  if (!b || b.disabled) return false;
  b.click(); return true;
}, label);
const off = (t, label) => t.ev(label => { const b = document.querySelector(`#elOps button[aria-label="${label}"]`); return !!b && b.disabled; }, label);
const kTo = (t, by, n) => t.ev(([by, n]) => {
  for (let i = 0; i < n; i++) document.querySelector(`#elK button[aria-label="${by < 0 ? 'Lower' : 'Raise'} k"]`).click();
  return Elim.k;
}, [by, n || 1]);
const row = (t, i) => t.ev(i => document.querySelectorAll('#elRows button')[i].click(), i);
const sys = (t, i) => t.ev(i => document.querySelectorAll('#elSys button')[i].click(), i);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const drawn = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Elim.render(); } finally { Figure.render = real; }
  return JSON.stringify({ eqs: spec.eqs.map(e => [e.a, e.b, e.c]), marks: spec.marks });
});

module.exports = {
  name: 'elim',
  title: 'Elimination workshop · two equations solved with row operations',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the elimination workshop', await t.showing('tomeElim'));
    await t.tap('tomeElim');
    t.eq('and one tap opens it', await t.screen(), 's-elim');

    // --- it opens on the first system, working on row 2 ---
    let r = await read(t);
    t.ok('it lists both equations', /Row 1: x \+ 2y = 5\. Row 2: 3x \+ 4y = 11\./.test(r), r);
    t.ok('and says where their lines cross', /Both lines still cross at \(1, 2\): a row operation changes the equations, never the point that solves them\./.test(r), r);
    t.eq('the figure draws both rows as lines, ringed where they cross', await drawn(t), '{"eqs":[[1,2,5],[3,4,11]],"marks":[[1,2]]}');
    t.ok('the caption says which line is which', /Row 1's line in blue, row 2's in green; the ring is where they cross\./.test(await cap(t)));
    t.eq('row 2 is the one being changed', await t.ev(() =>
      [...document.querySelectorAll('#elRows button')].map(b => b.getAttribute('aria-pressed')).join()), 'false,true');
    t.eq('nothing is found before anything is pressed', await found(t), []);
    t.ok('multiplying by 1 is not offered', await off(t, 'Multiply row 2 by 1'));
    t.eq('k goes up to 2', await kTo(t, 1), 2);
    t.ok('a divide that would leave fractions is not offered', await off(t, 'Divide row 2 by 2'));
    t.eq('k skips 0 on the way down', await kTo(t, -1, 2), -1);
    t.eq('and stops at −3', await kTo(t, -1, 3), -3);
    t.ok('its button stops there', await t.ev(() => document.querySelector('#elK button[aria-label="Lower k"]').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Elim.stepK(-1); return Elim.k; }), -3);

    // --- clear x out of row 2 ---
    t.ok('R2 − 3·R1 is offered', await op(t, 'Subtract 3 times row 1 from row 2'));
    r = await read(t);
    t.ok('it is worked entry by entry', /R2 − 3·R1: 3 − 3·1 = 0, 4 − 3·2 = −2, 11 − 3·5 = −4, so row 2 is now −2y = −4\./.test(r), r);
    t.ok('and says x is gone and what to do next', /x is gone from row 2, which now says −2y = −4\. Divide it by \(−2\) to leave y on its own\./.test(r), r);
    t.ok('the lines still cross at (1, 2)', /still cross at \(1, 2\)/.test(r), r);
    t.eq('the new row is drawn', await drawn(t), '{"eqs":[[1,2,5],[0,-2,-4]],"marks":[[1,2]]}');
    t.eq('clearing an unknown is found', await found(t), ['gone']);
    t.ok('with its toast', /✓ Cleared an unknown out of a row/.test(await toast(t)), await toast(t));

    // --- divide row 2 by −2 ---
    await kTo(t, 1);
    t.ok('row 2 ÷ (−2) is offered', await op(t, 'Divide row 2 by −2'));
    r = await read(t);
    t.ok('it is worked, with the negative divisor bracketed', /R2 ÷ \(−2\): 0 ÷ \(−2\) = 0, −2 ÷ \(−2\) = 1, −4 ÷ \(−2\) = 2, so row 2 is now y = 2\./.test(r), r);
    t.ok('and says the line has not moved', /Row 2's line has not moved: dividing a whole equation by −2 keeps every point that solved it\./.test(r), r);
    t.eq('scaling a row is found', await found(t), ['gone', 'same']);

    // --- clear y out of row 1 ---
    await row(t, 0);
    t.eq('row 1 is now the one being changed', await t.ev(() =>
      [...document.querySelectorAll('#elRows button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false');
    t.ok('R1 − 2·R2 is offered', await op(t, 'Subtract 2 times row 2 from row 1'));
    r = await read(t);
    t.ok('it leaves x = 1', /R1 − 2·R2: 1 − 2·0 = 1, 2 − 2·1 = 0, 5 − 2·2 = 1, so row 1 is now x = 1\./.test(r), r);
    t.ok('and says the system is solved', /Row 1 says x = 1 and row 2 says y = 2: the system is solved\./.test(r), r);
    t.eq('solving the first system is found', await found(t), ['gone', 'same', 'solve']);

    // --- undo and start again ---
    await op(t, 'Undo the last step');
    t.ok('undo puts row 1 back', /Row 1: x \+ 2y = 5\. Row 2: y = 2\./.test(await read(t)));
    await op(t, 'Start this system again');
    t.ok('Start again puts both rows back', /^Row 1: x \+ 2y = 5\. Row 2: 3x \+ 4y = 11\. Both rows still hold x and y/.test(await read(t)));
    t.ok('and there is nothing left to undo', await off(t, 'Undo the last step'));

    // --- the second system: swap, add, divide, add ---
    await sys(t, 1);
    t.ok('the second system crosses at (2, 3)', /Row 1: 2x \+ y = 7\. Row 2: x − y = −1\..*still cross at \(2, 3\)/.test(await read(t)));
    await op(t, 'Swap the rows');
    t.ok('a swap is said', /Swapped the rows: row 1 is now x − y = −1 and row 2 is 2x \+ y = 7\./.test(await read(t)));
    await op(t, 'Subtract 2 times row 1 from row 2');
    t.ok('a negative entry is bracketed in the working', /R2 − 2·R1: 2 − 2·1 = 0, 1 − 2·\(−1\) = 3, 7 − 2·\(−1\) = 9, so row 2 is now 3y = 9\./.test(await read(t)));
    await kTo(t, 1, 4);
    await op(t, 'Divide row 2 by 3');
    await row(t, 0);
    await kTo(t, -1, 2);
    t.ok('R1 + R2 is offered at k = 1', await op(t, 'Add row 2 to row 1'));
    r = await read(t);
    t.ok('it leaves x = 2 and y = 3', /R1 \+ R2: 1 \+ 0 = 1, −1 \+ 1 = 0, −1 \+ 3 = 2, so row 1 is now x = 2\..*Row 1 says x = 2 and row 2 says y = 3: the system is solved\./.test(r), r);
    t.eq('solving the second system is found', await found(t), ['gone', 'same', 'solve', 'solve2']);

    // --- the third system has no solution ---
    await sys(t, 2);
    t.ok('the third system claims no crossing', !/still cross/.test(await read(t)));
    await kTo(t, -1, 2);
    await op(t, 'Subtract 2 times row 1 from row 2');
    r = await read(t);
    t.ok('row 2 reads 0 = 2, never true', /Row 2 now reads 0 = 2, which is never true: the two lines were parallel and never cross, so this system has no solution\./.test(r), r);
    t.eq('only row 1 is still a line', await drawn(t), '{"eqs":[[1,1,2]],"marks":[]}');
    t.ok('and the caption says why', /Row 2, 0 = 2, is no line at all\./.test(await cap(t)));
    t.eq('the system with no solution is found', await found(t), ['gone', 'never', 'same', 'solve', 'solve2']);

    // --- the fourth is one line twice ---
    await sys(t, 3);
    await kTo(t, -1);
    await op(t, 'Subtract 3 times row 1 from row 2');
    t.ok('row 2 reads 0 = 0, true everywhere', /Row 2 now reads 0 = 0, which is true for every x and y: both equations were the same line, so every point on it solves this system\./.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['always', 'gone', 'never', 'same', 'solve', 'solve2']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('elGoals').innerText)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-elim button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each system says its equations', await t.ev(() => document.querySelectorAll('#elSys button')[0].getAttribute('aria-label')),
      'System 1: x + 2y = 5 and 3x + 4y = 11');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the elimination workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
