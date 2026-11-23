/* Peak or valley? The biggest build workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four slopes f′, each 0 at one x and drawn
 * with that x marked, are shown and the rule stated first; each flat spot
 * is called a peak, neither or a valley, and the check stays shut until all
 * four are called; a check with a slip rings just that pane and works f′
 * half a step either side through; fixing it and checking again draws every
 * f; first checks are counted and the goals found with toasts and a banner.
 * Every button is named, stepping by hand steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('optRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#optGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#opTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('optCheck').click());
const next = t => t.ev(() => document.getElementById('optNext').click());
// tap the named button for each flat spot, the way a player would: P peak, N neither, V valley
const NAME = { P: 'f has a peak there', N: 'f has neither there', V: 'f has a valley there' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#optStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['opSets', 'opFig', 'opStep', 'opRead', 'opGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['VNPV', 'PNVP', 'VPNP', 'PVNV'];

module.exports = {
  name: 'optturn',
  title: 'Peak or valley? · call each flat spot of f a peak, a valley or neither',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each flat spot can be called', await t.ev(() =>
      /Or call it: see four slopes that are 0 at a point, and say whether f has a peak there, a valley or neither\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeOptim');
    t.eq('the biggest build workshop opens', await t.screen(), 's-optim');
    await t.tapText(/Peak or valley\?/);
    t.eq('peak or valley is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('bbBox').innerText)).startsWith('Round 1 of 6: four slopes f′, each 0 at one x. Does f have a peak there, a valley, or neither?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('At x = c the slope f′ is 0. Read the sign of f′ just either side:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their slopes and x', await t.ev(() =>
      [...document.querySelectorAll('#optFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#optFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#optFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#optFig [data-k="zero"]').length),
      'ABCD f′(x) = 3(x + 1)(x − 1) | f′(x) = x² | f′(x) = −2x(x − 2) | f′(x) = (x − 1)³ at x = 1 | at x = 0 | at x = 2 | at x = 1 4');
    t.ok('no f gives the answer away', await t.ev(() => !document.querySelector('#optFig [data-k="f"], #optFig [data-k="peak"], #optFig [data-k="valley"], #optFig [data-k="neither"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('optCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B called a peak ---
    await callAs(t, 'VPPV');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#optStops button[aria-label="B: f has a peak there"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('optCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f′(x) = x² is 0 at x = 0. Just left, f′(−0.5) = (−0.5)² = 0.25, above 0; just right, f′(0.5) = 0.5² = 0.25, above 0. So f keeps rising through a flat step: neither. You had it as a peak.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#optFig [data-k="miss"]').length), 1);
    t.ok('no f is given away', await t.ev(() => !document.querySelector('#optFig [data-k="f"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.N');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#optFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, f′ has x² in it, so it touches 0 at x = 0 without crossing: f keeps rising through a flat step, neither a peak nor a valley. In D, (x − 1)³ makes f″(1) = 0 too, so the second derivative test says nothing, yet f′ still goes from − to +: a valley. In C, the − out front turns every sign of f′ round, so this is a peak where 2x(x − 2) alone would give a valley. Signs of f′ either side: A − then +, B + then +, C + then −, D − then +.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each f is drawn, with each pane marked', await t.ev(() => document.querySelectorAll('#optFig [data-k="f"]').length + ' ' +
      [...document.querySelectorAll('#optFig [data-k="peak"], #optFig [data-k="neither"], #optFig [data-k="valley"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 valley ∪ valley,neither → neither,peak ∩ peak,valley ∪ valley');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#optStops button')].every(b => b.disabled)));
    t.eq('a fix, a flat step, a turn with f″ = 0 and a − out front are found', await found(t), ['deep', 'fix', 'flat', 'neg']);
    t.ok('with a toast', /✓ A flat step, no turn · f″ is 0, yet it turns · A minus turns every sign · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('bbBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('optCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a square factor away from 0 is explained', /In C, f′ has \(x − 2\)² in it, so it touches 0 at x = 2 without crossing: f keeps rising through a flat step, neither a peak nor a valley\./.test(r), r);
      if (i === 3) t.ok('a cubed x is explained', /In A, x³ makes f″\(0\) = 0 too, so the second derivative test says nothing, yet f′ still goes from \+ to −: a peak\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['deep', 'fix', 'flat', 'neg', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SUMMIT READER / every flat spot called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#opTab button, #optStops button, #optCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four slopes, each 0 at one x: A, f′\(x\) = −x², at x = 0; B, f′\(x\) = \(x \+ 1\)x\(x − 1\), at x = 0; C/.test(await t.ev(() => document.querySelector('#optFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('optStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Optim.tab = 'hand'; UI.go('s-title'); });
  }
};
