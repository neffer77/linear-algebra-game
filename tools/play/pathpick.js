/* Which rate? The path chain workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a hill k·xᵐ·yⁿ, a path x = αt + β, y = γt² + δ and
 * a whole t, and four rates offered; a wrong pick is shut, named as the slip
 * it is and checked by a nudge in t against the rise it would give; the right
 * pick counts, toasts, works both parts of dz/dt out, and deals a new hill and
 * path, and a first try is counted apart. Every button is named, the hands-on
 * workshop steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('rtRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => PathPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#rtPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#pcTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+';
const D = '−?\\d+(?:\\.\\d+)?';
const P = '\\(?−?\\d+\\)?';
const AWAY = ['pcSets', 'pcFig', 'pcStep', 'pcModes', 'pcRead', 'pcGoalPanel'];

module.exports = {
  name: 'pathpick',
  title: 'Which rate? · pick dz/dt along a path over a hill',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the path chain workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a hill, a path and a moment, and pick which of four numbers is dz\/dt\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomePathChain');
    t.eq('the path chain workshop opens', await t.screen(), 's-pathchain');
    t.eq('walking it by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5757));
    await t.tapText(/Which rate\?/);
    t.eq('which rate is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the hills, drawing, t stepper, slip modes, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('rtBox').innerText)).startsWith(
      'A point moving along a path moves both x and y, so z changes for two reasons.'));
    t.ok('the hill, path and moment are shown', new RegExp(`^z = \\d?x²?y²?, along x = −?\\d?t(?: [+−] \\d)?, y = −?\\d?t²(?: [+−] \\d)?, at t = ${N}\\.$`).test(
      await t.ev(() => document.getElementById('rtQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#rtPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four rates are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (keeps only the x part|keeps only the y part|adds the two slopes|multiplies each slope by the other letter's speed|forgets to bring the power down|forgets the 2 that t² brings down)`).test(r), r);
    t.ok('and checked by a nudge in t', new RegExp(`Check ${L}: nudge t from ${D} to ${D}, a change of 0\\.002\\. z goes from ${D} to ${D}, a rise of about ${D}\\. If dz/dt were ${N}, z would rise about ${N} × 0\\.002 = ${D}, not ${D}\\.`).test(r), r);
    t.ok('and that rate is shut and told as not dz/dt', await t.ev(i => { const b = document.querySelectorAll('#rtPick button')[i];
      return b.disabled && /\. Not dz\/dt$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(PathPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works both parts out', new RegExp(`^That was it: at t = ${N} the point is \\(${N}, ${N}\\), moving at dx/dt = ${N} and dy/dt = −?\\d?t = ${N}\\. There ∂z/∂x = \\d?x?y²? = ${N} and ∂z/∂y = \\d?x²?y? = ${N}, so dz/dt = ${N} × ${P} \\+ ${P} × ${P} = ${N}\\. Here is a new one\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is dz/dt, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new hill and path with all four open', await t.ev(() => [...document.querySelectorAll('#rtPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(PathPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = PathPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#rtPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'PATHFINDER / 5 rates found');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#pcTab button, #rtPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#rtPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four rates sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Walk it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its hills, drawing, t stepper, slip modes, readout and goals', back);
    t.ok('and the four rates are put away', await t.ev(() => !document.getElementById('rtPick')));
    t.ok('which rate changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); PathChain.tab = 'hand'; UI.go('s-title'); });
  }
};
