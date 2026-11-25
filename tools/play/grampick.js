/* Which c? The Gram–Schmidt workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: u₁ and u₂ are shown and four numbers offered; a
 * wrong pick is shut, named as the slip it is and worked through
 * w · u₁ = u₂ · u₁ − c × (u₁ · u₁); the right pick counts, toasts, brings
 * w · u₁ to 0 and deals a new pair, and a first try is counted apart. Every
 * button is named, the hands-on workshop steps aside and comes back, it fits a
 * phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => GramPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#gpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#gsTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';

module.exports = {
  name: 'grampick',
  title: 'Which c? · pick the shadow out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the Gram–Schmidt workshop can be turned round', await t.ev(() =>
      /Then turn it round: see u₁ and u₂, and pick which of four numbers is c\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeGram');
    t.eq('the Gram–Schmidt workshop opens', await t.screen(), 's-gram');
    t.eq('taking copies by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which c\?/);
    t.eq('which c is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the pairs, the drawing, the stepper, the readout and the goals step aside',
      await hidden(t, 'gsSets') && await hidden(t, 'gsFig') && await hidden(t, 'gsStep') && await hidden(t, 'gsRead') && await hidden(t, 'gsGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('gpBox').innerText)).startsWith(
      'Take c copies of u₁ away from u₂, and what is left is w = u₂ − c·u₁.'));
    t.ok('u₁ and u₂ are shown', /^u₁ = ⟨−?\d, −?\d⟩, u₂ = ⟨−?\d, −?\d⟩$/.test(await t.ev(() => document.getElementById('gpU').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#gpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'PQRS'[i]}: c = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'PQRS'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is \\(u₁ · u₁\\)/\\(u₂ · u₁\\), the fraction upside down|is u₂ · u₁ with nothing divided out|divides by u₂ · u₂|is the right size with the wrong sign)`).test(r), r);
    t.ok('and worked through w · u₁', new RegExp(`Check ${L} the way the workshop checks w: u₂ · u₁ = .+ = −?\\d+, and u₁ · u₁ = .+ = \\d+, so with c = ${N}, w · u₁ = u₂ · u₁ − c × \\(u₁ · u₁\\) = .+ = ${N}, not 0: w (still leans along|leans back against) u₁\\.`).test(r), r);
    t.ok('and that number is shut and told as not c', await t.ev(i => { const b = document.querySelectorAll('#gpPick button')[i];
      return b.disabled && /\. Not c$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const p0 = await t.ev(() => JSON.stringify(GramPick.round.P));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick brings w · u₁ to 0', new RegExp(`^That was it: u₂ · u₁ = .+, so c = −?\\d+/\\d+( = ${N})?\\. Then w · u₁ = .+ = 0, and w = u₂ − .+·u₁ = ⟨${N}, ${N}⟩ stands at a right angle to u₁\\. Here is a new pair\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'PQRS'[ri]} is c, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four open', await t.ev(() => [...document.querySelectorAll('#gpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(GramPick.round.P)) !== p0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = GramPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#gpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SHADOW READER / 5 shadows picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gsTab button, #gpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#gpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Take copies by hand/);
    t.ok('the hand workshop comes back, with its pairs, drawing, stepper and goals', !(await hidden(t, 'gsSets')) && !(await hidden(t, 'gsFig')) && !(await hidden(t, 'gsStep')) && !(await hidden(t, 'gsGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('gpPick')));
    t.ok('which c changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Gram.tab = 'hand'; UI.go('s-title'); });
  }
};
