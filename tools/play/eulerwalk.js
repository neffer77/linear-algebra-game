/* The Euler step workshop: walk a differential equation by hand.
 *
 * These checks open it from the Tome and drive it through its buttons: on
 * y′ = y one step of 1 lands on 2, short of e; halving the step lands on 9/4,
 * closer, and the misses are laid side by side; steps of 1/8 come within 0.16.
 * On y′ = −2y a step of 1 jumps to −1, a step of 1/2 lands on 0 and stays,
 * and steps of 1/4 reach x = 2 without touching 0. On y′ = x the walk falls
 * short of 2 by exactly h. On y′ = y², the equation the fight separates, a
 * step of 1 lands on 3/4, short of 1 by exactly 1/4, and steps of 1/8 come
 * within 0.07, close enough for the last goal. The step buttons stop at the end, starting over
 * goes back, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ewRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#ewGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#ewSets button')[k].click(), k);
const step = (t, k) => t.ev(k => document.querySelectorAll('#ewHs button')[k].click(), k);
const pressed = (t, id) => t.ev(id => [...document.querySelectorAll(`#${id} button`)].map(b => b.getAttribute('aria-pressed')).join(), id);
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const dots = t => t.ev(() => document.querySelectorAll('#ewFig [data-k="pt"]').length);
const dashes = t => t.ev(() => document.querySelectorAll('#ewFig [data-k="dash"]').length);

module.exports = {
  name: 'eulerwalk',
  title: 'Euler step workshop · walk a differential equation by hand',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the Euler step workshop', await t.showing('tomeEulerWalk'));
    await t.tap('tomeEulerWalk');
    t.eq('and one tap opens it', await t.screen(), 's-eulerwalk');

    // --- y′ = y with h = 1, before any step ---
    let r = await read(t);
    t.ok('it says what Euler’s method does', /y′ = y, starting from y\(0\) = 1\. Euler’s method walks it in straight steps of h = 1: read the slope where you stand, then move h along x and h × slope up\. Reaching x = 1 takes 1 step\./.test(r), r);
    t.ok('and asks for the first step', /Take the first step\./.test(r), r);
    t.eq('y′ = y and h = 1 are the pressed choices', [await pressed(t, 'ewSets'), await pressed(t, 'ewHs')], ['true,false,false,false', 'true,false,false,false']);
    t.eq('nothing is found before a step is taken', await found(t), []);
    t.eq('the field has 88 dashes', await dashes(t), 88);
    t.eq('and the walk is one dot at the start', await dots(t), 1);
    t.ok('there is nothing to start over yet', await off(t, 'ewAgain'));

    // --- one step of 1 ---
    await press(t, 'ewStep');
    r = await read(t);
    t.ok('the step is worked', /Step 1: at \(0, 1\) the slope is y = 1, so y goes to 1 \+ 1 × 1 = 2 at x = 1\./.test(r), r);
    t.ok('and set against e', /At x = 1 Euler’s method gives y = 2\. The true solution is y = eˣ, so y\(1\) = e ≈ 2\.71828: the walk is short by about 0\.7183\./.test(r), r);
    t.ok('with why it falls short', /every step rises too little and the walk falls short of e\./.test(r), r);
    t.eq('the first walk is found', await found(t), ['walk']);
    t.ok('with a toast', /✓ Two, where e is 2\.718/.test(await toast(t)), await toast(t));
    t.ok('and no step past the end', await off(t, 'ewStep') && await off(t, 'ewAll'));
    t.eq('the walk has two dots', await dots(t), 2);

    // --- halve it ---
    await step(t, 1);
    t.ok('a new step size starts the walk again', /Take the first step\./.test(await read(t)));
    await press(t, 'ewStep');
    r = await read(t);
    t.ok('one step of 1/2 is worked', /Step 1: at \(0, 1\) the slope is y = 1, so y goes to 1 \+ 1\/2 × 1 = 3\/2 at x = 1\/2\./.test(r), r);
    t.ok('with a step to go', /1 step to go\./.test(r), r);
    await press(t, 'ewStep');
    r = await read(t);
    t.ok('the second reads the slope at the new point', /Step 2: at \(1\/2, 3\/2\) the slope is y = 3\/2, so y goes to 3\/2 \+ 1\/2 × \(3\/2\) = 9\/4 at x = 1\./.test(r), r);
    t.ok('and the misses are laid side by side', /Misses so far on y′ = y: h = 1 misses by 0\.7183, h = 1\/2 misses by 0\.4683\./.test(r), r);
    t.eq('landing closer is found', await found(t), ['closer', 'walk']);

    // --- eighths, walked to the end at once ---
    await step(t, 3);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('steps of 1/8 come within 0.16 of e', /gives y ≈ 2\.5658\. .* short by about 0\.1525\./.test(r), r);
    t.ok('the early steps are left to the figure', /Steps 1 to 5 are the dots already on the figure\./.test(r), r);
    t.eq('which has all nine dots', await dots(t), 9);
    t.eq('the eighths are found', await found(t), ['closer', 'eighth', 'walk']);

    // --- y′ = −2y ---
    await pick(t, 1);
    await step(t, 0);
    await press(t, 'ewStep');
    r = await read(t);
    t.ok('a step of 1 jumps below zero', /Step 1: at \(0, 1\) the slope is −2 × 1 = −2, so y goes to 1 \+ 1 × \(−2\) = −1 at x = 1\./.test(r), r);
    t.eq('the overshoot is found', await found(t), ['closer', 'eighth', 'swing', 'walk']);
    await press(t, 'ewStep');
    r = await read(t);
    t.ok('and swings back', /gives y = 1\. .* over by about 0\.9817\. .*jumps to the other side of 0 and swings back\./.test(r), r);
    await step(t, 1);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('a step of 1/2 lands on 0 and stays', /the first step takes away all of y and lands on 0, where the slope is 0, so the walk stays there\./.test(r), r);
    t.ok('the flat landing is found', (await found(t)).includes('flat'));
    t.ok('but it does not tame the decay', !(await found(t)).includes('tame'));
    await step(t, 2);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('steps of 1/4 keep half of y each time', /Each step keeps 1 − 2h = 1\/2 of y, so the walk shrinks toward 0 without reaching it/.test(r), r);
    t.ok('and tame the decay', (await found(t)).includes('tame'));

    // --- y′ = x ---
    await pick(t, 2);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('y′ = x falls short by exactly h', /gives y = 7\/4\. The true solution is y = x²\/2, so y\(2\) = 2: the walk is short by exactly 1\/4\./.test(r), r);
    t.ok('as a left Riemann sum', /Euler’s walk is the left Riemann sum for ∫₀² x dx = 2, and it falls short by exactly h = 1\/4\./.test(r), r);

    // --- y′ = y², the separable one ---
    await pick(t, 3);
    await step(t, 0);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('y′ = y² takes one step from 1/2 to 3/4', /Step 1: at \(0, 1\/2\) the slope is \(1\/2\)² = 1\/4, so y goes to 1\/2 \+ 1 × \(1\/4\) = 3\/4 at x = 1\./.test(r), r);
    t.ok('short of the separated answer by exactly 1/4', /The true solution is y = 1\/\(2 − x\), so y\(1\) = 1: the walk is short by exactly 1\/4\./.test(r), r);
    t.ok('and the separation is worked', /dy\/y² = dx gives −1\/y = x \+ c, and y\(0\) = 1\/2 makes c = −2, so the true curve is y = 1\/\(2 − x\)\./.test(r), r);
    t.ok('the separated curve is met', (await found(t)).includes('sep'));
    t.ok('but one step is not close', !(await found(t)).includes('sepnear'));
    await step(t, 2);
    await press(t, 'ewAll');
    t.ok('steps of 1/4 still miss by more than 0.1', !(await found(t)).includes('sepnear'));
    await step(t, 3);
    await press(t, 'ewAll');
    r = await read(t);
    t.ok('steps of 1/8 land within 0.07', /gives y ≈ 0\.9306\. .*short by about 0\.0694\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['closer', 'eighth', 'flat', 'ramp', 'sep', 'sepnear', 'swing', 'tame', 'walk']);
    t.ok('and the count says so', /9 of 9 found/.test(await t.ev(() => document.getElementById('ewGoals').innerText)));

    // --- starting over ---
    await press(t, 'ewAgain');
    t.ok('starting over goes back to the start', /Take the first step\./.test(await read(t)));
    t.eq('with one dot', await dots(t), 1);
    t.ok('and the step buttons on again', !(await off(t, 'ewStep')) && !(await off(t, 'ewAll')));
    t.eq('a step past the end changes nothing', await t.ev(() => { EulerWalk.all(); EulerWalk.step(); return EulerWalk.k; }), 8);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-eulerwalk button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each equation button names its equation', await t.ev(() =>
      [...document.querySelectorAll('#ewSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'y prime equals y, from y(0) = 1 | y prime equals minus 2 y, from y(0) = 1 | y prime equals x, from y(0) = 0 | y prime equals y squared, from y(0) = 1/2');
    t.ok('the drawing is named for a screen reader', /^The slope field of y′ = y², the true solution y = 1\/\(2 − x\) in gold, and Euler’s walk in blue through 9 points, now at x = 1, y ≈ 0\.9306$/.test(
      await t.ev(() => document.querySelector('#ewFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the Euler step workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
