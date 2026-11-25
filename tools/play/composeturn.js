/* Same or not? Order Matters' third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four pairs of matrices are shown and the
 * rule stated first; each pair is called same or different, and the check
 * stays shut until all four are called; a check with a slip rings just that
 * pane and works it through; fixing it and checking again marks every pane;
 * first checks are counted and the goals found with toasts and a banner.
 * Every button is named, the moves step aside and come back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cptRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cptGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#cmTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('cptCheck').click());
const next = t => t.ev(() => document.getElementById('cptNext').click());
// tap the named button for each pair, the way a player would: S the order makes no difference, D it matters
const NAME = { S: 'the order makes no difference', D: 'the order matters' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#cptStops button[aria-label="Pair ${i + 1}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['cmFirst', 'cmThen', 'cmFig', 'cmRead', 'cmGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['SDSD', 'SDDS', 'SDSD', 'SDDS'];

module.exports = {
  name: 'composeturn',
  title: 'Same or not? · call whether the order makes a difference to each pair of matrices',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each pair can be called', await t.ev(() =>
      /Or call four pairs: does the order make a difference to each\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCompose');
    t.eq('Order Matters opens', await t.screen(), 's-compose');
    await t.tapText(/Same or not\?/);
    t.eq('same or not is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the moves, the figure, the readout and the goals step aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('oqBox').innerText)).startsWith('Round 1 of 6: four pairs of matrices. For each pair, is AB the same as BA, or does the order make a difference?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('AB and BA are usually different, but not always. To tell, write three numbers for each matrix'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are numbered, with both squares drawn and both matrices written out', await t.ev(() =>
      [...document.querySelectorAll('#cptFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      document.querySelectorAll('#cptFig [data-k="sqA"], #cptFig [data-k="sqB"]').length + ' ' +
      [...document.querySelectorAll('#cptFig [data-k="mA"]')].slice(0, 4).map(x => x.textContent).join(',') + ' ' +
      [...document.querySelectorAll('#cptFig [data-k="mB"]')].slice(0, 4).map(x => x.textContent).join(',')),
      '1AB2AB3AB4AB 8 2,0,0,3 −1,0,0,4');
    t.ok('no pane gives the answer away', await t.ev(() => !document.querySelector('#cptFig [data-k="same"], #cptFig [data-k="differ"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('cptCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: a shear and a turn called the same either way ---
    await callAs(t, 'SSSD');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#cptStops button[aria-label="Pair 2: the order makes no difference"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('cptCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith("3 of 4 right. Fix the ones in red and check again. In Pair 2, A has rows 1, 1; 0, 1 and B has rows 0, −1; 1, 0. A's three numbers are (1, 0, 0) and B's are (−1, 1, 0): no one number turns A's into B's, so the order matters. At row 1, column 1, AB has 1 × 0 + 1 × 1 = 1, but BA has 0 × 1 + (−1) × 0 = 0. You had it as the order making no difference."), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#cptFig [data-k="miss"]').length), 1);
    t.ok('no pane is marked', await t.ev(() => !document.querySelector('#cptFig [data-k="same"], #cptFig [data-k="differ"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.D..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#cptFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith("Yes: all four are called right. In Pair 1, both are diagonal: each stretches along the axes, so either order gives AB = BA, with rows −2, 0; 0, 12. In Pair 3, B's three numbers are 2 times A's, so B = 2A + I: built from A alone, it goes either way, and AB = BA, with rows 15, 6; 9, 12. In Pair 4, both are flips, over different lines: AB, with rows 0, 1; −1, 0, turns the plane one way, and BA, with rows 0, −1; 1, 0, turns it back the other way. The order matters in Pairs 2 and 4."), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pane is marked', await t.ev(() => [...document.querySelectorAll('#cptFig [data-k="same"], #cptFig [data-k="differ"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), 'same = same,differ ≠ differ,same = same,differ ≠ differ');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#cptStops button')].every(b => b.disabled)));
    t.eq('a diagonal pair, a pair built from A, two flips and a fix are found', await found(t), ['built', 'diag', 'fix', 'flip']);
    t.ok('with a toast', /✓ Diagonals go either way · Built from A, it goes either way · Two flips turn opposite ways · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('oqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('cptCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a turn and a turn stretched are built one from the other', /In Pair 1, B's three numbers are the same as A's, so B = A \+ 2I: built from A alone, it goes either way/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['built', 'diag', 'fix', 'flip', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'ORDER SPOTTER / every pair called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cmTab button, #cptStops button, #cptCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of matrices: Pair 1, A with rows 1, 1; 1, 2 and B with rows 2, 1; 1, 3; Pair 2/.test(await t.ev(() => document.querySelector('#cptFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Try the moves/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the moves come back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('cptStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Compose.tab = 'moves'; UI.go('s-title'); });
  }
};
