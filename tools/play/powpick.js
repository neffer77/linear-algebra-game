/* Which Aⁿv? The diagonal workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a matrix A, its two eigenvectors with their
 * eigenvalues, a vector v built from them, and four vectors offered; a wrong
 * pick is shut, named as the slip it is and checked by writing it in
 * eigenvector parts; the right pick counts, toasts, works Aⁿv out part by
 * part, and deals a new A, and a first try is counted apart. Every button is
 * named, the hands-on workshop steps aside and comes back, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('pwRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => PowPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#pwPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dgTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+';
const V = `\\(${N}, ${N}\\)`;
const P = '\\(?−?\\d+\\)?';
const AWAY = ['dgSets', 'dgFig', 'dgCols', 'dgRead', 'dgGoalPanel'];

module.exports = {
  name: 'powpick',
  title: 'Which Aⁿv? · pick a power of A from its eigenvectors',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the diagonal workshop can be turned round', await t.ev(() =>
      /Then turn it round: pick which of four vectors is Aⁿv, or which of four matrices drew the arrows of x′ = Ax\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDiag');
    t.eq('the diagonal workshop opens', await t.screen(), 's-diag');
    t.eq('building P by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5858));
    await t.tapText(/Which Aⁿv\?/);
    t.eq('which Aⁿv is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the matrices, drawing, columns of P, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('pwBox').innerText)).startsWith(
      'Eigenvectors make powers easy. A only stretches an eigenvector'));
    t.ok('A, its eigenvectors and v are shown', new RegExp(`^A has rows ${V} and ${V}\\. p₁ = ${V} has eigenvalue ${N}, and p₂ = ${V} has eigenvalue ${N}\\. v = −?\\d?p₁ [+−] \\d?p₂ = ${V}\\.$`).test(
      await t.ev(() => document.getElementById('pwQ').innerText.replace(/\s+/g, ' ').trim())));
    const An = await t.ev(() => PowPick.An(PowPick.round.S));
    t.ok('and the power asked for', /^A[²³⁴]v$/.test(An), An);
    const labels = await t.ev(() => [...document.querySelectorAll('#pwPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four vectors are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${V}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (applies A only once|pairs each eigenvalue with the other eigenvector|raises a and b to the|multiplies each eigenvalue by|forgets how much of each eigenvector v holds)`).test(r), r);
    t.ok('and checked in eigenvector parts', new RegExp(`Check ${L}: in eigenvectors, ${V} = ${N}·p₁ \\+ ${P}·p₂\\. A[²³⁴]v must hold ${N}·${P}[²³⁴] of p₁ and ${N}·${P}[²³⁴] of p₂, and ${N} is not ${N}·${P}[²³⁴]\\.`).test(r), r);
    t.ok('and that vector is shut and told as not Aⁿv', await t.ev(([i, An]) => { const b = document.querySelectorAll('#pwPick button')[i];
      return b.disabled && b.getAttribute('aria-label').endsWith('. Not ' + An); }, [wrong, An]));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(PowPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works Aⁿv out part by part', new RegExp(`^That was it: A[²³⁴]v = ${N}·${P}[²³⁴]·p₁ \\+ ${P}·${P}[²³⁴]·p₂ = ${N}·${V} \\+ ${P}·${V} = ${V}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is A[²³⁴]v, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new A with all four open', await t.ev(() => [...document.querySelectorAll('#pwPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(PowPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = PowPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#pwPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'POWER BROKER / 5 powers found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dgTab button, #pwPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#pwPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four vectors sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Build P by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its matrices, drawing, columns of P, readout and goals', back);
    t.ok('and the four vectors are put away', await t.ev(() => !document.getElementById('pwPick')));
    t.ok('which Aⁿv changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Diag.tab = 'hand'; UI.go('s-title'); });
  }
};
