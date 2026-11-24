/* Titles for grades.
 *
 * Exemplar for ten foes beaten at S, Crowned for one realm all at S, and
 * Paragon for every realm, read from the best grades the map keeps. These
 * checks set a knight's best grades, let the titles be checked as a victory
 * does, and read the banners and the Settings & Titles page on a phone.
 */
'use strict';

const { sleep } = require('./harness');

/* Check the titles as a victory does, and read the banners it raised and the titles held. */
const check = t => t.ev(() => {
  window.__banners = [];
  const cb = Celebrate.banner; Celebrate.banner = function (txt) { window.__banners.push(txt); return cb.apply(this, arguments); };
  Titles.check();
  Celebrate.banner = cb;
  return { banners: window.__banners.join('|'), titles: Object.keys(Game.s.titles || {}).sort().join() };
});

module.exports = {
  name: 'gradetitles',
  title: 'Titles for grades · Exemplar, Crowned and Paragon, from the best grades on the map',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Game.s.titles = {}; Game.s.stats.wins = 0; });

    // nine at S across the realms, and every foe of the first realm cleared from before grades
    await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => { if (ri === 0) Game.s.cleared[ri + ':' + fi] = true; else if (ri <= 3 && fi < 3) Game.s.cleared[ri + ':' + fi] = 'S'; }));
    });
    let r = await check(t);
    t.ok('nine foes at S earn nothing yet', !/exemplar|crowned|paragon/.test(r.titles), JSON.stringify(r));
    await t.ev(() => { Game.s.cleared['4:0'] = 'S'; });
    r = await check(t);
    t.ok('the tenth earns Exemplar, with its banner', /exemplar/.test(r.titles) && /Exemplar/.test(r.banners), JSON.stringify(r));
    t.ok('and a realm of old clears is no crown', !/crowned|paragon/.test(r.titles), JSON.stringify(r));

    await t.ev(() => { REALMS[1].foes.forEach((f, fi) => { Game.s.cleared['1:' + fi] = 'S'; }); });
    r = await check(t);
    t.ok('a realm all at S earns Crowned, with its banner', /crowned/.test(r.titles) && /Crowned/.test(r.banners) && !/paragon/.test(r.titles), JSON.stringify(r));

    await t.ev(() => { REALMS.forEach((rl, ri) => rl.foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = 'S'; })); });
    r = await check(t);
    t.ok('every realm at S earns Paragon', /paragon/.test(r.titles) && /Paragon/.test(r.banners), JSON.stringify(r));

    await t.ev(() => UI.go('s-prefs'));
    await sleep(300);
    const page = await t.ev(() => [...document.querySelectorAll('#s-prefs .medal')].filter(m => /Exemplar|Crowned|Paragon/.test(m.innerText)).map(m => m.className + ':' + m.innerText.trim().split('\n')[0]));
    t.eq('the titles page lists all three as earned', page.length === 3 && page.every(x => /got/.test(x)), true);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
