/* Match the map, the downhill workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a contour map and four functions are shown and the
 * rule for reading a map is stated first; a wrong pick is shut and caught at
 * two points on one contour that it gives different values, with its own
 * contour drawn in blue through the first; the right pick is explained and
 * offers the next map; first tries are counted and the goals found with
 * toasts and a banner. Every button is named, the walk by hand steps aside
 * and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cmapRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#cmapGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const opt = (t, L) => t.ev(L => document.querySelector(`#cmapPick button[data-opt="${L}"]`).click(), L);
const next = t => t.ev(() => document.getElementById('cmapNext').click());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#gdTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const AWAY = ['gdEtas', 'gdFig', 'gdStepRow', 'gdRead', 'gdGoalPanel'];
// the answer to each map, in the order they come round
const ANS = ['A', 'C', 'B', 'C', 'D', 'A', 'B', 'D'];

module.exports = {
  name: 'contourmatch',
  title: 'Match the map · pick which function drew a contour map',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says a contour map can be read', await t.ev(() =>
      /Or read a contour map from above and pick which of four functions drew it\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDescent');
    t.eq('the downhill workshop opens', await t.screen(), 's-descent');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Match the map/);
    t.eq('match the map is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the walk by hand steps aside', away);

    // --- the first map: f = x² + y² ---
    t.ok('the question is asked', (await t.ev(() => document.getElementById('dhBox').innerText)).startsWith('Map 1 of 8. Which f(x, y) drew this contour map?'));
    t.eq('five contours are drawn', await t.ev(() => [...document.querySelectorAll('#cmapFig path[data-k="lv"]')].map(p => p.dataset.c).join()), '1,2,4,6,9');
    const labels = await t.ev(() => [...document.querySelectorAll('#cmapPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four functions are offered', labels.join(' | '), 'A: f = x² + y² | B: f = x² − y² | C: f = x² − 2x + y² | D: f = x + y');
    let r = await read(t);
    t.ok('the rule comes before any pick', r.startsWith('Each curve joins the points where f takes one value, like the lines on a hill walker’s map. So two points on the same curve must give the same f.'), r);
    t.eq('nothing is found before anything is pressed', await found(t), []);

    // --- a wrong pick ---
    await opt(t, 'B');
    r = await read(t);
    t.ok('the wrong pick is caught at two points', r.startsWith('B, f = x² − y², is not it: (1, 0) and (0, −1) sit on the same contour here, but it gives 1 at one and −1 at the other. Its own contour through (1, 0) is drawn in blue, and misses (0, −1).'), r);
    t.ok('its own contour and the two points are drawn', await t.ev(() => !!document.querySelector('#cmapFig path[data-k="wrong"][data-c="1"]') && document.querySelectorAll('#cmapFig circle[data-k="p"], #cmapFig circle[data-k="q"]').length === 2));
    t.ok('and that choice is shut', await t.ev(() => { const b = document.querySelector('#cmapPick button[data-opt="B"]'); return b.disabled && b.getAttribute('aria-label') === 'B: f = x² − y². Not this map'; }));
    t.ok('no next map yet', await t.ev(() => !document.getElementById('cmapNext')));
    t.eq('the catch is found', await found(t), ['catch']);
    t.ok('with a toast', /✓ Caught a wrong function at two points/.test(await toast(t)), await toast(t));

    // --- the right pick ---
    await opt(t, 'A');
    r = await read(t);
    t.ok('the match is explained', r.startsWith('Yes, this map is f = x² + y². Its contours are circles round (0, 0). (1, 0) and (−1, 0) both give f = 1, so they sit on the same contour.'), r);
    t.ok('a match after a miss is not a first try', /0 matched on the first try this visit\.$/.test(r), r);
    t.ok('the wrong contour is gone', await t.ev(() => !document.querySelector('#cmapFig [data-k="wrong"], #cmapFig [data-k="p"]')));
    t.ok('every choice is now shut', await t.ev(() => [...document.querySelectorAll('#cmapPick button')].every(b => b.disabled)));
    t.eq('a map of rings is found', await found(t), ['catch', 'ring']);

    // --- three first tries in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`map ${i + 1} is dealt`, (await t.ev(() => document.getElementById('dhBox').innerText)).startsWith(`Map ${i + 1} of 8.`));
      const b = await t.ev(L => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.querySelector(`#cmapPick button[data-opt="${L}"]`).click(); } finally { Celebrate.banner = real; }
        return seen;
      }, ANS[i]);
      banners.push(...b);
    }
    r = await read(t);
    t.ok('the run is counted', /3 matched on the first try this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['catch', 'cross', 'one', 'open', 'ring', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'MAP READER / every contour read');
    t.ok('the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('cmapGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gdTab button, #cmapPick button, #cmapNext')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#cmapFig svg').getAttribute('aria-label') === 'A contour map for x and y from −3 to 3, map 4 of 8, drawn by f = x² + 4y²'));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the walk by hand comes back', back);
    t.ok('and the map is put away', await t.ev(() => !document.getElementById('cmapPick')));
    t.ok('matching maps changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Descent.tab = 'hand'; UI.go('s-title'); });
  }
};
