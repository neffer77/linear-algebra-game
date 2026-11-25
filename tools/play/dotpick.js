/* Which u·v? The dot product workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: two arrows u and v are written and drawn, and four
 * numbers offered; a wrong pick is shut and named as the slip it is, worked
 * beside the right sum, and u's shadow on v's line is drawn in gold, pointing
 * the way the sign says; the right pick counts, toasts and deals a new pair,
 * and a first try is counted apart. Every button is named, the hands-on
 * workshop steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('dpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => DotPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#dpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#dtTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'dotpick',
  title: 'Which u·v? · pick the dot product out of its slips',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the dot product workshop can be turned round', await t.ev(() =>
      /Then turn it round: see two arrows, and pick which of four numbers is u·v\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDot');
    t.eq('the dot product workshop opens', await t.screen(), 's-dot');
    t.eq('setting the arrows is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6161));
    await t.tapText(/Which u·v\?/);
    t.eq('which u·v is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the steppers, the plane, the readout, Start again and the goals step aside', await hidden(t, 'dtVecs') && await hidden(t, 'dtFig') && await hidden(t, 'dtRead') && await hidden(t, 'dtReset') && await hidden(t, 'dtGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('dtPick').innerText)).startsWith(
      'u·v = u₁v₁ + u₂v₂: multiply first with first, second with second, and add.'));
    t.ok('u and v are written out', /u = ⟨\S+, \S+⟩, v = ⟨\S+, \S+⟩/.test(await t.ev(() => document.getElementById('dtPick').innerText)));
    t.ok('and drawn, the picture read out, with no shadow yet', await t.ev(() => { const s = document.getElementById('dpFig');
      return !!s && /^A grid from −5 to 5 with u = ⟨\S+, \S+⟩ in blue and v = ⟨\S+, \S+⟩ in green$/.test(s.getAttribute('aria-label'))
        && !!s.querySelector('[data-k="u"]') && !!s.querySelector('[data-k="v"]') && !s.querySelector('[data-k="shadow"]'); }));
    const labels = await t.ev(() => [...document.querySelectorAll('#dpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named as u·v', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: u·v = −?\\d+$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (pairs the wrong parts|takes the second product away|stops after the first product|is the determinant)`).test(r), r);
    t.ok('and set beside the right sum and what its sign means', new RegExp(`${L} is −?\\d+, but u·v = .+ = −?\\d+\\. (Positive|Negative|u·v is 0)`).test(r), r);
    t.ok('and u\'s shadow on v\'s line is drawn and named', await t.ev(() => { const s = document.getElementById('dpFig');
      return !!s.querySelector('[data-k="vline"]') && !!s.querySelector('[data-k="drop"]')
        && (/shadow on v's line in gold, pointing (along|back against) v$/.test(s.getAttribute('aria-label')) ? !!s.querySelector('[data-k="shadow"]') : /casts no shadow$/.test(s.getAttribute('aria-label'))); }));
    t.ok('and that number is shut', await t.ev(i => document.querySelectorAll('#dpPick button')[i].disabled, wrong));
    t.ok('and told as not u·v', /\. Not u·v$/.test(await t.ev(i => document.querySelectorAll('#dpPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(DotPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: u·v = .+ = −?\d+\. Here is a new pair\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is u·v, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four numbers open and no shadow', await t.ev(() => [...document.querySelectorAll('#dpPick button')].every(b => !b.disabled) && !document.querySelector('#dpFig [data-k="shadow"], #dpFig [data-k="drop"]'))
      && await t.ev(() => JSON.stringify(DotPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = DotPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#dpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'DOT READER / 5 dot products picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dtTab button, #dpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#dpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Set the arrows/);
    t.ok('the steppers come back, with the plane, Start again and the goals', !(await hidden(t, 'dtVecs')) && !(await hidden(t, 'dtFig')) && !(await hidden(t, 'dtReset')) && !(await hidden(t, 'dtGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('dpPick')));
    t.ok('which u·v changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Dot.tab = 'set'; UI.go('s-title'); });
  }
};
