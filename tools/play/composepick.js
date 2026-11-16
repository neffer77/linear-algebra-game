/* Which matrix? Order Matters' second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: A and B are drawn and read out, and four matrices
 * offered, AB among them; a wrong pick is shut and named as the slip it is,
 * its wrong entries turn red, and it is checked at the first of them as a row
 * of B times a column of A; the right pick counts, toasts and deals a new
 * pair, and a first try is counted apart. Every button is named, the
 * hand-worked moves step aside and come back, it fits a phone, and nothing is
 * saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('oqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ComposePick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#oqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#cmTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'composepick',
  title: 'Which matrix? · pick the one move that does A, then B',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says Order Matters can be turned round', await t.ev(() =>
      /Then turn it round: see A and B, and pick which of four matrices does A first, then B\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCompose');
    t.eq('Order Matters opens', await t.screen(), 's-compose');
    t.eq('trying the moves is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(7373));
    await t.tapText(/Which matrix\?/);
    t.eq('which matrix is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the moves, the figure, the readout and the goals step aside', await hidden(t, 'cmFirst') && await hidden(t, 'cmThen') && await hidden(t, 'cmFig') && await hidden(t, 'cmRead') && await hidden(t, 'cmGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('oqBox').innerText)).startsWith(
      'Doing a move A and then a move B is a single move, the matrix BA'));
    t.ok('A and B are drawn and read out', await t.ev(() => { const q = document.getElementById('oqQ');
      return /^First A, with rows \S+, \S+; \S+, \S+, then B, with rows \S+, \S+; \S+, \S+$/.test(q.getAttribute('aria-label')) && q.querySelectorAll('[data-cell]').length === 8; }));
    const labels = await t.ev(() => [...document.querySelectorAll('#oqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four matrices are offered', labels.length, 4);
    t.ok('each is named by its rows', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: rows \\S+, \\S+; \\S+, \\S+$`).test(l)), labels.join(' | '));
    t.ok('AB is among them', (await kinds(t)).includes('order'));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick: AB, the order turned round ---
    let k = await kinds(t);
    const wrong = k.indexOf('order'), L = 'PQRS'[wrong];
    await opt(t, wrong);
    let r = await read(t);
    t.ok('AB is named as the order turned round', r.startsWith(`${L} is AB, the moves the other way round: B first, then A.`), r);
    t.ok('and checked as a row of B times a column of A', new RegExp(`Check ${L} at row \\d, column \\d: it holds −?\\d+\\. That entry of BA is row \\d of B, \\(−?\\d+, −?\\d+\\), times column \\d of A, \\(−?\\d+, −?\\d+\\): .+ = −?\\d+\\.`).test(r), r);
    t.ok('and that matrix is shut and told as not BA', await t.ev(i => { const b = document.querySelectorAll('#oqPick button')[i];
      return b.disabled && /\. Not BA$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('and its wrong entries turn red', await t.ev(i => {
      const b = document.querySelectorAll('#oqPick button')[i], S = ComposePick.round.S, M = ComposePick.mat(S, 'order'), P = ComposePick.mat(S, 'right');
      const want = M.flatMap((row, p) => row.map((x, q) => x !== P[p][q] ? p + ',' + q : null)).filter(Boolean);
      return want.length > 0 && [...b.querySelectorAll('[data-bad]')].map(c => c.dataset.cell).join() === want.join(); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ComposePick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out entry by entry', /^That was it: each entry is a row of B times a column of A\. Row 1, column 1: .+ = −?\d+; row 1, column 2: .+; row 2, column 1: .+; row 2, column 2: .+ = −?\d+\. So BA has rows .+\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} does both, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four open and nothing red', await t.ev(() => [...document.querySelectorAll('#oqPick button')].every(b => !b.disabled) && !document.querySelector('#oqPick [data-bad]'))
      && await t.ev(() => JSON.stringify(ComposePick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ComposePick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#oqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'MOVE MAKER / 5 pairs made one');

    // --- every button is named, it fits, and the moves come back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#cmTab button, #oqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#oqPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four matrices sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Try the moves/);
    t.ok('the moves come back, with the figure and the goals', !(await hidden(t, 'cmFirst')) && !(await hidden(t, 'cmThen')) && !(await hidden(t, 'cmGoalPanel')));
    t.ok('and the four matrices are put away', await t.ev(() => !document.getElementById('oqPick')));
    t.ok('which matrix changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Compose.tab = 'moves'; UI.go('s-title'); });
  }
};
