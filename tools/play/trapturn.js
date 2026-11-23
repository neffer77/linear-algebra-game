/* Over or under? The trapezoid workshop's third mode.
 *
 * These checks open the trapezoid workshop from the Tome, switch to the
 * mode, and play it through its buttons: four curves are drawn cut into
 * strips with the rule stated first, each estimate is called over, exact or
 * under, and the check stays shut until all four are called; a check with a
 * slip rings just that curve and works its f″, T and area; fixing it and
 * checking again draws each curve's straight tops and slivers; first checks
 * are counted and the goals found with toasts and a banner. Every button is
 * named, cutting by hand steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tztRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tztGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tzwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tztCheck').click());
const next = t => t.ev(() => document.getElementById('tztNext').click());
// tap the named button for each curve, the way a player would: O over, E exact, U under
const NAME = { O: 'over the area', E: 'exact', U: 'under the area' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tztStops button[aria-label="Curve ${'ABCD'[i]}: T is ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['tzwSets', 'tzwFig', 'tzwMoveRow', 'tzwRead', 'tzwGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['OUEO', 'UUOE', 'OUOU', 'OOUE'];

module.exports = {
  name: 'trapturn',
  title: 'Over or under? · call each trapezoid estimate over the area, under it, or exact',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the estimate can be called over or under', await t.ev(() =>
      /Or call it over or under: see four curves cut into strips, and say whether each T is over the area, under it, or exact\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTrap');
    t.eq('the trapezoid workshop opens', await t.screen(), 's-trapezoid');
    await t.tapText(/Over or under\?/);
    t.eq('over or under is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('cutting by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('tzqBox').innerText)).startsWith('Round 1 of 6: four curves cut into strips. Is each trapezoid estimate T over the area, under it, or exact?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Each trapezoid\'s top is a straight line from one height to the next. Where the curve bends up, f″ > 0,'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four curves are drawn and lettered', await t.ev(() => document.querySelectorAll('#tztFig [data-k="curve"]').length + ' ' +
      [...document.querySelectorAll('#tztFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 ABCD');
    t.ok('no straight top gives the answer away', await t.ev(() => !document.querySelector('#tztFig [data-k="tops"], #tztFig [data-k="sliver"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('tztCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four estimates to check them'; }));

    // --- a slip: B called over ---
    await callAs(t, 'OOEO');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tztStops button[aria-label="Curve B: T is over the area"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tztCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = √x on [1, 4] with 2 strips: f″(x) = −1/(4x√x), which is less than 0 between 1 and 4, so the curve bends down and each straight top runs below it. T = 4.622 and the area is 4.667, so T is under by 0.045. You had it as over.'), r);
    t.eq('only that curve is ringed', await t.ev(() => document.querySelectorAll('#tztFig [data-k="miss"]').length), 1);
    t.ok('the tops are not given away', await t.ev(() => !document.querySelector('#tztFig [data-k="tops"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.U');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#tztFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, f(x) = 1/x falls, yet it bends up, so the trapezoids still overshoot: which way a curve bends settles it, not which way it goes. C is the straight line f(x) = 2x + 1, so each straight top lies right on it and T is the area exactly. T against the area: A over by 1.333, B under by 0.045, C exact, D over by 0.068.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each curve gets its tops, and each that is not exact its slivers', await t.ev(() => document.querySelectorAll('#tztFig [data-k="tops"]').length + ' ' + document.querySelectorAll('#tztFig [data-k="sliver"]').length + ' ' +
      [...document.querySelectorAll('#tztFig [data-k="over"], #tztFig [data-k="under"], #tztFig [data-k="exact"]')].map(c => c.dataset.k).join()), '4 3 over,under,exact,over');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#tztStops button')].every(b => b.disabled)));
    t.eq('a fix, a falling curve and a line are found', await found(t), ['falls', 'fix', 'line']);
    t.ok('with a toast', /✓ The bend decides, not the slope · Straight tops on a straight line · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: one curve cut two ways among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('tzqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tztCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('one curve cut two ways is explained', /A and B are both f\(x\) = 4 − x², cut into 1 and 4: more strips shrink the gap from 1\.333 to 0\.083, but T stays under\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['falls', 'fix', 'line', 'more', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SHARP EYE / every bend called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tzwTab button, #tztStops button, #tztCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves cut into strips: A, f\(x\) = 4\/\(x \+ 1\) on 0 to 3 with 3 strips; B/.test(await t.ev(() => document.querySelector('#tztFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Cut by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('cutting by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('tztStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Trap.tab = 'hand'; UI.go('s-title'); });
  }
};
