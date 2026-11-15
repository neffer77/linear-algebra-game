/* The Taylor workshop: a function rebuilt from powers of x.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout lists the polynomial, works it at x term by term and sets it
 * against the function; each term added at x = 1 closes the gap until eˣ is
 * within 0.001 of e; at x = 0 P is exactly right whatever its length; at
 * x = −2 the guesses swing until seven powers bring eˣ within 0.01; sin x
 * skips the even powers and says so; at x = 3 it takes every power up to x⁹,
 * and the first term alone is worse than none. The steppers stop at their
 * ends even pressed past them, and every button is named. It fits a phone
 * and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tyRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#tyFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#tyGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tyCurves button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'taylor',
  title: 'Taylor workshop · eˣ, sin x and cos x built from powers of x',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Corwin');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the Taylor workshop', await t.showing('tomeTaylor'));
    await t.tap('tomeTaylor');
    t.eq('and one tap opens it', await t.screen(), 's-taylor');

    // --- it opens on eˣ, up to x¹, at x = 1 ---
    let r = await read(t);
    t.ok('it names the series it builds from', /eˣ = 1 \+ x \+ x²\/2! \+ x³\/3! \+ …: every power of x, each over its factorial\./.test(r), r);
    t.ok('and the polynomial so far', /P₁\(x\) = 1 \+ x, the series up to x¹\./.test(r), r);
    t.ok('worked at x term by term', /P₁\(1\) = 1 \+ 1 = 2\./.test(r), r);
    t.ok('and set against eˣ itself', /At x = 1, eˣ ≈ 2\.7183, so P₁ is short by about 0\.7183\./.test(r), r);
    t.eq('the caption names both curves', await cap(t), 'eˣ in gold, P₁ in blue, both marked at x = 1.');
    t.ok('a figure of both curves is drawn', await t.ev(() => !!document.querySelector('#tyFig canvas.fig')));
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- more terms close the gap at x = 1 ---
    await press(t, 'tyNHi', 2);
    r = await read(t);
    t.ok('up to x³ the terms are 1, 1, 0.5 and 0.1667', /P₃\(1\) = 1 \+ 1 \+ 0\.5 \+ 0\.1667 ≈ 2\.6667\./.test(r), r);
    t.ok('and the gap is down to about 0.0516', /short by about 0\.0516/.test(r), r);
    await press(t, 'tyNHi', 3);
    r = await read(t);
    t.ok('up to x⁶ eˣ at 1 is short by about 0.0002', /P₆\(1\) = .* ≈ 2\.7181\..*short by about 0\.0002\./.test(r), r);
    t.eq('getting e within 0.001 is found', await found(t), ['close']);
    t.ok('and its toast keeps the 0.001', /✓ Get eˣ at x = 1 within 0\.001/.test(await toast(t)), await toast(t));

    // --- at 0 every Taylor polynomial is right ---
    await press(t, 'tyXLo', 2);
    r = await read(t);
    t.ok('at x = 0 every term but the first is 0', /P₆\(0\) = 1 \+ 0 \+ 0 \+ 0 \+ 0 \+ 0 \+ 0 = 1\./.test(r), r);
    t.ok('and P is exactly right there, and says why', /so P₆ is exactly right\. At x = 0 every power of x is 0/.test(r), r);
    t.eq('exactly right is found', await found(t), ['close', 'zero']);

    // --- at −2 the guesses swing ---
    await press(t, 'tyXLo', 3);
    r = await read(t);
    t.ok('at x = −2 the terms take turns in sign', /P₆\(−2\) = 1 − 2 \+ 2 − 1\.3333 \+ 0\.6667 − 0\.2667 \+ 0\.0889 ≈ 0\.1556\./.test(r), r);
    t.ok('and P₆ overshoots', /eˣ ≈ 0\.1353, so P₆ is over by about 0\.0202/.test(r), r);
    await press(t, 'tyNHi');
    t.ok('one more term undershoots, inside 0.01', /so P₇ is short by about 0\.0052/.test(await read(t)));
    t.eq('eˣ at −2 within 0.01 is found', await found(t), ['close', 'neg', 'zero']);

    // --- sin x skips the even powers ---
    await pick(t, 1);
    await press(t, 'tyNHi');
    r = await read(t);
    t.ok('sin x names its odd powers', /sin x = x − x³\/3! \+ x⁵\/5! − …: only the odd powers/.test(r), r);
    t.ok('and has no x⁸ term to add', /sin x has no x⁸ term, so P₈ is the same polynomial as P₇\./.test(r), r);
    t.eq('a term that changes nothing is found', await found(t), ['close', 'neg', 'skip', 'zero']);

    // --- far from 0 it takes every term ---
    await press(t, 'tyNHi');
    await press(t, 'tyXHi', 7);
    r = await read(t);
    t.ok('at x = 3 sin x takes every odd power up to x⁹', /P₉\(3\) = 3 − 4\.5 \+ 2\.025 − 0\.4339 \+ 0\.0542 ≈ 0\.1453\./.test(r), r);
    t.ok('to come within 0.01', /sin x ≈ 0\.1411, so P₉ is over by about 0\.0042/.test(r), r);
    t.eq('sin x at 3 within 0.01 is found', await found(t), ['close', 'far', 'neg', 'skip', 'zero']);
    t.ok('the highest power stops at x⁹', await t.ev(() => document.getElementById('tyNHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Taylor.moveN(1); return Taylor.n; }), 9);
    t.ok('x stops at 3', await t.ev(() => document.getElementById('tyXHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Taylor.moveX(1); return Taylor.x(); }), 3);

    // --- the first term alone is worse than none ---
    await press(t, 'tyNLo', 8);
    r = await read(t);
    t.ok('at x = 3, P₁ = 3 is far over', /P₁\(3\) = 3\. At x = 3, sin x ≈ 0\.1411, so P₁ is over by about 2\.8589\./.test(r), r);
    t.ok('and the readout says the term made it worse, and why', /Adding the x¹ term made this worse: far from 0 the powers of x grow faster than the factorials at first/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'far', 'neg', 'skip', 'worse', 'zero']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('tyGoals').innerText)));
    await press(t, 'tyNLo');
    t.ok('with no terms at all sin x has nothing to start from', /P₀\(x\) = 0: sin x has no constant term, so it starts at x\./.test(await read(t)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-taylor .wsCell button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each stepper says what it moves', unnamed, 0);
    t.eq('each function has its own button', await t.ev(() =>
      [...document.querySelectorAll('#tyCurves button')].map(b => b.innerText.trim()).join()), 'eˣ,sin x,cos x');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the Taylor workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
