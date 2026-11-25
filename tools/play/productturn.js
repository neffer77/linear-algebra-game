/* Rising or falling? The product rule workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four products y = f(x) · g(x) are shown as
 * their two factors crossing a point a, and the rule stated first; each is
 * called rising, flat or falling, and the check stays shut until all four
 * are called; a check with a slip rings just that pane and works f′g + fg′
 * through; fixing it and checking again draws every y with its tangent;
 * first checks are counted and the goals found with toasts and a banner.
 * Every button is named, growing the field steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ptRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ptGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#pdMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ptCheck').click());
const next = t => t.ev(() => document.getElementById('ptNext').click());
// tap the named button for each product, the way a player would: R rising, F flat, D falling
const NAME = { R: 'y is rising', F: 'y is flat', D: 'y is falling' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ptStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['pdSets', 'pdFig', 'pdHs', 'pdRead', 'pdGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['RDFR', 'RRDD', 'FDFD', 'DDFR'];

module.exports = {
  name: 'productturn',
  title: 'Rising or falling? · call each product rising, flat or falling',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each product can be called', await t.ev(() =>
      /Or call it: see four products, each at a point, and say whether each is rising, flat or falling there\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeProduct');
    t.eq('the product rule workshop opens', await t.screen(), 's-product');
    await t.tapText(/Rising or falling\?/);
    t.eq('rising or falling is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('growing the field steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('pdPick').innerText)).startsWith('Round 1 of 6: four products y = f(x) · g(x), each at a point a. Is y rising, flat or falling there?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The product rule: y = f(x) · g(x) has slope dy/dx = f′g + fg′.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their factors', await t.ev(() => document.querySelectorAll('#ptFig [data-k="f"]').length + ' ' + document.querySelectorAll('#ptFig [data-k="g"]').length + ' ' +
      [...document.querySelectorAll('#ptFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#ptFig [data-k="eq"]')].map(x => x.textContent).join(' | ')), '4 4 ABCD x · (x + 1) | x · (x − 3) | x · (x − 2) | (x − 2) · (x + 1)');
    t.ok('no y or tangent gives the answer away', await t.ev(() => !document.querySelector('#ptFig [data-k="y"], #ptFig [data-k="tan"], #ptFig [data-k="ya"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ptCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four products to check them'; }));

    // --- a slip: B called rising ---
    await callAs(t, 'RRFR');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ptStops button[aria-label="B: y is rising"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ptCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, y = x · (x − 3) at a = 1: f(1) = 1 with f′ = 1, and g(1) = −2 with g′ = 1. So f′g + fg′ = 1 × (−2) + 1 × 1 = −2 + 1 = −1: below 0, so y falls. You had it as rising.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ptFig [data-k="miss"]').length), 1);
    t.ok('no y is given away', await t.ev(() => !document.querySelector('#ptFig [data-k="y"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.D');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ptFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In B, f and g both rise at x = 1, yet y falls: g(1) = −2 is below 0, so its strip pulls the slope down. In C, the two strips cancel: f′g = −1 and fg′ = 1, so y is flat at x = 1 though neither factor is. In D, f(2) = 0, so the strip fg′ is 0 and only f′g = 3 counts. Each slope: A 3, B −1, C 0, D 3.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each y is drawn with its tangent and its mark', await t.ev(() => document.querySelectorAll('#ptFig [data-k="y"]').length + ' ' + document.querySelectorAll('#ptFig [data-k="tan"]').length + ' ' +
      [...document.querySelectorAll('#ptFig [data-k="rise"], #ptFig [data-k="flat"], #ptFig [data-k="fall"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 rise ▲ rising,fall ▼ falling,flat = flat,rise ▲ rising');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ptStops button')].every(b => b.disabled)));
    t.eq('a fix, a fall from two rises, strips that cancel and a factor at 0 are found', await found(t), ['both', 'fix', 'flat', 'zero']);
    t.ok('with a toast', /✓ Two climbs, one fall · Two strips that cancel · One strip gone · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('pdPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ptCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 2) t.ok('two factors both below 0 are explained', /In D, f and g both rise at x = −3, yet y falls: g\(−3\) = −2 and f\(−3\) = −2 are below 0, so both strips pull the slope down\./.test(r), r);
      if (i === 3) t.ok('a factor at 0 is explained', /In A, f\(0\) = 0, so the strip fg′ is 0 and only f′g = −2 counts\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['both', 'fix', 'flat', 'one', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'FIELD READER / every slope called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#pdMode button, #ptStops button, #ptCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four products, each with its two factors drawn near a point: A, y = \(x² \+ 1\) · x at a = −1; B/.test(await t.ev(() => document.querySelector('#ptFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Grow the field/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('growing the field comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ptStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Product.mode = 'field'; UI.go('s-title'); });
  }
};
