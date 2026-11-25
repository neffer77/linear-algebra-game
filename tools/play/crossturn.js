/* In or out? The cross product workshop's third mode.
 *
 * These checks open the cross product workshop from the Tome, switch to the
 * mode, and play it through its buttons: four pairs are drawn flat on the
 * page with the rule stated first, each pair is called out, in or zero, and
 * the check stays shut until all four are called; a check with a slip rings
 * just that pair and works its third part; fixing it and checking again draws
 * each pair's turn and arrow; first checks are counted and the goals found
 * with toasts and a banner. Every button is named, turning v by hand steps
 * aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ctnRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#ctnGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#crTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('ctnCheck').click());
const next = t => t.ev(() => document.getElementById('ctnNext').click());
// tap the named button for each pair, the way a player would: O out, I in, Z zero
const NAME = { O: 'points out of the page', I: 'points into the page', Z: 'is zero' };
const callAs = (t, calls) => t.ev(([calls, NAME]) => {
  calls.split('').forEach((c, i) => { if (c !== '.') document.querySelector(`#ctnStops button[aria-label="Pair ${'ABCD'[i]}: u × v ${NAME[c]}"]`).click(); });
}, [calls, NAME]);
const AWAY = ['crSets', 'crFig', 'crSteps', 'crSwapRow', 'crRead', 'crGoalPanel'];
// each round called right, in the order the rounds come round
const ANS = ['OIOI', 'OIOI', 'ZZIO', 'OIOI'];

module.exports = {
  name: 'crossturn',
  title: 'In or out? · say whether u × v points out of the page, into it, or is zero',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the cross product can be called in or out', await t.ev(() =>
      /Or call it in or out: for four pairs flat on the page, say whether u × v points out of the page, into it, or is zero\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeCross');
    t.eq('the cross product workshop opens', await t.screen(), 's-cross');
    await t.tapText(/In or out\?/);
    t.eq('in or out is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('turning v by hand steps aside', away);

    // --- the first round, before anything is called ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('ckBox').innerText)).startsWith('Round 1 of 6: four pairs u and v, flat on the page. Does u × v point out of the page, into it, or is it zero?'));
    let r = await read(t);
    t.ok('the rule comes before anything is called', r.startsWith('The page is the floor seen from above, with z coming out toward you. Turn u toward v the short way:'), r);
    t.ok('nothing is called yet', /0 of 4 called\./.test(r), r);
    t.eq('four pairs are drawn and lettered', await t.ev(() => document.querySelectorAll('#ctnFig [data-k="u"]').length + ' ' + document.querySelectorAll('#ctnFig [data-k="v"]').length + ' ' +
      [...document.querySelectorAll('#ctnFig text')].map(x => x.textContent).filter(x => /^[A-D]$/.test(x)).join('')), '4 4 ABCD');
    t.ok('no turn gives the answer away', await t.ev(() => !document.querySelector('#ctnFig [data-k="turn"]')));
    t.ok('the check is shut until all four are called', await t.ev(() => { const b = document.getElementById('ctnCheck'); return b.disabled && b.getAttribute('aria-label') === 'Call all four pairs to check them'; }));

    // --- a slip: B called out of the page ---
    await callAs(t, 'OOOI');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#ctnStops button[aria-label="Pair B: u × v points out of the page"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('ctnCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. In B, u = ⟨1, 2⟩ and v = ⟨2, −1⟩: u × v = ⟨0, 0, u₁v₂ − u₂v₁⟩ = ⟨0, 0, (1)(−1) − (2)(2)⟩ = ⟨0, 0, −5⟩. −5 is less than 0, so it points into the page: the short turn from u to v is clockwise. You had it out of the page.'), r);
    t.eq('only that pair is ringed', await t.ev(() => document.querySelectorAll('#ctnFig [data-k="miss"]').length), 1);
    t.ok('the turns are not given away', await t.ev(() => !document.querySelector('#ctnFig [data-k="turn"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await callAs(t, '.I');
    t.eq('changing the call clears its ring', await t.ev(() => document.querySelectorAll('#ctnFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the calls are explained', r.startsWith('Yes: all four are called right. The length of each u × v is the area its pair spans: A 3, B 5, C 5, D 2.'), r);
    t.ok('a fix is not a first check', /0 called right on the first check this visit\.$/.test(r), r);
    t.eq('each pair gets its turn and its arrow', await t.ev(() => document.querySelectorAll('#ctnFig [data-k="turn"]').length + ' ' +
      [...document.querySelectorAll('#ctnFig [data-k="out"], #ctnFig [data-k="in"]')].map(c => c.dataset.k).join()), '4 out,in,out,in');
    t.ok('the calls are shut', await t.ev(() => [...document.querySelectorAll('#ctnStops button')].every(b => b.disabled)));
    t.eq('a fix is found', await found(t), ['fix']);
    t.ok('with a toast', /✓ A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a swap, a pair on one line, wide turns ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`round ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('ckBox').innerText)).startsWith(`Round ${i + 1} of 6:`) && /0 of 4 called\./.test(await read(t)));
      await callAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('ctnCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a swap is explained', /A and B are the same two arrows in the other order, and they point opposite ways: v × u = −\(u × v\)\./.test(await read(t)), await read(t));
      if (i === 2) {
        t.ok('arrows on one line are explained', /A and B each lie on one line, so each spans no area and u × v = ⟨0, 0, 0⟩\./.test(await read(t)), await read(t));
        t.eq('and drawn as 0', await t.ev(() => document.querySelectorAll('#ctnFig [data-k="zero"]').length), 2);
      }
      if (i === 3) t.ok('a wide turn is explained', /In A, u and v are more than a quarter turn apart, but the short turn still settles it: it is counterclockwise, so u × v points out of the page\./.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 called right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['fix', 'one', 'swap', 'three', 'wide', 'zero']);
    t.eq('the last one found brings a banner', banners.join(), 'RIGHT HAND / every turn called');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#crTab button, #ctnStops button, #ctnCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^Four pairs flat on the page: A, u = ⟨2, 1⟩ and v = ⟨−1, 2⟩; B/.test(await t.ev(() => document.querySelector('#ctnFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Turn v by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('turning v by hand comes back', back);
    t.ok('and the calls are put away', await t.ev(() => !document.getElementById('ctnStops')));
    t.ok('calling changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Cross.tab = 'hand'; UI.go('s-title'); });
  }
};
