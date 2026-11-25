/* Faster or slower? The ladder workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four ladders are shown as a foot x m out
 * from a wall, with the ladder's length and the foot's speed, and the rule
 * stated first; each top is called faster than its foot, just as fast or
 * slower, and the check stays shut until all four are called; a check with
 * a slip rings just that pane and works y and x/y through; fixing it and
 * checking again draws every ladder with its top; first checks are counted
 * and the goals found with toasts and a banner. Every button is named,
 * sliding by hand steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ltRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ltGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#ldTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ltCheck').click());
const next = t => t.ev(() => document.getElementById('ltNext').click());
// tap the named button for each ladder, the way a player would: F faster, S just as fast, W slower
const NAME = { F: 'the top is faster', S: 'the top is just as fast', W: 'the top is slower' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ltStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['ldSets', 'ldFig', 'ldStep', 'ldRead', 'ldGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['WFSW', 'SWFF', 'WSFW', 'FWSW'];

module.exports = {
  name: 'ladderturn',
  title: 'Faster or slower? · call each ladder top faster, just as fast or slower than its foot',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lynette');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says each ladder can be called', await t.ev(() =>
      /Or call it: see four ladders, and say whether each top falls faster than its foot, just as fast, or slower\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLadder');
    t.eq('the ladder workshop opens', await t.screen(), 's-ladder');
    await t.tapText(/Faster or slower\?/);
    t.eq('faster or slower is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('sliding by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('lzBox').innerText)).startsWith('Round 1 of 6: four ladders, each with its foot sliding out from the wall. Does the top slide down faster than the foot, just as fast, or slower?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The ladder never changes length, so x² + y² = L². Differentiate in time: 2x·x′ + 2y·y′ = 0, so y′ = −x·x′/y, and the top falls x/y times as fast as the foot slides.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four feet are drawn, lettered and labelled with their ladders', await t.ev(() => document.querySelectorAll('#ltFig [data-k="foot"]').length + ' ' +
      [...document.querySelectorAll('#ltFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('') + ' ' +
      [...document.querySelectorAll('#ltFig [data-k="eq"]')].map(x => x.textContent).join(' | ')), '4 ABCD L = 10 m, x′ = 1 m/s | L = 5 m, x′ = 1 m/s | L = √50 m, x′ = 2 m/s | L = 13 m, x′ = 3 m/s');
    t.ok('no ladder or top gives the answer away', await t.ev(() => !document.querySelector('#ltFig [data-k="ladder"], #ltFig [data-k="top"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ltCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four ladders to check them'; }));

    // --- a slip: B called slower ---
    await callAs(t, 'WWSW');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ltStops button[aria-label="B: the top is slower"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ltCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, the ladder is 5 m long with its foot x = 4 m out, so the top is y = √(25 − 16) = 3 m up. The top falls x/y = 4/3 ≈ 1.33 times as fast as the foot: more than 1, so it is faster. You had it as slower.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#ltFig [data-k="miss"]').length), 1);
    t.ok('no ladder is given away', await t.ev(() => !document.querySelector('#ltFig [data-k="ladder"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.F');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ltFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, the foot is 6 m out, past half of the 10 m ladder, yet the top is still 8 m up: higher than the foot is out, so the top is slower. In C, x = y = 5 m: the ladder leans at 45°, and its top falls exactly as fast as its foot slides, 2 m/s. In D, the foot races out at 3 m/s, yet the top falls at only 1.25 m/s: x/y ≈ 0.42 is below 1 whatever the foot\'s speed. Each x/y: A 0.75, B ≈ 1.33, C 1, D ≈ 0.42.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each ladder is drawn with its top and its mark', await t.ev(() => document.querySelectorAll('#ltFig [data-k="ladder"]').length + ' ' + document.querySelectorAll('#ltFig [data-k="top"]').length + ' ' +
      [...document.querySelectorAll('#ltFig [data-k="fast"], #ltFig [data-k="same"], #ltFig [data-k="slow"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 4 slow ▼ slower,fast ▲ faster,same = as fast,slow ▼ slower');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ltStops button')].every(b => b.disabled)));
    t.eq('a fix, a foot past halfway, a ladder at 45° and a fast foot are found', await found(t), ['fix', 'past', 'quick', 'same']);
    t.ok('with a toast', /✓ Past halfway, still slower · Neck and neck · A fast foot, a slow top · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('lzBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ltCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('a short ladder past halfway is explained', /In B, the foot is 3 m out, past half of the 5 m ladder, yet the top is still 4 m up:/.test(r), r);
      if (i === 2) t.ok('a top whose height is a root is explained', /In A, the foot is 7 m out, past half of the 13 m ladder, yet the top is still √120 ≈ 10\.95 m up:/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'one', 'past', 'quick', 'same', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SPEED READER / every speed called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ldTab button, #ltStops button, #ltCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four ladders against a wall: A, a 25 m ladder with its foot 24 m out, sliding at 1 m\/s; B/.test(await t.ev(() => document.querySelector('#ltFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Slide it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('sliding by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ltStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Ladder.tab = 'hand'; UI.go('s-title'); });
  }
};
