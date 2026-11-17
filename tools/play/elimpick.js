/* Which k? The elimination workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: two rows are shown and four numbers offered; a
 * wrong pick is shut, named as the slip it is and worked through row 2's x
 * coefficient; the right pick counts, toasts, clears x, carries on to y and x,
 * and deals new rows, and a first try is counted apart. Every button is named,
 * the hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('epRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ElimPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#epPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#elTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['elSys', 'elRows', 'elK', 'elOps', 'elFig', 'elRead', 'elGoalPanel'];

module.exports = {
  name: 'elimpick',
  title: 'Which k? · pick the multiplier that clears x',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the elimination workshop can be turned round', await t.ev(() =>
      /Then turn it round: see two rows, and pick which of four numbers k clears x\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeElim');
    t.eq('the elimination workshop opens', await t.screen(), 's-elim');
    t.eq('row operations by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which k\?/);
    t.eq('which k is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the systems, rows, k, operations, drawing, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('epBox').innerText)).startsWith(
      'To clear x out of row 2, add k times row 1 to it.'));
    t.ok('both rows are shown', /^row 1: .+ = −?\d+ row 2: .+ = −?\d+$/.test(await t.ev(() => document.getElementById('epRows').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#epPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: k = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (leaves the minus sign off|is the fraction upside down|is row 2's x coefficient with nothing divided out|is the k that clears y)`).test(r), r);
    t.ok('and worked through row 2\'s x coefficient', new RegExp(`Check ${L}: row 2 \\+ \\(?${N}\\)? × row 1 leaves x with −?\\d+ \\+ \\(?${N}\\)? × \\(?−?\\d+\\)? = ${N}, not 0, so x is still in row 2\\.`).test(r), r);
    t.ok('and that number is shut and told as not clearing x', await t.ev(i => { const b = document.querySelectorAll('#epPick button')[i];
      return b.disabled && /\. Does not clear x$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ElimPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick clears x and carries on to y and x', new RegExp(`^That was it: row 2 \\+ \\(?${N}\\)? × row 1 leaves x with .+ = 0, and y with .+ = ${N}, so row 2 becomes (?:−?\\d*|\\(${N}\\))y = ${N} and y = .+ = −?\\d+\\. Put y = −?\\d+ back in row 1: −?\\d?x = .+ = −?\\d+, so x = −?\\d+\\. Here is a new pair of rows\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} clears x, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and new rows with all four open', await t.ev(() => [...document.querySelectorAll('#epPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(ElimPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ElimPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#epPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'ROW CLEARER / 5 rows cleared');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#elTab button, #epPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#epPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Row operations by hand/);
    let back = true; for (const id of ['elSys', 'elRows', 'elK', 'elOps', 'elFig', 'elGoalPanel']) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its systems, rows, k, operations, drawing and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('epPick')));
    t.ok('which k changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Elim.tab = 'hand'; UI.go('s-title'); });
  }
};
