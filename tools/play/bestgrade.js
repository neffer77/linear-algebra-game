/* Best grades.
 *
 * A foe keeps the best grade it was ever beaten at, in its clear on the map:
 * a worse win never lowers it, a better one is said on the victory card as a
 * new best, and the map tags each cleared foe with its best. A realm whose
 * every foe is at S wears a crown on the map, celebrated as it is earned. A
 * foe cleared before grades were kept shows no grade until its next win.
 * These checks win real fights with real answers on a phone. Nothing new is
 * saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe of the first realm, with a knight who cannot fall or level up. */
const fight = (t, fi) => t.ev(fi => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  window.__banners = [];
}, fi);
/* One answer, right or wrong, that leaves the foe standing. */
const answer = async (t, right) => {
  await t.ev(right => {
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* The killing blow with a right answer, at the health given as the foe falls; then the victory card. */
const finish = async (t, hp) => {
  await t.ev(() => {
    const cb = Celebrate.banner; Celebrate.banner = function (txt) { window.__banners.push(txt); return cb.apply(this, arguments); };
    const cs = Combat.strike; Combat.strike = () => 5;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
    window.__restore = () => { Celebrate.banner = cb; };
  });
  await sleep(1400);
  // the map recomputes the health bar from the knight's level, so the health is set as the foe falls
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(500);
  return t.ev(() => {
    window.__restore();
    const l = document.getElementById('gradeLet'), b = document.getElementById('gradeBest');
    return { grade: l && l.dataset.grade, best: b ? b.innerText : null, up: b ? b.dataset.up : null,
      banners: window.__banners.join('|'), clears: JSON.stringify(Game.s.cleared) };
  });
};
const win = async (t, fi, grade) => {
  await fight(t, fi);
  if (grade === 'S') for (let i = 0; i < 4; i++) await answer(t, true);
  else if (grade === 'B') { await answer(t, false); for (let i = 0; i < 4; i++) await answer(t, true); }
  else { await answer(t, true); await answer(t, false); await answer(t, true); }
  return finish(t, grade === 'S' ? 1000 : 300);
};
/* The map's first realm: each foe's tag and the crown. */
const map = t => t.ev(() => {
  UI.go('s-map');
  const r = document.getElementById('realm-0');
  return { tags: [...r.querySelectorAll('.node')].map(n => { const g = n.querySelector('[data-best]'); return g ? g.dataset.best : '-'; }).join(''),
    crown: !!r.querySelector('summary .crown'), crownText: (r.querySelector('summary .crown') || {}).innerText || null };
});

module.exports = {
  name: 'bestgrade',
  title: 'Best grades · each foe keeps its best grade on the map, and an all-S realm is crowned',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const n = await t.ev(() => { Game.s.cleared = {}; return REALMS[0].foes.length; });

    let g = await win(t, 0, 'B');
    t.eq('a first win is graded', g.grade, 'B');
    t.ok('with no best to compare yet', g.best === null, JSON.stringify(g));
    t.ok('and its grade kept in the clear', JSON.parse(g.clears)['0:0'] === 'B', g.clears);
    let m = await map(t);
    t.eq('the map tags the foe with its best', m.tags, 'B' + '-'.repeat(n - 1));

    g = await win(t, 0, 'S');
    t.eq('a better win is a new best', [g.grade, g.up, g.best], ['S', '1', '⬆️ A new best on this foe, up from B.']);
    t.ok('and kept', JSON.parse(g.clears)['0:0'] === 'S', g.clears);

    g = await win(t, 0, 'C');
    t.eq('a worse win keeps the best in view', [g.grade, g.up, g.best], ['C', '0', 'Your best on this foe is still S.']);
    t.ok('and never lowers it', JSON.parse(g.clears)['0:0'] === 'S', g.clears);
    m = await map(t);
    t.ok('no crown while the realm is not all S', !m.crown && m.tags.startsWith('S'), JSON.stringify(m));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // the rest of the realm at S but the last, which is an old clear from before grades
    await t.ev(n => { for (let fi = 1; fi < n; fi++) Game.s.cleared['0:' + fi] = fi === n - 1 ? true : 'S'; }, n);
    m = await map(t);
    t.eq('a foe cleared before grades shows none', m.tags, 'S'.repeat(n - 1) + '-');
    t.ok('and holds the crown back', !m.crown, JSON.stringify(m));

    g = await win(t, n - 1, 'S');
    t.ok('beating it at S says nothing of a best it never had', g.best === null, JSON.stringify(g));
    t.ok('and crowns the realm', g.banners.includes('REALM CROWNED'), g.banners);
    m = await map(t);
    t.ok('which wears its crown on the map', m.crown && /all S/.test(m.crownText) && m.tags === 'S'.repeat(n), JSON.stringify(m));

    g = await win(t, 0, 'S');
    t.ok('a crown is celebrated once', !g.banners.includes('REALM CROWNED'), g.banners);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
