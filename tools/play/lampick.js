/* Which λ? The eigenvalue detective's second mode.
 *
 * These checks open the detective from the Tome, switch to the mode, and play
 * it through its buttons: a matrix A is written out and read out, and four
 * pairs of numbers offered, with no curve yet to give the answer away; a
 * wrong pick is shut and named as the slip it is, and det(A − λI) is drawn,
 * with gold rings where it meets the axis and red dots at the wrong pair; the
 * right pick counts, toasts and deals a new matrix, and a first try is
 * counted apart. Every button is named, the hunt steps aside and comes back,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LamPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#lpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dcTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'lampick',
  title: 'Which λ? · pick the eigenvalues of a matrix out of their slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Laudine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the eigenvalue detective can be turned round', await t.ev(() =>
      /Then turn it round: see a matrix, and pick which of four pairs are its eigenvalues\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDetect');
    t.eq('the eigenvalue detective opens', await t.screen(), 's-detect');
    t.eq('hunting them down is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6262));
    await t.tapText(/Which λ\?/);
    t.eq('which λ is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the matrices, the curve, the stepper and the goals step aside', await hidden(t, 'cpSets') && await hidden(t, 'cpMat') && await hidden(t, 'cpFig') && await hidden(t, 'cpStep') && await hidden(t, 'cpRead') && await hidden(t, 'cpGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('dcPick').innerText)).startsWith(
      'An eigenvalue is a λ where det(A − λI) = 0.'));
    t.ok('A is read out', await t.ev(() => !!document.querySelector('#dcPick [aria-label^="A has rows "]')));
    t.ok('and no curve is drawn yet, which would show the answer', await t.ev(() => !document.getElementById('lpFig')));
    const labels = await t.ev(() => [...document.querySelectorAll('#lpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four pairs are offered', labels.length, 4);
    t.ok('each is named as a pair of numbers', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: λ = −?\\d+ and −?\\d+$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (reads the eigenvalues off the diagonal|flips the sign of the trace term|takes the trace and the determinant themselves)`).test(r), r);
    t.ok('and checked on the curve, then worked out', /At λ = −?\d+, det\(A − λI\) = .+ trace = .+ det A = .+ so det\(A − λI\) = λ².+ which is 0 at λ = −?\d+ and λ = −?\d+\. Check: /.test(r), r);
    t.ok('and det(A − λI) drawn, with gold rings and red dots', await t.ev(L => { const s = document.getElementById('lpFig');
      return !!s && !!s.querySelector('[data-k="curve"]') && s.querySelectorAll('[data-k="root"]').length === 2 && s.querySelectorAll(`[data-k="miss-${L}"]`).length === 2
        && new RegExp(`meeting the axis at the gold rings, λ = −?\\d+ and −?\\d+; red dots for ${L}$`).test(s.getAttribute('aria-label')); }, L));
    t.ok('and that pair is shut', await t.ev(i => document.querySelectorAll('#lpPick button')[i].disabled, wrong));
    t.ok('and told as not the eigenvalues', /\. Not the eigenvalues$/.test(await t.ev(i => document.querySelectorAll('#lpPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(LamPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: trace = .+, which is 0 at λ = −?\d+ and λ = −?\d+\. Here is a new matrix\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} are the eigenvalues, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new matrix with all four pairs open and the curve put away', await t.ev(() => [...document.querySelectorAll('#lpPick button')].every(b => !b.disabled) && !document.getElementById('lpFig'))
      && await t.ev(() => JSON.stringify(LamPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LamPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#lpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'EIGENVALUE READER / 5 pairs picked');

    // --- every button is named, it fits, and the hunt comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dcTab button, #lpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#lpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four pairs sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Hunt them down/);
    t.ok('the matrices come back, with the curve, the stepper and the goals', !(await hidden(t, 'cpSets')) && !(await hidden(t, 'cpFig')) && !(await hidden(t, 'cpStep')) && !(await hidden(t, 'cpGoalPanel')));
    t.ok('and the four pairs are put away', await t.ev(() => !document.getElementById('lpPick')));
    t.ok('which λ changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Detect.tab = 'hunt'; UI.go('s-title'); });
  }
};
