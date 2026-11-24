/* A sitting's welcome back.
 *
 * The first campaign victory of a sitting pays its experience twice, said on
 * the victory card and counted into the experience it shows. The victories
 * after it pay as usual. These checks win real fights with real answers on a
 * phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t) => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
/* A fight won with two right answers; then the victory card and the experience it paid. */
const win = async (t) => {
  await fight(t);
  for (let i = 0; i < 2; i++) {
    await t.ev(i => {
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = i ? 1 : 1e6;
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs;
    }, i);
    await sleep(1200);
    await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
    await sleep(400);
  }
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1400);
  const r = await t.ev(() => {
    const l = document.getElementById('sittingFresh');
    return { line: l ? l.innerText : null, gained: Game.s.xp, lvl: Game.s.lvl, base: Battle.foe.xp,
      shown: +document.getElementById('rXp').textContent, wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'fresh',
  title: "A sitting's welcome back · the first victory of a sitting pays double experience",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // the foe beaten first would be today's quarry, which pays its full experience again
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim, Quarry.of]; Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null; });

    let g = await win(t);
    t.ok('the first victory of a sitting says so on the card', !!g.line && g.line.includes('first victory this sitting') && g.line.includes('+' + g.base), JSON.stringify(g));
    t.ok('and pays its experience twice', g.lvl === 40 && g.gained === 2 * g.base, JSON.stringify(g));
    t.ok('counted into the experience the card shows', g.shown === g.gained, JSON.stringify(g));
    t.ok('and the card fits a phone', g.wide);
    g = await win(t);
    t.ok('the next victory says nothing of it', g.line === null, JSON.stringify(g));
    t.ok('and pays as usual', g.gained === Math.round(g.base * 0.4) && g.shown === g.gained, JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
