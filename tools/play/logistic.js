/* The logistic workshop: growth with a ceiling, step by step.
 *
 * These checks open it from the Tome and drive it through its buttons:
 * starting small at 20, the first step grows P about 1.6276 times, nearly
 * e^0.5; P passes 500 at t = 8, where the rate peaks near 125, and at t = 9
 * the rate has fallen from 124.6 to 114.1; by t = 17 P is within 1% of 1000.
 * Starting half way the rate falls from 125 at the first step; starting above
 * at 1600 the rate is −480 and P falls toward 1000. The steps stop at 0 and
 * 20, starting over goes back to t = 0, every button and the drawing are
 * named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('lgwRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#lgwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#lgwSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#lgwSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => ['curve', 'ceiling', 'half', 'dot', 'now', 'tan'].map(k => document.querySelectorAll(`#lgwFig [data-k="${k}"]`).length).join());

module.exports = {
  name: 'logistic',
  title: 'Logistic workshop · growth with a ceiling, step by step',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lorcan');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the logistic workshop', await t.showing('tomeLogiGrow'));
    await t.tap('tomeLogiGrow');
    t.eq('and one tap opens it', await t.screen(), 's-logistic');

    // --- starting small ---
    let r = await read(t);
    t.ok('it gives the solution first', /dP\/dt = 0\.5P\(1 − P\/1000\), starting at P\(0\) = 20\. A = \(1000 − 20\)\/20 = 49, so P\(t\) = 1000\/\(1 \+ 49·e\^\(−0\.5t\)\)\./.test(r), r);
    t.ok('and works the start', /At t = 0, e\^0 = 1, so P = 1000\/\(1 \+ 49\) = 20, the start\. The room left is 1 − P\/1000 = 0\.98, so the rate is 0\.5 × 20 × 0\.98 = 9\.8: P is growing\./.test(r), r);
    t.eq('starting small is the pressed start', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a step', await found(t), []);
    t.ok('there is nothing to step back to or start over from yet', await off(t, 'lgwBack') && await off(t, 'lgwAgain'));
    t.eq('the figure draws the curve, the ceiling, its half, one dot and the tangent', await marks(t), '1,1,1,0,1,1');
    await press(t, 'lgwFwd');
    r = await read(t);
    t.ok('one step works e^(−0.5) and P', /At t = 1, e\^\(−0\.5 × 1\) ≈ 0\.6065, so P = 1000\/\(1 \+ 49 × 0\.6065\) ≈ 32\.6\./.test(r), r);
    t.ok('and grows nearly as e^0.5', /From t = 0 to 1, P went from 20 to 32\.6, 1\.6276 times as much: almost e\^0\.5 ≈ 1\.6487, as if there were no ceiling/.test(r), r);
    t.ok('with the rate rising', /The rate rose from 9\.8 to 15\.7: below 500, P is growing faster than the room left is shrinking\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('early'));
    t.ok('with a toast', /✓ Small means nearly exponential/.test(await toast(t)), await toast(t));
    t.eq('two dots now, the last one larger', await marks(t), '1,1,1,1,1,1');
    await press(t, 'lgwFwd', 7);
    r = await read(t);
    t.ok('P passes 500 at t = 8', /From t = 7 to 8, P went from 403\.3 to 527/.test(r) && /P passed K\/2 = 500 in this step, where growth is fastest: rK\/4 = 0\.5 × 1000\/4 = 125\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('half'));
    t.ok('the rate has not fallen yet', !(await found(t)).includes('slow'));
    await press(t, 'lgwFwd');
    r = await read(t);
    t.ok('at t = 9 the rate falls', /The rate fell from 124\.6 to 114\.1: past 500, the room left is shrinking faster than P is growing\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('slow'));
    await press(t, 'lgwFwd', 8);
    r = await read(t);
    t.ok('by t = 17 P is within 1% of 1000', /P = 1000\/\(1 \+ 49 × 0\.0002035\) ≈ 990\.1\./.test(r) && /P is within 1% of the ceiling, 1000, and keeps closing in without ever reaching it\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('near'));
    await press(t, 'lgwFwd', 4);
    t.ok('the steps stop at t = 20', /At t = 20, e\^\(−0\.5 × 20\) ≈ 0\.0000454/.test(await read(t)) && await off(t, 'lgwFwd'));
    t.eq('twenty-one dots are drawn', await marks(t), '1,1,1,20,1,1');
    await press(t, 'lgwBack');
    t.ok('stepping back goes to t = 19 and drops the step note', /At t = 19,/.test(await read(t)) && !/From t =/.test(await read(t)));
    await press(t, 'lgwAgain');
    t.ok('starting over goes back to t = 0', /the start\./.test(await read(t)) && await off(t, 'lgwAgain') && await off(t, 'lgwBack'));

    // --- starting half way ---
    await pick(t, 1);
    t.ok('half way the rate is at its peak', /A = \(1000 − 500\)\/500 = 1, so P\(t\) = 1000\/\(1 \+ e\^\(−0\.5t\)\)\..*the rate is 0\.5 × 500 × 0\.5 = 125: P is growing\./.test(await read(t)));
    await press(t, 'lgwFwd');
    t.ok('and falls at the first step', /The rate fell from 125 to 117\.5/.test(await read(t)));
    t.ok('which is found', (await found(t)).includes('peak'));

    // --- starting above ---
    await pick(t, 2);
    t.ok('above the ceiling the rate is below 0', /the rate is 0\.5 × 1600 × \(−0\.6\) = −480: below 0, so P is shrinking\./.test(await read(t)), await read(t));
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      document.getElementById('lgwFwd').click();
      Celebrate.banner = real;
      return seen;
    });
    r = await read(t);
    t.ok('and P falls toward 1000', /P = 1000\/\(1 − 0\.375 × 0\.6065\) ≈ 1294\.4\..*From t = 0 to 1, P went from 1600 to 1294\.4, 0\.809 times as much: above the ceiling the room left is below 0, so P falls back toward 1000\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['above', 'early', 'half', 'near', 'peak', 'slow']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('lgwGoals').innerText)));
    t.eq('the last one brings a banner', banners.join(), 'KEEPER OF THE CEILING / every population brought to rest');

    // --- every button and the drawing are named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-logistic button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each start button names its start', await t.ev(() =>
      [...document.querySelectorAll('#lgwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Grow a population starting small at P(0) = 20 | Grow a population starting half way at P(0) = 500 | Grow a population starting above the ceiling at P(0) = 1600');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#lgwFig svg').getAttribute('aria-label')),
      'P against t from 0 to 20 in gold, starting above the ceiling at P(0) = 1600, with the ceiling 1000 dashed, a blue dot at each whole t up to t = 1, and the tangent there in red');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the logistic workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { LogiGrow.pick(0); UI.go('s-title'); });
  }
};
