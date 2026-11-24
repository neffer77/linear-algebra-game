/* Today's quarry.
 *
 * Each day one foe already beaten, never a boss, is marked on the map, and a
 * win over it today pays its full gold where another beaten foe pays a little
 * under half. The map shows it at the head of the campaign and on its own place; the victory
 * card says so, and the gold counted up on the card is the gold the knight
 * gets. These checks win real fights with real answers on a phone. Nothing new
 * is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe of the first realm, with a knight who cannot fall or level up. */
const fight = (t, fi) => t.ev(fi => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  WarPath.n = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
}, fi);
/* One right answer that leaves the foe standing. */
const answer = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs; Combat.foeHit = fh;
  });
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* A win over the foe given: the killing blow lands for just the health left, then the victory card. */
const win = async (t, fi) => {
  await fight(t, fi);
  for (let i = 0; i < 4; i++) await answer(t);
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);   // the gold counts up on the card
  return t.ev(() => {
    const q = document.getElementById('quarryWon');
    return { line: q ? q.innerText : null, counted: +document.getElementById('rGold').innerText,
      paid: Game.s.gold - window.__gold0, gold: Battle.foe.gold };
  });
};

module.exports = {
  name: 'quarry',
  title: "Today's quarry · one beaten foe a day pays its full gold again",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // a bounty met by these wins pays its own gold, apart from the victory card
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    await t.ev(() => { Game.s.cleared = {}; UI.go('s-map'); });
    await sleep(300);
    t.ok('there is no quarry before a foe is beaten', await t.ev(() => !document.getElementById('quarryNode') && Quarry.today() === null));

    const q = await t.ev(() => {
      const r = REALMS[0], last = r.foes.length - 1;
      Game.s.cleared = {}; for (let fi = 0; fi <= last; fi++) Game.s.cleared['0:' + fi] = 'S';
      const key = Quarry.today(), fi = +key.split(':')[1];
      UI.go('s-map');
      return { key, fi, nm: r.foes[fi].nm, boss: !!r.foes[fi].boss, last, other: fi === 0 ? 1 : 0 };
    });
    await sleep(300);
    t.ok('the quarry is a beaten foe and not a boss', q.key.startsWith('0:') && !q.boss, JSON.stringify(q));
    const map = await t.ev(() => {
      const n = document.getElementById('quarryNode');
      return { node: n ? n.innerText : null, tags: document.querySelectorAll('#quarryTag').length,
        w: document.documentElement.scrollWidth, vw: innerWidth };
    });
    t.ok('the head of the campaign names today\'s quarry', map.node !== null && map.node.includes(q.nm) && map.node.includes('full'), JSON.stringify(map));
    t.eq('and its own place on the map is marked, and no other', map.tags, 1);
    t.ok('nothing runs off the side of a phone', map.w <= map.vw, JSON.stringify(map));

    let g = await win(t, q.other);
    t.ok('another beaten foe pays a little under half its gold', g.line === null && g.paid === Math.round(g.gold * 0.45), JSON.stringify(g));
    t.eq('and the card counts up the gold it pays', g.counted, g.paid);

    g = await win(t, q.fi);
    t.ok('the quarry says so on the card', g.line !== null && g.line.includes("Today's quarry"), JSON.stringify(g));
    t.eq('and pays its full gold', g.paid, g.gold);
    t.eq('and the card counts up the gold it pays', g.counted, g.paid);

    g = await win(t, q.fi);
    t.eq('again, as long as it is today', g.paid, g.gold);
    t.eq('the quarry stays put after it is beaten', await t.ev(() => Quarry.today()), q.key);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
  }
};
