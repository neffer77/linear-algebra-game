/* The path chain workshop: z changes for two reasons.
 *
 * These checks open it from the Tome and drive it through its buttons: z = xy
 * along x = t², y = t opens at t = 1 with an x part of 2 and a y part of 1,
 * so dz/dt = 3, and nothing found; keeping only one part, or forgetting the
 * speeds, is caught by the nudge; at t = 0.5 forgetting the speeds is right by
 * luck; on the circle the parts cancel at π/4; along x = t, y = 2 − t the top
 * is at t = 4/3 and at 5/3 the y part wins a tug of war. The stepper stops at
 * its ends, every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('pcRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#pcFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#pcGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#pcSets button')[k].click(), k);
const mode = (t, k) => t.ev(k => document.querySelectorAll('#pcModes button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#pcModes button')].map(b => b.getAttribute('aria-pressed')).join());
const shown = t => t.ev(() => document.getElementById('pcT').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const has = (t, k) => t.ev(k => !!document.querySelector(`#pcFig [data-k="${k}"]`), k);
const barW = (t, k) => t.ev(k => +document.querySelector(`#pcFig [data-k="${k}"]`).getAttribute('width'), k);

module.exports = {
  name: 'pathchain',
  title: 'Path chain workshop · z changes for two reasons',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ysolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the path chain workshop', await t.showing('tomePathChain'));
    await t.tap('tomePathChain');
    t.eq('and one tap opens it', await t.screen(), 's-pathchain');

    // --- z = xy along x = t², y = t, at t = 1 ---
    let r = await read(t);
    t.ok('it says why z changes for two reasons', /z = xy, and the point walks along x = t², y = t\. As t changes both x and y move, so z changes for two reasons\./.test(r), r);
    t.ok('works the point and the speeds', /At t = 1: x = 1 and y = 1, so z = 1\. Along the path, dx\/dt = 2t = 2 and dy\/dt = 1\./.test(r), r);
    t.ok('names the rule and the slopes of the hill', /dz\/dt = \(∂z\/∂x\)\(dx\/dt\) \+ \(∂z\/∂y\)\(dy\/dt\), with ∂z\/∂x = y = 1 and ∂z\/∂y = x = 1\./.test(r), r);
    t.ok('and adds the two parts', /The x part is 1 × 2 = 2 and the y part is 1 × 1 = 1, so dz\/dt = 3\./.test(r), r);
    t.ok('and checks it with a nudge', /Check with a nudge: from t ≈ 0\.999 to 1\.001, z goes from about 0\.997003 to about 1\.003003, so Δz\/Δt ≈ 3\./.test(r), r);
    t.ok('which agrees', /That agrees with dz\/dt = 3: z rises as t rises here\./.test(r), r);
    t.eq('the stepper reads t', await shown(t), 't = 1');
    t.eq('both parts is the pressed method', await pressed(t), 'true,false,false,false');
    t.eq('the caption names the colours', await cap(t), 'The blue curve is z as the point walks the path, and the green line is its tangent at the gold point. A slip’s line is drawn dashed in red. Below, the x part and the y part are bars that add up to dz/dt.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('the curve and its tangent are drawn, with no slip line', await has(t, 'curve') && await has(t, 'tan') && !(await has(t, 'slip')));
    const wx = await barW(t, 'xpart'), wy = await barW(t, 'ypart'), ws = await barW(t, 'sum');
    t.ok('and the x part bar is twice the y part bar, together as long as dz/dt', Math.abs(wx - 2 * wy) < 0.05 && Math.abs(wx + wy - ws) < 0.05, [wx, wy, ws].join());

    // --- the three slips ---
    await mode(t, 1);
    r = await read(t);
    t.ok('the x-only slip holds y still', /The slip keeps only the x part: \(∂z\/∂x\)\(dx\/dt\) = 1 × 2 = 2, as if y stood still\./.test(r), r);
    t.ok('and the nudge catches it', /So keeping only the x part is wrong: it misses the y part, 1\. The rate is 3\./.test(r), r);
    t.eq('the x-only slip is found out', await found(t), ['xonly']);
    t.ok('with a toast', /✓ y moves too/.test(await toast(t)), await toast(t));
    t.ok('and the slip\'s line is drawn beside the tangent', await has(t, 'slip') && await has(t, 'tan'));
    t.eq('the slip is the pressed method', await pressed(t), 'false,true,false,false');
    await mode(t, 2);
    r = await read(t);
    t.ok('the y-only slip holds x still', /The slip keeps only the y part: \(∂z\/∂y\)\(dy\/dt\) = 1 × 1 = 1, as if x stood still\./.test(r), r);
    t.ok('and is caught too', /So keeping only the y part is wrong: it misses the x part, 2\. The rate is 3\./.test(r), r);
    t.eq('the y-only slip is found out', await found(t), ['xonly', 'yonly']);
    await mode(t, 3);
    r = await read(t);
    t.ok('forgetting the speeds adds the slopes of the hill', /The slip forgets the speeds and adds the slopes of the hill: ∂z\/∂x \+ ∂z\/∂y = 1 \+ 1 = 2\./.test(r), r);
    t.ok('and is caught', /So forgetting the speeds is wrong: each slope of the hill has to be multiplied by how fast the path moves that way\. The rate is 3\./.test(r), r);
    t.eq('forgetting the speeds is found out', await found(t), ['speeds', 'xonly', 'yonly']);

    // --- t = 0.5: forgetting the speeds by luck ---
    await press(t, 'pcTLo', 1);
    t.eq('the stepper lands on 0.5', await shown(t), 't = 0.5');
    r = await read(t);
    t.ok('both speeds are 1 there', /At t = 0\.5: x = 0\.25 and y = 0\.5, so z = 0\.125\. Along the path, dx\/dt = 2t = 1 and dy\/dt = 1\./.test(r), r);
    t.ok('so the slip is right by luck', /It gets it right here by luck: dx\/dt = 1 and dy\/dt = 1, so multiplying by them changes nothing\. Anywhere else it would be wrong\./.test(r), r);
    t.eq('luck is found', await found(t), ['luck', 'speeds', 'xonly', 'yonly']);
    t.ok('and no slip line is drawn, since it agrees', !(await has(t, 'slip')));

    // --- the circle: the parts cancel ---
    await pick(t, 1);
    t.eq('the circle starts at t = 0', await shown(t), 't = 0');
    t.eq('and back on both parts', await pressed(t), 'true,false,false,false');
    r = await read(t);
    t.ok('at t = 0 both parts are 0', /That agrees: dz\/dt = 0, and both parts are 0 here\. The path circles the bowl at radius 1, so z never changes at all\./.test(r), r);
    await press(t, 'pcTHi', 2);
    t.eq('the stepper lands on π/4', await shown(t), 't = π/4');
    r = await read(t);
    t.ok('the speeds come from cos and sin', /At t = π\/4: x ≈ 0\.707 and y ≈ 0\.707, so z = 1\. Along the path, dx\/dt = −sin t ≈ −0\.707 and dy\/dt = cos t ≈ 0\.707\./.test(r), r);
    t.ok('the parts are −1 and 1', /The x part is 1\.414 × \(−0\.707\) = −1 and the y part is 1\.414 × 0\.707 = 1, so dz\/dt = 0\./.test(r), r);
    t.ok('and they cancel', /The two parts cancel: one pushes z up exactly as fast as the other pulls it down\. The path circles the bowl at radius 1, so z never changes at all\./.test(r), r);
    t.eq('the cancel is found', await found(t), ['cancel', 'luck', 'speeds', 'xonly', 'yonly']);

    // --- x = t, y = 2 − t: the top, then a tug of war ---
    await pick(t, 2);
    t.eq('the last path starts at t = 1', await shown(t), 't = 1');
    r = await read(t);
    t.ok('a y part can be negative', /The x part is 2 × 1 = 2 and the y part is 1 × \(−1\) = −1, so dz\/dt = 1\./.test(r), r);
    await press(t, 'pcTHi', 1);
    r = await read(t);
    t.eq('the stepper lands on 4/3', await shown(t), 't = 4/3');
    t.ok('the parts cancel at the top', /The x part is 1\.778 × 1 ≈ 1\.778 and the y part is 1\.778 × \(−1\) ≈ −1\.778, so dz\/dt = 0\./.test(r), r);
    t.ok('and it is the highest point', /This is the highest point of z along the path, 32\/27 ≈ 1\.185\./.test(r), r);
    t.eq('the top is found', await found(t), ['cancel', 'luck', 'peak', 'speeds', 'xonly', 'yonly']);
    await press(t, 'pcTHi', 1);
    r = await read(t);
    t.ok('past it the y part wins', /That agrees with dz\/dt ≈ −1\.667: the x part pushes z up, but the y part pulls harder, so z falls\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cancel', 'luck', 'peak', 'speeds', 'tug', 'xonly', 'yonly']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('pcGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'pcTHi', 9);
    t.eq('up stops at 2', await shown(t), 't = 2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('pcTHi').disabled));
    await press(t, 'pcTLo', 9);
    t.eq('down stops at 0', await shown(t), 't = 0');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('pcTLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { PathChain.moveT(-1); return PathChain.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-pathchain .wsCell button, #pcSets button, #pcModes button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each hill button names its hill and path', await t.ev(() =>
      [...document.querySelectorAll('#pcSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'z = xy along x = t², y = t | z = x² + y² along x = cos t, y = sin t | z = x²y along x = t, y = 2 − t');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#pcFig svg').getAttribute('aria-label')),
      'z along the path in blue, with its tangent at t = 0, rate 0. Below, the x part 0 and the y part 0 add to 0');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the path chain workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
