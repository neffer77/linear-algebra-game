/* More or less? The slope workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves, each with a secant from a to
 * a + h, are shown and the rule stated first; each secant's slope is called
 * more than f′(a), equal to it or less, and the check stays shut until all
 * four are called; a check with a slip rings just that pane and works the
 * secant's slope and f′(a) through; fixing it and checking again draws every
 * secant and tangent; first checks are counted and the goals found with
 * toasts and a banner. Every button is named, closing in by hand steps aside
 * and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('sttRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#sttGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#slTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('sttCheck').click());
const next = t => t.ev(() => document.getElementById('sttNext').click());
// tap the named button for each secant, the way a player would: M more, E equal, L less
const NAME = { M: 'the secant’s slope is more than f′(a)', E: 'the secant’s slope equals f′(a)', L: 'the secant’s slope is less than f′(a)' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#sttStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['slCurves', 'slFig', 'slStep', 'slSide', 'slRead', 'slGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['MLEL', 'MMEL', 'LMME', 'EMLL'];

module.exports = {
  name: 'secturn',
  title: 'More or less? · call each secant’s slope more than f′(a), equal to it or less',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each secant can be called', await t.ev(() =>
      /Or call it: see four secants, and say whether each slope is more than f′\(a\), equal to it, or less\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSlope');
    t.eq('the slope workshop opens', await t.screen(), 's-slope');
    await t.tapText(/More or less\?/);
    t.eq('more or less is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('closing in by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('sqBox').innerText)).startsWith('Round 1 of 6: four curves, each with a secant from x = a to x = a + h. Is the secant’s slope more than the tangent’s slope f′(a), equal to it, or less?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('A secant from x = a to x = a + h has slope (f(a + h) − f(a)) ÷ h, and the tangent at a has slope f′(a). Where a curve bends up, like x², it climbs faster to the right'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their curves, a and h', await t.ev(() =>
      [...document.querySelectorAll('#sttFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#sttFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#sttFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#sttFig [data-k="adot"]').length + ' ' + document.querySelectorAll('#sttFig [data-k="bdot"]').length),
      'ABCD f(x) = x² | f(x) = 4 − x² | f(x) = 2x + 1 | f(x) = x² a = 1, h = 1 | a = 0, h = 1 | a = 2, h = −1 | a = −1, h = −1 4 4');
    t.ok('no line gives the answer away', await t.ev(() => !document.querySelector('#sttFig [data-k="sec"], #sttFig [data-k="tan"], #sttFig [data-k="more"], #sttFig [data-k="less"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('sttCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: D's step to the left called as if it went right ---
    await callAs(t, 'MLEM');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#sttStops button[aria-label="D: the secant’s slope is more than f′(a)"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('sttCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In D, f(x) = x², and the secant runs from x = −1 to x = −2. Its slope is (f(−2) − f(−1)) ÷ (−1) = (4 − 1) ÷ (−1) = −3, and f′(x) = 2x gives f′(−1) = −2: the secant’s slope is less than f′(a). You had it as more than f′(a).'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#sttFig [data-k="miss"]').length), 1);
    t.ok('no line is given away', await t.ev(() => !document.querySelector('#sttFig [data-k="sec"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '...L');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#sttFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, the step goes left, from x = −1 back to −2, which flips the call: the curve bends up there, and the secant’s slope, −3, is less than f′(−1) = −2. In C, f(x) = 2x + 1 is a straight line, so every secant lies along it: its slope is 2, the same as f′(2). In B, the curve bends down at x = 0, so f′ falls as x grows: f′(0) = 0 against a secant slope of −1. Each secant against f′(a): A 3 against 2, B −1 against 0, C 2 against 2, D −3 against −2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each secant and tangent is drawn, with each pane marked', await t.ev(() => document.querySelectorAll('#sttFig [data-k="sec"]').length + ' ' + document.querySelectorAll('#sttFig [data-k="tan"]').length + ' ' +
      [...document.querySelectorAll('#sttFig [data-k="more"], #sttFig [data-k="equal"], #sttFig [data-k="less"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 more ▲ more,less ▼ less,equal = equal,less ▼ less');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#sttStops button')].every(b => b.disabled)));
    t.eq('a step to the left, a straight line, a curve bending down and a fix are found', await found(t), ['down', 'fix', 'left', 'line']);
    t.ok('with a toast', /✓ Stepping left flips it · On a line, secant is tangent · Bending down · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('sqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('sttCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a step left on a curve bending down is called more', /In B, the step goes left, from x = 1 back to 0, which flips the call: the curve bends down there, and the secant’s slope, −1, is more than f′\(1\) = −2\./.test(r), r);
      if (i === 3) t.ok('a curve bending down stepped right falls short', /In C, the curve bends down at x = 2, so f′ falls as x grows: f′\(2\) = −4 against a secant slope of −5\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['down', 'fix', 'left', 'line', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SECANT JUDGE / every secant called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#slTab button, #sttStops button, #sttCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each with a secant from a to a \+ h: A, f\(x\) = x², a = 2, h = −1; B, f\(x\) = x³ − 3x, a = 1, h = −1; C/.test(await t.ev(() => document.querySelector('#sttFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('closing in by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('sttStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Slope.tab = 'hand'; UI.go('s-title'); });
  }
};
