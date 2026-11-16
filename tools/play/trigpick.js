/* Which c? The trig integral workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a wave a·cos(kx) or a·sin(kx) is shown with its
 * antiderivative written c·sin(kx) or c·cos(kx), and four numbers offered; a
 * wrong pick is shut, named as the slip it is and checked by differentiating
 * its F back; the right pick counts, toasts, works its slope out, and deals a
 * new wave, and a first try is counted apart. Every button is named, the
 * hands-on workshop steps aside and comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('iqRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => TrigPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#iqPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#itTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const N = '−?\\d+(?:/\\d+)?';
const I = '\\(?−?\\d+\\)?';
const W = '(sin|cos)\\(\\dx\\)';
const AWAY = ['itSets', 'itFig', 'itF', 'itFun', 'itStep', 'itRead', 'itGoalPanel'];

module.exports = {
  name: 'trigpick',
  title: 'Which c? · pick the number that undoes a wave',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gareth');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the trig integral workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a wave to undo, and pick which of four numbers is c\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTrigInt');
    t.eq('the trig integral workshop opens', await t.screen(), 's-trigint');
    t.eq('undoing it by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(5252));
    await t.tapText(/Which c\?/);
    t.eq('which c is now the pressed mode', await pressed(t), 'false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the targets, drawing, F, wave buttons, stepper, readout and goals step aside', away);
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('iqBox').innerText)).startsWith(
      'Run the chain rule backwards. The slope of c·sin(kx) is c·k·cos(kx), and the slope of c·cos(kx) is −c·k·sin(kx)'));
    t.ok('the wave is shown with its antiderivative', /^∫ (−|−?\d+ )?(sin|cos)\(\dx\) dx = c·(sin|cos)\(\dx\) \+ C$/.test(
      await t.ev(() => document.getElementById('iqQ').innerText.replace(/\s+/g, ' ').trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#iqPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its value', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: c = ${N}$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right');
    await opt(t, wrong);
    let r = await read(t);
    const L = 'ABCD'[wrong];
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (multiplies by the \\d inside|leaves the \\d inside out|has (a|the) minus|is \\d/)`).test(r), r);
    t.ok('and checked by differentiating its F back', new RegExp(`Check ${L}: if c were ${N}, F\\(x\\) = \\(?${N}\\)?·${W} has slope −?\\(?${N}\\)? × \\d · ${W} = ${N}·${W}, not (−|−?\\d+ )?${W}\\.`).test(r), r);
    t.ok('and that number is shut and told as not c', await t.ev(i => { const b = document.querySelectorAll('#iqPick button')[i];
      return b.disabled && /\. Not c$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(TrigPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick works its slope out and checks it', new RegExp(`^That was it: c = −?${I}/\\d( = ${N})?, and F\\(x\\) = \\(?${N}\\)?·${W} has slope −?\\(?${N}\\)? × \\d · ${W} = ${N}·${W}, the wave itself\\. Here is a new wave\\.`).test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is c, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new wave with all four open', await t.ev(() => [...document.querySelectorAll('#iqPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(TrigPick.round.S)) !== s0);

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /2 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    for (let n = 0; n < 2; n++) { k = await kinds(t); await opt(t, k.indexOf('right')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = TrigPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#iqPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'WAVE UNDOER / 5 waves undone');

    // --- every button is named, it fits, and the workshop comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#itTab button, #iqPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#iqPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Undo it by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back, with its targets, drawing, F, wave buttons, stepper, readout and goals', back);
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('iqPick')));
    t.ok('which c changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); TrigInt.tab = 'hand'; UI.go('s-title'); });
  }
};
