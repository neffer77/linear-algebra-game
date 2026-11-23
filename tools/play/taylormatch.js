/* Match them up: the Taylor workshop's fourth mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four functions and four numbered
 * polynomials, each drawn as its curve near 0, are shown and the rule
 * stated first; each function is matched to a polynomial, and the check
 * stays shut until all four are matched; a check with a slip rings just the
 * polynomials picked wrongly and works each function's value, slope and
 * bend at 0; fixing it and checking again draws every function over its
 * polynomial with its letter; first checks are counted and the goals found
 * with toasts and a banner. Every button is named, building by hand steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tymRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tymGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tyTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tymCheck').click());
const next = t => t.ev(() => document.getElementById('tymNext').click());
// tap the numbered button for each function, the way a player would; '.' leaves it as it is
const matchAs = (t, nums) => t.ev(nums => {
  nums.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tymStops .tymStop[data-i="${i}"] button[data-n="${+c - 1}"]`).click(); });
}, nums);
const AWAY = ['tyCurves', 'tyFig', 'tyStep', 'tyRead', 'tyGoalPanel'];
// each round matched right, A to D, in the order the rounds come round
const ANS = ['3142', '2413', '4231', '1423'];

module.exports = {
  name: 'taylormatch',
  title: 'Match them up · match four functions to the polynomial that hugs each near 0',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the functions can be matched up', await t.ev(() =>
      /Or match them up: four functions and four polynomials, and which hugs which near 0\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTaylor');
    t.eq('the Taylor workshop opens', await t.screen(), 's-taylor');
    await t.tapText(/Match them up/);
    t.eq('match them up is now the pressed mode', await pressed(t), 'false,false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('building by hand steps aside', away);

    // --- the first round, before anything is matched ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('srBox').innerText)).startsWith('Round 1 of 6: four functions and four polynomials. Which polynomial hugs each function near 0?'));
    t.eq('the four polynomials are listed by number', await t.ev(() => document.getElementById('tymPolys').innerText.replace(/\s+/g, ' ').trim()),
      '1 1 + x + x² 2 1 − x + x²/2 3 1 + x + x²/2 4 1 − x²/2');
    t.eq('the four functions are lettered', await t.ev(() => [...document.querySelectorAll('#tymStops .tymStop b')].map(b => b.textContent).join(' | ')),
      'A = eˣ | B = 1/(1 − x) | C = cos x | D = e⁻ˣ');
    let r = await read(t);
    t.ok('the rule comes before anything is matched', r.startsWith('Near 0 a function is close to f(0) + f′(0)·x + f″(0)/2·x².'), r);
    t.ok('nothing is matched yet', /0 of 4 matched\./.test(r), r);
    t.eq('four polynomials are drawn and numbered, with no function or letter', await t.ev(() =>
      document.querySelectorAll('#tymFig [data-k="curve"]').length + ' ' +
      [...document.querySelectorAll('#tymFig [data-k="num"]')].map(x => x.textContent).join('') + ' ' +
      document.querySelectorAll('#tymFig [data-k="fn"], #tymFig [data-k="who"]').length), '4 1234 0');
    t.ok('the check is shut until all four are matched', await t.ev(() => { const b = document.getElementById('tymCheck'); return b.disabled && b.getAttribute('aria-label') === 'Match all four functions to check them'; }));

    // --- a slip: A and B swapped ---
    await matchAs(t, '1342');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tymStops .tymStop[data-i="0"] button[data-n="0"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tymCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('2 of 4 right. Fix the ones in red and check again. For A = eˣ: f(0) = 1, f′(0) = 1 and f″(0) = 1, so its x² term is f″(0)/2. You had 1, 1 + x + x²: it starts at the right height with the right slope, but its x² term is 1, not f″(0)/2 = 1/2.'), r);
    t.eq('only the two polynomials picked wrongly are ringed', await t.ev(() => document.querySelectorAll('#tymFig [data-k="miss"]').length), 2);
    t.ok('no function or match is given away', await t.ev(() => !document.querySelector('#tymFig [data-k="fn"], #tymFig [data-k="who"]')) && !/A is 3/.test(r));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await matchAs(t, '3');
    t.eq('changing a match clears its ring', await t.ev(() => document.querySelectorAll('#tymFig [data-k="miss"]').length), 1);
    await matchAs(t, '.1');
    await check(t);
    r = await read(t);
    t.ok('the matches are explained', r.startsWith('Yes: all four are matched. A and B both start at 1 with slope 1, so only the x² term tells them apart: 1/2 against 1. C bends down at 0: f″(0) is negative, so the x² term has a minus. The matches: A is 3, B is 1, C is 4, D is 2.'), r);
    t.ok('a fix is not a first check', /0 matched right on the first check this visit\.$/.test(r), r);
    t.eq('each function is dashed over its polynomial, lettered, touching it at 0', await t.ev(() =>
      new Set([...document.querySelectorAll('#tymFig [data-k="fn"]')].map(p => p.getAttribute('clip-path'))).size + ' ' +
      [...document.querySelectorAll('#tymFig [data-k="who"]')].map(x => x.textContent).join('') + ' ' +
      document.querySelectorAll('#tymFig [data-k="touch"]').length), '4 BDAC 4');
    t.ok('the matches are shut', await t.ev(() => [...document.querySelectorAll('#tymStops button')].every(b => b.disabled)));
    t.eq('a fix, a pair told apart by the bend and a function bending down are found', await found(t), ['down', 'fix', 'twin']);
    t.ok('with a toast', /✓ Told apart by the bend · Bending down · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('srBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 matched\./.test(await read(t)));
      await matchAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tymCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a function that does not bend at 0 is explained', /A has no x² term: f″\(0\) = 0, so near 0 it runs straight\./.test(r), r);
    }
    t.ok('the run is counted', /3 matched right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['down', 'fix', 'flat', 'one', 'three', 'twin']);
    t.eq('the last one found brings a banner', banners.join(), 'CURVE HUGGER / every function matched near 0');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tyTab button, #tymStops button, #tymCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('each match button names the function and the polynomial', await t.ev(() =>
      document.querySelector('#tymStops .tymStop[data-i="0"] button[data-n="2"]').getAttribute('aria-label') === 'sin 2x goes with polynomial 3, 2x'));
    t.ok('the drawing is named for a screen reader', /^The four polynomials as curves near 0: 1, −x − x²\/2; 2, x − x²\/2; 3, 2x; 4, x$/.test(await t.ev(() => document.querySelector('#tymFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('building by hand comes back', back);
    t.ok('and the matches are put away', await t.ev(() => !document.getElementById('tymStops')));
    t.ok('matching changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Taylor.tab = 'hand'; UI.go('s-title'); });
  }
};
