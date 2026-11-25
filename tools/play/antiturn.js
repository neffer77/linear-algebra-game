/* Steep or shallow? The antiderivative workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four targets f are shown, each with a guess
 * F whose power is raised right, and the rule stated first; each F is
 * called too steep, just right or too shallow, and the check stays shut
 * until all four are called; a check with a slip rings just that pane and
 * works F′ through; fixing it and checking again draws each F′ in green
 * over its f and writes in how many f's it makes; first checks are counted
 * and the goals found with toasts and a banner. Every button is named,
 * guessing by hand steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('adtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#adtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#adTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('adtCheck').click());
const next = t => t.ev(() => document.getElementById('adtNext').click());
// tap the named button for each guess, the way a player would: S too steep, R just right, H too shallow
const NAME = { S: 'F is too steep', R: 'F is just right', H: 'F is too shallow' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#adtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#adtFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['adSets', 'adFig', 'adF', 'adSteps', 'adRead', 'adGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RHSR', 'SRHH', 'HRRS', 'SRHH'];

module.exports = {
  name: 'antiturn',
  title: 'Steep or shallow? · call whether each guess F is too steep, just right or too shallow for its f',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each guess can be weighed', await t.ev(() =>
      /Or call it: see four guesses F, and say whether each is too steep, just right or too shallow for its f\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeAnti');
    t.eq('the antiderivative workshop opens', await t.screen(), 's-anti');
    await t.tapText(/Steep or shallow\?/);
    t.eq('steep or shallow is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('guessing by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('apBox').innerText)).startsWith('Round 1 of 6: four guesses F, each for its own f. Is each F too steep, just right, or too shallow?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('To check a guess F, take its slope: it has to come back to f. F = c·xⁿ has slope F′ = c·n·xⁿ⁻¹, the power brought down in front.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their f and F', await t.ev(() =>
      [...document.querySelectorAll('#adtFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'fn') + ' ' + await texts(t, 'Fn'),
      'ABCD f = 3x² | f = 2x^(−1/2) | f = 4x³ | f = −2x⁻³ F = x³ + 2 | F = 2x^(1/2) | F = 4x⁴ | F = x⁻²');
    t.eq('each f is dashed in gold', await t.ev(() => [...document.querySelectorAll('#adtFig [data-k="target"]')].filter(e => e.getAttribute('stroke-dasharray')).length), 4);
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#adtFig [data-k="slope"], #adtFig [data-k="ratio"], #adtFig [data-k="steep"], #adtFig [data-k="right"], #adtFig [data-k="shallow"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('adtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, which forgot to divide by 1/2, called too steep ---
    await callAs(t, 'RSSR');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#adtStops button[aria-label="B: F is too steep"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('adtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and F′ worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f = 2x^(−1/2) and F = 2x^(1/2): F′ = 2 · (1/2) · x^(−1/2) = x^(−1/2), which is 1/2 × f, less than one f: F is too shallow. You had it as too steep.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#adtFig [data-k="miss"]').length), 1);
    t.ok('F′ is not given away', await t.ev(() => !document.querySelector('#adtFig [data-k="slope"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.H..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#adtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, F raises the power to 1/2 but never divides by it. Dividing by 1/2 doubles, so skipping it leaves the number in front half what it should be: F′ = x^(−1/2), half of f, and F is too shallow. In A, the + 2 is a number on its own, so it has no slope: F′ = 1 · 3 · x² = 3x², which is f, and F is right. In D, the power −2 is below 0, so bringing it down in front turns the sign: F′ = 1 · (−2) · x⁻³ = −2x⁻³, which is exactly f. Each F′ against f: A 1, B 1/2, C 4, D 1.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each F′ is drawn, its f\'s written in, and each pane marked', await t.ev(() =>
      document.querySelectorAll('#adtFig [data-k="slope"]').length + ' ' + document.querySelectorAll('#adtFig [data-k="target"]').length + ' ' +
      [...document.querySelectorAll('#adtFig [data-k="ratio"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#adtFig [data-k="steep"], #adtFig [data-k="right"], #adtFig [data-k="shallow"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '4 4 F′ = exactly f | F′ = 1/2 × f | F′ = 4 × f | F′ = exactly f right = right,shallow ▼ too shallow,steep ▲ too steep,right = right');
    t.ok('where F is right, F′ lies on f', await t.ev(() => {
      const panes = [0, 3].map(i => [...document.querySelectorAll('#adtFig [data-k="slope"]')][i].getAttribute('points') === [...document.querySelectorAll('#adtFig [data-k="target"]')][i].getAttribute('points'));
      return panes.every(Boolean); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#adtStops button')].every(b => b.disabled)));
    t.eq('a forgotten half, a + C, a power below 0 and a fix are found', await found(t), ['fix', 'half', 'neg', 'plus']);
    t.ok('with a toast', /✓ Too shallow by forgetting · The \+ C shrugged off · Below zero weighed · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('apBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('adtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('two minuses make a plus', /In B, the power −2 is below 0, so bringing it down in front turns the sign: F′ = \(−2\) · \(−2\) · x⁻³ = 4x⁻³, which is exactly f\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'half', 'neg', 'one', 'plus', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SLOPE WEIGHER / every F weighed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#adTab button, #adtStops button, #adtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four targets f, each with a guess F: A, f = −3x² and F = −3x³; B, f = x\^\(−1\/2\) and F = 2x\^\(1\/2\) − 4/.test(await t.ev(() => document.querySelector('#adtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Guess F by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('guessing by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('adtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Anti.tab = 'guess'; UI.go('s-title'); });
  }
};
