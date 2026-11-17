/* Which limit? The limit workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a ratio and the x it closes in on shown, four
 * numbers and No limit offered; a wrong pick is shut, named as the slip it is
 * and checked; the right pick counts, toasts, works the ratio through and
 * deals a new one, and a first try is counted apart. Every button is named,
 * the hands-on workshop steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lmqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => LimPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#lmqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lmTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const SV = '−?\\d+(?:/\\d+)?';
const AWAY = ['lmFns', 'lmSide', 'lmFig', 'lmMoveRow', 'lmRead', 'lmGoalPanel'];

module.exports = {
  name: 'limpick',
  title: 'Which limit? · pick the limit of a ratio, or that it has none',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the limit workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a ratio and the x it closes in on, and pick its limit, or that it has none\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLimit');
    t.eq('the limit workshop opens', await t.screen(), 's-limit');
    t.eq('closing in by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5150));
    await t.tapText(/Which limit\?/);
    t.eq('which limit is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the formulas, the sides, the figure, the h buttons, the readout and the goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('lmqBox').innerText)).startsWith(
      'Put x = a in first. If the bottom is 0 but the top is not'));
    const q = await t.ev(() => document.getElementById('lmqQ').innerText.replace(/\s+/g, ' ').trim());
    t.ok('the ratio and where x heads are shown', /^f\(x\) = \(.+\)\/\(.+\) as x → −?\d$/.test(q), q);
    const labels = await t.ev(() => [...document.querySelectorAll('#lmqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers and No limit are offered', labels.length, 5);
    t.ok('each is named by what it says', labels.every((l, i) => new RegExp(i === 4 ? '^E: No limit$' : `^${'ABCD'[i]}: ${SV}$`).test(l)), labels.join(' | '));
    const wide = await t.ev(() => { const b = document.querySelectorAll('#lmqPick button'); return b[4].offsetWidth > 1.5 * b[0].offsetWidth; });
    t.ok('No limit stands alone across the row', wide);
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- two wrong picks, each named and checked ---
    let k = await kinds(t);
    const wrong = [0, 1, 2, 3, 4].filter(i => k[i] !== 'right').slice(0, 2);
    for (const w of wrong) {
      await opt(t, w);
      const r = await read(t), L = 'ABCDE'[w];
      t.ok(`a wrong pick (${k[w]}) is named as its slip`, new RegExp(`^${L} (takes 0/0 for no limit|writes the (top|bottom)'s other factor|cancels \\(x|turns what is left upside down|is the top alone|uses L'Hôpital's rule|crosses out the|is the x² terms' ratio|puts x = 0 in)`).test(r), r);
      t.ok('and checked', / Check /.test(r) && !/Check .*= \S+ is the limit/.test(r), r);
      t.ok('and that answer is shut and told as not the limit', await t.ev(i => { const b = document.querySelectorAll('#lmqPick button')[i];
        return b.disabled && /\. Not the limit$/.test(b.getAttribute('aria-label')); }, w));
      t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);
    }

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(LimPick.round.S));
    await opt(t, ri);
    let r = await read(t);
    t.ok('the right pick works the ratio through', /^That was it: .+(cancel|away from x = |runs off without end).+ Here is a new one\./.test(r) || /^That was it: \(.+\)\/\(.+\) = .+ At x = .+ it gives .+\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCDE'[ri]} is the limit, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new ratio with all five open', await t.ev(() => [...document.querySelectorAll('#lmqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(LimPick.round.S)) !== s0);

    // --- straight to the right one, until both kinds have been met ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = LimPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#lmqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'HOLE FINDER / 5 limits found');

    // --- a ratio with no hole: No limit is the answer, and is said why ---
    const none = await t.ev(() => {
      for (let g = 0; g < 400; g++) { LimPick.newRound(); if (!LimPick.round.S.hole) break; }
      Limit.render(); return !LimPick.round.S.hole && LimPick.round.opts[4].k === 'right';
    });
    t.ok('where nothing cancels, No limit is the right answer', none);
    await opt(t, 4);
    r = await read(t);
    t.ok('and the readout says f runs off without end', /^That was it: at x = −?\d the top is −?\d+ but the bottom is 0, so near −?\d f runs off without end, up on one side and down on the other, and heads for no number\. Here is a new one\./.test(r), r);

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lmTab button, #lmqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its formulas, sides, figure, h buttons, readout and goals', back);
    t.ok('and the five answers are put away', await t.ev(() => !document.getElementById('lmqPick')));
    t.ok('which limit changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Limit.tab = 'hand'; UI.go('s-title'); });
  }
};
