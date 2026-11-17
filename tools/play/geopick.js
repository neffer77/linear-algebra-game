/* Which sum? The geometric series workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a series is shown with its first terms, a and r,
 * and four numbers offered; a wrong pick is shut, named as the slip it is and
 * checked against S = a + rS; the right pick counts, toasts, works
 * a/(1 − r) and checks it, and deals a new series, and a first try is
 * counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('gqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => GeoPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#gqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#gnTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['gnSets', 'gnFig', 'gnStep', 'gnRead', 'gnGoalPanel'];

module.exports = {
  name: 'geopick',
  title: 'Which sum? · pick where an endless series adds up to',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the geometric series workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a series, and pick which of four numbers is its endless sum\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeGeo');
    t.eq('the geometric series workshop opens', await t.screen(), 's-geo');
    t.eq('adding by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5252));
    await t.tapText(/Which sum\?/);
    t.eq('which sum is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the series, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('gqBox').innerText)).startsWith(
      'An endless geometric series a + ar + ar² + ⋯ with r between −1 and 1 adds up to a/(1 − r)'));
    t.ok('the first four terms are shown', new RegExp(`^${N}( [+−] \\d+(?:/\\d+)?){3} \\+ ⋯$`).test(await t.ev(() => document.getElementById('gqQ').innerText.replace(/\s+/g, ' ').trim())));
    t.ok('with a and r', /^The first term is a = −?\d, and each term is r = −?\d\/\d times the one before\.$/.test(await t.ev(() => document.getElementById('gqAr').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#gqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} is (a\\/\\(1 \\+ r\\)|1\\/\\(1 − r\\)|ar\\/\\(1 − r\\)|a × \\(1 − r\\))`).test(r), r);
    t.ok('and checked against S = a + rS', new RegExp(`Check ${L}: if the sum were ${N}, then a \\+ r × ${N} = −?\\d \\+ \\(?${N}\\)? × \\(?${N}\\)? = ${N}, not ${N}, so S = a \\+ rS does not hold\\.`).test(r), r);
    t.ok('and that number is shut and told as not the sum', await t.ev(i => { const b = document.querySelectorAll('#gqPick button')[i];
      return b.disabled && /\. Not the sum$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(GeoPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works a/(1 − r) and checks it', new RegExp(`^That was it: a\\/\\(1 − r\\) = −?\\d\\/\\(1 − \\(?${N}\\)?\\) = ${N}, and a \\+ r × ${N} = −?\\d \\+ \\(?${N}\\)? × \\(?${N}\\)? = ${N}, the sum again\\. Here is a new series\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the sum, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new series with all four open', await t.ev(() => [...document.querySelectorAll('#gqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(GeoPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = GeoPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#gqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'TAIL TAMER / 5 endless sums found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gnTab button, #gqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#gqPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Add it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its series, drawing, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('gqPick')));
    t.ok('which sum changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Geo.tab = 'hand'; UI.go('s-title'); });
  }
};
