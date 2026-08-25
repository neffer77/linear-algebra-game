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

    // The cellar must be gentler than the Deep at the same depth, or the
    // tutorial is not a tutorial.
    const curves = await t.ev(() => {
      R.seed(1); const deep = WaveEngine.foe(3, ARENA_WAVES); R.unseed();
      R.seed(1); const cellar = WaveEngine.foe(3, CELLAR_WAVES); R.unseed();
      return { deep, cellar };
    });
    t.ok('a cellar foe is far weaker than a Deep foe at the same depth',
      curves.cellar.hp < curves.deep.hp / 4 && curves.cellar.atk < curves.deep.atk / 4,
      JSON.stringify(curves));
    t.ok('nothing in the cellar wears a crown', curves.cellar.boss === false);
  }
};
