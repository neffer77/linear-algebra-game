/* Call the angle: the dot product workshop's third mode.
 *
 * These checks open the dot product workshop from the Tome, switch to the
 * mode, and play it through its buttons: four pairs are drawn with the rule
 * stated first, each angle is called less than, exactly or more than 90°,
 * and the check stays shut until all four are called; a check with a slip
 * rings just that pair and works its dot; fixing it and checking again draws
 * each angle with its degrees; first checks are counted and the goals found
 * with toasts and a banner. Every button is named, setting the arrows by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dtaRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#dtaGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#dtTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('dtaCheck').click());
const next = t => t.ev(() => document.getElementById('dtaNext').click());
// tap the named button for each pair, the way a player would: L less, E exactly, M more than 90°
const NAME = { L: 'less than 90°', E: 'exactly 90°', M: 'more than 90°' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#dtaStops button[aria-label="Pair ${'ABCD'[i]}: the angle is ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['dtVecs', 'dtFig', 'dtRead', 'dtReset', 'dtGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['LEMM', 'LMEM', 'LEML', 'ELMM'];

module.exports = {
  name: 'dotturn',
  title: 'Call the angle · say whether each angle is less than, exactly or more than 90°',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the angle can be called', await t.ev(() =>
      /Or call the angle: see four pairs, and say whether each meets at less than, exactly or more than 90°\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDot');
    t.eq('the dot product workshop opens', await t.screen(), 's-dot');
    await t.tapText(/Call the angle/);
    t.eq('call the angle is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('setting the arrows by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('dtPick').innerText)).startsWith('Round 1 of 6: four pairs u and v. Is the angle between them less than 90°, exactly 90°, or more?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('u·v = |u| |v| cos θ, and lengths are never negative, so u·v has the sign of cos θ:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four pairs are drawn and lettered', await t.ev(() => document.querySelectorAll('#dtaFig [data-k="u"]').length + ' ' + document.querySelectorAll('#dtaFig [data-k="v"]').length + ' ' +
      [...document.querySelectorAll('#dtaFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 4 ABCD');
    t.ok('no angle gives the answer away', await t.ev(() => !document.querySelector('#dtaFig [data-k="arc"], #dtaFig [data-k="right"], #dtaFig [data-k="deg"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('dtaCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four angles to check them'; }));

    // --- a slip: B called less than 90° ---
    await callAs(t, 'LLMM');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#dtaStops button[aria-label="Pair B: the angle is less than 90°"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('dtaCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, u = ⟨2, 1⟩ and v = ⟨−1, 2⟩: u·v = u₁v₁ + u₂v₂ = (2)(−1) + (1)(2) = 0. That is 0, so cos θ is 0: the arrows are square to each other, at exactly 90°. You had it as less than 90°.'), r);
    t.eq('only that pair is ringed', await t.ev(() => document.querySelectorAll('#dtaFig [data-k="miss"]').length), 1);
    t.ok('the angles are not given away', await t.ev(() => !document.querySelector('#dtaFig [data-k="deg"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.E');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#dtaFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. B is square though neither arrow lies on an axis: the two products cancel, (2)(−1) + (1)(2) = 0. In C, u·v is only −1, so the angle is 97°, a few degrees past square, yet the sign still settles it. The angles, to the nearest degree: A 45°, B 90°, C 97°, D 135°.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each angle is drawn and named', await t.ev(() => document.querySelectorAll('#dtaFig [data-k="arc"]').length + ' ' + document.querySelectorAll('#dtaFig [data-k="right"]').length + ' ' +
      [...document.querySelectorAll('#dtaFig [data-k="deg"]')].map(x => x.textContent).join()), '3 1 45°,90°,97°,135°');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#dtaStops button')].every(b => b.disabled)));
    t.eq('a fix, a square pair and a near miss are found', await found(t), ['close', 'fix', 'square']);
    t.ok('with a toast', /✓ Square without an axis · A hair from square · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a flipped v among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('dtPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('dtaCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a flipped v is explained', /A and B share u, and B's v is A's turned round: u·\(−v\) = −\(u·v\), so A's 45° becomes 180° − 45° = 135°\./.test(await read(t)), await read(t));
      if (i === 2) t.ok('a pair a little short of square is explained', /In A, u·v is only 1, so the angle is 82°, a few degrees short of square, yet the sign still settles it\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'fix', 'flip', 'one', 'square', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TRUE AIM / every angle called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dtTab button, #dtaStops button, #dtaCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of arrows: A, u = ⟨4, 1⟩ and v = ⟨−1, 3⟩; B/.test(await t.ev(() => document.querySelector('#dtaFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Set the arrows/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('setting the arrows by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('dtaStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Dot.tab = 'set'; UI.go('s-title'); });
  }
};
