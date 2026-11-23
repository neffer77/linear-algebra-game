/* Over or under? The Taylor workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four functions, each cut off after a few
 * terms of its series and marked at one x, are shown and the rule stated
 * first; each P is called over the function, exact or under, and the check
 * stays shut until all four are called; a check with a slip rings just that
 * pane and works P, f and the first term left out through; fixing it and
 * checking again draws every polynomial; first checks are counted and the
 * goals found with toasts and a banner. Every button is named, building by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tytRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tytGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tyTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tytCheck').click());
const next = t => t.ev(() => document.getElementById('tytNext').click());
// tap the named button for each P, the way a player would: O over, E exact, U under
const NAME = { O: 'P is over f', E: 'P is exactly f', U: 'P is under f' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tytStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['tyCurves', 'tyFig', 'tyStep', 'tyRead', 'tyGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['UOOE', 'EUOO', 'OUOU', 'UOEO'];

module.exports = {
  name: 'taylorturn',
  title: 'Over or under? · call each cut-off series over the function, exact or under',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each guess can be called', await t.ev(() =>
      /Or call it: see four functions cut off after a few terms, and say whether each P is over the function, exact or under\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTaylor');
    t.eq('the Taylor workshop opens', await t.screen(), 's-taylor');
    await t.tapText(/Over or under\?/);
    t.eq('over or under is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('building by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('srBox').innerText)).startsWith('Round 1 of 6: four functions, each cut off after a few terms of its series and read at one x. Is each P over the function there, exactly on it, or under it?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('f(x) is P(x) plus every term left out, and here the first term left out outweighs all the rest.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their polynomials and x', await t.ev(() =>
      [...document.querySelectorAll('#tytFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#tytFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#tytFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#tytFig [data-k="fdot"]').length),
      'ABCD P = 1 + x + x²/2! | P = 1 + x + x²/2! | P = x | P = 1 eˣ at x = 1 | eˣ at x = −1 | sin x at x = 1 | cos x at x = 0 4');
    t.ok('no polynomial gives the answer away', await t.ev(() => !document.querySelector('#tytFig [data-k="poly"], #tytFig [data-k="pdot"], #tytFig [data-k="over"], #tytFig [data-k="under"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('tytCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B called under ---
    await callAs(t, 'UUOE');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tytStops button[aria-label="B: P is under f"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tytCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, P = 1 + x + x²/2! at x = −1 is 1 + (−1) + 0.5 = 0.5, and eˣ there is ≈ 0.3679. The first term left out, x³/3! ≈ −0.1667, is below 0, so P is over by ≈ 0.1321. You had it as under.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#tytFig [data-k="miss"]').length), 1);
    t.ok('no polynomial is given away', await t.ev(() => !document.querySelector('#tytFig [data-k="poly"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.O');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#tytFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, x is negative, so the terms of eˣ take turns in sign: P stops before x³/3!, which is below 0 there, so P comes out over. In C, sin x has no x² term, so the first term left out of P = x is −x³/3!, two powers on. In D, x = 0: every power of x is 0 there, so P is exactly cos x, 1. Each P, then f: A 2.5 < 2.7183, B 0.5 > 0.3679, C 1 > 0.8415, D 1 = 1.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each polynomial is drawn, with each pane marked', await t.ev(() => document.querySelectorAll('#tytFig [data-k="poly"]').length + ' ' +
      [...document.querySelectorAll('#tytFig [data-k="over"], #tytFig [data-k="exact"], #tytFig [data-k="under"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 under ▼ under,over ▲ over,over ▲ over,exact = exact');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#tytStops button')].every(b => b.disabled)));
    t.eq('a fix, eˣ at a negative x, a missing power and x = 0 are found', await found(t), ['fix', 'neg', 'skip', 'zero']);
    t.ok('with a toast', /✓ Signs that take turns · Skip the missing power · Exact at the centre · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('srBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tytCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a constant P with no x term is explained', /In A, cos x has no x term, so the first term left out of P = 1 is −x²\/2!, two powers on\./.test(r), r);
      if (i === 3) t.ok('a skip two powers on is explained', /In D, cos x has no x⁵ term, so the first term left out of P = 1 − x²\/2! \+ x⁴\/4! is −x⁶\/6!, two powers on\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'neg', 'one', 'skip', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'CUTOFF READER / every guess called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tyTab button, #tytStops button, #tytCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four functions, each cut off after a few terms: A, eˣ up to x⁴, at x = −2; B, sin x up to x⁴, at x = 1; C, cos x up to x, at x = −1\.5; D/.test(await t.ev(() => document.querySelector('#tytFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('building by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('tytStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Taylor.tab = 'hand'; UI.go('s-title'); });
  }
};
