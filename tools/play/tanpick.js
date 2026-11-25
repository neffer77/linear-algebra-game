/* Which plane? The tangent plane workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a surface ax² + cxy + by², a whole point, and four
 * planes z = h + p(x − x₀) + q(y − y₀) offered; a wrong pick is shut, named
 * as the slip it is and checked at the point or by a step of 1, where the
 * surface sits its x² or y² number above a plane that touches; the right pick
 * counts, toasts, works the height and both slopes out, and deals a new
 * surface, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tnRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => TanPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#tnPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tqTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+';
const P = '\\(?−?\\d+\\)?';
const PLANE = `z = ${N} [+−] \\d*\\(x [+−] \\d\\) [+−] \\d*\\(y [+−] \\d\\)`;
const AWAY = ['tqSets', 'tqFig', 'tqP', 'tqStep', 'tqRead', 'tqGoalPanel'];

module.exports = {
  name: 'tanpick',
  title: 'Which plane? · pick the plane that touches a surface at a point',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the tangent plane workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a surface and a point, and pick which of four planes touches it there\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTanPlane');
    t.eq('the tangent plane workshop opens', await t.screen(), 's-tanplane');
    t.eq('building it by hand is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(5656));
    await t.tapText(/Which plane\?/);
    t.eq('which plane is now the pressed mode', await pressed(t), 'false,true,false');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the surfaces, slices, plane, buttons, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('tnBox').innerText)).startsWith(
      'The tangent plane at (x₀, y₀) is z = f(x₀, y₀) + f_x·(x − x₀) + f_y·(y − y₀).'));
    t.ok('the surface and the point are shown', new RegExp(`^Touch f\\(x, y\\) = −?\\d?x² [+−] \\d?xy [+−] \\d?y² at \\(${N}, ${N}\\)\\.$`).test(
      await t.ev(() => document.getElementById('tnQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#tnPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four planes are offered', labels.length, 4);
    t.ok('each is named by its plane', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${PLANE}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick in the slopes alone, checked by a step ---
    let k = await kinds(t);
    const slopeSlip = k.findIndex(x => ['swap', 'noTwo', 'noHold'].includes(x));
    await opt(t, slopeSlip);
    let r = await read(t);
    let L = 'ABCD'[slopeSlip];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (puts the slopes in each other’s places|forgets the 2 that a square brings down|drops the −?\\d?xy term from the slopes)`).test(r), r);
    t.ok('and checked by a step of 1', new RegExp(`Check ${L}: step 1 along ([xy]), from \\(${N}, ${N}\\) to \\(${N}, ${N}\\)\\. ${L}’s plane goes from ${N} to ${N} \\+ ${P} = ${N}\\. The surface goes to f\\(${N}, ${N}\\) = ${N}\\. Along \\1 a surface bends away from a plane that touches it by its \\1² part, ${N} × 1² = ${N}, so the surface minus the plane must be ${N}, but here it is ${N} − ${P} = ${N}\\.`).test(r), r);
    t.ok('and that plane is shut and told as not the tangent plane', await t.ev(i => { const b = document.querySelectorAll('#tnPick button')[i];
      return b.disabled && /\. Not the tangent plane$/.test(b.getAttribute('aria-label')); }, slopeSlip));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- a wrong pick in the height, checked at the point ---
    const heightSlip = k.findIndex(x => x !== 'right' && !['swap', 'noTwo', 'noHold'].includes(x));
    await opt(t, heightSlip);
    r = await read(t);
    L = 'ABCD'[heightSlip];
    t.ok('a wrong height is named as its slip', new RegExp(`^${L} (puts the point into f without squaring|puts the point in the wrong way round|leaves the −?\\d?xy term out of the height)`).test(r), r);
    t.ok('and checked at the point', new RegExp(`Check ${L}: at \\(${N}, ${N}\\) both brackets are 0, so ${L}’s plane has height ${N} there\\. The surface has f\\(${N}, ${N}\\) = ${N} × ${P}² \\+ ${P} × ${P} × ${P} \\+ ${P} × ${P}² = ${N}, so ${L}’s plane passes \\d+ (above|below) the point\\.`).test(r), r);

    // --- the right pick, after two misses ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(TanPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works the height and both slopes out', new RegExp(`^That was it: f\\(${N}, ${N}\\) = ${N}, f_x = −?\\d*x [+−] \\d*y = ${N} and f_y = −?\\d*x [+−] \\d*y = ${N} at the point, so the plane is ${PLANE}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the tangent plane, picked in 3 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new surface with all four open', await t.ev(() => [...document.querySelectorAll('#tnPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(TanPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = TanPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#tnPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'PLANE TOUCHER / 5 planes touched');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tqTab button, #tnPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#tnPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four planes sit one under another', tops.every((v, i) => i === 0 || v > tops[i - 1]), tops.join());

    await t.tapText(/Build it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its surfaces, slices, plane, buttons, readout and goals', back);
    t.ok('and the four planes are put away', await t.ev(() => !document.getElementById('tnPick')));
    t.ok('which plane changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); TanPlane.tab = 'hand'; UI.go('s-title'); });
  }
};
