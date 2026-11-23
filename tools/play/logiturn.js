/* Growing or shrinking? The logistic workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four populations, each with its own r,
 * ceiling K and size P, are shown as numbers and the rule stated first;
 * each is called growing, holding or shrinking, and the check stays shut
 * until all four are called; a check with a slip rings just that pane and
 * works rP(1 − P/K) through; fixing it and checking again draws every rate
 * curve with P dotted on it; first checks are counted and the goals found
 * with toasts and a banner. Every button is named, stepping by hand steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lgtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#lgtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#lgwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('lgtCheck').click());
const next = t => t.ev(() => document.getElementById('lgtNext').click());
// tap the named button for each population, the way a player would: G grows, H holds, S shrinks
const NAME = { G: 'P grows', H: 'P holds', S: 'P shrinks' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#lgtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['lgwSets', 'lgwFig', 'lgwMoveRow', 'lgwRead', 'lgwGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['GSHH', 'SGHG', 'HGSH', 'SGHS'];

module.exports = {
  name: 'logiturn',
  title: 'Growing or shrinking? · call each population growing, holding or shrinking',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each population can be called', await t.ev(() =>
      /Or call it: see four populations, each with its own ceiling, and say whether each is growing, holding or shrinking\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLogiGrow');
    t.eq('the logistic workshop opens', await t.screen(), 's-logistic');
    await t.tapText(/Growing or shrinking\?/);
    t.eq('growing or shrinking is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('lgqBox').innerText)).startsWith('Round 1 of 6: four populations, each with its own r, ceiling K and size P. Is each one growing, holding or shrinking right now?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('A population with a ceiling changes at dP/dt = rP(1 − P/K).'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with r, K and P', await t.ev(() =>
      [...document.querySelectorAll('#lgtFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#lgtFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#lgtFig [data-k="P"]')].map(x => x.textContent).join(' | ')),
      'ABCD r = 0.5, K = 1000 | r = 0.2, K = 800 | r = 1, K = 500 | r = 0.3, K = 1200 P = 600 | P = 900 | P = 500 | P = 0');
    t.ok('no rate curve gives the answer away', await t.ev(() => !document.querySelector('#lgtFig [data-k="rate"], #lgtFig [data-k="dot"], #lgtFig [data-k="grow"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('lgtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four populations to check them'; }));

    // --- a slip: B called growing ---
    await callAs(t, 'GGHH');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#lgtStops button[aria-label="B: P grows"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('lgtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, r = 0.2, K = 800 and P = 900: dP/dt = rP(1 − P/K) = 0.2 × 900 × (1 − 900/800) = 0.2 × 900 × (−1/8) = −22.5, below 0, so P shrinks. You had it as growing.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#lgtFig [data-k="miss"]').length), 1);
    t.ok('no curve is given away', await t.ev(() => !document.querySelector('#lgtFig [data-k="rate"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.S');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#lgtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, P = 900 is above its own ceiling K = 800, so 1 − P/K = −1/8 is below 0 and P shrinks back toward K. In C, P = K = 500: there is no room left, 1 − P/K = 0, so P holds at its ceiling. In D, P = 0: with no one to breed, rP = 0, so P holds at 0 however much room there is. Each dP/dt: A 120, B −22.5, C 0, D 0.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each rate is drawn with its dot and its mark', await t.ev(() => document.querySelectorAll('#lgtFig [data-k="rate"]').length + ' ' + document.querySelectorAll('#lgtFig [data-k="dot"]').length + ' ' +
      [...document.querySelectorAll('#lgtFig [data-k="grow"], #lgtFig [data-k="hold"], #lgtFig [data-k="shrink"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 grow ▲ grows,shrink ▼ shrinks,hold = holds,hold = holds');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#lgtStops button')].every(b => b.disabled)));
    t.eq('a fix, one over its ceiling, one on it and one at 0 are found', await found(t), ['cap', 'fix', 'over', 'zero']);
    t.ok('with a toast', /✓ Over the ceiling, down it comes · No room left · Nothing to breed from · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('lgqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('lgtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a bigger ceiling than its neighbour is explained', /In C, P = 1000 is above its own ceiling K = 900, so 1 − P\/K = −1\/9 is below 0 and P shrinks back toward K\./.test(r), r);
      if (i === 3) t.ok('half again over the ceiling is explained', /In A, P = 1500 is above its own ceiling K = 1000, so 1 − P\/K = −1\/2 is below 0/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cap', 'fix', 'one', 'over', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'CEILING READER / every population called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lgwTab button, #lgtStops button, #lgtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four populations: A, r = 1, K = 800, P = 200; B/.test(await t.ev(() => document.querySelector('#lgtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('lgtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { LogiGrow.tab = 'hand'; UI.go('s-title'); });
  }
};
