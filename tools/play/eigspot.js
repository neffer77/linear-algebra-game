/* Spot one: the eigenvector hunt's second mode.
 *
 * These checks open the hunt from the Tome, switch to the mode, and play it
 * through its buttons: a matrix is shown and four arrows offered, each drawn
 * with where the matrix sends it; a wrong pick is worked out, shut, drawn in
 * red and explained by how far it is knocked off its line; the right pick
 * counts, toasts and deals a new matrix, and a first try is counted apart.
 * Every button is named, the hand-hunt steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('esRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => EigSpot.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#esPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#egMode button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'eigspot',
  title: 'Spot one · pick the arrow that stays on its line',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the hunt can be turned round', await t.ev(() =>
      /Then turn it round: see four arrows, and spot the one that stays\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeEig');
    t.eq('the eigenvector hunt opens', await t.screen(), 's-eig');
    t.eq('hunting by hand is the pressed mode', await pressed(t), 'true,false,false');
    t.ok('and nothing is spotted yet', await t.ev(() => document.getElementById('egSpot').innerHTML === ''));

    await t.ev(() => R.seed(5151));
    await t.tapText(/Spot one/);
    t.eq('spot one is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the hand-hunt and its goals step aside', await hidden(t, 'egMats') && await hidden(t, 'egVec') && await hidden(t, 'egFig') && await hidden(t, 'egGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('egSpot').innerText)).startsWith(
      'An eigenvector stays on its own line: A may stretch it, shrink it or turn it right round, but never knock it off. Which arrow stays on its dotted line?'));
    const A = await t.ev(() => EigSpot.round.A);
    t.ok('the matrix is read out row by row', await t.ev(A => !!document.querySelector(`#egSpot [role="img"][aria-label="A has rows ${A[0].map(neg).join(', ')} and ${A[1].map(neg).join(', ')}"]`), A));
    const labels = await t.ev(() => [...document.querySelectorAll('#esPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four arrows are offered', labels.length, 4);
    t.ok('each is named with where A sends it', labels.every((l, i) => new RegExp(`^Arrow ${'ABCD'[i]}: v = ⟨\\S+, \\S+⟩, sent to ⟨\\S+, \\S+⟩$`).test(l)), labels.join(' | '));
    t.ok('each panel draws v in green, A·v in gold and v\'s dotted line', await t.ev(() => [...document.querySelectorAll('#esPick svg')].every(s =>
      s.querySelector('[data-k="line"]') && s.querySelector('line[stroke="#57cc7a"]') && s.querySelector('line[stroke="#f2c14e"]'))));
    t.eq('nothing is spotted yet', await read(t), '0 spotted this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is multiplied out', /^A·⟨\S+, \S+⟩ = ⟨.+⟩ = ⟨\S+, \S+⟩\./.test(r), r);
    t.ok('and said how far it is knocked off its line', new RegExp(`That is knocked (about )?\\d+° off the dotted line through ⟨\\S+, \\S+⟩, so arrow ${'ABCD'[wrong]} is not an eigenvector\\.`).test(r), r);
    t.ok('and that arrow is shut and drawn in red', await t.ev(i => { const b = document.querySelectorAll('#esPick button')[i];
      return b.disabled && b.querySelectorAll('[stroke="#e5484d"]').length === 2; }, wrong));
    t.ok('and told as not an eigenvector', /\. Not an eigenvector$/.test(await t.ev(i => document.querySelectorAll('#esPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as spotted', /0 spotted this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out as λ times itself', /^A·⟨\S+, \S+⟩ = .+ = ⟨\S+, \S+⟩\. ⟨\S+, \S+⟩ = \S+ × ⟨\S+, \S+⟩: it stays on its own line(, turned right round)?, so ⟨\S+, \S+⟩ is an eigenvector with λ = \S+\./.test(r), r);
    t.ok('and counted, but not as a first try', /Here is a new matrix\. 1 spotted this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ Arrow ${'ABCD'[ri]} stays on its line, spotted in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new matrix with all four arrows open', await t.ev(() => [...document.querySelectorAll('#esPick button')].every(b => !b.disabled))
      && JSON.stringify(await t.ev(() => EigSpot.round.A)) !== JSON.stringify(A));

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 spotted this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = EigSpot.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#esPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth spot brings a banner', banners.join(), 'EIGEN SPOTTER / 5 eigenvectors spotted');

    // --- every button is named, it fits, and hunting by hand comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#egMode button, #esPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#esPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four arrows sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Hunt by hand/);
    t.ok('hunting by hand comes back, with its matrices, arrow and goals', !(await hidden(t, 'egMats')) && !(await hidden(t, 'egVec')) && !(await hidden(t, 'egGoalPanel')));
    t.ok('and the four arrows are put away', await t.ev(() => !document.getElementById('esPick')));
    t.ok('spot one changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Eigen.mode = 'hunt'; UI.go('s-title'); });
  }
};
