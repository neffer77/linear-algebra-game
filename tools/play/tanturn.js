/* Too high or too low? The tangent line workshop's third mode.
 *
 * These checks open the tangent line workshop from the Tome, switch to the
 * mode, and play it through its buttons: four curves are drawn with a and x
 * marked and the rule stated first, each tangent estimate is called too high,
 * exact or too low, and the check stays shut until all four are called; a
 * check with a slip rings just that curve and works its L(x), f(x) and f″;
 * fixing it and checking again draws each tangent and its gap at x; first
 * checks are counted and the goals found with toasts and a banner. Every
 * button is named, stepping by hand steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tltRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tltGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tlwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tltCheck').click());
const next = t => t.ev(() => document.getElementById('tltNext').click());
// tap the named button for each estimate, the way a player would: H too high, E exact, L too low
const NAME = { H: 'too high', E: 'exact', L: 'too low' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tltStops button[aria-label="Estimate ${'ABCD'[i]}: L is ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['tlwSets', 'tlwFig', 'tlwMoveRow', 'tlwRead', 'tlwGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['HLEH', 'HLLH', 'HLHE', 'LHLH'];

module.exports = {
  name: 'tanturn',
  title: 'Too high or too low? · call each tangent line estimate too high, too low, or exact',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the estimate can be called too high or too low', await t.ev(() =>
      /Or call it high or low: see four curves, each estimated by its tangent at a, and say whether each L\(x\) is too high, too low or exact\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTanLine');
    t.eq('the tangent line workshop opens', await t.screen(), 's-tanline');
    await t.tapText(/Too high or too low\?/);
    t.eq('too high or too low is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('tlqBox').innerText)).startsWith('Round 1 of 6: four curves, each estimated at x by its tangent line at a. Is each L(x) too high, too low, or exact?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The tangent at a is straight. Where the curve bends up, f″ > 0,'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four curves are drawn and lettered', await t.ev(() => document.querySelectorAll('#tltFig [data-k="curve"]').length + ' ' +
      [...document.querySelectorAll('#tltFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 ABCD');
    t.ok('no tangent gives the answer away', await t.ev(() => !document.querySelector('#tltFig [data-k="tangent"], #tltFig [data-k="gap"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('tltCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four estimates to check them'; }));

    // --- a slip: B called too high ---
    await callAs(t, 'HHEH');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tltStops button[aria-label="Estimate B: L is too high"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tltCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = 1/x near a = 1: L(x) = 1 − (x − 1), so L(1.2) = 0.8, while 1/1.2 = 0.833. L is too low by 0.033: between 1 and 1.2, f″(x) = 2/x³ is more than 0, so the curve bends up, above its tangent. You had it as too high.'), r);
    t.eq('only that curve is ringed', await t.ev(() => document.querySelectorAll('#tltFig [data-k="miss"]').length), 1);
    t.ok('the tangents are not given away', await t.ev(() => !document.querySelector('#tltFig [data-k="tangent"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.L');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#tltFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. C is the line f(x) = 3x − 2, its own tangent, so L is exact. L against f: A too high by 0.004, B too low by 0.033, C exact, D too high by 0.021.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each curve gets its tangent, and each that is not exact its gap', await t.ev(() => document.querySelectorAll('#tltFig [data-k="tangent"]').length + ' ' + document.querySelectorAll('#tltFig [data-k="gap"]').length + ' ' +
      [...document.querySelectorAll('#tltFig [data-k="high"], #tltFig [data-k="low"], #tltFig [data-k="exact"]')].map(c => c.dataset.k).join()), '4 3 high,low,exact,high');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#tltStops button')].every(b => b.disabled)));
    t.eq('a fix and a line are found', await found(t), ['fix', 'line']);
    t.ok('with a toast', /✓ Straight on straight · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: one curve on both sides of a change of bend among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('tlqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tltCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) {
        r = await read(t);
        t.ok('one curve on both sides of a change of bend is explained', /C and D are both f\(x\) = sin x near 0, on either side: it bends down to the right of 0 and up to the left, so the tangent is too high on one side and too low on the other\./.test(r), r);
        t.ok('a left side that does not flip it is explained', /In A, x = 3 is left of a = 4, but √x bends down on both sides, so the tangent is still too high: the side does not flip it\./.test(r), r);
      }
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'left', 'line', 'one', 'sides', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TRUE TOUCH / every tangent called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tlwTab button, #tltStops button, #tltCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four tangent line estimates: A, f\(x\) = eˣ near 0, estimated at −0\.5; B/.test(await t.ev(() => document.querySelector('#tltFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step x by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('tltStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { TanLine.tab = 'hand'; UI.go('s-title'); });
  }
};
