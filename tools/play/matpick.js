/* Which matrix? The matrix workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a shape is drawn dashed and four matrices offered,
 * one of which makes it; a wrong pick is shut, drawn in gold over the shape,
 * and explained as the slip it is; the right pick counts, toasts and deals a
 * new shape, and picking on the first try is counted apart. Every button is
 * named, the steppers step aside, the other modes come back, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('wsRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => MatPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#mpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#wsMode button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const drawn = t => t.ev(() => {
  let spec = null; const render = Figure.render;
  Figure.render = function (s, ...r) { spec = s; return render.call(this, s, ...r); };
  try { Workshop.render(); } finally { Figure.render = render; }
  return { m: spec.m, ghost: spec.ghost, caption: spec.caption };
});

module.exports = {
  name: 'matpick',
  title: 'Which matrix? · pick the matrix that makes a shape',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Odile');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a shape, and pick which of four matrices makes it\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeWorkshop');
    t.eq('the matrix workshop opens', await t.screen(), 's-workshop');
    t.eq('free play is the pressed mode', await pressed(t), 'true,false,false,false');

    await t.ev(() => R.seed(4242));
    await t.tapText(/Which matrix\?/);
    t.eq('which matrix is now the pressed mode', await pressed(t), 'false,false,true,false');
    t.ok('the steppers and the goals step aside', await hidden(t, 'wsMat') && await hidden(t, 'wsBtns') && await hidden(t, 'wsGoalPanel'));
    t.eq('the rule is stated before anything is asked', await t.ev(() => document.getElementById('wsTask').innerText.trim()),
      'Each column of a matrix is where an arrow lands: the first column is where î ends, the second where ĵ ends. Which matrix makes the dashed shape?');
    const labels = await t.ev(() => [...document.querySelectorAll('#mpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four matrices are offered', labels.length, 4);
    t.ok('each is named and read out row by row', labels.every((l, i) => new RegExp(`^Matrix ${'ABCD'[i]}: top row \\S+, \\S+; bottom row \\S+, \\S+$`).test(l)), labels.join(' | '));
    let f = await drawn(t);
    const A = await t.ev(() => MatPick.round.A);
    t.ok('the shape is drawn dashed over the square it starts as', JSON.stringify(f.m) === '[[1,0],[0,1]]' && JSON.stringify(f.ghost) === JSON.stringify(A), JSON.stringify(f));
    t.ok('the shape is never given as numbers', !(await t.ev(() => document.getElementById('wsTask').innerText + document.getElementById('wsRead').innerText)).includes('⟨'));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick says where it sends î and ĵ, against the dashed ones', new RegExp(`^Matrix ${'ABCD'[wrong]} sends î to ⟨\\S+, \\S+⟩ and ĵ to ⟨\\S+, \\S+⟩, drawn in gold\\. The dashed î ends at ⟨\\S+, \\S+⟩ and the dashed ĵ at ⟨\\S+, \\S+⟩\\.`).test(r), r);
    t.ok('and names the slip', /(It is the transpose|It has the right two columns in the wrong order|It swaps each arrow's across and up|One number has the wrong sign)/.test(r), r);
    f = await drawn(t);
    t.ok('the wrong pick is drawn in gold over the shape', JSON.stringify(f.m) === JSON.stringify(await t.ev(i => MatPick.round.opts[i].M, wrong)) && /^Gold is where that matrix sends the square/.test(f.caption), JSON.stringify(f));
    t.ok('and that matrix is shut', await t.ev(i => document.querySelectorAll('#mpPick button')[i].disabled, wrong));
    t.ok('and told as not this one', /\. Not this one$/.test(await t.ev(i => document.querySelectorAll('#mpPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    await opt(t, k.indexOf('right'));
    r = await read(t);
    t.ok('the right pick is explained by its columns', /^That was it: î lands on ⟨\S+, \S+⟩, the first column, and ĵ on ⟨\S+, \S+⟩, the second\. Here is a new shape\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ Matrix ${'ABCD'[k.indexOf('right')]} makes the shape, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new shape with all four matrices open', await t.ev(() => [...document.querySelectorAll('#mpPick button')].every(b => !b.disabled)));
    t.ok('which is drawn over the plain square again', JSON.stringify((await drawn(t)).m) === '[[1,0],[0,1]]');

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = MatPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#mpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'MATRIX SPOTTER / 5 matrices picked');

    // --- every button is named, it fits, and the other modes come back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#mpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#mpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four matrices sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());
    const cols = await t.ev(() => [...document.querySelectorAll('#mpPick .mpMat i')].slice(0, 4).map(i => i.className).join());
    t.eq('the columns carry î and ĵ\'s colours', cols, 'c0,c1,c0,c1');

    await t.tapText(/Match the shape/);
    t.ok('match the shape comes back, with its steppers', !(await hidden(t, 'wsMat')) && /Read where the dashed/.test(await t.ev(() => document.getElementById('wsTask').innerText)));
    t.ok('and the four matrices are put away', await t.ev(() => !document.getElementById('mpPick')));
    await t.tapText(/Free play/);
    t.ok('free play brings the goals and buttons back', !(await hidden(t, 'wsGoalPanel')) && !(await hidden(t, 'wsBtns')) && await hidden(t, 'wsTask'));
    t.ok('which matrix changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); UI.go('s-title'); });
  }
};
