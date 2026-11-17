/* Sketch the total, the cistern workshop's third mode.
 *
 * These checks open the cistern workshop from the Tome, switch to the mode,
 * and play it through its buttons: the flow is drawn with the rule stated
 * first, four hours each get a total set with + and −, and the check stays
 * shut until all four are set; picking an hour shades its area, red where the
 * flow is below 0; a check with a slip marks just that hour and works its
 * area; fixing it and checking again draws the true total; first checks are
 * counted and the goals found with toasts and a banner. Every button is
 * named, stepping by hand steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cskRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cskGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#ciTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const shown = t => t.ev(() => [...document.querySelectorAll('.cskStop b[data-k="val"]')].map(b => b.textContent).join(' '));
const check = t => t.ev(() => document.getElementById('cskCheck').click());
const next = t => t.ev(() => document.getElementById('cskNext').click());
// press + or − on hour i until it shows v, the way a player would
const setTo = (t, i, v) => t.ev(([i, v]) => {
  for (let k = 0; k < 20; k++) {
    const cur = CisternSketch.vals[i];
    if (cur === v) return true;
    const up = cur === null ? v >= 0 : v > cur;
    document.querySelectorAll('.cskStop')[i].querySelectorAll('button')[up ? 1 : 2].click();
  }
  return false;
}, [i, v]);
const sketch = async (t, vs) => { for (let i = 0; i < 4; i++) await setTo(t, i, vs[i]); };
const AWAY = ['ciSets', 'ciFig', 'ciStep', 'ciRead', 'ciGoalPanel'];
// the totals at t = 1, 2, 3, 4 for each spring, in the order they come round
const ANS = [[2, 4, 6, 8], [3, 4, 3, 0], [-2, -2, 0, 4], [-1, -2, -3, -4], [-1, 0, 3, 8]];

module.exports = {
  name: 'cisternsketch',
  title: 'Sketch the total · set what the cistern holds each hour and draw F',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the total can be sketched by hand', await t.ev(() =>
      /or sketch the total yourself, one hour at a time\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCistern');
    t.eq('the cistern workshop opens', await t.screen(), 's-cistern');
    await t.tapText(/Sketch the total/);
    t.eq('sketch the total is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first spring, before anything is set ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('cwBox').innerText)).startsWith('Spring 1 of 8: f(t) = 2 barrels an hour. Set the total at the end of each hour and draw F.'));
    let r = await read(t);
    t.ok('the rule comes before anything is set', r.startsWith('F(t) is what the cistern holds after t hours: the area under f from 0 to t, starting from F(0) = 0.'), r);
    t.ok('the first hour is picked to start', /The hour from t = 0 to 1 is picked: its area is shaded\./.test(r), r);
    t.eq('four hours, none set', await shown(t), '? ? ? ?');
    t.ok('the check is shut until all four are set', await t.ev(() => { const b = document.getElementById('cskCheck'); return b.disabled && b.getAttribute('aria-label') === 'Set all four totals to check them'; }));
    t.eq('the first hour is shaded gold', await t.ev(() => [...document.querySelectorAll('#cskFig polygon')].map(p => p.dataset.k).join()), 'add');
    t.eq('F(0) = 0 is drawn to start from', await t.ev(() => document.querySelectorAll('#cskFig [data-k="start"]').length), 1);

    // --- a slip ---
    await sketch(t, [2, 4, 6, 7]);
    t.eq('the totals show as set', await shown(t), '2 4 6 7');
    t.eq('four gold dots are drawn', await t.ev(() => document.querySelectorAll('#cskFig [data-k="dot"]').length), 4);
    t.ok('the check opens', await t.ev(() => !document.getElementById('cskCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and its hour worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. From t = 3 to 4 the area under f is (f(3) + f(4)) ÷ 2 = (2 + 2) ÷ 2 = 2, so F(4) = F(3) + 2 = 6 + 2 = 8, not 7.'), r);
    t.eq('only that dot is ringed', await t.ev(() => document.querySelectorAll('#cskFig [data-k="miss"]').length), 1);
    t.ok('the true total is not given away', await t.ev(() => !document.querySelector('#cskFig [data-k="true"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await setTo(t, 3, 8);
    t.eq('changing the hour clears its ring', await t.ev(() => document.querySelectorAll('#cskFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the sketch is explained', r.startsWith('Yes: the total is F(t) = 2t, and the four dots lie on it. A steady flow of 2 adds the same 2 every hour, so the total climbs in a straight line, with slope f.'), r);
    t.ok('a fix is not a first check', /0 sketched right on the first check this visit\.$/.test(r), r);
    t.eq('the true total is drawn through the dots', await t.ev(() => document.querySelectorAll('#cskFig [data-k="true"]').length), 1);
    t.ok('the totals are shut', await t.ev(() => [...document.querySelectorAll('.cskStop button')].filter(b => /total/.test(b.getAttribute('aria-label'))).every(b => b.disabled)));
    t.eq('a fix and a steady flow are found', await found(t), ['fix', 'line']);
    t.ok('with a toast', /✓ A steady flow adds the same each hour · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a peak, a dip and a drain ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`spring ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('cwBox').innerText)).startsWith(`Spring ${i + 1} of 8:`) && await shown(t) === '? ? ? ?');
      if (i === 2) {
        await t.ev(() => document.querySelectorAll('.cskStop')[1].querySelector('button').click());
        t.ok('picking the second hour of a dip says its area is 0', /The hour from t = 1 to 2 is picked: its area is shaded, and it is 0\./.test(await read(t)), await read(t));
        t.eq('and shades it red then gold where f crosses 0', await t.ev(() => [...document.querySelectorAll('#cskFig polygon')].map(p => p.dataset.k).join()), 'take,add');
      }
      await sketch(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('cskCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) {
        r = await read(t);
        t.ok('a peak is explained where f drops below 0', r.startsWith('Yes: the total is F(t) = 4t − t², and the four dots lie on it. f drops below 0 at t = 2: until then water comes in and after it runs out, so the cistern is fullest there, with F(2) = 4.'), r);
        t.ok('and the cistern ends where it began', /F\(4\) = 0: the area above the axis is cancelled by the area below it/.test(r), r);
      }
      if (i === 2) t.ok('a dip is explained where f climbs above 0', /f climbs above 0 at t = 1\.5: until then water runs out and after it comes in, so the cistern is lowest there, with F\(1\.5\) = −2\.25\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('a steady drain falls in a line', r.startsWith('Yes: the total is F(t) = −t, and the four dots lie on it. A steady flow of −1 adds the same −1 every hour, so the total falls in a straight line, with slope f.'), r);
    t.ok('the run is counted', /3 sketched right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['dip', 'fix', 'line', 'one', 'peak', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TALLY KEEPER / every total drawn by hand');

    // --- the ends of the scale ---
    await next(t);
    await setTo(t, 0, 8);
    t.ok('a total stops at 8', await t.ev(() => document.querySelectorAll('.cskStop')[0].querySelectorAll('button')[1].disabled));
    t.ok('pressing past it does nothing', await t.ev(() => { CisternSketch.set(0, 1); return CisternSketch.vals[0] === 8; }));
    await setTo(t, 1, -8);
    t.ok('and at −8', await t.ev(() => { CisternSketch.set(1, -1); return CisternSketch.vals[1] === -8 && document.querySelectorAll('.cskStop')[1].querySelectorAll('button')[2].disabled; }));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ciTab button, .cskStop button, #cskCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^The flow f\(t\) = 2t − 2 for t from 0 to 4 hours, the area from t = 1 to 2 shaded/.test(await t.ev(() => document.querySelector('#cskFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the sketch is put away', await t.ev(() => !document.getElementById('cskStops')));
    t.ok('sketching changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Cistern.tab = 'hand'; UI.go('s-title'); });
  }
};
