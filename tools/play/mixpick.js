/* Turn It Round, mixed. The Tome's mix of every workshop's pick mode.
 *
 * These checks open the mix from the Tome and play it through its buttons:
 * a question from a named workshop with that workshop's rule first and four
 * named answers; a wrong one is shut and explained there; the right one is
 * marked solved with its working shown and the next workshop one tap away,
 * which is a different workshop; a first try is counted apart; a skip deals
 * from another workshop; every button is named, the page fits a phone,
 * leaving and coming back keeps the question, and nothing is saved.
 */
'use strict';

const from = t => t.ev(() => document.getElementById('mxFrom').innerText.trim());
const score = t => t.ev(() => document.getElementById('mxScore').innerText.trim());
const kinds = t => t.ev(() => MixPick.mod().round.opts.map(o => o.k));
const btns = t => t.ev(() => [...document.querySelectorAll('#mxBox button[onclick^="MixPick.pick"]')].map(b => ({ l: b.getAttribute('aria-label'), d: b.disabled })));
const opt = (t, i) => t.ev(i => document.querySelectorAll('#mxBox button[onclick^="MixPick.pick"]')[i].click(), i);
const box = t => t.ev(() => document.getElementById('mxBox').innerText.replace(/\s+/g, ' ').trim());

module.exports = {
  name: 'mixpick',
  title: 'Turn It Round, mixed · one question from a different workshop each time',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Lancelot');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // the workshop cards wait behind the Tome's fold; open it as a reader would
    await t.ev(() => { TomeFold.open = true; UI.go('s-tome'); });
    const n = await t.ev(() => MixPick.LIST.length);
    t.ok('the Tome offers the mix, with how many workshops are in it', await t.ev(n =>
      document.getElementById('s-tome').innerText.includes(`${n} workshops can each be turned round. Here they come mixed`), n));
    await t.ev(() => R.seed(5151));
    await t.tap('tomeMix');
    t.eq('the mix opens', await t.screen(), 's-mixpick');
    t.ok('more than forty workshops are in it', n > 40, String(n));

    let f = await from(t);
    t.ok('the question says which workshop it is from', /^From the \S+ .+$/.test(f), f);
    const title = await t.ev(() => MixPick.LIST[MixPick.cur][2]);
    t.eq('by that workshop’s own name in the Tome', f, `From the ${title}`);
    t.ok('its rule is stated before anything is asked', await t.ev(() =>
      document.querySelector('#mxBox > .small + .small') !== null && document.getElementById('mxBox').innerText.indexOf(MixPick.mod().RULE.slice(0, 30)) >= 0));
    let b = await btns(t);
    t.eq('four answers are offered', b.length, 4);
    t.ok('each is named', b.every((x, i) => (x.l || '').startsWith('ABCD'[i] + ': ')), b.map(x => x.l).join(' | '));
    t.eq('nothing is solved yet', await score(t), `0 solved this visit, 0 on the first try, from 0 of ${n} workshops.`);
    t.ok('the workshop’s own count line is left out', !/picked this visit/.test(await box(t)));
    t.ok('a skip is offered', await t.ev(() => !!document.getElementById('mxSkip')));

    // --- a wrong pick, shut and explained ---
    let k = await kinds(t);
    const w = k.findIndex(x => x !== 'right');
    await opt(t, w);
    b = await btns(t);
    t.ok('the wrong answer is shut and told as wrong', b[w].d && /\. Not /.test(b[w].l), b[w].l);
    const after = await box(t);
    t.ok('and explained, naming the answer picked', after.includes(`Check ${'ABCD'[w]}`) || after.includes(`${'ABCD'[w]} `), after.slice(-300));
    t.ok('a miss is not solved', (await score(t)).startsWith('0 solved'));

    // --- the right pick ---
    const host = await t.ev(() => MixPick.LIST[MixPick.cur][1]);
    const drawn = await t.ev(h => { window.__mxRedraws = 0; const H = MixPick.refs()[h], real = H.render;
      H.render = function () { window.__mxRedraws++; return real.apply(this, arguments); }; window.__mxReal = [h, real]; return true; }, host);
    await opt(t, k.indexOf('right'));
    t.ok('the workshop behind the question is not redrawn', drawn && await t.ev(() => window.__mxRedraws === 0));
    await t.ev(() => { const [h, real] = window.__mxReal; MixPick.refs()[h].render = real; });
    let r = await box(t);
    t.ok('the right pick is marked solved, not on the first try', r.includes('✓ Solved.') && !r.includes('first try.'), r.slice(0, 200));
    t.ok('with its working shown', /That was it/.test(r), r.slice(0, 300));
    t.eq('and counted', await score(t), `1 solved this visit, 0 on the first try, from 1 of ${n} workshops.`);
    t.ok('the next workshop is one tap away', await t.ev(() => !!document.getElementById('mxNext') && !document.getElementById('mxSkip')));

    // --- next, straight to the right one ---
    const seen = [await t.ev(() => MixPick.cur)];
    await t.tap('mxNext');
    seen.push(await t.ev(() => MixPick.cur));
    t.ok('the next question is from another workshop', seen[1] !== seen[0]);
    k = await kinds(t);
    await opt(t, k.indexOf('right'));
    t.ok('a first try is marked', (await box(t)).includes('✓ Solved on the first try.'));
    t.eq('and counted as one', await score(t), `2 solved this visit, 1 on the first try, from 2 of ${n} workshops.`);

    // --- a skip ---
    await t.tap('mxNext');
    const before3 = await t.ev(() => MixPick.cur);
    await t.tap('mxSkip');
    const after3 = await t.ev(() => MixPick.cur);
    t.ok('a skip deals from another workshop', after3 !== before3 && !seen.includes(after3));
    t.ok('and a skip is not counted', (await score(t)).startsWith('2 solved'));

    // --- ten solved brings a banner ---
    const banners = await t.ev(() => {
      const out = [], real = Celebrate.banner;
      Celebrate.banner = (title, sub) => out.push(title + ' / ' + sub);
      for (let g = 0; g < 8; g++) {
        const i = MixPick.mod().round.opts.findIndex(o => o.k === 'right');
        document.querySelectorAll('#mxBox button[onclick^="MixPick.pick"]')[i].click();
        document.getElementById('mxNext').click();
      }
      Celebrate.banner = real; return out;
    });
    t.eq('the tenth solved brings a banner', banners.filter(x => x.startsWith('ROUND THE REALM')).join(), 'ROUND THE REALM / 10 turned round, mixed');
    t.ok('ten different workshops so far', /from 10 of/.test(await score(t)), await score(t));

    // --- named, fits, keeps its place, saves nothing ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#s-mixpick button')].filter(b => !(b.getAttribute('aria-label') || b.innerText || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    f = await from(t);
    await t.ev(() => UI.back());
    await t.tap('tomeMix');
    t.eq('coming back keeps the same question', await from(t), f);
    t.ok('the mix changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { R.unseed(); UI.go('s-title'); });
  }
};
