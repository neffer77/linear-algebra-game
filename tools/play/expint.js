/* The growth integral workshop: fit an antiderivative of e^(kx) to its slope field.
 *
 * These checks open it from the Tome and drive it through its buttons: for
 * e^(2x) F opens as e^(2x) itself, twice too steep, with nothing found; a 2
 * in front is the multiply slip; a 1/2 in front fits, and lifting it by 1/2
 * puts it through the gold point (0, 1); raising the exponent as the power rule
 * would is caught; e^(−2x) needs −1/2 in front and e^(x/2) needs 2. Both
 * steppers stop at their ends, every button is named, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('xiRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#xiFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#xiGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#xiSets button')[k].click(), k);
const form = (t, k) => t.ev(k => document.querySelectorAll('#xiForms button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#xiForms button')].map(b => b.getAttribute('aria-pressed')).join());
const front = t => t.ev(() => document.getElementById('xiC').innerText);
const lift = t => t.ev(() => document.getElementById('xiL').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const curve = t => t.ev(() => [...document.querySelectorAll('#xiFig [data-k="F"]')].map(p => p.getAttribute('stroke')).join());
const dashes = t => t.ev(() => document.querySelectorAll('#xiFig [data-k="dash"]').length);

module.exports = {
  name: 'expint',
  title: 'Growth integral workshop · undo e^(kx) on a slope field',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the growth integral workshop', await t.showing('tomeExpInt'));
    await t.tap('tomeExpInt');
    t.eq('and one tap opens it', await t.screen(), 's-expint');

    // --- e^(2x), with F = e^(2x) itself ---
    let r = await read(t);
    t.ok('it says what an antiderivative has to do', /f\(x\) = e\^\(2x\)\. An antiderivative F is any curve whose slope at every x is f\(x\)\. The short dashes show that slope, and F has to run along them\./.test(r), r);
    t.ok('works F′ with the chain rule', /You have F\(x\) = e\^\(2x\)\. Differentiating multiplies by the number in front of x, 2, so F′\(x\) = 1 × 2·e\^\(2x\) = 2·e\^\(2x\)\./.test(r), r);
    t.ok('and says it is too steep', /That is 2 times f, too steep\. For F′ to be exactly f, the number in front times 2 must be 1\./.test(r), r);
    t.ok('and checks it with a nudge', /Check with a nudge at x = 0\.5: F goes from about 2\.712851 to about 2\.723724, so ΔF\/Δx ≈ 5\.437, against f\(0\.5\) ≈ 2\.718\./.test(r), r);
    t.eq('the steppers read 1 and 0', [await front(t), await lift(t)], ['in front: 1', '+ C: 0']);
    t.eq('keeping the exponent is the pressed form', await pressed(t), 'true,false');
    t.eq('the caption names the colours', await cap(t), 'The short dashes show the slope f(x) wherever you stand. Your F is the curve: green when it runs along every dash, blue when it cuts across them. The gold dot is (0, 1).');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the field has 88 dashes', await dashes(t), 88);
    t.eq('and F is drawn blue, since it cuts across them', await curve(t), '#5aa9e6');

    // --- the multiply slip, then the fit ---
    await press(t, 'xiCHi', 1);
    r = await read(t);
    t.ok('a 2 in front is what differentiating does', /That is 4 times f: multiplying by 2 is what differentiating does\. Integrating has to divide by it instead, so the number in front should be 1\/k = 1\/2\./.test(r), r);
    t.eq('the multiply slip is found out', await found(t), ['times']);
    t.ok('with a toast', /✓ That is differentiating/.test(await toast(t)), await toast(t));
    await press(t, 'xiCLo', 2);
    t.eq('the stepper lands on 1/2', await front(t), 'in front: 1/2');
    r = await read(t);
    t.ok('a half in front cancels the 2', /F′\(x\) = \(1\/2\) × 2·e\^\(2x\) = e\^\(2x\)\./.test(r), r);
    t.ok('so F fits', /That is exactly f\(x\), so F runs along every dash\. Dividing by the k inside, 2, undoes the 2 that differentiating brings out: ∫ e\^\(2x\) dx = \(1\/2\)·e\^\(2x\) \+ C\./.test(r), r);
    t.ok('and the nudge agrees', /so ΔF\/Δx ≈ 2\.718, against f\(0\.5\) ≈ 2\.718\./.test(r), r);
    t.ok('but it misses the gold point', /It meets x = 0 at F\(0\) = 1\/2\. Every lift fits the field, but only one passes through the gold point \(0, 1\)\./.test(r), r);
    t.eq('the fit is found', await found(t), ['fit', 'times']);
    t.eq('and F turns green', await curve(t), '#57cc7a');

    // --- the + C ---
    await press(t, 'xiLHi', 1);
    t.eq('the lift lands on 1/2', await lift(t), '+ C: 1/2');
    r = await read(t);
    t.ok('a lift keeps every slope', /The \+ 1\/2 lifts the whole curve without changing a single slope, so it still fits: that is the \+ C\./.test(r), r);
    t.ok('and this one meets the gold point', /And F\(0\) = 1\/2 \+ 1\/2 = 1, so this is the one antiderivative through the gold point \(0, 1\)\./.test(r), r);
    t.eq('the lift and the gold point are found', await found(t), ['fit', 'lift', 'through', 'times']);
    t.ok('and F says so to a screen reader', await t.ev(() => /through the gold point \(0, 1\)/.test(document.querySelector('#xiFig svg').getAttribute('aria-label'))));

    // --- the power rule slip ---
    await press(t, 'xiCLo', 1);
    r = await read(t);
    t.ok('a third in front is too shallow', /That is 2\/3 times f, too shallow\./.test(r), r);
    await form(t, 1);
    t.eq('raising is the pressed form', await pressed(t), 'false,true');
    r = await read(t);
    t.ok('raising the exponent gives e^(3x)', /You have F\(x\) = \(1\/3\)·e\^\(3x\) \+ 1\/2\. Differentiating multiplies by the number in front of x, 3, so F′\(x\) = \(1\/3\) × 3·e\^\(3x\) = e\^\(3x\)\./.test(r), r);
    t.ok('and is caught', /That is not f at all: raising the exponent is the power rule, but e\^\(2x\) is not a power of x\. An exponential keeps its exponent, so F′ is a multiple of e\^\(3x\), not of e\^\(2x\), and F cuts across the dashes\./.test(r), r);
    t.eq('the power rule slip is found out', await found(t), ['fit', 'lift', 'raise', 'through', 'times']);

    // --- e^(−2x) ---
    await pick(t, 1);
    t.eq('a new curve starts F afresh', [await front(t), await lift(t), await pressed(t)], ['in front: 1', '+ C: 0', 'true,false']);
    r = await read(t);
    t.ok('a negative k makes F slope the wrong way', /F′\(x\) = 1 × \(−2\)·e\^\(−2x\) = −2·e\^\(−2x\)\. That is −2 times f, sloping the wrong way\./.test(r), r);
    await press(t, 'xiCLo', 2);
    t.eq('the stepper lands on −1/2', await front(t), 'in front: −1/2');
    r = await read(t);
    t.ok('minus a half times minus 2 is 1', /F′\(x\) = \(−1\/2\) × \(−2\)·e\^\(−2x\) = e\^\(−2x\)\./.test(r), r);
    t.ok('and the minus comes along', /∫ e\^\(−2x\) dx = −\(1\/2\)·e\^\(−2x\) \+ C\. The k is negative, so the minus comes along\./.test(r), r);

    // --- e^(x/2) ---
    await pick(t, 2);
    await press(t, 'xiCHi', 2);
    t.eq('the stepper lands on 2', await front(t), 'in front: 2');
    r = await read(t);
    t.ok('dividing by a half doubles', /∫ e\^\(x\/2\) dx = 2·e\^\(x\/2\) \+ C\. Dividing by a half doubles\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fit', 'half', 'lift', 'neg', 'raise', 'through', 'times']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('xiGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 'xiCHi', 9);
    t.eq('the number in front stops at 3', await front(t), 'in front: 3');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('xiCHi').disabled));
    await press(t, 'xiCLo', 9);
    t.eq('and stops at 1/2 going down', await front(t), 'in front: 1/2');
    t.ok('with its button off there', await t.ev(() => document.getElementById('xiCLo').disabled));
    await press(t, 'xiLHi', 9);
    t.eq('the lift stops at 2', await lift(t), '+ C: 2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('xiLHi').disabled));
    await press(t, 'xiLLo', 9);
    t.eq('and stops at −2 going down', await lift(t), '+ C: −2');
    t.eq('and a press past it changes nothing', await t.ev(() => { ExpInt.moveL(-1); return ExpInt.li; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-expint .wsCell button, #xiSets button, #xiForms button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#xiSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = e to the 2x | f(x) = e to the minus 2x | f(x) = e to the x over 2');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#xiFig svg').getAttribute('aria-label')),
      'The slope field of f(x) = e^(x/2), and F(x) = (1/2)·e^(x/2) − 2, which cuts across the dashes');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the growth integral workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
