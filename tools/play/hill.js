/* The hillwalker workshop: the directional derivative.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * round bowl opens facing east, where the slope is just ∂f/∂x, with nothing
 * found; a turn gives a slope worked as ∇f · û and checked with a nudge;
 * facing along ∇f is the steepest climb, a right angle to it walks the
 * contour, and straight against it is the steepest drop; due south is −∂f/∂y.
 * On the oval bowl the steepest way up is not straight away from the bottom,
 * and on the saddle a level heading runs through the pass, which finishes the
 * hunt. The heading wraps round, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hwRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#hwFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#hwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#hwSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('hwH').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const headCol = t => t.ev(() => document.querySelector('#hwFig line[data-k="head"]').getAttribute('stroke'));

module.exports = {
  name: 'hill',
  title: 'Hillwalker workshop · the directional derivative',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the hillwalker workshop', await t.showing('tomeHill'));
    await t.tap('tomeHill');
    t.eq('and one tap opens it', await t.screen(), 's-hill');

    // --- the round bowl, facing east ---
    let r = await read(t);
    t.ok('it works the gradient from the partials', /f\(x, y\) = x² \+ y²\. Its partial derivatives are ∂f\/∂x = 2x and ∂f\/∂y = 2y, so at \(3, 4\) the gradient is ∇f = ⟨6, 8⟩, of length ‖∇f‖ = √\(36 \+ 64\) = 10\./.test(r), r);
    t.ok('facing east the slope is just ∂f/∂x', /Due east, the slope is just ∂f\/∂x = 6: a partial derivative is the slope facing along an axis\./.test(r), r);
    t.eq('the heading reads û', await shown(t), 'û = ⟨1, 0⟩');
    t.eq('the caption names the arrows', await cap(t), 'Seen from above: the blue rings are contours, where f is the same all along. The dashed gold arrow is ∇f. The solid arrow is the way you face: green climbs, red falls, blue stays level.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    const climb = await headCol(t);

    // --- a turn ---
    await press(t, 'hwHHi');
    r = await read(t);
    t.eq('a turn anticlockwise faces ⟨4/5, 3/5⟩', await shown(t), 'û = ⟨4/5, 3/5⟩');
    t.ok('the slope is ∇f · û, worked out', /Facing û = ⟨4\/5, 3\/5⟩, which has length 1, the slope that way is ∇f · û = 6 × 4\/5 \+ 8 × 3\/5 = 48\/5 = 9\.6\./.test(r), r);
    t.ok('and checked with a nudge', /a step of 0\.01 back along û gives f = 24\.9041 and a step forward gives f = 25\.0961, a rise of 0\.192 over 0\.02, which is 9\.6\./.test(r), r);
    t.ok('with the angle read off', /so cos θ = 24\/25 = 0\.96: uphill, but not the steepest climb\./.test(r), r);

    // --- the steepest climb ---
    await press(t, 'hwHHi');
    r = await read(t);
    t.ok('along ∇f the slope is all of ‖∇f‖', /= 10\. .*That is all of ‖∇f‖ = 10: û points the same way as ∇f, the angle between them is 0, and no heading climbs faster\. ∇f points up the steepest slope\./.test(r), r);
    t.eq('the steepest climb is found', await found(t), ['up']);
    t.ok('with a toast', /✓ The steepest climb/.test(await toast(t)), await toast(t));

    // --- the contour ---
    await press(t, 'hwHHi', 3);
    r = await read(t);
    t.ok('at a right angle the slope is 0', /6 × \(−4\/5\) \+ 8 × 3\/5 = 0\..*The slope is 0: û is at a right angle to ∇f, so this heading runs along the contour through the point, neither climbing nor falling\./.test(r), r);
    t.eq('the contour is found', await found(t), ['level', 'up']);
    const flat = await headCol(t);

    // --- the steepest drop ---
    await press(t, 'hwHHi', 3);
    r = await read(t);
    t.ok('against ∇f it falls fastest', /That is −‖∇f‖ = −10: û points straight against ∇f, the angle between them is 180°, and this is the steepest way down\./.test(r), r);
    t.eq('the steepest descent is found', await found(t), ['down', 'level', 'up']);
    const fall = await headCol(t);
    t.ok('the heading takes three colours for up, level and down', new Set([climb, flat, fall]).size === 3, JSON.stringify([climb, flat, fall]));

    // --- due south ---
    await press(t, 'hwHHi');
    r = await read(t);
    t.ok('due south is minus ∂f/∂y', /Due south, the slope is just −∂f\/∂y = −8: a partial derivative is the slope facing along an axis\./.test(r), r);
    t.ok('downhill, but not the steepest', /cos θ = −4\/5 = −0\.8: downhill, but not the steepest descent\./.test(r), r);

    // --- the oval bowl ---
    await pick(t, 1);
    t.eq('a new hill starts facing east', await shown(t), 'û = ⟨1, 0⟩');
    t.eq('with nothing new found', await found(t), ['down', 'level', 'up']);
    await press(t, 'hwHHi');
    r = await read(t);
    t.ok('the oval has its own gradient', /f\(x, y\) = x² \+ 3y²\. Its partial derivatives are ∂f\/∂x = 2x and ∂f\/∂y = 6y, so at \(4, 1\) the gradient is ∇f = ⟨8, 6⟩/.test(r), r);
    t.ok('and its steepest way up is not straight out', /Straight away from the bottom at \(0, 0\) would face along ⟨4, 1⟩, but the steepest way up is ⟨4\/5, 3\/5⟩\. On an oval bowl the steepest climb crosses the contour at a right angle, and that is not straight away from the bottom\./.test(r), r);
    t.eq('the oval goal is found', await found(t), ['down', 'level', 'oval', 'up']);

    // --- the saddle, turning clockwise round past east ---
    await pick(t, 2);
    await press(t, 'hwHLo');
    t.eq('a clockwise turn from east wraps round to ⟨4/5, −3/5⟩', await shown(t), 'û = ⟨4/5, −3/5⟩');
    r = await read(t);
    t.ok('which is the saddle\'s steepest climb', /f\(x, y\) = x² − y²\..*∇f = ⟨8, −6⟩.*8 × 4\/5 \+ \(−6\) × \(−3\/5\) = 10\..*∇f points up the steepest slope\./.test(r), r);
    t.eq('but no goal asks for that one', await found(t), ['down', 'level', 'oval', 'up']);
    await press(t, 'hwHHi', 3);
    r = await read(t);
    t.ok('a level heading through the pass', /8 × 3\/5 \+ \(−6\) × 4\/5 = 0\..*The slope is 0/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['down', 'level', 'oval', 'pass', 'up']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('hwGoals').innerText)));

    // --- the heading goes all the way round ---
    await press(t, 'hwHHi', 12);
    t.eq('twelve turns come back to the same heading', await shown(t), 'û = ⟨3/5, 4/5⟩');
    t.ok('and neither turn button is ever off', await t.ev(() => !document.getElementById('hwHHi').disabled && !document.getElementById('hwHLo').disabled));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-hill .wsCell button, #hwSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each hill button reads its formula and point', await t.ev(() =>
      [...document.querySelectorAll('#hwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Round bowl: f(x, y) = x² + y², standing at (3, 4) | Oval bowl: f(x, y) = x² + 3y², standing at (4, 1) | Saddle: f(x, y) = x² − y², standing at (4, 3)');
    t.eq('the turn buttons say which way they turn', await t.ev(() =>
      ['hwHLo', 'hwHHi'].map(id => document.getElementById(id).getAttribute('aria-label')).join(' | ')),
      'Turn the heading clockwise | Turn the heading anticlockwise');
    t.ok('the map is named for a screen reader', await t.ev(() => /Contours of f\(x, y\) = x² − y² around \(4, 3\), with ∇f = ⟨8, −6⟩ dashed in gold and the heading ⟨3\/5, 4\/5⟩ on the level/.test(document.querySelector('#hwFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the hillwalker workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
