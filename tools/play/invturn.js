/* Steeper or gentler? The inverse slope workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four curves, each with its inverse read at one
 * u, are shown and the rule stated first; each inverse slope is called
 * steeper than 1, exactly 1 or gentler, and the check stays shut until all
 * four are called; a check with a slip rings just that pane and works x,
 * f′(x) and the flip through; fixing it and checking again draws every
 * mirror; first checks are counted and the goals found with toasts and a
 * banner. Every button is named, mirroring by hand steps aside and comes
 * back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ivtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ivtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#ivTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ivtCheck').click());
const next = t => t.ev(() => document.getElementById('ivtNext').click());
// tap the named button for each inverse, the way a player would: S steeper, E exactly 1, G gentler
const NAME = { S: 'g is steeper than slope 1 there', E: 'g’s slope is exactly 1 in size there', G: 'g is gentler than slope 1 there' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ivtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['ivSets', 'ivFig', 'ivStep', 'ivModes', 'ivRead', 'ivGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['SEGS', 'GESS', 'GGES', 'GSEG'];

module.exports = {
  name: 'invturn',
  title: 'Steeper or gentler? · call each inverse slope steeper than 1, exactly 1 or gentler',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each inverse slope can be called', await t.ev(() =>
      /Or call four inverse slopes steeper than 1, exactly 1 or gentler\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeInvSlope');
    t.eq('the inverse slope workshop opens', await t.screen(), 's-invslope');
    await t.tapText(/Steeper or gentler\?/);
    t.eq('steeper or gentler is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('mirroring by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('vpBox').innerText)).startsWith('Round 1 of 6: four curves f, each with its inverse g read at one u. By size, is g’s slope there steeper than 1, exactly 1, or gentler?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('g is the inverse of f, so at u it goes back to the x where f(x) = u. The mirror in y = x swaps rise and run, so g′(u) = 1/f′(x), with f′ taken at that x, not at u.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their curves and u', await t.ev(() =>
      [...document.querySelectorAll('#ivtFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#ivtFig [data-k="eq"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#ivtFig [data-k="how"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#ivtFig [data-k="fdot"]').length + ' ' + document.querySelectorAll('#ivtFig [data-k="mirror"]').length),
      'ABCD f(x) = eˣ | f(x) = √x | f(x) = x³ | f(x) = 1/x g at u = 1/e | g at u = 1/2 | g at u = 8 | g at u = 1/2 4 4');
    t.ok('no mirror gives the answer away', await t.ev(() => !document.querySelector('#ivtFig [data-k="g"], #ivtFig [data-k="gdot"], #ivtFig [data-k="steep"], #ivtFig [data-k="gentle"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ivtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: A called gentler, the call f′ at u would give ---
    await callAs(t, 'GEGS');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ivtStops button[aria-label="A: g is gentler than slope 1 there"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ivtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In A, g = ln u undoes f(x) = eˣ, so at u = 1/e it goes back to x = −1. f′(x) = eˣ, so f′(−1) ≈ 0.3679, and g′(1/e) = 1/f′(−1) ≈ 2.7183: steeper than 1. You had it as gentler than 1.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ivtFig [data-k="miss"]').length), 1);
    t.ok('no mirror is given away', await t.ev(() => !document.querySelector('#ivtFig [data-k="g"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, 'S');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ivtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, f′ belongs at x = −1, not at u = 1/e: f′(1/e) ≈ 1.4447, and flipped that is ≈ 0.6922, which would call it gentler than 1. In B, f′(1/4) = 1, size 1, so flipping leaves the size alone: g′(1/2) = 1, as steep as the mirror line. In D, f falls, so its mirror g falls too: g′(1/2) = −4 is below 0, and its size, 4, is what is called. Each g′(u): A ≈ 2.7183, B 1, C ≈ 0.0833, D −4.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each mirror is drawn, with each pane marked', await t.ev(() => document.querySelectorAll('#ivtFig [data-k="g"]').length + ' ' + document.querySelectorAll('#ivtFig [data-k="gdot"]').length + ' ' +
      [...document.querySelectorAll('#ivtFig [data-k="steep"], #ivtFig [data-k="exact"], #ivtFig [data-k="gentle"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 steep ▲ steeper,exact ● 1,gentle ▼ gentler,steep ▲ steeper');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ivtStops button')].every(b => b.disabled)));
    t.eq('f′ at u, a slope of exactly 1, a falling curve and a fix are found', await found(t), ['atx', 'exact', 'fall', 'fix']);
    t.ok('with a toast', /✓ f′ belongs at x · Exactly 1, both ways · Falling, read by size · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('vpBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ivtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a slope of 0 at u is explained as a wall', /In B, f′ belongs at x = π\/2, not at u = 0: f′\(0\) = 0, and flipping 0 stands g straight up, which would call it steeper than 1\./.test(r), r);
      if (i === 2) t.ok('a falling curve is read by its size', /In A, f falls, so its mirror g falls too: g′\(2\) = −0\.5 is below 0, and its size, 0\.5, is what is called\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['atx', 'exact', 'fall', 'fix', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SLOPE MIRROR / every inverse slope called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ivTab button, #ivtStops button, #ivtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four curves, each with its inverse g read at one u: A, f\(x\) = 1\/x, g at u = 1; B, f\(x\) = eˣ, g at u = 2; C, f\(x\) = √x, g at u = 2; D/.test(await t.ev(() => document.querySelector('#ivtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Mirror it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('mirroring by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ivtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { InvSlope.tab = 'hand'; UI.go('s-title'); });
  }
};
