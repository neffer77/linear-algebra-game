/* The span workshop: a of one arrow and b of another.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works a·u + b·v for the numbers on screen and says how far the
 * gold target still is; one more of v lands on the first pair's target; the
 * second pair's target takes a negative amount, bracketed in the working;
 * with î and ĵ the amounts are the target's coordinates; the fourth pair lies
 * on one line, says so, makes ⟨0, 0⟩ with amounts that are not both 0, and
 * reaches ⟨0, 0⟩ a second way, which the readout remembers. The steppers stop
 * at ±2 even pressed past it, the figure gets the walk, the target ring and
 * the dashed line, every button is named, it fits a phone and adds nothing to
 * the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('spRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#spFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#spGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, label, n) => t.ev(([label, n]) => {
  for (let k = 0; k < n; k++) document.querySelector(`#spAmts button[aria-label="${label}"]`).click();
}, [label, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#spPairs button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const drawn = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Span.render(); } finally { Figure.render = real; }
  return { kind: spec.kind, vecs: spec.vecs.map(o => [o.label, o.v.join(), (o.from || []).join()].join('|')), marks: spec.marks, lines: spec.lines };
});

module.exports = {
  name: 'span',
  title: 'Span workshop · a of one arrow and b of another',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Brannoc');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the span workshop', await t.showing('tomeSpan'));
    await t.tap('tomeSpan');
    t.eq('and one tap opens it', await t.screen(), 's-span');

    // --- it opens on the first pair with a = b = 1 ---
    let r = await read(t);
    t.ok('it works a·u + b·v for the numbers on screen', /a·u \+ b·v = 1·⟨2, 1⟩ \+ 1·⟨1, 2⟩ = ⟨2, 1⟩ \+ ⟨1, 2⟩ = ⟨3, 3⟩\./.test(r), r);
    t.ok('and says how far the target still is', /The gold target is ⟨4, 5⟩, and ⟨4, 5⟩ − ⟨3, 3⟩ = ⟨1, 2⟩ is still to go\./.test(r), r);
    t.ok('and that the pair spans the plane', /u and v point different ways, so the right amounts reach any point of the plane: together they span it/.test(r), r);
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#spFig canvas.fig')));
    let fig = await drawn(t);
    t.eq('a·u from the origin, b·v from its tip, and the sum', fig.vecs, ['a·u|2,1|', 'b·v|1,2|2,1', '|3,3|']);
    t.eq('with a ring on the target', JSON.stringify(fig.marks), '[[4,5]]');
    t.ok('the caption says which arrow is which', /a·u in blue, then b·v in green from its tip; the gold arrow is a·u \+ b·v, and the ring is the target\./.test(await cap(t)));
    t.eq('nothing is found before anything is pressed', await found(t), []);

    // --- the first target ---
    await press(t, 'More of v');
    r = await read(t);
    t.ok('one more of v lands on ⟨4, 5⟩', /= ⟨2, 1⟩ \+ ⟨2, 4⟩ = ⟨4, 5⟩\. That is the gold target ⟨4, 5⟩: a = 1 and b = 2 land right on it\./.test(r), r);
    t.eq('the first target is found', await found(t), ['hit']);
    t.ok('with its toast', /✓ Landed on the first target/.test(await toast(t)), await toast(t));

    // --- a negative amount ---
    await pick(t, 1);
    await press(t, 'Less of v', 4);
    r = await read(t);
    t.ok('the second pair takes −2 of v, bracketed', /= 1·⟨1, 1⟩ \+ \(−2\)·⟨1, −1⟩ = ⟨1, 1⟩ \+ ⟨−2, 2⟩ = ⟨−1, 3⟩\./.test(r), r);
    t.eq('a target with a negative amount is found', await found(t), ['hit', 'neg']);
    t.ok('b stops at −2', await t.ev(() => document.querySelector('#spAmts button[aria-label="Less of v"]').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Span.step('b', -1); return Span.b; }), -2);

    // --- î and ĵ ---
    await pick(t, 2);
    await press(t, 'Less of u', 3);
    await press(t, 'More of v', 3);
    r = await read(t);
    t.ok('with î and ĵ, −2 and 1 land on ⟨−2, 1⟩', /= ⟨−2, 0⟩ \+ ⟨0, 1⟩ = ⟨−2, 1⟩\. That is the gold target ⟨−2, 1⟩/.test(r), r);
    t.ok('and the amounts are named as the coordinates', /a·î \+ b·ĵ is just ⟨a, b⟩: the amounts are the point's coordinates\./.test(r), r);
    t.eq('the coordinates goal is found', await found(t), ['coords', 'hit', 'neg']);
    t.ok('a stops at −2 too', await t.ev(() => document.querySelector('#spAmts button[aria-label="Less of u"]').disabled));

    // --- two arrows on one line ---
    await pick(t, 3);
    r = await read(t);
    t.ok('the fourth pair works out to (a + 2b)·u', /v = 2u, so a·u \+ b·v = \(a \+ 2b\)·u = \(−2 \+ 2·1\)·u = 0·u: every mix lies on the dashed line through u/.test(r), r);
    t.ok('and says its target is off the line', /The gold target ⟨2, −1⟩ is off that line, so no amounts a and b can ever reach it\./.test(r), r);
    t.ok('⟨0, 0⟩ from −2 of u and 1 of v makes them dependent', /\(−2\)·u \+ 1·v = ⟨0, 0⟩ with the amounts not both 0, so u and v are dependent/.test(r), r);
    t.eq('making ⟨0, 0⟩ is found, the line not yet', await found(t), ['coords', 'hit', 'neg', 'zero']);
    fig = await drawn(t);
    t.eq('the figure draws the line through u', JSON.stringify(fig.lines), '[[1,1]]');
    t.eq('and no zero-length arrows', fig.vecs, ['a·u|-2,-2|', 'b·v|2,2|-2,-2']);
    await press(t, 'More of u');
    t.eq('moving along the line is found', await found(t), ['coords', 'hit', 'line', 'neg', 'zero']);
    await press(t, 'Less of v');
    await press(t, 'More of u');
    r = await read(t);
    t.ok('at a = b = 0 it says every pair makes ⟨0, 0⟩', /With a = b = 0 you get ⟨0, 0⟩, as every pair does\./.test(r), r);
    t.ok('and remembers the other way to ⟨0, 0⟩', /You reached ⟨0, 0⟩ before with a = −2 and b = 1: when both arrows lie on one line, the same point can be reached more than one way\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['coords', 'hit', 'line', 'neg', 'twice', 'zero']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('spGoals').innerText)));

    // --- every button is named ---
    t.eq('each pair says its arrows', await t.ev(() => document.querySelectorAll('#spPairs button')[0].getAttribute('aria-label')), 'Pair 1: u = ⟨2, 1⟩, v = ⟨1, 2⟩');
    t.eq('each stepper says what it changes', await t.ev(() =>
      [...document.querySelectorAll('#spAmts button')].map(b => b.getAttribute('aria-label')).join(' | ')), 'Less of u | More of u | Less of v | More of v');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the span workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
