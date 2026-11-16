/* Which split? The two castles workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a rule for how the knights ride shown and four
 * numbers offered; a wrong pick is shut, named as the slip it is and checked
 * by riding one night from it, which still moves the split; the right pick
 * counts, toasts, works the balance through and deals a new rule, and a
 * first try is counted apart. Every button is named, the hands-on workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('kpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SplitPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#kpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#csTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '\\d+(/\\d+)?';
const AWAY = ['csRules', 'csFig', 'csStep', 'csRead', 'csGoalPanel'];

module.exports = {
  name: 'splitpick',
  title: 'Which split? · pick the steady split of two castles',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the two castles workshop can be turned round', await t.ev(() =>
      /Then turn it round: see how the knights ride, and pick which of four numbers is the steady split\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCastles');
    t.eq('the two castles workshop opens', await t.screen(), 's-castles');
    t.eq('running the nights by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(6781));
    await t.tapText(/Which split\?/);
    t.eq('which split is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the rules, the figure, the steppers, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('kpBox').innerText)).startsWith(
      'At the steady split nothing changes, so each night as many knights ride out of A as ride in'));
    const q = await t.ev(() => document.getElementById('kpQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('how the knights ride is shown', /^Each night \d+% of the knights in Castle A ride to B, and \d+% of those in B ride to A\.$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#kpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked by a night ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCD'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (balances it the wrong way round|balances the knights who stay|sets \\d+% of A against \\d+% of all 100 knights|is A after one night from an even 50 and 50|is A after two nights from an even 50 and 50)`).test(r), r);
      t.ok('and checked by riding one night', new RegExp(`Check ${L}: with (${SV}) in A and 100 − \\1 in B, one night sends \\d+% of \\1 = ${SV} out of A and brings \\d+% of \\(100 − \\1\\) = ${SV} in\\. Those do not match, so A (gains|loses) ${SV} that night: the split still moves\\.`).test(r), r);
      t.ok('and that number is shut and told as not the steady split', await t.ev(i => { const b = document.querySelectorAll('#kpPick button')[i];
        return b.disabled && /\. Not the steady split$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(SplitPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the balance through', new RegExp(`^That was it: \\d+ × A = \\d+ × \\(100 − A\\), so A = 100 × \\d+/\\(\\d+ \\+ \\d+\\) = ${SV}\\. Each night \\d+% of ${SV} = (${SV}) ride out of A and \\d+% of ${SV} = \\1 ride in, so nothing changes\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the steady split, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new rule with all four open', await t.ev(() => [...document.querySelectorAll('#kpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(SplitPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SplitPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#kpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'KEEPER OF THE SPLIT / 5 steady splits found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#csTab button, #kpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Run the nights by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its rules, figure, steppers, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('kpPick')));
    t.ok('which split changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Castles.tab = 'hand'; UI.go('s-title'); });
  }
};
