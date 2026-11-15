/* The chain rule workshop: two links, two slopes, one product.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout starts on y = (3x − 1)² at x = 1, works u and y, says how fast u
 * moves for x and y for u, multiplies the two to 12 and checks it with a
 * nudge either side of x; at x = 0, y falls as x rises; the slip f′(x) × g′(x)
 * is caught out by the nudge and drawn as a blue line across the tangent, and
 * at x = 0.5 it is right only by luck; on (x² − 1)³, g′(0) = 0 stops y, f′(0)
 * stops it at x = 1, and at x = 2 y races x at 108, which finishes the hunt.
 * The stepper stops at its ends even pressed past them, and every button is
 * named. It fits a phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('chRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#chFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#chGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#chPairs button')[k].click(), k);
const rule = (t, k) => t.ev(k => document.querySelectorAll('#chRules button')[k].click(), k);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'chainrule',
  title: 'Chain rule workshop · why the slopes of two links multiply',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the chain rule workshop', await t.showing('tomeChain'));
    await t.tap('tomeChain');
    t.eq('and one tap opens it', await t.screen(), 's-chain');

    // --- it opens on (3x − 1)² at x = 1 ---
    let r = await read(t);
    t.ok('it names both links', /y = f\(u\) with f\(u\) = u², and u = g\(x\) = 3x − 1\./.test(r), r);
    t.ok('and works u and y at x', /At x = 1: u = g\(1\) = 2, so y = f\(2\) = 4\./.test(r), r);
    t.ok('it says how fast u moves for x', /g′\(x\) = 3, so g′\(1\) = 3: u moves 3 times as fast as x\./.test(r), r);
    t.ok('and how fast y moves for u', /f′\(u\) = 2u, so f′\(2\) = 4: y moves 4 times as fast as u\./.test(r), r);
    t.ok('and multiplies the two', /So dy\/dx = f′\(u\) × g′\(x\) = 4 × 3 = 12: y moves 12 times as fast as x\./.test(r), r);
    t.ok('a nudge either side of x checks it', /Check with a nudge: from x = 0\.999 to 1\.001, y goes from 3\.988009 to 4\.012009, so Δy\/Δx ≈ 12\. That agrees with dy\/dx = 12\./.test(r), r);
    t.eq('the caption gives the tangent\'s slope', await cap(t), 'The gold curve is y = (3x − 1)². The dashed red tangent at x = 1 has slope dy/dx = 12.');
    t.ok('a figure of the curve is drawn', await t.ev(() => !!document.querySelector('#chFig canvas.fig')));
    t.eq('the stepper reads x', await t.ev(() => document.getElementById('chX').innerText), 'x = 1');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the chain rule is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#chRules button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false');

    // --- y falls as x rises ---
    await press(t, 'chXLo', 2);
    r = await read(t);
    t.ok('at x = 0, y moves the other way', /f′\(−1\) = −2: y moves 2 times as fast as u, the other way\./.test(r), r);
    t.ok('negatives are bracketed in the product', /= \(−2\) × 3 = −6: y moves 6 times as fast as x, the other way\./.test(r), r);
    t.eq('y falling is found', await found(t), ['neg']);
    t.ok('its toast starts with a capital', /✓ Found y falling as x rises/.test(await toast(t)), await toast(t));

    // --- the slip, caught out ---
    await t.ev(() => { const o = Figure.render; Figure.render = function (spec, host) { if (host && host.id === 'chFig') window.__chSpec = spec; return o.apply(this, arguments); }; });
    await rule(t, 1);
    t.eq('the slip is drawn as its own line through the point', await t.ev(() => JSON.stringify((window.__chSpec.also || {}).f)), '{"poly":[[0,1],[1,0]]}');
    r = await read(t);
    t.ok('the slip takes f′ at x', /The slip takes f′ at x: f′\(x\) × g′\(x\) = f′\(0\) × 3 = 0 × 3 = 0\./.test(r), r);
    t.ok('and the nudge catches it out', /So the slip's 0 is wrong: f′ has to be taken at u = −1, where y sits, not at x = 0\. The chain rule's answer is −6\./.test(r), r);
    t.ok('the caption shows the slip cutting across', /the slip's blue line, with slope 0, cuts across it\./.test(await cap(t)), await cap(t));
    t.eq('catching the slip is found', await found(t), ['miss', 'neg']);

    // --- right by luck ---
    await press(t, 'chXHi');
    r = await read(t);
    t.ok('at x = 0.5 the slip is right, and it says why', /The slip gets it right here, but only by luck: g\(0\.5\) = 0\.5, the same as x, so f′ is taken at the same number either way\./.test(r), r);
    t.ok('and its line lies along the tangent', /the slip's blue line lies right along it\./.test(await cap(t)), await cap(t));
    t.eq('the lucky slip is found', await found(t), ['luck', 'miss', 'neg']);

    // --- (x² − 1)³: each link can stop y ---
    await pick(t, 1);
    t.eq('a new pair keeps the rule that was picked', await t.ev(() =>
      [...document.querySelectorAll('#chRules button')].map(b => b.getAttribute('aria-pressed')).join()), 'false,true');
    await rule(t, 0);
    t.eq('the chain rule draws no second line', await t.ev(() => typeof window.__chSpec.also), 'undefined');
    await press(t, 'chXLo');
    r = await read(t);
    t.ok('at x = 0 the inner link stands still', /g′\(0\) = 0: u stands still for a moment as x moves\./.test(r), r);
    t.ok('so y does too, though f′ is 3', /f′\(−1\) = 3: y moves 3 times as fast as u\. So dy\/dx = f′\(u\) × g′\(x\) = 3 × 0 = 0: y stands still for a moment as x moves\./.test(r), r);
    t.eq('the inner link stopping y is found', await found(t), ['inner', 'luck', 'miss', 'neg']);
    await press(t, 'chXHi', 2);
    r = await read(t);
    t.ok('at x = 1 the outer link stands still', /f′\(0\) = 0: y stands still for a moment as u moves\./.test(r), r);
    t.ok('and the nudge barely moves y', /Check with a nudge: from x = 0\.999 to 1\.001, y goes from about 0 to about 0, so Δy\/Δx ≈ 0\./.test(r), r);
    t.eq('the outer link stopping y is found', await found(t), ['inner', 'luck', 'miss', 'neg', 'outer']);
    await press(t, 'chXHi', 2);
    r = await read(t);
    t.ok('at x = 2, y moves 108 times as fast as x', /= 27 × 4 = 108: y moves 108 times as fast as x\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['big', 'inner', 'luck', 'miss', 'neg', 'outer']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('chGoals').innerText)));

    // --- the stepper's ends ---
    t.ok('x stops at 2', await t.ev(() => document.getElementById('chXHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Chain.moveX(1); return Chain.x(); }), 2);
    await press(t, 'chXLo', 10);
    t.eq('x stops at −2', await t.ev(() => Chain.x()), -2);
    t.ok('and its button is off there', await t.ev(() => document.getElementById('chXLo').disabled));
    t.ok('at x = −2, y moves the other way, 108 times as fast', /y moves 108 times as fast as x, the other way\./.test(await read(t)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-chain .wsCell button, #chPairs button, #chRules button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each pair button reads both links', await t.ev(() =>
      [...document.querySelectorAll('#chPairs button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(u) = u² and g(x) = 3x − 1 | f(u) = u³ and g(x) = x² − 1 | f(u) = u² − 2u and g(x) = x²');
    t.eq('each rule button reads its formula', await t.ev(() =>
      [...document.querySelectorAll('#chRules button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'The chain rule: f′(g(x)) × g′(x) | The slip: f′(x) × g′(x)');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the chain rule workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
