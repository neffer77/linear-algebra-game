/* Which holds more? The lathe workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and
 * play it through its buttons: four pairs of curves on their intervals are
 * shown and the rule stated first; each pair is called as f's solid holding
 * more than g's, the same or less, and the check stays shut until all four
 * are called; a check with a slip rings just that pane and works it through;
 * fixing it and checking again writes every volume in; first checks are
 * counted and the goals found with toasts and a banner. Every button is
 * named, measuring by hand steps aside and comes back, it fits a phone, and
 * nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lhtRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#lhtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#lhTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('lhtCheck').click());
const next = t => t.ev(() => document.getElementById('lhtNext').click());
// tap the named button for each pair, the way a player would: M more, S the same, L less
const NAME = { M: 'f\'s solid holds more', S: 'the two solids hold the same', L: 'f\'s solid holds less' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#lhtStops button[aria-label="${'ABCD'[i]}: ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['lhSets', 'lhFig', 'lhStep', 'lhRead', 'lhGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['MSLM', 'LSLM', 'LMSL', 'SLMM'];

module.exports = {
  name: 'latheturn',
  title: 'Which holds more? · call whether f spun round the axis holds more than g, the same or less',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the solids can be weighed against each other', await t.ev(() =>
      /Or call four pairs: does f's solid hold more than g's, the same, or less\?/.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeLathe');
    t.eq('the lathe workshop opens', await t.screen(), 's-lathe');
    await t.tapText(/Which holds more\?/);
    t.eq('which holds more is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('measuring by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('vlBox').innerText)).startsWith('Round 1 of 6: four pairs of curves, each spun round the x-axis. Does f\'s solid hold more than g\'s, the same, or less?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Spin a curve round the x-axis and each thin slice becomes a disk of radius |f(x)|'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes are lettered and labelled with their curves and intervals', await t.ev(() =>
      [...document.querySelectorAll('#lhtFig text[font-size="14"]')].map(x => x.textContent).join('') + ' ' +
      [...document.querySelectorAll('#lhtFig [data-k="eqf"]')].map(x => x.textContent).join(' | ') + ' ' +
      [...document.querySelectorAll('#lhtFig [data-k="eqg"]')].map(x => x.textContent).join(' | ') + ' ' +
      document.querySelectorAll('#lhtFig [data-k="axis"]').length + ' ' + document.querySelectorAll('#lhtFig [data-k="fm"], #lhtFig [data-k="gm"]').length),
      'ABCD f(x) = 2x | f(x) = x | f(x) = 1 | f(x) = 2x − 2 g(x) = 1 on [0, 1] | g(x) = −x + 2 on [0, 2] | g(x) = x on [0, 3] | g(x) = 1 on [0, 2] 4 8');
    t.ok('no volume gives the answer away', await t.ev(() => !document.querySelector('#lhtFig [data-k="vols"], #lhtFig [data-k="more"], #lhtFig [data-k="same"], #lhtFig [data-k="less"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('lhtCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four to check them'; }));

    // --- a slip: A, with the same area under both, called the same ---
    await callAs(t, 'SSLM');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#lhtStops button[aria-label="A: the two solids hold the same"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('lhtCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In A, f(x) = 2x and g(x) = 1 on [0, 1]: both have the same area under them, 1, yet volume goes by the square of the height: ∫f² = 4/3 and ∫g² = 1, so f\'s solid holds 4π/3 against π: more. You had f\'s as holding the same.'), r);
    t.eq('only that pane is ringed', await t.ev(() => document.querySelectorAll('#lhtFig [data-k="miss"]').length), 1);
    t.ok('no volume is given away', await t.ev(() => !document.querySelector('#lhtFig [data-k="vols"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, 'M...');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#lhtFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. In A, f and g have the same area under them, 1, yet f\'s solid holds 4π/3 and g\'s π: squaring makes the taller stretches count for more. In D, f runs below the axis, and still its solid holds 8π/3: spun round, a stretch below the axis makes the same disks as its mirror above. In B, x and −x + 2 are different curves, yet both solids hold 8π/3. The volumes, f\'s against g\'s: A 4π/3 and π, B 8π/3 and 8π/3, C 3π and 9π, D 8π/3 and 2π.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('every volume is written in, with each pane marked', await t.ev(() => document.querySelectorAll('#lhtFig [data-k="vols"]').length + ' ' +
      [...document.querySelectorAll('#lhtFig [data-k="more"], #lhtFig [data-k="same"], #lhtFig [data-k="less"]')].map(c => c.dataset.k + ' ' + c.textContent).join()), '4 more ▲ more,same = same,less ▼ less,more ▲ more');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#lhtStops button')].every(b => b.disabled)));
    t.eq('same area but more, a dip below the axis, two curves alike and a fix are found', await found(t), ['fix', 'mirror', 'sign', 'square']);
    t.ok('with a toast', /✓ Volume goes by the square · Below the axis spins the same · Different curves, same volume · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('vlBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('lhtCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      r = await read(t);
      if (i === 1) t.ok('the same area can still hold less', /In C, f and g have the same area under them, 9, yet f's solid holds 27π and g's 36π/.test(r), r);
    }
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'mirror', 'one', 'sign', 'square', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'DISK WEIGHER / every solid weighed');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#lhTab button, #lhtStops button, #lhtCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs of curves, each spun round the x-axis: A, f\(x\) = 2 and g\(x\) = x \+ 1 on \[0, 2\]; B, f\(x\) = x² and g\(x\) = −x² on \[0, 2\]; C/.test(await t.ev(() => document.querySelector('#lhtFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Measure it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('measuring by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('lhtStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Lathe.tab = 'hand'; UI.go('s-title'); });
  }
};
