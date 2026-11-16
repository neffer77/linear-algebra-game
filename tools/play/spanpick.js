/* Which mix? The span workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: two arrows u and v and a gold ring are drawn, and
 * four mixes a·u + b·v offered; a wrong pick is shut and named as the slip it
 * is, and its walk, a lots of u then b lots of v, is drawn in red to where it
 * lands off the ring; the right pick counts, toasts and deals a new pair, and
 * a first try is counted apart. Every button is named, the mixing workshop
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('skRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => SpanPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#skPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#spTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'spanpick',
  title: 'Which mix? · pick the mix of two arrows that lands on the ring',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Enide');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the span workshop can be turned round', await t.ev(() =>
      /Then turn it round: see two arrows and a ring, and pick which of four mixes lands on it\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeSpan');
    t.eq('the span workshop opens', await t.screen(), 's-span');
    t.eq('mixing the arrows is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5151));
    await t.tapText(/Which mix\?/);
    t.eq('which mix is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the pairs, the amounts, the plane and the goals step aside', await hidden(t, 'spPairs') && await hidden(t, 'spAmts') && await hidden(t, 'spFig') && await hidden(t, 'spRead') && await hidden(t, 'spGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('spPick').innerText)).startsWith(
      'A mix a·u + b·v walks a lots of u, then b lots of v from where it stopped.'));
    t.ok('u, v and the ring are written out', /u = ⟨\S+, \S+⟩, v = ⟨\S+, \S+⟩, ring at ⟨\S+, \S+⟩/.test(await t.ev(() => document.getElementById('spPick').innerText)));
    t.ok('and drawn, the picture read out', await t.ev(() => { const s = document.getElementById('skFig');
      return !!s && /^A grid from −6 to 6 with u = ⟨\S+, \S+⟩ in blue, v = ⟨\S+, \S+⟩ in green and a gold ring at ⟨\S+, \S+⟩$/.test(s.getAttribute('aria-label'))
        && !!s.querySelector('[data-k="u"]') && !!s.querySelector('[data-k="v"]') && !!s.querySelector('[data-k="ring"]') && !s.querySelector('[data-k^="miss"]'); }));
    const labels = await t.ev(() => [...document.querySelectorAll('#skPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four mixes are offered', labels.length, 4);
    t.ok('each is named as a mix of u and v', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d?u [+−] \\d?v$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (swaps the amounts|walks u the wrong way|walks v the wrong way|turns both walks round)`).test(r), r);
    t.ok('and worked to where it lands', new RegExp(`${L} is \\S+ \\S \\S+ = .+ = ⟨\\S+, \\S+⟩, drawn in red\\. The ring is at ⟨\\S+, \\S+⟩\\.`).test(r), r);
    t.ok('and its walk drawn in red, two legs and a marked end', await t.ev(L => { const s = document.getElementById('skFig');
      return !!s.querySelector(`[data-k="miss-u-${L}"]`) && !!s.querySelector(`[data-k="miss-v-${L}"]`) && !!s.querySelector(`[data-k="end-${L}"]`)
        && s.querySelectorAll('[data-k^="miss-u"]').length === 1 && new RegExp(`; red walks for ${L}, each landing off the ring$`).test(s.getAttribute('aria-label')); }, L));
    t.ok('and that mix is shut', await t.ev(i => document.querySelectorAll('#skPick button')[i].disabled, wrong));
    t.ok('and told as not on the ring', /\. Not on the ring$/.test(await t.ev(i => document.querySelectorAll('#skPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(SpanPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: .+ = .+ = ⟨\S+, \S+⟩, right on the ring\. Here is a new pair\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} lands on the ring, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new pair with all four mixes open and no red walk', await t.ev(() => [...document.querySelectorAll('#skPick button')].every(b => !b.disabled) && !document.querySelector('#skFig [data-k^="miss"]'))
      && await t.ev(() => JSON.stringify(SpanPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SpanPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#skPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'SPAN READER / 5 mixes picked');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#spTab button, #skPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#skPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four mixes sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Mix the arrows/);
    t.ok('the pairs come back, with the amounts, the plane and the goals', !(await hidden(t, 'spPairs')) && !(await hidden(t, 'spAmts')) && !(await hidden(t, 'spFig')) && !(await hidden(t, 'spGoalPanel')));
    t.ok('and the four mixes are put away', await t.ev(() => !document.getElementById('skPick')));
    t.ok('which mix changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Span.tab = 'mix'; UI.go('s-title'); });
  }
};
