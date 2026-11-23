/* Left or right? The chord workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves are shown, each on an interval
 * with its chord and its middle, and the rule stated first; each c is
 * called left of the middle, at it, or right of it, and the check stays
 * shut until all four are called; a check with a slip rings just that pane
 * and works the chord's slope and the middle slope through; fixing it and
 * checking again draws each tangent at c in blue and writes c in; first
 * checks are counted and the goals found with toasts and a banner. Every
 * button is named, walking by hand steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cdtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cdtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#mvtTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('cdtCheck').click());
const next = t => t.ev(() => document.getElementById('cdtNext').click());
// tap the named button for each curve, the way a player would: L left of the middle, M at it, R right of it
const NAME = { L: 'c is left of the middle', M: 'c is at the middle', R: 'c is right of the middle' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#cdtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const texts = (t, k) => t.ev(k => [...document.querySelectorAll(`#cdtFig [data-k="${k}"]`)].map(x => x.textContent).join(' | '), k);
const AWAY = ['mvtSets', 'mvtFig', 'mvtMoveRow', 'mvtRead', 'mvtGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RMLR', 'MRLM', 'LRMR', 'LMRL'];

module.exports = {
  name: 'chordturn',
  title: 'Left or right? · call whether each c lies left of the middle, at it, or right of it',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each c can be placed', await t.ev(() =>
      /Or call it: see four curves with their chords, and say whether each c lies left of the middle, at it, or right of it\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeMeanValue');
    t.eq('the chord workshop opens', await t.screen(), 's-mvt');
    await t.tapText(/Left or right\?/);
    t.eq('left or right is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('walking by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('mvpBox').innerText)).startsWith('Round 1 of 6: four curves, each with its chord and its middle. Is c, where the tangent runs parallel to the chord, left of the middle, at it, or right of it?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The mean value theorem promises a c between a and b where the tangent'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their curves', await t.ev(() =>
      [...document.querySelectorAll('#cdtFig text[font-size="14"]')].map(x => x.textContent).join('')) + ' ' + await texts(t, 'fn'),
      'ABCD f = x³ | f = −x² + 4x | f = x³ | f = −x³ + 8');
    t.eq('each is marked a, the middle and b along the bottom', await texts(t, 'tick'), '0 | 1 | 2 | 0 | 1 | 2 | −2 | −1 | 0 | 0 | 1 | 2');
    t.ok('each curve has its chord and its middle drawn', await t.ev(() =>
      document.querySelectorAll('#cdtFig [data-k="curve"]').length === 4 && document.querySelectorAll('#cdtFig [data-k="chord"]').length === 4 && document.querySelectorAll('#cdtFig [data-k="mid"]').length === 4));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#cdtFig [data-k="tan"], #cdtFig [data-k="cpt"], #cdtFig [data-k="cval"], #cdtFig [data-k="right"], #cdtFig [data-k="middle"], #cdtFig [data-k="left"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('cdtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: B, a parabola, called right of the middle ---
    await callAs(t, 'RRLR');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#cdtStops button[aria-label="B: c is right of the middle"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('cdtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and its slopes worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, f(x) = −x² + 4x on [0, 2]: the chord\'s slope is s = (f(2) − f(0))/(2 − 0) = (4 − 0)/2 = 2. At the middle, x = 1, f′(1) = 2, s already: on a parabola f′ is a straight line, so c is the middle, 1. You had it as right of the middle.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#cdtFig [data-k="miss"]').length), 1);
    t.ok('c is not given away', await t.ev(() => !document.querySelector('#cdtFig [data-k="tan"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.M..');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#cdtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, f(x) = −x² + 4x is a parabola: f′ = −2x + 4 is a straight line, so its value at the middle is the chord\'s slope, 2, and c = 1 sits exactly half way. In C, f bends down, f″ = 6x below 0, so f′ falls as x grows: the rule turns round, and with f′(−1) = 3 below the chord\'s 4, c ≈ −1.15 is left of the middle. In D, the chord falls, slope −4, yet the rule is the same: f′(1) = −3 against it puts c ≈ 1.15 right of the middle. Each c against its middle: A 1.15 against 1, B 1 against 1, C −1.15 against −1, D 1.15 against 1.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each tangent at c is drawn, c written in, and each pane marked', await t.ev(() =>
      document.querySelectorAll('#cdtFig [data-k="tan"]').length + ' ' + document.querySelectorAll('#cdtFig [data-k="cpt"]').length + ' ' +
      [...document.querySelectorAll('#cdtFig [data-k="cval"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#cdtFig [data-k="right"], #cdtFig [data-k="middle"], #cdtFig [data-k="left"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      '4 4 c ≈ 1.15 | c = 1 | c ≈ −1.15 | c ≈ 1.15 right right ▶,middle = middle,left ◀ left,right right ▶');
    t.ok('each tangent at c runs parallel to its chord', await t.ev(() => {
      const sl = e => (e.getAttribute('y2') - e.getAttribute('y1')) / (e.getAttribute('x2') - e.getAttribute('x1'));
      const tn = [...document.querySelectorAll('#cdtFig [data-k="tan"]')], ch = [...document.querySelectorAll('#cdtFig [data-k="chord"]')];
      return tn.every((e, i) => Math.abs(sl(e) - sl(ch[i])) < 0.01); }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#cdtStops button')].every(b => b.disabled)));
    t.eq('a parabola, a curve that bends down, a falling chord and a fix are found', await found(t), ['down', 'fall', 'fix', 'mid']);
    t.ok('with a toast', /✓ Half way on a parabola · The rule turned round · A falling chord placed · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('mvpBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('cdtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('a curve that bends down turns the rule round', /In D, f bends down, f″ = −6x \+ 6 below 0, so f′ falls as x grows: the rule turns round, and with f′\(4\) = −24 above the chord's −25, c ≈ 4\.06 is right of the middle\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['down', 'fall', 'fix', 'mid', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'MIDDLE READER / every c placed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#mvtTab button, #cdtStops button, #cdtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each with its chord and its middle: A, f\(x\) = x² \+ 2x on −3 to 1; B, f\(x\) = −x³ on 1 to 3/.test(await t.ev(() => document.querySelector('#cdtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('walking by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('cdtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { MeanValue.tab = 'hand'; UI.go('s-title'); });
  }
};
