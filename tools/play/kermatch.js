/* Match the crush: the null space workshop's third mode.
 *
 * These checks open the null space workshop from the Tome, switch to the
 * mode, and play it through its buttons: four flat matrices and four arrows,
 * each arrow in its own pane, and the rule stated first; each matrix is
 * matched to an arrow, and the check stays shut until all four are; a check
 * with slips rings the arrows picked wrongly and multiplies them out; fixing
 * them and checking again gives every pane its matrix and its column line;
 * first checks are counted and the goals found with toasts and a banner.
 * Every button is named, the hands-on workshop steps aside and comes back,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('kmRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#kmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#nsTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('kmCheck').click());
const next = t => t.ev(() => document.getElementById('kmNext').click());
// tap an arrow for each matrix, 1 to 4, the way a player would; '.' leaves a matrix as it is
const matchAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#kmStops .kmStop[data-i="${i}"] button[data-n="${+c - 1}"]`).click(); });
}, calls);
const AWAY = ['nsSets', 'nsVec', 'nsFig', 'nsRead', 'nsGoalPanel'];
// each round matched right, in the order the rounds come round
const ANS = ['2413', '3241', '3142', '4312'];

module.exports = {
  name: 'kermatch',
  title: 'Match the crush · match four flat matrices to the arrows they crush',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the crushes can be matched', await t.ev(() =>
      /Or match them up: four flat matrices, four arrows, and each matrix to the arrow it crushes\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeNull');
    t.eq('the null space workshop opens', await t.screen(), 's-null');
    await t.tapText(/Match the crush/);
    t.eq('match the crush is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the matrices, v, the drawing, the readout and the goals step aside', away);

    // --- the first round, before anything is matched ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('npBox').innerText)).startsWith('Round 1 of 6: four flat matrices and four arrows. Which arrow does each matrix crush to ⟨0, 0⟩?'));
    let r = await read(t);
    t.ok('the rule comes before anything is matched', r.startsWith('Each matrix here is flat: its second row is a multiple of its first, ⟨a, b⟩. It crushes v to ⟨0, 0⟩ exactly when v dots to 0 with that row'), r);
    t.ok('nothing is matched yet', /0 of 4 matched\./.test(r), r);
    t.eq('four panes, each with its arrow and the line it spans', await t.ev(() => ['pane', 'arrow', 'span', 'num'].map(k => document.querySelectorAll(`#kmFig [data-k="${k}"]`).length).join()), '4,4,4,4');
    t.ok('no letter or column line gives the answer away', await t.ev(() => !document.querySelector('#kmFig [data-k="who"], #kmFig [data-k="col"]')));
    t.ok('each matrix is drawn as a matrix', await t.ev(() => [...document.querySelectorAll('#kmStops .kmStop')].every(s => s.querySelectorAll('.mtx .col').length === 2)));
    t.ok('the check is shut until all four are matched', await t.ev(() => { const b = document.getElementById('kmCheck'); return b.disabled && b.getAttribute('aria-label') === 'Match all four matrices to check them'; }));

    // --- a slip: A and C swapped ---
    await matchAs(t, '1423');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#kmStops .kmStop[data-i="0"] button[data-n="0"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they match', await t.ev(() => document.querySelector('#kmStops .kmStop[data-i="0"] button[data-n="0"]').getAttribute('aria-label') === 'Matrix A crushes arrow 1, ⟨1, −2⟩'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('kmCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slips are caught and multiplied out', r.startsWith('2 of 4 right. Fix the ones in red and check again. For A, A⟨1, −2⟩ = ⟨(−2)(1) + (1)(−2), (−2)(1) + (1)(−2)⟩ = ⟨−4, −4⟩, not ⟨0, 0⟩. A\'s first row is ⟨−2, 1⟩, so it crushes ⟨−1, −2⟩: it lies along arrow 2, ⟨1, 2⟩. You had 1.'), r);
    t.ok('a column line taken for the crush is named', /That arrow is C's column line, where its outputs land, not what it crushes\./.test(r), r);
    t.eq('only the arrows picked wrongly are ringed', await t.ev(() => document.querySelectorAll('#kmFig [data-k="miss"]').length), 2);
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await matchAs(t, '2');
    t.eq('changing a match clears its ring', await t.ev(() => document.querySelectorAll('#kmFig [data-k="miss"]').length), 1);
    await matchAs(t, '..1');
    await check(t);
    r = await read(t);
    t.ok('a column line crushed by another matrix is explained', r.startsWith('Yes: all four are matched. Arrow 2, ⟨1, 2⟩, is C\'s column line, where every output of C lands, yet C sends it to ⟨−4, −8⟩: it is A that crushes it. Where a matrix lands and what it crushes are different lines. The column lines, where the outputs land: A ⟨1, 1⟩, B ⟨1, 1⟩, C ⟨1, 2⟩, D ⟨1, −1⟩.'), r);
    t.ok('a fix is not a first check', /0 matched right on the first check this visit\.$/.test(r), r);
    t.eq('each pane gets the letter of its matrix', await t.ev(() => [...document.querySelectorAll('#kmFig [data-k="who"]')].map(x => x.textContent).join('')), 'CADB');
    t.eq('and that matrix\'s column line', await t.ev(() => document.querySelectorAll('#kmFig [data-k="col"]').length), 4);
    t.ok('the matches are shut', await t.ev(() => [...document.querySelectorAll('#kmStops button')].every(b => b.disabled)));
    t.eq('a fix and a column line are found', await found(t), ['col', 'fix']);
    t.ok('with a toast', /✓ Where A lands is not what A crushes · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a row, a matrix that crushes its own outputs ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('npBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 matched\./.test(await read(t)));
      await matchAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('kmCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('an arrow along a row is explained', /Arrow 2, ⟨2, 1⟩, lies along A's own row, so A⟨2, 1⟩ = ⟨\(−2\)\(2\) \+ \(−1\)\(1\), \(−2\)\(2\) \+ \(−1\)\(1\)⟩ = ⟨−5, −5⟩: a row dotted with itself is never 0\./.test(await read(t)), await read(t));
      if (i === 2) t.ok('a matrix that crushes its own outputs is explained', /C crushes ⟨1, 1⟩, the very line its outputs land on, so doing C twice crushes everything: C² = 0\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 matched right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['col', 'fix', 'one', 'row', 'self', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'CRUSH MATCHER / every arrow matched');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#nsTab button, #kmStops button, #kmCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#kmFig svg').getAttribute('aria-label')), 'The four arrows: 1, ⟨3, 2⟩; 2, ⟨1, 3⟩; 3, ⟨1, −1⟩; 4, ⟨3, −1⟩');
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Set v by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back', back);
    t.ok('and the matches are put away', await t.ev(() => !document.getElementById('kmStops')));
    t.ok('matching changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Kernel.tab = 'hand'; UI.go('s-title'); });
  }
};
