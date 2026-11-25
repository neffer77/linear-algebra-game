/* Which is longer? The arrow workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four pairs of arrows are shown, each drawn
 * from the origin, and the rule stated first; each is called as u + v
 * longer, the same, or u − v longer, and the check stays shut until all
 * four are called; a check with a slip rings just that pane and works its
 * dot product through; fixing it and checking again draws both diagonals
 * and writes their squares in; first checks are counted and the goals
 * found with toasts and a banner. Every button is named, building by hand
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('arwRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#arwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#vwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('arwCheck').click());
const next = t => t.ev(() => document.getElementById('arwNext').click());
// tap the named button for each pair, the way a player would: P u + v longer, S the same, M u − v longer
const NAME = { P: 'u + v is longer', S: 'they are the same length', M: 'u − v is longer' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#arwStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#arwFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['vwSets', 'vwFig', 'vwKRow', 'vwAddRow', 'vwRead', 'vwGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['PMPS', 'MSMP', 'PMMS', 'SPMM'];

module.exports = {
  name: 'arrowturn',
  title: 'Which is longer? · call which diagonal of the parallelogram two arrows make is longer',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the diagonals can be weighed', await t.ev(() =>
      /Or call four pairs: which diagonal is longer, u \+ v or u − v\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeArrow');
    t.eq('the arrow workshop opens', await t.screen(), 's-arrow');
    await t.tapText(/Which is longer\?/);
    t.eq('which is longer is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('building by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('awBox').innerText)).startsWith('Round 1 of 6: four pairs of arrows u and v. Which diagonal is longer, u + v or u − v, or are they the same?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Square both lengths: |u + v|² = |u|² + |v|² + 2 u·v'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their arrows', await t.ev(() =>
      [...document.querySelectorAll('#arwFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'u') + ' ' + await texts(t, 'v'),
      'ABCD u = ⟨−2, 1⟩ | u = ⟨0, 3⟩ | u = ⟨−2, 2⟩ | u = ⟨2, −4⟩ v = ⟨−3, −4⟩ | v = ⟨3, −1⟩ | v = ⟨−1, 0⟩ | v = ⟨2, 1⟩');
    t.ok('u and v are drawn from the origin in different colours', await t.ev(() => {
      const u = document.querySelector('#arwFig [data-k="ua"]'), v = document.querySelector('#arwFig [data-k="va"]');
      return u.getAttribute('x1') === v.getAttribute('x1') && u.getAttribute('y1') === v.getAttribute('y1') && u.getAttribute('stroke') !== v.getAttribute('stroke'); }));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#arwFig [data-k="sum"], #arwFig [data-k="diff"], #arwFig [data-k="dot"], #arwFig [data-k="plus"], #arwFig [data-k="same"], #arwFig [data-k="minus"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('arwCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, where u·v is negative, called u + v longer ---
    await callAs(t, 'PPPS');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#arwStops button[aria-label="B: u + v is longer"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('arwCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and its dot product worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, u = ⟨0, 3⟩ and v = ⟨3, −1⟩: u·v = 0·3 + 3·(−1) = 0 − 3 = −3. So |u + v|² = 9 + 10 − 6 = 13 and |u − v|² = 9 + 10 + 6 = 25: u − v is longer. You had it as u + v longer.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#arwFig [data-k="miss"]').length), 1);
    t.ok('the diagonals are not given away', await t.ev(() => !document.querySelector('#arwFig [data-k="sum"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.M..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#arwFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, u·v = 2·2 + (−4)·1 = 4 − 4 = 0: u and v meet at a right angle, so the parallelogram is a rectangle and its two diagonals are the same length, 5 each. In A, the x-parts give 6 and the y-parts −4: they pull opposite ways, the bigger in size wins, and u·v = 2, so u + v is longer. In B, u lies along the y-axis, so only the y-parts count: u·v = −3. Squared diagonals, u + v against u − v: A 34 and 26, B 13 and 25, C 13 and 5, D 25 and 25.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('both diagonals are drawn, their squares written in, and each pane marked', await t.ev(() =>
      document.querySelectorAll('#arwFig [data-k="sum"]').length + ' ' + document.querySelectorAll('#arwFig [data-k="diff"]').length + ' ' +
      [...document.querySelectorAll('#arwFig [data-k="sp"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#arwFig [data-k="sm"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#arwFig [data-k="plus"], #arwFig [data-k="same"], #arwFig [data-k="minus"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '4 4 |u + v|² = 34 | |u + v|² = 13 | |u + v|² = 13 | |u + v|² = 25 |u − v|² = 26 | |u − v|² = 25 | |u − v|² = 5 | |u − v|² = 25 plus u + v longer,minus u − v longer,plus u + v longer,same = same');
    t.ok('u + v runs from the origin and u − v from v\'s tip to u\'s tip', await t.ev(() => {
      const s = document.querySelector('#arwFig [data-k="sum"]'), d = document.querySelector('#arwFig [data-k="diff"]'),
        u = document.querySelector('#arwFig [data-k="ua"]'), v = document.querySelector('#arwFig [data-k="va"]');
      return s.getAttribute('x1') === u.getAttribute('x1') && d.getAttribute('x1') === v.getAttribute('x2') && d.getAttribute('y2') === u.getAttribute('y2'); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#arwStops button')].every(b => b.disabled)));
    t.eq('a right angle, opposite pulls, an arrow along an axis and a fix are found', await found(t), ['axis', 'fix', 'pull', 'same']);
    t.ok('with a toast', /✓ A right angle evens them · Opposite pulls weighed · One part drops out · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('awBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('arwCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('an arrow along the x-axis keeps only the x-parts', /In D, u lies along the x-axis, so only the x-parts count: u·v = 9\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['axis', 'fix', 'one', 'pull', 'same', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'DIAGONAL JUDGE / every diagonal weighed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#vwTab button, #arwStops button, #arwCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of arrows: A, u = ⟨−3, −2⟩ and v = ⟨−2, −3⟩; B, u = ⟨2, 4⟩ and v = ⟨2, −1⟩/.test(await t.ev(() => document.querySelector('#arwFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('building by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('arwStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Arrow.tab = 'hand'; UI.go('s-title'); });
  }
};
