/* Rule or plug in? The L'Hôpital workshop's third mode.
 *
 * These checks open the L'Hôpital workshop from the Tome, switch to the
 * mode, and play it through its buttons: four ratios, each at its own point,
 * and the rule stated first; each ratio is sorted as 0/0 needing the rule or
 * as plugging straight in, and the check stays shut until all four are; a
 * check with slips rings the ratios sorted wrongly and works their top and
 * bottom at the point, then the rule or the plain value; fixing them and
 * checking again draws every top and bottom near its point, with tangent
 * lines where it is 0/0; first checks are counted and the goals found with
 * toasts and a banner. Every button is named, the hands-on workshop steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hsrRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#hsrGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#hpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('hsrCheck').click());
const next = t => t.ev(() => document.getElementById('hsrNext').click());
// tap a sort for each ratio, R for 0/0 needing the rule and P for plugging in, the way a player would; '.' leaves a ratio as it is
const sortAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#hsrStops .hsrStop[data-i="${i}"] button[data-c="${c === 'R' ? 1 : 0}"]`).click(); });
}, calls);
const AWAY = ['hpSets', 'hpFig', 'hpStep', 'hpRead', 'hpGoalPanel'];
// each round sorted right, in the order the rounds come round
const ANS = ['RPRP', 'PRRP', 'RPPR', 'PPRR'];

module.exports = {
  name: 'hopsort',
  title: 'Rule or plug in? · sort four ratios into 0/0 and plugging in',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the ratios can be sorted', await t.ev(() =>
      /Or sort them: four ratios, and which are 0\/0 and need the rule\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHopital');
    t.eq('the L\'Hôpital workshop opens', await t.screen(), 's-hopital');
    await t.tapText(/Rule or plug in\?/);
    t.eq('rule or plug in is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the ratios, the drawing, the stepper, the readout and the goals step aside', away);

    // --- the first round, before anything is sorted ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('hkBox').innerText)).startsWith('Round 1 of 6: four ratios, each at its own point. Which are 0/0 and need the rule, and which do you just plug in?'));
    let r = await read(t);
    t.ok('the rule comes before anything is sorted', r.startsWith('Plug x = a into the top and the bottom first. If both are 0, the ratio is 0/0, which is no number'), r);
    t.ok('nothing is sorted yet', /0 of 4 sorted\./.test(r), r);
    t.eq('four panes, each with its ratio', await t.ev(() => ['pane', 'ratio'].map(k => document.querySelectorAll(`#hsrFig [data-k="${k}"]`).length).join()), '4,4');
    t.ok('no curves, tangents or limits give the answer away', await t.ev(() => !document.querySelector('#hsrFig [data-k="top"], #hsrFig [data-k="tan"], #hsrFig [data-k="end"]')));
    t.eq('each ratio is written with its point', await t.ev(() => [...document.querySelectorAll('#hsrStops .hsrStop b')].map(b => b.innerText.replace(/\s+/g, ' ')).join(' | ')), 'A (x² − 4)/(x − 2) at x = 2 | B (x² − 4)/(x + 2) at x = 2 | C (1 − cos x)/x at x = 0 | D (cos x)/(x + 1) at x = 0');
    t.ok('the check is shut until all four are sorted', await t.ev(() => { const b = document.getElementById('hsrCheck'); return b.disabled && b.getAttribute('aria-label') === 'Sort all four ratios to check them'; }));

    // --- a slip: B sorted as needing the rule, C as plugging in ---
    await sortAs(t, 'RRPP');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#hsrStops .hsrStop[data-i="1"] button[data-c="1"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they sort', await t.ev(() => document.querySelector('#hsrStops .hsrStop[data-i="1"] button[data-c="1"]').getAttribute('aria-label') === 'Ratio B, (x² − 4)/(x + 2) at x = 2, is 0/0 and needs the rule'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('hsrCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the lone 0 is caught and worked', r.startsWith('2 of 4 right. Fix the ones in red and check again. In B, at x = 2 the top x² − 4 is 0 and the bottom x + 2 is 4, so it is 0/4, not 0/0: plugging in gives 0. The rule would give f′(2)/g′(2) = 4/1 = 4, which is wrong. You had it needing the rule.'), r);
    t.ok('and the hidden 0/0 too', /In C, at x = 0 the top 1 − cos x is 0 and the bottom x is 0: plugging in gives 0\/0, which is no number\. Use the rule: the top's slope is sin x and the bottom's is 1, so f′\(0\)\/g′\(0\) = 0\/1 = 0\. You had it plugged in\./.test(r), r);
    t.eq('only the ratios sorted wrongly are ringed', await t.ev(() => document.querySelectorAll('#hsrFig [data-k="miss"]').length), 2);
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await sortAs(t, '.P');
    t.eq('changing a sort clears its ring', await t.ev(() => document.querySelectorAll('#hsrFig [data-k="miss"]').length), 1);
    await sortAs(t, '..R');
    await check(t);
    r = await read(t);
    t.ok('the lone 0 and the zero limit are explained', r.startsWith('Yes: all four are sorted right. B, (x² − 4)/(x + 2), has a 0 on top alone: at x = 2 it is 0/4, which is just 0. Only 0 over 0 needs the rule, and here it would give 4. C, (1 − cos x)/x, is 0/0, yet the top\'s slope is sin x and the bottom\'s is 1, so f′(0)/g′(0) = 0/1 = 0: 0/0 asks a question, and its answer can be 0. The limits: A → 4, B → 0, C → 0, D → 1.'), r);
    t.ok('a fix is not a first check', /0 sorted right on the first check this visit\.$/.test(r), r);
    t.eq('each pane gets its limit', await t.ev(() => [...document.querySelectorAll('#hsrFig [data-k="end"]')].map(x => x.textContent).join(' | ')), '0/0 → 4 | 0/4 = 0 | 0/0 → 0 | 1/1 = 1');
    t.eq('and its top and bottom drawn', await t.ev(() => ['top', 'bot', 'dot'].map(k => document.querySelectorAll(`#hsrFig [data-k="${k}"]`).length).join()), '4,4,8');
    t.eq('with tangent lines only where it is 0/0', await t.ev(() => [...document.querySelectorAll('#hsrFig [data-k="tan"]')].map(l => l.dataset.m).join()), '4,1,0,1');
    t.ok('the sorts are shut', await t.ev(() => [...document.querySelectorAll('#hsrStops button')].every(b => b.disabled)));
    t.eq('the lone 0, the zero limit and a fix are found', await found(t), ['fix', 'half', 'zero']);
    t.ok('with a toast', /✓ One 0 is not 0\/0 · 0\/0 can head to 0 · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a log hiding a 0 ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('hkBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 sorted\./.test(await read(t)));
      await sortAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('hsrCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a log hiding a 0 is explained', /B, \(ln x\)\/\(x − 1\), is 0\/0 because ln x is 0 at x = 1: a log can hide a 0\. The rule gives 1\/1 = 1\./.test(await read(t)), await read(t));
      if (i === 3) t.ok('the limits are listed', /The limits: A → 1\/2, B → 1, C → 1\/2, D → 6\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 sorted right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'half', 'log', 'one', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'RULE KEEPER / every ratio sorted');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hpTab button, #hsrStops button, #hsrCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#hsrFig svg').getAttribute('aria-label')), 'Four ratios: A, (√x − 1)/(x − 1) as x goes to 1; B, (ln x)/(x + 1) as x goes to 1; C, (sin 2x)/x as x goes to 0; D, (cos x)/(1 + sin x) as x goes to 0');
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Close in by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back', back);
    t.ok('and the sorts are put away', await t.ev(() => !document.getElementById('hsrStops')));
    t.ok('sorting changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Hopital.tab = 'hand'; UI.go('s-title'); });
  }
};
