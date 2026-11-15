/* The dot product workshop: two arrows set by hand.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * readout works u·v, both lengths, cos θ and the angle for the numbers on
 * screen; a dot product of 10, a negative one, a right angle with no zero in
 * sight, exactly opposite and exactly along are each reached and ticked only
 * then; the shadow points back against v when the sign is negative; an arrow
 * of length 0 is given no angle; the steppers stop at ±4 and are named; and
 * Start again keeps what was found. It fits a phone and adds nothing to the
 * save.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dtRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#dtFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#dtGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const btn = (w, i, up) => `${up ? 'Raise' : 'Lower'} ${w}'s ${i ? 'second' : 'first'} number`;
const press = (t, w, i, up, n) => t.ev(([label, n]) => {
  const b = document.querySelector(`#dtVecs button[aria-label="${label}"]`);
  for (let k = 0; k < n; k++) document.querySelector(`#dtVecs button[aria-label="${label}"]`).click();
  return !!b;
}, [btn(w, i, up), n || 1]);

module.exports = {
  name: 'dot',
  title: 'Dot product workshop · two arrows, their angle and a shadow',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Bram');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the dot product workshop', await t.showing('tomeDot'));
    await t.tap('tomeDot');
    t.eq('and one tap opens it', await t.screen(), 's-dot');

    // --- it opens on u = ⟨3, 1⟩ and v = ⟨1, 2⟩ ---
    let r = await read(t);
    t.ok('it works u·v for the numbers on screen', /u·v = u₁v₁ \+ u₂v₂ = 3·1 \+ 1·2 = 3 \+ 2 = 5\./.test(r), r);
    t.ok('and both lengths from their squares', /‖u‖ = √\(3² \+ 1²\) = √10 and ‖v‖ = √\(1² \+ 2²\) = √5\./.test(r), r);
    t.ok('and the angle through cos θ', /cos θ = u·v \/ \(‖u‖ × ‖v‖\) = 5 \/ \(√10 × √5\) ≈ 0\.707, so θ = 45°/.test(r), r);
    t.ok('and the shadow u casts on v', /\|u·v\| \/ ‖v‖ = 5 \/ √5 ≈ 2\.24 long, pointing along v/.test(r), r);
    t.ok('the caption names the gold shadow', /shadow on v in gold/.test(await cap(t)));
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('a figure of the two arrows is drawn', await t.ev(() => !!document.querySelector('#dtFig canvas.fig')));

    // --- v onto u: a dot product of 10 ---
    await press(t, 'v', 0, true, 2);
    await press(t, 'v', 1, false, 1);
    t.ok('v = u gives 3·3 + 1·1 = 10', /= 3·3 \+ 1·1 = 9 \+ 1 = 10\./.test(await read(t)));
    t.eq('making 10 is found, and v = u is not a different length', await found(t), ['ten']);

    // --- round to a right angle, through a negative ---
    await press(t, 'v', 0, false, 4);
    t.ok('v = ⟨−1, 1⟩ gives a negative', /3·\(−1\) \+ 1·1 = −3 \+ 1 = −2\..*Negative: the arrows lean apart/.test(await read(t)));
    t.ok('and the shadow points back against v', /and it points back against v: that is where the minus sign comes from/.test(await read(t)));
    await press(t, 'v', 1, true, 2);
    r = await read(t);
    t.ok('v = ⟨−1, 3⟩ is perpendicular', /= −3 \+ 3 = 0\..*= 0, so θ = 90°\. Zero: the arrows are perpendicular/.test(r), r);
    t.ok('with no shadow at all', /u casts no shadow on v's line at all/.test(r), r);
    t.eq('the caption drops the shadow', await cap(t), 'u in blue, v in green.');
    t.eq('negative and both right angles are found', await found(t), ['neg', 'perp', 'ten', 'tilt']);

    // --- exactly opposite ---
    await press(t, 'v', 0, false, 2);
    await press(t, 'v', 1, false, 4);
    r = await read(t);
    t.ok('v = ⟨−3, −1⟩ is exactly opposite', /= −1, so θ = 180°\. Negative, and as low as these two lengths allow/.test(r), r);
    t.eq('opposite is found', await found(t), ['neg', 'opp', 'perp', 'ten', 'tilt']);

    // --- exactly along, at another length ---
    await press(t, 'u', 0, false, 1);
    await press(t, 'v', 0, true, 7);
    await press(t, 'v', 1, true, 3);
    r = await read(t);
    t.ok('u = ⟨2, 1⟩ and v = ⟨4, 2⟩ lie along each other', /= 1, so θ = 0°\. Positive, and as large as these two lengths allow/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['neg', 'opp', 'perp', 'same', 'ten', 'tilt']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('dtGoals').innerText)));
    t.ok('v\'s first number stops at 4', await t.ev(l => document.querySelector(`#dtVecs button[aria-label="${l}"]`).disabled, btn('v', 0, true)));

    // --- start again keeps the finds; a zero arrow has no angle ---
    await t.tapText(/^Start again$/);
    t.ok('Start again puts the arrows back', /= 3 \+ 2 = 5\./.test(await read(t)));
    t.ok('and keeps what was found', /6 of 6 found/.test(await t.ev(() => document.getElementById('dtGoals').innerText)));
    await press(t, 'u', 0, false, 3);
    await press(t, 'u', 1, false, 1);
    r = await read(t);
    t.ok('u = ⟨0, 0⟩ is given no angle', /u is ⟨0, 0⟩, which points nowhere, so there is no angle to measure/.test(r), r);
    t.ok('and no lengths are divided by', !/cos θ/.test(r), r);
    t.eq('the caption says why', await cap(t), 'An arrow of length 0 has no direction.');

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dtVecs button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each stepper button says what it moves', unnamed, 0);

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the dot product workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
