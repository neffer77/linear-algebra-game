/* The tangent plane workshop: a height and two slopes, one for each slice.
 *
 * These checks open it from the Tome and drive it through its buttons. On the
 * bowl z = x² + y² at (1, 2), the right slopes with the height left at 0 show
 * a plane tilted correctly but lifted off the point; height 5 makes it the
 * tangent plane; a wrong x slope leaves one slice cutting across; and the two
 * slopes swapped cut across in both. Then the saddle, the lopsided bowl and
 * the dome are touched, finishing the hunt. The steppers stop at ±6, every
 * button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tqRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#tqFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#tqGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tqSets button')[k].click(), k);
const txt = (t, id) => t.ev(id => document.getElementById(id).innerText, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const lines = t => t.ev(() => [...new Set([...document.querySelectorAll('#tqFig [data-k]')].map(p => p.dataset.k))].sort().join());
const label = t => t.ev(() => document.querySelector('#tqFig svg').getAttribute('aria-label'));

module.exports = {
  name: 'tanplane',
  title: 'Tangent plane workshop · a height and two slopes',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the tangent plane workshop', await t.showing('tomeTanPlane'));
    await t.tap('tomeTanPlane');
    t.eq('and one tap opens it', await t.screen(), 's-tanplane');

    // --- the bowl, starting from the flat plane z = 0 ---
    let r = await read(t);
    t.ok('it names the surface and the point', /The surface is z = x² \+ y², a bowl\. Build the plane that touches it at \(1, 2\)\./.test(r), r);
    t.ok('reads the flat plane in point form', /Your plane is z = 0 \+ 0\(x − 1\) \+ 0\(y − 2\)\./.test(r), r);
    t.ok('works the height at the point', /At \(1, 2\) both brackets are 0, so your plane has height 0 there\. The surface has f\(1, 2\) = 1² \+ 2² = 5, so your plane passes 5 below the point\./.test(r), r);
    t.ok('works the x slope from the x slice', /Along x, y stays at 2 and only the x² term changes, so the slope is f_x = 2x = 2 at x = 1\. Your plane has slope 0 along x, so in that slice the line cuts across the curve\./.test(r), r);
    t.ok('and the y slope from the y slice', /Along y, x stays at 1 and only the y² term changes, so the slope is f_y = 2y = 4 at y = 2\. Your plane has slope 0 along y, so in that slice the line cuts across the curve\./.test(r), r);
    t.eq('the plane is shown big', await txt(t, 'tqP'), 'z = 0 + 0(x − 1) + 0(y − 2)');
    t.eq('the steppers read the height and both slopes', [await txt(t, 'tqh'), await txt(t, 'tqp'), await txt(t, 'tqq')].join(' | '), 'height = 0 | slope along x = 0 | slope along y = 0');
    t.eq('the bowl button shows as pressed', await t.ev(() => [...document.querySelectorAll('#tqSets button')].map(b => b.getAttribute('aria-pressed')).join(' ')), 'true false false false');
    t.eq('the caption names the colours', await cap(t), 'Each side is a slice through the surface: the gold curve is the surface, the green line is your plane, and the gold dot is the point. The plane touches when both green lines are tangent at the dot.');
    t.eq('both slices draw the curve, the plane, the point and the axis', await lines(t), 'curve0,curve1,plane0,plane1,point0,point1,zaxis');
    t.eq('the slices are labelled', await t.ev(() => [...document.querySelectorAll('#tqFig svg text')].map(e => e.textContent).join(' | ')), 'along x (y = 2) | along y (x = 1)');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- slopes right, height wrong ---
    await press(t, 'tqpHi', 2);
    r = await read(t);
    t.ok('the x slice touches once the slope is 2', /Your plane has slope 2 along x: that slice touches\./.test(r), r);
    await press(t, 'tqqHi', 4);
    r = await read(t);
    t.ok('both slopes right is still not the plane', /Both slopes are right, so the plane is tilted correctly, but it is lifted off the point: the height f\(1, 2\) = 5 comes first\./.test(r), r);
    t.eq('the lift is found', await found(t), ['lift']);
    t.ok('with a toast', /✓ Height first/.test(await toast(t)), await toast(t));

    // --- the tangent plane ---
    await press(t, 'tqhHi', 5);
    r = await read(t);
    t.ok('height 5 matches', /The surface has f\(1, 2\) = 1² \+ 2² = 5: the heights match\./.test(r), r);
    t.ok('and all three make the tangent plane', /All three match, so this is the tangent plane: z = 5 \+ 2\(x − 1\) \+ 4\(y − 2\)\. It is y = f\(a\) \+ f′\(a\)\(x − a\) with a second slope: the height at the point, plus each slope times how far you move\./.test(r), r);
    t.ok('which a bowl stays above', /The bowl curves up away from the plane in every direction, so the plane touches it at this one point and passes below it everywhere else\./.test(r), r);
    t.eq('the bowl is found', await found(t), ['bowl', 'lift']);
    t.ok('the figure says both lines touch', /: both lines touch$/.test(await label(t)), await label(t));

    // --- one slice wrong, then the slopes swapped ---
    await press(t, 'tqpHi', 2);
    r = await read(t);
    t.ok('a wrong x slope cuts across', /Your plane has slope 4 along x, so in that slice the line cuts across the curve\..*One slice touches and the other cuts across\. A tangent plane has to fit both slices at once\./.test(r), r);
    t.eq('the edge is found', await found(t), ['bowl', 'edge', 'lift']);
    t.ok('and the figure no longer touches', !/touch/.test(await label(t)), await label(t));
    await press(t, 'tqqLo', 2);
    r = await read(t);
    t.ok('the swapped slopes are caught', /Those are the two slopes in each other’s places\. f_x is the slope as x moves, so it belongs with \(x − 1\), and f_y with \(y − 2\)\./.test(r), r);
    t.eq('the swap is found', await found(t), ['bowl', 'edge', 'lift', 'swap']);

    // --- the saddle ---
    await pick(t, 1);
    t.eq('a new surface starts flat again', await txt(t, 'tqP'), 'z = 0 + 0(x − 2) + 0(y − 1)');
    r = await read(t);
    t.ok('the saddle has a minus slope along y', /The surface has f\(2, 1\) = 2² − 1² = 3, so your plane passes 3 below the point\..*f_y = −2y = −2 at y = 1\./.test(r), r);
    await press(t, 'tqhHi', 3); await press(t, 'tqpHi', 4); await press(t, 'tqqLo', 2);
    r = await read(t);
    t.ok('the saddle is touched with a minus in the plane', /All three match, so this is the tangent plane: z = 3 \+ 4\(x − 2\) − 2\(y − 1\)\./.test(r), r);
    t.ok('and it crosses its own tangent plane', /Along x the saddle curves up away from the plane and along y it curves down, so a saddle crosses its own tangent plane\./.test(r), r);

    // --- the lopsided bowl ---
    await pick(t, 2);
    await press(t, 'tqhHi', 3); await press(t, 'tqpLo', 4); await press(t, 'tqqHi', 2);
    r = await read(t);
    t.ok('a point left of 0 turns its bracket to a plus', /f\(−1, 1\) = 2·\(−1\)² \+ 1² = 3: the heights match\..*f_x = 4x = −4 at x = −1\..*All three match, so this is the tangent plane: z = 3 − 4\(x \+ 1\) \+ 2\(y − 1\)\./.test(r), r);

    // --- the dome ---
    await pick(t, 3);
    await press(t, 'tqhLo', 2); await press(t, 'tqpLo', 2); await press(t, 'tqqHi', 2);
    r = await read(t);
    t.ok('the dome is worked with its minus in brackets', /f\(1, −1\) = −\(1\)² − \(−1\)² = −2: the heights match\..*All three match, so this is the tangent plane: z = −2 − 2\(x − 1\) \+ 2\(y \+ 1\)\./.test(r), r);
    t.ok('and the dome stays below its plane', /The dome curves down away from the plane in every direction, so the plane touches it at this one point and passes above it everywhere else\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['bowl', 'dome', 'edge', 'lift', 'lop', 'saddle', 'swap']);
    t.ok('and the count says so', /7 of 7 found/.test(await t.ev(() => document.getElementById('tqGoals').innerText)));
    t.ok('the drawing is named for a screen reader', /^Two slices through a dome at \(1, −1\): along x the plane is a line of slope −2 against the curve's −2, along y a line of slope 2 against 2: both lines touch$/.test(await label(t)), await label(t));

    // --- the steppers' ends ---
    for (const k of ['h', 'p', 'q']) {
      await press(t, `tq${k}Hi`, 20);
      t.ok(`the ${k} stepper stops at 6`, / = 6$/.test(await txt(t, 'tq' + k)), await txt(t, 'tq' + k));
      t.ok('and its button is off there', await t.ev(id => document.getElementById(id).disabled, `tq${k}Hi`));
      await press(t, `tq${k}Lo`, 20);
      t.ok('and at −6', / = −6$/.test(await txt(t, 'tq' + k)), await txt(t, 'tq' + k));
      t.ok('and that button is off there', await t.ev(id => document.getElementById(id).disabled, `tq${k}Lo`));
    }
    t.eq('a press past the end changes nothing', await t.ev(() => { TanPlane.move('h', -1); return TanPlane.h; }), -6);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-tanplane button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each surface button reads its formula and point', await t.ev(() =>
      [...document.querySelectorAll('#tqSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Bowl: z = x² + y² at (1, 2) | Saddle: z = x² − y² at (2, 1) | Lopsided: z = 2x² + y² at (−1, 1) | Dome: z = −x² − y² at (1, −1)');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the tangent plane workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
