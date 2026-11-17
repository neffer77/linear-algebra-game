/* Walk the fence. The hillwalker workshop's third mode: Lagrange multipliers
 * by walking.
 *
 * These checks open the workshop from the Tome, switch to the mode, and walk
 * it through its buttons: the round bowl opens at (0, 4), where f still falls
 * along the fence and the fence crosses the y-axis; walking back to the end
 * post shuts the back button, and walking on to (2, 2) finds the lowest
 * point, with λ = 4 and ∇f drawn in line with ∇g. On the oval bowl the post
 * nearest the middle, (2, 2), still falls, and the lowest point is (3, 1)
 * with λ = 6. On the slanted fence the lowest point is (1, 2) with λ = 2,
 * which brings the banner. Every button is named, it fits a phone, the
 * hands-on workshop comes back, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('hfRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#hfGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pressed = t => t.ev(() => [...document.querySelectorAll('#hwTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const set = (t, i) => t.ev(i => document.querySelectorAll('#hfSets button')[i].click(), i);
const step = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
// the cross product of the two arrows as drawn: 0 when ∇f lines up with ∇g
const lined = t => t.ev(() => {
  const d = k => { const l = document.querySelector(`#hfFig line[data-k="${k}"]`); return [l.getAttribute('x2') - l.getAttribute('x1'), l.getAttribute('y2') - l.getAttribute('y1')]; };
  const [a, b] = [d('grad'), d('gg')]; return Math.abs(a[0] * b[1] - a[1] * b[0]) / Math.hypot(...a) / Math.hypot(...b) < 0.01;
});
const AWAY = ['hwSets', 'hwFig', 'hwStep', 'hwRead', 'hwGoalPanel'];

module.exports = {
  name: 'hillfence',
  title: 'Walk the fence · the lowest point on a line, where ∇f = λ∇g',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the hillwalker workshop can walk a fence', await t.ev(() =>
      /Or walk a fence to its lowest point, where ∇f = λ∇g\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeHill');
    t.eq('the hillwalker workshop opens', await t.screen(), 's-hill');
    t.eq('walking it by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Walk the fence/);
    t.eq('walking the fence is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the hands-on workshop steps aside', away);

    // --- the round bowl ---
    let r = await read(t);
    t.ok('it opens at (0, 4) on the fence', /^f\(x, y\) = x² \+ y², and the fence is g\(x, y\) = x \+ y = 4\. You stand at \(0, 4\), on the fence since 1 × 0 \+ 1 × 4 = 4, where f = 16\./.test(r), r);
    t.ok('it works both gradients', /∇f = \(2x, 2y\) = ⟨0, 8⟩, the way up the hill\. ∇g = ⟨1, 1⟩, which points straight off the fence\./.test(r), r);
    t.ok('and the slope along the fence, still falling', /∇f · ⟨1, −1⟩ = 0 × 1 \+ 8 × \(−1\) = −8\. That is below 0, so f falls going on and rises going back: the lowest point is further on\./.test(r), r);
    t.ok('it checks with the posts either side', /Check with the posts either side: one post back f = 26 and one post on f = 10\./.test(r), r);
    t.ok('and says the axis is nothing special', /Here the fence crosses the y-axis, but the axis is nothing special: f = 16 here is not the lowest the fence goes\.$/.test(r), r);
    t.eq('nothing is found before a step', await found(t), []);
    t.ok('∇f is not in line with ∇g', !(await lined(t)));
    await step(t, 'hfLo');
    t.ok('walking back reaches the end post', /You stand at \(−1, 5\)/.test(await read(t)) && await t.ev(() => document.getElementById('hfLo').disabled));
    t.ok('which is checked with one post', /Check with the post beside it: one post on f = 16\./.test(await read(t)));
    await step(t, 'hfLo', 3);
    t.ok('the back button stops there', /You stand at \(−1, 5\)/.test(await read(t)));
    await step(t, 'hfHi');
    t.eq('back on the y-axis, that is found', await found(t), ['axis']);
    await step(t, 'hfHi', 2);
    r = await read(t);
    t.ok('(2, 2) is the lowest point, with λ = 4', /You stand at \(2, 2\).*= 4 × 1 \+ 4 × \(−1\) = 0\. That is 0: ∇f has no part along the fence, so it is at a right angle to it, just as ∇g is\. ∇f and ∇g line up: ∇f = λ∇g with λ = 4 \/ 1 = 4, and 4 = 4 × 1 checks the second part\. This is the lowest point on the fence, where f = 8\./.test(r), r);
    t.ok('and both posts beside it are higher', /one post back f = 10 and one post on f = 10\.$/.test(r), r);
    t.ok('∇f is drawn in line with ∇g', await lined(t));
    t.eq('the lowest point is found', await found(t), ['axis', 'low']);
    t.ok('with a toast', /✓ The lowest point on the fence/.test(await toast(t)), await toast(t));

    // --- the oval bowl ---
    await set(t, 1);
    t.ok('the oval bowl opens at (0, 4)', /^f\(x, y\) = x² \+ 3y², .*You stand at \(0, 4\)/.test(await read(t)));
    await step(t, 'hfHi', 2);
    r = await read(t);
    t.ok('the post nearest the middle still falls', /You stand at \(2, 2\).*∇f = \(2x, 6y\) = ⟨4, 12⟩.*= −8\. That is below 0/.test(r), r);
    t.ok('and is said not to be the lowest', /This is the post nearest the middle \(0, 0\), but the oval bowl climbs three times as fast in y as in x, so its lowest point on the fence is not the nearest one\. The lowest point is where the fence just touches a contour\.$/.test(r), r);
    t.eq('that is found', await found(t), ['axis', 'low', 'near']);
    await step(t, 'hfHi');
    r = await read(t);
    t.ok('(3, 1) is the oval\'s lowest point, with λ = 6', /You stand at \(3, 1\).*λ = 6 \/ 1 = 6, and 6 = 6 × 1 checks the second part\. This is the lowest point on the fence, where f = 12\./.test(r), r);
    t.ok('∇f is drawn in line with ∇g there too', await lined(t));

    // --- the slanted fence ---
    await set(t, 2);
    t.ok('the slanted fence opens at (−3, 4)', /fence is g\(x, y\) = x \+ 2y = 5\. You stand at \(−3, 4\)/.test(await read(t)));
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      try { for (let k = 0; k < 2; k++) document.getElementById('hfHi').click(); } finally { Celebrate.banner = real; }
      return seen;
    });
    r = await read(t);
    t.ok('(1, 2) is the lowest point, with λ = 2', /You stand at \(1, 2\).*∇f · ⟨2, −1⟩ = 2 × 2 \+ 4 × \(−1\) = 0\..*λ = 2 \/ 1 = 2, and 4 = 2 × 2 checks the second part\. This is the lowest point on the fence, where f = 5\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['axis', 'lam', 'low', 'near', 'oval']);
    t.eq('the last one found brings a banner', banners.join(), 'FENCE WALKER / every fence walked');
    await step(t, 'hfHi', 5);
    t.ok('the walk stops at the last post, on the x-axis', /You stand at \(5, 0\)/.test(await read(t)) && await t.ev(() => document.getElementById('hfHi').disabled));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#hwTab button, #dsBox button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the drawing is named for a screen reader', await t.ev(() => /^Contours of f\(x, y\) = x² \+ y², the fence x \+ 2y = 5, and you at \(5, 0\) with ∇f = ⟨10, 0⟩ dashed in gold and ∇g = ⟨1, 2⟩ in green$/.test(document.querySelector('#hfFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hands-on workshop comes back', back);
    t.ok('and the fence is put away', await t.ev(() => !document.getElementById('hfSets')));
    t.ok('walking the fence changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Hill.tab = 'hand'; UI.go('s-title'); });
  }
};
