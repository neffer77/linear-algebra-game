/* The swap workshop: u-substitution as a swap.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * first integral opens with no u picked, no answer drawn and nothing found;
 * the whole integrand as u is refused and finds the goal for a u that does
 * not help; u = x² swaps ∫ 2x cos(x²) dx into ∫ cos u du, puts x back and
 * checks by differentiating, with the answer drawn in gold; the other three
 * integrals each take their right u, the last finishing the hunt; changing
 * integral clears the u; every button is named, it fits a phone, and nothing
 * is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('swRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#swFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#swGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, k) => t.ev(k => document.querySelectorAll('#swSets button')[k].click(), k);
const tryU = (t, u) => t.ev(u => [...document.querySelectorAll('#swOpts button')].find(b => b.innerText.trim() === 'u = ' + u).click(), u);
const opts = t => t.ev(() => [...document.querySelectorAll('#swOpts button')].map(b => b.innerText.trim()).join(' | '));
const gold = t => t.ev(() => !!document.querySelector('#swFig polyline[data-k="F"]'));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'swap',
  title: 'Swap workshop · u-substitution',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the swap workshop', await t.showing('tomeSwap'));
    await t.tap('tomeSwap');
    t.eq('and one tap opens it', await t.screen(), 's-swap');

    // --- the first integral, before any u ---
    let r = await read(t);
    t.eq('it names the integral and says what to look for, then asks for a u', r,
      '∫ 2x cos(x²) dx: look for a piece whose derivative is also sitting in the integrand. Pick a u below.');
    t.eq('it offers three u to try', await opts(t), 'u = x² | u = 2x cos(x²) | u = 2x');
    t.ok('only the integrand is drawn', !(await gold(t)) && await t.ev(() => !!document.querySelector('#swFig polyline[data-k="f"]')));
    t.eq('the caption says the answer is still to find', await cap(t), 'The blue curve is the integrand. Find the right u and the answer appears in gold.');
    t.eq('nothing is found before a u is tried', await found(t), []);

    // --- a u that does not help ---
    await tryU(t, '2x cos(x²)');
    r = await read(t);
    t.ok('it works out du', /Try u = 2x cos\(x²\)\. Then du = \(2cos\(x²\) − 4x² sin\(x²\)\) dx\./.test(r), r);
    t.ok('and says why it fails', /That du is nowhere in the integrand\. Taking u to be the whole integrand never helps: its derivative is always messier than what you started with\. This u does not simplify it\. Try another\./.test(r), r);
    t.ok('no answer is drawn for it', !(await gold(t)));
    t.eq('a u that does not help is found', await found(t), ['miss']);
    t.ok('with a toast', /✓ That u does not help/.test(await toast(t)), await toast(t));

    // --- the right u ---
    await tryU(t, 'x²');
    r = await read(t);
    t.ok('u = x² gives du = 2x dx', /Try u = x²\. Then du = 2x dx\./.test(r), r);
    t.ok('which swaps the integral into one you know', /The 2x dx in the integrand is exactly du, and cos\(x²\) is cos u, so the integral becomes ∫ cos u du = sin u \+ C\./.test(r), r);
    t.ok('puts x back', /Put x back: sin\(x²\) \+ C/.test(r), r);
    t.ok('and checks by differentiating', /Check by differentiating: d\/dx sin\(x²\) = cos\(x²\) × 2x, the chain rule undoing the swap\./.test(r), r);
    t.ok('the answer is drawn in gold', await gold(t));
    t.eq('the caption explains the gold curve', await cap(t), 'The blue curve is the integrand. The gold curve is the answer with C = 0: its slope at every x is the height of the blue curve there.');
    t.eq('the first swap is found', await found(t), ['cos', 'miss']);
    t.ok('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#swFig svg').getAttribute('aria-label')) === 'The integrand of ∫ 2x cos(x²) dx in blue, and the answer sin(x²) in gold');

    // --- a new integral clears the u ---
    await pick(t, 1);
    t.ok('a new integral starts with no u', /^∫ 3x²\(x³ \+ 1\)⁴ dx: .* Pick a u below\.$/.test(await read(t)), await read(t));
    t.ok('and no answer drawn', !(await gold(t)));
    t.eq('with its own three u', await opts(t), 'u = 3x² | u = x³ + 1 | u = x');
    await tryU(t, 'x');
    t.ok('u = x changes nothing', /u = x changes nothing: the integral is just ∫ 3u²\(u³ \+ 1\)⁴ du, the same problem with a new letter\./.test(await read(t)), await read(t));
    await tryU(t, 'x³ + 1');
    r = await read(t);
    t.ok('u = x³ + 1 swaps it into a power', /the integral becomes ∫ u⁴ du = u⁵\/5 \+ C\. Put x back: \(x³ \+ 1\)⁵\/5 \+ C/.test(r), r);
    t.eq('the second swap is found', await found(t), ['cos', 'miss', 'pow']);

    // --- a constant off ---
    await pick(t, 2);
    await tryU(t, 'x²');
    r = await read(t);
    t.ok('a missing constant is divided out', /The integrand has x dx, which is half of du, so x dx = du\/2 and the integral becomes ∫ eᵘ du\/2 = eᵘ\/2 \+ C\. A missing constant is fine: divide it out\./.test(r), r);
    t.ok('and checks out', /Check by differentiating: d\/dx e\^\(x²\)\/2 = e\^\(x²\) × 2x\/2 = x e\^\(x²\)/.test(r), r);
    t.eq('the third swap is found', await found(t), ['cos', 'exp', 'miss', 'pow']);

    // --- the log ---
    await pick(t, 3);
    await tryU(t, '1/x');
    t.ok('u = 1/x brings the same problem back', /the integral turns into ∫ \(ln u\)\/u du: the very same problem back\./.test(await read(t)), await read(t));
    await tryU(t, 'ln x');
    r = await read(t);
    t.ok('u = ln x swaps it into ∫ u du', /The \(1\/x\) dx in the integrand is exactly du, and ln x is u, so the integral becomes ∫ u du = u²\/2 \+ C\. Put x back: \(ln x\)²\/2 \+ C/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['cos', 'exp', 'log', 'miss', 'pow']);
    t.ok('and the count says so', /5 of 5 found/.test(await t.ev(() => document.getElementById('swGoals').innerText)));

    // --- every button is named ---
    t.eq('each integral button reads its integral', await t.ev(() =>
      [...document.querySelectorAll('#swSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      '∫ 2x cos(x²) dx | ∫ 3x²(x³ + 1)⁴ dx | ∫ x e^(x²) dx | ∫ (ln x)/x dx');
    t.eq('each u button says what it tries', await t.ev(() =>
      [...document.querySelectorAll('#swOpts button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      'Try u = 1/x | Try u = x | Try u = ln x');
    t.eq('the pressed buttons say so', await t.ev(() =>
      [...document.querySelectorAll('#s-swap button[aria-pressed="true"]')].map(b => b.innerText.trim()).join(' | ')), '🔄 Pick a u by hand | (ln x)/x | u = ln x');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the swap workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
