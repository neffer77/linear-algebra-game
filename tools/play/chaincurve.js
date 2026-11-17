/* Along a curve, the chain rule workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and step
 * t through its buttons: x = t² − 1, y = t³ − t opens at t = −2 with slope
 * 11 ÷ (−4) = −11/4; t = −1 lands on (0, 0) with slope −1 and says the curve
 * comes back there with slope 1; t = −1/2 runs x backwards yet climbs, which
 * is found; t = 0 has dx/dt = 0 and a tangent straight up, which is found;
 * t = 1 is (0, 0) again with slope 1, which finds the crossing; on
 * x = t³ − 3t, y = t² the tangent is flat at t = 0, which is found; and on
 * x = t³, y = t² both rates are 0 at t = 0, which finishes the hunt with a
 * banner. The stepper stops at its ends, the drawing moves its point, every
 * button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('twRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#twGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#twSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('twT').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#chMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const dot = t => t.ev(() => { const c = document.querySelector('#twFig circle[data-k="pt"]'); return [+c.getAttribute('cx'), +c.getAttribute('cy')]; });
const AWAY = ['chPairs', 'chFig', 'chRules', 'chXs', 'chRead', 'chGoalPanel'];

module.exports = {
  name: 'chaincurve',
  title: 'Along a curve · step t and read dy/dx as dy/dt over dx/dt',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the workshop can let x and y both move with t', await t.ev(() =>
      /Or let x and y both move with t: step along a curve and read its slope as dy\/dt over dx\/dt\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeChain');
    t.eq('the chain rule workshop opens', await t.screen(), 's-chain');
    t.eq('the two links is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Along a curve/);
    t.eq('along a curve is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the two links step aside', away);

    // --- x = t² − 1, y = t³ − t at t = −2 ---
    let r = await read(t);
    t.eq('it opens at t = −2', await shown(t), 't = −2');
    t.ok('it names the curve', /^x = t² − 1 and y = t³ − t both move with t, so the point \(x, y\) traces a curve as t runs\./.test(r), r);
    t.ok('it works the point and both rates', /At t = −2: x = 3 and y = −6, so the point is at \(3, −6\)\. dx\/dt = 2t, so at t = −2, dx\/dt = −4: x moves 4 times as fast as t, backwards\. dy\/dt = 3t² − 1, so at t = −2, dy\/dt = 11: y moves 11 times as fast as t\./.test(r), r);
    t.ok('and the slope as their ratio', /So dy\/dx = \(dy\/dt\) ÷ \(dx\/dt\) = 11 ÷ \(−4\) = −11\/4: the tangent falls 11\/4 for each 1 across\./.test(r), r);
    t.ok('checked with a nudge', /Check with a nudge: from t = −2 − 0\.001 to −2 \+ 0\.001, Δy\/Δx ≈ −2\.75, which agrees with −11\/4\./.test(r), r);
    t.eq('nothing is found before anything is pressed', await found(t), []);
    const first = await dot(t);

    // --- through (0, 0) once ---
    await press(t, 'twHi', 2);
    r = await read(t);
    t.eq('the stepper moves t by halves', await shown(t), 't = −1');
    t.ok('(0, 0) has slope −1 and the curve comes back', /the point is at \(0, 0\)/.test(r) && /= 2 ÷ \(−2\) = −1: the tangent falls 1 for each 1 across\./.test(r) && /The curve crosses itself here: at t = 1 it passes through \(0, 0\) as well, with slope 1\./.test(r), r);
    t.eq('one pass is not the crossing', await found(t), []);
    const moved = await dot(t);
    t.ok('the red dot moves along the curve', Math.hypot(moved[0] - first[0], moved[1] - first[1]) > 20, JSON.stringify([first, moved]));

    // --- backwards and still climbing ---
    await press(t, 'twHi');
    r = await read(t);
    t.ok('x runs backwards and the slope is still 1/4', /dx\/dt = −1: x moves as fast as t, backwards/.test(r) && /= \(−1\/4\) ÷ \(−1\) = 1\/4: the tangent rises 1\/4/.test(r), r);
    t.eq('that is found', await found(t), ['back']);
    t.ok('with a toast', /✓ Backwards and still climbing/.test(await toast(t)), await toast(t));

    // --- straight up ---
    await press(t, 'twHi');
    r = await read(t);
    t.ok('dx/dt = 0 gives no ratio and a tangent straight up', /dx\/dt = 0, so \(dy\/dt\) ÷ \(dx\/dt\) = \(−1\) ÷ 0 cannot be worked out: x stands still while y moves, so the tangent stands straight up\./.test(r), r);
    t.ok('and no nudge is offered', !/nudge/.test(r), r);
    t.eq('straight up is found', await found(t), ['back', 'up']);
    t.ok('the tangent is drawn upright', await t.ev(() => { const l = document.querySelector('#twFig line[data-k="tan"]'); return Math.abs(+l.getAttribute('x1') - +l.getAttribute('x2')) < 0.05; }));

    // --- through (0, 0) again ---
    await press(t, 'twHi', 2);
    r = await read(t);
    t.ok('(0, 0) again, now with slope 1', /At t = 1: x = 0 and y = 0/.test(r) && /= 2 ÷ 2 = 1: the tangent rises 1 for each 1 across\./.test(r) && /at t = −1 it passes through \(0, 0\) as well, with slope −1\./.test(r), r);
    t.eq('the crossing is found', await found(t), ['back', 'cross', 'up']);
    await press(t, 'twHi', 6);
    t.eq('the stepper stops at t = 2', await shown(t), 't = 2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('twHi').disabled));

    // --- x = t³ − 3t, y = t²: flat ---
    await pick(t, 1);
    t.eq('a new curve starts at t = −2', await shown(t), 't = −2');
    await press(t, 'twHi', 4);
    r = await read(t);
    t.ok('dy/dt = 0 makes the tangent flat', /So dy\/dx = \(dy\/dt\) ÷ \(dx\/dt\) = 0 ÷ \(−3\) = 0: y stands still as x moves, so the tangent is flat\./.test(r), r);
    t.eq('flat is found', await found(t), ['back', 'cross', 'flat', 'up']);

    // --- x = t³, y = t²: the dead stop ---
    await pick(t, 3);
    await press(t, 'twHi', 3);
    t.eq('nothing more is found on the way', await found(t), ['back', 'cross', 'flat', 'up']);
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      try { document.getElementById('twHi').click(); } finally { Celebrate.banner = real; }
      return seen;
    });
    r = await read(t);
    t.ok('both rates 0 give no slope at the sharp point', /Both rates are 0: the point stops dead for a moment, so \(dy\/dt\) ÷ \(dx\/dt\) is 0 ÷ 0 and gives no slope\. The curve comes to a sharp point here\./.test(r), r);
    t.ok('and no tangent is drawn there', await t.ev(() => !document.querySelector('#twFig line[data-k="tan"]')));
    t.eq('every goal can be found with the buttons', await found(t), ['back', 'cross', 'flat', 'stop', 'up']);
    t.eq('the last one found brings a banner', banners.join(), 'MASTER OF THE MOVING POINT / every tangent read');
    t.ok('the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('twGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#chMode button, #twSets button, #chPick .wsCell button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /^The curve x = t³, y = t² for t from −2 to 2, with the point at t = 0, \(0, 0\)$/.test(document.querySelector('#twFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Two links/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the two links come back', back);
    t.ok('and the curves are put away', await t.ev(() => !document.getElementById('twSets')));
    t.ok('along a curve changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Chain.mode = 'link'; UI.go('s-title'); });
  }
};
