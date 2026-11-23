/* Kept or knocked off? The eigenvector hunt's third mode.
 *
 * These checks open the hunt from the Tome, switch to the mode, and play it
 * through its buttons: four matrices are shown, each with one arrow v drawn
 * on its dashed line and the rule stated first; each arrow is called kept
 * the same way, turned round or knocked off, and the check stays shut until
 * all four are called; a check with a slip rings just that arrow and works
 * Av; fixing it and checking again draws every Av with its λ; first checks
 * are counted and the goals found with toasts and a banner. Every button is
 * named, the hand-hunt steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('egtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#egtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#egMode button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('egtCheck').click());
const next = t => t.ev(() => document.getElementById('egtNext').click());
// tap the named button for each arrow, the way a player would: K kept, F turned round, O knocked off
const NAME = { K: 'kept on its line, the same way', F: 'kept on its line, turned right round', O: 'knocked off its line' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#egtStops button[aria-label="Arrow ${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['egMats', 'egVec', 'egFig', 'egRead', 'egGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['KOFK', 'OKFO', 'FKOK', 'OFKK'];

module.exports = {
  name: 'eigturn',
  title: 'Kept or knocked off? · call what each matrix does to its arrow',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawain');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says each arrow can be called', await t.ev(() =>
      /Or call it: see four arrows, each with its matrix, and say whether each is kept, turned round or knocked off\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeEig');
    t.eq('the eigenvector hunt opens', await t.screen(), 's-eig');
    await t.tapText(/Kept or knocked off\?/);
    t.eq('kept or knocked off is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the hand-hunt steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('egSpot').innerText)).startsWith('Round 1 of 6: four matrices, each with an arrow v. Does A keep v on its line, the same way or turned round, or knock it off?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Work Av. If it lands on v’s own line, Av = λv and v is an eigenvector:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four arrows are drawn and lettered', await t.ev(() => document.querySelectorAll('#egtFig [data-k="v"]').length + ' ' +
      [...document.querySelectorAll('#egtFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 ABCD');
    t.ok('no Av gives the answer away', await t.ev(() => !document.querySelector('#egtFig [data-k="Av"], #egtFig [data-k="kept"], #egtFig [data-k="turned"], #egtFig [data-k="off"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('egtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four arrows to check them'; }));

    // --- a slip: B called kept ---
    await callAs(t, 'KKFK');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#egtStops button[aria-label="Arrow B: kept on its line, the same way"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('egtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, A = [2 1; 1 2] and v = ⟨1, 0⟩: Av = ⟨(2)(1) + (1)(0), (1)(1) + (2)(0)⟩ = ⟨2, 1⟩. That is not a multiple of v: Av is knocked about 27° off v’s line, so v is not an eigenvector. You had it as kept the same way.'), r);
    t.eq('only that arrow is ringed', await t.ev(() => document.querySelectorAll('#egtFig [data-k="miss"]').length), 1);
    t.ok('no Av is given away', await t.ev(() => !document.querySelector('#egtFig [data-k="Av"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.O');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#egtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In C, Av = −1 × v: v is turned right round, yet it stays on its line, so it is still an eigenvector. Each arrow: A λ = 3, B knocked off, C λ = −1, D λ = 2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each arrow gets its Av and its mark', await t.ev(() => document.querySelectorAll('#egtFig [data-k="Av"]').length + ' ' +
      [...document.querySelectorAll('#egtFig [data-k="kept"], #egtFig [data-k="turned"], #egtFig [data-k="off"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 kept λ = 3,off 27° off,turned λ = −1,kept λ = 2');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#egtStops button')].every(b => b.disabled)));
    t.eq('a fix and a turned arrow are found', await found(t), ['fix', 'flip']);
    t.ok('with a toast', /✓ Turned round, still kept · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a near miss and a still arrow among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('egSpot').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('egtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('an arrow a few degrees off its line is explained', /In D, Av is only about 12° off v’s line: close, but not on it, so v is not an eigenvector\./.test(r), r);
      if (i === 2) t.ok('an arrow left where it was is explained', /In B, Av = v: the matrix leaves the arrow exactly where it was, so λ = 1\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'flip', 'near', 'one', 'still', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TRUE LINE / every arrow called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#egMode button, #egtStops button, #egtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four matrices, each with an arrow: A, the matrix \[1 −1; 2 4\] with v = ⟨1, −1⟩; B/.test(await t.ev(() => document.querySelector('#egtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Hunt by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('hunting by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('egtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Eigen.mode = 'hunt'; UI.go('s-title'); });
  }
};
