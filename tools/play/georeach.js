/* How far? The geometric series workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and step
 * x through its buttons: Σ xⁿ/5ⁿ opens at its centre, where every term is 0;
 * x = 3 works t = 3/5 and the endless sum 3/2; x = 6 is past the radius and
 * the terms run away, which is found; on Σ (x − 2)ⁿ/3ⁿ, x = −1 is an end of
 * the interval, where the ratio is exactly 1 and the terms swing ±1, which
 * is found; on Σ n·xⁿ/2ⁿ, x = 3/2 is the furthest step that adds up and the
 * radius is 2 all the same, which is found; and on Σ x²ⁿ/4ⁿ the ratio is 1 at
 * x = 2, the square root of 4, which finishes the hunt with a banner. The
 * stepper stops at its ends, the drawing marks x and the stretch that adds
 * up, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('grRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#grGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#grSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('grX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#gnTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const marker = t => t.ev(() => { const p = document.querySelector('#grFig path[data-k="x"]'); return { d: p.getAttribute('d'), fill: p.getAttribute('fill') }; });
const ends = t => t.ev(() => [...document.querySelectorAll('#grFig circle[data-k="end"]')].map(c => +c.getAttribute('cx')));
const AWAY = ['gnSets', 'gnFig', 'gnStep', 'gnRead', 'gnGoalPanel'];

module.exports = {
  name: 'georeach',
  title: 'How far? · step x along a power series and find its radius',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lunete');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the workshop can put x in the ratio', await t.ev(() =>
      /Or put x in the ratio: step it along a power series and find how far from the centre it still adds up\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeGeo');
    t.eq('the geometric series workshop opens', await t.screen(), 's-geo');
    t.eq('adding by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/How far\?/);
    t.eq('how far is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the staircase workshop steps aside', away);

    // --- Σ xⁿ/5ⁿ at its centre ---
    let r = await read(t);
    t.eq('it opens at the centre', await shown(t), 'x = 0');
    t.ok('it names the series as geometric in t', /^Σ \(n = 1 to ∞\) xⁿ\/5ⁿ is a geometric series in t = x\/5: each term is t times the one before\./.test(r), r);
    t.ok('at the centre every term is 0', /x is the centre, 0: every term is 0, so the series adds up to 0 there\./.test(r), r);
    t.ok('and it gives the interval', /It adds up while \|x\| < 5: the radius is R = 5, from −5 to 5\.$/.test(r), r);
    t.eq('nothing is found before anything is turned', await found(t), []);
    const E = await ends(t);
    t.ok('the stretch that adds up is drawn between two open ends', E.length === 2 && E[1] - E[0] > 150 && E[1] - E[0] < 170, JSON.stringify(E));

    // --- inside ---
    await press(t, 'grHi', 3);
    r = await read(t);
    t.eq('the stepper moves x', await shown(t), 'x = 3');
    t.ok('it works t', /At x = 3, t = 3\/5, so the ratio test's limit is \|t\| = 3\/5\./.test(r), r);
    t.ok('and the sum inside', /That is under 1, .*the first 20 terms come to S₂₀ ≈ 1\.4999, closing in on the endless sum t\/\(1 − t\) = 3\/2 = 1\.5\./.test(r), r);
    const inside = await marker(t);
    t.eq('nothing is found inside', await found(t), []);

    // --- outside ---
    await press(t, 'grHi', 3);
    r = await read(t);
    t.ok('past the radius it runs away', /At x = 6, t = 6\/5, .*That is over 1, so each term is bigger in size than the last and the total runs away: term 20 is already about 38\.34 in size\./.test(r), r);
    t.eq('stepping out is found', await found(t), ['out']);
    t.ok('with a toast', /✓ Out past the radius/.test(await toast(t)), await toast(t));
    const outside = await marker(t);
    t.ok('the marker moves right and changes colour', outside.fill !== inside.fill && parseFloat(outside.d.slice(1)) > parseFloat(inside.d.slice(1)), JSON.stringify([inside, outside]));
    await press(t, 'grHi', 10);
    t.eq('the stepper stops at twice the radius', await shown(t), 'x = 10');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('grHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { GeoReach.move(1); return GeoReach.k; }), 10);

    // --- Σ (x − 2)ⁿ/3ⁿ, an end ---
    await pick(t, 1);
    t.eq('a new series starts at its own centre', await shown(t), 'x = 2');
    await press(t, 'grLo', 3);
    r = await read(t);
    t.ok('it shifts the centre', /in t = \(x − 2\)\/3/.test(r) && /At x = −1, t = \(−1 − 2\)\/3 = −1, so the ratio test's limit is \|t\| = 1\./.test(r), r);
    t.ok('at an end the test says nothing and the terms swing', /That is exactly 1: an end of the interval, where the ratio test says nothing\. Here every term is ±1, in turn, so the terms never shrink to 0 and the series cannot add up\./.test(r), r);
    t.ok('from −1 to 5', /the radius is R = 3, from −1 to 5\.$/.test(r), r);
    t.eq('the edge is found', await found(t), ['edge', 'out']);

    // --- Σ n·xⁿ/2ⁿ, as far as it goes ---
    await pick(t, 2);
    await press(t, 'grHi', 3);
    r = await read(t);
    t.eq('this one steps by halves', await shown(t), 'x = 3/2');
    t.ok('the n in front does not count', /\(n \+ 1\)\/n tends to 1, so the ratio tends to \|t\| all the same\./.test(r) && /the same as without the n in front\.$/.test(r), r);
    t.ok('and the sum has a square in it', /t\/\(1 − t\)² = 12\./.test(r), r);
    t.eq('the furthest step that adds up is found', await found(t), ['edge', 'far', 'out']);

    // --- Σ x²ⁿ/4ⁿ, the root ---
    await pick(t, 3);
    await press(t, 'grLo', 3);
    t.eq('nothing more is found inside', await found(t), ['edge', 'far', 'out']);
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      try { document.getElementById('grLo').click(); } finally { Celebrate.banner = real; }
      return seen;
    });
    t.eq('x reaches −2', await shown(t), 'x = −2');
    r = await read(t);
    t.ok('the ratio is 1 at the root of 4', /At x = −2, t = \(−2\)²\/4 = 1/.test(r) && /\|x\| < √4 = 2, not 4: the radius is R = 2, from −2 to 2\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['edge', 'far', 'out', 'root']);
    t.eq('the last one found brings a banner', banners.join(), 'MASTER OF THE RADIUS / every interval found');
    t.ok('the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('grGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#gnTab button, #grSets button, #gqBox .wsCell button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /^x = −2 on a line from −4 to 4, on an end of the stretch from −2 to 2 where the series adds up$/.test(document.querySelector('#grFig svg').getAttribute('aria-label'))));
    t.eq('twelve bars, one a term', await t.ev(() => document.querySelectorAll('#grFig rect[data-k="term"]').length), 12);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Add it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the staircase workshop comes back', back);
    t.ok('and the power series are put away', await t.ev(() => !document.getElementById('grSets')));
    t.ok('how far changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Geo.tab = 'hand'; UI.go('s-title'); });
  }
};
