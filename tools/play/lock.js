/* P3 — the lock room.
 *
 * A locked chest is one riddle and a lockpick. It has no foe, so it can never
 * end a run; it either opens for a richer haul than the fight it replaced, or
 * it names the tumbler that slipped and snaps the pick.
 */
'use strict';

module.exports = {
  name: 'lock',
  title: 'P3 · a riddle for the chest',
  async run(t) {
    await t.newKnight('Picker');

    const r = await t.ev(() => {
      const out = {};
      out.startPicks = Game.s.items.pick;

      // --- a clean solve ---
      Game.s.gold = 0; Game.s.xp = 0; Game.s.items.pick = 3;
      R.seed(999);
      const spec = RoomKinds.lock.build(R, 4, SETTINGS.deep);
      R.unseed();
      out.kind = spec.kind; out.yield = spec.yield;

      let solved = null;
      Lock.begin({ ...spec }, { depth: 4 }, o => solved = o);
      Lock.tumblers();                       // past the study card, if any
      const seenBefore = (Game.s.topicStats[spec.q.key] || {}).seen || 0;
      document.querySelector('#lockChoices .choice[data-correct="1"]').click();
      document.getElementById('lockGo').click();
      out.solve = { out: solved, gold: Game.s.gold, xp: Game.s.xp, picks: Game.s.items.pick,
        seenMoved: ((Game.s.topicStats[spec.q.key] || {}).seen || 0) > seenBefore };

      // --- a fumble ---
      Game.s.items.pick = 2;
      R.seed(1234);
      const spec2 = RoomKinds.lock.build(R, 3, SETTINGS.deep);
      R.unseed();
      let missed = null;
      Lock.begin({ ...spec2 }, { depth: 3 }, o => missed = o);
      Lock.tumblers();
      const seenBefore2 = (Game.s.topicStats[spec2.q.key] || {}).seen || 0;
      document.querySelector('#lockChoices .choice:not([data-correct="1"])').click();
      out.fumbleNamesTheSlip = document.getElementById('lockOut').innerText;
      document.getElementById('lockGo').click();
      out.fumble = { out: missed, picks: Game.s.items.pick,
        seenMoved: ((Game.s.topicStats[spec2.q.key] || {}).seen || 0) > seenBefore2 };

      // --- out of picks ---
      Game.s.items.pick = 0;
      R.seed(77);
      const spec3 = RoomKinds.lock.build(R, 2, SETTINGS.deep);
      R.unseed();
      let empty = null;
      Lock.begin({ ...spec3 }, { depth: 2 }, o => empty = o);
      out.noPicksText = document.getElementById('lockBody').innerText;
      document.getElementById('lockGo').click();
      out.noPicks = empty;

      // --- the Deep lays out both kinds of room ---
      let locks = 0, monsters = 0;
      for (let d = 1; d <= 60; d++) {
        R.seed(((123456 ^ (d * 2654435761)) >>> 0) || 1);
        const isLock = d >= 2 && R.chance(SETTINGS.deep.lockChance);
        R.unseed();
        if (isLock) locks++; else monsters++;
      }
      out.layout = { locks, monsters };
      return out;
    });

    t.eq('a new knight carries three picks', r.startPicks, 3);
    t.ok('a lock room builds with a richer haul', r.kind === 'lock' && r.yield.gold > 0 && r.yield.xp > 0,
      JSON.stringify(r.yield));

    t.ok('a clean solve opens the chest', r.solve.out && r.solve.out.lock.opened === true);
    t.ok('and reports the haul to the shell', r.solve.out &&
      r.solve.out.yield.gold === r.yield.gold && r.solve.out.yield.xp === r.yield.xp);
    t.ok('the room banks nothing itself — that is the shell\'s job',
      r.solve.gold === 0 && r.solve.xp === 0, JSON.stringify(r.solve));
    t.eq('a clean solve costs no pick', r.solve.picks, 3);
    t.ok('a clean solve moves mastery', r.solve.seenMoved);

    t.eq('a fumble snaps a pick', r.fumble.picks, 1);
    t.ok('a fumble says which tumbler slipped', /snaps/i.test(r.fumbleNamesTheSlip),
      r.fumbleNamesTheSlip.slice(0, 120));
    t.ok('a fumble yields nothing', r.fumble.out && Object.keys(r.fumble.out.yield).length === 0);
    t.ok('but never ends the run — a lock has no foe', r.fumble.out && r.fumble.out.status === 'cleared');
    t.ok('a fumble still moves mastery — it still taught you', r.fumble.seenMoved);

    t.ok('with no picks the chest is a dead end, not a dead run',
      r.noPicks && r.noPicks.status === 'cleared' && r.noPicks.lock.snapped === false);
    t.ok('and it says where to get more', /Smithy/i.test(r.noPicksText), r.noPicksText.slice(0, 120));

    t.ok('the Deep lays out both kinds of room', r.layout.locks > 0 && r.layout.monsters > 0,
      JSON.stringify(r.layout));
  }
};
