/* Which c? The chord workshop's second mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: a curve on an interval is shown with its chord, and
 * four numbers offered; a wrong pick is shut and named as the slip it is,
 * checked by putting it into f′, and its tangent drawn; the right pick is
 * worked from the chord's slope, counts, toasts and deals a new question, and
 * a first try is counted apart. Every button is named, the hand-worked walk
 * steps aside and comes back, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('mvpRead').innerText.replace(/\s+/g, ' ').trim());
const kinds = t => t.ev(() => ChordPick.round.opts.map(o => o.k));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#mvpPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#mvtTab button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'chordpick',
  title: 'Which c? · pick where the tangent runs parallel to the chord',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    t.ok('the Tome says the chord workshop can be turned round', await t.ev(() =>
      /Then turn it round: see a curve on an interval with its chord, and pick which of four numbers is c\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeMeanValue');
    t.eq('the chord workshop opens', await t.screen(), 's-mvt');
    t.eq('walking by hand is the pressed mode', await pressed(t), 'true,false');

    await t.ev(() => R.seed(1883));
    await t.tapText(/Which c\?/);
    t.eq('which c is now the pressed mode', await pressed(t), 'false,true');
    t.ok('the curves, the figure, the move buttons, the readout and the goals step aside', await hidden(t, 'mvtSets') && await hidden(t, 'mvtFig') && await hidden(t, 'mvtMoveRow') && await hidden(t, 'mvtRead') && await hidden(t, 'mvtGoalPanel'));
    t.ok('the rule is stated before anything is asked', (await t.ev(() => document.getElementById('mvpBox').innerText)).startsWith(
      'A smooth curve on [a, b] has, somewhere strictly between a and b, a tangent parallel to the chord joining its ends.'));
    const q = await t.ev(() => document.getElementById('mvpQ').innerText.trim());
    t.ok('the curve and its interval are shown', /^f\(x\) = .+ on \[−?\d+(\/\d+)?, −?\d+(\/\d+)?\]$/.test(q), q);
    t.ok('with the chord drawn and no tangent yet', await t.ev(() => !!document.querySelector('#mvpFig .mvpChord') && !document.querySelector('#mvpFig .mvpTan')));
    const labels = await t.ev(() => [...document.querySelectorAll('#mvpPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four numbers are offered', labels.length, 4);
    t.ok('each is named by its number', labels.every((l, i) => new RegExp(`^${'ABCD'[i]}: −?\\d+(/\\d+)?$`).test(l)), labels.join(' | '));
    t.eq('nothing is picked yet', await read(t), '0 picked this visit, 0 on the first try.');

    // --- a wrong pick ---
    let k = await kinds(t);
    const wrong = k.findIndex(x => x !== 'right'), L = 'ABCD'[wrong];
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is named as its slip', new RegExp(`^${L} (is the chord's slope itself|is the middle of \\[a, b\\]|takes (f′\\(x\\)|the slope of)|is where the tangent is flat|stops at c²|stops at √c|does give a tangent parallel|is a height on the curve|is the average of f\\(a\\) and f\\(b\\))`).test(r), r);
    t.ok('and checked by putting it into f′', new RegExp(`Check ${L}: f′\\(`).test(r), r);
    t.ok('and that number is shut and told as not c', await t.ev(i => { const b = document.querySelectorAll('#mvpPick button')[i];
      return b.disabled && /\. Not c$/.test(b.getAttribute('aria-label')); }, wrong));
    t.ok('a miss is not counted as picked', /0 picked this visit, 0 on the first try\.$/.test(r), r);

    // --- the right pick, after a miss ---
    const ri = k.indexOf('right');
    const s0 = await t.ev(() => JSON.stringify(ChordPick.round.S));
    await opt(t, ri);
    r = await read(t);
    t.ok('the right pick is worked from the chord\'s slope', /^That was it: the chord's slope is \(.+\)\/\(.+\) = −?\d+(\/\d+)?, and f′\(x\) = .+, so .+ gives .*c = −?\d+(\/\d+)?.*\. Here is a new one\./.test(r), r);
    t.ok('and counted, but not as a first try', /1 picked this visit, 0 on the first try\.$/.test(r), r);
    t.ok('with a toast', new RegExp(`✓ ${'ABCD'[ri]} is c, picked in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new question with all four open', await t.ev(() => [...document.querySelectorAll('#mvpPick button')].every(b => !b.disabled))
      && await t.ev(() => JSON.stringify(ChordPick.round.S)) !== s0);

    // --- a missed pick inside the figure gets its tangent drawn ---
    const drew = await t.ev(() => {
      for (let n = 0; n < 40; n++) {
        const S = ChordPick.round.S, [a, b] = ChordPick.ends(S).map(v => v[0] / v[1]);
        const i = ChordPick.round.opts.findIndex(o => { if (o.k === 'right') return false; const v = ChordPick.val(S, o.k), x = v[0] / v[1]; return x > a && x < b; });
        if (i >= 0) { document.querySelectorAll('#mvpPick button')[i].click(); return document.querySelectorAll('#mvpFig .mvpTan').length; }
        ChordPick.newRound(); MeanValue.render();
      }
      return -1;
    });
    t.eq('a missed pick between a and b has its tangent drawn, dashed', drew, 1);
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('the tangent goes with the question', await t.ev(() => !document.querySelector('#mvpFig .mvpTan')));

    // --- straight to the right one ---
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is counted as one', /3 picked this visit, 1 on the first try\.$/.test(await read(t)), await read(t));
    k = await kinds(t); await opt(t, k.indexOf('right'));
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = ChordPick.round.opts.findIndex(o => o.k === 'right');
      document.querySelectorAll('#mvpPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth pick brings a banner', banners.join(), 'CHORD FINDER / 5 tangents matched');

    // --- every button is named, it fits, and the hand-worked walk comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#mvtTab button, #mvpPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.ok('the figure is named', await t.ev(() => /^f\(x\) = .+ from .+ to .+, with the chord dashed from/.test(document.querySelector('#mvpFig svg').getAttribute('aria-label'))));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const tops = await t.ev(() => [...document.querySelectorAll('#mvpPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the four numbers sit two by two', tops[0] === tops[1] && tops[2] === tops[3] && tops[2] > tops[0], tops.join());

    await t.tapText(/Walk it by hand/);
    t.ok('the walk comes back, with its curves, figure and goals', !(await hidden(t, 'mvtSets')) && !(await hidden(t, 'mvtFig')) && !(await hidden(t, 'mvtMoveRow')) && !(await hidden(t, 'mvtGoalPanel')));
    t.ok('and the four numbers are put away', await t.ev(() => !document.getElementById('mvpPick')));
    t.ok('which c changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); MeanValue.tab = 'hand'; UI.go('s-title'); });
  }
};
