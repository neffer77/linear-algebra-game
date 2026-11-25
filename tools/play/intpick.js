/* Which integral? The area workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve is written and drawn with part of it
 * shaded, gold above the axis and red below, and four numbers offered; a
 * wrong pick is shut and named as the slip it is, with F(b) − F(a) worked for
 * the numbers on screen; the right pick counts, toasts and deals a new curve,
 * and a first try is counted apart. Every button is named, the rectangles
 * step aside and come back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('ipRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => IntPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#ipPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#arMode button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'intpick',
  title: 'Which integral? · pick the integral of a shaded curve',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isaut');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the area workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a shaded curve, and pick which of four numbers is its integral\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeArea');
    t.eq('the area workshop opens', await t.screen(), 's-area');
    t.eq('closing in is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(6161));
    await t.tapText(/Which integral\?/);
    t.eq('which integral is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the rectangles and their goals step aside', await hidden(t, 'arCurves') && await hidden(t, 'arFig') && await hidden(t, 'arNs') && await hidden(t, 'arRules') && await hidden(t, 'arGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('arPick').innerText)).startsWith(
      'An integral adds up signed area: gold above the axis counts plus, red below counts minus.'));
    t.ok('the curve is written out', /^f\(x\) = .+, shaded from x = \S+ to x = \S+$/.test(await t.ev(() => document.querySelector('#arPick > div:nth-child(2)').innerText.trim())));
    t.ok('and drawn, with its picture read out', await t.ev(() => { const s = document.getElementById('ipFig');
      return !!s && /^The curve f\(x\) = /.test(s.getAttribute('aria-label')) && !!s.querySelector('[data-k="curve"]') && s.querySelectorAll('[data-k="gold"], [data-k="red"]').length >= 1; }));
    const labels = await t.ev(() => [...document.querySelectorAll('#ipPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named with its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d+(/\\d)?$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is named as its slip', new RegExp(`^${'ABCD'[wrong]} (is F|forgets to divide|counts the red part|is f)`).test(r), r);
    t.ok('and F(b) − F(a) is worked for the numbers on screen', /F\(x\) = .+, so F\(\S+\) = \S+ and F\(\S+\) = \S+: ∫\S+ f dx = F\(\S+\) − F\(\S+\) = .+ = \S+\./.test(r), r);
    t.ok('and that number is shut', await t.ev(i => document.querySelectorAll('#ipPick button')[i].disabled, wrong));
    t.ok('and told as not the integral', /\. Not the integral$/.test(await t.ev(i => document.querySelectorAll('#ipPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const c0 = await t.ev(() => JSON.stringify(IntPick.round.c));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked out', /^That was it: F\(x\) = .+ Here is a new curve\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is the integral, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new curve with all four numbers open', await t.ev(() => [...document.querySelectorAll('#ipPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(IntPick.round.c)) !== c0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = IntPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#ipPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'INTEGRAL READER / 5 integrals picked');

    // --- every button is named, it fits, and the rectangles come back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#arMode button, #ipPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#ipPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Close in/);
    t.ok('the rectangles come back, with their goals', !(await hidden(t, 'arCurves')) && !(await hidden(t, 'arNs')) && !(await hidden(t, 'arGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('ipPick')));
    t.ok('which integral changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); Area.mode = 'bars'; UI.go('s-title'); });
  }
};
