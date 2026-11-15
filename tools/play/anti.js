/* The antiderivative workshop: the power rule run backwards.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * target 6x² opens with the guess F = x, whose slope 1 has the wrong power;
 * power 3 gets the power right but only half of f; c = 2 lands on f;
 * c = 6 is the slip of forgetting to divide, three times f; and back at
 * c = 2, + 1 shows the + C. Then 2x^(3/2) undoes 3√x, −x⁻¹ undoes 1/x², and on 1/x power 0 meets
 * the one gap in the power rule, finishing the hunt. The steppers stop at
 * their ends, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('adRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#adFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#adGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#adSets button')[k].click(), k);
const txt = (t, id) => t.ev(id => document.getElementById(id).innerText, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const curves = t => t.ev(() => [...new Set([...document.querySelectorAll('#adFig polyline')].map(p => p.dataset.k))].sort().join());

module.exports = {
  name: 'anti',
  title: 'Antiderivative workshop · the power rule run backwards',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the antiderivative workshop', await t.showing('tomeAnti'));
    await t.tap('tomeAnti');
    t.eq('and one tap opens it', await t.screen(), 's-anti');

    // --- 6x², starting from F = x ---
    let r = await read(t);
    t.ok('it names the target and the job', /The target is f\(x\) = 6x²\. Find an F whose slope is f: an antiderivative of f\./.test(r), r);
    t.ok('takes the slope of the guess', /Your guess is F\(x\) = x\. Its slope by the power rule: bring the power down and drop it by one, F′\(x\) = 1 · 1 · x⁰ = 1\./.test(r), r);
    t.ok('and says the power is off', /The power is off: F′ has x⁰ where f has x²\. Since the rule drops the power by one, F has to start one higher, at x³\./.test(r), r);
    t.eq('the guess is shown big', await txt(t, 'adF'), 'F(x) = x');
    t.eq('the steppers read power, c and C', [await txt(t, 'adN'), await txt(t, 'adC'), await txt(t, 'adS')].join(' | '), 'power 1 | c = 1 | + C = 0');
    t.eq('the caption names the colours', await cap(t), 'The dashed gold curve is the target f. The green curve is the slope of your guess, F′. When F is right, the green lands exactly on the gold.');
    t.eq('both curves are drawn', await curves(t), 'slope,target');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- the right power, the wrong number ---
    await press(t, 'adNHi', 4);
    r = await read(t);
    t.eq('the power moves half a step at a time', await txt(t, 'adN'), 'power 3');
    t.ok('power 3 gets the power right but half of f', /F′\(x\) = 1 · 3 · x² = 3x²\. The power is right, x², but the number in front is 3 where f has 6: F′ is half of f\./.test(r), r);
    await press(t, 'adCHi');
    r = await read(t);
    t.ok('2x³ lands on f', /F′\(x\) = 2 · 3 · x² = 6x²\. That is f exactly, so F is an antiderivative of f\./.test(r), r);
    t.ok('and writes it as an integral', /In the notation of integrals, ∫ 6x² dx = 2x³ \+ C\./.test(r), r);
    t.eq('6x² undone is found', await found(t), ['sq']);
    t.ok('with a toast', /✓ 6x² undone/.test(await toast(t)), await toast(t));
    await press(t, 'adCHi', 4);
    r = await read(t);
    t.ok('raising without dividing gives three times f', /F′\(x\) = 6 · 3 · x² = 18x²\. The power is right, x², but the number in front is 18 where f has 6: F′ is 3 times f\./.test(r), r);
    t.ok('and says why', /Raising the power is only half the rule run backwards: the slope brings the new power, 3, down in front, so you have to divide by it first\. 6 ÷ 3 = 2\./.test(r), r);
    t.eq('the slip is found', await found(t), ['slip', 'sq']);
    await press(t, 'adCLo', 4);
    await press(t, 'adSHi');
    r = await read(t);
    t.eq('the guess shows the + 1', await txt(t, 'adF'), 'F(x) = 2x³ + 1');
    t.ok('the + 1 adds nothing to the slope', /The \+ 1 shifts the graph of F up, but a shift adds nothing to its slope\./.test(r), r);
    t.ok('so every antiderivative ends in + C', /every antiderivative of f is 2x³ \+ C, and the \+ C stands for the number you cannot see from the slope\./.test(r), r);
    t.eq('the + C is found', await found(t), ['plusC', 'slip', 'sq']);

    // --- 3√x ---
    await pick(t, 1);
    t.eq('a new target starts the guess again', await txt(t, 'adF'), 'F(x) = x');
    await press(t, 'adNHi');
    r = await read(t);
    t.ok('a half power keeps its fraction', /F′\(x\) = 1 · 3\/2 · x\^\(1\/2\) = \(3\/2\)x\^\(1\/2\)\. The power is right, x\^\(1\/2\), but the number in front is 3\/2 where f has 3: F′ is half of f\./.test(r), r);
    await press(t, 'adCHi');
    r = await read(t);
    t.ok('2x^(3/2) undoes 3√x', /F′\(x\) = 2 · 3\/2 · x\^\(1\/2\) = 3x\^\(1\/2\)\. That is f exactly/.test(r), r);

    // --- 1/x² ---
    await pick(t, 2);
    await press(t, 'adNLo', 4);
    r = await read(t);
    t.ok('a negative power keeps its brackets', /F′\(x\) = 1 · \(−1\) · x⁻² = −x⁻²\. The power is right, x⁻², but the number in front is −1 where f has 1: F′ is minus f\./.test(r), r);
    await press(t, 'adCLo', 2);
    r = await read(t);
    t.ok('−x⁻¹ undoes 1/x²', /Your guess is F\(x\) = −x⁻¹\. .*F′\(x\) = \(−1\) · \(−1\) · x⁻² = x⁻²\. That is f exactly/.test(r), r);

    // --- 1/x ---
    await pick(t, 3);
    await press(t, 'adNLo', 2);
    r = await read(t);
    t.ok('power 0 is flat', /With power 0, x⁰ is just the number 1, so F is flat and F′\(x\) = 0/.test(r), r);
    t.ok('which is the one gap in the power rule', /No power of x has 1\/x as its slope\. The antiderivative of 1\/x is ln x, the one gap in the power rule\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['gap', 'inv2', 'plusC', 'root', 'slip', 'sq']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('adGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 'adNHi', 20); await press(t, 'adCHi', 20); await press(t, 'adSHi', 20);
    t.eq('each stepper stops at its top', [await txt(t, 'adN'), await txt(t, 'adC'), await txt(t, 'adS')].join(' | '), 'power 4 | c = 6 | + C = 2');
    t.ok('and those buttons are off there', await t.ev(() => ['adNHi', 'adCHi', 'adSHi'].every(id => document.getElementById(id).disabled)));
    await press(t, 'adNLo', 20); await press(t, 'adCLo', 20); await press(t, 'adSLo', 20);
    t.eq('and at its bottom', [await txt(t, 'adN'), await txt(t, 'adC'), await txt(t, 'adS')].join(' | '), 'power −3 | c = −3 | + C = −2');
    t.ok('and those buttons are off there', await t.ev(() => ['adNLo', 'adCLo', 'adSLo'].every(id => document.getElementById(id).disabled)));
    t.eq('and a press past it changes nothing', await t.ev(() => { Anti.moveC(-1); return Anti.c; }), -3);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-anti .wsCell button, #adSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each target button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#adSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Target f(x) = 6x² | Target f(x) = 3x^(1/2) | Target f(x) = x⁻² | Target f(x) = x⁻¹');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = x⁻¹ dashed in gold and F′\(x\) = 9x⁻⁴ in green, for x from 0\.25 to 2\.5/.test(document.querySelector('#adFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the antiderivative workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
