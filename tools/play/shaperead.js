/* Read the shape, the bend workshop's third mode.
 *
 * These checks open the bend workshop from the Tome, switch to the mode, and
 * play it through its buttons: the curve is drawn with four lettered points
 * and the rule stated first, each point gets rises or falls and cup or cap,
 * and the check stays shut until all eight are set; a check with a slip rings
 * just that point and works f′ and f″ there; fixing it and checking again
 * draws each tangent in the colour of its bend; first checks are counted and
 * the goals found with toasts and a banner. Every button is named, sliding by
 * hand steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('shpRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#shpGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#bdTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const check = t => t.ev(() => document.getElementById('shpCheck').click());
const next = t => t.ev(() => document.getElementById('shpNext').click());
// tap the named button at each point, the way a player would: R or F, then U (cup) or C (cap)
const NAME = { R: 'rises', F: 'falls', U: 'bends up like a cup', C: 'bends down like a cap' };
const tapAs = (t, reading) => t.ev(([reading, NAME]) => {
  reading.split(' ').forEach((s, i) => { for (const c of s) document.querySelector(`#shpStops button[aria-label="Point ${'ABCD'[i]} ${NAME[c]}"]`).click(); });
}, [reading, NAME]);
const AWAY = ['bdSets', 'bdFig', 'bdStep', 'bdRead', 'bdGoalPanel'];
// each curve's points read right, in the order the curves come round
const ANS = ['RC FC FU RU', 'FU FU RU RU', 'RC RC FC FC', 'RC FC FU RU'];

module.exports = {
  name: 'shaperead',
  title: 'Read the shape · say where a curve rises or falls and bends like a cup or a cap',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Laudine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the shape can be read', await t.ev(() =>
      /Or read the shape: say at each point whether it rises or falls and bends like a cup or a cap\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeBend');
    t.eq('the bend workshop opens', await t.screen(), 's-bend');
    await t.tapText(/Read the shape/);
    t.eq('read the shape is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('sliding by hand steps aside', away);

    // --- the first curve, before anything is set ---
    t.ok('the task is stated', (await t.ev(() => document.getElementById('bkBox').innerText)).startsWith('Curve 1 of 6: f(x) = x³ − 3x. At each lettered point, does it rise or fall, and does it bend like a cup or a cap?'));
    let r = await read(t);
    t.ok('the rule comes before anything is set', r.startsWith('f′ says which way a curve goes: it rises where f′ > 0 and falls where f′ < 0.'), r);
    t.ok('nothing is set yet', /0 of 8 set\./.test(r), r);
    t.eq('four points are drawn and lettered', await t.ev(() => document.querySelectorAll('#shpFig [data-k="pt"]').length + ' ' + [...document.querySelectorAll('#shpFig text')].map(x => x.textContent).join('')), '4 ABCD');
    t.ok('no tangent gives the answer away', await t.ev(() => !document.querySelector('#shpFig [data-k="tan"]')));
    t.ok('the check is shut until all eight are set', await t.ev(() => { const b = document.getElementById('shpCheck'); return b.disabled && b.getAttribute('aria-label') === 'Set both answers at all four points to check them'; }));

    // --- a slip: B read as rising ---
    await tapAs(t, 'RC RC FU RU');
    t.ok('the taps show as pressed', await t.ev(() => document.querySelector('#shpStops button[aria-label="Point B rises"]').getAttribute('aria-pressed') === 'true'));
    t.ok('the check opens', await t.ev(() => !document.getElementById('shpCheck').disabled));
    await check(t);
    r = await read(t);
    t.ok('the slip is caught and worked', r.startsWith('3 of 4 right. Fix the ones in red and check again. f(x) = x³ − 3x, so f′(x) = 3x² − 3 and f″(x) = 6x. At B, x = −0.5: f′(−0.5) = −2.25 is less than 0, so the curve falls, and f″(−0.5) = −3 is less than 0, so it bends down like a cap. You had it rising and a cap.'), r);
    t.eq('only that point is ringed', await t.ev(() => document.querySelectorAll('#shpFig [data-k="miss"]').length), 1);
    t.ok('the tangents are not given away', await t.ev(() => !document.querySelector('#shpFig [data-k="tan"]')));
    t.eq('nothing is found for a slip', await found(t), []);

    // --- fixed and checked again ---
    await tapAs(t, 'R F');
    t.eq('changing the point clears its ring', await t.ev(() => document.querySelectorAll('#shpFig [data-k="miss"]').length), 0);
    await check(t);
    r = await read(t);
    t.ok('the reading is explained', r.startsWith('Yes: all four points are read right. At A the curve climbs while bending down like a cap, and at C it falls while bending up like a cup'), r);
    t.ok('a fix is not a first check', /0 read right on the first check this visit\.$/.test(r), r);
    t.eq('each point gets its tangent, coloured by its bend', await t.ev(() => [...document.querySelectorAll('#shpFig [data-k="tan"]')].map(l => l.getAttribute('stroke') === FIG_COL.c ? 'cup' : 'cap').join()), 'cap,cap,cup,cup');
    t.ok('the answers are shut', await t.ev(() => [...document.querySelectorAll('#shpStops button')].every(b => b.disabled)));
    t.eq('a fix and all four shapes are found', await found(t), ['fix', 'four']);
    t.ok('with a toast', /✓ All four shapes on one curve · A slip caught and fixed/.test(await toast(t)), await toast(t));

    // --- three first checks in a row: a cup, a cap and a cubic ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`curve ${i + 1} is dealt fresh`, (await t.ev(() => document.getElementById('bkBox').innerText)).startsWith(`Curve ${i + 1} of 6:`) && /0 of 8 set\./.test(await read(t)));
      await tapAs(t, ANS[i]);
      banners.push(...await t.ev(() => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.getElementById('shpCheck').click(); } finally { Celebrate.banner = real; }
        return seen;
      }));
      if (i === 1) t.ok('a cup that falls is explained', /Every point bends up like a cup, though A and B fall and C and D rise: f″\(x\) = 2 is more than 0 everywhere/.test(await read(t)), await read(t));
      if (i === 2) t.ok('a cap that climbs is explained', /Every point bends down like a cap, though A and B rise and C and D fall: f″\(x\) = −2 is less than 0 everywhere/.test(await read(t)), await read(t));
    }
    r = await read(t);
    t.ok('the run is counted', /3 read right on the first check this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cap', 'cup', 'fix', 'four', 'one', 'three']);
    t.eq('the last one found brings a banner', banners.join(), 'SHAPE READER / every rise and bend named');

    // --- named, fits, comes back ---
    await next(t);
    const unnamed = await t.ev(() => [...document.querySelectorAll('#bdTab button, #shpStops button, #shpCheck')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', /^f\(x\) = x − x³\/3 in blue, with points A at x = −2, B at x = −0\.5/.test(await t.ev(() => document.querySelector('#shpFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Slide it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('sliding by hand comes back', back);
    t.ok('and the reading is put away', await t.ev(() => !document.getElementById('shpStops')));
    t.ok('reading changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Bend.tab = 'hand'; UI.go('s-title'); });
  }
};
