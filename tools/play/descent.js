/* The downhill workshop: a walk down a valley against its gradient.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works f and ∇f at the start and the step a press will take; η = 0.1
 * walks downhill five times and still has f above 0.5; η = 0.25 lands on the
 * valley floor in one step and then reaches the bottom; η = 0.4 zigzags
 * across the floor while f still falls; η = 0.55 climbs and runs f past 100.
 * Picking a step size starts the walk again, Start again does too, the figure
 * draws the walk and the next step, and the Step button stops at the bottom
 * and once a walk has gone far enough. Every button is named. It fits a phone
 * and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gdRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#gdFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#gdGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const step = (t, n) => t.ev(n => { for (let k = 0; k < n; k++) document.getElementById('gdStep').click(); }, n || 1);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#gdEtas button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
// what the figure was asked to draw, caught on its way in
const drawn = t => t.ev(() => {
  let spec; const real = Figure.render;
  Figure.render = (s, el) => { spec = s; return real.call(Figure, s, el); };
  try { Descent.render(); } finally { Figure.render = real; }
  return { kind: spec.kind, path: spec.path, next: spec.next || null };
});

module.exports = {
  name: 'descent',
  title: 'Downhill workshop · a walk down a valley against its gradient',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the downhill workshop', await t.showing('tomeDescent'));
    await t.tap('tomeDescent');
    t.eq('and one tap opens it', await t.screen(), 's-descent');

    // --- it opens at (−2, 1) with η = 0.1 ---
    let r = await read(t);
    t.ok('it works f at the start', /At p = \(−2, 1\), f = \(−2 − 1\)² \+ 2\(1 \+ 1\)² = \(−3\)² \+ 2·2² = 17\./.test(r), r);
    t.ok('and the gradient, the way straight uphill', /∇f = ⟨2\(x − 1\), 4\(y \+ 1\)⟩ = ⟨2·\(−3\), 4·2⟩ = ⟨−6, 8⟩: the way straight uphill\./.test(r), r);
    t.ok('and the step a press will take', /A step of η = 0\.1 goes the other way: p − η∇f = \(−2 − 0\.1·\(−6\), 1 − 0\.1·8\) = \(−2 \+ 0\.6, 1 − 0\.8\) = \(−1\.4, 0\.2\)\./.test(r), r);
    t.ok('and asks for the first step', /Press Step downhill to walk against the gradient\./.test(r), r);
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#gdFig canvas.fig')));
    let fig = await drawn(t);
    t.eq('it is a valley seen from above', fig.kind, 'contour');
    t.eq('the walk starts at (−2, 1)', JSON.stringify(fig.path), '[[-2,1]]');
    t.eq('and the dashed arrow points at the next step', JSON.stringify(fig.next), '[-1.4,0.2]');
    t.ok('the caption names the rings, the star and the arrow', /Rings are levels of f, lowest at the gold star \(1, −1\)\..*dashed arrow is the next step/.test(await cap(t)));
    t.eq('nothing is found before anything is pressed', await found(t), []);
    t.eq('the first step size is shown picked', await t.ev(() =>
      [...document.querySelectorAll('#gdEtas button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false,false');

    // --- a small step crawls ---
    await step(t);
    r = await read(t);
    t.ok('the walk moves where the readout said', /At p = \(−1\.4, 0\.2\), f = .* = 8\.64\./.test(r), r);
    t.ok('and says f fell', /That step took f from 17 down to 8\.64\./.test(r), r);
    await step(t, 4);
    t.eq('five steps of 0.1 leave f above 0.5', await found(t), ['crawl']);
    t.ok('and its toast stops at the colon', /✓ Take five steps downhill and still have f above 0\.5(?!:)/.test(await toast(t)), await toast(t));
    fig = await drawn(t);
    t.eq('the figure draws all six points of the walk', fig.path.length, 6);

    // --- η = 0.25 lands on the floor, then finds the bottom ---
    await pick(t, 1);
    fig = await drawn(t);
    t.eq('picking a step size starts the walk again', JSON.stringify(fig.path), '[[-2,1]]');
    await step(t);
    r = await read(t);
    t.ok('one step of 0.25 lands on y = −1', /At p = \(−0\.5, −1\), f = \(−0\.5 − 1\)² \+ 2\(−1 \+ 1\)² = \(−1\.5\)² \+ 2·0² = 2\.25\./.test(r), r);
    t.ok('where ∇f points only along x', /= ⟨−3, 0⟩: the way straight uphill\./.test(r), r);
    t.eq('landing on the floor in one step is found', await found(t), ['crawl', 'floor']);
    await step(t, 6);
    r = await read(t);
    t.ok('seven steps bring f under 0.001, worked to 4 places', /At p = \(0\.9766, −1\), f = .* ≈ 0\.0005\./.test(r), r);
    t.eq('the bottom is found', await found(t), ['bottom', 'crawl', 'floor']);
    await step(t, 20);
    r = await read(t);
    t.ok('at the very bottom ∇f is ⟨0, 0⟩, and it says so', /= ⟨0, 0⟩\. Nothing is uphill, so this is the bottom of the valley at \(1, −1\), where f = 0\./.test(r), r);
    t.ok('and the Step button stops there', await t.ev(() => document.getElementById('gdStep').disabled));
    t.eq('and the figure draws no next step', (await drawn(t)).next, null);

    // --- η = 0.4 zigzags ---
    await pick(t, 2);
    await step(t);
    r = await read(t);
    t.ok('a step of 0.4 jumps across the floor', /At p = \(0\.4, −2\.2\)/.test(r) && /That step jumped across the valley floor, so the walk zigzags, but f still fell from 17 to 3\.24\./.test(r), r);
    t.eq('a zigzag that still falls is found', await found(t), ['bottom', 'crawl', 'floor', 'zig']);

    // --- η = 0.55 climbs ---
    await pick(t, 3);
    await step(t, 2);
    r = await read(t);
    t.ok('the second step of 0.55 goes uphill, and says why', /That step went uphill: f rose from 11\.61 to 16\.5897\. η is too big/.test(r), r);
    t.eq('a step that climbs is found', await found(t), ['bottom', 'crawl', 'floor', 'up', 'zig']);
    await step(t, 5);
    t.ok('seven steps of 0.55 run f past 100', /≈ 102\.7117\./.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['blow', 'bottom', 'crawl', 'floor', 'up', 'zig']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('gdGoals').innerText)));
    await step(t, 30);
    t.ok('a walk that has gone far enough is stopped', /That is far enough for one walk: press Start again\./.test(await read(t)));
    t.ok('and the Step button with it', await t.ev(() => document.getElementById('gdStep').disabled));
    await t.ev(() => document.getElementById('gdReset').click());
    t.ok('Start again goes back to (−2, 1)', /At p = \(−2, 1\)/.test(await read(t)));
    t.ok('and the Step button works again', await t.ev(() => !document.getElementById('gdStep').disabled));

    // --- every button is named ---
    t.eq('each step size says what it is', await t.ev(() =>
      [...document.querySelectorAll('#gdEtas button')].map(b => b.getAttribute('aria-label')).join(' | ')), 'Step size 0.1 | Step size 0.25 | Step size 0.4 | Step size 0.55');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the downhill workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
