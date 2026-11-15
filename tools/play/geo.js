/* The geometric series workshop: an endless sum.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * halves open on one term, 1 short of the endless sum 2; eight terms close
 * within 0.01 and the staircase reaches the gold line; the thirds close in on
 * 3 after six terms; the swinging series starts over its sum, then drops
 * below it with a red bar going back; and the doubling series has no gold
 * line, runs past 1000 by ten terms and says why a/(1 − r) = −1 is not its
 * sum, which finishes the hunt. The stepper stops at its ends, every button
 * is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gnRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#gnFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#gnGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#gnSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('gnN').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const bars = t => t.ev(() => [...document.querySelectorAll('#gnFig rect[data-k="term"]')]
  .map(r => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width'), fill: r.getAttribute('fill') })));
const goldX = t => t.ev(() => { const l = document.querySelector('#gnFig line[data-k="sum"]'); return l ? +l.getAttribute('x1') : null; });

module.exports = {
  name: 'geo',
  title: 'Geometric series workshop · an endless sum',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the geometric series workshop', await t.showing('tomeGeo'));
    await t.tap('tomeGeo');
    t.eq('and one tap opens it', await t.screen(), 's-geo');

    // --- the halves, one term ---
    let r = await read(t);
    t.ok('it names the series', /Each term is r = 1\/2 times the one before, starting from a = 1: 1 \+ 1\/2 \+ 1\/4 \+ 1\/8 \+ ⋯/.test(r), r);
    t.ok('works the first term', /Term 1 is 1 × \(1\/2\)\^0 = 1, and so far the total is S₁ = 1\./.test(r), r);
    t.ok('finds the endless sum', /\|r\| < 1, so the endless sum is a\/\(1 − r\) = 1\/\(1 − 1\/2\) = 2\./.test(r), r);
    t.ok('and how far there is to go', /S₁ is 1 short of it\. Each new term multiplies that gap by r = 1\/2, so it shrinks toward 0 and the total creeps up on the sum from below\./.test(r), r);
    t.eq('the stepper reads the terms', await shown(t), '1 term');
    t.eq('the caption names the colours', await cap(t), 'Each row is one term, laid end to end from 0: blue adds, red takes away, and the last row ends at the running total. The gold dashed line is the endless sum.');
    t.eq('one bar for one term', (await bars(t)).length, 1);
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- eight terms close in ---
    await press(t, 'gnNHi', 7);
    r = await read(t);
    t.eq('the stepper adds terms', await shown(t), '8 terms');
    t.ok('the total is nearly 2', /Term 8 is 1 × \(1\/2\)\^7 = 1\/128, and the first 8 terms add up to S₈ ≈ 1\.9922\./.test(r), r);
    t.ok('within 0.01', /S₈ is about 0\.0078 short of it\..*That is within 0\.01: every term still to come, an endless tail of them, adds up to less than 0\.01\./.test(r), r);
    t.eq('closing in on the halves is found', await found(t), ['half']);
    t.ok('with a toast', /✓ Closed in on the halves/.test(await toast(t)), await toast(t));
    let B = await bars(t), gx = await goldX(t);
    t.eq('one bar per term', B.length, 8);
    t.ok('the staircase all but reaches the gold line', gx !== null && gx - (B[7].x + B[7].w) > 0 && gx - (B[7].x + B[7].w) < 2, JSON.stringify([B[7], gx]));

    // --- the thirds ---
    await pick(t, 1);
    t.eq('a new series starts on one term', await shown(t), '1 term');
    await press(t, 'gnNHi', 5);
    r = await read(t);
    t.ok('the thirds head for 3', /2\/\(1 − 1\/3\) = 3\./.test(r), r);
    t.ok('and six terms close in', /S₆ ≈ 2\.9959\..*S₆ is about 0\.0041 short of it/.test(r), r);
    t.eq('closing in on the thirds is found', await found(t), ['half', 'third']);

    // --- the swinging series ---
    await pick(t, 2);
    r = await read(t);
    t.ok('a negative r writes real minus signs', /1 − 1\/2 \+ 1\/4 − 1\/8 \+ ⋯/.test(r), r);
    t.ok('and starts over its sum', /1\/\(1 \+ 1\/2\) = 2\/3\. S₁ is about 0\.3333 over it\./.test(r), r);
    await press(t, 'gnNHi', 1);
    r = await read(t);
    t.ok('then drops below it', /S₂ = 0\.5\..*S₂ is about 0\.1667 short of it\. .*changing sides every time: a negative r swings the total above and below the sum in turn\./.test(r), r);
    t.eq('swinging below is found', await found(t), ['half', 'third', 'under']);
    B = await bars(t);
    t.ok('the term that takes away is drawn going back, in another colour', B.length === 2 && B[1].fill !== B[0].fill && B[1].x < B[0].x + B[0].w, JSON.stringify(B));

    // --- the doubling series ---
    await pick(t, 3);
    t.eq('a series that runs away has no gold line', await goldX(t), null);
    await press(t, 'gnNHi', 9);
    r = await read(t);
    t.ok('ten terms pass 1000', /Term 10 is 1 × 2\^9 = 512, and the first 10 terms add up to S₁₀ = 1023\./.test(r), r);
    t.ok('it runs away', /\|r\| = 2 is not less than 1, so each term is bigger than the last and the total runs away without end\./.test(r), r);
    t.ok('and the formula is not its sum', /a\/\(1 − r\) = 1\/\(1 − 2\) = −1 is not the sum: that formula only holds when \|r\| < 1/.test(r), r);
    t.ok('the caption says it is redrawn', /Redrawn to fit as it grows\./.test(await cap(t)), await cap(t));
    t.eq('every goal can be found with the buttons', await found(t), ['half', 'run', 'third', 'under']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('gnGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'gnNHi', 5);
    t.eq('adding stops at 12 terms', await shown(t), '12 terms');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('gnNHi').disabled));
    await press(t, 'gnNLo', 15);
    t.eq('taking away stops at 1 term', await shown(t), '1 term');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('gnNLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Geo.moveN(-1); return Geo.n; }), 1);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-geo .wsCell button, #gnSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each series button reads its start and ratio', await t.ev(() =>
      [...document.querySelectorAll('#gnSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Halves: start at 1, r = 1/2 | Thirds: start at 2, r = 1/3 | Swinging: start at 1, r = −1/2 | Doubling: start at 1, r = 2');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /1 term as a staircase reaching 1/.test(document.querySelector('#gnFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the geometric series workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
