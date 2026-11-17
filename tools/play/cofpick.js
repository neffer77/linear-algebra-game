/* Which det A? The cofactor workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: A is shown and four numbers offered; a wrong pick is
 * shut, named as the slip it is, and the line with the most zeros pointed
 * out; the right pick counts, toasts, works det A along that line and deals a
 * new A, and a first try is counted apart. Every button is named, the hands-on
 * workshop steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('cfpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => CofPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#cfpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#cfTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'cofpick',
  title: 'Which det A? · pick the determinant out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the cofactor workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a 3×3 matrix, and pick which of four numbers is its determinant\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCof');
    t.eq('the cofactor workshop opens', await t.screen(), 's-cof');
    t.eq('expanding by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which det A\?/);
    t.eq('which det A is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the matrices, the grid, the lines, the readout and the goals step aside',
      await hidden(t, 'cfSets') && await hidden(t, 'cfFig') && await hidden(t, 'cfLines') && await hidden(t, 'cfRead') && await hidden(t, 'cfGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('cfpBox').innerText)).startsWith(
      'Expand along any row or column: each entry times its minor'));
    t.ok('A is shown and named row by row', /^A has rows (−?\d, −?\d, −?\d; ){2}/.test(await t.ev(() => document.getElementById('cfpA').getAttribute('aria-label')).then(s => s.replace(' and ', '; '))));
    const labels = await t.ev(() => [...document.querySelectorAll('#cfpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: det A = −?\\d+$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (adds all three terms along row 1 with a \\+ sign|works each minor as ad \\+ bc|multiplies just the diagonal|adds the three diagonals that run down to the right|is det A with its sign flipped)`).test(r), r);
    t.ok('and the quickest line is pointed out', /The quickest line here is (row|column) \d, with (a 0|two zeros) on it: expand along it and only (two minors need|one minor needs) working out\./.test(r), r);
    t.ok('and that number is shut and told as not det A', await t.ev(i => { const b = document.querySelectorAll('#cfpPick button')[i];
      return b.disabled && /\. Not det A$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const a0 = await t.ev(() => JSON.stringify(CofPick.round.A));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works det A along the quickest line', /^That was it: expand along (row|column) \d, where (the 0 needs|the two zeros need) no minor, and det A = .+ = −?\d+\. (The minor of entry \(\d, \d\) is −?\d+ × \(?−?\d+\)? − \(?−?\d+\)? × \(?−?\d+\)? = −?\d+\. )+Here is a new A\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} is det A, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new A with all four open', await t.ev(() => [...document.querySelectorAll('#cfpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(CofPick.round.A)) !== a0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = CofPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#cfpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'DETERMINANT READER / 5 determinants picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cfTab button, #cfpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#cfpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());
    const grid = await t.ev(() => [...document.querySelectorAll('#cfpA span span')].map(s => Math.round(s.getBoundingClientRect().top)));
    t.ok('A is laid out three by three', grid.length === 9 && grid[0] === grid[2] && grid[3] === grid[5] && grid[6] === grid[8] && grid[3] > grid[0] && grid[6] > grid[3], grid.join());

    await t.tapText(/Expand by hand/);
    t.ok('the hand workshop comes back, with its matrices, grid, lines and goals', !(await hidden(t, 'cfSets')) && !(await hidden(t, 'cfFig')) && !(await hidden(t, 'cfLines')) && !(await hidden(t, 'cfGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('cfpPick')));
    t.ok('which det A changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Cofactor.tab = 'hand'; UI.go('s-title'); });
  }
};
