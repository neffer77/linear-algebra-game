/* The two castles workshop: run the nights and watch the split settle.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout states the rule, writes it as a matrix and says where the steady
 * split is; a night is worked as what A keeps and what it gains; seven nights
 * from 100 bring A within 1 of 75, and the gap is the start's gap times 0.6
 * to the seventh; starting at 75 nothing changes, and the readout names it the
 * eigenvector with λ = 1; closing in from 55 as well, from below, is found;
 * on Even one night is enough, on Swap the split flips back and forth, and 50
 * is the one start Swap leaves alone, which finishes the hunt. The figure
 * draws a point for each night and the steady line. The steppers stop at
 * their ends even pressed past them, and every button is named. It fits a
 * phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('csRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#csFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#csGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#csRules button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('csA').innerText + ' · ' + document.getElementById('csN').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const spec = t => t.ev(() => JSON.stringify({ f: window.__csSpec.f, n: window.__csSpec.pts.length,
  last: window.__csSpec.pts[window.__csSpec.pts.length - 1].slice(0, 2).map(v => Math.round(v * 100) / 100) }));

module.exports = {
  name: 'castles',
  title: 'Two castles workshop · the split a matrix leaves alone',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));
    // keep the last figure the workshop draws, so its points can be read
    await t.ev(() => { const r = Figure.render; Figure.render = function (s, el) { if (el && el.id === 'csFig') window.__csSpec = s; return r.apply(this, arguments); }; });

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the two castles workshop', await t.showing('tomeCastles'));
    await t.tap('tomeCastles');
    t.eq('and one tap opens it', await t.screen(), 's-castles');

    // --- it opens on Drift with all 100 knights in A ---
    let r = await read(t);
    t.ok('it states the rule for a night', /Each night 10% of the knights in Castle A ride to Castle B, and 30% of those in B ride to A\./.test(r), r);
    t.ok('and writes it as a matrix', /So a night is the matrix M with rows 0\.9, 0\.3 and 0\.1, 0\.7: the split ⟨A, B⟩ after a night is M times the split before it, and after n nights it is Mⁿ times the start\./.test(r), r);
    t.ok('it gives the start', /Night 0: A has 100 and B has 0\./.test(r), r);
    t.ok('and says where the steady split is', /The steady split has 75 in A\. Take a night to see what happens\./.test(r), r);
    t.eq('the steppers read the start and the nights', await shown(t), 'A starts with 100 · 0 nights');
    t.eq('the caption names the colours', await cap(t), 'Each point is how many knights are in Castle A after that many nights, the red one tonight\'s; the gold line is the steady split, 75.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#csFig canvas.fig')));
    t.eq('the figure draws the steady line and one point', await spec(t), '{"f":{"poly":[[75,0]]},"n":1,"last":[0,100]}');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('Drift is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#csRules button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- one night, worked out ---
    await press(t, 'csNHi');
    r = await read(t);
    t.ok('a night is worked as what A keeps and gains', /Night 1: A keeps 90% of 100 = 90 and gains 30% of 0 = 0, so A has 90 and B has 10\./.test(r), r);
    t.ok('and the gap shrinks by the other eigenvalue', /A's gap from it is \(100 − 75\) × 0\.6 = 15: each night the gap shrinks to 0\.6 of itself, the matrix's other eigenvalue\./.test(r), r);
    t.eq('the night count reads 1 night', await shown(t), 'A starts with 100 · 1 night');

    // --- seven nights bring A within 1 of 75 ---
    await press(t, 'csNHi', 6);
    r = await read(t);
    t.ok('the nights are listed', /A, night by night: 100, 90, 84, 80\.4, 78\.24, 76\.94, 76\.17, 75\.7 \(to two places\)\./.test(r), r);
    t.ok('the gap is the start\'s times 0.6 to the seventh', /\(100 − 75\) × 0\.6\^7 ≈ 0\.7: .* A is now within 1 of 75\./.test(r), r);
    t.ok('a rounded night says about', /A keeps 90% of about 76\.17 ≈ 68\.55 and gains 30% of about 23\.83 ≈ 7\.15, so A has about 75\.7 and B has about 24\.3\./.test(r), r);
    t.eq('closing in on the steady split is found', await found(t), ['close']);
    t.ok('its toast starts with a capital', /✓ Brought A within 1 of the steady split/.test(await toast(t)), await toast(t));
    t.eq('the figure draws a point for each night', await spec(t), '{"f":{"poly":[[75,0]]},"n":8,"last":[7,75.7]}');

    // --- starting at the steady split, nothing changes ---
    await press(t, 'csALo', 5);
    r = await read(t);
    t.ok('from 75 every night is 75', /A, night by night: 75, 75, 75, 75, 75, 75, 75, 75\./.test(r), r);
    t.ok('and the readout names the eigenvector', /A = 75 and B = 25 is the steady split: each night 7\.5 ride from A to B and 7\.5 ride back, so nothing changes\. ⟨75, 25⟩ is the eigenvector with λ = 1\./.test(r), r);
    t.eq('the steady split is found', await found(t), ['close', 'steady']);

    // --- closing in from below as well ---
    await press(t, 'csALo', 4);
    r = await read(t);
    t.ok('from 55 the gap is negative and shrinks', /\(55 − 75\) × 0\.6\^7 ≈ −0\.56: .* A is now within 1 of 75\./.test(r), r);
    t.eq('closing in from both sides is found', await found(t), ['both', 'close', 'steady']);

    // --- Even: one night is enough ---
    await pick(t, 1);
    t.eq('the start and the nights are kept', await shown(t), 'A starts with 55 · 7 nights');
    await press(t, 'csNLo', 6);
    r = await read(t);
    t.ok('Even is half each way', /Each night half the knights in each castle ride to the other\./.test(r), r);
    t.ok('its matrix has rows 0.5, 0.5', /rows 0\.5, 0\.5 and 0\.5, 0\.5/.test(r), r);
    t.ok('and one night reaches 50', /One night is enough: both castles end with 50, the steady split, and stay there\. The other eigenvalue is 0/.test(r), r);
    t.eq('one night to the steady split is found', await found(t), ['both', 'close', 'one', 'steady']);

    // --- Swap: the split flips ---
    await pick(t, 2);
    await press(t, 'csNHi');
    r = await read(t);
    t.ok('Swap sends everyone across', /A keeps 0% of 45 = 0 and gains 100% of 55 = 55, so A has 55 and B has 45\./.test(r), r);
    t.ok('the nights flip back and forth', /A, night by night: 55, 45, 55\./.test(r), r);
    t.ok('and the readout says why', /the gap from 50 is multiplied by −1 each night and never shrinks\. That −1 is the matrix's other eigenvalue\./.test(r), r);
    t.eq('the flip is found', await found(t), ['both', 'close', 'flip', 'one', 'steady']);
    await press(t, 'csALo');
    r = await read(t);
    t.ok('from 50 Swap changes nothing', /A = 50 and B = 50 is the steady split: each night 50 ride from A to B and 50 ride back, so nothing changes\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['both', 'close', 'flip', 'one', 'steady', 'still']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('csGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 'csAHi', 20);
    t.eq('the start stops at 100', await shown(t), 'A starts with 100 · 2 nights');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('csAHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Castles.moveA(1); return Castles.a0(); }), 100);
    await press(t, 'csNHi', 20);
    t.eq('the nights stop at 10', await shown(t), 'A starts with 100 · 10 nights');
    t.ok('and the night button is off there', await t.ev(() => document.getElementById('csNHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Castles.moveN(1); return Castles.n; }), 10);
    await press(t, 'csNLo', 20);
    t.eq('taking back nights stops at 0', await shown(t), 'A starts with 100 · 0 nights');
    t.ok('and the take-back button is off there', await t.ev(() => document.getElementById('csNLo').disabled));
    await press(t, 'csALo', 30);
    t.eq('the start stops at 0', await t.ev(() => Castles.a0()), 0);
    t.ok('and its button is off there', await t.ev(() => document.getElementById('csALo').disabled));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-castles .wsCell button, #csRules button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('each rule button reads its rule', /^Drift: Each night 10% of the knights in Castle A ride to Castle B/.test(await t.ev(() =>
      document.querySelectorAll('#csRules button')[0].getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the two castles workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
