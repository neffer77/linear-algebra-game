/* More than the box? The slice workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four planes are shown, each over a
 * rectangle with a box beside it, and the rule stated first; each is
 * called as more than the box, the same, or less, and the check stays shut
 * until all four are called; a check with a slip rings just that pane and
 * works its centre height through; fixing it and checking again writes the
 * corner heights in and marks each centre; first checks are counted and
 * the goals found with toasts and a banner. Every button is named,
 * sweeping by hand steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('sltRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#sltGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#scTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('sltCheck').click());
const next = t => t.ev(() => document.getElementById('sltNext').click());
// tap the named button for each solid, the way a player would: M more, S the same, L less
const NAME = { M: 'V is more than the box', S: 'V is the same as the box', L: 'V is less than the box' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#sltStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#sltFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['scSets', 'scHold', 'scFig', 'scStep', 'scRead', 'scGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['MLSM', 'LLMS', 'SLSM', 'LLMS'];

module.exports = {
  name: 'sliceturn',
  title: 'More than the box? · call whether a solid under a plane holds more than a box over the same rectangle',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lynette');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the solids can be set against a box', await t.ev(() =>
      /Or call four solids: does each hold more than its box, the same, or less\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSlice');
    t.eq('the slice workshop opens', await t.screen(), 's-slice');
    await t.tapText(/More than the box\?/);
    t.eq('more than the box is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('sweeping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('dqBox').innerText)).startsWith('Round 1 of 6: four planes, each over a rectangle with a box beside it. Does the solid under the plane hold more than the box, the same, or less?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('A plane\'s average height over a rectangle is its height at the centre'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their planes and boxes', await t.ev(() =>
      [...document.querySelectorAll('#sltFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'f') + ' ' + await texts(t, 'box'),
      'ABCD f = −2x + 2y + 5 | f = 2y + 8 | f = y + 4 | f = −x + 4 box 2 × 3 × 5 | box 2 × 2 × 12 | box 3 × 4 × 6 | box 2 × 3 × 2');
    t.eq('each rectangle is drawn to its sides', await t.ev(() =>
      [...document.querySelectorAll('#sltFig [data-k="rect"]')].map(x => x.getAttribute('width') / 14 + '×' + x.getAttribute('height') / 14).join()), '2×3,2×2,3×4,2×3');
    t.ok('the plane and the box are drawn in different colours', await t.ev(() => {
      const f = document.querySelector('#sltFig [data-k="f"]'), b = document.querySelector('#sltFig [data-k="box"]');
      return f.getAttribute('fill') !== b.getAttribute('fill'); }));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#sltFig [data-k="corner"], #sltFig [data-k="mid"], #sltFig [data-k="centre"], #sltFig [data-k="more"], #sltFig [data-k="same"], #sltFig [data-k="less"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('sltCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, level along x and centred below its box, called more ---
    await callAs(t, 'MMSM');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#sltStops button[aria-label="B: V is more than the box"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('sltCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and its centre worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f = 2y + 8 over 0 ≤ x ≤ 2, 0 ≤ y ≤ 2: The centre is at (1, 1): f(1, 1) = 8 + 2 = 10. So V = 2 × 2 × 10 = 40, against the box\'s 2 × 2 × 12 = 48: less. You had it as more.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#sltFig [data-k="miss"]').length), 1);
    t.ok('the centres are not given away', await t.ev(() => !document.querySelector('#sltFig [data-k="centre"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.L..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#sltFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In C, the plane is tilted, yet its centre stands at exactly 6, the box\'s height: the part above the box on one side fills the gap below it on the other, so V = 72 is the box\'s volume exactly. In A, f falls along x and climbs along y: half way across, that comes to −2 and 3 on top of 5, so the centre stands at 6. In B, f stays level along x, so every slice cut that way is alike, and only the middle of y counts: f(1, 1) = 8 + 2 = 10. Centre heights against the boxes: A 6 and 5, B 10 and 12, C 6 and 6, D 3 and 2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('the corners, the centres and the volumes are written in, with each pane marked', await t.ev(() =>
      [...document.querySelectorAll('#sltFig [data-k="corner"]')].slice(0, 4).map(x => x.textContent).join() + ' ' +
      [...document.querySelectorAll('#sltFig [data-k="centre"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#sltFig [data-k="vol"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#sltFig [data-k="more"], #sltFig [data-k="same"], #sltFig [data-k="less"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '5,1,11,7 centre 6 | centre 10 | centre 6 | centre 3 V 36 · box 30 | V 40 · box 48 | V 72 · box 72 | V 18 · box 12 more ▲ more,less ▼ less,same = same,more ▲ more');
    t.ok('each centre is marked in the middle of its rectangle', await t.ev(() => {
      const rs = document.querySelectorAll('#sltFig [data-k="rect"]'), ms = document.querySelectorAll('#sltFig [data-k="mid"]');
      return ms.length === 4 && [...ms].every((m, i) => { const r = rs[i];
        return +m.getAttribute('cx') === +r.getAttribute('x') + r.getAttribute('width') / 2 && +m.getAttribute('cy') === +r.getAttribute('y') + r.getAttribute('height') / 2; }); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#sltStops button')].every(b => b.disabled)));
    t.eq('a match, a climb against a fall, a level plane and a fix are found', await found(t), ['fix', 'level', 'same', 'tilt']);
    t.ok('with a toast', /✓ The centre matches the box · A climb against a fall · Level one way · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('dqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('sltCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a level plane over an odd side is worked in halves', /In A, f stays level along y, so every slice cut that way is alike, and only the middle of x counts: f\(1\/2, 3\/2\) = 9 \+ 1 = 10\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'level', 'one', 'same', 'three', 'tilt']);
    t.eq('the last one found brings a banner', banners.join(), 'BOX BREAKER / every centre found');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#scTab button, #sltStops button, #sltCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four solids under planes, each against a box: A, f = 2y \+ 7 over 0 ≤ x ≤ 3, 0 ≤ y ≤ 1 against a box 7 tall; B, f = 2x − y \+ 5/.test(await t.ev(() => document.querySelector('#sltFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Sweep it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('sweeping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('sltStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Slice.tab = 'hand'; UI.go('s-title'); });
  }
};
