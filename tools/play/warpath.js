/* War path.
 *
 * Campaign victories in a row, this sitting: each one after the first pays
 * a tenth more gold, up to half again from the sixth, and a fall or a flight
 * from a live fight ends it. These checks win real fights with real answers,
 * read the gold paid and the line on the victory screen, run the path to
 * six for its banner, and end it by fleeing and by falling, checking that
 * leaving a fight already won ends nothing and that nothing is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The first realm's first foe, with a knight who cannot fall or level up. */
const fight = t => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false;
  return Battle.foe.nm;
});
/* The killing blow, with a right answer; then the victory screen. */
const win = async t => {
  await fight(t);
  await t.ev(() => {
    window.__banners = [];
    const cb = Celebrate.banner; Celebrate.banner = function (txt) { window.__banners.push(txt); return cb.apply(this, arguments); };
    window.__restore = () => { Celebrate.banner = cb; };
    // a blow of just the health left, so no overkill pays beside the war path
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(400);
  return t.ev(() => {
    window.__restore();
    const w = document.getElementById('warPath');
    return { gold: +document.getElementById('rGold').textContent, line: w ? w.innerText : null, n: WarPath.n,
      banners: window.__banners.join('|'), text: document.getElementById('resultBody').innerText };
  });
};

module.exports = {
  name: 'warpath',
  title: 'War path · victories in a row this sitting pay more gold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const base = await t.ev(() => REALMS[0].foes[0].gold);
    // today's quarry pays a beaten foe its full gold, which these sums leave out
    await t.ev(() => { window.__quarry = Quarry.of; Quarry.of = () => null; });
    await t.ev(() => { WarPath.n = 0; delete Game.s.cleared['0:0']; });

    let r = await win(t);
    t.eq('a first victory pays its plain gold', r.gold, base);
    t.eq('and starts the count', r.n, 1);
    t.ok('with nothing said yet', r.line === null, r.line);

    r = await win(t);
    t.eq('a second in a row pays a tenth more', r.gold, Math.round(base * 0.45 * 1.1));
    t.eq('the victory says how long the path runs and what the next pays', r.line, '🔥 War path: 2 victories in a row, +10% gold. Win the next for +20%.');
    t.ok('above the rewards', r.text.indexOf('Victory!') < r.text.indexOf('War path') && r.text.indexOf('War path') < r.text.indexOf('experience'), r.text.slice(0, 300));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // leaving a fight already won ends nothing
    await t.ev(() => Battle.flee());
    t.eq('leaving a won fight keeps the path', await t.ev(() => WarPath.n), 2);

    // fleeing a live fight ends it
    await fight(t);
    await t.ev(() => { window.__toasts = []; const ut = UI.toast; UI.toast = m => { window.__toasts.push(m); return ut.call(UI, m); }; Battle.flee(); UI.toast = ut; });
    t.eq('fleeing a live fight ends the path', await t.ev(() => WarPath.n), 0);
    t.ok('and says what it cost', (await t.ev(() => window.__toasts.join('|'))).includes('your war path of 2 victories ends.'), await t.ev(() => window.__toasts.join('|')));

    // six in a row: half again, and a banner
    for (let i = 1; i <= 5; i++) r = await win(t);
    t.eq('the fifth in a row pays four tenths more', r.gold, Math.round(base * 0.45 * 1.4));
    r = await win(t);
    t.eq('the sixth pays half again', r.gold, Math.round(base * 0.45 * 1.5));
    t.eq('and says it is the most it pays', r.line, '🔥 War path: 6 victories in a row, +50% gold. The most it pays.');
    t.ok('with its banner', r.banners.includes('ON THE WAR PATH'), r.banners);
    r = await win(t);
    t.eq('the seventh pays no more than half again', r.gold, Math.round(base * 0.45 * 1.5));
    t.ok('and has no banner', !r.banners.includes('ON THE WAR PATH'), r.banners);

    // a fall ends it
    await fight(t);
    await t.ev(() => Battle.lose());
    for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
    await sleep(400);
    const fell = await t.ev(() => { const e = document.getElementById('warPathEnd'); return e ? e.innerText : null; });
    t.eq('a fall says what it cost', fell, '🔥 Your war path of 7 victories ends here.');
    t.eq('and ends the path', await t.ev(() => WarPath.n), 0);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    t.ok('and the path is not in the save', !(await t.ev(() => JSON.stringify(Game.s))).includes('arPath'));
    await t.ev(() => { Quarry.of = window.__quarry; UI.go('s-title'); });
  }
};
