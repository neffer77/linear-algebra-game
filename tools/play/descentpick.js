/* Which step? The downhill workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a valley, a start and a step size shown and four
 * numbers offered; a wrong pick is shut, named as the slip it is and checked
 * backwards, by the slope its step would need, which is not the slope there;
 * the right pick counts, toasts, works the step through and deals a new
 * valley, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dhRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => DescentPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#dhPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#gdTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(/\\d+)?';
const AWAY = ['gdEtas', 'gdFig', 'gdStepRow', 'gdRead', 'gdGoalPanel'];

module.exports = {
  name: 'descentpick',
  title: 'Which step? · pick where one step of gradient descent lands',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the downhill workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a valley, a start and a step size, and pick which of four numbers one step lands on\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDescent');
    t.eq('the downhill workshop opens', await t.screen(), 's-descent');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(7151));
    await t.tapText(/Which step\?/);
    t.eq('which step is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the step sizes, the figure, the step buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('dhBox').innerText)).startsWith(
      'Walk downhill: the slope f′(x) points uphill, so a step goes the other way.'));
    const q = await t.ev(() => document.getElementById('dhQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the valley, the start and the step size are shown', /^f\(x\) = \d?(x²|\(x [+−] \d\)²)( [+−] \d)?, from x = −?\d, with η = \d\/\d+$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#dhPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by the slope their step would need ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (steps up the slope, to x \\+ η·f′\\(x\\)\\.|forgets the 2 that the square brings down\\.|takes a whole slope's worth of step|steps by the height, η·f\\(x\\)|is the step on its own, −η·f′\\(x\\)|divides the slope by η = \\d/\\d+ where it should multiply|drops the −?\\d from the slope)`).test(r), r);
      t.ok('and checked by the slope its step would need', new RegExp(`Check ${L}: a step from −?\\d to ${SV} moves ${SV}, so the slope behind it would be \\(−?\\d − \\(?${SV}\\)?\\) ÷ \\(\\d/\\d+\\) = ${SV} ÷ \\(\\d/\\d+\\) = ${SV}, but the slope at −?\\d is f′\\(−?\\d\\) = −?\\d+\\.`).test(r), r);
      t.ok('and that number is shut and told as not where the step lands', await t.ev(i => { const b = document.querySelectorAll('#dhPick button')[i];
        return b.disabled && /\. Not where the step lands$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(DescentPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the step through', new RegExp(`^That was it: f′\\(−?\\d\\) = 2 × \\d × \\(?−?\\d\\)? = −?\\d+, so the step is \\(\\d/\\d+\\) × \\(?−?\\d+\\)? = ${SV}, and −?\\d − \\(?${SV}\\)? = ${SV}\\. f fell from −?\\d+ to ${SV}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is where the step lands, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new valley with all four open', await t.ev(() => [...document.querySelectorAll('#dhPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(DescentPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = DescentPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#dhPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'VALLEY STEPPER / 5 steps landed');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gdTab button, #dhPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its step sizes, figure, step buttons, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('dhPick')));
    t.ok('which step changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Descent.tab = 'hand'; UI.go('s-title'); });
  }
};
