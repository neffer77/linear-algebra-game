/* Rank the lines: the best fit workshop's third mode.
 *
 * These checks open the best fit workshop from the Tome, switch to the mode,
 * and play it through its buttons: five points and four lines, each in its
 * own pane with a red miss to every point, and the rule stated first; each
 * line is ranked, and the check stays shut until all four are; a check with
 * slips rings the lines ranked wrongly and works their misses and squares;
 * fixing them and checking again gives every pane its rank and its total;
 * first checks are counted and the goals found with toasts and a banner.
 * Every button is named, the hands-on workshop steps aside and comes back,
 * it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('frkRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#frkGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#ftTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('frkCheck').click());
const next = t => t.ev(() => document.getElementById('frkNext').click());
// tap a rank for each line, 1 for 1st and 4 for 4th, the way a player would; '.' leaves a line as it is
const rankAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#frkStops .frkStop[data-i="${i}"] button[data-k="${+c - 1}"]`).click(); });
}, calls);
const AWAY = ['ftSets', 'ftAmts', 'ftFig', 'ftRead', 'ftGoalPanel'];
// each round ranked right, in the order the rounds come round
const ANS = ['1243', '3241', '3142', '4231'];

module.exports = {
  name: 'fitrank',
  title: 'Rank the lines · rank four lines through the same points from best fit to worst',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Percival');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the lines can be ranked', await t.ev(() =>
      /Or rank the lines: four lines through the same points, from the best fit to the worst\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeFit');
    t.eq('the best fit workshop opens', await t.screen(), 's-fit');
    await t.tapText(/Rank the lines/);
    t.eq('rank the lines is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the sets, steppers, figure, readout and goals step aside', away);

    // --- the first round, before anything is ranked ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('fpBox').innerText)).startsWith('Round 1 of 6: five points and four lines. Rank the lines from the best fit to the worst.'));
    let r = await read(t);
    t.ok('the rule comes before anything is ranked', r.startsWith("Each point misses a line by its y minus the line's height there. Square every miss and add them up: the smaller the total, the better the line fits."), r);
    t.ok('nothing is ranked yet', /0 of 4 ranked\./.test(r), r);
    t.eq('four panes, each with its line, five points and its misses', await t.ev(() => ['pane', 'line', 'pt'].map(k => document.querySelectorAll(`#frkFig [data-k="${k}"]`).length).join() + ' ' +
      (document.querySelectorAll('#frkFig [data-k="miss-seg"]').length > 0)), '4,4,20 true');
    t.ok('no rank or total gives the answer away', await t.ev(() => !document.querySelector('#frkFig [data-k="rank"]')));
    t.ok('the check is shut until all four are ranked', await t.ev(() => { const b = document.getElementById('frkCheck'); return b.disabled && b.getAttribute('aria-label') === 'Rank all four lines to check them'; }));

    // --- a slip: B and C swapped ---
    await rankAs(t, '1423');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#frkStops .frkStop[data-i="1"] button[data-k="3"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they rank', await t.ev(() => document.querySelector('#frkStops .frkStop[data-i="1"] button[data-k="3"]').getAttribute('aria-label') === 'Line B, y = 2, ranks 4th, the worst'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('frkCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slips are caught and worked', r.startsWith('2 of 4 right. Fix the ones in red and check again. B, y = 2: the misses are −1, −3, −2, 0 and −1, their squares 1, 9, 4, 0 and 1, and they add up to 15. Of the totals 7, 15, 19 and 22, that is the 2nd smallest, so it ranks 2nd. You had it 4th.'), r);
    t.eq('only the lines ranked wrongly are ringed', await t.ev(() => document.querySelectorAll('#frkFig [data-k="miss"]').length), 2);
    t.ok('the totals are not all given away', await t.ev(() => !document.querySelector('#frkFig [data-k="rank"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await rankAs(t, '.2');
    t.eq('changing a rank clears its ring', await t.ev(() => document.querySelectorAll('#frkFig [data-k="miss"]').length), 1);
    await rankAs(t, '..4');
    await check(t);
    r = await read(t);
    t.ok('a line with smaller misses that loses once squared is explained', r.startsWith("Yes: all four are ranked right. C's misses come to 8 in all against D's 9, yet C ranks below: squaring makes one big miss count for more than several small ones. The totals: A 7, B 15, C 22, D 19."), r);
    t.ok('a fix is not a first check', /0 ranked right on the first check this visit\.$/.test(r), r);
    t.eq('each pane gets its rank and its total', await t.ev(() => [...document.querySelectorAll('#frkFig [data-k="rank"]')].map(x => x.textContent).join(' | ')), '1st · 7 | 2nd · 15 | 4th · 22 | 3rd · 19');
    t.ok('the ranks are shut', await t.ev(() => [...document.querySelectorAll('#frkStops button')].every(b => b.disabled)));
    t.eq('a fix and a squared loss are found', await found(t), ['fix', 'square']);
    t.ok('with a toast', /✓ Squares punish the big miss · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: misses that cancel, a line through two points beaten ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('fpBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 ranked\./.test(await read(t)));
      await rankAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('frkCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('misses that add up to 0 are explained', /The misses from B, y = 1, add up to 0, yet it ranks 2nd: misses above and below cancel in a plain sum, but a square is never negative\./.test(await read(t)), await read(t));
      if (i === 2) t.ok('a line through two points beaten is explained', /C runs through 2 of the points, yet A touches none and still ranks above it: hitting points exactly is not the test\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 ranked right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cancel', 'fix', 'one', 'square', 'three', 'through']);
    t.eq('the last one found brings a banner', banners.join(), 'LINE JUDGE / every line ranked');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#ftTab button, #frkStops button, #frkCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^The points \(−2, −2\), \(−1, 0\), \(0, 0\), \(1, 1\), \(2, 3\), and four lines: A, y = x − 1; B, y = −1/.test(await t.ev(() => document.querySelector('#frkFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Set it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back', back);
    t.ok('and the ranks are put away', await t.ev(() => !document.getElementById('frkStops')));
    t.ok('ranking changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Fit.tab = 'hand'; UI.go('s-title'); });
  }
};
