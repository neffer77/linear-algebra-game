/* Close in or run off? The endless area workshop's third mode.
 *
 * These checks open the endless area workshop from the Tome, switch to the
 * mode, and play it through its buttons: four endless areas, each curve in
 * its own pane, and the rule stated first; each area is called closing in or
 * running off, and the check stays shut until all four are; a check with
 * slips rings the areas called wrongly and works their p and their
 * doublings; fixing them and checking again gives every pane the bars of its
 * doublings and where it closes in; first checks are counted and the goals
 * found with toasts and a banner. Every button is named, the hands-on
 * workshop steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tsrRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#tsrGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#tlTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('tsrCheck').click());
const next = t => t.ev(() => document.getElementById('tsrNext').click());
// tap a call for each area, C for closes in and R for runs off, the way a player would; '.' leaves an area as it is
const callAs = (t, calls) => t.ev(calls => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#tsrStops .tsrStop[data-i="${i}"] button[data-c="${c === 'C' ? 1 : 0}"]`).click(); });
}, calls);
const AWAY = ['tlSets', 'tlFig', 'tlStep', 'tlRead', 'tlGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['CRRC', 'RCCR', 'CRCC', 'RRCR'];

module.exports = {
  name: 'tailsort',
  title: 'Close in or run off? · call four endless areas closing in or running off',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lynette');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the areas can be called', await t.ev(() =>
      /Or call them: four endless areas, and which close in and which run off\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTail');
    t.eq('the endless area workshop opens', await t.screen(), 's-tail');
    await t.tapText(/Close in or run off\?/);
    t.eq('close in or run off is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the curves, the drawing, the stepper, the readout and the goals step aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('taBox').innerText)).startsWith('Round 1 of 6: four endless areas, each from x = 1 out forever. Does each close in or run off?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('Write each f(x) as c·x^(−p): a root is a power, √x = x^(1/2)'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four panes, each with its curve and its area', await t.ev(() => ['pane', 'curve', 'area'].map(k => document.querySelectorAll(`#tsrFig [data-k="${k}"]`).length).join()), '4,4,4');
    t.ok('no bars or ends give the answer away', await t.ev(() => !document.querySelector('#tsrFig [data-k="bar"], #tsrFig [data-k="end"]')));
    t.eq('each area is written as it is met', await t.ev(() => [...document.querySelectorAll('#tsrStops .tsrStop b')].map(b => b.innerText.replace(/\s+/g, ' ')).join(' | ')), 'A ∫₁^∞ 1/x² dx | B ∫₁^∞ 1/√x dx | C ∫₁^∞ 5/x dx | D ∫₁^∞ 1/(x√x) dx');
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('tsrCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four areas to check them'; }));

    // --- a slip: B called closing in, D running off ---
    await callAs(t, 'CCRR');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#tsrStops .tsrStop[data-i="1"] button[data-c="1"]').getAttribute('aria-pressed') === 'true'));
    t.ok('and say what they call', await t.ev(() => document.querySelector('#tsrStops .tsrStop[data-i="1"] button[data-c="1"]').getAttribute('aria-label') === 'Area B, under 1/√x, closes in'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('tsrCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slips are caught and worked', r.startsWith('2 of 4 right. Fix the ones in red and check again. In B, 1/√x = x^(−1/2), so p = 1/2. p is less than 1, so each doubling of b adds about 1.4142 times what the doubling before it added, more each time, and the area runs off. You had it closing in.'), r);
    t.ok('a root that closes in is worked too', /In D, 1\/\(x√x\) = x\^\(−3\/2\), so p = 3\/2\. p is more than 1, so each doubling of b adds about 0\.7071 times what the doubling before it added, less each time, and the area closes in on c\/\(p − 1\) = 2\. You had it running off\./.test(r), r);
    t.eq('only the areas called wrongly are ringed', await t.ev(() => document.querySelectorAll('#tsrFig [data-k="miss"]').length), 2);
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.R');
    t.eq('changing a call clears its ring', await t.ev(() => document.querySelectorAll('#tsrFig [data-k="miss"]').length), 1);
    await callAs(t, '...C');
    await check(t);
    r = await read(t);
    t.ok('the borderline and a root are explained', r.startsWith('Yes: all four are called right. C, 5/x, has p = 1 exactly: every doubling adds the same, so it runs off. Only p more than 1 closes in. D, 1/(x√x), has a root in it, yet it is x^(−3/2) with p = 3/2, more than 1, so it closes in on 2: read the power, not the root sign. Where they close in: A on 1, D on 2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pane gets where it ends up', await t.ev(() => [...document.querySelectorAll('#tsrFig [data-k="end"]')].map(x => x.textContent).join(' | ')), 'closes in on 1 | runs off | runs off | closes in on 2');
    t.eq('and the bars of its first five doublings', await t.ev(() => document.querySelectorAll('#tsrFig [data-k="bar"]').length), 20);
    t.ok('which shrink where it closes in and not where it runs off', await t.ev(() => { const h = [...document.querySelectorAll('#tsrFig [data-k="bar"]')].map(b => +b.getAttribute('height'));
      return h[4] < h[0] && h[9] > h[5] && Math.abs(h[14] - h[10]) < 0.01 && h[19] < h[15]; }));
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#tsrStops button')].every(b => b.disabled)));
    t.eq('the borderline, a root and a fix are found', await found(t), ['border', 'fix', 'root']);
    t.ok('with a toast', /✓ p = 1 still runs off · Read the power, not the root · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a big number in front ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('taBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('tsrCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a big number in front is explained', /B's number in front, 100, only scales its area: it still closes in, on 100\. No number in front can turn one into the other\./.test(await read(t)), await read(t));
      if (i === 2) t.ok('a cube root that closes in is explained', /A, 1\/\(x∛x\), has a root in it, yet it is x\^\(−4\/3\) with p = 4\/3, more than 1, so it closes in on 3: read the power, not the root sign\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['border', 'fix', 'front', 'one', 'root', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'TAIL READER / every endless area called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tlTab button, #tsrStops button, #tsrCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#tsrFig svg').getAttribute('aria-label')), 'Four endless areas from x = 1: A, under 1/∛x; B, under 1/(x²√x); C, under 20/x³; D, under 1/∜x');
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Push it out by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('tsrStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Tail.tab = 'hand'; UI.go('s-title'); });
  }
};
