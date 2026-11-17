/* Which slope? The hillwalker workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a hill px² + qy², a whole point on it and a heading
 * û of length 1, and four slopes offered; a wrong pick is shut, named as the
 * slip it is and checked by a step of 5 along û, whose rise is 5 times the
 * slope plus the bend; the right pick counts, toasts, works ∇f · û out, and
 * deals a new hill, and a first try is counted apart. Every button is named,
 * the hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dsRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => HillPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#dsPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#hwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+';
const F = '−?\\d+(?:/5)?';
const P = '\\(?−?\\d+(?:/5)?\\)?';
const AWAY = ['hwSets', 'hwFig', 'hwStep', 'hwRead', 'hwGoalPanel'];

module.exports = {
  name: 'hillpick',
  title: 'Which slope? · pick the slope of a hill facing a heading',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the hillwalker workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a hill, a point and a heading, and pick which of four numbers is the slope that way\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHill');
    t.eq('the hillwalker workshop opens', await t.screen(), 's-hill');
    t.eq('walking it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5656));
    await t.tapText(/Which slope\?/);
    t.eq('which slope is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the hills, map, turn buttons, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('dsBox').innerText)).startsWith(
      'The slope facing a heading û of length 1 is ∇f · û.'));
    t.ok('the hill, point and heading are shown', new RegExp(`^Stand at \\(${N}, ${N}\\) on f\\(x, y\\) = −?\\d?x² [+−] \\d?y² and face û = ⟨${F}, ${F}⟩\\.$`).test(
      await t.ev(() => document.getElementById('dsQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#dsPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four slopes are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${F}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (uses ⟨${N}, ${N}⟩, which has length 5, not û|pairs the parts the wrong way round|keeps only the east part|keeps only the north part|forgets the 2 that a square brings down)`).test(r), r);
    t.ok('and checked by a step of 5 along û', new RegExp(`Check ${L}: step 5 along û, from \\(${N}, ${N}\\) to \\(${N}, ${N}\\)\\. f goes from ${N} to ${N}, a rise of ${N}\\. A step that long always rises by 5 × the slope plus the bend ${N} × ${P}² \\+ ${P} × ${P}² = ${N}, so 5 × the slope \\+ ${P} must be ${N}\\. With the slope ${F} that is 5 × ${P} \\+ ${P} = ${N}, not ${N}\\.`).test(r), r);
    t.ok('and that slope is shut and told as not the slope', await t.ev(i => { const b = document.querySelectorAll('#dsPick button')[i];
      return b.disabled && /\. Not the slope$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(HillPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works ∇f · û out', new RegExp(`^That was it: ∇f = ⟨${N}, ${N}⟩ at \\(${N}, ${N}\\), and ∇f · û = ${N} × ${P} \\+ ${P} × ${P} = ${F}\\. A step of 5 along û rises by 5 × ${P} \\+ ${P} = ${N}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the slope, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new hill with all four open', await t.ev(() => [...document.querySelectorAll('#dsPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(HillPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = HillPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#dsPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TRAIL READER / 5 slopes read');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hwTab button, #dsPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#dsPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four slopes sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its hills, map, turn buttons, readout and goals', back);
    t.ok('and the four slopes are put away', await t.ev(() => !document.getElementById('dsPick')));
    t.ok('which slope changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Hill.tab = 'hand'; UI.go('s-title'); });
  }
};
