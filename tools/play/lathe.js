/* The lathe workshop: a volume of revolution as a stack of disks.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * cone opens cut into 4 disks, 1.56% short with nothing found; 8 disks bring
 * it within 1% and the readout names the cone formula; the bowl is exact with
 * any number of disks, and with just one that finishes a goal; the ball needs
 * 8 and lands on the sphere formula; the horn needs 16, which finishes the
 * hunt. The drawing has one disk per slice, the stepper stops at 1 and 64,
 * every button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lhRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#lhFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#lhGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#lhSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('lhN').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const disks = t => t.ev(() => document.querySelectorAll('#lhFig rect[data-k="disk"]').length);

module.exports = {
  name: 'lathe',
  title: 'Lathe workshop · volumes of revolution',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the lathe workshop', await t.showing('tomeLathe'));
    await t.tap('tomeLathe');
    t.eq('and one tap opens it', await t.screen(), 's-lathe');

    // --- the cone in 4 disks ---
    let r = await read(t);
    t.ok('it says what each disk holds', /Spin f\(x\) = x around the x-axis over \[0, 3\]\. Each slice of width Δx spins into a disk whose radius is f at the slice's middle, so it holds π f\(x\)² Δx\./.test(r), r);
    t.ok('adds up the disks', /With 4 slices of width 3\/4, the disks add up to about 8\.8594 times π, which is about 27\.8325\./.test(r), r);
    t.ok('works the exact volume', /The exact volume is π∫₀³ x² dx = π\[x³\/3\]₀³ = 9π ≈ 28\.2743\./.test(r), r);
    t.ok('and how far off the disks are', /The disks are off by about 0\.4418, 1\.56% of the volume\. Cut thinner slices to come closer\./.test(r), r);
    t.ok('and lands on the cone formula', /That is the cone formula, \(1\/3\)πr²h = \(1\/3\)π × 3² × 3 = 9π\./.test(r), r);
    t.eq('the stepper reads the disks', await shown(t), '4 disks');
    t.eq('one disk is drawn per slice', await disks(t), 4);
    t.eq('the caption says what the bars are', await cap(t), 'Seen from the side: the blue curve and its mirror trace the solid, the dashed line is the axis it spins around, and each gold bar is one disk, as wide as its slice and as tall as the solid at the slice\'s middle.');
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- 8 disks ---
    await press(t, 'lhNHi');
    r = await read(t);
    t.eq('each press doubles the disks', await shown(t), '8 disks');
    t.ok('8 disks are within 1%', /The disks are off by about 0\.1104, 0\.39% of the volume, within 1%\./.test(r), r);
    t.eq('the cone is found', await found(t), ['cone']);
    t.ok('with a toast', /✓ The cone measured/.test(await toast(t)), await toast(t));
    t.eq('and 8 disks are drawn', await disks(t), 8);

    // --- the bowl ---
    await pick(t, 1);
    t.eq('a new solid starts at 4 disks', await shown(t), '4 disks');
    r = await read(t);
    t.ok('the bowl is exact already', /The disks are exactly right: the graph of f\(x\)² = x is a straight line, so on each slice the part above the middle's height exactly makes up for the part below it\./.test(r), r);
    t.ok('and is half its cylinder', /That is exactly half the cylinder around it, π × 2² × 4 = 16π\./.test(r), r);
    t.eq('but four disks do not find it', await found(t), ['cone']);
    await press(t, 'lhNLo', 2);
    r = await read(t);
    t.eq('the stepper says one disk', await shown(t), '1 disk');
    t.ok('one disk is exact too', /With 1 slice of width 4, the disk comes to 8 times π, which is about 25\.1327\..*The disks are exactly right, even with just one/.test(r), r);
    t.eq('one disk finds the bowl', await found(t), ['cone', 'one']);

    // --- the ball ---
    await pick(t, 2);
    r = await read(t);
    t.ok('the ball with 4 disks', /With 4 slices of width 1, the disks add up to 11 times π, which is about 34\.5575\./.test(r), r);
    t.ok('works π∫(4 − x²)', /π∫₋₂² \(4 − x²\) dx = π\[4x − x³\/3\]₋₂² = 32π\/3 ≈ 33\.5103\./.test(r), r);
    await press(t, 'lhNHi');
    r = await read(t);
    t.ok('8 disks bring the ball within 1%', /0\.78% of the volume, within 1%\..*That is the sphere formula, \(4\/3\)πr³ = \(4\/3\)π × 2³ = 32π\/3\./.test(r), r);
    t.eq('the ball is found', await found(t), ['ball', 'cone', 'one']);

    // --- the horn ---
    await pick(t, 3);
    await press(t, 'lhNHi');
    r = await read(t);
    t.ok('8 disks are not enough for the horn', /1\.3% of the volume\. Cut thinner slices/.test(r), r);
    t.eq('so the horn is not found yet', await found(t), ['ball', 'cone', 'one']);
    await press(t, 'lhNHi');
    r = await read(t);
    t.ok('16 disks are', /With 16 slices of width 1\/8.*0\.33% of the volume, within 1%\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['ball', 'cone', 'horn', 'one']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('lhGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'lhNHi', 6);
    t.eq('doubling stops at 64', await shown(t), '64 disks');
    t.eq('with 64 drawn', await disks(t), 64);
    t.ok('and its button is off there', await t.ev(() => document.getElementById('lhNHi').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Lathe.moveN(1); return Lathe.k; }), 6);
    await press(t, 'lhNLo', 8);
    t.eq('halving stops at 1', await shown(t), '1 disk');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('lhNLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Lathe.moveN(-1); return Lathe.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-lathe .wsCell button, #lhSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each solid button reads its curve', await t.ev(() =>
      [...document.querySelectorAll('#lhSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Cone: spin f(x) = x over [0, 3] | Bowl: spin f(x) = √x over [0, 4] | Ball: spin f(x) = √(4 − x²) over [−2, 2] | Horn: spin f(x) = x²/2 over [0, 2]');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /f\(x\) = x²\/2 spun around the x-axis, cut into 1 disk holding 1\.5708, against the exact 8π\/5/.test(document.querySelector('#lhFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the lathe workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
