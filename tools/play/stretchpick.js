/* Which y? The doubling workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: y(0) and y one stretch on are shown, a later time
 * asked, and four numbers offered; a wrong pick is shut and named as the slip
 * it is, and checked against the factor; the right pick is worked as a power,
 * counts, toasts and deals a new question, and a first try is counted apart.
 * Every button is named, the hand-worked walk steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ypRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => StretchPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#ypPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dbTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'stretchpick',
  title: 'Which y? · pick y a few stretches on under y′ = ky',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the doubling workshop can be turned round', await t.ev(() =>
      /Then turn it round: see y\(0\) and y one stretch on, and pick which of four numbers is y later\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDoubling');
    t.eq('the doubling workshop opens', await t.screen(), 's-double');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(7474));
    await t.tapText(/Which y\?/);
    t.eq('which y is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the stories, the figure, the walk buttons, the readout and the goals step aside', await hidden(t, 'dbSets') && await hidden(t, 'dbFig') && await hidden(t, 'dbWalkRow') && await hidden(t, 'dbRead') && await hidden(t, 'dbGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('ypBox').innerText)).startsWith(
      'y′ = ky multiplies y by the same factor r over every stretch of time of the same length.'));
    t.ok('the two values are shown', /^y′ = ky, y\(0\) = \d+, y\([23]\) = \d+$/.test(await t.ev(() => document.getElementById('ypQ').innerText.trim())), await t.ev(() => document.getElementById('ypQ').innerText));
    const ask = await t.ev(() => [...document.querySelectorAll('#ypBox .small')].map(e => e.innerText.trim())[1]);
    t.ok('and a later time asked', /^Which is y\(\d+(\/2)?\)\?$/.test(ask), ask);
    const labels = await t.ev(() => [...document.querySelectorAll('#ypPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d+(/\\d+)?$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right'), L = 'ABCD'[wrong];
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (adds the same amount every stretch|multiplies the factor by the number of stretches|puts t itself in the exponent|starts from y\\([23]\\) instead of y\\(0\\)|takes half way between|turns the factor upside down)`).test(r), r);
    t.ok('and checked against the factor', new RegExp(`Check ${L}: it (adds|multiplies|takes|is half way|divides) .+\\.`).test(r), r);
    t.ok('and that number is shut and told as not y', await t.ev(i => { const b = document.querySelectorAll('#ypPick button')[i];
      return b.disabled && /\. Not y\(\d+(\/2)?\)$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(StretchPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked as a power', /^That was it: t = \d+(\/2)? is .+ of [23], and r = \d+ ÷ \d+ = \d+(\/\d+)?, so y\(\d+(\/2)?\) = \d+ × .+ = \d+(\/\d+)?\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is y, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new question with all four open', await t.ev(() => [...document.querySelectorAll('#ypPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(StretchPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = StretchPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#ypPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'STRETCH READER / 5 growths read');

    // --- every button is named, it fits, and the hand-worked walk comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dbTab button, #ypPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#ypPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Walk it by hand/);
    t.ok('the walk comes back, with its stories, figure and goals', !(await hidden(t, 'dbSets')) && !(await hidden(t, 'dbFig')) && !(await hidden(t, 'dbWalkRow')) && !(await hidden(t, 'dbGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('ypPick')));
    t.ok('which y changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Doubling.tab = 'hand'; UI.go('s-title'); });
  }
};
