/* Race to infinity, the horizon workshop's third mode.
 *
 * These checks open the horizon workshop from the Tome, switch to the mode,
 * and play it through its buttons: the rule is stated first and the four
 * stand at x = 10 with their values; each tap places the next function and a
 * tap on a placed one takes it out, and the check stays shut until all four
 * are placed; a check with a slip rings the wrong places and works the pair
 * put the wrong way round; fixing it and checking again draws the overtakes in
 * gold; first checks are counted and the goals found with toasts and a banner.
 * Every button is named, stepping by hand steps aside and comes back, it fits
 * a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hzrRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#hzrGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#hzTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('hzrCheck').click());
const next = t => t.ev(() => document.getElementById('hzrNext').click());
// tap each function's button by what it says, the way a player would
const tapAll = (t, names) => t.ev(names => {
  for (const n of names) [...document.querySelectorAll('#hzrStops button')].find(b => b.innerText.replace(/^\d · /, '') === n).click();
}, names);
const right = t => t.ev(() => [...document.querySelectorAll('#hzrFig [data-k="slot"]')].map(e => e.textContent).join(' > '));
const AWAY = ['hzSets', 'hzFig', 'hzStep', 'hzRead', 'hzGoalPanel'];
// each race slowest first, in the order the races come round
const ANS = [['ln x', 'x', 'x²', '2ˣ'], ['√x', 'x²', 'x¹⁰', '2ˣ'], ['ln x', 'x³', '2ˣ', '3ˣ'], ['√x', 'x', 'x ln x', 'x²']];

module.exports = {
  name: 'hzrace',
  title: 'Race to infinity · rank four functions from slowest to fastest as x grows',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says a race can be ranked', await t.ev(() =>
      /Or rank a race: put four functions in order from slowest to fastest as x grows\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHorizon');
    t.eq('the horizon workshop opens', await t.screen(), 's-horizon');
    await t.tapText(/Race to infinity/);
    t.eq('race to infinity is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('stepping by hand steps aside', away);

    // --- the first race, before anything is placed ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('zpBox').innerText)).startsWith('Race 1 of 6: which grows fastest as x grows without end? Tap the four from slowest to fastest.'));
    let r = await read(t);
    t.ok('the rule comes before anything is placed', r.startsWith('As x grows without end, every power of ln x is outgrown by every positive power of x, and every power of x by every bˣ with b above 1.'), r);
    t.ok('nothing is placed yet', /0 of 4 placed\./.test(r), r);
    t.eq('the four stand at x = 10, biggest on top', await t.ev(() => [...document.querySelectorAll('#hzrFig [data-k="left"]')].map(e => e.textContent).join(' | ')), '2ˣ = 1,024 | x² = 100 | x = 10 | ln x ≈ 2.3');
    t.eq('no place is called yet', await right(t), '? > ? > ? > ?');
    t.ok('the check is shut until all four are placed', await t.ev(() => { const b = document.getElementById('hzrCheck'); return b.disabled && b.getAttribute('aria-label') === 'Rank all four to check them'; }));

    // --- a tap places, a second tap takes out ---
    await tapAll(t, ['x', 'ln x']);
    t.eq('the taps place the functions, slowest first', await right(t), '? > ? > ln x > x');
    t.ok('the next place is named on the buttons', await t.ev(() => document.querySelector('#hzrStops button[data-f="x2"]').getAttribute('aria-label') === 'Put x² in place 3, counting from the slowest'));
    await tapAll(t, ['x']);
    t.eq('a second tap takes one out', await right(t), '? > ? > ? > ln x');

    // --- a slip: x² and x swapped ---
    await tapAll(t, ['x²', 'x', '2ˣ']);
    t.eq('a line joins each start to its called place', await t.ev(() => document.querySelectorAll('#hzrFig [data-k="line"]').length), 4);
    t.ok('the check opens', await t.ev(() => !document.getElementById('hzrCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and the pair worked', r.startsWith('2 of 4 in the right place. Tap one to take it out, then put it back where it goes. You ranked x² slower than x, but it grows faster. Of two powers of x the bigger power wins: x ÷ x² heads for 0. At x = 10, x is 10 and x² is 100, and at x = 1,000, x is 1,000 and x² is 10⁶.'), r);
    t.eq('only those two places are ringed', await t.ev(() => document.querySelectorAll('#hzrFig [data-k="miss"]').length), 2);
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await tapAll(t, ['2ˣ', 'x', 'x²']);
    t.eq('taking them out clears the rings', await t.ev(() => document.querySelectorAll('#hzrFig [data-k="miss"]').length), 0);
    await tapAll(t, ['x', 'x²', '2ˣ']);
    await check(t);
    r = await read(t);
    t.ok('the order is explained', r.startsWith('Yes: from slowest to fastest, ln x, x, x², 2ˣ. They already stand in this order at x = 10, and the gaps only grow.'), r);
    t.ok('a fix is not a first check', /0 ranked right on the first check this visit\.$/.test(r), r);
    t.ok('the functions are shut', await t.ev(() => [...document.querySelectorAll('#hzrStops button')].every(b => b.disabled)));
    t.eq('a fix is found', await found(t), ['fix']);
    t.ok('with a toast', /✓ A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a late winner, two bases and x ln x ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`race ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('zpBox').innerText)).startsWith(`Race ${i + 1} of 6:`) && /0 of 4 placed\./.test(await read(t)));
      await tapAll(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('hzrCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) {
        t.ok('a late winner is explained', /x¹⁰ is ahead of 2ˣ at x = 10, but 2ˣ passes it in the end\./.test(await read(t)), await read(t));
        t.eq('and its overtake is drawn in gold', await t.ev(() => [...document.querySelectorAll('#hzrFig [data-k="pass"]')].map(l => l.dataset.f + ' ' + (l.getAttribute('stroke') === FIG_COL.b)).join()), 'e2 true');
      }
    }
    r = await read(t);
    t.ok('the run is counted', /3 ranked right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['base', 'between', 'fix', 'late', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'RACE CALLER / every finish called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hzTab button, #hzrStops button, #hzrCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^At x = 10, from the biggest: \(ln x\)³, x, √x, ln x\. Nothing ranked yet/.test(await t.ev(() => document.querySelector('#hzrFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Step it out by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('stepping by hand comes back', back);
    t.ok('and the race is put away', await t.ev(() => !document.getElementById('hzrStops')));
    t.ok('ranking changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Horizon.tab = 'hand'; UI.go('s-title'); });
  }
};
