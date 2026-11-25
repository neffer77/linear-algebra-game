/* High or low? The area workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves, each with dots where its
 * rectangles take their heights, are shown and the rule stated first; each
 * sum is called over the area, exact or under, and the check stays shut
 * until all four are called; a check with a slip rings just that pane and
 * works the sum and the area through; fixing it and checking again draws
 * every rectangle; first checks are counted and the goals found with toasts
 * and a banner. Every button is named, closing in steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('artRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#artGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#arMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('artCheck').click());
const next = t => t.ev(() => document.getElementById('artNext').click());
// tap the named button for each sum, the way a player would: O over, E exact, U under
const NAME = { O: 'the sum is over the area', E: 'the sum is exactly the area', U: 'the sum is under the area' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#artStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['arCurves', 'arFig', 'arNs', 'arRules', 'arRead', 'arGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['UOEU', 'UOUO', 'EUUO', 'OUOE'];

module.exports = {
  name: 'areaturn',
  title: 'High or low? · call each rectangle sum over the area, exact or under',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each sum can be called', await t.ev(() =>
      /Or call it: see four curves cut into rectangles, and say whether each sum is over the area, exact or under\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeArea');
    t.eq('the area workshop opens', await t.screen(), 's-area');
    await t.tapText(/High or low\?/);
    t.eq('high or low is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('closing in steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('arPick').innerText)).startsWith('Round 1 of 6: four curves, each cut into rectangles at their left or right edges. Is each sum over the area, exactly it, or under it?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Each rectangle is as tall as the curve at one edge of its strip.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their curves and edges', await t.ev(() =>
      [...document.querySelectorAll('#artFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#artFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#artFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#artFig [data-k="edge"]').length),
      'ABCD x² on [0, 2] | 6 − 2x on [0, 3] | 3 on [0, 2] | −x² on [0, 2] 2 × left edge | 3 × left edge | 2 × right edge | 2 × right edge 9');
    t.ok('no rectangle gives the answer away', await t.ev(() => !document.querySelector('#artFig [data-k="bar"], #artFig [data-k="over"], #artFig [data-k="under"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('artCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four sums to check them'; }));

    // --- a slip: B called under ---
    await callAs(t, 'UUEU');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#artStops button[aria-label="B: the sum is under the area"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('artCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = 6 − 2x falls from x = 0 to 3, and its 3 rectangles take their heights at their left edges, the high end of each strip: Δx × (f(0) + f(1) + f(2)) = 1 × (6 + 4 + 2) = 12, over the area 9. You had it as under.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#artFig [data-k="miss"]').length), 1);
    t.ok('no rectangle is given away', await t.ev(() => !document.querySelector('#artFig [data-k="bar"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.O');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#artFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, f falls, so each left edge is the high end of its strip and the left sum overshoots: 12 against 9. In C, f(x) = 3 is flat: every edge is the same height, so the sum is the area exactly, 6. In D, the curve is under the axis, so its area counts as −8/3, and the sum −5 is less than that: under, though its rectangles look bigger. Each sum, then the area: A 1 < 8/3, B 12 > 9, C 6 = 6, D −5 < −8/3.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each rectangle is drawn, with each pane marked', await t.ev(() => document.querySelectorAll('#artFig [data-k="bar"]').length + ' ' +
      [...document.querySelectorAll('#artFig [data-k="over"], #artFig [data-k="exact"], #artFig [data-k="under"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '9 under ▼ under,over ▲ over,exact = exact,under ▼ under');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#artStops button')].every(b => b.disabled)));
    t.eq('a fix, a left sum on a falling curve, a flat line and a curve under the axis are found', await found(t), ['below', 'fall', 'fix', 'flat']);
    t.ok('with a toast', /✓ Left edges, high edges · A perfect fit · Over means less negative · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('arPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('artCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a flat line is explained', /In A, f\(x\) = 3 is flat: every edge is the same height, so the sum is the area exactly, 9\./.test(r), r);
      if (i === 3) t.ok('an overshoot under the axis is explained', /In A, the curve is under the axis, so its area counts as −9, and the sum −5 is more than that: over, though its rectangles look smaller\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['below', 'fall', 'fix', 'flat', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'STRIP READER / every sum called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#arMode button, #artStops button, #artCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each cut into rectangles: A, f\(x\) = 6 − 2x from 1 to 3, 2 rectangles at their right edges; B/.test(await t.ev(() => document.querySelector('#artFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Close in/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('closing in comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('artStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Area.mode = 'bars'; UI.go('s-title'); });
  }
};
