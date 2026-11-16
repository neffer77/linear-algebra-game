/* Which A⁻¹? The undo workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: A is drawn and four matrices offered; a wrong pick
 * is shut, named as the slip it is and followed through the arrow that does
 * not come home; the right pick counts, toasts, sends both arrows home and
 * deals a new A, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('uiRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => UndoPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#uiPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#uvTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'undopick',
  title: 'Which A⁻¹? · pick the undo out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the undo workshop can be turned round', await t.ev(() =>
      /Then turn it round: see A, and pick which of four matrices is A⁻¹\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeUndo');
    t.eq('the undo workshop opens', await t.screen(), 's-undo');
    t.eq('building B by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(6161));
    await t.tapText(/Which A⁻¹\?/);
    t.eq('which A⁻¹ is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the matrices, B, the drawing, the readout and the goals step aside',
      await hidden(t, 'uvMats') && await hidden(t, 'uvBLabel') && await hidden(t, 'uvB') && await hidden(t, 'uvFig') && await hidden(t, 'uvRead') && await hidden(t, 'uvGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('uiBox').innerText)).startsWith(
      'For A with rows a, b and c, d, the undo is A⁻¹ = (1/det A)·[d −b; −c a]'));
    t.ok('A is drawn and read out', await t.ev(() => { const a = document.getElementById('uiA');
      return /^A has rows −?\d, −?\d and −?\d, −?\d$/.test(a.getAttribute('aria-label')) && a.querySelectorAll('.mtx .col').length === 2; }));
    const labels = await t.ev(() => [...document.querySelectorAll('#uiPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four matrices are offered', labels.length, 4);
    t.ok('each is named by its rows', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: rows −?\\d, −?\\d and −?\\d, −?\\d$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (leaves a and d where they were|swaps a and d but leaves b and c with their signs|is A turned on its side|swaps a and d and changes the signs of b and c, but forgets to divide)`).test(r), r);
    t.ok('and followed through the arrow that does not come home', new RegExp(`Check ${L} the way B is checked: ${L} sends A[îĵ] = ⟨.+⟩ to ⟨.+⟩ = ⟨−?\\d+, −?\\d+⟩, but [îĵ] has to come back to ⟨[01], [01]⟩\\. det A = .+ = −?1, so A⁻¹ = \\(1/\\(?−?1\\)?\\)·\\[.+\\], with rows .+\\.`).test(r), r);
    t.ok('and that matrix is shut and told as not A⁻¹', await t.ev(i => { const b = document.querySelectorAll('#uiPick button')[i];
      return b.disabled && /\. Not A⁻¹$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const a0 = await t.ev(() => JSON.stringify(UndoPick.round.A));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick sends both arrows home', /^That was it: det A = .+ It sends Aî = ⟨.+⟩ = ⟨1, 0⟩, and it sends Aĵ = ⟨.+⟩ = ⟨0, 1⟩: both come home\. Here is a new A\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} is A⁻¹, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new A with all four open', await t.ev(() => [...document.querySelectorAll('#uiPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(UndoPick.round.A)) !== a0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = UndoPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#uiPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'INVERSE READER / 5 undos picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#uvTab button, #uiPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#uiPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four matrices sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Build B by hand/);
    t.ok('the hand workshop comes back, with its matrices, B, drawing and goals', !(await hidden(t, 'uvMats')) && !(await hidden(t, 'uvB')) && !(await hidden(t, 'uvFig')) && !(await hidden(t, 'uvGoalPanel')));
    t.ok('and the four matrices are put away', await t.ev(() => !document.getElementById('uiPick')));
    t.ok('which A⁻¹ changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Undo.tab = 'hand'; UI.go('s-title'); });
  }
};
