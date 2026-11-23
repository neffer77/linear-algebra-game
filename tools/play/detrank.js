/* Rank the stretch: the matrix workshop's fourth mode.
 *
 * These checks open the matrix workshop from the Tome, switch to the mode,
 * and play it through its buttons: four matrices, each drawn as the shape the
 * dashed unit square lands on, and the rule stated first; each matrix is
 * ranked, and the check stays shut until all four are; a check with slips
 * rings the matrices ranked wrongly and works their determinants; fixing them
 * and checking again gives every pane its rank and its stretch; first checks
 * are counted and the goals found with toasts and a banner. Every button is
 * named, the steppers step aside and come back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('drkRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#drkGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#wsMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const empty = (t, id) => t.ev(id => !document.getElementById(id).innerHTML.trim(), id);
const check = t => t.ev(() => document.getElementById('drkCheck').click());
const next = t => t.ev(() => document.getElementById('drkNext').click());
// tap a rank for each matrix, 1 for 1st and 4 for 4th, the way a player would; '.' leaves a matrix as it is
const rankAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#drkStops .drkStop[data-i="${i}"] button[data-k="${+c - 1}"]`).click(); });
}, calls);
const AWAY = ['wsMat', 'wsBtns', 'wsTask', 'wsGoalPanel'];
// each round ranked right, in the order the rounds come round
const ANS = ['2143', '3124', '3421', '1432', '4312'];

module.exports = {
  name: 'detrank',
  title: 'Rank the stretch · rank four matrices from the biggest stretch of area to the smallest',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the stretches can be ranked', await t.ev(() =>
      /Or rank the stretch: four matrices, from the biggest stretch of area to the smallest\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeWorkshop');
    t.eq('the matrix workshop opens', await t.screen(), 's-workshop');
    await t.tapText(/Rank the stretch/);
    t.eq('rank the stretch is now the pressed mode', await pressed(t), 'false,false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the steppers, buttons, task and goals step aside', away);
    t.ok('and the shared figure and readout are cleared', await empty(t, 'wsFig') && await empty(t, 'wsRead'));

    // --- the first round, before anything is ranked ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('wsPick').innerText)).startsWith('Round 1 of 6: four matrices. Rank them from the biggest stretch of area to the smallest.'));
    let r = await read(t);
    t.ok('the rule comes before anything is ranked', r.startsWith('A matrix stretches every area by the same amount, the size of its determinant: |ad − bc|.'), r);
    t.ok('nothing is ranked yet', /0 of 4 ranked\./.test(r), r);
    t.eq('four panes, each with the unit square and its shape', await t.ev(() => ['pane', 'unit', 'shape'].map(k => document.querySelectorAll(`#drkFig [data-k="${k}"]`).length).join()), '4,4,4');
    t.ok('no rank or stretch gives the answer away', await t.ev(() => !document.querySelector('#drkFig [data-k="rank"]')));
    t.ok('the check is shut until all four are ranked', await t.ev(() => { const b = document.getElementById('drkCheck'); return b.disabled && b.getAttribute('aria-label') === 'Rank all four matrices to check them'; }));

    // --- a slip: the big numbers ranked first, A and B swapped ---
    await rankAs(t, '1243');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#drkStops .drkStop[data-i="0"] button[data-k="0"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they rank', await t.ev(() => document.querySelector('#drkStops .drkStop[data-i="0"] button[data-k="0"]').getAttribute('aria-label') === 'Matrix A, rows 3, 2 and 2, 3, ranks 1st, the biggest stretch'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('drkCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slips are caught and worked', r.startsWith('2 of 4 right. Fix the ones in red and check again. A, [3 2 ; 2 3]: ad − bc = 3·3 − 2·2 = 9 − 4 = 5, so it stretches area 5 times. Of the stretches 6, 5, 3 and 2, that is the 2nd biggest, so it ranks 2nd. You had it 1st.'), r);
    t.eq('only the matrices ranked wrongly are ringed', await t.ev(() => document.querySelectorAll('#drkFig [data-k="miss"]').length), 2);
    t.ok('the stretches are not all given away', await t.ev(() => !document.querySelector('#drkFig [data-k="rank"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await rankAs(t, '2');
    t.eq('changing a rank clears its ring', await t.ev(() => document.querySelectorAll('#drkFig [data-k="miss"]').length), 1);
    await rankAs(t, '.1');
    await check(t);
    r = await read(t);
    t.ok('a flip that still stretches more is explained', r.startsWith("Yes: all four are ranked right. B's determinant is −6, below 0, yet it ranks above A, whose determinant is 5: the minus sign only flips the square over, and its area still grows 6 times."), r);
    t.ok('and so are bigger numbers that stretch less', /A's numbers come to 10 in size against B's 5, yet A ranks below: the stretch is ad − bc, not the size of the numbers, and for A that is 3·3 − 2·2 = 9 − 4 = 5\. The stretches: A 5, B 6, C 2, D 3\./.test(r), r);
    t.ok('a fix is not a first check', /0 ranked right on the first check this visit\.$/.test(r), r);
    t.eq('each pane gets its rank and its stretch', await t.ev(() => [...document.querySelectorAll('#drkFig [data-k="rank"]')].map(x => x.textContent).join(' | ')), '2nd · ×5 | 1st · ×6 | 4th · ×2 | 3rd · ×3');
    t.ok('the ranks are shut', await t.ev(() => [...document.querySelectorAll('#drkStops button')].every(b => b.disabled)));
    t.eq('a fix, a flip and bigger numbers are found', await found(t), ['big', 'fix', 'flip']);
    t.ok('with a toast', /✓ A flip is still a stretch · Big numbers, small stretch · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- four first checks in a row, the last with a square pressed flat ---
    const banners = [];
    for (let i = 1; i <= 4; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('wsPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 ranked\./.test(await read(t)));
      await rankAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('drkCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 3) t.ok('three in a row are counted', /3 ranked right on the first check this visit, 3 in a row\.$/.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('a square pressed flat is explained', /A's determinant is 0: its two columns lie on one line, so the square is pressed flat and has no area at all\./.test(r), r);
    t.ok('the run is counted', /4 ranked right on the first check this visit, 4 in a row\.$/.test(r), r);
    t.ok('the flat shape is drawn as a line', await t.ev(() => { const p = document.querySelector('#drkFig [data-k="shape"]').getAttribute('points').split(' ').map(q => q.split(',').map(Number));
      return Math.abs((p[1][0] - p[0][0]) * (p[3][1] - p[0][1]) - (p[3][0] - p[0][0]) * (p[1][1] - p[0][1])) < 0.01; }));
    t.eq('every goal can be found with the buttons', await found(t), ['big', 'fix', 'flat', 'flip', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'STRETCH JUDGE / every stretch ranked');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#drkStops button, #drkCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four matrices, each with the shape the unit square lands on: A, rows 3, 1 and 1, −3; B, rows 2, 2 and 2, 3/.test(await t.ev(() => document.querySelector('#drkFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Free play/);
    let back = true; for (const id of ['wsMat', 'wsBtns', 'wsGoalPanel']) back = back && !(await hidden(t, id));
    t.ok('the steppers come back', back);
    t.ok('with their figure and readout', await t.ev(() => !!document.querySelector('#wsFig svg') && /det = ad − bc/.test(document.getElementById('wsRead').innerText)));
    t.ok('and the ranks are put away', await t.ev(() => !document.getElementById('drkStops')));
    t.ok('ranking changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Workshop.mode = 'free'; UI.go('s-title'); });
  }
};
