/* Match the field, the Euler step workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a slope field and four equations are shown and the
 * rule for reading a field is stated first; a wrong pick is shut and caught
 * at one point, with its own dash drawn there beside the field's; the right
 * pick is explained and offers the next field; first tries are counted and
 * the goals found with toasts and a banner. Every button is named, the walk
 * by hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('fmRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#fmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const opt = (t, L) => t.ev(L => document.querySelector(`#fmPick button[data-opt="${L}"]`).click(), L);
const next = t => t.ev(() => document.getElementById('fmNext').click());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#ewTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const AWAY = ['ewSets', 'ewHs', 'ewFig', 'ewWalkRow', 'ewRead', 'ewGoalPanel'];
// the answer to each field, in the order they come round
const ANS = ['A', 'C', 'B', 'C', 'D', 'A', 'B', 'D'];

module.exports = {
  name: 'fieldmatch',
  title: 'Match the field · pick which equation drew a slope field',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Laudine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    await t.tap('tomeEulerWalk');
    t.eq('the Euler step workshop opens', await t.screen(), 's-eulerwalk');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Match the field/);
    t.eq('match the field is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the walk by hand steps aside', away);

    // --- the first field: y′ = x ---
    t.ok('the question is asked', (await t.ev(() => document.getElementById('euBox').innerText)).startsWith('Field 1 of 8. Which equation drew this slope field?'));
    t.eq('81 dashes are drawn', await t.ev(() => document.querySelectorAll('#fmFig line[data-k="dash"]').length), 81);
    const labels = await t.ev(() => [...document.querySelectorAll('#fmPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four equations are offered', labels.join(' | '), 'A: y′ = x | B: y′ = y | C: y′ = x² | D: y′ = x + y');
    let r = await read(t);
    t.ok('the rule comes before any pick', r.startsWith('Each dash is the slope y′ at its point. Read along a row: if the dashes change as you move across, x is in the equation.'), r);
    t.eq('nothing is found before anything is pressed', await found(t), []);

    // --- a wrong pick ---
    await opt(t, 'D');
    r = await read(t);
    t.ok('the wrong pick is caught at one point', r.startsWith('D, y′ = x + y, is not it: at (0, 1) it gives slope 1, but the field’s dash there has slope 0. Its own dash is drawn in blue.'), r);
    t.ok('its own dash and a ring are drawn there', await t.ev(() => !!document.querySelector('#fmFig line[data-k="wrong"][data-x="0"][data-y="1"]') && !!document.querySelector('#fmFig circle[data-k="ring"]')));
    t.ok('and that choice is shut', await t.ev(() => { const b = document.querySelector('#fmPick button[data-opt="D"]'); return b.disabled && b.getAttribute('aria-label') === 'D: y′ = x + y. Not this field'; }));
    t.ok('no next field yet', await t.ev(() => !document.getElementById('fmNext')));
    t.eq('the catch is found', await found(t), ['catch']);
    t.ok('with a toast', /✓ Caught a wrong equation at one dash/.test(await toast(t)), await toast(t));

    // --- the right pick ---
    await opt(t, 'A');
    r = await read(t);
    t.ok('the match is explained', r.startsWith('Yes, this field is y′ = x. Its dashes stay the same all the way up each column, so y′ depends on x alone. The dashes lie flat along the line x = 0, where x is 0. At (1, 2) it gives slope 1, the slope of the dash drawn there.'), r);
    t.ok('a match after a miss is not a first try', /0 matched on the first try this visit\.$/.test(r), r);
    t.ok('the wrong dash is gone', await t.ev(() => !document.querySelector('#fmFig [data-k="wrong"], #fmFig [data-k="ring"]')));
    t.ok('every choice is now shut', await t.ev(() => [...document.querySelectorAll('#fmPick button')].every(b => b.disabled)));
    t.eq('a field of x alone is found', await found(t), ['catch', 'xonly']);

    // --- three first tries in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`field ${i + 1} is dealt`, (await t.ev(() => document.getElementById('euBox').innerText)).startsWith(`Field ${i + 1} of 8.`));
      const b = await t.ev(L => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.querySelector(`#fmPick button[data-opt="${L}"]`).click(); } finally { Celebrate.banner = real; }
        return seen;
      }, ANS[i]);
      banners.push(...b);
    }
    r = await read(t);
    t.ok('the run is counted', /3 matched on the first try this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['both', 'catch', 'one', 'three', 'xonly', 'yonly']);
    t.eq('the last one found brings a banner', banners.join(), 'MASTER OF FIELDS / every slope read');
    t.ok('the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('fmGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ewTab button, #fmPick button, #fmNext')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#fmFig svg').getAttribute('aria-label') === 'A slope field for x and y from −2 to 2, field 4 of 8, drawn by y′ = y²'));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the walk by hand comes back', back);
    t.ok('and the field is put away', await t.ev(() => !document.getElementById('fmPick')));
    t.ok('matching fields changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { EulerWalk.tab = 'hand'; UI.go('s-title'); });
  }
};
