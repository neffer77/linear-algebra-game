/* Match them up: the eigenvalue detective's third mode.
 *
 * These checks open the eigenvalue detective from the Tome, switch to the
 * mode, and play it through its buttons: four matrices and four numbered
 * polynomials, each drawn as its curve, with the rule stated first; each
 * matrix is matched, and the check stays shut until all four are; a check
 * with a slip rings the polynomial picked wrongly and works the matrix's
 * trace and det; fixing it and checking again letters each curve and dots
 * its eigenvalues; first checks are counted and the goals found with toasts
 * and a banner. Every button is named, hunting them down steps aside and
 * comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('chmRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#chmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#dcTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('chmCheck').click());
const next = t => t.ev(() => document.getElementById('chmNext').click());
// tap polynomial n for each matrix, the way a player would; '.' leaves a matrix as it is
const matchAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#chmStops .chmStop[data-i="${i}"] button[data-n="${+c - 1}"]`).click(); });
}, calls);
const AWAY = ['cpSets', 'cpMat', 'cpFig', 'cpStep', 'cpRead', 'cpGoalPanel'];
// each round matched right, in the order the rounds come round
const ANS = ['2413', '3241', '3142', '4312'];

module.exports = {
  name: 'charmatch',
  title: 'Match them up · match four matrices to their det(A − λI)',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the detective can match them up', await t.ev(() =>
      /Or match them up: four matrices, four polynomials, and each matrix to its det\(A − λI\)\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDetect');
    t.eq('the eigenvalue detective opens', await t.screen(), 's-detect');
    await t.tapText(/Match them up/);
    t.eq('match them up is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('hunting them down steps aside', away);

    // --- the first round, before anything is matched ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('dcPick').innerText)).startsWith('Round 1 of 6: four matrices and four polynomials. Which det(A − λI) belongs to each matrix?'));
    let r = await read(t);
    t.ok('the rule comes before anything is matched', r.startsWith('For a 2×2 matrix A = [a b; c d], det(A − λI) = (a − λ)(d − λ) − bc = λ² − (a + d)λ + (ad − bc).'), r);
    t.ok('nothing is matched yet', /0 of 4 matched\./.test(r), r);
    t.eq('the four polynomials are listed by number', await t.ev(() => document.getElementById('chmPolys').innerText.replace(/\s+/g, ' ').trim()),
      '1 λ² − 3λ + 2 2 λ² − 5λ + 6 3 λ² − 3λ − 4 4 λ² − 5λ + 4');
    t.eq('four curves are drawn and numbered', await t.ev(() => document.querySelectorAll('#chmFig [data-k="curve"]').length + ' ' +
      [...document.querySelectorAll('#chmFig [data-k="num"]')].map(x => x.textContent).join('')), '4 1234');
    t.ok('no letter or eigenvalue gives the answer away', await t.ev(() => !document.querySelector('#chmFig [data-k="who"], #chmFig [data-k="root"]')));
    t.ok('the check is shut until all four are matched', await t.ev(() => { const b = document.getElementById('chmCheck'); return b.disabled && b.getAttribute('aria-label') === 'Match all four matrices to check them'; }));

    // --- a slip: B matched to 2 ---
    await matchAs(t, '2213');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#chmStops .chmStop[data-i="1"] button[data-n="1"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they match', await t.ev(() => document.querySelector('#chmStops .chmStop[data-i="1"] button[data-n="1"]').getAttribute('aria-label') === 'Matrix B goes with polynomial 2, λ² − 5λ + 6'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('chmCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. For B, the trace is 2 + 3 = 5 and det A = (2)(3) − (1)(2) = 4, so det(A − λI) = λ² − 5λ + 4: that is 4. You had 2, λ² − 5λ + 6: the trace matches, but det A does not.'), r);
    t.eq('only the polynomial picked wrongly is ringed', await t.ev(() => document.querySelectorAll('#chmFig [data-k="miss"]').length), 1);
    t.ok('the answers are not given away', await t.ev(() => !document.querySelector('#chmFig [data-k="who"], #chmFig [data-k="root"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await matchAs(t, '.4');
    t.eq('changing the match clears its ring', await t.ev(() => document.querySelectorAll('#chmFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the eigenvalues are given', r.startsWith('Yes: all four are matched. The eigenvalues: A 2 and 3, B 1 and 4, C 1 and 2, D −1 and 4.'), r);
    t.ok('a fix is not a first check', /0 matched right on the first check this visit\.$/.test(r), r);
    t.eq('each curve gets its letter and its eigenvalues', await t.ev(() => [...document.querySelectorAll('#chmFig [data-k="who"]')].map(x => x.textContent).join('') + ' ' +
      document.querySelectorAll('#chmFig [data-k="root"]').length), 'CADB 8');
    t.ok('the matches are shut', await t.ev(() => [...document.querySelectorAll('#chmStops button')].every(b => b.disabled)));
    t.eq('a fix is found', await found(t), ['fix']);
    t.ok('with a toast', /✓ A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: no real roots, a zero det, two with one det ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('dcPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 matched\./.test(await read(t)));
      await matchAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('chmCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) {
        t.ok('a curve that misses the axis is explained', /C has no real eigenvalues: its trace squared, 0, is less than 4 × det A = 4, so its curve never meets the axis\./.test(await read(t)), await read(t));
        t.ok('and a root counted twice is told', /D 2 twice\./.test(await read(t)), await read(t));
        t.eq('and dotted once', await t.ev(() => document.querySelectorAll('#chmFig [data-k="root"]').length), 5);
      }
      if (i === 2) {
        t.ok('a zero det is explained', /A has det A = 0, so λ = 0 is an eigenvalue: its curve passes through 0\./.test(await read(t)), await read(t));
        t.ok('two with one det are told apart', /C and D share det A = 2, so only the trace tells them apart: 3 against 2\./.test(await read(t)), await read(t));
      }
    }
    r = await read(t);
    t.ok('the run is counted', /3 matched right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'none', 'one', 'three', 'twin', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'MATCHMAKER / every polynomial placed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dcTab button, #chmStops button, #chmCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^The four polynomials as curves against λ: 1, λ² − 7λ \+ 10; 2, λ² − 3λ − 4/.test(await t.ev(() => document.querySelector('#chmFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Hunt them down/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('hunting them down comes back', back);
    t.ok('and the matches are put away', await t.ev(() => !document.getElementById('chmStops')));
    t.ok('matching changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Detect.tab = 'hunt'; UI.go('s-title'); });
  }
};
