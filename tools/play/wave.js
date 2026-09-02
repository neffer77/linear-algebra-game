/* P1 — the wave engine, pinned.
 *
 * The Arena's foe curve was lifted out of Arena into WaveEngine + a config
 * object. That refactor was proved byte-identical against a snapshot taken
 * before it, and this is that snapshot, kept.
 *
 * The hash covers Arena.foeFor(1..40) under a fixed seed plus Arena.pool()
 * across four topic-stat shapes. It is deliberately brittle: any change to the
 * escalation numbers, the R.pick call order, or the pool rule moves it. If you
 * changed those ON PURPOSE, re-read the printed hash and update PINNED — but
 * the change is then a balance change, and worth saying out loud in the commit.
 */
'use strict';

const crypto = require('crypto');

const PINNED = '925eeb76a239d86021fd18a40593d0356f7f370863d0570a01033e6be7126b46';

module.exports = {
  name: 'wave',
  title: 'P1 · the wave engine is unchanged',
  async run(t) {
    await t.newKnight('Pinner');

    const snap = await t.ev(() => {
      const out = { foes: [], pools: [] };
      R.seed(12345);
      for (let w = 1; w <= 40; w++) out.foes.push(JSON.stringify(Arena.foeFor(w)));
      R.unseed();

      const all = Object.keys(TOPIC_LABEL);
      const pool = () => out.pools.push(JSON.stringify(Arena.pool()));
      Game.s.topicStats = {}; pool();                                   // nothing met
      Game.s.topicStats = {};
      all.slice(0, 5).forEach(k => Game.s.topicStats[k] = { seen: 3 }); pool();   // under the floor
      Game.s.topicStats = {};
      all.slice(0, 20).forEach(k => Game.s.topicStats[k] = { seen: 2 }); pool();  // over it
      Game.s.topicStats = {};
      all.slice(0, 20).forEach((k, i) => Game.s.topicStats[k] = { seen: i % 2 }); pool();
      return out;
    });

    const hash = crypto.createHash('sha256').update(JSON.stringify(snap)).digest('hex');
    t.ok('the arena builds the foes and pools it always has', hash === PINNED,
      `hash is ${hash}, pinned ${PINNED} — if this was deliberate, update PINNED in tools/play/wave.js`);

    // The delegation itself, so a future refactor cannot quietly fork the two.
    const same = await t.ev(() => {
      const a = [], b = [];
      R.seed(777); for (let w = 1; w <= 12; w++) a.push(JSON.stringify(Arena.foeFor(w))); R.unseed();
      R.seed(777); for (let w = 1; w <= 12; w++) b.push(JSON.stringify(WaveEngine.foe(w, ARENA_WAVES))); R.unseed();
      return a.join('|') === b.join('|');
    });
    t.ok('Arena.foeFor is exactly WaveEngine.foe over the arena curve', same);

    /* The three curves must stay ordered: the cellar is a tutorial, the Deep
       opens after one realm, the Arena after all eight. Pointing any of them at
       another's numbers is the bug tools/balance.js was written to catch. */
    const curves = await t.ev(() => {
      const at = (d, c) => { R.seed(1); const f = WaveEngine.foe(d, c); R.unseed(); return f; };
      return { cellar: at(3, CELLAR_WAVES), deep: at(3, DEEP_WAVES), arena: at(3, ARENA_WAVES),
               deepIsDeeps: SETTINGS.deep.waves === DEEP_WAVES,
               cellarIsCellars: SETTINGS.cellar.waves === CELLAR_WAVES };
    });
    t.ok('the cellar is gentler than the Deep',
      curves.cellar.hp < curves.deep.hp && curves.cellar.atk < curves.deep.atk, JSON.stringify(curves));
    t.ok('the Deep is gentler than the Arena — it opens seven realms earlier',
      curves.deep.hp < curves.arena.hp && curves.deep.atk < curves.arena.atk, JSON.stringify(curves));
    t.ok('nothing in the cellar wears a crown', curves.cellar.boss === false);
    t.ok('each setting uses its own curve', curves.deepIsDeeps && curves.cellarIsCellars);

    /* The combat arithmetic, pinned. It was lifted out of Battle so the balance
       harness plays the same sums a player meets; these hold the extraction to
       the numbers it replaced. */
    const c = await t.ev(() => ({
      combo0: Combat.comboMul(0), combo3: Combat.comboMul(3), capped: Combat.comboMul(20),
      plain: Combat.strike(10, 1.0, 0, false, false, 1, 1),
      swift: Combat.strike(10, 1.5, 0, false, false, 1, 1),
      crit: Combat.strike(10, 1.0, 0, true, false, 1, 1),
      streak: Combat.strike(10, 1.0, 4, false, false, 1, 1),
      hit: Combat.foeHit(30, 7, 1), floor: Combat.foeHit(3, 99, 1),
      slam: Combat.slam(30, 7, false), braced: Combat.slam(30, 7, true)
    }));
    t.eq('no streak is no bonus', c.combo0, 1);
    t.eq('a streak of three is ×1.45', c.combo3, 1.45);
    t.eq('and the streak caps at seven', c.capped, 2.05);
    t.eq('a plain strike is the weapon', c.plain, 10);
    t.eq('a swift one is half again', c.swift, 15);
    t.eq('a critical one is double', c.crit, 20);
    t.eq('a streak of four is ×1.6', c.streak, 16);
    t.eq('armour subtracts from a blow', c.hit, 23);
    t.eq('but a blow always lands', c.floor, 4);
    t.eq('a slam is 1.7× the foe, less armour', c.slam, 44);
    t.eq('bracing one takes most of it away', c.braced, 11);
  }
};
