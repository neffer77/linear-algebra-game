/* A or B? The cover-up workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four fractions are shown, each written top
 * over bottom with its split into A and B, and the rule stated first; each
 * is called as A bigger, the same, or B bigger, and the check stays shut
 * until all four are called; a check with a slip rings just that pane and
 * works both cover-ups through; fixing it and checking again writes A and
 * B in and sets them on a number line; first checks are counted and the
 * goals found with toasts and a banner. Every button is named, covering up
 * by hand steps aside and comes back, it fits a phone, and nothing is
 * saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cvtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cvtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#cvTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('cvtCheck').click());
const next = t => t.ev(() => document.getElementById('cvtNext').click());
// tap the named button for each fraction, the way a player would: A A bigger, S the same, B B bigger
const NAME = { A: 'A is bigger than B', S: 'A and B are the same', B: 'B is bigger than A' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#cvtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['cvSets', 'cvFig', 'cvStep', 'cvKeep', 'cvRead', 'cvGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['SAAB', 'ASBB', 'BSBA', 'BBAS'];

module.exports = {
  name: 'coverturn',
  title: 'A or B? · call whether A is bigger than B, the same, or smaller in a fraction split in two',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says A and B can be compared', await t.ev(() =>
      /Or call four splits: is A bigger than B, the same, or smaller\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCover');
    t.eq('the cover-up workshop opens', await t.screen(), 's-cover');
    await t.tapText(/A or B\?/);
    t.eq('A or B is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('covering up by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('cqBox').innerText)).startsWith('Round 1 of 6: four fractions, each split as A over one factor plus B over the other. Is A bigger than B, the same, or smaller?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Cover up twice. For A, cover up its own factor x − r and put x = r into everything left'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written top over bottom with their splits', await t.ev(() =>
      [...document.querySelectorAll('#cvtFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#cvtFig [data-k="top"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#cvtFig [data-k="bottom"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#cvtFig [data-k="split"]')].map(x => x.textContent).join(' | ')),
      'ABCD 2x − 1 | −2x | x + 1 | x + 3 (x + 1)(x − 2) | (x − 1)(x − 3) | x(x + 1) | (x + 1)(x − 1) = A/(x + 1) + B/(x − 2) | = A/(x − 1) + B/(x − 3) | = A/x + B/(x + 1) | = A/(x + 1) + B/(x − 1)');
    t.ok('A and B are drawn in different colours', await t.ev(() => {
      const ts = document.querySelectorAll('#cvtFig [data-k="split"] tspan');
      return ts.length === 8 && ts[0].getAttribute('fill') !== ts[1].getAttribute('fill'); }));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#cvtFig [data-k="nl"], #cvtFig [data-k="ab"], #cvtFig [data-k="abig"], #cvtFig [data-k="same"], #cvtFig [data-k="bbig"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('cvtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: A, where A and B are both 1, called A bigger ---
    await callAs(t, 'AAAB');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#cvtStops button[aria-label="A: A is bigger than B"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('cvtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and both cover-ups worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In A, (2x − 1)/((x + 1)(x − 2)): Cover up x + 1 and put x = −1: A = (2·(−1) − 1)/((−1) − 2) = −3/(−3) = 1. Cover up x − 2 and put x = 2: B = (2·2 − 1)/(2 − (−1)) = 3/3 = 1. They are the same. You had it as A bigger.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#cvtFig [data-k="miss"]').length), 1);
    t.ok('A and B are not given away', await t.ev(() => !document.querySelector('#cvtFig [data-k="ab"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, 'S...');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#cvtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, A and B are both 1: an even split, and A + B is 2, the number in front of x in the top, as it always is. In C, the top is 0 at x = −1, so x + 1 cancels top and bottom, B = 0, and the fraction was A/x all along. In B, B = −3 is bigger in size than A = 1, yet it is the smaller number, lying further left on the line. A and B: A 1 and 1, B 1 and −3, C 1 and 0, D −1 and 2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('A and B are written in and set on a line, with each pane marked', await t.ev(() =>
      [...document.querySelectorAll('#cvtFig [data-k="ab"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#cvtFig [data-k="nl"]').length + ' ' +
      [...document.querySelectorAll('#cvtFig [data-k="abig"], #cvtFig [data-k="same"], #cvtFig [data-k="bbig"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      'A = 1 · B = 1 | A = 1 · B = −3 | A = 1 · B = 0 | A = −1 · B = 2 4 same A = B,abig A > B,abig A > B,bbig A < B');
    t.ok('in B, the bigger A sits to the right of B', await t.ev(() => {
      const a = document.querySelectorAll('#cvtFig [data-k="dA"]')[1], b = document.querySelectorAll('#cvtFig [data-k="dB"]')[1];
      return +a.getAttribute('cx') > +b.getAttribute('cx'); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#cvtStops button')].every(b => b.disabled)));
    t.eq('an even split, a factor that cancels, a trap and a fix are found', await found(t), ['fix', 'same', 'trap', 'zero']);
    t.ok('with a toast', /✓ An even split · A factor cancels · Bigger in size is not bigger · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('cqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('cvtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('two negatives can trap too', /In C, A = −2 is bigger in size than B = −1, yet it is the smaller number, lying further left on the line\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'one', 'same', 'three', 'trap', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'COVER CAPTAIN / every split compared');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cvTab button, #cvtStops button, #cvtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four fractions to split: A, \(2x \+ 1\)\/\(x\(x \+ 1\)\) = A\/x \+ B\/\(x \+ 1\); B, \(x \+ 5\)\/\(\(x \+ 2\)\(x \+ 3\)\) = A\/\(x \+ 2\) \+ B\/\(x \+ 3\); C/.test(await t.ev(() => document.querySelector('#cvtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Cover it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('covering up by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('cvtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Cover.tab = 'hand'; UI.go('s-title'); });
  }
};
