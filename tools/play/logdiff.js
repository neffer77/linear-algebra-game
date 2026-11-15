/* The log slope workshop: when x is in the base and the power.
 *
 * These checks open it from the Tome and drive it through its buttons: xˣ
 * opens at x = 1.5 with slope 1.837 × 1.405 ≈ 2.582 and nothing found; the
 * power rule gives 1.837 and the exponent rule 0.745, the nudge catches both,
 * and added together they make 2.582; at x = 1/e the tangent is flat; at
 * x = 1 the power rule is right by luck; x²ˣ has slope 2 at x = 1; and
 * x^(1/x) peaks at x = e. The stepper stops at its ends, every button is
 * named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lgRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#lgFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#lgGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#lgSets button')[k].click(), k);
const mode = (t, k) => t.ev(k => document.querySelectorAll('#lgModes button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lgModes button')].map(b => b.getAttribute('aria-pressed')).join());
const shown = t => t.ev(() => document.getElementById('lgX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const has = (t, k) => t.ev(k => !!document.querySelector(`#lgFig [data-k="${k}"]`), k);

module.exports = {
  name: 'logdiff',
  title: 'Log slope workshop · x in the base and the power',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the log slope workshop', await t.showing('tomeLogDiff'));
    await t.tap('tomeLogDiff');
    t.eq('and one tap opens it', await t.screen(), 's-logdiff');

    // --- xˣ at x = 1.5 ---
    let r = await read(t);
    t.ok('it says why neither rule fits', /y = xˣ: x is in the base and in the power, so neither the power rule \(a fixed power\) nor the exponent rule \(a fixed base\) fits on its own\./.test(r), r);
    t.ok('works y and ln x at the point', /At x = 1\.5: y = 1\.5\^\(1\.5\) ≈ 1\.837, and ln 1\.5 ≈ 0\.405\./.test(r), r);
    t.ok('takes ln of both sides', /Take ln of both sides: ln y = x·ln x\. Differentiate both sides: y′\/y = 1·ln x \+ x·\(1\/x\) = ln x \+ 1\./.test(r), r);
    t.ok('and multiplies back by y', /Here y′\/y ≈ 1\.405, so multiply back by y: y′ = 1\.837 × 1\.405 ≈ 2\.582\./.test(r), r);
    t.ok('and checks it with a nudge', /Check with a nudge: from x = 1\.499 to 1\.501, y goes from about 1\.834538 to about 1\.839702, so Δy\/Δx ≈ 2\.582\./.test(r), r);
    t.ok('which agrees', /That agrees with y′ ≈ 2\.582: y rises as x rises here\./.test(r), r);
    t.eq('the stepper reads x', await shown(t), 'x = 1.5');
    t.eq('taking ln first is the pressed method', await pressed(t), 'true,false,false,false');
    t.eq('the caption names the colours', await cap(t), 'The curve is blue. The green line is the tangent that taking ln first gives at the gold point, and a slip’s line is drawn dashed in red.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('the curve and its tangent are drawn, with no slip line', await has(t, 'curve') && await has(t, 'tan') && !(await has(t, 'slip')));

    // --- the two wrong rules, then both ---
    await mode(t, 1);
    r = await read(t);
    t.ok('the power rule holds the power still', /The slip uses the power rule, as if the power x were a fixed number: y′ = x·x\^\(x − 1\) ≈ 1\.837\./.test(r), r);
    t.ok('and the nudge catches it', /So the power rule is wrong: it misses the part that comes from x moving in the power, x\^\(x\)·ln x·\(1\) ≈ 0\.745\. The slope is 2\.582\./.test(r), r);
    t.eq('the power rule is found out', await found(t), ['power']);
    t.ok('with a toast', /✓ The power moves too/.test(await toast(t)), await toast(t));
    t.ok('and the slip\'s line is drawn beside the tangent', await has(t, 'slip') && await has(t, 'tan'));
    t.eq('the slip is the pressed method', await pressed(t), 'false,true,false,false');
    await mode(t, 2);
    r = await read(t);
    t.ok('the exponent rule holds the base still', /The slip uses the exponent rule, as if the base x were a fixed number: y′ = x\^\(x\)·ln x·\(1\) ≈ 0\.745\./.test(r), r);
    t.ok('and is caught too', /So the exponent rule is wrong: it misses the part that comes from x moving in the base, x·x\^\(x − 1\) ≈ 1\.837\. The slope is 2\.582\./.test(r), r);
    t.eq('the exponent rule is found out', await found(t), ['expo', 'power']);
    await mode(t, 3);
    r = await read(t);
    t.ok('the two parts add up', /Add the two: the power rule part x·x\^\(x − 1\) ≈ 1\.837, plus the exponent rule part x\^\(x\)·ln x·\(1\) ≈ 0\.745, makes 2\.582\./.test(r), r);
    t.ok('to the slope exactly', /That is y′ exactly\. x moves in two places, the base and the power, and each rule catches one of them\. Taking ln catches both at once\./.test(r), r);
    t.eq('the sum is found', await found(t), ['expo', 'power', 'sum']);
    t.ok('and no slip line is drawn, since the sum is right', !(await has(t, 'slip')));

    // --- x = 1/e: the bottom of xˣ ---
    await mode(t, 0);
    await press(t, 'lgXLo', 3);
    t.eq('the stepper lands on 1/e', await shown(t), 'x = 1/e');
    r = await read(t);
    t.ok('ln 1/e is exactly −1', /At x = 1\/e ≈ 0\.368: y = \(1\/e\)\^\(1\/e\) ≈ 0\.692, and ln 1\/e = −1\./.test(r), r);
    t.ok('so y′/y is 0', /Here y′\/y = 0, so multiply back by y: y′ = 0\.692 × 0 = 0\./.test(r), r);
    t.ok('and the tangent is flat at the bottom', /That agrees: y′ = 0\. At x = 1\/e, ln x \+ 1 = 0, so the tangent is flat: this is the lowest point of xˣ, about 0\.692\./.test(r), r);
    t.eq('the bottom is found', await found(t), ['expo', 'flat', 'power', 'sum']);

    // --- x = 1: the power rule by luck ---
    await mode(t, 1);
    await press(t, 'lgXHi', 2);
    r = await read(t);
    t.eq('the stepper reads 1', await shown(t), 'x = 1');
    t.ok('the power rule is right by luck at 1', /It gets it right here by luck: ln 1 = 0, so the part from x moving in the power is 0\. Anywhere else it would be wrong\./.test(r), r);
    t.eq('luck is found', await found(t), ['expo', 'flat', 'luck', 'power', 'sum']);

    // --- x²ˣ: a slope of 2 ---
    await pick(t, 1);
    t.eq('a new curve starts at x = 1.25', await shown(t), 'x = 1.25');
    t.eq('and back on taking ln first', await pressed(t), 'true,false,false,false');
    await press(t, 'lgXLo', 1);
    r = await read(t);
    t.ok('x²ˣ takes ln too', /Take ln of both sides: ln y = 2x·ln x\. Differentiate both sides: y′\/y = 2·ln x \+ 2x·\(1\/x\) = 2\(ln x \+ 1\)\./.test(r), r);
    t.ok('and has slope 2 at 1', /Here y′\/y = 2, so multiply back by y: y′ = 1 × 2 = 2\./.test(r), r);
    t.eq('the slope of 2 is found', await found(t), ['expo', 'flat', 'luck', 'power', 'sum', 'two']);

    // --- x^(1/x): the top at e ---
    await pick(t, 2);
    t.eq('x^(1/x) starts at x = 2', await shown(t), 'x = 2');
    await press(t, 'lgXHi', 1);
    r = await read(t);
    t.ok('the quotient rule works ln y', /Take ln of both sides: ln y = \(ln x\)\/x\. Differentiate both sides: y′\/y = \(\(1\/x\)·x − ln x\)\/x² = \(1 − ln x\)\/x²\./.test(r), r);
    t.ok('ln e is exactly 1', /At x = e ≈ 2\.718: y = e\^\(1\/e\) ≈ 1\.445, and ln e = 1\./.test(r), r);
    t.ok('and the top is at e', /That agrees: y′ = 0\. At x = e, 1 − ln x = 0, so the tangent is flat: this is the top of x\^\(1\/x\), e\^\(1\/e\) ≈ 1\.445\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['expo', 'flat', 'luck', 'peak', 'power', 'sum', 'two']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('lgGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'lgXHi', 12);
    t.eq('up stops at 5', await shown(t), 'x = 5');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('lgXHi').disabled));
    await press(t, 'lgXLo', 12);
    t.eq('down stops at 0.5', await shown(t), 'x = 0.5');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('lgXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { LogDiff.moveX(-1); return LogDiff.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-logdiff .wsCell button, #lgSets button, #lgModes button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#lgSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'y = x to the power x | y = x to the power 2x | y = x to the power 1/x');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#lgFig svg').getAttribute('aria-label')),
      'y = x^(1/x) in blue, with its tangent at x = 0.5, slope 1.693');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the log slope workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
