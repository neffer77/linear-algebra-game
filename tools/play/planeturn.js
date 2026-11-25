/* Bowl or saddle? The tangent plane workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four surfaces, each with a point, are shown
 * and the rule stated first; each is called above its tangent plane, below
 * it or crossing it, and the check stays shut until all four are called; a
 * check with a slip rings just that pane and works it through; fixing it and
 * checking again dashes in the diagonals; first checks are counted and the
 * goals found with toasts and a banner. Every button is named, building by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ptnRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ptnGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tqTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ptnCheck').click());
const next = t => t.ev(() => document.getElementById('ptnNext').click());
// tap the named button for each surface, the way a player would: U above, X crosses, N below
const NAME = { U: 'it stays above its tangent plane', X: 'it crosses its tangent plane', N: 'it stays below its tangent plane' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ptnStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['tqSets', 'tqFig', 'tqP', 'tqStep', 'tqRead', 'tqGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['UXNX', 'NUXX', 'UXXN', 'UXNX'];

module.exports = {
  name: 'planeturn',
  title: 'Bowl or saddle? · call each surface above its tangent plane, below it or crossing it',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each surface can be called', await t.ev(() =>
      /Or call four surfaces: does each stay above its tangent plane, below it, or cross it\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTanPlane');
    t.eq('the tangent plane workshop opens', await t.screen(), 's-tanplane');
    await t.tapText(/Bowl or saddle\?/);
    t.eq('bowl or saddle is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('building by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('tnBox').innerText)).startsWith('Round 1 of 6: four surfaces, each with a point. Near the point, does the surface stay above its tangent plane, stay below it, or cross it?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Take away the tangent plane at a point, and what is left of f = ax² + cxy + by² is au² + cuv + bv²'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their surfaces and points', await t.ev(() =>
      [...document.querySelectorAll('#ptnFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#ptnFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#ptnFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#ptnFig [data-k="plane"]').length + ' ' + document.querySelectorAll('#ptnFig [data-k="sx"], #ptnFig [data-k="sy"]').length),
      'ABCD f = x² + y² | f = x² + 3xy + y² | f = −x² + xy − 2y² | f = 2x² + xy − y² at (1, 0) | at (0, 1) | at (1, 1) | at (−1, 2) 4 8');
    t.ok('no diagonal gives the answer away', await t.ev(() => !document.querySelector('#ptnFig [data-k="diag"], #ptnFig [data-k="above"], #ptnFig [data-k="cross"], #ptnFig [data-k="below"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ptnCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B's twisted saddle called a bowl ---
    await callAs(t, 'UUNX');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ptnStops button[aria-label="B: it stays above its tangent plane"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ptnCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f = x² + 3xy + y². Take away its tangent plane at (0, 1) and what is left is u² + 3uv + v², where u and v are the steps from the point. a = 1 and b = 1 share a sign, but 4·1·1 − 3² = −5 is below 0: along u = 1, v = −1 what is left is 1 − 3 + 1 = −1, below the plane, so it crosses. You had it as staying above the plane.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ptnFig [data-k="miss"]').length), 1);
    t.ok('no diagonal is given away', await t.ev(() => !document.querySelector('#ptnFig [data-k="diag"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.X..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ptnFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, x² and y² both lean up, but the xy term is strong: 4·1·1 − 3² = −5 is below 0, and along u = 1, v = −1 what is left is 1 − 3 + 1 = −1, below the plane. It is a saddle. In D, x² leans up and y² leans down, so a step along x lands above the plane and a step along y lands below the plane: a saddle. In C, a = −1 and 4·(−1)·(−2) − 1² = 7 is above 0, so every step falls below the plane: a dome. 4ab − c² for each: A 4, B −5, C 7, D −9.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('both diagonals are dashed in, with each pane marked', await t.ev(() => document.querySelectorAll('#ptnFig [data-k="diag"]').length + ' ' +
      [...document.querySelectorAll('#ptnFig [data-k="above"], #ptnFig [data-k="cross"], #ptnFig [data-k="below"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '8 above ∪ above,cross ✕ crosses,below ∩ below,cross ✕ crosses');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ptnStops button')].every(b => b.disabled)));
    t.eq('a saddle each way, a dome and a fix are found', await found(t), ['dome', 'fix', 'opp', 'twist']);
    t.ok('with a toast', /✓ Opposite signs cross · The xy term can twist it · A dome stays below · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('tnBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ptnCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a saddle that leans down is twisted up along the other diagonal', /In B, x² and y² both lean down, but the xy term is strong: 4·\(−1\)·\(−1\) − \(−3\)² = −5 is below 0, and along u = 1, v = −1 what is left is −1 \+ 3 − 1 = 1, above the plane\. It is a saddle\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['dome', 'fix', 'one', 'opp', 'three', 'twist']);
    t.eq('the last one found brings a banner', banners.join(), 'SADDLE SPOTTER / every surface called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tqTab button, #ptnStops button, #ptnCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four surfaces, each with a point: A, f = −x² \+ xy − y² at \(1, 0\); B, f = 2x² − 6xy \+ 3y² at \(1, 1\); C/.test(await t.ev(() => document.querySelector('#ptnFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('building by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ptnStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { TanPlane.tab = 'hand'; UI.go('s-title'); });
  }
};
