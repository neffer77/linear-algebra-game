/* Which way next? The Newton's method workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves are shown only as their formulas,
 * each with a first guess x₀ marked on its axis, and the rule stated first;
 * each guess is called moving left, moving right, staying put or stuck, and
 * the check stays shut until all four are called; a check with a slip rings
 * just that pane and works f, f′ and the step through; fixing it and
 * checking again draws every curve with its tangent run down to x₁; first
 * checks are counted and the goals found with toasts and a banner. Every
 * button is named, stepping by hand steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ntRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ntGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#nwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ntCheck').click());
const next = t => t.ev(() => document.getElementById('ntNext').click());
// tap the named button for each guess, the way a player would: L left, R right, S stays put, X stuck
const NAME = { L: 'x₁ is to the left', R: 'x₁ is to the right', S: 'x₀ stays put', X: 'stuck on a flat tangent' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ntStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['nwCurves', 'nwFig', 'nwStep', 'nwRead', 'nwGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RXRS', 'LRLR', 'LLXS', 'LRLR'];

module.exports = {
  name: 'newtonturn',
  title: 'Which way next? · call where each Newton step goes',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each step can be called', await t.ev(() =>
      /Or call it: see four curves, each with a first guess, and say whether the step goes left or right, stays put at a root, or sticks on a flat tangent\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeNewton');
    t.eq('the Newton workshop opens', await t.screen(), 's-newton');
    await t.tapText(/Which way next\?/);
    t.eq('which way next is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('nkBox').innerText)).startsWith('Round 1 of 6: four curves, each with a first guess x₀. Does Newton’s step take it left or right, or does it stay put at a root, or stick on a flat tangent?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Newton’s step from x₀ is −f(x₀)/f′(x₀), so x₁ = x₀ − f(x₀)/f′(x₀).'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four first guesses are marked, lettered and labelled with their curves', await t.ev(() => document.querySelectorAll('#ntFig [data-k="x0"]').length + ' ' +
      [...document.querySelectorAll('#ntFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#ntFig [data-k="eq"]')].map(x => x.textContent).join(' | ')), '4 ABCD f(x) = x² − 2 | f(x) = x² − 4x + 3 | f(x) = x³ − 2x + 2 | f(x) = x² − 2x − 3');
    t.ok('no curve or tangent gives the answer away', await t.ev(() => !document.querySelector('#ntFig [data-k="curve"], #ntFig [data-k="tan"], #ntFig [data-k="x1"], #ntFig [data-k="root"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ntCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four guesses to check them'; }));

    // --- a slip: B called moving left ---
    await callAs(t, 'RLRS');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ntStops button[aria-label="B: x₁ is to the left"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ntCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = x² − 4x + 3 at x₀ = 2: f(2) = −1 and f′(x) = 2x − 4 gives f′(2) = 0. Here the tangent is flat, so it never meets the axis and there is no next guess. You had it as moving left.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ntFig [data-k="miss"]').length), 1);
    t.ok('no curve is given away', await t.ev(() => !document.querySelector('#ntFig [data-k="curve"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.X');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ntFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, x₁ = 3/2 lands past the root √2 ≈ 1.414: the tangent overshoots it, and the next step comes back. In C, x₁ = 1 is farther from every root than x₀ = 0 was: the tangent there points away, and Newton’s method can wander before it closes in. In B, f′(2) = 0: the tangent is flat and never meets the axis, so there is no next guess. Each next guess: A x₁ = 3/2, B no next guess, C x₁ = 1, D stays at 3.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each curve is drawn with its tangent and its mark', await t.ev(() => document.querySelectorAll('#ntFig [data-k="curve"]').length + ' ' + document.querySelectorAll('#ntFig [data-k="tan"]').length + ' ' +
      [...document.querySelectorAll('#ntFig [data-k="right"], #ntFig [data-k="left"], #ntFig [data-k="stay"], #ntFig [data-k="stuck"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 3 right x₁ = 3/2,stuck no next guess,right x₁ = 1,stay stays at 3');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ntStops button')].every(b => b.disabled)));
    t.eq('a fix, a jump past a root, a step away and a flat tangent are found', await found(t), ['away', 'fix', 'past', 'stuck']);
    t.ok('with a toast', /✓ Jumped past a root · A step the wrong way · Stuck on a flat tangent · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('nkBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ntCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a step past the root of 4 − x² is explained', /In B, x₁ = 5\/2 lands past the root 2:/.test(r), r);
      if (i === 3) t.ok('a step past the root at 0 is explained', /In A, x₁ = −1\/9 lands past the root 0:/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['away', 'fix', 'one', 'past', 'stuck', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'ROOT RUNNER / every step called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#nwTab button, #ntStops button, #ntCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each with a first guess: A, f\(x\) = 4 − x² at x₀ = 1\/2; B/.test(await t.ev(() => document.querySelector('#ntFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ntStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Newton.tab = 'hand'; UI.go('s-title'); });
  }
};
