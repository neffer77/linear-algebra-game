/* Name the undo: the undo workshop's third mode.
 *
 * These checks open the undo workshop from the Tome, switch to the mode, and
 * play it through its buttons: four square matrices are drawn with the rule
 * stated first, each is named as undone by A itself, by Aᵀ, by another matrix
 * or by nothing, and the check stays shut until all four are named; a check
 * with a slip rings just that matrix and works det A and A·A for it; fixing it
 * and checking again tags what undoes each one; first checks are counted and
 * the goals found with toasts and a banner. Every button is named, building by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('unsRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#unsGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#uvTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('unsCheck').click());
const next = t => t.ev(() => document.getElementById('unsNext').click());
// tap the named button for each matrix, the way a player would
const NAME = { S: 'A undoes itself', T: 'its transpose undoes it', N: 'another matrix undoes it', Z: 'nothing undoes it' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#unsStops button[aria-label="Matrix ${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['uvMats', 'uvBLabel', 'uvB', 'uvFig', 'uvRead', 'uvGoalPanel'];
// each round named right, in the order the rounds come round
const ANS = ['TSZN', 'ZNTT', 'NTZS', 'SZTZ'];

module.exports = {
  name: 'undosort',
  title: 'Name the undo · say whether A, Aᵀ, another matrix or nothing undoes A',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the undo workshop can name the undo', await t.ev(() =>
      /Or name the undo: for four matrices, say whether A undoes itself, Aᵀ undoes it, another matrix does, or nothing can\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeUndo');
    t.eq('the undo workshop opens', await t.screen(), 's-undo');
    await t.tapText(/Name the undo/);
    t.eq('name the undo is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('building by hand steps aside', away);

    // --- the first round, before anything is named ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('uiBox').innerText)).startsWith('Round 1 of 6: four square matrices. What undoes each one: A itself, its transpose Aᵀ, another matrix, or nothing?'));
    let r = await read(t);
    t.ok('the rule comes before anything is named', r.startsWith('A⁻¹ is the matrix that puts back what A moves: A⁻¹A = I.'), r);
    t.ok('nothing is named yet', /0 of 4 named\./.test(r), r);
    t.eq('four matrices are drawn and lettered', await t.ev(() => document.querySelectorAll('#unsFig [data-k="cell"]').length + ' ' +
      [...document.querySelectorAll('#unsFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '16 ABCD');
    t.ok('no tag gives the answer away', await t.ev(() => !document.querySelector('#unsFig [data-k="tag"]')));
    t.ok('the check is shut until all four are named', await t.ev(() => { const b = document.getElementById('unsCheck'); return b.disabled && b.getAttribute('aria-label') === 'Name all four undos to check them'; }));

    // --- a slip: B named as undone by Aᵀ ---
    await callAs(t, 'TTZN');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#unsStops button[aria-label="Matrix B: its transpose undoes it"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('unsCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, det A = 1·(−1) − 2·0 = −1, not 0, and A·A = I: doing A twice puts everything back, so A undoes itself. You had it as A⁻¹ = Aᵀ.'), r);
    t.eq('only that matrix is ringed', await t.ev(() => document.querySelectorAll('#unsFig [data-k="miss"]').length), 1);
    t.ok('the tags are not given away', await t.ev(() => !document.querySelector('#unsFig [data-k="tag"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.S');
    t.eq('changing the name clears its ring', await t.ev(() => document.querySelectorAll('#unsFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the names are explained', r.startsWith('Yes: all four undos are named right. A flip, or any A with A·A = I, undoes itself; a turn is undone by its transpose; and with det A = 0 nothing can undo A.'), r);
    t.ok('a fix is not a first check', /0 named right on the first check this visit\.$/.test(r), r);
    t.eq('each matrix is tagged with what undoes it', await t.ev(() =>
      [...document.querySelectorAll('#unsFig [data-k="tag"]')].map(c => c.textContent).join()), 'A⁻¹ = Aᵀ,A⁻¹ = A,no A⁻¹,another A⁻¹');
    t.ok('the names are shut', await t.ev(() => [...document.querySelectorAll('#unsStops button')].every(b => b.disabled)));
    t.eq('a fix is found', await found(t), ['fix']);
    t.ok('with a toast', /✓ A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a shear and a 3×3 turn, then big numbers ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('uiBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 named\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('unsCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a 3×3 turn and a shear are explained', /C is a 3×3 turn: .* B is a shear: the undo shears back the other way/.test(await read(t)), await read(t));
      if (i === 2) t.ok('big numbers that undo themselves are explained', /D has big numbers, yet A·A = I/.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 named right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'one', 'shear', 'sneaky', 'three', 'turn3']);
    t.eq('the last one found brings a banner', banners.join(), 'UNDO KEEPER / every undo named');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#uvTab button, #unsStops button, #unsCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four matrices: A, rows \(1, 0, 0\), \(0, 0, −1\), \(0, 1, 0\); B, rows \(1, 0\), \(5, −1\)/.test(await t.ev(() => document.querySelector('#unsFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build B by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('building by hand comes back', back);
    t.ok('and the names are put away', await t.ev(() => !document.getElementById('unsStops')));
    t.ok('naming changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Undo.tab = 'hand'; UI.go('s-title'); });
  }
};
