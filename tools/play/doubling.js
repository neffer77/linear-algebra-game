/* The doubling workshop: y′ = ky one stretch at a time.
 *
 * These checks open it from the Tome and drive it through its buttons: on the
 * doubling, a whole stretch lands on 6 and half a stretch on 3√2 ≈ 4.2426,
 * with the note that √2 is not 1.5; two halves land where one whole does;
 * walked to day 8 the curve is at 48 against the line's 15. The halving goes
 * past the line's zero and stays above 0; on the quadrupling half a stretch
 * lands on 2. The buttons stop at the edge of the figure, starting over goes
 * back, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dbRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#dbGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#dbSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dbSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const dots = t => t.ev(() => document.querySelectorAll('#dbFig [data-k="pt"]').length);

module.exports = {
  name: 'doubling',
  title: 'Doubling workshop · y′ = ky one stretch at a time',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the doubling workshop', await t.showing('tomeDoubling'));
    await t.tap('tomeDoubling');
    t.eq('and one tap opens it', await t.screen(), 's-double');

    // --- doubles every 2 days, before any move ---
    let r = await read(t);
    t.ok('it says what y′ = ky does', /y′ = ky multiplies y by the same factor over every stretch of time of the same length\. Here y\(0\) = 3 and y\(2\) = 6, so each stretch of 2 days multiplies y by r = 6 ÷ 3 = 2\./.test(r), r);
    t.ok('and asks for a move', /Take a whole stretch of 2 days, or half of one\./.test(r), r);
    t.eq('the doubling is the pressed story', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a move', await found(t), []);
    t.eq('the walk is one dot at the start', await dots(t), 1);
    t.ok('there is nothing to start over yet', await off(t, 'dbAgain'));

    // --- one whole stretch ---
    await press(t, 'dbFull');
    r = await read(t);
    t.ok('the stretch is worked', /Move 1: a whole stretch, from t = 0 to t = 2, multiplies y by 2: y\(2\) = 6\./.test(r), r);
    t.ok('and the line meets the curve there', /The straight line through the first two points meets the curve here, at y = 6\./.test(r), r);
    t.eq('the first stretch is found', await found(t), ['stretch']);
    t.ok('with a toast', /✓ Same time, same factor/.test(await toast(t)), await toast(t));

    // --- half a stretch from the start ---
    await press(t, 'dbAgain');
    await press(t, 'dbHalf');
    r = await read(t);
    t.ok('half a stretch multiplies by √2', /Move 1: half a stretch, from t = 0 to t = 1, multiplies y by √2: y\(1\) ≈ 4\.2426\./.test(r), r);
    t.ok('worked as a power', /At t = 1, half a stretch from the start: y\(1\) = 3 × 2\^\(1\/2\) ≈ 4\.2426\./.test(r), r);
    t.ok('the line sits above the curve between the points', /gives 9\/2 at t = 1, above the curve: between the two points the curve sags below the line\./.test(r), r);
    t.ok('and √2 is not 1.5', /Half a stretch multiplies by √2 ≈ 1\.4142, not by 1\.5: two half stretches must make ×2, and 1\.5 × 1\.5 = 2\.25 is too much\./.test(r), r);
    t.ok('the root is found', (await found(t)).includes('root'));
    await press(t, 'dbHalf');
    r = await read(t);
    t.ok('two halves land on 6', /Move 2: half a stretch, from t = 1 to t = 2, multiplies y by √2: y\(2\) = 6\./.test(r), r);
    t.ok('the halves are found', (await found(t)).includes('halves'));

    // --- on to day 8 ---
    await press(t, 'dbFull', 3);
    r = await read(t);
    t.ok('day 8 is 48', /At t = 8, four stretches from the start: y\(8\) = 3 × 2⁴ = 48\./.test(r), r);
    t.ok('against the line’s 15', /gives 15 at t = 8, below the curve, which pulls further away every stretch\./.test(r), r);
    t.ok('the early moves are left to the figure', /Moves 1 and 2 are the dots already on the figure\./.test(r), r);
    t.eq('which has all six dots', await dots(t), 6);
    t.ok('and no move past the edge', await off(t, 'dbFull') && await off(t, 'dbHalf'));
    t.eq('the doubling’s goals are found', await found(t), ['halves', 'leave', 'root', 'stretch']);

    // --- halves every 3 hours ---
    await pick(t, 1);
    await press(t, 'dbFull', 2);
    r = await read(t);
    t.ok('the line reaches 0 at hour 6', /gives 0 at t = 6: the line reaches 0 here, but y is still 4\./.test(r), r);
    t.ok('which is not past it', !(await found(t)).includes('never'));
    await press(t, 'dbHalf');
    r = await read(t);
    t.ok('past it the line is below zero', /gives −4 at t = 15\/2, below zero\. A line takes away the same amount every stretch; y′ = ky takes away the same share, so y never reaches 0\./.test(r), r);
    t.ok('half a stretch keeps √(1/2)', /multiplies y by √\(1\/2\): y\(15\/2\) ≈ 2\.8284\./.test(r), r);
    t.ok('the decay is found', (await found(t)).includes('never'));

    // --- quadruples every 2 minutes ---
    await pick(t, 2);
    await press(t, 'dbHalf');
    r = await read(t);
    t.ok('half of ×4 is ×2', /multiplies y by √4: y\(1\) = 2\./.test(r) && /Half a stretch multiplies by √4 = 2, since 2 × 2 = 4\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['exact', 'halves', 'leave', 'never', 'root', 'stretch']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('dbGoals').innerText)));

    // --- starting over ---
    await press(t, 'dbAgain');
    t.ok('starting over goes back to the start', /Take a whole stretch of 2 minutes, or half of one\./.test(await read(t)));
    t.eq('with one dot', await dots(t), 1);
    t.ok('and both moves on again', !(await off(t, 'dbFull')) && !(await off(t, 'dbHalf')));
    t.eq('a move past the edge changes nothing', await t.ev(() => { Doubling.full(); Doubling.full(); Doubling.full(); Doubling.full(); Doubling.halfStep(); return Doubling.n(); }), 3);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-double button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each story button names its story', await t.ev(() =>
      [...document.querySelectorAll('#dbSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'y doubles every 2 days, from 3 | y halves every 3 hours, from 16 | y quadruples every 2 minutes, from 1');
    t.ok('the drawing is named for a screen reader', /^y quadruples every 2 minutes: the curve y = 1 × 4\^\(t\/2\) in gold, the straight line through its first two points dashed, and the walk in blue, now at t = 6, y = 64$/.test(
      await t.ev(() => document.querySelector('#dbFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the doubling workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
