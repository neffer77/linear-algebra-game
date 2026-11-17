/* Which is f′? The slope tracer's second mode.
 *
 * These checks open the slope tracer from the Tome, switch to the mode, and
 * play it through its buttons: three graphs are offered, one of them f′; a
 * wrong pick is shut, marked where it breaks the rule on f and on itself, and
 * explained; the right pick counts, toasts and deals a new f, and reading on
 * the first try is counted apart. Every button is named, the mode buttons say
 * which is pressed, the other mode comes back, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('smRead').innerText.replace(/\s+/g, ' '));
const deal = t => t.ev(() => SlopeMatch.round.deal.join());
const opt = (t, i) => t.ev(i => document.querySelectorAll('#smPick button')[i].click(), i);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tcMode button')].map(b => b.getAttribute('aria-pressed')).join());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const tells = t => t.ev(() => document.querySelectorAll('#tcMatch [data-k="tell"]').length);
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);

module.exports = {
  name: 'slopematch',
  title: 'Which is f′? · read the slope off a graph',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Brannoc');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says the tracer can be turned round', await t.ev(() =>
      /Then turn it round: see f, and pick which of three graphs is f′, or sketch f′ yourself, one slope at a time\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeTracer');
    t.eq('the slope tracer opens', await t.screen(), 's-tracer');
    t.eq('tracing is the pressed mode', await pressed(t), 'true,false,false');

    await t.ev(() => R.seed(4242));
    await t.ev(() => document.querySelectorAll('#tcMode button')[1].click());
    t.eq('which is f′ is now the pressed mode', await pressed(t), 'false,true,false');
    t.ok('the tracer itself is put away', await hidden(t, 'tcSets') && await hidden(t, 'tcFig') && await hidden(t, 'tcStep'));
    t.ok('the rule is stated before anything is asked',
      /^f′ sits above the axis wherever f climbs, below wherever f falls, and crosses 0 where f's tangent lies flat\. Which graph is f′\?/
        .test(await t.ev(() => document.getElementById('tcMatch').innerText.trim())));
    const labels = await t.ev(() => [...document.querySelectorAll('#smPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('three graphs are offered', labels.length, 3);
    t.ok('each is named and told as words', labels.every((l, i) => new RegExp(`^Graph ${'ABC'[i]}: (above|below) the axis`).test(l)), labels.join(' | '));
    t.ok('f is told as words', /^f( = [^:]+)?: it (climbs|falls)/.test(await t.ev(() => document.querySelector('#tcMatch svg').getAttribute('aria-label'))));
    t.eq('nothing is read yet', await read(t), '0 read this visit, 0 on the first try.');
    t.eq('and no spot is marked', await tells(t), 0);

    // --- a wrong pick ---
    let d = (await deal(t)).split(',');
    const wrong = d.findIndex(k => k !== 'd');
    await opt(t, wrong);
    let r = await read(t);
    t.ok('a wrong pick is explained where f breaks it', /At x = \S+, f is (climbing|falling): its tangent slopes (up|down), so f′ must sit (above|below) the axis there\./.test(r), r);
    t.ok('and names the slip', new RegExp(`Graph ${'ABC'[wrong]} is (above|below) the axis at x = \\S+, so it cannot be f′\\. It is (f itself|f′ upside down|f′ slid sideways|f″)`).test(r), r);
    t.eq('the spot is marked on f and on that graph', await tells(t), 2);
    t.ok('and that graph is shut', await t.ev(i => document.querySelectorAll('#smPick button')[i].disabled, wrong));
    t.ok('and told as not f′', /\. Not f′$/.test(await t.ev(i => document.querySelectorAll('#smPick button')[i].getAttribute('aria-label'), wrong)));
    t.ok('a miss is not counted as read', /0 read this visit, 0 on the first try\./.test(r), r);

    // --- the right pick, after a miss ---
    await opt(t, d.indexOf('d'));
    r = await read(t);
    t.ok('the right pick is explained', /^That was f′: /.test(r), r);
    t.ok('and counted, but not as a first try', /1 read this visit, 0 on the first try\./.test(r), r);
    t.ok('with a toast', new RegExp(`✓ Graph ${'ABC'[d.indexOf('d')]} is f′, read in 2 tries\\. Here is another\\.`).test(await toast(t)), await toast(t));
    t.ok('and a new f with all three graphs open', await t.ev(() => [...document.querySelectorAll('#smPick button')].every(b => !b.disabled)));
    t.eq('and no spot marked', await tells(t), 0);

    // --- straight to f′ ---
    d = (await deal(t)).split(',');
    await opt(t, d.indexOf('d'));
    t.ok('a first try is counted as one', /2 read this visit, 1 on the first try\./.test(await read(t)), await read(t));
    for (let k = 0; k < 2; k++) { d = (await deal(t)).split(','); await opt(t, d.indexOf('d')); }
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      const i = SlopeMatch.round.deal.indexOf('d');
      document.querySelectorAll('#smPick button')[i].click();
      Celebrate.banner = real;
      return seen;
    });
    t.eq('the fifth read brings a banner', banners.join(), 'SLOPE SPOTTER / 5 slopes read');

    // --- every button is named, and the tracer comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#tcMode button, #smPick button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    const cols = await t.ev(() => [...document.querySelectorAll('#smPick button')].map(b => Math.round(b.getBoundingClientRect().top)));
    t.ok('the three graphs sit side by side', cols[0] === cols[1] && cols[1] === cols[2], cols.join());

    await t.ev(() => document.querySelectorAll('#tcMode button')[0].click());
    t.eq('tracing comes back', await pressed(t), 'true,false,false');
    t.ok('with the tracer shown again', !(await hidden(t, 'tcFig')) && !(await hidden(t, 'tcSets')));
    t.ok('and the graphs put away', await t.ev(() => !document.getElementById('smPick') || document.getElementById('tcMatch').offsetParent === null));
    t.ok('which is f′ changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Tracer.setMode('trace'); R.unseed(); UI.go('s-title'); });
  }
};
