/* The null space workshop: what a matrix crushes.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * flat matrix opens on v = ⟨1, 1⟩ and works Av = ⟨3, 6⟩ row by row, on the gold
 * column-space line; stepping to ⟨2, −1⟩ crushes v to ⟨0, 0⟩ and the red
 * null-space line appears; ⟨−2, 1⟩ is a second crushed arrow on the same line;
 * the steep matrix crushes ⟨1, 2⟩, and ⟨0, 0⟩ is crushed by every matrix; the
 * full-rank matrix has no gold line, says rank 2 and nullity 0, and steers
 * ⟨1, −1⟩ onto ⟨1, 0⟩, which finishes the hunt. The steppers stop at their
 * ends, every button and the drawing are named, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('nsRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#nsFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#nsGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
// the steppers in order: x down, x up, y down, y up
const press = (t, k, n) => t.ev(([k, n]) => { for (let i = 0; i < n; i++) document.querySelectorAll('#nsVec button')[k].click(); }, [k, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#nsSets button')[k].click(), k);
const shown = t => t.ev(() => [...document.querySelectorAll('#nsVec .wsCell b')].map(b => b.innerText).join(','));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const lines = t => t.ev(() => [...document.querySelectorAll('#nsFig svg line[data-k]')].map(l => l.dataset.k).sort().join(','));

module.exports = {
  name: 'null',
  title: 'Null space workshop · what a matrix crushes',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the null space workshop', await t.showing('tomeNull'));
    await t.tap('tomeNull');
    t.eq('and one tap opens it', await t.screen(), 's-null');

    // --- the flat matrix on v = ⟨1, 1⟩ ---
    let r = await read(t);
    t.ok('it names the rows and v', /A has rows ⟨1, 2⟩ and ⟨2, 4⟩, and v = ⟨1, 1⟩\./.test(r), r);
    t.ok('works Av row by row', /Av dots each row with v: ⟨1, 2⟩ · v = 1 × 1 \+ 2 × 1 = 3, and ⟨2, 4⟩ · v = 2 × 1 \+ 4 × 1 = 6\. So Av = ⟨3, 6⟩\./.test(r), r);
    t.ok('says v is not crushed', /Av is not ⟨0, 0⟩, so v is not in the null space: to be crushed, v must dot to 0 with both rows\./.test(r), r);
    t.ok('names the column space', /The second row is 2 times the first, so Av's second entry is always 2 times its first: every Av lands on the gold line through ⟨1, 2⟩\. That line is the column space, so the rank is 1\./.test(r), r);
    t.ok('and counts rank and nullity', /Rank 1 \+ nullity 1 = 2 columns/.test(r), r);
    t.eq('the steppers read v', await shown(t), '1,1');
    t.eq('the gold line is drawn, the null space not yet', await lines(t), 'av,col,v');
    t.eq('the caption names the colours', await cap(t), "On the left, v in blue. On the right, Av in red, drawn to the matrix's own scale. The gold dashed line is everywhere Av can land.");
    t.ok('the drawing is named for a screen reader', await t.ev(() => /Av = ⟨3, 6⟩, on the gold line through ⟨1, 2⟩/.test(document.querySelector('#nsFig svg').getAttribute('aria-label'))));
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- crush one ---
    await press(t, 1, 1);
    await press(t, 2, 2);
    r = await read(t);
    t.eq('v steps to ⟨2, −1⟩', await shown(t), '2,−1');
    t.ok('and is crushed', /So Av = ⟨0, 0⟩\. Av = ⟨0, 0⟩ and v is not ⟨0, 0⟩, so v is in the null space\. Every multiple of v is crushed too, so the null space is the whole line through ⟨2, −1⟩\./.test(r), r);
    t.eq('the flat goal is found', await found(t), ['flat']);
    t.ok('with a toast', /✓ Crushed one on the flat matrix/.test(await toast(t)), await toast(t));
    t.eq('the red null-space line appears', await lines(t), 'av,col,null,v');
    t.ok('and the caption names it', /The red dashed line on the left is the null space\./.test(await cap(t)));

    // --- a second crushed arrow on the same line ---
    await press(t, 0, 4);
    await press(t, 3, 2);
    t.eq('v steps to ⟨−2, 1⟩', await shown(t), '−2,1');
    t.ok('which is crushed as well', /line through ⟨−2, 1⟩/.test(await read(t)));
    t.eq('the line goal is found', await found(t), ['flat', 'line']);

    // --- the steep matrix and the zero arrow ---
    await pick(t, 1);
    t.eq('a new matrix starts on ⟨1, 1⟩', await shown(t), '1,1');
    t.eq('with no null-space line yet', await lines(t), 'av,col,v');
    await press(t, 3, 1);
    r = await read(t);
    t.ok('the steep matrix crushes ⟨1, 2⟩', /⟨2, −1⟩ · v = 2 × 1 \+ \(−1\) × 2 = 0, and ⟨−6, 3⟩ · v = −6 × 1 \+ 3 × 2 = 0/.test(r), r);
    t.ok('its rows go −3 to 1', /The second row is −3 times the first/.test(r), r);
    await press(t, 0, 1);
    await press(t, 2, 2);
    r = await read(t);
    t.ok('⟨0, 0⟩ says nothing about the matrix', /v = ⟨0, 0⟩ lands on ⟨0, 0⟩ for every matrix, so it says nothing about this one: every null space holds it\./.test(r), r);
    t.eq('steep and zero are found', await found(t), ['flat', 'line', 'steep', 'zero']);

    // --- the full-rank matrix ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the full-rank matrix works its determinant', /det A = 2 × 1 − 1 × 1 = 1, not 0, so the rows point different ways and Av can land anywhere in the plane: the rank is 2\./.test(r), r);
    t.ok('and crushes only ⟨0, 0⟩', /Only ⟨0, 0⟩ is crushed, so the nullity is 0: rank 2 \+ nullity 0 = 2 columns, and A has an inverse\./.test(r), r);
    t.eq('it has no gold line', await lines(t), 'av,v');
    t.eq('and the caption leaves it out', await cap(t), "On the left, v in blue. On the right, Av in red, drawn to the matrix's own scale.");
    await press(t, 2, 2);
    t.ok('⟨1, −1⟩ lands on ⟨1, 0⟩', /So Av = ⟨1, 0⟩\./.test(await read(t)));
    t.eq('every goal can be found with the buttons', await found(t), ['flat', 'line', 'reach', 'steep', 'zero']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('nsGoals').innerText)));

    // --- the steppers' ends ---
    await press(t, 0, 10);
    t.eq('the first entry stops at −3', await shown(t), '−3,−1');
    t.ok('and its button is off there', await t.ev(() => document.querySelectorAll('#nsVec button')[0].disabled));
    t.eq('and a step past it changes nothing', await t.ev(() => { Kernel.step('x', -1); return Kernel.x; }), -3);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#nsVec button, #nsSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each matrix button reads its rows', await t.ev(() =>
      [...document.querySelectorAll('#nsSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Flat: rows ⟨1, 2⟩ and ⟨2, 4⟩ | Steep: rows ⟨2, −1⟩ and ⟨−6, 3⟩ | Full rank: rows ⟨2, 1⟩ and ⟨1, 1⟩');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the null space workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
