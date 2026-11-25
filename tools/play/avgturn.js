/* Above or below? The water level workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves on their intervals are shown and
 * the rule stated first; each is called above f at the middle, equal to it or
 * below it, and the check stays shut until all four are called; a check with
 * a slip rings just that pane and works it through; fixing it and checking
 * again draws every average in; first checks are counted and the goals found
 * with toasts and a banner. Every button is named, levelling by hand steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('avtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#avtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#avTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('avtCheck').click());
const next = t => t.ev(() => document.getElementById('avtNext').click());
// tap the named button for each curve, the way a player would: U above, E equal, N below
const NAME = { U: 'the average sits above f at the middle', E: 'the average equals f at the middle', N: 'the average sits below f at the middle' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#avtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['avSets', 'avFig', 'avStep', 'avRead', 'avGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['UNEU', 'UENN', 'EUNN', 'UNEE'];

module.exports = {
  name: 'avgturn',
  title: 'Above or below? · call each average above f at the middle, equal to it or below it',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each average can be called', await t.ev(() =>
      /Or call four curves: does each average sit above f at the middle, equal it, or sit below it\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeAvg');
    t.eq('the water level workshop opens', await t.screen(), 's-avg');
    await t.tapText(/Above or below\?/);
    t.eq('above or below is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('levelling by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('agBox').innerText)).startsWith('Round 1 of 6: four curves, each on an interval. Does the average value sit above f at the middle, equal it, or sit below it?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Pair each step t to the right of the middle m with the same step to the left'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their curves and intervals', await t.ev(() =>
      [...document.querySelectorAll('#avtFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#avtFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#avtFig [data-k="on"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#avtFig [data-k="mid"]').length + ' ' + document.querySelectorAll('#avtFig [data-k="f"]').length),
      'ABCD f(x) = x² | f(x) = −x² + 4x | f(x) = x³ − 3x² + 3x + 1 | f(x) = x³ − 3x² on [−1, 3] | on [0, 2] | on [0, 2] | on [0, 4] 4 4');
    t.ok('no average gives the answer away', await t.ev(() => !document.querySelector('#avtFig [data-k="avg"], #avtFig [data-k="above"], #avtFig [data-k="equal"], #avtFig [data-k="below"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('avtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, which bends down, called above ---
    await callAs(t, 'UUEU');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#avtStops button[aria-label="B: the average sits above f at the middle"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('avtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = −x² + 4x on [0, 2]: the middle is m = 1 and half the width is h = 1. f″(x) = −2, so f″(1) = −2, below 0: every pair\'s mean is f(m) + f″(m)·t²/2, below f(m), and the average is f(m) + f″(m)·h²/6 = 3 − 1/3 = 8/3, below f(1) = 3. You had it as sitting above f(m).'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#avtFig [data-k="miss"]').length), 1);
    t.ok('no average is given away', await t.ev(() => !document.querySelector('#avtFig [data-k="avg"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.N..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#avtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, f bends both ways on [0, 4]: f″ is 0 at x = 1, inside it. Still, f″(2) = 6, so every pair\'s mean sits above f(m), and the average, 0, is above f(2) = −4. In C, f curves, but f″(1) = 0: each step right of m is undone by the same step left, so the average is f(1) = 2 exactly. In B, f″(1) = −2, below 0: every pair\'s mean sits below f(m), and the average, 8/3, is below f(1) = 3. The average minus f(m) for each: A 4/3, B −1/3, C 0, D 4.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('every average is drawn in, with each pane marked', await t.ev(() => document.querySelectorAll('#avtFig [data-k="avg"]').length + ' ' +
      [...document.querySelectorAll('#avtFig [data-k="above"], #avtFig [data-k="equal"], #avtFig [data-k="below"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 above ▲ above,below ▼ below,equal = equal,above ▲ above');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#avtStops button')].every(b => b.disabled)));
    t.eq('a curve that bends down, a level cubic, a twist and a fix are found', await found(t), ['down', 'fix', 'flat', 'twist']);
    t.ok('with a toast', /✓ Bends down, sits below · Curved, yet level · Only f″ at the middle counts · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('agBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('avtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a cubic that bends both ways goes by f″ at the middle', /In A, f bends both ways on \[−1, 3\]: f″ is 0 at x = 0, inside it\. Still, f″\(1\) = 6/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['down', 'fix', 'flat', 'one', 'three', 'twist']);
    t.eq('the last one found brings a banner', banners.join(), 'LEVEL READER / every middle weighed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#avTab button, #avtStops button, #avtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each on an interval: A, f\(x\) = −x³ on \[0, 2\]; B, f\(x\) = x³ − 9x on \[−2, 4\]; C/.test(await t.ev(() => document.querySelector('#avtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Level it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('levelling by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('avtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Avg.tab = 'hand'; UI.go('s-title'); });
  }
};
