/* Which Aᵀ? The transpose workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: A is drawn with its main diagonal edged in gold, and
 * four matrices offered; a wrong pick is shut and named as the slip it is,
 * its out-of-place entries turn red, and it is checked against A; the right
 * pick counts, toasts and deals a new A, and a first try is counted apart.
 * Every button is named, the hands-on workshop steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('txRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => TransPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#txPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'transpick',
  title: 'Which Aᵀ? · pick the transpose out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the transpose workshop can be turned round', await t.ev(() =>
      /Then turn it round: see A, and pick which of four matrices is Aᵀ\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTranspose');
    t.eq('the transpose workshop opens', await t.screen(), 's-transpose');
    t.eq('moving by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(7272));
    await t.tapText(/Which Aᵀ\?/);
    t.eq('which Aᵀ is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the matrices, the grids, the readout and the goals step aside', await hidden(t, 'tpSets') && await hidden(t, 'tpFig') && await hidden(t, 'tpRead') && await hidden(t, 'tpGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('txBox').innerText)).startsWith(
      'The transpose Aᵀ turns each row of A into a column'));
    t.ok('A is drawn and read out', await t.ev(() => { const a = document.getElementById('txA');
      return /^A is [23]×[23], with rows /.test(a.getAttribute('aria-label')) && a.querySelectorAll('[data-cell]').length >= 4; }));
    t.ok('its main diagonal is edged in gold', await t.ev(() => [...document.querySelectorAll('#txA [data-cell]')]
      .every(c => { const [p, q] = c.dataset.cell.split(',').map(Number); return (p === q) === /gold/.test(c.getAttribute('style')); })));
    const labels = await t.ev(() => [...document.querySelectorAll('#txPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four matrices are offered', labels.length, 4);
    t.ok('each is named by its shape and rows', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: [23]×[23], with rows \\S`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is A copied as it was|reads A across, row by row|flips A across the other diagonal|turns A a quarter turn)`).test(r), r);
    t.ok('and checked against A', new RegExp(`(Check ${L} at row \\d, column \\d: it holds −?\\d+\\. That slot of Aᵀ takes the entry from row \\d, column \\d of A, which is −?\\d+\\.|${L} is \\d×\\d, but Aᵀ is \\d×\\d\\.) Row 1 of A reads .+ across, so column 1 of Aᵀ reads .+ down\\.`).test(r), r);
    t.ok('and that matrix is shut and told as not Aᵀ', await t.ev(i => { const b = document.querySelectorAll('#txPick button')[i];
      return b.disabled && /\. Not Aᵀ$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('and its entries out of place turn red, unless the shape is wrong', await t.ev(i => {
      const b = document.querySelectorAll('#txPick button')[i], A = TransPick.round.A, M = TransPick.mat(A, TransPick.round.opts[i].k);
      const want = M.length === A[0].length ? M.flatMap((row, p) => row.map((x, q) => x !== A[q][p] ? p + ',' + q : null)).filter(Boolean) : [];
      return [...b.querySelectorAll('[data-bad]')].map(c => c.dataset.cell).join() === want.join(); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const a0 = await t.ev(() => JSON.stringify(TransPick.round.A));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: row 1 of A, .+, stands as column 1, and row 2 of A, .+, stands as column 2.*\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} is Aᵀ, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new A with all four open and nothing red', await t.ev(() => [...document.querySelectorAll('#txPick button')].every(b => !b.disabled) && !document.querySelector('#txPick [data-bad]'))
      && await t.ev(() => JSON.stringify(TransPick.round.A)) !== a0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = TransPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#txPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TRANSPOSE READER / 5 transposes picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tpTab button, #txPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#txPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four matrices sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Move by hand/);
    t.ok('the hand workshop comes back, with its grids and goals', !(await hidden(t, 'tpSets')) && !(await hidden(t, 'tpFig')) && !(await hidden(t, 'tpGoalPanel')));
    t.ok('and the four matrices are put away', await t.ev(() => !document.getElementById('txPick')));
    t.ok('which Aᵀ changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Transpose.tab = 'hand'; UI.go('s-title'); });
  }
};
