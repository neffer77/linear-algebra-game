/* Cramer's rule. The elimination workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: the first system is read as columns and det A is
 * worked as the blue parallelogram's area; b in column 1 gives x = −2/(−2) = 1
 * and draws the gold parallelogram; b in column 2 gives y = 2 and the check in
 * both equations; stepping b's second entry down to 10 puts b on the line of
 * a₂ and x = 0, and to 9 turns x negative and dashes the gold parallelogram;
 * the flat system says there is nothing to divide by and brings the banner.
 * The steppers stop at 12, every button is named, it fits a phone, the
 * hands-on workshop comes back, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ecRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ecGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pressed = t => t.ev(() => [...document.querySelectorAll('#elTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const col = (t, i) => t.ev(i => document.querySelectorAll('#ecCol button')[i].click(), i);
const sys = (t, i) => t.ev(i => document.querySelectorAll('#ecSys button')[i].click(), i);
const step = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const gold = t => t.ev(() => { const p = document.querySelector('#ecFig polygon[data-k="Ak"]'); return p ? { pts: p.getAttribute('points'), dash: p.getAttribute('stroke-dasharray') } : null; });
const AWAY = ['elSys', 'elRows', 'elK', 'elOps', 'elFig', 'elRead', 'elGoalPanel'];

module.exports = {
  name: 'elimcramer',
  title: "Cramer's rule · each unknown as a ratio of two areas",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok("the Tome says the elimination workshop can use Cramer's rule", await t.ev(() =>
      /Or read the rows as columns, and find each unknown by Cramer's rule as a ratio of two areas\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeElim');
    t.eq('the elimination workshop opens', await t.screen(), 's-elim');
    t.eq('row operations by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Cramer's rule/);
    t.eq("Cramer's rule is now the pressed mode", await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the row workshop steps aside', away);

    // --- the first system, as columns ---
    let r = await read(t);
    t.ok('it is read as columns', /^The system is x \+ 2y = 5 and 3x \+ 4y = 11\. In columns that is x·a₁ \+ y·a₂ = b, with a₁ = \(1, 3\), a₂ = \(2, 4\) and b = \(5, 11\)\./.test(r), r);
    t.ok('det A is the blue area', /det A = 1 × 4 − 2 × 3 = −2, the signed area of the blue parallelogram on a₁ and a₂\./.test(r), r);
    t.ok('and it asks where b goes', /Put b in column 1 to find x, or in column 2 to find y\.$/.test(r), r);
    t.eq('no gold parallelogram yet', await gold(t), null);
    t.eq('nothing is found yet', await found(t), []);

    // --- x, then y ---
    await col(t, 1);
    r = await read(t);
    t.ok('b in column 1 gives x', /det A_x = 5 × 4 − 2 × 11 = −2, the signed area of the gold parallelogram on b and a₂\. So x = det A_x \/ det A = −2\/\(−2\) = 1\./.test(r), r);
    t.ok('and says why the areas work', /sliding b along a₂ leaves the parallelogram on b and a₂ the same size, so its area is x times the area on a₁ and a₂\.$/.test(r), r);
    t.ok('the gold parallelogram is drawn', !!(await gold(t)));
    t.eq('x is found', await found(t), ['x']);
    t.ok('with a toast', /✓ x is a ratio of areas/.test(await toast(t)), await toast(t));
    await col(t, 2);
    r = await read(t);
    t.ok('b in column 2 gives y', /So y = det A_y \/ det A = −4\/\(−2\) = 2\./.test(r), r);
    t.ok('and both are checked', /Check: x = 1 and y = 2 give 1 × 1 \+ 2 × 2 = 5 and 3 × 1 \+ 4 × 2 = 11, both equations\.$/.test(r), r);
    t.eq('y and both are found', await found(t), ['both', 'x', 'y']);

    // --- move b ---
    await col(t, 1);
    await step(t, 'ecB1Lo');
    r = await read(t);
    t.ok('b on the line of a₂ gives x = 0', /b = \(5, 10\)/.test(r) && /So x = det A_x \/ det A = 0\/\(−2\) = 0\. .*Here x = 0: b lies on the line of a₂, and the gold parallelogram is flat\.$/.test(r), r);
    t.eq('that is found', await found(t), ['both', 'x', 'y', 'zero']);
    await step(t, 'ecB1Lo');
    r = await read(t);
    t.ok('one step on, x is negative', /So x = det A_x \/ det A = 2\/\(−2\) = −1\. .*Here x is negative, so the gold parallelogram turns the other way round from the blue one\.$/.test(r), r);
    t.ok('and the gold parallelogram is dashed', (await gold(t)).dash === '5 3');
    t.eq('a negative x is found', await found(t), ['both', 'neg', 'x', 'y', 'zero']);
    await step(t, 'ecB0Hi', 20);
    t.ok('the stepper stops at 12', await t.ev(() => ElimCramer.B()[0] === 12 && document.getElementById('ecB0Hi').disabled));

    // --- the flat system ---
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      try { document.querySelectorAll('#ecSys button')[2].click(); } finally { Celebrate.banner = real; }
      return seen;
    });
    r = await read(t);
    t.ok('flat columns leave nothing to divide by', /det A = 1 × 4 − 2 × 2 = 0: a₁ and a₂ lie on one line, so the blue parallelogram is flat and there is nothing to divide by\. Here b lies on that line too, so the system has a whole line of solutions, never just one\./.test(r), r);
    t.ok('and x cannot be worked out', /but det A = 0, so x = det A_x \/ det A cannot be worked out\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['both', 'flat', 'neg', 'x', 'y', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), "MASTER OF CRAMER'S RULE / every ratio read");
    await step(t, 'ecB1Hi');
    t.ok('moving b off the line leaves no solution', /Here b is off that line, so no x and y reach it: the system has no solution\./.test(await read(t)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#elTab button, #epBox button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /^a₁ = \(1, 2\), a₂ = \(2, 4\) and b = \(3, 7\) as arrows, with b in column 1$/.test(document.querySelector('#ecFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Row operations by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the row workshop comes back', back);
    t.ok("and Cramer's rule is put away", await t.ev(() => !document.getElementById('ecCol')));
    t.ok("Cramer's rule changes nothing in the save", await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Elim.tab = 'hand'; UI.go('s-title'); });
  }
};
