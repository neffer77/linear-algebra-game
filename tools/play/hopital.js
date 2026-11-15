/* The L'Hôpital workshop: ratios that give 0/0.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout says the square gives 0/0 at x = 1, finds the slopes of top and
 * bottom there and their ratio, 2, and then reads the top, bottom and ratio at
 * x = 1 + h; far from the point it says the curves bend away, and with h at
 * 0.01 it says the ratio is all but the ratio of the slopes, from the right and
 * then from the left; the figure draws both curves with the two heights
 * marked; the cube heads for 12/4 = 3 and sin x / x for 1; the last ratio is
 * not 0/0, its readout says differentiating anyway gives the wrong 4, and
 * closing in shows it heading for 2, which finishes the hunt. The stepper
 * stops at its ends even pressed past them, and every button is named. It fits
 * a phone and adds nothing to the save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hpRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#hpFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#hpGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#hpSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('hpH').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const spec = t => t.ev(() => { const s = window.__hpSpec; return JSON.stringify({ f: s.f, g: s.also.f, lo: s.lo, hi: s.hi, pts: s.pts.map(p => p.slice(0, 2).map(v => Math.round(v * 1e4) / 1e4)) }); });

module.exports = {
  name: 'hopital',
  title: "L'Hôpital workshop · ratios that give 0/0",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));
    // keep the last figure the workshop draws, so its curves and points can be read
    await t.ev(() => { const r = Figure.render; Figure.render = function (s, el) { if (el && el.id === 'hpFig') window.__hpSpec = s; return r.apply(this, arguments); }; });

    await t.ev(() => UI.go('s-tome'));
    t.ok("the Tome offers the L'Hôpital workshop", await t.showing('tomeHopital'));
    await t.tap('tomeHopital');
    t.eq('and one tap opens it', await t.screen(), 's-hopital');

    // --- it opens on the square with h = 0.5 ---
    let r = await read(t);
    t.ok('it says the square gives 0/0', /Put x = 1 into \(x² − 1\)\/\(x − 1\) and you get 0\/0: top and bottom are both 0 there, so the formula says nothing about where the ratio is heading\./.test(r), r);
    t.ok('and finds the ratio of the slopes', /The top's slope is f′\(x\) = 2x, so f′\(1\) = 2; the bottom's is g′\(x\) = 1, so g′\(1\) = 1\. So the ratio heads for f′\(1\)\/g′\(1\) = 2\/1 = 2: that is L'Hôpital's rule\./.test(r), r);
    t.ok('it reads the top, bottom and ratio at x = 1 + h', /With h = 0\.5, x = 1 \+ 0\.5 = 1\.5: the top is f\(1\.5\) = 1\.25 and the bottom is g\(1\.5\) = 0\.5, so their ratio is 2\.5\./.test(r), r);
    t.ok('and says this far out the curves bend away', /That is 0\.5 from 2: this far from x = 1 the curves bend away from their tangents\. Bring h closer to 0\./.test(r), r);
    t.eq('the stepper reads h', await shown(t), 'h = 0.5');
    t.eq('the caption names the colours', await cap(t), 'The gold curve is the top, x² − 1, and the blue curve the bottom, x − 1. Both cross 0 at x = 1. The red and blue points are their heights at x = 1.5, and the ratio is red over blue.');
    t.ok('a figure is drawn', await t.ev(() => !!document.querySelector('#hpFig canvas.fig')));
    t.eq('the figure draws top and bottom and marks their heights', await spec(t),
      '{"f":{"poly":[[1,2],[-1,0]]},"g":{"poly":[[1,1],[-1,0]]},"lo":-0.5,"hi":2.5,"pts":[[1.5,1.25],[1.5,0.5]]}');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.eq('the square is shown as picked', await t.ev(() =>
      [...document.querySelectorAll('#hpSets button')].map(b => b.getAttribute('aria-pressed')).join()), 'true,false,false,false');

    // --- close in from the right ---
    await press(t, 'hpHLo', 2);
    r = await read(t);
    t.eq('h steps to 0.01', await shown(t), 'h = 0.01');
    t.ok('the ratio is 2.01', /the top is f\(1\.01\) = 0\.0201 and the bottom is g\(1\.01\) = 0\.01, so their ratio is 2\.01\./.test(r), r);
    t.ok('and the readout says it is all but the ratio of the slopes', /That is 0\.01 from 2: this close to x = 1, top and bottom are as good as their tangents, so their ratio is all but the ratio of the slopes\./.test(r), r);
    t.eq('closing in from the right is found', await found(t), ['right']);
    t.ok('its toast starts with a capital', /✓ Closed in from the right/.test(await toast(t)), await toast(t));
    t.eq('the points follow h', await spec(t),
      '{"f":{"poly":[[1,2],[-1,0]]},"g":{"poly":[[1,1],[-1,0]]},"lo":-0.5,"hi":2.5,"pts":[[1.01,0.0201],[1.01,0.01]]}');

    // --- and from the left ---
    await press(t, 'hpHLo', 3);
    r = await read(t);
    t.eq('h crosses to the left', await shown(t), 'h = −0.01');
    t.ok('from the left the ratio is 1.99', /With h = −0\.01, x = 1 − 0\.01 = 0\.99: the top is f\(0\.99\) = −0\.0199 and the bottom is g\(0\.99\) = −0\.01, so their ratio is 1\.99\./.test(r), r);
    t.eq('closing in from the left is found', await found(t), ['left', 'right']);

    // --- the cube ---
    await pick(t, 1);
    t.eq('a new ratio starts h again', await shown(t), 'h = 0.5');
    r = await read(t);
    t.ok('the cube works its slopes', /f′\(x\) = 3x², so f′\(2\) = 3 × 2² = 12; the bottom's is g′\(x\) = 2x, so g′\(2\) = 2 × 2 = 4\. So the ratio heads for f′\(2\)\/g′\(2\) = 12\/4 = 3/.test(r), r);
    await press(t, 'hpHLo', 2);
    r = await read(t);
    t.ok('close in and it is about 3.0075', /so their ratio is about 3\.0075\. That is 0\.0075 from 3/.test(r), r);
    t.eq('running the cube down is found', await found(t), ['cube', 'left', 'right']);

    // --- sin x / x ---
    await pick(t, 2);
    await press(t, 'hpHLo', 2);
    r = await read(t);
    t.ok('sin x / x heads for cos 0 = 1', /f′\(x\) = cos x, so f′\(0\) = cos 0 = 1; the bottom's is g′\(x\) = 1, so g′\(0\) = 1\. So the ratio heads for f′\(0\)\/g′\(0\) = 1\/1 = 1/.test(r), r);
    t.ok('and at h = 0.01 it is 1 to four places', /the top is f\(0\.01\) ≈ 0\.01 and the bottom is g\(0\.01\) = 0\.01, so their ratio is about 1\. To four places that is 1 itself/.test(r), r);
    t.eq('running sin x / x down is found', await found(t), ['cube', 'left', 'right', 'sin']);

    // --- the one that is not 0/0 ---
    await pick(t, 3);
    r = await read(t);
    t.ok('the last ratio is not 0/0', /Put x = 2 into \(x² \+ 2\)\/\(x \+ 1\) and you get 6\/3 = 2: not 0\/0\. Nothing is broken here, so the limit is just that value, 2\./.test(r), r);
    t.ok("and the rule's answer is called wrong", /Differentiating anyway gives f′\(2\)\/g′\(2\) = 4\/1 = 4, and that is wrong: L'Hôpital's rule is only for 0\/0, where top and bottom both head to 0 together\./.test(r), r);
    t.ok('the caption says neither curve is 0 there', /Neither is 0 at x = 2\./.test(await cap(t)), await cap(t));
    await press(t, 'hpHLo', 2);
    r = await read(t);
    t.ok('closing in shows it heading for 2, not 4', /so their ratio is about 2\.0067\. The ratio heads for 2, the value at x = 2, not for 4: it is 0\.0067 from 2 and 1\.9933 from 4\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cube', 'left', 'right', 'sin', 'trap']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('hpGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'hpHHi', 12);
    t.eq('h stops at 1', await shown(t), 'h = 1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('hpHHi').disabled));
    await press(t, 'hpHLo', 20);
    t.eq('going down stops at −1', await shown(t), 'h = −1');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('hpHLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Hopital.moveH(-1); return Hopital.h(); }), -1);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-hopital .wsCell button, #hpSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each ratio button reads its ratio', await t.ev(() =>
      [...document.querySelectorAll('#hpSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Square: (x² − 1)/(x − 1) | Cube: (x³ − 8)/(x² − 4) | Sine: sin x / x | Plus two: (x² + 2)/(x + 1)');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok("the L'Hôpital workshop changes nothing in the save", await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
