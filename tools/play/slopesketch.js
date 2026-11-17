/* Sketch f′, the slope tracer's third mode.
 *
 * These checks open the slope tracer from the Tome, switch to the mode, and
 * play it through its buttons: f is drawn with the rule stated first, five
 * stops each get a slope set with + and −, and the check stays shut until all
 * five are set; picking a stop moves its tangent; a check with a slip marks
 * just that stop and says what its tangent does; fixing it and checking again
 * draws the true f′; first checks are counted and the goals found with toasts
 * and a banner. Every button is named, tracing steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ssRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ssGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tcMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const shown = t => t.ev(() => [...document.querySelectorAll('.ssStop b[data-k="val"]')].map(b => b.textContent).join(' '));
const check = t => t.ev(() => document.getElementById('ssCheck').click());
const next = t => t.ev(() => document.getElementById('ssNext').click());
// press + or − on stop i until it shows v, the way a player would
const setTo = (t, i, v) => t.ev(([i, v]) => {
  for (let k = 0; k < 12; k++) {
    const cur = SlopeSketch.vals[i];
    if (cur === v) return true;
    const up = cur === null ? v >= 0 : v > cur;
    document.querySelectorAll('.ssStop')[i].querySelectorAll('button')[up ? 1 : 2].click();
  }
  return false;
}, [i, v]);
const sketch = async (t, vs) => { for (let i = 0; i < 5; i++) await setTo(t, i, vs[i]); };
const AWAY = ['tcSets', 'tcFig', 'tcStep', 'tcRead', 'tcGoalPanel'];
// the slopes at x = −2, −1, 0, 1, 2 for each curve, in the order they come round
const ANS = [[-2, -1, 0, 1, 2], [1, 1, 1, 1, 1], [3, 0, -1, 0, 3], [2, 1, 0, -1, -2], [4, 1, 0, 1, 4]];

module.exports = {
  name: 'slopesketch',
  title: 'Sketch f′ · set the slope at five stops and draw the derivative',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says f′ can be sketched by hand', await t.ev(() =>
      /or sketch f′ yourself, one slope at a time\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTracer');
    t.eq('the slope tracer opens', await t.screen(), 's-tracer');
    await t.tapText(/Sketch f′/);
    t.eq('sketch f′ is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the tracer itself steps aside', away);

    // --- the first curve, before anything is set ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('tcMatch').innerText)).startsWith('Curve 1 of 8: f(x) = x²/2. Set the slope at each stop and draw f′.'));
    let r = await read(t);
    t.ok('the rule comes before anything is set', r.startsWith('f′ at a stop is the slope of f’s tangent there: how far it climbs for each 1 step right.'), r);
    t.ok('the middle stop is picked to start', /Stop x = 0 is picked: its tangent is drawn in green\./.test(r), r);
    t.eq('five stops, none set', await shown(t), '? ? ? ? ?');
    t.ok('the check is shut until all five are set', await t.ev(() => { const b = document.getElementById('ssCheck'); return b.disabled && b.getAttribute('aria-label') === 'Set all five slopes to check them'; }));
    t.eq('a tangent is drawn', await t.ev(() => document.querySelectorAll('#ssFig [data-k="tan"]').length), 1);
    const flat = await t.ev(() => { const l = document.querySelector('#ssFig [data-k="tan"]'); return l.getAttribute('y1') === l.getAttribute('y2'); });
    t.ok('at x = 0 the tangent of x²/2 lies flat', flat);

    // --- picking a stop moves the tangent ---
    await t.ev(() => document.querySelectorAll('.ssStop')[3].querySelector('button').click());
    t.ok('picking x = 1 says so', /Stop x = 1 is picked/.test(await read(t)));
    t.ok('and its tangent now climbs', await t.ev(() => { const l = document.querySelector('#ssFig [data-k="tan"]'); return +l.getAttribute('y2') < +l.getAttribute('y1'); }));
    t.eq('nothing is found for looking', await found(t), []);

    // --- a sketch with a slip ---
    await sketch(t, [-2, -1, 0, 1, 3]);
    t.eq('the slopes show as set', await shown(t), '−2 −1 0 1 3');
    t.eq('five gold dots are drawn', await t.ev(() => document.querySelectorAll('#ssFig [data-k="dot"]').length), 5);
    t.ok('the check opens', await t.ev(() => !document.getElementById('ssCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and explained', r.startsWith('4 of 5 right. Fix the ones in red and check again. At x = 2, its tangent climbs 2 for each 1 across, so f′(2) = 2, not 3.'), r);
    t.eq('only that dot is ringed', await t.ev(() => document.querySelectorAll('#ssFig [data-k="miss"]').length), 1);
    t.ok('the true f′ is not given away', await t.ev(() => !document.querySelector('#ssFig [data-k="true"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await setTo(t, 4, 2);
    t.eq('changing the stop clears its ring', await t.ev(() => document.querySelectorAll('#ssFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the sketch is explained', r.startsWith('Yes: the slope of x²/2 is f′(x) = x, and the five dots lie on it. f′ crosses 0 at x = 0, where x²/2 turns: there its tangent lies flat.'), r);
    t.ok('a fix is not a first check', /0 sketched right on the first check this visit\.$/.test(r), r);
    t.eq('the true f′ is drawn through the dots', await t.ev(() => document.querySelectorAll('#ssFig [data-k="true"]').length), 1);
    t.ok('the slopes are shut', await t.ev(() => [...document.querySelectorAll('.ssStop button')].filter(b => /slope/.test(b.getAttribute('aria-label'))).every(b => b.disabled)));
    t.eq('a fix and a turn are found', await found(t), ['fix', 'turn']);
    t.ok('with a toast', /✓ f′ crosses 0 where f turns · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- four first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 4; i++) {
      await next(t);
      t.ok(`curve ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('tcMatch').innerText)).startsWith(`Curve ${i + 1} of 8:`) && await shown(t) === '? ? ? ? ?');
      await sketch(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ssCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a line is explained', /A straight line climbs the same at every step, so its slope graph is flat, at 1\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('x³/3 is explained as a flat spot, not a turn', r.startsWith('Yes: the slope of x³/3 is f′(x) = x², and the five dots lie on it. At x = 0 the slope is 0, yet x³/3 does not turn'), r);
    t.ok('the run is counted', /4 sketched right on the first check this visit, 4 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['bend', 'fix', 'line', 'one', 'three', 'turn']);
    t.eq('the last one found brings a banner', banners.join(), 'SLOPE SKETCHER / every f′ drawn by hand');

    // --- the ends of the scale ---
    await next(t);
    await setTo(t, 0, 4);
    t.ok('a slope stops at 4', await t.ev(() => document.querySelectorAll('.ssStop')[0].querySelectorAll('button')[1].disabled));
    t.ok('pressing past it does nothing', await t.ev(() => { SlopeSketch.set(0, 1); return SlopeSketch.vals[0] === 4; }));
    await setTo(t, 1, -4);
    t.ok('and at −4', await t.ev(() => { SlopeSketch.set(1, -1); return SlopeSketch.vals[1] === -4 && document.querySelectorAll('.ssStop')[1].querySelectorAll('button')[2].disabled; }));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tcMode button, .ssStop button, #ssCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^f\(x\) = 1 − x on a square grid, its tangent at x = −1 in green/.test(await t.ev(() => document.querySelector('#ssFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Trace the slopes/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('tracing comes back', back);
    t.ok('and the sketch is put away', await t.ev(() => !document.getElementById('ssStops')));
    t.ok('sketching changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Tracer.mode = 'trace'; UI.go('s-title'); });
  }
};
