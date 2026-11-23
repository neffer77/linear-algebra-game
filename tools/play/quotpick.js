/* Which dy/dx? The quotient rule workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: y = f(x) / g(x) is written and drawn with a point on
 * it, and four formulas offered; a wrong pick is shut and named as the slip
 * it is, and its slope at the point is drawn as a red line that cuts across
 * the curve, beside a nudge of the curve itself; the right pick counts,
 * toasts and deals a new curve, and a first try is counted apart. Every
 * button is named, the stepping workshop steps aside and comes back, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('qpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => QuotPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#qpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#qoTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'quotpick',
  title: 'Which dy/dx? · pick the quotient rule out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the quotient rule workshop can be turned round', await t.ev(() =>
      /Then turn it round: see y = f\(x\) \/ g\(x\), and pick which of four formulas is its slope\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeQuot');
    t.eq('the quotient rule workshop opens', await t.screen(), 's-quot');
    t.eq('working the slope is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(7474));
    await t.tapText(/Which dy\/dx\?/);
    t.eq('which dy/dx is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the fractions, the stepper and the goals step aside', await hidden(t, 'qoSets') && await hidden(t, 'qoFig') && await hidden(t, 'qoXs') && await hidden(t, 'qoModes') && await hidden(t, 'qoRead') && await hidden(t, 'qoGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('qoPick').innerText)).startsWith(
      'The quotient rule: if y = f(x) / g(x), then dy/dx = (f′g − fg′) / g².'));
    t.ok('y is written out', /^y = \S/.test(await t.ev(() => document.querySelector('#qoPick > div:nth-child(2)').innerText.trim())));
    t.ok('and drawn with its point, the picture read out', await t.ev(() => { const s = document.getElementById('qpFig');
      return !!s && /^The curve y = .+, with a point at x = \S+$/.test(s.getAttribute('aria-label')) && !!s.querySelector('[data-k="curve"]') && !!s.querySelector('[data-k="point"]') && !s.querySelector('line[data-k^="miss"]'); }));
    const labels = await t.ev(() => [...document.querySelectorAll('#qpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four formulas are offered', labels.length, 4);
    t.ok('each is named as dy/dx', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: dy/dx = \\S`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (takes f′g away from fg′|divides by g once|adds fg′|divides the slopes)`).test(r), r);
    t.ok('and its slope is set against a nudge of the curve', new RegExp(`At x = \\S+, ${L} gives a slope of (about )?\\S+, drawn in red: it cuts across the curve\\. A nudge from x = \\S+ to \\S+ gives Δy/Δx ≈ \\S+\\.`).test(r), r);
    t.ok('and drawn as a red line through the point', await t.ev(L => { const s = document.getElementById('qpFig');
      return s.querySelectorAll('line[data-k^="miss"]').length === 1 && !!s.querySelector(`line[data-k="miss${L}"]`) && new RegExp(`red lines through it with the slopes of ${L}, cutting across the curve$`).test(s.getAttribute('aria-label')); }, L));
    t.ok('and that formula is shut', await t.ev(i => document.querySelectorAll('#qpPick button')[i].disabled, wrong));
    t.ok('and told as not the quotient rule', /\. Not the quotient rule$/.test(await t.ev(i => document.querySelectorAll('#qpPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(QuotPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: f\(x\) = .+ and g\(x\) = .+, so f′\(x\) = .+ and g′\(x\) = .+: dy\/dx = \(f′g − fg′\) \/ g² = .+\. Here is a new curve\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is dy/dx, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four formulas open and no red line', await t.ev(() => [...document.querySelectorAll('#qpPick button')].every(b => !b.disabled) && !document.querySelector('#qpFig line[data-k^="miss"]'))
      && await t.ev(() => JSON.stringify(QuotPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = QuotPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#qpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'QUOTIENT READER / 5 slopes picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#qoTab button, #qpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#qpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four formulas sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Work the slope/);
    t.ok('the fractions come back, with the stepper and goals', !(await hidden(t, 'qoSets')) && !(await hidden(t, 'qoXs')) && !(await hidden(t, 'qoGoalPanel')));
    t.ok('and the four formulas are put away', await t.ev(() => !document.getElementById('qpPick')));
    t.ok('which dy/dx changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Quot.tab = 'work'; UI.go('s-title'); });
  }
};
