/* Which limit? The L'Hôpital workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a 0/0 ratio is shown and four numbers offered; a
 * wrong pick is shut, named as the slip it is and worked out; the right pick
 * counts, toasts, works both slopes at the point, and deals a new ratio, and
 * a first try is counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hkRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => HopPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#hkPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#hpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const AWAY = ['hpSets', 'hpFig', 'hpStep', 'hpRead', 'hpGoalPanel'];

module.exports = {
  name: 'hoppick',
  title: 'Which limit? · pick where a 0/0 ratio heads',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enid');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the L\'Hôpital workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a 0\/0 ratio, and pick which of four numbers is its limit\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHopital');
    t.eq('the L\'Hôpital workshop opens', await t.screen(), 's-hopital');
    t.eq('closing in by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which limit\?/);
    t.eq('which limit is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the ratios, drawing, h, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('hkBox').innerText)).startsWith(
      'Top and bottom are both 0 at the point x heads for'));
    t.ok('the ratio is shown as a limit', /^lim ?x→−?\d .+ .+$/.test(await t.ev(() => document.getElementById('hkQ').innerText.replace(/\s+/g, ' ').trim())));
    t.ok('and its 0/0 is pointed out', /^At x = −?\d the top is 0 and the bottom is 0\.$/.test(await t.ev(() => document.getElementById('hkZero').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#hkPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} is (the ratio upside down|the ratio of the x² coefficients|f\\(0\\)/g\\(0\\)|f′\\(0\\)/g′\\(0\\))`).test(r), r);
    t.ok('and worked out', new RegExp(`Check ${L}: .+ ${N}(?:/\\(?−?\\d+\\)?)?(?: = ${N})?\\.`).test(r), r);
    t.ok('and that number is shut and told as not the limit', await t.ev(i => { const b = document.querySelectorAll('#hkPick button')[i];
      return b.disabled && /\. Not the limit$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(HopPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works both slopes at the point', new RegExp(`^That was it: f′\\(−?\\d\\) = 2 × .+ = −?\\d+, and g′\\(−?\\d\\) = 2 × .+ = −?\\d+, so the ratio heads for −?\\d+/\\(?−?\\d+\\)?(?: = ${N})?\\. Here is a new ratio\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the limit, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new ratio with all four open', await t.ev(() => [...document.querySelectorAll('#hkPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(HopPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = HopPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#hkPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'LIMIT HUNTER / 5 limits run down');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hpTab button, #hkPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#hkPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its ratios, drawing, h, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('hkPick')));
    t.ok('which limit changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Hopital.tab = 'hand'; UI.go('s-title'); });
  }
};
