/* Sign or size? The trig integral workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four waves f are shown, each with a guess F
 * that swaps sin and cos, and the rule stated first; each F is called
 * right, flipped or the wrong size, and the check stays shut until all four
 * are called; a check with a slip rings just that pane and works F′
 * through; fixing it and checking again draws each F′ in green over its f
 * and writes in how many f's it makes; first checks are counted and the
 * goals found with toasts and a banner. Every button is named, undoing a
 * wave by hand steps aside and comes back, it fits a phone, and nothing is
 * saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tqtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tqtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#itTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tqtCheck').click());
const next = t => t.ev(() => document.getElementById('tqtNext').click());
// tap the named button for each guess, the way a player would: R right, F flipped, Z the wrong size
const NAME = { R: 'F is right', F: 'F has its sign flipped', Z: 'F has its size off' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tqtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#tqtFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['itSets', 'itFig', 'itF', 'itFun', 'itStep', 'itRead', 'itGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RRZF', 'FRRZ', 'ZRFR', 'RZFZ'];

module.exports = {
  name: 'trigturn',
  title: 'Sign or size? · call whether each guess F for a wave is right, flipped, or the wrong size',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each guess can be called', await t.ev(() =>
      /Or call it: see four waves with a guess F each, and say whether F is right, flipped, or the wrong size\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTrigInt');
    t.eq('the trig integral workshop opens', await t.screen(), 's-trigint');
    await t.tapText(/Sign or size\?/);
    t.eq('sign or size is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('undoing a wave by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('iqBox').innerText)).startsWith('Round 1 of 6: four waves, each with a guess F. Is each F right, flipped, or the wrong size?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Check a guess by its slope. The slope of c·sin(kx) is c·k·cos(kx), and the slope of c·cos(kx) is −c·k·sin(kx): the k inside comes out in front, and cos carries a minus.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their f and F', await t.ev(() =>
      [...document.querySelectorAll('#tqtFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'fn') + ' ' + await texts(t, 'Fn'),
      'ABCD f = 6cos(2x) | f = 4sin(2x) | f = 2cos(3x) | f = sin(x/2) F = 3sin(2x) | F = −2cos(2x) | F = 6sin(3x) | F = 2cos(x/2)');
    t.eq('each f is dashed in gold', await t.ev(() => [...document.querySelectorAll('#tqtFig [data-k="target"]')].filter(e => e.getAttribute('stroke-dasharray')).length), 4);
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#tqtFig [data-k="slope"], #tqtFig [data-k="ratio"], #tqtFig [data-k="right"], #tqtFig [data-k="flip"], #tqtFig [data-k="size"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('tqtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: D, halved inside and doubled out but flipped, called right ---
    await callAs(t, 'RRZR');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tqtStops button[aria-label="D: F is right"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tqtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and F′ worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In D, f = sin(x/2) and F = 2cos(x/2): F′ = −2 · (1/2) · sin(x/2) = −sin(x/2), which is minus f: its sign is flipped. You had it as right.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#tqtFig [data-k="miss"]').length), 1);
    t.ok('F′ is not given away', await t.ev(() => !document.querySelector('#tqtFig [data-k="slope"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '...F');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#tqtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, f is a sine, so F is a cosine, and the slope of cos carries a minus: F′ = −(−2) · 2 · sin(2x) = 4sin(2x). F\'s own minus cancels it, and F is right. In D, the k inside is 1/2, and dividing by 1/2 doubles: F′ = −2 · (1/2) · sin(x/2) = −sin(x/2), which is minus f, the size doubled right but the sign flipped. In C, F multiplies by the k inside, 3, instead of dividing: F′ = 6 · 3 · cos(3x) = 18cos(3x), which is 9 × f, k² times too big. Each F′ against f: A 1, B 1, C 9, D −1.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each F′ is drawn, its f\'s written in, and each pane marked', await t.ev(() =>
      document.querySelectorAll('#tqtFig [data-k="slope"]').length + ' ' + document.querySelectorAll('#tqtFig [data-k="target"]').length + ' ' +
      [...document.querySelectorAll('#tqtFig [data-k="ratio"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#tqtFig [data-k="right"], #tqtFig [data-k="flip"], #tqtFig [data-k="size"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '4 4 F′ = exactly f | F′ = exactly f | F′ = 9 × f | F′ = minus f right ✓ right,right ✓ right,size × size off,flip ± flipped');
    t.ok('where F is right, F′ lies on f', await t.ev(() => {
      const panes = [0, 1].map(i => [...document.querySelectorAll('#tqtFig [data-k="slope"]')][i].getAttribute('points') === [...document.querySelectorAll('#tqtFig [data-k="target"]')][i].getAttribute('points'));
      return panes.every(Boolean); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#tqtStops button')].every(b => b.disabled)));
    t.eq('a minus kept, a half, a multiplied guess and a fix are found', await found(t), ['fix', 'half', 'mult', 'sine']);
    t.ok('with a toast', /✓ The minus kept · Halved inside, doubled out · Multiplied, not divided · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('iqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tqtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('the two minuses cancel', /In D, f is a sine, so F is a cosine, and the slope of cos carries a minus: F′ = −\(−1\/2\) · 4 · sin\(4x\) = 2sin\(4x\)\. F's own minus cancels it, and F is right\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'half', 'mult', 'one', 'sine', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'WAVE UNWINDER / every F unwound');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#itTab button, #tqtStops button, #tqtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four waves f, each with a guess F: A, f = 5cos\(x\/2\) and F = 10sin\(x\/2\); B, f = sin\(3x\) and F = \(1\/3\)cos\(3x\)/.test(await t.ev(() => document.querySelector('#tqtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Undo it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('undoing a wave by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('tqtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { TrigInt.tab = 'hand'; UI.go('s-title'); });
  }
};
