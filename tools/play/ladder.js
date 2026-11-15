/* The ladder workshop: related rates.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * 5 m ladder opens with its foot 4.5 m out, the top about 2.1794 m up and
 * falling at about 2.0647 m/s; sliding the foot in to 3 m makes a whole-number
 * 3-4-5 ladder whose top falls at 0.75 m/s, slower than the foot; sliding out
 * to 4.8 m the top races at more than three times the foot's speed; the 10 m
 * ladder at 9.5 m shows the 0.01 s check already beating y′, which finishes
 * the hunt. The drawing puts the ladder between wall and ground and its speed
 * bars stand in the ratio x/y. The stepper stops at its ends, every button is
 * named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ldRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#ldFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#ldGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#ldSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('ldX').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const bars = t => t.ev(() => [...document.querySelectorAll('#ldFig svg rect')].map(r => +r.getAttribute('width')));

module.exports = {
  name: 'ladder',
  title: 'Ladder workshop · related rates',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the ladder workshop', await t.showing('tomeLadder'));
    await t.tap('tomeLadder');
    t.eq('and one tap opens it', await t.screen(), 's-ladder');

    // --- it opens on the 5 m ladder with the foot 4.5 m out ---
    let r = await read(t);
    t.ok('it finds the top by Pythagoras', /The ladder is 5 m long, so x² \+ y² = 25 at every moment\. With the foot x = 4\.5 m from the wall, the top is y = √\(25 − 20\.25\) ≈ 2\.1794 m up\./.test(r), r);
    t.ok('differentiates in time', /Differentiate both sides in time: 2x·x′ \+ 2y·y′ = 0, so y′ = −x·x′\/y\./.test(r), r);
    t.ok('and works the top\'s speed', /The foot slides out at x′ = 1 m\/s, so y′ = −4\.5 × 1 \/ 2\.1794 ≈ −2\.0647 m\/s\./.test(r), r);
    t.ok('then compares it with the foot', /So the top slides down at about 2\.0647 m\/s, faster than the foot's 1 m\/s: the top always moves x\/y times as fast as the foot, and here x\/y ≈ 2\.0647\./.test(r), r);
    t.ok('and checks it over the next 0.01 s', /Check: 0\.01 s later the foot is at 4\.51 m and the top at ≈ 2\.1587 m, so the top fell ≈ 0\.020769 m, about 2\.0769 m\/s\. That matches y′ to within 0\.1 m\/s/.test(r), r);
    t.eq('the stepper reads the foot', await shown(t), 'x = 4.5 m');
    t.eq('the caption names the colours', await cap(t), "The gold ladder leans on the wall, its blue foot x m out and its red top y m up. On the right, the blue bar is the foot's speed, 1 m/s, and the red bar the top's, to one scale.");
    let B = await bars(t);
    t.ok("the speed bars stand in the ratio x/y", B.length === 2 && Math.abs(B[1] / B[0] - 2.0647) < 0.01, JSON.stringify(B));
    t.ok('the drawing is named for a screen reader', await t.ev(() => /5 m ladder/.test(document.querySelector('#ldFig svg').getAttribute('aria-label'))));
    t.eq('nothing is found before anything is turned', await found(t), []);

    // --- slide the foot in to a 3-4-5 ladder ---
    await press(t, 'ldXLo', 2);
    r = await read(t);
    t.eq('the foot slides in to 3 m', await shown(t), 'x = 3 m');
    t.ok('the top is 4 m up', /the top is y = √\(25 − 9\) = 4 m up\./.test(r), r);
    t.ok('and falls at 0.75 m/s, slower than the foot', /So the top slides down at 0\.75 m\/s, slower than the foot's 1 m\/s: .* here x\/y = 0\.75\./.test(r), r);
    t.eq('slow and whole-number places are found', await found(t), ['slow', 'whole']);
    t.ok('with a toast', /✓ The top is the slow one here/.test(await toast(t)), await toast(t));
    B = await bars(t);
    t.ok('the top\'s bar is now the shorter', B[1] < B[0], JSON.stringify(B));

    // --- slide out until the top races ---
    await press(t, 'ldXHi', 3);
    r = await read(t);
    t.eq('the foot slides out to 4.8 m', await shown(t), 'x = 4.8 m');
    t.ok('the top races at about 3.4286 m/s', /So the top slides down at about 3\.4286 m\/s, faster than the foot's 1 m\/s/.test(r), r);
    t.eq('more than three times as fast is found', await found(t), ['fast', 'slow', 'whole']);
    t.ok('the stepper stops at the last place', await t.ev(() => document.getElementById('ldXHi').disabled));

    // --- the 10 m ladder near the ground ---
    await pick(t, 2);
    t.eq('a new ladder starts at its own place', await shown(t), 'x = 9 m');
    await press(t, 'ldXHi', 1);
    r = await read(t);
    t.ok('near the ground the check beats y′', /about 9\.2796 m\/s\. That is already 0\.1523 m\/s faster than y′ says: this near the ground the top's speed is changing fast\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['bend', 'fast', 'slow', 'whole']);
    t.ok('and the count says so', /4 of 4 found/.test(await t.ev(() => document.getElementById('ldGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'ldXLo', 12);
    t.eq('sliding in stops at 2 m', await shown(t), 'x = 2 m');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('ldXLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Ladder.moveX(-1); return Ladder.x(); }), 2);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-ladder .wsCell button, #ldSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each ladder button reads its speed', await t.ev(() =>
      [...document.querySelectorAll('#ldSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      '5 m ladder, its foot sliding out at 1 m/s | 13 m ladder, its foot sliding out at 2 m/s | 10 m ladder, its foot sliding out at 3 m/s');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the ladder workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
