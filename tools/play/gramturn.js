/* Too low or too high? The Gram–Schmidt workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four pairs of arrows are drawn, each with a
 * number c of copies of u₁ to take away, and the rule stated first; each c is
 * called too low, just right or too high, and the check stays shut until all
 * four are called; a check with a slip rings just that pair and works
 * w · u₁ through; fixing it and checking again draws every c·u₁ and w; first
 * checks are counted and the goals found with toasts and a banner. Every
 * button is named, taking copies by hand steps aside and comes back, it fits
 * a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#gtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#gsTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('gtCheck').click());
const next = t => t.ev(() => document.getElementById('gtNext').click());
// tap the named button for each pair, the way a player would: L too low, R just right, H too high
const NAME = { L: 'c is too low', R: 'c is just right', H: 'c is too high' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#gtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['gsSets', 'gsFig', 'gsStep', 'gsRead', 'gsGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RLHH', 'RLLR', 'HRLH', 'RLHR'];

module.exports = {
  name: 'gramturn',
  title: 'Too low or too high? · call each c in the Gram–Schmidt workshop',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Laudine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each c can be called', await t.ev(() =>
      /Or call it: see four pairs of arrows, each with a c, and say whether each c is too low, just right or too high\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeGram');
    t.eq('the Gram–Schmidt workshop opens', await t.screen(), 's-gram');
    await t.tapText(/Too low or too high\?/);
    t.eq('too low or too high is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('taking copies by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('gpBox').innerText)).startsWith('Round 1 of 6: four pairs of arrows, each with a number c of copies of u₁ to take away from u₂. Is each c too low, just right, or too high to leave w at a right angle to u₁?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Take c copies of u₁ away from u₂, and what is left is w = u₂ − c·u₁, with w · u₁ = u₂ · u₁ − c × (u₁ · u₁).'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four pairs are drawn, lettered and given their c', await t.ev(() => document.querySelectorAll('#gtFig [data-k="u1"]').length + ' ' +
      [...document.querySelectorAll('#gtFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#gtFig [data-k="c"]')].map(x => x.textContent).join(' | ')), '4 ABCD c = 2 | c = 2 | c = 1 | c = 2');
    t.ok('no w gives the answer away', await t.ev(() => !document.querySelector('#gtFig [data-k="w"], #gtFig [data-k="cu"], #gtFig [data-k="low"], #gtFig [data-k="right"], #gtFig [data-k="high"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('gtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four pairs to check them'; }));

    // --- a slip: B called just right ---
    await callAs(t, 'RRHH');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#gtStops button[aria-label="B: c is just right"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('gtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, u₂ · u₁ = 3 × 1 + 2 × 0 = 3 and u₁ · u₁ = 1, so w · u₁ = 3 − 2 × 1 = 1: more than 0, so w still leans along u₁ and c is too low. You had it as just right.'), r);
    t.eq('only that pair is ringed', await t.ev(() => document.querySelectorAll('#gtFig [data-k="miss"]').length), 1);
    t.ok('no w is given away', await t.ev(() => !document.querySelector('#gtFig [data-k="w"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.L');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#gtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, c = 2 is smaller than u₂ · u₁ = 6, yet it is too high: each copy takes away u₁ · u₁ = 4, not 1. In C, u₂ · u₁ = 0: u₂ casts no shadow on u₁, so the right c is 0. The right c, (u₂ · u₁)/(u₁ · u₁), for each: A 2, B 3, C 0, D 3/2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pair gets its c·u₁, its w and its mark', await t.ev(() => document.querySelectorAll('#gtFig [data-k="cu"]').length + ' ' + document.querySelectorAll('#gtFig [data-k="w"]').length + ' ' +
      [...document.querySelectorAll('#gtFig [data-k="low"], #gtFig [data-k="right"], #gtFig [data-k="high"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 right w · u₁ = 0,low w · u₁ = 1,high w · u₁ = −2,high w · u₁ = −2');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#gtStops button')].every(b => b.disabled)));
    t.eq('a fix, a costly copy and no shadow are found', await found(t), ['cost', 'fix', 'zero']);
    t.ok('with a toast', /✓ Each copy costs u₁ · u₁ · No shadow at all · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('gpBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('gtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a shadow that points back is explained', /In D, u₂ · u₁ = −5 is below 0: u₂’s shadow points back along u₁, so the right c, −1, is below 0 too\./.test(r), r);
      if (i === 3) t.ok('a pair already square is explained', /In A, u₂ · u₁ = 0: u₂ casts no shadow on u₁, so the right c is 0\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['back', 'cost', 'fix', 'one', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'SHADOW TAKER / every c called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gsTab button, #gtStops button, #gtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of arrows: A, u₁ = ⟨2, −1⟩, u₂ = ⟨1, 2⟩, c = −1; B/.test(await t.ev(() => document.querySelector('#gtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Take copies by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('taking copies by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('gtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Gram.tab = 'hand'; UI.go('s-title'); });
  }
};
