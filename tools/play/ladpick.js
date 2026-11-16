/* Which speed? The ladder workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a ladder is shown with x, y, L and the foot's speed,
 * and four numbers offered; a wrong pick is shut, named as the slip it is and
 * checked against x·x′ + y·y′ = 0; the right pick counts, toasts, works
 * y′ = −x·x′/y and checks it, and deals a new ladder, and a first try is
 * counted apart. Every button is named, the hands-on workshop steps aside and
 * comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lzRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LadPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#lzPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#ldTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['ldSets', 'ldFig', 'ldStep', 'ldRead', 'ldGoalPanel'];

module.exports = {
  name: 'ladpick',
  title: 'Which speed? · pick how fast a ladder\'s top falls',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the ladder workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a ladder, and pick which of four numbers is the top's speed\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLadder');
    t.eq('the ladder workshop opens', await t.screen(), 's-ladder');
    t.eq('sliding by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5252));
    await t.tapText(/Which speed\?/);
    t.eq('which speed is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the ladders, drawing, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('lzBox').innerText)).startsWith(
      'The ladder never changes length, so x² + y² = L² at every moment.'));
    t.ok('the ladder is shown with x, x′ and y', /^A \d+ m ladder: its foot is x = \d+ m out, sliding away at x′ = \d m\/s, and its top is y = \d+ m up\.$/.test(
      await t.ev(() => document.getElementById('lzQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#lzPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N} m/s$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} is (x·x′\\/y|−y·x′\\/x|−x\\/y|−x′|−x·x′\\/L)`).test(r), r);
    t.ok('and checked against x·x′ + y·y′ = 0', new RegExp(`Check ${L}: if y′ were ${N}, then x·x′ \\+ y·y′ = \\d+ × \\d \\+ \\d+ × \\(?${N}\\)? = ${N}, not 0, so the ladder would be changing length\\.`).test(r), r);
    t.ok('and that number is shut and told as not the speed', await t.ev(i => { const b = document.querySelectorAll('#lzPick button')[i];
      return b.disabled && /\. Not the top's speed$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(LadPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works y′ = −x·x′/y and checks it', new RegExp(`^That was it: y′ = −x·x′\\/y = −\\d+ × \\d\\/\\d+ = ${N} m\\/s, and x·x′ \\+ y·y′ = \\d+ × \\d \\+ \\d+ × \\(?${N}\\)? = 0: the ladder keeps its length\\. Here is a new ladder\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the top's speed, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new ladder with all four open', await t.ev(() => [...document.querySelectorAll('#lzPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(LadPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LadPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#lzPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'LADDER READER / 5 falling tops timed');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ldTab button, #lzPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#lzPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Slide it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its ladders, drawing, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('lzPick')));
    t.ok('which speed changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Ladder.tab = 'hand'; UI.go('s-title'); });
  }
};
