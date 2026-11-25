/* How long? The arrow workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: u, v and k shown and four lengths offered; a wrong
 * pick is shut, named as the slip it is and checked by Pythagoras backwards,
 * its square not w₁² + w₂²; the right pick counts, toasts, works the length
 * through and deals a new pair, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('awRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ArrowPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#awPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#vwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '(\\d+|√\\d+)';
const AWAY = ['vwSets', 'vwFig', 'vwKRow', 'vwAddRow', 'vwRead', 'vwGoalPanel'];

module.exports = {
  name: 'arrowpick',
  title: 'How long? · pick the length of k·u + v',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the arrow workshop can be turned round', await t.ev(() =>
      /Then turn it round: see u, v and k, and pick which of four lengths is the length of k·u \+ v\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeArrow');
    t.eq('the arrow workshop opens', await t.screen(), 's-arrow');
    t.eq('building by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(7243));
    await t.tapText(/How long\?/);
    t.eq('how long is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the pairs, the figure, the k buttons, the add button, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('awBox').innerText)).startsWith(
      'Stretch u by k: every part of u is multiplied by k.'));
    const q = await t.ev(() => document.getElementById('awQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('u, v and k are shown', /^u = ⟨−?\d, −?\d⟩, v = ⟨−?\d, −?\d⟩, k = −?\d$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#awPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four lengths are offered', labels.length, 4);
    t.ok('each is named by its length', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by Pythagoras backwards ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (leaves out k and measures u \\+ v|stretches v where k belongs to u|takes v away where it is added|is the length of k·u alone|adds the two parts as lengths|adds the two parts before squaring|takes one square from the other)`).test(r), r);
      t.ok('and checked by Pythagoras backwards', new RegExp(`Check ${L}: (\\d+|\\(√\\d+\\))² = \\d+, so it would need w₁² \\+ w₂² = \\d+\\. But w = −?\\d·⟨−?\\d, −?\\d⟩ \\+ ⟨−?\\d, −?\\d⟩ = ⟨−?\\d+, −?\\d+⟩, and \\(?−?\\d+\\)?² \\+ \\(?−?\\d+\\)?² = \\d+\\.`).test(r), r);
      t.ok('and that length is shut and told as not the length of w', await t.ev(i => { const b = document.querySelectorAll('#awPick button')[i];
        return b.disabled && /\. Not the length of w$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ArrowPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the length through', new RegExp(`^That was it: w = −?\\d·⟨−?\\d, −?\\d⟩ \\+ ⟨−?\\d, −?\\d⟩ = ⟨−?\\d+, −?\\d+⟩ \\+ ⟨−?\\d, −?\\d⟩ = ⟨−?\\d+, −?\\d+⟩, and ‖w‖ = √\\(\\(?−?\\d+\\)?² \\+ \\(?−?\\d+\\)?²\\) = √\\d+( = \\d+)?\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the length of w, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four open', await t.ev(() => [...document.querySelectorAll('#awPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(ArrowPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ArrowPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#awPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'ARROW MEASURER / 5 arrows measured');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#vwTab button, #awPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its pairs, figure, k buttons, add button, readout and goals', back);
    t.ok('and the four lengths are put away', await t.ev(() => !document.getElementById('awPick')));
    t.ok('how long changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Arrow.tab = 'hand'; UI.go('s-title'); });
  }
};
