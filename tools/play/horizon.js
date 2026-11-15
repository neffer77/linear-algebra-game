/* The horizon workshop: where a fraction heads as x grows.
 *
 * These checks open it from the Tome and drive it through its buttons: equal
 * powers open at x = 100 with nothing found and settle within 0.001 of 3 by
 * x = 10,000; a bigger power below is crushed toward 0; a bigger power on top
 * runs past 1,000 and off the chart; and the slow starter is caught below 0
 * at x = 10 before it too settles on 3, which finishes the hunt. The stepper
 * stops at 1 and at a million, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hzRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#hzFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#hzGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#hzSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('hzX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => [...document.querySelectorAll('#hzFig [data-k]')].map(e => e.dataset.k).filter(k => /here|off|limit/.test(k)).sort().join(' '));

module.exports = {
  name: 'horizon',
  title: 'Horizon workshop · limits at infinity',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the horizon workshop', await t.showing('tomeHorizon'));
    await t.tap('tomeHorizon');
    t.eq('and one tap opens it', await t.screen(), 's-horizon');

    // --- equal powers at x = 100 ---
    let r = await read(t);
    t.ok('it names the fraction', /f\(x\) = \(3x² \+ 5x\)\/\(x² \+ 2\)\. Step x out toward infinity, ten times further each time, and watch where f heads\./.test(r), r);
    t.ok('works the stop out in full', /At x = 100: the top is 3·100² \+ 5·100 = 30,500 and the bottom is 100² \+ 2 = 10,002, so f\(100\) ≈ 3\.0494\./.test(r), r);
    t.ok('picks out the biggest terms', /The biggest terms are 3x² on top and x² underneath: here they make 30,000 and 10,000, while the rest add 500 and 2\./.test(r), r);
    t.ok('and reads the limit from their ratio', /Their ratio is 3x² ÷ x² = 3, the same at every x, so f heads for 3\./.test(r), r);
    t.ok('says how far off f still is', /f\(100\) is 0\.0494 above 3\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 100');
    t.eq('the caption says what is drawn', await cap(t), 'x runs from 1 to a million, each mark ten times the last. f is in blue, the stop you are at in gold, and the dashed gold line is where f heads. A triangle at the edge marks a stop off the chart.');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- settled ---
    await press(t, 'hzXHi', 2);
    r = await read(t);
    t.eq('the stepper goes ten times further each press', await shown(t), 'x = 10,000');
    t.ok('within 0.001 of 3', /f\(10,000\) is 0\.0005 above 3, within 0\.001 of it\./.test(r), r);
    t.eq('close enough is found', await found(t), ['close']);
    t.ok('with a toast', /✓ Within 0\.001/.test(await toast(t)), await toast(t));

    // --- a bigger power below ---
    await pick(t, 1);
    t.eq('a new fraction starts at x = 100', await shown(t), 'x = 100');
    await press(t, 'hzXHi', 2);
    r = await read(t);
    t.ok('the ratio shrinks toward 0', /Their ratio is 4x ÷ 2x² = 2\/x, which is 0\.0002 here and shrinks toward 0, so f heads for 0\./.test(r), r);
    t.eq('crushed toward 0 is found', await found(t), ['close', 'zero']);

    // --- a bigger power on top ---
    await pick(t, 2);
    await press(t, 'hzXHi', 2);
    r = await read(t);
    t.ok('the ratio keeps growing', /Their ratio is x² ÷ 2x = x\/2, which is 5,000 here and keeps growing, so f has no limit: it runs off to infinity\./.test(r), r);
    t.ok('with f worked to four places', /so f\(10,000\) ≈ 4,999\.2502\./.test(r), r);
    t.eq('off to infinity is found', await found(t), ['away', 'close', 'zero']);
    t.eq('a stop off the chart is marked at its edge, with no limit line', await marks(t), 'here-off off off off');

    // --- the slow starter ---
    await pick(t, 3);
    await press(t, 'hzXLo', 1);
    r = await read(t);
    t.ok('the rest still wins at x = 10', /At x = 10 the rest is still bigger than the biggest term on top, so the biggest terms do not decide f yet: that is why f is below 0 here, though it heads for 3\./.test(r), r);
    t.ok('f is below 0 there', /so f\(10\) ≈ −1\.99\./.test(r), r);
    t.eq('the slow starter is caught', await found(t), ['away', 'close', 'fooled', 'zero']);
    await press(t, 'hzXHi', 4);
    r = await read(t);
    t.ok('and settles in the end', /f\(100,000\) is 0\.0005 below 3, within 0\.001 of it\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['away', 'close', 'fooled', 'slow', 'zero']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('hzGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'hzXHi', 9);
    t.eq('out stops at a million', await shown(t), 'x = 1,000,000');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('hzXHi').disabled));
    await press(t, 'hzXLo', 9);
    t.eq('back stops at 1', await shown(t), 'x = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('hzXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Horizon.moveX(-1); return Horizon.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-horizon .wsCell button, #hzSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each fraction button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#hzSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Equal powers: f(x) = (3x² + 5x)/(x² + 2) | Bigger below: f(x) = (4x + 9)/(2x² + 1) | Bigger on top: f(x) = (x² + 1)/(2x + 3) | Slow starter: f(x) = (6x² − 100x)/(2x² + 1)');
    t.eq('the chosen fraction is marked pressed', await t.ev(() => [...document.querySelectorAll('#hzSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'false,false,false,true');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /at x = 1 f is −31\.3333, heading for 3/.test(document.querySelector('#hzFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the horizon workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
