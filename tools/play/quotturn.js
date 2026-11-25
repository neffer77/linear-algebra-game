/* Rising or falling? The quotient rule workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four fractions y = f/g are shown, each read
 * at one x with f and g drawn near it, and the rule stated first; each is
 * called rising, flat or falling, and the check stays shut until all four
 * are called; a check with a slip rings just that pane and works its top
 * f′g − fg′ through; fixing it and checking again draws each y with its
 * tangent and writes dy/dx in; first checks are counted and the goals
 * found with toasts and a banner. Every button is named, working the slope
 * by hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('qttRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#qttGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#qoTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('qttCheck').click());
const next = t => t.ev(() => document.getElementById('qttNext').click());
// tap the named button for each fraction, the way a player would: U rising, F flat, D falling
const NAME = { U: 'y is rising there', F: 'y is flat there', D: 'y is falling there' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#qttStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#qttFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['qoSets', 'qoFig', 'qoXs', 'qoModes', 'qoRead', 'qoGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['FDUU', 'DUFU', 'DUDF', 'UFDD'];

module.exports = {
  name: 'quotturn',
  title: 'Rising or falling? · call whether each fraction y = f/g is rising, flat or falling at a point',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each fraction can be called', await t.ev(() =>
      /Or call it: see four fractions, each at one x, and say whether each is rising, flat or falling there\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeQuot');
    t.eq('the quotient rule workshop opens', await t.screen(), 's-quot');
    await t.tapText(/Rising or falling\?/);
    t.eq('rising or falling is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('working the slope by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('qoPick').innerText)).startsWith('Round 1 of 6: four fractions y = f/g, each read at one x. Is y rising there, flat, or falling?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The quotient rule: if y = f / g, then dy/dx = (f′g − fg′) / g². The bottom, g², is a square, so it is never below 0: only the top decides.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their fractions and points', await t.ev(() =>
      [...document.querySelectorAll('#qttFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'fn') + ' ' + await texts(t, 'at'),
      'ABCD y = (x − 1)/(x² + 3) | y = (2x + 2)/(x² − 3) | y = (3x + 1)/(x² + 2) | y = (−x² + 3x)/(x² + 3) at x = −1 | at x = 0 | at x = 1 | at x = −1');
    t.ok('f and g are drawn in different colours, and y is not', await t.ev(() => {
      const f = document.querySelectorAll('#qttFig [data-k="fcurve"]'), g = document.querySelectorAll('#qttFig [data-k="gcurve"]');
      return f.length === 4 && g.length === 4 && f[0].getAttribute('stroke') !== g[0].getAttribute('stroke'); }));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#qttFig [data-k="ycurve"], #qttFig [data-k="tan"], #qttFig [data-k="dydx"], #qttFig [data-k="rise"], #qttFig [data-k="flat"], #qttFig [data-k="fall"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('qttCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, whose bottom is below 0, called rising ---
    await callAs(t, 'FUUU');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#qttStops button[aria-label="B: y is rising there"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('qttCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and its top worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, y = (2x + 2)/(x² − 3) at x = 0: f = 2, f′ = 2, g = −3 and g′ = 0. The top is f′g − fg′ = 2·(−3) − 2·0 = −6 − 0 = −6, and g² = 9 is above 0, so dy/dx = −2/3 is below 0: y is falling. You had it as rising.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#qttFig [data-k="miss"]').length), 1);
    t.ok('y is not given away', await t.ev(() => !document.querySelector('#qttFig [data-k="ycurve"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.D..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#qttFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, f′g and fg′ are both 4: they cancel, the top is 0, and y levels off at x = −1. In B, g = −3 is below 0, yet it is squared: g² = 9, so the top alone decides, and y is falling. In C, f′g = 9 lifts y and fg′ = 8 pulls it down: the bigger wins by 1, so y is rising. Each dy/dx: A 0, B −2/3, C 1/9, D 3/4.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each y is drawn with its tangent, dy/dx written in, and each pane marked', await t.ev(() =>
      document.querySelectorAll('#qttFig [data-k="ycurve"]').length + ' ' + document.querySelectorAll('#qttFig [data-k="tan"]').length + ' ' + document.querySelectorAll('#qttFig [data-k="fcurve"]').length + ' ' +
      [...document.querySelectorAll('#qttFig [data-k="dydx"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#qttFig [data-k="rise"], #qttFig [data-k="flat"], #qttFig [data-k="fall"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '4 4 0 dy/dx = 0 | dy/dx = −2/3 | dy/dx = 1/9 | dy/dx = 3/4 flat = flat,fall ▼ falling,rise ▲ rising,rise ▲ rising');
    t.ok('each tangent touches its curve at the point', await t.ev(() => {
      const tn = [...document.querySelectorAll('#qttFig [data-k="tan"]')], dt = [...document.querySelectorAll('#qttFig [data-k="dot"]')];
      return tn.every((e, i) => Math.abs((+e.getAttribute('x1') + +e.getAttribute('x2')) / 2 - +dt[i].getAttribute('cx')) < 0.02); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#qttStops button')].every(b => b.disabled)));
    t.eq('a level fraction, a bottom below 0, a tug of war and a fix are found', await found(t), ['fix', 'flat', 'neg', 'pull']);
    t.ok('with a toast', /✓ Level where they cancel · Squared away · The tug of war weighed · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('qoPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('qttCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a tug of war is weighed', /In B, f′g = 8 lifts y and fg′ = 2 pulls it down: the bigger wins by 6, so y is rising\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'flat', 'neg', 'one', 'pull', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TOP READER / every slope signed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#qoTab button, #qttStops button, #qttCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four fractions y = f over g, each read at one x: A, y = \(−x² − 3x\)\/\(x − 3\) at x = 1; B, y = \(x² \+ 3\)\/\(x − 1\) at x = −1/.test(await t.ev(() => document.querySelector('#qttFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Work the slope/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('working the slope by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('qttStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Quot.tab = 'work'; UI.go('s-title'); });
  }
};
