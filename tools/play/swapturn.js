/* Does du fit? The swap workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four integrals are shown, each with its u,
 * and the rule stated first; each is called as du fitting exactly, fitting
 * up to a number, or leaving an x over, and the check stays shut until all
 * four are called; a check with a slip rings just that pane and works it
 * through; fixing it and checking again writes du and the swap in; first
 * checks are counted and the goals found with toasts and a banner. Every
 * button is named, picking a u by hand steps aside and comes back, it fits
 * a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('swtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#swtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#swTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('swtCheck').click());
const next = t => t.ev(() => document.getElementById('swtNext').click());
// tap the named button for each integral, the way a player would: E exactly, N up to a number, L an x left over
const NAME = { E: 'du fits exactly', N: 'du fits up to a number', L: 'an x is left over' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#swtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['swSets', 'swFig', 'swOpts', 'swRead', 'swGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['ENLN', 'LENN', 'ELNE', 'LNEN'];

module.exports = {
  name: 'swapturn',
  title: 'Does du fit? · call whether the rest of an integrand is du exactly, du up to a number, or leaves an x over',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says du can be checked before swapping', await t.ev(() =>
      /Or call four integrals: does du fit exactly, up to a number, or not at all\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSwap');
    t.eq('the swap workshop opens', await t.screen(), 's-swap');
    await t.tapText(/Does du fit\?/);
    t.eq('does du fit is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('picking a u by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('usBox').innerText)).startsWith('Round 1 of 6: four integrals, each with u the bracket. Is the rest du exactly, du up to a number, or does an x get left over?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Swap u for the bracket, u = a·xᵐ + b. Then du = m·a·xᵐ⁻¹ dx'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their integrals and u', await t.ev(() =>
      [...document.querySelectorAll('#swtFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#swtFig [data-k="int"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#swtFig [data-k="u"]')].map(x => x.textContent).join(' | ')),
      'ABCD ∫ 2x cos(x²) dx | ∫ x(1 − x²)³ dx | ∫ cos(x²) dx | ∫ x² e^(x³) dx u = x² | u = 1 − x² | u = x² | u = x³');
    t.eq('what stands outside is gold and the bracket blue', await t.ev(() => {
      const o = document.querySelector('#swtFig [data-k="out"]'), b = document.querySelector('#swtFig [data-k="in"]');
      return [o.textContent, b.textContent, o.getAttribute('fill') !== b.getAttribute('fill')].join(); }), '2x,cos(x²),true');
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#swtFig [data-k="du"], #swtFig [data-k="gives"], #swtFig [data-k="exact"], #swtFig [data-k="number"], #swtFig [data-k="left"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('swtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: A, which is du exactly, called as up to a number ---
    await callAs(t, 'NNLN');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#swtStops button[aria-label="A: du fits up to a number"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('swtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In A, ∫ 2x cos(x²) dx: u = x², so du = 2x dx. 2x dx is exactly du, and the integral becomes ∫ cos u du. You had it as fitting up to a number.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#swtFig [data-k="miss"]').length), 1);
    t.ok('du is not given away', await t.ev(() => !document.querySelector('#swtFig [data-k="du"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, 'E...');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#swtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, x² dx is (1/3) du: a number is no trouble, it just comes out front. In B, u = 1 − x² carries a minus, so du = −2x dx carries it too. In C, ∫ cos(x²) dx looks ready, but the swap leaves 1/x behind, so u = x² does not work there. What each swap gives: A ∫ cos u du, B (−1/2) ∫ u³ du, C 1/x left over, D (1/3) ∫ eᵘ du.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('du and the swap are written in, with each pane marked', await t.ev(() =>
      [...document.querySelectorAll('#swtFig [data-k="du"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#swtFig [data-k="exact"], #swtFig [data-k="number"], #swtFig [data-k="left"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      'du = 2x dx | du = −2x dx | du = 2x dx | du = 3x² dx exact = exact,number × number,left ✗ x left,number × number');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#swtStops button')].every(b => b.disabled)));
    t.eq('a number out front, a minus in du, an x left over and a fix are found', await found(t), ['fix', 'left', 'number', 'sign']);
    t.ok('with a toast', /✓ A number comes out front · The minus rides along in du · No number fixes a stray x · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('usBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('swtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('an x squared can still leave an x over', /In A, ∫ x²\(x² \+ 1\)³ dx looks ready, but the swap leaves x behind/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'left', 'number', 'one', 'sign', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SWAP SMITH / every du checked');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#swTab button, #swtStops button, #swtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four integrals, each with its u: A, ∫ x³ cos\(x³\) dx with u = x³; B, ∫ −3x² e\^\(4 − x³\) dx with u = 4 − x³; C/.test(await t.ev(() => document.querySelector('#swtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Pick a u by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('picking a u by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('swtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Swap.tab = 'hand'; UI.go('s-title'); });
  }
};
