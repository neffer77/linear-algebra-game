/* The cistern workshop: what an integral adds up.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout says the total is the area under the flow, gives F and F′ = f, works
 * F at this hour, reads the flow, and shows the next tenth of an hour adding a
 * strip f tall; the figure shades the area so far and draws the tangent to the
 * total at the hour; at hour 3 the fading spring stops and the cistern is
 * fullest; after it the cistern drains while still holding water; at hour 6 it
 * is empty and the readout says the area below the axis cancelled the 9
 * barrels above it; the steady spring's total is a rectangle and holds 10
 * barrels at 2.5 hours, its strip exactly f tall; the tidal sluice turns at
 * hour 1 and runs dry at hour 3, which finishes the hunt. The stepper stops at
 * its ends even pressed past them, and every button is named. It fits a phone
 * and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ciRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#ciFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#ciGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#ciSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('ciT').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const spec = t => t.ev(() => { const s = window.__ciSpec; return JSON.stringify({ F: s.f, f: s.also.f, shade: [s.shade.a, s.shade.b], tangent: s.tangent, pts: s.pts.map(p => p.slice(0, 2)) }); });

module.exports = {
  name: 'cistern',
  title: 'Cistern workshop · what an integral adds up',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));
    // keep the last figure the workshop draws, so its shading and tangent can be read
    await t.ev(() => { const r = Figure.render; Figure.render = function (s, el) { if (el && el.id === 'ciFig') window.__ciSpec = s; return r.apply(this, arguments); }; });

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the cistern workshop', await t.showing('tomeCistern'));
    await t.tap('tomeCistern');
    t.eq('and one tap opens it', await t.screen(), 's-cistern');

    // --- it opens on the fading spring at hour 1 ---
    let r = await read(t);
    t.ok('it states the spring', /A spring fills the castle cistern at f\(t\) = 6 − 2t barrels an hour\. It weakens, and after hour 3 it runs backwards and the cistern drains\./.test(r), r);
    t.ok('and says the total is the area under the flow, with F′ = f', /The total in the cistern after t hours is the area under f from 0 to t\. Here that is F\(t\) = 6t − t², and F′\(t\) = 6 − 2t = f\(t\): the total climbs exactly as fast as the water flows in\./.test(r), r);
    t.ok('it works the total at this hour', /At t = 1 h: F\(1\) = 6 × 1 − 1² = 6 − 1 = 5 barrels\./.test(r), r);
    t.ok('and reads the flow', /The flow now is f\(1\) = 4 barrels an hour, above 0: water comes in, so the total still climbs\./.test(r), r);
    t.ok('and shows the next tenth of an hour adding a strip', /In the next tenth of an hour the total changes by F\(1\.1\) − F\(1\) = 0\.39 barrels, close to f\(1\) × 0\.1 = 0\.4: a strip f tall and a tenth of an hour wide\. The thinner the strip, the closer it gets\./.test(r), r);
    t.eq('the stepper reads the hour', await shown(t), 't = 1 h');
    t.eq('the caption names the colours', await cap(t), 'The blue curve is the flow f and the gold curve is the total F, the shaded area so far: gold above the axis adds, red below it takes away. The dashed red tangent to F at t = 1 has slope 4, the height of the blue curve there.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#ciFig canvas.fig')));
    t.eq('the figure draws both curves, shades to the hour and puts the tangent there', await spec(t),
      '{"F":{"poly":[[-1,2],[6,1]]},"f":{"poly":[[-2,1],[6,0]]},"shade":[0,1],"tangent":1,"pts":[[1,5],[1,4]]}');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the fading spring is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#ciSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false');

    // --- hour 3: the flow stops and the cistern is fullest ---
    await press(t, 'ciTHi', 4);
    r = await read(t);
    t.ok('at hour 3 the flow is 0 and the tangent flat', /The flow now is f\(3\) = 0 barrels an hour: the tangent to F is flat\. f is above 0 just before and below 0 just after, so F climbs to here and falls after: 9 barrels is the most the cistern ever holds\./.test(r), r);
    t.eq('the shading follows the hour', await spec(t),
      '{"F":{"poly":[[-1,2],[6,1]]},"f":{"poly":[[-2,1],[6,0]]},"shade":[0,3],"tangent":3,"pts":[[3,9],[3,0]]}');
    t.eq('the fullest the cistern gets is found', await found(t), ['full']);
    t.ok('its toast starts with a capital', /✓ Found the fullest the cistern gets/.test(await toast(t)), await toast(t));

    // --- after it, draining but not empty ---
    await press(t, 'ciTHi');
    r = await read(t);
    t.ok('past hour 3 the water runs out', /The flow now is f\(3\.5\) = −1 barrel an hour, below 0: water runs out, so the total is falling\./.test(r), r);
    t.ok('and the total is still above 0', /F\(3\.5\) = 6 × 3\.5 − 3\.5² = 21 − 12\.25 = 8\.75 barrels\./.test(r), r);
    t.eq('a cistern that is draining but not empty is found', await found(t), ['drain', 'full']);

    // --- hour 6: empty again, the areas cancel ---
    await press(t, 'ciTHi', 5);
    r = await read(t);
    t.ok('at hour 6 the total is 0', /F\(6\) = 6 × 6 − 6² = 36 − 36 = 0 barrels\./.test(r), r);
    t.ok('and the area below the axis cancels the area above it', /F\(6\) = 0: the cistern is empty again\. The 9 barrels that came in, the area above the axis, are cancelled by the area below it: an integral counts area below the axis as negative\./.test(r), r);
    t.eq('the cistern empty again is found', await found(t), ['drain', 'empty', 'full']);
    t.ok('the hour stops at 6', await t.ev(() => document.getElementById('ciTHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Cistern.moveT(1); return Cistern.t(); }), 6);

    // --- the steady spring: a rectangle ---
    await pick(t, 1);
    t.eq('a new spring starts at its own hour', await shown(t), 't = 1 h');
    r = await read(t);
    t.ok('a steady flow fills a rectangle', /At t = 1 h the area under f is a rectangle 4 tall and 1 wide, so F\(1\) = 4 × 1 = 4 barrels\./.test(r), r);
    await press(t, 'ciTHi', 3);
    r = await read(t);
    t.ok('at 2.5 hours it holds 10 barrels', /F\(2\.5\) = 4 × 2\.5 = 10 barrels\./.test(r), r);
    t.ok('and its strip is exactly f tall', /F\(2\.6\) − F\(2\.5\) = 0\.4 barrels, exactly f\(2\.5\) × 0\.1 = 0\.4: a strip f tall and a tenth of an hour wide\./.test(r), r);
    t.eq('10 barrels is found', await found(t), ['drain', 'empty', 'full', 'ten']);

    // --- the tidal sluice ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the sluice is worked term by term', /At t = 2 h: F\(2\) = 2³ − 6 × 2² \+ 9 × 2 = 8 − 24 \+ 18 = 2 barrels\./.test(r), r);
    t.ok('at hour 2 it drains', /f\(2\) = −3 barrels an hour, below 0/.test(r), r);
    await press(t, 'ciTLo', 2);
    r = await read(t);
    t.ok('at hour 1 it turns', /f\(1\) = 0 barrels an hour: the tangent to F is flat\. .* with 4 barrels the cistern is fuller here than just before or just after\./.test(r), r);
    t.eq('the first turn is found', await found(t), ['drain', 'empty', 'full', 'high', 'ten']);
    await press(t, 'ciTHi', 4);
    r = await read(t);
    t.ok('at hour 3 it runs dry and fills again', /F falls to here and climbs after: the cistern runs dry here, then starts to fill again\./.test(r), r);
    t.ok('and the 4 barrels that came in are cancelled', /The 4 barrels that came in, the area above the axis, are cancelled by the area below it/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['drain', 'empty', 'full', 'high', 'low', 'ten']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('ciGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'ciTHi', 10);
    t.eq('the sluice stops at hour 4', await shown(t), 't = 4 h');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('ciTHi').disabled));
    await press(t, 'ciTLo', 20);
    t.eq('going back stops at hour 0', await shown(t), 't = 0 h');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('ciTLo').disabled));
    t.ok('at hour 0 nothing has flowed', /At t = 0 h nothing has flowed yet, so F\(0\) = 0\./.test(await read(t)), await read(t));
    t.eq('and a press past it changes nothing', await t.ev(() => { Cistern.moveT(-1); return Cistern.t(); }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-cistern .wsCell button, #ciSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each spring button reads its flow', await t.ev(() =>
      [...document.querySelectorAll('#ciSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Fading spring: f(t) = 6 − 2t | Steady spring: f(t) = 4 | Tidal sluice: f(t) = 3t² − 12t + 9');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the cistern workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
