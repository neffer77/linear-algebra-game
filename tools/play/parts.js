/* The parts workshop: integration by parts.
 *
 * These checks open it from the Tome and drive it through its buttons: the
 * first integral opens with no split picked, no answer drawn and nothing
 * found; u = eˣ pushes the power of x up and finds the goal for a split that
 * makes things worse; u = x solves ∫ x eˣ dx, puts it together and checks by
 * differentiating, with the answer drawn in gold; on ∫ x cos x dx a dv that
 * is the whole integrand never starts; ∫ ln x dx takes the hidden dv = dx;
 * ∫ x ln x dx finishes the hunt; changing integral clears the split; every
 * button is named, it fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('bpRead').innerText.replace(/\s+/g, ' '));
const cap = t => t.ev(() => (document.querySelector('#bpFig .figcap') || {}).innerText || '');
const found = t => t.ev(() => [...document.querySelectorAll('#bpGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const pick = (t, k) => t.ev(k => document.querySelectorAll('#bpSets button')[k].click(), k);
const split = (t, u, dv) => t.ev(l => [...document.querySelectorAll('#bpOpts button')].find(b => b.getAttribute('aria-label') === l).click(), `Try u = ${u} and dv = ${dv}`);
const opts = t => t.ev(() => [...document.querySelectorAll('#bpOpts button')].map(b => b.getAttribute('aria-label')).join(' | '));
const gold = t => t.ev(() => !!document.querySelector('#bpFig polyline[data-k="F"]'));
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));

module.exports = {
  name: 'parts',
  title: 'Parts workshop · integration by parts',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome offers the parts workshop', await t.showing('tomeParts'));
    await t.tap('tomeParts');
    t.eq('and one tap opens it', await t.screen(), 's-parts');

    // --- before any split ---
    let r = await read(t);
    t.eq('it names the integral and the rule, then asks for a split', r,
      '∫ x eˣ dx: split the integrand into u, to differentiate, and dv, to integrate. Then ∫ u dv = uv − ∫ v du, and the aim is an integral left that is simpler than the one you started with. Pick a split below.');
    t.eq('it offers three splits', await opts(t), 'Try u = eˣ and dv = x dx | Try u = x and dv = eˣ dx | Try u = x eˣ and dv = dx');
    t.ok('no answer is drawn yet', !(await gold(t)));
    t.eq('the caption says how to make it appear', await cap(t), 'The blue curve is the integrand. Find the right split and the answer appears in gold.');
    t.eq('nothing is found before anything is tried', await found(t), []);

    // --- a split that makes it worse ---
    await split(t, 'eˣ', 'x dx');
    r = await read(t);
    t.ok('it works du and v', /Try u = eˣ and dv = x dx\. Then du = eˣ dx and v = x²\/2\./.test(r), r);
    t.ok('and shows what the split leaves', /So ∫ x eˣ dx = \(x²\/2\) eˣ − ∫ \(x²\/2\) eˣ dx\./.test(r), r);
    t.ok('and says why that is worse', /The integral left has x² where you started with x.*This split makes it no simpler\. Try another\./.test(r), r);
    t.ok('with no answer drawn', !(await gold(t)));
    t.eq('the worse split is found', await found(t), ['worse']);
    t.ok('with a toast', /✓ That split makes it worse/.test(await toast(t)), await toast(t));

    // --- the right split ---
    await split(t, 'x', 'eˣ dx');
    r = await read(t);
    t.ok('u = x leaves ∫ eˣ dx', /So ∫ x eˣ dx = x eˣ − ∫ eˣ dx\. Differentiating x left just 1, so the integral left is ∫ eˣ dx = eˣ, one you know\./.test(r), r);
    t.ok('puts it together', /Put it together: x eˣ − eˣ \+ C/.test(r), r);
    t.ok('and checks it by the product rule', /Check by differentiating: d\/dx \(x eˣ − eˣ\) = \(eˣ \+ x eˣ\) − eˣ = x eˣ, the product rule undoing the split\./.test(r), r);
    t.ok('the answer is drawn in gold', await gold(t));
    t.eq('and the caption says what the gold curve is', await cap(t), 'The blue curve is the integrand. The gold curve is the answer with C = 0: its slope at every x is the height of the blue curve there.');
    t.ok('the drawing names the answer', await t.ev(() => /and the answer x eˣ − eˣ in gold/.test(document.querySelector('#bpFig svg').getAttribute('aria-label'))));
    t.eq('the first integral is found', await found(t), ['worse', 'xe']);

    // --- a split that never starts ---
    await pick(t, 1);
    t.ok('a new integral clears the split', !(await gold(t)) && /Pick a split below\./.test(await read(t)));
    await split(t, '1', 'x cos x dx');
    r = await read(t);
    t.ok('a dv of the whole integrand never starts', /Try u = 1 and dv = x cos x dx\. Then v would be ∫ x cos x dx, the very integral you are trying to find\. dv must be something you can already integrate\. This split never gets started\. Try another\./.test(r), r);
    t.eq('the stuck split is found', await found(t), ['stuck', 'worse', 'xe']);
    await split(t, 'x', 'cos x dx');
    r = await read(t);
    t.ok('u = x solves ∫ x cos x dx', /Put it together: x sin x \+ cos x \+ C/.test(r), r);
    t.eq('the second integral is found', await found(t), ['stuck', 'worse', 'xcos', 'xe']);

    // --- the hidden dv ---
    await pick(t, 2);
    t.eq('ln x offers two splits', await opts(t), 'Try u = 1 and dv = ln x dx | Try u = ln x and dv = dx');
    await split(t, 'ln x', 'dx');
    r = await read(t);
    t.ok('ln x takes the hidden dv = dx', /So ∫ ln x dx = x ln x − ∫ x · \(1\/x\) dx\. The x and the 1\/x cancel, so the integral left is ∫ 1 dx = x\. The trick is a hidden dv = dx\./.test(r), r);
    t.ok('and comes to x ln x − x', /Put it together: x ln x − x \+ C/.test(r), r);

    // --- the last one ---
    await pick(t, 3);
    await split(t, 'ln x', 'x dx');
    r = await read(t);
    t.ok('u = ln x solves ∫ x ln x dx', /\(x²\/2\)\(1\/x\) is x\/2, so the integral left is ∫ \(x\/2\) dx = x²\/4, one you know\. Put it together: \(x²\/2\) ln x − x²\/4 \+ C/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['ln', 'stuck', 'worse', 'xcos', 'xe', 'xln']);
    t.ok('and the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('bpGoals').innerText)));

    // --- every button is named ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#bpOpts button, #bpSets button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('each integral button reads its integral', await t.ev(() =>
      [...document.querySelectorAll('#bpSets button')].map(b => b.getAttribute('aria-label')).join(' | ')),
      '∫ x eˣ dx | ∫ x cos x dx | ∫ ln x dx | ∫ x ln x dx');
    t.eq('the chosen split is marked pressed', await t.ev(() =>
      [...document.querySelectorAll('#bpOpts button')].map(b => b.getAttribute('aria-pressed')).join()), 'false,true');

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('the parts workshop changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
