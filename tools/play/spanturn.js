/* Line or plane? The span workshop's third mode.
 *
 * These checks open the span workshop from the Tome, switch to the mode,
 * and play it through its buttons: four pairs of arrows are drawn with the
 * rule stated first, each pair is called as spanning the plane, a line or
 * just a point, and the check stays shut until all four are called; a check
 * with a slip rings just that pair and works its u₁v₂ − u₂v₁; fixing it and
 * checking again draws each pair's span; first checks are counted and the
 * goals found with toasts and a banner. Every button is named, mixing by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('sptRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#sptGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#spTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('sptCheck').click());
const next = t => t.ev(() => document.getElementById('sptNext').click());
// tap the named button for each pair, the way a player would: P the plane, L a line, O just the point
const NAME = { P: 'the plane', L: 'a line', O: 'just the point ⟨0, 0⟩' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#sptStops button[aria-label="Pair ${'ABCD'[i]}: spans ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['spPairs', 'spAmts', 'spFig', 'spRead', 'spGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['PLPL', 'LPPL', 'LPLP', 'OPLL'];

module.exports = {
  name: 'spanturn',
  title: 'Line or plane? · call what each pair of arrows spans',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says what a pair spans can be called', await t.ev(() =>
      /Or call it: see four pairs of arrows, and say whether each spans the plane, a line, or just a point\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSpan');
    t.eq('the span workshop opens', await t.screen(), 's-span');
    await t.tapText(/Line or plane\?/);
    t.eq('line or plane is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('mixing by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('spPick').innerText)).startsWith('Round 1 of 6: four pairs of arrows. Does each pair span the plane, only a line, or just a point?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Two arrows span the whole plane unless they lie on one line. Test it with u₁v₂ − u₂v₁:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four pairs are drawn and lettered', await t.ev(() => document.querySelectorAll('#sptFig [data-k="u"]').length + ' ' +
      [...document.querySelectorAll('#sptFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 ABCD');
    t.ok('no span gives the answer away', await t.ev(() => !document.querySelector('#sptFig [data-k="spanline"], #sptFig [data-k="planefill"], #sptFig [data-k="spanpoint"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('sptCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four spans to check them'; }));

    // --- a slip: B called the plane ---
    await callAs(t, 'PPPL');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#sptStops button[aria-label="Pair B: spans the plane"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('sptCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, u = ⟨1, 2⟩ and v = ⟨2, 4⟩: u₁v₂ − u₂v₁ = (1)(4) − (2)(2) = 0, and v = 2u, so they span only the line through u. You had it as the plane.'), r);
    t.eq('only that pair is ringed', await t.ev(() => document.querySelectorAll('#sptFig [data-k="miss"]').length), 1);
    t.ok('the spans are not given away', await t.ev(() => !document.querySelector('#sptFig [data-k="spanline"], #sptFig [data-k="planefill"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.L');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#sptFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In D, v = −2u: v points the other way along the same line as u, so the pair still spans only that line. Spans: A the plane, B a line, C the plane, D a line.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pair gets its span drawn', await t.ev(() => document.querySelectorAll('#sptFig [data-k="planefill"]').length + ' ' + document.querySelectorAll('#sptFig [data-k="spanline"]').length + ' ' +
      [...document.querySelectorAll('#sptFig [data-k="plane"], #sptFig [data-k="line"], #sptFig [data-k="point"]')].map(c => c.dataset.k).join()), '2 2 plane,line,plane,line');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#sptStops button')].every(b => b.disabled)));
    t.eq('a fix and a flipped pair are found', await found(t), ['fix', 'flip']);
    t.ok('with a toast', /✓ Opposite ways, one line · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: ⟨0, 0⟩ and a near pair among them ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('spPick').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('sptCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) {
        r = await read(t);
        t.ok('⟨0, 0⟩ in a pair is explained', /In A, ⟨0, 0⟩ adds nothing, so the pair spans only the line its other arrow does\./.test(r), r);
        t.ok('a pair that looks alike yet spans the plane is explained', /In B, ⟨3, 2⟩ and ⟨4, 3⟩ lie only 3° apart, but u₁v₂ − u₂v₁ = \(3\)\(3\) − \(2\)\(4\) = 1 is not 0, so they span the plane\./.test(r), r);
      }
      if (i === 3) t.eq('a pair of ⟨0, 0⟩s is dotted, not shaded or lined', await t.ev(() => document.querySelectorAll('#sptFig [data-k="spanpoint"]').length), 1);
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'flip', 'near', 'one', 'three', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'WIDE VIEW / every span called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#spTab button, #sptStops button, #sptCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of arrows: A, u = ⟨−1, 2⟩ and v = ⟨−2, 3⟩; B/.test(await t.ev(() => document.querySelector('#sptFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Mix the arrows/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('mixing by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('sptStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Span.tab = 'mix'; UI.go('s-title'); });
  }
};
