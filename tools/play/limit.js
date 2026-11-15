/* The limit workshop: closing in on a point where the formula gives no number.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works f out at x = a ± h for the numbers on screen and says why x = a
 * itself has no value; (x² − 1)/(x − 1) gets within 0.01 of the 2 its hole
 * hides, and from both sides agrees on 2; sin x / x heads for 1; |x| / x stays
 * at −1 on one side and 1 on the other, so its limit does not exist; 1/x
 * reaches 1000 on the right and falls without end on the left. The figure
 * draws the hole and keeps 1/x inside the picture. The h stepper stops at its
 * ends even pressed past them, and every button is named. It fits a phone and
 * adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lmRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#lmFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#lmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#lmFns button')[k].click(), k);
const side = (t, k) => t.ev(k => document.querySelectorAll('#lmSide button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
// what the figure was asked to draw, caught on its way in
const drawn = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Limit.render(); } finally { Figure.render = real; }
  return { holes: spec.holes || [], ylim: spec.ylim || null, pts: spec.pts };
});

module.exports = {
  name: 'limit',
  title: 'Limit workshop · closing in on a point from the left and the right',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Perrin');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the limit workshop', await t.showing('tomeLimit'));
    await t.tap('tomeLimit');
    t.eq('and one tap opens it', await t.screen(), 's-limit');

    // --- it opens on the hole, from the right, at h = 1 ---
    let r = await read(t);
    t.ok('it says which side x closes in from, and by how much', /with x closing in on 1 from the right: h = 1, so x = 1 \+ 1 = 2\./.test(r), r);
    t.ok('it works f out at x for the numbers on screen', /f\(2\) = \(2² − 1\)\/\(2 − 1\) = \(4 − 1\)\/1 = 3\/1 = 3\./.test(r), r);
    t.ok('and says why x = 1 itself has no value', /At x = 1 itself the formula gives 0\/0, which is no number at all/.test(r), r);
    t.ok('far off, it asks for a smaller h', /Bring h down to 0\.001 to see where f\(x\) is heading from the right\./.test(r), r);
    t.eq('the caption names the hole and the dot', await cap(t), 'The open circle is the point the graph skips. The blue dot is x = 2.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#lmFig canvas.fig')));
    let fig = await drawn(t);
    t.eq('the hole is drawn where the graph skips', JSON.stringify(fig.holes), '[[1,2]]');
    t.eq('and the dot sits on the curve at x', JSON.stringify(fig.pts.map(p => p.slice(0, 2))), '[[2,3]]');
    t.eq('nothing is found before anything is pressed', await found(t), []);
    t.ok('h stops at 1', await t.ev(() => document.getElementById('lmHHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Limit.moveH(-1); return Limit.h(); }), 1);

    // --- closer in from the right ---
    await press(t, 'lmHLo', 3);
    r = await read(t);
    t.ok('at h = 0.01 the working is 0.0201/0.01', /f\(1\.01\) = \(1\.01² − 1\)\/\(1\.01 − 1\) = \(1\.0201 − 1\)\/0\.01 = 0\.0201\/0\.01 = 2\.01\./.test(r), r);
    t.eq('within 0.01 of the hidden 2 is found', await found(t), ['hole']);
    t.ok('and its toast keeps the 0.01', /✓ Get within 0\.01 of the value the hole hides/.test(await toast(t)), await toast(t));
    await press(t, 'lmHLo');
    r = await read(t);
    t.ok('at h = 0.001 the right side heads for 2', /From the right, f\(x\) heads for 2\. A limit needs both sides to agree, so close in from the left too\./.test(r), r);
    t.ok('h stops at 0.001', await t.ev(() => document.getElementById('lmHLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Limit.moveH(1); return Limit.h(); }), 0.001);

    // --- and from the left ---
    await side(t, 0);
    r = await read(t);
    t.ok('from the left x = 1 − 0.001', /so x = 1 − 0\.001 = 0\.999\./.test(r), r);
    t.ok('and the negatives are bracketed', /= \(0\.998001 − 1\)\/\(−0\.001\) = \(−0\.001999\)\/\(−0\.001\) = 1\.999\./.test(r), r);
    t.ok('both sides agree, so the limit is named', /From both sides f\(x\) closes in on 2, so the limit as x → 1 is 2/.test(r), r);
    t.eq('the two sides agreeing is found', await found(t), ['agree', 'hole']);
    t.eq('the side shown pressed is the left', await t.ev(() =>
      [...document.querySelectorAll('#lmSide button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false');

    // --- sin x / x heads for 1 ---
    await pick(t, 1);
    r = await read(t);
    t.ok('sin x / x is worked out to eight figures', /f\(−0\.001\) = sin\(−0\.001\)\/\(−0\.001\) ≈ \(−0\.00099999983\)\/\(−0\.001\) ≈ 0\.99999983\./.test(r), r);
    t.ok('and heads for 1 from the left', /From the left, f\(x\) heads for 1\./.test(r), r);
    t.eq('sin x / x near 0 is found', await found(t), ['agree', 'hole', 'sinc']);

    // --- |x| / x jumps ---
    await pick(t, 2);
    t.ok('|x| / x stays at −1 from the left', /= 0\.001\/\(−0\.001\) = −1\..*From the left, f\(x\) stays at −1\./.test(await read(t)));
    await side(t, 1);
    r = await read(t);
    t.ok('and at 1 from the right', /f\(0\.001\) = \|0\.001\|\/0\.001 = 0\.001\/0\.001 = 1\./.test(r), r);
    t.ok('so the limit does not exist', /The two sides disagree, so the limit as x → 0 does not exist\./.test(r), r);
    t.eq('a limit that does not exist is found', await found(t), ['agree', 'hole', 'jump', 'sinc']);

    // --- 1/x runs off ---
    await pick(t, 3);
    r = await read(t);
    t.ok('1/x at 0.001 is 1000', /f\(0\.001\) = 1\/0\.001 = 1000\./.test(r), r);
    t.ok('and says 1/0 is no number', /At x = 0 itself it is 1\/0, which is no number at all\./.test(r), r);
    t.ok('from the right it climbs without end', /From the right, f\(x\) climbs without end\./.test(r), r);
    t.eq('reaching 1000 is found', await found(t), ['agree', 'big', 'hole', 'jump', 'sinc']);
    fig = await drawn(t);
    t.eq('1/x is kept inside the picture', JSON.stringify(fig.ylim), '[-12,12]');
    t.eq('and has no hole to draw', JSON.stringify(fig.holes), '[]');
    await side(t, 0);
    r = await read(t);
    t.ok('from the left it falls without end, so there is no limit', /f\(−0\.001\) = 1\/\(−0\.001\) = −1000\..*so there is no limit/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['agree', 'big', 'down', 'hole', 'jump', 'sinc']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('lmGoals').innerText)));

    // --- far off again, the verdict waits ---
    await press(t, 'lmHHi', 4);
    r = await read(t);
    t.ok('at h = 1 from the left, f(−1) = −1', /f\(−1\) = 1\/\(−1\) = −1\./.test(r), r);
    t.ok('and the side it watched up close is still remembered', /From the right it climbs without end and from the left it falls without end/.test(r), r);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-limit .wsCell button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each stepper says what it does', unnamed, 0);
    t.eq('each formula has its own button', await t.ev(() =>
      [...document.querySelectorAll('#lmFns button')].map(b => b.innerText.trim()).join(' | ')), '(x² − 1)/(x − 1) | sin x / x | |x| / x | 1/x');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the limit workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
