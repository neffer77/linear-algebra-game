/* Which way? The implicit slope workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves are shown only as their
 * equations, each with a point, and the rule stated first; each tangent is
 * called as rising, falling, flat or upright, and the check stays shut until
 * all four are called; a check with a slip rings just that pane and works
 * y′ through; fixing it and checking again draws every curve with its
 * tangent; first checks are counted and the goals found with toasts and a
 * banner. Every button is named, stepping by hand steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ixRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ixGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#imTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ixCheck').click());
const next = t => t.ev(() => document.getElementById('ixNext').click());
// tap the named button for each tangent, the way a player would: R rises, F falls, H lies flat, U stands upright
const NAME = { R: 'rises', F: 'falls', H: 'lies flat', U: 'stands straight up' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ixStops button[aria-label="${'ABCD'[i]}: the tangent ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['imSets', 'imFig', 'imStep', 'imRead', 'imGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['FHRU', 'RFHU', 'FURH', 'RFFR'];

module.exports = {
  name: 'impturn',
  title: 'Which way? · call each tangent of a curve given implicitly',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each tangent can be called', await t.ev(() =>
      /Or call it: see four curves, each with a point, and say whether each tangent rises, falls, lies flat or stands straight up\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeImplicit');
    t.eq('the implicit slope workshop opens', await t.screen(), 's-implicit');
    await t.tapText(/Which way\?/);
    t.eq('which way is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('iyBox').innerText)).startsWith('Round 1 of 6: four curves, each with a point on it. Does the tangent there rise, fall, lie flat, or stand straight up?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Differentiate both sides with respect to x, treating y as a function of x, so each y term picks up a y′.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four points are drawn, lettered and labelled with their curves', await t.ev(() => document.querySelectorAll('#ixFig [data-k="pt"]').length + ' ' +
      [...document.querySelectorAll('#ixFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#ixFig [data-k="eq"]')].map(x => x.textContent).join(' | ')), '4 ABCD x² + y² = 25 | x² + y² = 25 | x² − y² = 16 | x² + 4y² = 25');
    t.ok('no curve or tangent gives the answer away', await t.ev(() => !document.querySelector('#ixFig [data-k="curve"], #ixFig [data-k="tan"], #ixFig [data-k="rise"], #ixFig [data-k="fall"], #ixFig [data-k="flat"], #ixFig [data-k="stand"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ixCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four tangents to check them'; }));

    // --- a slip: B called rising ---
    await callAs(t, 'FRRU');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ixStops button[aria-label="B: the tangent rises"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ixCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, x² + y² = 25 at (0, 5): 2x + 2y·y′ = 0, so y′ = −x/y. Here the top, x, is 0, so y′ = 0 and the tangent lies flat. You had it as rising.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ixFig [data-k="miss"]').length), 1);
    t.ok('no curve is given away', await t.ev(() => !document.querySelector('#ixFig [data-k="curve"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.H');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ixFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In C, a circle’s tangent at (5, 3) would fall, yet on x² − y² = 16 it rises: the picture in your head is not the curve, and only y′ can tell. In D, the bottom of y′, 4y, is 0: there is no number for the slope, and the tangent stands straight up. In B, the top of y′, x, is 0, so y′ = 0 and the tangent lies flat. Each tangent: A y′ = −3/4, B flat, C y′ = 5/3, D upright.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each curve is drawn with its tangent and its mark', await t.ev(() => document.querySelectorAll('#ixFig [data-k="tan"]').length + ' ' +
      [...document.querySelectorAll('#ixFig [data-k="rise"], #ixFig [data-k="fall"], #ixFig [data-k="flat"], #ixFig [data-k="stand"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 fall y′ = −3/4,flat flat,rise y′ = 5/3,stand upright');
    t.ok('the hyperbola is drawn in two branches', await t.ev(() => document.querySelectorAll('#ixFig [clip-path="url(#ixClip2)"] [data-k="curve"]').length === 2));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ixStops button')].every(b => b.disabled)));
    t.eq('a fix, a flat, an upright and a twist are found', await found(t), ['fix', 'flat', 'stand', 'twist']);
    t.ok('with a toast', /✓ Flat where the top is 0 · Upright where the bottom is 0 · Not every curve is a circle · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('iyBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ixCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a hyperbola standing on end is called flat at its tip', /In C, the top of y′, x, is 0, so y′ = 0 and the tangent lies flat\./.test(r), r);
      if (i === 3) t.ok('a curve that rises where a circle falls is explained', /In A, a circle’s tangent at \(4, 5\) would fall, yet on y² − x² = 9 it rises/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'flat', 'one', 'stand', 'three', 'twist']);
    t.eq('the last one found brings a banner', banners.join(), 'TRUE TANGENT / every tangent called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#imTab button, #ixStops button, #ixCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each with a point: A, x² \+ y² = 25 at \(−4, −3\); B/.test(await t.ev(() => document.querySelector('#ixFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ixStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Implicit.tab = 'hand'; UI.go('s-title'); });
  }
};
