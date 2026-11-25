/* Mirror or not? The transpose workshop's third mode.
 *
 * These checks open the transpose workshop from the Tome, switch to the mode,
 * and play it through its buttons: four square matrices are drawn with their
 * main diagonals edged in gold and the rule stated first, each is called
 * Aᵀ = A, Aᵀ = −A or neither, and the check stays shut until all four are
 * called; a check with a slip rings just that matrix, edges red the entries
 * that break the call, and works it; fixing it and checking again draws each
 * mirror line and tags what each transpose is; first checks are counted and
 * the goals found with toasts and a banner. Every button is named, moving by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('txsRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#txsGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('txsCheck').click());
const next = t => t.ev(() => document.getElementById('txsNext').click());
// tap the named button for each matrix, the way a player would: S is Aᵀ = A, K is Aᵀ = −A, N is neither
const NAME = { S: 'its transpose is A', K: 'its transpose is −A', N: 'its transpose is neither A nor −A' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#txsStops button[aria-label="Matrix ${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['tpSets', 'tpFig', 'tpRead', 'tpGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['SKNS', 'NKSN', 'KSNS', 'NKSS'];

module.exports = {
  name: 'transsort',
  title: 'Mirror or not? · say whether Aᵀ = A, Aᵀ = −A, or neither',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Percival');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the transpose workshop can call the mirror', await t.ev(() =>
      /Or call the mirror: for four square matrices, say whether Aᵀ = A, Aᵀ = −A, or neither\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTranspose');
    t.eq('the transpose workshop opens', await t.screen(), 's-transpose');
    await t.tapText(/Mirror or not\?/);
    t.eq('mirror or not is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('moving by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('txBox').innerText)).startsWith('Round 1 of 6: four square matrices. Is the transpose of each one A itself, −A, or neither?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The transpose flips A across its main diagonal, from top left to bottom right:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four matrices are drawn, lettered, with their diagonals edged', await t.ev(() => document.querySelectorAll('#txsFig [data-k="cell"]').length + ' ' + document.querySelectorAll('#txsFig [data-k="diag"]').length + ' ' +
      [...document.querySelectorAll('#txsFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '21 9 ABCD');
    t.ok('no mirror line gives the answer away', await t.ev(() => !document.querySelector('#txsFig [data-k="mirror"], #txsFig [data-k="tag"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('txsCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four matrices to check them'; }));

    // --- a slip: B called Aᵀ = A ---
    await callAs(t, 'SSNS');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#txsStops button[aria-label="Matrix B: its transpose is A"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('txsCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, every entry is the negative of its mirror and the diagonal is all 0, so Aᵀ = −A. You had it as Aᵀ = A.'), r);
    t.eq('only that matrix is ringed', await t.ev(() => document.querySelectorAll('#txsFig [data-k="miss"]').length), 1);
    t.eq('with the pair that breaks the call edged red', await t.ev(() => [...document.querySelectorAll('#txsFig [data-k="pair"]')].map(p => p.dataset.rc).join(' ')), '0,1 1,0');
    t.ok('the mirrors are not given away', await t.ev(() => !document.querySelector('#txsFig [data-k="mirror"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.K');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#txsFig [data-k="miss"], #txsFig [data-k="pair"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. B has only 0s down the diagonal, as Aᵀ = −A needs: aᵢᵢ = −aᵢᵢ only when aᵢᵢ = 0. C mirrors across the other diagonal, from top right to bottom left, but the transpose flips across the main one, so it is neither. Any square A splits into a part with Aᵀ = A and a part with Aᵀ = −A: A = ½(A + Aᵀ) + ½(A − Aᵀ).'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each matrix gets its mirror line and its tag', await t.ev(() => document.querySelectorAll('#txsFig [data-k="mirror"]').length + ' ' +
      [...document.querySelectorAll('#txsFig [data-k="tag"]')].map(c => c.textContent).join()), '4 Aᵀ = A,Aᵀ = −A,neither,Aᵀ = A');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#txsStops button')].every(b => b.disabled)));
    t.eq('a fix and a wrong mirror are found', await found(t), ['anti', 'fix']);
    t.ok('with a toast', /✓ The wrong mirror · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a near miss, then a 3×3 with Aᵀ = −A ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('txBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('txsCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a near miss is explained', /D flips the signs off the diagonal, but its diagonal is not all 0, so it is neither\./.test(await read(t)), await read(t));
      if (i === 2) t.ok('a 3×3 with Aᵀ = −A is explained', /^Yes: all four are called right\. A has only 0s down the diagonal/.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['anti', 'fix', 'near', 'one', 'skew', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'MIRROR KEEPER / every matrix called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tpTab button, #txsStops button, #txsCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four matrices: A, rows \(0, −4\), \(4, 0\); B, rows \(1, 0, 0\)/.test(await t.ev(() => document.querySelector('#txsFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Move by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('moving by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('txsStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Transpose.tab = 'hand'; UI.go('s-title'); });
  }
};
