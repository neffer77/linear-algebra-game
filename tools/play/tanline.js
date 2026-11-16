/* The tangent line workshop: linear approximation by hand.
 *
 * These checks open it from the Tome and drive it through its buttons: on
 * √x near 4 the tangent L(x) = 2 + (1/4)(x − 4) touches at 4, estimates
 * √4.1 within 0.001, overshoots on both sides, and halving x − a from 2 to
 * 1 cuts the miss to about a quarter; on 1/x near 1 it falls short; on sin x
 * near 0 halving cuts the miss to about an eighth. The buttons stop at the
 * ends, halving needs a step it can halve, starting over goes back to a,
 * every button and the drawing are named, it fits a phone, and nothing is
 * saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('tlwRead').innerText.replace(/\s+/g, ' '));
const found = t => t.ev(() => [...document.querySelectorAll('#tlwGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const press = (t, id, n) => t.ev(([id, n]) => { for (let k = 0; k < n; k++) document.getElementById(id).click(); }, [id, n || 1]);
const pick = (t, k) => t.ev(k => document.querySelectorAll('#tlwSets button')[k].click(), k);
const pressed = t => t.ev(() => [...document.querySelectorAll('#tlwSets button')].map(b => b.getAttribute('aria-pressed')).join());
const off = (t, id) => t.ev(id => document.getElementById(id).disabled, id);
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const marks = t => t.ev(() => ['curve', 'tangent', 'touch', 'pt', 'est', 'gap'].map(k => document.querySelectorAll(`#tlwFig [data-k="${k}"]`).length).join());

module.exports = {
  name: 'tanline',
  title: 'Tangent line workshop · linear approximation by hand',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Gawaine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the tangent line workshop', await t.showing('tomeTanLine'));
    await t.tap('tomeTanLine');
    t.eq('and one tap opens it', await t.screen(), 's-tanline');

    // --- √x near 4, at a itself ---
    let r = await read(t);
    t.ok('it works the tangent line', /f\(x\) = √x near a = 4: f\(4\) = 2 and f′\(x\) = 1\/\(2√x\), so f′\(4\) = 1\/4\. The tangent line is L\(x\) = 2 \+ \(1\/4\)\(x − 4\)\./.test(r), r);
    t.ok('and at a the two agree', /At x = 4 itself, L\(4\) = f\(4\) = 2: the tangent touches the curve here\. Step x away and watch them part\./.test(r), r);
    t.eq('√x is the pressed curve', await pressed(t), 'true,false,false');
    t.eq('nothing is found before a move', await found(t), []);
    t.ok('there is nothing to start over or halve yet', await off(t, 'tlwAgain') && await off(t, 'tlwHalf'));
    t.eq('the figure draws the curve, the tangent and the point, with no gap yet', await marks(t), '1,1,1,1,0,0');

    // --- a tenth out ---
    await press(t, 'tlwr');
    r = await read(t);
    t.ok('L(4.1) is worked', /At x = 4\.1: x − a = 0\.1, so L\(4\.1\) = 2 \+ \(1\/4\) × 0\.1 = 2\.025\./.test(r), r);
    t.ok('against the curve, and the miss is told with its side', /The curve gives √4\.1 ≈ 2\.0248, so the tangent is too high by about 0\.0002\./.test(r), r);
    t.ok('with the bend that explains it', /√x bends down, under its tangent, so the tangent overshoots on both sides of 4\./.test(r), r);
    t.ok('within 0.001 is found', (await found(t)).includes('close'));
    t.ok('with a toast', /✓ Within 0\.001/.test(await toast(t)), await toast(t));
    t.eq('the estimate and the gap are drawn', await marks(t), '1,1,1,1,1,1');
    t.ok('a tenth cannot be halved', await off(t, 'tlwHalf'));

    // --- halving ---
    await press(t, 'tlwl');
    await press(t, 'tlwR', 2);
    t.ok('at 6 the miss is about 0.0505', /so L\(6\) = 2 \+ \(1\/4\) × 2 = 2\.5\. The curve gives √6 ≈ 2\.4495, so the tangent is too high by about 0\.0505\./.test(await read(t)), await read(t));
    await press(t, 'tlwHalf');
    r = await read(t);
    t.ok('halving goes half way back to a', /At x = 5: x − a = 1/.test(r), r);
    t.ok('and cuts the miss to about a quarter', /You halved x − a from 2 to 1, and the miss went from 0\.0505 to 0\.0139, 0\.2758 times as much\. Close to a, halving cuts the miss to about a quarter: the miss grows like \(x − a\)²\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('quarter'));
    await press(t, 'tlwR', 3);
    r = await read(t);
    t.ok('far out the tangent drifts', /so L\(8\) = 2 \+ \(1\/4\) × 4 = 3\. The curve gives √8 ≈ 2\.8284, so the tangent is too high by about 0\.1716\./.test(r), r);
    t.ok('and the halving note goes', !/You halved/.test(r), r);
    t.ok('drifting is found', (await found(t)).includes('far'));
    await press(t, 'tlwR', 3);
    t.ok('a whole step stops at the end, 9', /At x = 9:/.test(await read(t)) && await off(t, 'tlwR') && await off(t, 'tlwr'));

    // --- left of 4 ---
    await press(t, 'tlwAgain');
    t.ok('starting over goes back to a', /At x = 4 itself/.test(await read(t)) && await off(t, 'tlwAgain'));
    await press(t, 'tlwL');
    r = await read(t);
    t.ok('left of 4 it still overshoots', /At x = 3: x − a = −1, so L\(3\) = 2 \+ \(1\/4\) × \(−1\) = 1\.75\. The curve gives √3 ≈ 1\.7321, so the tangent is too high by about 0\.0179\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('left'));
    await press(t, 'tlwL', 5);
    t.ok('x stops at 1', /At x = 1:/.test(await read(t)) && await off(t, 'tlwL') && await off(t, 'tlwl'));

    // --- 1/x near 1 ---
    await pick(t, 1);
    t.ok('picking a curve starts at its a', /f\(x\) = 1\/x near a = 1: f\(1\) = 1 and f′\(x\) = −1\/x², so f′\(1\) = −1\. The tangent line is L\(x\) = 1 − \(x − 1\)\. At x = 1 itself/.test(await read(t)), await read(t));
    await press(t, 'tlwl');
    r = await read(t);
    t.ok('the tangent falls short of 1/x', /At x = 0\.9: x − a = −0\.1, so L\(0\.9\) = 1 \+ \(−1\) × \(−0\.1\) = 1\.1\. The curve gives 1\/0\.9 ≈ 1\.1111, so the tangent is too low by about 0\.0111\. 1\/x bends up, over its tangent, so the tangent falls short on both sides of 1\./.test(r), r);
    t.ok('which is found', (await found(t)).includes('short'));

    // --- sin x near 0 ---
    await pick(t, 2);
    await press(t, 'tlwr', 8);
    t.ok('sin 0.8 is overshot by about 0.0826', /The curve gives sin 0\.8 ≈ 0\.7174, so the tangent is too high by about 0\.0826\./.test(await read(t)), await read(t));
    const banners = await t.ev(() => {
      const seen = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
      document.getElementById('tlwHalf').click();
      Celebrate.banner = real;
      return seen;
    });
    r = await read(t);
    t.ok('halving cuts it to about an eighth', /You halved x − a from 0\.8 to 0\.4, and the miss went from 0\.0826 to 0\.0106, 0\.128 times as much\. Close to 0, halving cuts the miss to about an eighth: sin x does not bend at 0, so the miss grows like \(x − a\)³\./.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['close', 'eighth', 'far', 'left', 'quarter', 'short']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('tlwGoals').innerText)));
    t.eq('the last one brings a banner', banners.join(), 'MASTER OF THE TANGENT / every miss measured');

    // --- every button and the drawing are named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-tanline button')]
      .filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each curve button names its curve', await t.ev(() =>
      [...document.querySelectorAll('#tlwSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'f(x) = square root of x near 4 | f(x) = 1 over x near 1 | f(x) = sine of x near 0');
    await press(t, 'tlwAgain'); await press(t, 'tlwl');
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#tlwFig svg').getAttribute('aria-label')),
      'f(x) = sin x from −1.5 to 1.5 in gold, its tangent at x = 0 in blue, and at x = −0.1 the gap between them marked in red, the tangent below the curve');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the tangent line workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { TanLine.pick(0); UI.go('s-title'); });
  }
};
