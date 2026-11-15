/* The arrow workshop: adding, stretching and measuring vectors.
 *
 * These checks open it from the Tome and drive it through its buttons: u =
 * ⟨3, 4⟩ opens at k = 1 with length 5 and nothing found; adding v at its tip
 * lands flat on the x-axis; k = 2 doubles the length; k = 0 leaves the zero
 * vector, drawn as a dot; k = −1 points it the other way; on ⟨1.2, 1.6⟩ k = ½
 * gives a unit vector and adding v cancels it to nothing; and on ⟨1, 1⟩ the
 * sum u + v has a whole-number length, which finishes the hunt. The stepper
 * stops at its ends, every button is named, it fits a phone, and nothing is
 * saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('vwRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#vwFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#vwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#vwSets button')[k].click(), k);
const shown = t => t.ev(() => document.getElementById('vwK').innerText);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const drawn = (t, k) => t.ev(k => !!document.querySelector(`#vwFig [data-k="${k}"]`), k);

module.exports = {
  name: 'arrow',
  title: 'Arrow workshop · adding, stretching and measuring vectors',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the arrow workshop', await t.showing('tomeArrow'));
    await t.tap('tomeArrow');
    t.eq('and one tap opens it', await t.screen(), 's-arrow');

    // --- u = ⟨3, 4⟩ at k = 1 ---
    let r = await read(t);
    t.ok('it names both vectors and the sum', /u = ⟨3, 4⟩, v = ⟨2, −4⟩, and w = k·u\./.test(r), r);
    t.ok('leaves u as it is at k = 1', /k = 1 leaves u as it is: k·u = ⟨3, 4⟩\./.test(r), r);
    t.ok('measures it with Pythagoras', /‖w‖ = √\(3² \+ 4²\) = √25 = 5, by Pythagoras on the dashed right triangle under w\./.test(r), r);
    t.ok('and shrinks it to a unit vector', /Its unit vector is w ÷ ‖w‖ = ⟨3, 4⟩ ÷ 5 = ⟨0\.6, 0\.8⟩: the same direction, length 1\./.test(r), r);
    t.eq('the stepper reads k', await shown(t), 'k = 1');
    t.eq('the caption names the colours', await cap(t), 'The faint dashed arrow is u. In blue, k·u: u stretched by k. In gold, v, walked from the tip of k·u. In green, w, straight from the start to where you land, over the dashed right triangle that gives its length.');
    t.eq('nothing is found before anything is turned', await found(t), []);
    t.ok('v is not drawn yet', !(await drawn(t, 'v')));
    t.ok('but the right triangle under w is', await drawn(t, 'leg'));

    // --- tip to tail ---
    await press(t, 'vwAdd');
    r = await read(t);
    t.ok('v is walked from the tip', /Walk v from the tip of k·u: w = ⟨3, 4⟩ \+ ⟨2, −4⟩ = ⟨5, 0⟩, adding first with first and second with second\./.test(r), r);
    t.ok('and lands flat', /w lies flat along the x-axis: its second part is 0/.test(r), r);
    t.ok('and the lengths do not add', /‖u‖ \+ ‖v‖ = 5 \+ √20 ≈ 9\.4721, more than ‖w‖ = 5: walking u and then v is a longer way round/.test(r), r);
    t.ok('v is drawn in gold', await drawn(t, 'v'));
    t.ok('and no triangle on a flat arrow', !(await drawn(t, 'leg')));
    t.eq('the add button says it is pressed', await t.ev(() => document.getElementById('vwAdd').getAttribute('aria-pressed')), 'true');
    t.eq('and offers to take v off', await t.ev(() => document.getElementById('vwAdd').innerText), 'Take v off');
    t.eq('tip to tail is found', await found(t), ['tip']);
    t.ok('with a toast', /✓ Tip to tail/.test(await toast(t)), await toast(t));

    // --- twice as long ---
    await press(t, 'vwAdd');
    await press(t, 'vwKHi', 2);
    r = await read(t);
    t.eq('k steps by halves', await shown(t), 'k = 2');
    t.ok('k = 2 doubles every part', /k·u = 2·⟨3, 4⟩ = ⟨6, 8⟩: every part of u is multiplied by 2, so it points the same way, 2 times as long\./.test(r), r);
    t.ok('and the length with it', /That is \|k\| × ‖u‖ = 2 × 5 = 10: stretching by k stretches the length by \|k\|/.test(r), r);
    t.eq('twice as long is found', await found(t), ['double', 'tip']);
    t.ok('and the forward button is off at the top', await t.ev(() => document.getElementById('vwKHi').disabled));

    // --- the zero vector, then the other way ---
    await press(t, 'vwKLo', 4);
    r = await read(t);
    t.ok('k = 0 leaves nothing', /k = 0 shrinks u to nothing: 0·⟨3, 4⟩ = ⟨0, 0⟩\..*‖w‖ = √\(0² \+ 0²\) = 0: w is the zero vector, with no length and no direction\. The zero vector has no unit vector/.test(r), r);
    t.ok('drawn as a dot', await drawn(t, 'zero'));
    await press(t, 'vwKLo', 2);
    r = await read(t);
    t.ok('k = −1 turns it round', /k·u = −1·⟨3, 4⟩ = ⟨−3, −4⟩: every part of u is multiplied by −1, so it points the opposite way, just as long\./.test(r), r);
    t.ok('with negative parts squared', /‖w‖ = √\(\(−3\)² \+ \(−4\)²\) = √25 = 5/.test(r), r);
    t.eq('the other way is found', await found(t), ['double', 'flip', 'tip']);

    // --- a unit vector, then cancelling ---
    await pick(t, 1);
    t.eq('a new pair starts at k = 1', await shown(t), 'k = 1');
    t.eq('without v', await t.ev(() => document.getElementById('vwAdd').getAttribute('aria-pressed')), 'false');
    await press(t, 'vwKLo');
    r = await read(t);
    t.ok('half of ⟨1.2, 1.6⟩ has length 1', /k·u = 0\.5·⟨1\.2, 1\.6⟩ = ⟨0\.6, 0\.8⟩.*half as long.*‖w‖ = √\(0\.6² \+ 0\.8²\) = √1 = 1.*‖w‖ = 1, so w is a unit vector already/.test(r), r);
    t.eq('a unit vector is found', await found(t), ['double', 'flip', 'tip', 'unit']);
    await press(t, 'vwAdd');
    r = await read(t);
    t.ok('v cancels it', /w = ⟨0\.6, 0\.8⟩ \+ ⟨−0\.6, −0\.8⟩ = ⟨0, 0⟩/.test(r), r);
    t.eq('cancelling out is found', await found(t), ['cancel', 'double', 'flip', 'tip', 'unit']);

    // --- a whole-number length ---
    await pick(t, 2);
    r = await read(t);
    t.ok('⟨1, 1⟩ has length √2', /‖w‖ = √\(1² \+ 1²\) = √2 ≈ 1\.4142/.test(r), r);
    t.ok('and its unit vector is worked to four places', /⟨1, 1⟩ ÷ √2 ≈ ⟨0\.7071, 0\.7071⟩/.test(r), r);
    await press(t, 'vwAdd');
    r = await read(t);
    t.ok('u + v has length 2', /w = ⟨1, 1⟩ \+ ⟨1, −1⟩ = ⟨2, 0⟩.*√4 = 2.*‖u‖ \+ ‖v‖ = √2 \+ √2 ≈ 2\.8284, more than ‖w‖ = 2/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cancel', 'double', 'flip', 'tip', 'unit', 'whole']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('vwGoals').innerText)));

    // --- the stepper's ends ---
    await press(t, 'vwKLo', 12);
    t.eq('k stops at −2', await shown(t), 'k = −2');
    t.ok('and its button is off there', await t.ev(() => document.getElementById('vwKLo').disabled));
    t.eq('and a press past it changes nothing', await t.ev(() => { Arrow.moveK(-1); return Arrow.k; }), 0);

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-arrow .wsCell button, #vwSets button, #vwAdd')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each pair button reads both vectors', await t.ev(() =>
      [...document.querySelectorAll('#vwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'u = ⟨3, 4⟩ and v = ⟨2, −4⟩ | u = ⟨1.2, 1.6⟩ and v = ⟨−0.6, −0.8⟩ | u = ⟨1, 1⟩ and v = ⟨1, −1⟩');
    t.ok('the drawing is named for a screen reader', await t.ev(() => /w = ⟨−1, −3⟩ in green, length about 3\.1623, built from −2·u in blue and v in gold/.test(document.querySelector('#vwFig svg').getAttribute('aria-label'))));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the arrow workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
