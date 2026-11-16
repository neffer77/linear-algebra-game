/* The chord workshop: the mean value theorem by hand.
 *
 * These checks open it from the Tome and drive it through its buttons: on
 * x² the tangent at 1 is too shallow, at 2 it matches the chord's 4 half
 * way, and past it it is steeper; on x³ the middle, 1.5, falls short, and a
 * step from 1.7 to 1.75 crosses c = √3; on 4/x c is 2, short of the middle.
 * The buttons stop at the ends, starting over goes back, every button is
 * named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('mvtRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#mvtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#mvtSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#mvtSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'meanvalue',
  title: 'Chord workshop · the mean value theorem by hand',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the chord workshop', await t.showing('tomeMeanValue'));
    await t.tap('tomeMeanValue');
    t.eq('and one tap opens it', await t.screen(), 's-mvt');

    // --- x² on [0, 4], at x = 1 ---
    let r = await read(t);
    t.ok('it works the chord', /f\(x\) = x² on \[0, 4\]\. The chord from \(0, 0\) to \(4, 16\) has slope \(16 − 0\)\/\(4 − 0\) = 4\./.test(r), r);
    t.ok('and the tangent at 1', /At x = 1: f′\(x\) = 2x, so f′\(1\) = 2\./.test(r), r);
    t.ok('and says which way c lies', /That is less than the chord's slope, 4, and f′ grows as x moves right, so c lies to the right of 1\./.test(r), r);
    t.eq('x² is the pressed curve', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a move', await found(t), []);
    t.ok('there is nothing to start over yet', await off(t, 'mvtAgain'));
    t.eq('the figure draws the chord and the tangent', await t.ev(() => ['curve', 'chord', 'tangent', 'pt'].map(k => document.querySelectorAll(`#mvtFig [data-k="${k}"]`).length).join()), '1,1,1,1');

    // --- on to c ---
    await press(t, 'mvtR', 4);
    r = await read(t);
    t.ok('at 2 the tangent matches', /At x = 2: f′\(x\) = 2x, so f′\(2\) = 4\. That is the chord's slope, 4: the tangent here is parallel to the chord\. This x is the c the mean value theorem promises\./.test(r), r);
    t.ok('half way, as on every parabola', /For a parabola c always falls half way: \(0 \+ 4\)\/2 = 2\./.test(r), r);
    t.ok('it is found', (await found(t)).includes('parallel'));
    t.ok('with a toast', /✓ Parallel to the chord/.test(await toast(t)), await toast(t));
    await press(t, 'mvtr');
    r = await read(t);
    t.ok('past c it is steeper', /so f′\(2\.05\) = 4\.1\. That is more than the chord's slope, 4, and f′ grows as x moves right, so c lies to the left of 2\.05\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('steep'));
    await press(t, 'mvtR', 10);
    t.ok('a quarter stops where it would pass the end', /At x = 3\.8:/.test(await read(t)) && await off(t, 'mvtR') && !(await off(t, 'mvtr')));
    await press(t, 'mvtr', 5);
    t.ok('the point stops short of the end', /At x = 3\.95:/.test(await read(t)) && await off(t, 'mvtR') && await off(t, 'mvtr'));

    // --- x³ on [0, 3] ---
    await pick(t, 1);
    await press(t, 'mvtR', 2);
    r = await read(t);
    t.ok('the middle falls short', /so f′\(1\.5\) = 6\.75\. That is less than the chord's slope, 9/.test(r) && /1\.5 is the middle of \[0, 3\], but c is not: c falls half way only on a parabola\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('middle'));
    await press(t, 'mvtr', 4);
    t.ok('1.7 is still short', /so f′\(1\.7\) = 8\.67\. That is less/.test(await read(t)), await read(t));
    await press(t, 'mvtr');
    r = await read(t);
    t.ok('1.75 is past it', /so f′\(1\.75\) = 9\.1875\. That is more than the chord's slope, 9/.test(r), r);
    t.ok('so c lies between, at √3', /Between x = 1\.7 and x = 1\.75 the tangent's slope passes 9, so c lies between them: solving 3c² = 9 gives c = √3 ≈ 1\.7321\./.test(r), r);
    t.ok('crossing and closing in are found', (await found(t)).includes('cross') && (await found(t)).includes('close'), (await found(t)).join());

    // --- 4/x on [1, 4] ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the chord runs downhill', /The chord from \(1, 4\) to \(4, 1\) has slope \(1 − 4\)\/\(4 − 1\) = −1\./.test(r), r);
    t.ok('the tangent at 1.5 is too steep downhill', /so f′\(1\.5\) ≈ −1\.7778\. That is less than the chord's slope, −1/.test(r), r);
    await press(t, 'mvtR', 2);
    r = await read(t);
    t.ok('c is 2, short of the middle', /so f′\(2\) = −1\. That is the chord's slope, −1/.test(r) && /On 4\/x, c = √\(1 × 4\) = 2, short of the middle, 2\.5\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'cross', 'middle', 'parallel', 'recip', 'steep']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('mvtGoals').innerText)));

    // --- starting over, and the ends ---
    await press(t, 'mvtAgain');
    t.ok('starting over goes back to the start', /At x = 1\.5:/.test(await read(t)));
    t.ok('with nothing to start over', await off(t, 'mvtAgain'));
    t.eq('the point never reaches an end', await t.ev(() => { for (let i = 0; i < 30; i++) MeanValue.move(-1); return MeanValue.x(); }), 1.05);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-mvt button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#mvtSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = x squared on 0 to 4 | f(x) = x cubed on 0 to 3 | f(x) = 4 over x on 1 to 4');
    t.ok('the drawing is named for a screen reader', /^f\(x\) = 4\/x on 1 to 4 in gold, the chord between its ends dashed, and in blue the tangent at x = 1\.05, slope ≈ −3\.6281 against the chord's −1$/.test(
      await t.ev(() => document.querySelector('#mvtFig svg').getAttribute('aria-label'))), await t.ev(() => document.querySelector('#mvtFig svg').getAttribute('aria-label')));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the chord workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
