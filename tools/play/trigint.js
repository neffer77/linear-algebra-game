/* The trig integral workshop: divide by the k inside.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * target cos 2x opens with the guess sin 2x, whose slope is twice f; a
 * cosine swaps the wave the wrong way; c = 2 is the slip of multiplying by
 * the 2 inside; c = 1/2 lands on f; and c = −1/2 shows that a minus in front
 * stays in F′. Then −(1/3)cos 3x undoes sin 3x after the minus of cos is
 * explained, 2 sin 3x undoes 6 cos 3x, and −2 cos(x/2) undoes sin(x/2),
 * finishing the hunt. The stepper stops at its ends, every button is named,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('itRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#itFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#itGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#itSets button')[k].click(), k);
const wave = (t, g) => t.ev(g => [...document.querySelectorAll('#itFun button')].find(b => b.innerText.trim() === g).click(), g);
const txt = (t, id) => t.ev(id => document.getElementById(id).innerText, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const curves = t => t.ev(() => [...new Set([...document.querySelectorAll('#itFig polyline')].map(p => p.dataset.k))].sort().join());

module.exports = {
  name: 'trigint',
  title: 'Trig integral workshop · divide by the k inside',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the trig integral workshop', await t.showing('tomeTrigInt'));
    await t.tap('tomeTrigInt');
    t.eq('and one tap opens it', await t.screen(), 's-trigint');

    // --- cos 2x, starting from F = sin 2x ---
    let r = await read(t);
    t.ok('it names the target and the job', /The target is f\(x\) = cos\(2x\)\. Find an F whose slope is f: an antiderivative of f\./.test(r), r);
    t.ok('takes the slope of the guess by the chain rule', /Your guess is F\(x\) = sin\(2x\)\. Its slope by the chain rule: the slope of sin is cos, times the 2 inside, so F′\(x\) = 1 · 2 · cos\(2x\) = 2·cos\(2x\)\./.test(r), r);
    t.ok('and says it is twice f', /The wave is right, cos\(2x\), but the number in front is 2 where f has 1: F′ is 2 times f\./.test(r), r);
    t.eq('the guess is shown big', await txt(t, 'itF'), 'F(x) = sin(2x)');
    t.eq('the stepper reads c', await txt(t, 'itC'), 'c = 1');
    t.eq('the sine button shows as pressed', await t.ev(() => [...document.querySelectorAll('#itFun button')].map(b => b.getAttribute('aria-pressed')).join(' ')), 'true false');
    t.eq('the caption names the colours', await cap(t), 'The dashed gold wave is the target f. The green wave is the slope of your guess, F′. When F is right, the green lands exactly on the gold.');
    t.eq('both waves are drawn', await curves(t), 'slope,target');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- the wrong wave ---
    await wave(t, 'cos');
    r = await read(t);
    t.ok('a cosine has −sin for its slope', /the slope of cos is −sin, times the 2 inside, so F′\(x\) = −1 · 2 · sin\(2x\) = −2·sin\(2x\)\./.test(r), r);
    t.ok('which is the wrong wave', /But F′ is a sine where f is a cosine: the slope of sin is cos and the slope of cos is −sin, so to land on a cosine, F has to be a sine\./.test(r), r);
    t.eq('the swap is found', await found(t), ['swap']);
    t.ok('with a toast', /✓ Sine and cosine swap/.test(await toast(t)), await toast(t));

    // --- multiplying instead of dividing ---
    await wave(t, 'sin');
    await press(t, 'itCHi');
    r = await read(t);
    t.ok('c = 2 gives four times f', /F′\(x\) = 2 · 2 · cos\(2x\) = 4·cos\(2x\)\. The wave is right, cos\(2x\), but the number in front is 4 where f has 1: F′ is 4 times f\./.test(r), r);
    t.ok('and says why', /Multiplying by the 2 inside is the slope run forwards\. Running it backwards divides: 1 ÷ 2 = 1\/2\./.test(r), r);
    t.eq('the slip is found', await found(t), ['slip', 'swap']);
    await press(t, 'itCLo', 2);
    r = await read(t);
    t.eq('the stepper steps through the fractions', await txt(t, 'itC'), 'c = 1/2');
    t.ok('(1/2) sin 2x lands on f', /F′\(x\) = \(1\/2\) · 2 · cos\(2x\) = cos\(2x\)\. That is f exactly, so F is an antiderivative of f: ∫ cos\(2x\) dx = \(1\/2\)·sin\(2x\) \+ C\./.test(r), r);
    t.ok('and says integrating divides', /Differentiating multiplies by the 2 inside, so integrating has to divide by it\./.test(r), r);
    t.eq('cos 2x undone is found', await found(t), ['cos2', 'slip', 'swap']);
    t.ok('the figure says the waves meet', await t.ev(() => /they lie on top of each other/.test(document.querySelector('#itFig svg').getAttribute('aria-label'))));
    await press(t, 'itCLo', 3);
    r = await read(t);
    t.ok('a minus in front gives minus f', /F′\(x\) = \(−1\/2\) · 2 · cos\(2x\) = −cos\(2x\)\. The wave is right, cos\(2x\), but the number in front is −1 where f has 1: F′ is minus f\./.test(r), r);
    t.ok('and stays in F′', /The slope of sin has no minus, so a minus in front of F stays in F′\./.test(r), r);
    t.eq('the minus is found', await found(t), ['cos2', 'sign', 'slip', 'swap']);

    // --- sin 3x ---
    await pick(t, 1);
    t.eq('a new target starts the guess again on the other wave', [await txt(t, 'itF'), await txt(t, 'itC')].join(' | '), 'F(x) = cos(3x) | c = 1');
    r = await read(t);
    t.ok('cos 3x gives minus three times f', /F′\(x\) = −1 · 3 · sin\(3x\) = −3·sin\(3x\)\. The wave is right, sin\(3x\), but the number in front is −3 where f has 1: F′ is 3 times f with its sign flipped\./.test(r), r);
    await press(t, 'itCLo', 2);
    r = await read(t);
    t.ok('the minus of cos is explained', /F′\(x\) = −\(1\/3\) · 3 · sin\(3x\) = −sin\(3x\)\..*The slope of cos carries a minus, so to land on \+sin\(3x\), F needs a minus of its own in front\./.test(r), r);
    await press(t, 'itCLo');
    r = await read(t);
    t.ok('−(1/3) cos 3x undoes sin 3x', /F′\(x\) = −\(−1\/3\) · 3 · sin\(3x\) = sin\(3x\)\. That is f exactly, so F is an antiderivative of f: ∫ sin\(3x\) dx = −\(1\/3\)·cos\(3x\) \+ C\./.test(r), r);

    // --- 6 cos 3x ---
    await pick(t, 2);
    r = await read(t);
    t.ok('sin 3x gives half of 6 cos 3x', /F′\(x\) = 1 · 3 · cos\(3x\) = 3·cos\(3x\)\. The wave is right, cos\(3x\), but the number in front is 3 where f has 6: F′ is 1\/2 times f\./.test(r), r);
    await press(t, 'itCHi');
    r = await read(t);
    t.ok('2 sin 3x undoes 6 cos 3x', /F′\(x\) = 2 · 3 · cos\(3x\) = 6·cos\(3x\)\. That is f exactly, so F is an antiderivative of f: ∫ 6·cos\(3x\) dx = 2·sin\(3x\) \+ C\./.test(r), r);

    // --- sin(x/2) ---
    await pick(t, 3);
    r = await read(t);
    t.ok('a half inside keeps its brackets', /the slope of cos is −sin, times the 1\/2 inside, so F′\(x\) = −1 · \(1\/2\) · sin\(x\/2\) = −\(1\/2\)·sin\(x\/2\)\./.test(r), r);
    await press(t, 'itCLo', 6);
    r = await read(t);
    t.ok('−2 cos(x/2) undoes sin(x/2)', /F′\(x\) = −\(−2\) · \(1\/2\) · sin\(x\/2\) = sin\(x\/2\)\. That is f exactly, so F is an antiderivative of f: ∫ sin\(x\/2\) dx = −2·cos\(x\/2\) \+ C\./.test(r), r);
    t.ok('and says where the 2 comes from', /Here the number inside is 1\/2, and dividing by 1\/2 doubles: that is where the 2 comes from\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['big', 'cos2', 'half', 'sign', 'sin3', 'slip', 'swap']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('itGoals').innerText)));
    t.ok('the drawing runs to 4π for the slow wave', await t.ev(() => [...document.querySelectorAll('#itFig svg text')].map(e => e.textContent).join() === '2π,4π'));

    // --- the stepper's ends ---
    await press(t, 'itCHi', 20);
    t.eq('the stepper stops at its top', await txt(t, 'itC'), 'c = 3');
    t.ok('and that button is off there', await t.ev(() => document.getElementById('itCHi').disabled));
    await press(t, 'itCLo', 20);
    t.eq('and at its bottom', await txt(t, 'itC'), 'c = −3');
    t.ok('and that button is off there', await t.ev(() => document.getElementById('itCLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { TrigInt.moveC(-1); return TrigInt.c(); }), -3);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-trigint button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each target button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#itSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Target f(x) = cos(2x) | Target f(x) = sin(3x) | Target f(x) = 6·cos(3x) | Target f(x) = sin(x/2)');
    t.eq('each wave button says what it makes F', await t.ev(() =>
      [...document.querySelectorAll('#itFun button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Make F a sine | Make F a cosine');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = sin\(x\/2\) dashed in gold and F′\(x\) = \(3\/2\)·sin\(x\/2\) in green, for x from 0 to 4π$/.test(document.querySelector('#itFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the trig integral workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
