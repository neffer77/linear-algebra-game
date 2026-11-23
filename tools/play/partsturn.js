/* Easier or harder? The parts workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four integrals are shown, each split into u
 * and dv, and the rule stated first; each is called as leaving something
 * easier, the same kind or harder, and the check stays shut until all four
 * are called; a check with a slip rings just that pane and works it
 * through; fixing it and checking again writes du, v and what parts leaves
 * in; first checks are counted and the goals found with toasts and a
 * banner. Every button is named, picking a split by hand steps aside and
 * comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('pttRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#pttGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#bpTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('pttCheck').click());
const next = t => t.ev(() => document.getElementById('pttNext').click());
// tap the named button for each split, the way a player would: E easier, S the same kind, H harder
const NAME = { E: 'what is left is easier', S: 'it comes back the same kind', H: 'what is left is harder' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#pttStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['bpSets', 'bpFig', 'bpOpts', 'bpRead', 'bpGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['EHSE', 'SEEH', 'HESE', 'EHES'];

module.exports = {
  name: 'partsturn',
  title: 'Easier or harder? · call whether what parts leaves is easier, the same kind, or harder',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says a split can be judged before it is worked', await t.ev(() =>
      /Or call four splits: does what parts leaves get easier, come back the same, or get harder\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeParts');
    t.eq('the parts workshop opens', await t.screen(), 's-parts');
    await t.tapText(/Easier or harder\?/);
    t.eq('easier or harder is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('picking a split by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('bqBox').innerText)).startsWith('Round 1 of 6: four integrals, each split into u and dv. Is what parts leaves, ∫ v du, easier, the same kind, or harder?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Parts trades ∫ u dv for uv − ∫ v du: u is differentiated and dv integrated.'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and written with their integrals and splits', await t.ev(() =>
      [...document.querySelectorAll('#pttFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#pttFig [data-k="int"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#pttFig [data-k="split"]')].map(x => x.textContent).join(' | ')),
      'ABCD ∫ x eˣ dx | ∫ x eˣ dx | ∫ eˣ sin x dx | ∫ x ln x dx u = x · dv = eˣ dx | u = eˣ · dv = x dx | u = sin x · dv = eˣ dx | u = ln x · dv = x dx');
    t.ok('u and dv are drawn in different colours', await t.ev(() => {
      const u = document.querySelector('#pttFig [data-k="u"]'), d = document.querySelector('#pttFig [data-k="dv"]');
      return u.getAttribute('fill') !== d.getAttribute('fill'); }));
    t.ok('nothing gives the answer away', await t.ev(() => !document.querySelector('#pttFig [data-k="duv"], #pttFig [data-k="leaves"], #pttFig [data-k="easier"], #pttFig [data-k="same"], #pttFig [data-k="harder"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('pttCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: A, where u = x drops the power, called the same kind ---
    await callAs(t, 'SHSE');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#pttStops button[aria-label="A: it comes back the same kind"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('pttCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In A, ∫ x eˣ dx: u = x, so du = dx, and dv = eˣ dx, so v = eˣ: ∫ v du = ∫ eˣ dx. The power of x drops from 1 to 0: easier. You had it as the same kind.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#pttFig [data-k="miss"]').length), 1);
    t.ok('nothing worked is given away', await t.ev(() => !document.querySelector('#pttFig [data-k="duv"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, 'E...');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#pttFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, u = ln x and du = (1/x) dx swallows the ln: ∫ v du = (1/2) ∫ x dx is only a power of x. In C, ∫ v du = ∫ eˣ cos x dx is the same kind again: a second round of parts brings the first integral back, and that is how it is solved. In B, u = eˣ leaves x to integrate, and the power of x rises: swapped, u = x would make it drop. What each split leaves: A ∫ eˣ dx, B (1/2) ∫ x² eˣ dx, C ∫ eˣ cos x dx, D (1/2) ∫ x dx.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('du, v and what parts leaves are written in, with each pane marked', await t.ev(() =>
      [...document.querySelectorAll('#pttFig [data-k="duv"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#pttFig [data-k="leaves"]').length + ' ' +
      [...document.querySelectorAll('#pttFig [data-k="easier"], #pttFig [data-k="same"], #pttFig [data-k="harder"]')].map(c => c.dataset.k + ' ' + c.textContent).join()),
      'du = dx · v = eˣ | du = eˣ dx · v = (1/2) x² | du = cos x dx · v = eˣ | du = (1/x) dx · v = (1/2) x² 4 easier ↓,harder ↑,same ↻,easier ↓');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#pttStops button')].every(b => b.disabled)));
    t.eq('an ln that vanishes, a loop, a rise and a fix are found', await found(t), ['fix', 'ln', 'loop', 'rise']);
    t.ok('with a toast', /✓ ln x differentiates away · It comes back round · The wrong u makes it worse · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('bqBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('pttCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('ln x alone vanishes too', /In C, u = ln x and du = \(1\/x\) dx swallows the ln: ∫ v du = ∫ dx is only a power of x\./.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'ln', 'loop', 'one', 'rise', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SPLIT SEER / every split weighed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#bpTab button, #pttStops button, #pttCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four integrals split for parts: A, ∫ e³ˣ cos 2x dx with u = e³ˣ and dv = cos 2x dx; B, ∫ x² e²ˣ dx with u = x² and dv = e²ˣ dx; C/.test(await t.ev(() => document.querySelector('#pttFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Pick a split by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('picking a split by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('pttStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Parts.tab = 'hand'; UI.go('s-title'); });
  }
};
