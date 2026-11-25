/* Gain or lose? The two castles workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four pairs of castles are drawn as bars with
 * their shares riding out and in, and the rule stated first; each is called
 * as A gaining, holding or losing in one night, and the check stays shut
 * until all four are called; a check with a slip rings just that pair and
 * works both flows; fixing it and checking again outlines every next night;
 * first checks are counted and the goals found with toasts and a banner.
 * Every button is named, running the nights by hand steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cstRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cstGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#csTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('cstCheck').click());
const next = t => t.ev(() => document.getElementById('cstNext').click());
// tap the named button for each pair, the way a player would: G A gains, H A holds, L A loses
const NAME = { G: 'gains knights', H: 'holds steady', L: 'loses knights' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#cstStops button[aria-label="${'ABCD'[i]}: Castle A ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['csRules', 'csFig', 'csStep', 'csRead', 'csGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['GHLL', 'HLGG', 'LGGL', 'GLHG'];

module.exports = {
  name: 'castleturn',
  title: 'Gain or lose? · call which way each castle moves in one night',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each night can be called', await t.ev(() =>
      /Or call it: see four pairs of castles, and say whether A gains, holds or loses in one night\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCastles');
    t.eq('the two castles workshop opens', await t.screen(), 's-castles');
    await t.tapText(/Gain or lose\?/);
    t.eq('gain or lose is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('running the nights by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('kpBox').innerText)).startsWith('Round 1 of 6: four pairs of castles, a hundred knights in each pair. After one night, does Castle A gain knights, hold steady, or lose them?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Each night some of A’s knights ride out to B and some of B’s ride in to A. Work both:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four pairs of castles are drawn and lettered', await t.ev(() => document.querySelectorAll('#cstFig [data-k="barA"]').length + ' ' +
      [...document.querySelectorAll('#cstFig text[font-size="14"]')].map(x => x.textContent).join('')), '4 ABCD');
    t.ok('no next night gives the answer away', await t.ev(() => !document.querySelector('#cstFig [data-k="nextA"], #cstFig [data-k="gain"], #cstFig [data-k="hold"], #cstFig [data-k="lose"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('cstCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four castles to check them'; }));

    // --- a slip: B called gaining ---
    await callAs(t, 'GGLL');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#cstStops button[aria-label="B: Castle A gains knights"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('cstCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, 20% of A’s 50 knights ride out, 10, and 20% of B’s 50 ride in, 10: as many ride in as out, so A holds at 50. You had it as gaining.'), r);
    t.eq('only that pair is ringed', await t.ev(() => document.querySelectorAll('#cstFig [data-k="miss"]').length), 1);
    t.ok('no next night is given away', await t.ev(() => !document.querySelector('#cstFig [data-k="nextA"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.H');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#cstFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, 10 ride in and 10 ride out, so A holds at 50: that split is steady. In C, A has fewer knights than B, yet it loses: what counts is riders in against riders out, not which castle is bigger. After one night, A has: A 60, B 50, C 26, D 78.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pair gets its next night and its mark', await t.ev(() => document.querySelectorAll('#cstFig [data-k="nextA"]').length + ' ' +
      [...document.querySelectorAll('#cstFig [data-k="gain"], #cstFig [data-k="hold"], #cstFig [data-k="lose"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 gain A +10,hold A holds,lose A −14,lose A −2');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#cstStops button')].every(b => b.disabled)));
    t.eq('a fix, a steady split and a castle against its size are found', await found(t), ['fix', 'hold', 'more']);
    t.ok('with a toast', /✓ In matches out · Flows, not size · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: empty castles among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('kpBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('cstCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('an empty B is explained', /In B, B is empty, so no one rides in, and A can only lose\./.test(r), r);
      if (i === 3) t.ok('an empty A is explained', /In D, A is empty, so no one rides out, and A can only gain\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['empty', 'fix', 'hold', 'more', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'FAIR RIDER / every night called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#csTab button, #cstStops button, #cstCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of castles: A, A has 50 knights and B 50, 50% of A ride out and 50% of B ride in; B/.test(await t.ev(() => document.querySelector('#cstFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Run the nights by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('running the nights by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('cstStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Castles.tab = 'hand'; UI.go('s-title'); });
  }
};
