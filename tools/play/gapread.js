/* Read the graph, the limit workshop's third mode.
 *
 * These checks open the limit workshop from the Tome, switch to the mode, and
 * play it through its buttons: a graph is drawn with four lettered points and
 * the rule stated first, each point is called joined up, a hole, a jump or
 * running off, and the check stays shut until all four are called; a check
 * with a slip rings just that point and works both its sides and f there;
 * fixing it and checking again marks each limit, or no limit; first checks are
 * counted and the goals found with toasts and a banner. Every button is named,
 * closing in by hand steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lgrRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#lgrGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#lmTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('lgrCheck').click());
const next = t => t.ev(() => document.getElementById('lgrNext').click());
// tap the named button at each point, the way a player would: C joined, H hole, J jump, R runs off
const NAME = { C: 'is joined up: the limit is f there', H: 'has a hole: a limit, but f is missing or elsewhere', J: 'jumps: the sides disagree, no limit', R: 'runs off without end: no limit' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#lgrStops button[aria-label="Point ${'ABCD'[i]} ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['lmFns', 'lmSide', 'lmFig', 'lmMoveRow', 'lmRead', 'lmGoalPanel'];
// each graph read right, in the order the graphs come round
const ANS = ['CHJC', 'HCJC', 'CRCH', 'JCHJ'];

module.exports = {
  name: 'gapread',
  title: 'Read the graph · say at each point whether a graph is joined up, has a hole, jumps, or runs off',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the graph can be read', await t.ev(() =>
      /Or read the graph: at four points on a graph, say whether it is joined up, has a hole, jumps, or runs off\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLimit');
    t.eq('the limit workshop opens', await t.screen(), 's-limit');
    await t.tapText(/Read the graph/);
    t.eq('read the graph is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('closing in by hand steps aside', away);

    // --- the first graph, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('lmqBox').innerText)).startsWith('Graph 1 of 6: four lettered points on f. At each, is the graph joined up, does it have a hole, does it jump, or does it run off?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('A limit at x = a is where f heads as x closes in from both sides; f(a) itself does not count.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('five pieces, dots and open circles are drawn', await t.ev(() => ['piece', 'dot', 'open'].map(k => document.querySelectorAll(`#lgrFig [data-k="${k}"]`).length).join()), '5,2,3');
    t.ok('no limit gives the answer away', await t.ev(() => !document.querySelector('#lgrFig [data-k="lim"], #lgrFig [data-k="none"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('lgrCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four points to check them'; }));

    // --- a slip: B called joined up ---
    await callAs(t, 'CCJC');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#lgrStops button[aria-label="Point B is joined up: the limit is f there"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('lgrCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. At B, x = −1: from the left f heads for 2, and from the right it heads for 2. They agree, so the limit is 2, but f(−1) is not defined: a hole. You had it joined up.'), r);
    t.eq('only that point is ringed', await t.ev(() => document.querySelectorAll('#lgrFig [data-k="miss"]').length), 1);
    t.ok('the limits are not given away', await t.ev(() => !document.querySelector('#lgrFig [data-k="lim"], #lgrFig [data-k="none"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.H');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#lgrFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the reading is explained', r.startsWith('Yes: all four points are read right. The limits: A 1, B 2, C none, D 1.'), r);
    t.ok('a fix is not a first check', /0 read right on the first check this visit\.$/.test(r), r);
    t.eq('each limit is ringed, or no limit marked', await t.ev(() => document.querySelectorAll('#lgrFig [data-k="lim"]').length + ' ' + document.querySelectorAll('#lgrFig [data-k="none"]').length), '3 1');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#lgrStops button')].every(b => b.disabled)));
    t.eq('a fix is found', await found(t), ['fix']);
    t.ok('with a toast', /✓ A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a dot off its line, running off, a jump with a dot ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`graph ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('lmqBox').innerText)).startsWith(`Graph ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('lgrCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a dot off the line is explained', /At A the dot sits off the line, at f\(−3\) = 0, but the limit only asks where f heads, so it is still 3\./.test(await read(t)), await read(t));
      if (i === 2) {
        t.ok('running off is explained', /At B, f runs off without end, so no number is its limit; the dashed line is where it runs off\./.test(await read(t)), await read(t));
        t.eq('and drawn dashed', await t.ev(() => document.querySelectorAll('#lgrFig [data-k="asym"]').length), 1);
      }
      if (i === 3) t.ok('a jump with a dot is explained', /At A, f\(−3\) = 2 is there, but the two sides still disagree, so there is no limit\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 read right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'jumpdot', 'moved', 'one', 'runs', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'GAP READER / every break named');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lmTab button, #lgrStops button, #lgrCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^The graph of f in blue, with points A at x = −3, B at x = −1/.test(await t.ev(() => document.querySelector('#lgrFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('closing in by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('lgrStops')));
    t.ok('reading changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Limit.tab = 'hand'; UI.go('s-title'); });
  }
};
