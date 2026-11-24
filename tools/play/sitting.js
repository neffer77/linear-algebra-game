/* The sitting's tally.
 *
 * The map keeps a tally of this sitting's campaign: the victories won, the
 * gold they paid with every bonus counted in, and the longest streak of right
 * answers in any one fight. It shows nothing before the first victory. These
 * checks win real fights with real answers on a phone. Nothing new is saved.
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
  Boon.open = false; Boon.held = null;
});
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
/* The killing blow; then the victory card. Returns the gold it paid and the fight's best streak. */
const finish = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(600);
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return t.ev(() => ({ paid: Game.s.gold - window.__gold0, best: Battle.runBest || 0 }));
};
const tally = (t) => t.ev(() => { UI.go('s-map'); const e = document.getElementById('sittingTally');
  return e ? { text: e.innerText, wide: document.documentElement.scrollWidth <= innerWidth + 1 } : null; });

module.exports = {
  name: 'sitting',
  title: "The sitting's tally · the map counts this sitting's victories, gold and best streak",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    t.eq('the map shows no tally before a victory', await tally(t), null);

    await fight(t);
    for (let i = 0; i < 4; i++) await answer(t, true);
    const a = await finish(t);
    let m = await tally(t);
    t.ok('a first victory shows on the map, with its gold and streak',
      !!m && m.text.includes('1 victory') && m.text.includes(a.paid + ' gold') && m.text.includes('best streak ' + a.best), JSON.stringify([m, a]));
    t.ok('and fits a phone', m && m.wide);

    await fight(t);
    await answer(t, false); await answer(t, true);
    const b = await finish(t);
    m = await tally(t);
    t.ok('a second adds its gold, the bonuses and all', !!m && m.text.includes('2 victories') && m.text.includes((a.paid + b.paid) + ' gold'), JSON.stringify([m, a, b]));
    t.ok('and keeps the best streak of any fight', a.best > b.best && m.text.includes('best streak ' + a.best), JSON.stringify([m, a, b]));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
