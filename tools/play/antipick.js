/* Which F? The antiderivative workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: f is written and drawn, and four F offered; a wrong
 * pick is shut and named as the slip it is, checked by its slope beside the
 * right F's, and its slope is drawn in red beside f; the right pick counts,
 * toasts and deals a new f, and a first try is counted apart. Every button is
 * named, the hands-on workshop steps aside and comes back, it fits a phone,
 * and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('apRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => AntiPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#apPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#adTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'antipick',
  title: 'Which F? · pick the antiderivative out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the antiderivative workshop can be turned round', await t.ev(() =>
      /Then turn it round: see f, and pick which of four F has f as its slope\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeAnti');
    t.eq('the antiderivative workshop opens', await t.screen(), 's-anti');
    t.eq('guessing by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6161));
    await t.tapText(/Which F\?/);
    t.eq('which F is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the targets, the curves, F, the steppers, the readout and the goals step aside', await hidden(t, 'adSets') && await hidden(t, 'adFig') && await hidden(t, 'adF') && await hidden(t, 'adSteps') && await hidden(t, 'adRead') && await hidden(t, 'adGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('apBox').innerText)).startsWith(
      'To undo a power of x, raise the power by one and divide by the new power'));
    t.ok('f is written out', /f\(x\) = \S+/.test(await t.ev(() => document.getElementById('apBox').innerText)));
    t.ok('and drawn, the picture read out, with no red slope yet', await t.ev(() => { const s = document.getElementById('apFig');
      return !!s && /^f\(x\) = \S+ dashed in gold, for x from 0\.5 to 2\.5$/.test(s.getAttribute('aria-label'))
        && !!s.querySelector('[data-k="target"]') && !s.querySelector('[data-k="slope"]'); }));
    const labels = await t.ev(() => [...document.querySelectorAll('#apPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four F are offered', labels.length, 4);
    t.ok('each is named as an F', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: F\\(x\\) = \\S+$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (raises the power to|divides by the old power|takes the slope of f instead|multiplies by the new power)`).test(r), r);
    t.ok('and checked by its slope beside the right F', new RegExp(`Check ${L} by its slope: .+, which is not f\\. But the slope of \\S+ is .+, which is f exactly\\.`).test(r), r);
    t.ok('and its slope is drawn in red and named', await t.ev(L => { const s = document.getElementById('apFig');
      return !!s.querySelector('[data-k="target"]') && new RegExp(`; the slope of ${L}, \\S+, in red, off f$`).test(s.getAttribute('aria-label')); }, L));
    t.ok('and that F is shut', await t.ev(i => document.querySelectorAll('#apPick button')[i].disabled, wrong));
    t.ok('and told as not having slope f', /\. Its slope is not f$/.test(await t.ev(i => document.querySelectorAll('#apPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(AntiPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: the slope of \S+ is .+, which is f\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} has slope f, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new f with all four F open and no red slope', await t.ev(() => [...document.querySelectorAll('#apPick button')].every(b => !b.disabled) && !document.querySelector('#apFig [data-k="slope"]'))
      && await t.ev(() => JSON.stringify(AntiPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = AntiPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#apPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'ANTIDERIVATIVE READER / 5 antiderivatives picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#adTab button, #apPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#apPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four F sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Guess F by hand/);
    t.ok('the targets come back, with the curves, the steppers and the goals', !(await hidden(t, 'adSets')) && !(await hidden(t, 'adFig')) && !(await hidden(t, 'adSteps')) && !(await hidden(t, 'adGoalPanel')));
    t.ok('and the four F are put away', await t.ev(() => !document.getElementById('apPick')));
    t.ok('which F changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Anti.tab = 'guess'; UI.go('s-title'); });
  }
};
