/* Row moves. The cofactor workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: the plain matrix opens with the tally at 1 and the
 * entries below its diagonal still to clear; taking R1 from R2 twice is an
 * addition, which leaves the tally alone and is found; three more additions
 * leave it triangular, and det A = −6 is read off the diagonal, by additions
 * alone; halving row 1 of the shared-factor matrix doubles the tally; on the
 * matrix with a 0 in its corner a swap is called for and flips the tally, and
 * working it down brings det A = −22 and the banner. Undo takes a move back,
 * the row being changed cannot also be the row used, every button is named,
 * it fits a phone, the hands-on workshop comes back, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('rwRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#rwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const tally = t => t.ev(() => document.getElementById('rwTally').innerText.trim());
const pressed = t => t.ev(() => [...document.querySelectorAll('#cfTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
// press, in order: ['t', i] picks the row to change, ['s', i] the row to use, ['set', i] a matrix, a move name a move
const press = (t, ...steps) => t.ev(steps => { for (const s of steps) {
  const b = Array.isArray(s) ? document.querySelectorAll(s[0] === 't' ? '#rwT button' : s[0] === 's' ? '#rwS button' : '#rwSets button')[s[1]]
    : s === 'undo' ? document.getElementById('rwUndo') : document.querySelector(`#rwMoves button[data-move="${s}"]`);
  b.click(); } }, steps);
const AWAY = ['cfSets', 'cfFig', 'cfLines', 'cfRead', 'cfGoalPanel'];

module.exports = {
  name: 'rowmoves',
  title: 'Row moves · work a matrix down and keep track of its determinant',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Elaine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the cofactor workshop can use row moves', await t.ev(() =>
      /Or swap, scale and add rows, and track what each move does to det\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCof');
    t.eq('the cofactor workshop opens', await t.screen(), 's-cof');
    t.eq('expanding by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Row moves/);
    t.eq('row moves is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the hands-on workshop steps aside', away);

    // --- the plain matrix, as it opens ---
    let r = await read(t);
    t.ok('the rules come first', /^A has rows 1, 2, −1; 2, 5, 1 and −1, 1, 4\. Row moves change a determinant in set ways: swapping two rows flips its sign/.test(r), r);
    t.ok('nothing has been moved yet', /Pick a row to change, a row to use, and a move\. Now M has rows 1, 2, −1; 2, 5, 1 and −1, 1, 4, and det A = det M\./.test(r), r);
    t.ok('and three entries are left to clear', /entries \(2, 1\), \(3, 1\) and \(3, 2\) below the diagonal are still to clear\.$/.test(r), r);
    t.eq('the tally starts at 1', await tally(t), 'det A = det M');
    t.ok('R2 is changed with R1 to start', await t.ev(() => document.querySelector('#rwMoves button[data-move="minus"]').innerText === 'R2 − R1'));
    t.ok('the row being changed cannot be used as well', await t.ev(() => document.querySelectorAll('#rwS button')[1].disabled));
    t.eq('undo is off before a move', await t.ev(() => document.getElementById('rwUndo').disabled), true);
    t.eq('nothing is found yet', await found(t), []);

    // --- additions, down to triangular ---
    await press(t, 'minus', 'minus');
    r = await read(t);
    t.ok('an addition leaves the tally alone', /You took R1 from R2\. Adding a multiple of one row to another leaves the determinant as it was, so the tally stays at 1\./.test(r), r);
    t.ok('and M is read again', /Now M has rows 1, 2, −1; 0, 1, 3 and −1, 1, 4/.test(r), r);
    t.eq('adding rows is found', await found(t), ['free']);
    t.ok('with a toast', /✓ Adding rows is free/.test(await toast(t)), await toast(t));
    const cell = await t.ev(() => document.querySelector('#rwFig g[data-i="1"][data-j="0"] rect').getAttribute('stroke'));
    await press(t, ['t', 2], 'plus', ['s', 1], 'minus', 'minus');
    t.ok('the cleared entry turns from red', await t.ev(c => document.querySelector('#rwFig g[data-i="1"][data-j="0"] rect').getAttribute('stroke') === c, cell));
    t.ok('an entry still to clear is drawn apart from a cleared one', await t.ev(() =>
      document.querySelector('#rwFig g[data-i="2"][data-j="1"] rect').getAttribute('stroke') !== document.querySelector('#rwFig g[data-i="2"][data-j="0"] rect').getAttribute('stroke')));
    await press(t, 'minus');
    r = await read(t);
    t.ok('triangular, det A is read off the diagonal', /M is triangular, with zeros below its diagonal, so det M is its diagonal multiplied: 1 × 1 × \(−6\) = −6\. That makes det A = det M = −6\./.test(r), r);
    t.ok('and the moves are counted', /6 moves so far: no swaps, no scalings and 6 additions\.$/.test(r), r);
    t.eq('reading the diagonal, by additions alone, is found', await found(t), ['free', 'pure', 'tri']);

    // --- undo ---
    await press(t, 'undo');
    r = await read(t);
    t.ok('undo takes the last move back', /You took the last move back\. Now M has rows 1, 2, −1; 0, 1, 3 and 0, 1, −3/.test(r), r);
    t.ok('and it is not triangular again', /entry \(3, 2\) below the diagonal is still to clear\./.test(r), r);

    // --- a scaling ---
    await press(t, ['set', 2], ['t', 0], 'half');
    r = await read(t);
    t.ok('halving a row doubles the tally', /You halved R1\. That halves the determinant, so the tally doubles to make up for it, from 1 to 2\./.test(r), r);
    t.eq('the tally over the grid says so', await tally(t), 'det A = 2 × det M');
    t.eq('scaling is found', await found(t), ['free', 'pure', 'scale', 'tri']);

    // --- a 0 in the corner ---
    await press(t, ['set', 1]);
    r = await read(t);
    t.ok('a 0 on the diagonal calls for a swap', /The diagonal entry \(1, 1\) is 0, so no multiple of row 1 can clear the column beneath it: swap a row with something there into row 1 first\.$/.test(r), r);
    await press(t, ['t', 0], ['s', 1], 'swap');
    r = await read(t);
    t.ok('a swap flips the tally', /You swapped R1 and R2\. A swap flips the sign of the determinant, so the tally flips too, from 1 to −1\./.test(r), r);
    t.eq('and the tally reads −det M', await tally(t), 'det A = −det M');
    t.eq('the swap is found', await found(t), ['flip', 'free', 'pure', 'scale', 'tri']);
    await press(t, ['t', 2], ['s', 0], 'minus', 'minus', ['t', 1], 'half', ['t', 2], ['s', 1], 'plus', 'plus', 'plus', 'plus');
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      try { document.querySelector('#rwMoves button[data-move="plus"]').click(); } finally { Celebrate.banner = real; }
      return seen;
    });
    r = await read(t);
    t.ok('worked down, det A = −22', /1 × 1 × 11 = 11\. That makes det A = \(−2\) × 11 = −22\./.test(r), r);
    t.ok('every kind of move is counted', /9 moves so far: 1 swap, 1 scaling and 7 additions\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['corner', 'flip', 'free', 'pure', 'scale', 'tri']);
    t.eq('the last one found brings a banner', banners.join(), 'MASTER OF ROW MOVES / every rule seen');
    t.ok('the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('rwGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cfTab button, #cfpBox button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the grid is named for a screen reader', await t.ev(() => /^M has rows 1, 3, 2; 0, 1, 2 and 0, 0, 11$/.test(document.querySelector('#rwFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Expand by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hands-on workshop comes back', back);
    t.ok('and the row moves are put away', await t.ev(() => !document.getElementById('rwMoves')));
    t.ok('row moves change nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Cofactor.tab = 'hand'; UI.go('s-title'); });
  }
};
