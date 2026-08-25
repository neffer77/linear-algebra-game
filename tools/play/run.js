/* P4 — a descent survives being walked away from.
 *
 * The checkpoint is {seed, depths cleared, bank, health}. Rooms are never
 * stored, only replayed from (seed, depth), which is what keeps the payload
 * small AND makes save-scumming impossible: quit on a bad room and the same bad
 * room is waiting.
 *
 * The gate is proved through a real page reload, not a live object, because the
 * thing being tested is that it reached storage.
 */
'use strict';

module.exports = {
  name: 'run',
  title: 'P4 · quit in room three, come back to room three',
  async run(t) {
    await t.newKnight('Delver');
    await t.unlockDeep();

    // --- descend, clear two rooms, stand in the third, walk away ---
    const before = await t.ev(() => {
      Game.s.items.pick = 9;
      Dungeon.descend('deep');                                   // enters room 1
      const seed = Dungeon.run.seed;
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 100, xp: 40 } });
      Dungeon.nextRoom();                                        // enters room 2
      Game.s.hp = 57;                                            // wounded clearing it
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 100, xp: 40 } });
      Dungeon.nextRoom();                                        // standing IN room 3
      Game.s.hp = 12;                                            // hurt further inside it

      // what room three is, so we can prove the same one comes back
      R.seed(((seed ^ (3 * 2654435761)) >>> 0) || 1);
      const isLock = 3 >= 2 && R.chance(SETTINGS.deep.lockChance);
      const spec = (isLock ? RoomKinds.lock : RoomKinds.monster).build(R, 3, SETTINGS.deep);
      R.unseed();
      return { seed, ck: JSON.parse(JSON.stringify(Game.s.run)), liveDepth: Dungeon.run.depth,
        room3: isLock ? { kind: 'lock', topic: spec.q.topic }
                      : { kind: 'monster', foe: spec.foe.nm, hp: spec.foe.hp } };
    });

    t.ok('a checkpoint was written', !!before.ck && typeof before.ck.seed === 'number');
    t.ok('it counts depths CLEARED, not the room you stand in — or clearing pays twice',
      before.ck.done === 2 && before.liveDepth === 3, JSON.stringify(before.ck));
    t.ok('it carries the unbanked pile', before.ck.gold === 200 && before.ck.xp === 80,
      JSON.stringify(before.ck));
    t.eq('it holds health as the room was ENTERED', before.ck.hp, 57);
    t.ok('damage taken inside the abandoned room is not held against you', before.ck.hp !== 12);

    // --- the player closes the tab ---
    await t.reload();

    const after = await t.ev(() => {
      const pend = Dungeon.pending();
      UI.renderMap();
      const map = document.getElementById('mapList').innerText;
      Dungeon.resume();
      R.seed(((Dungeon.run.seed ^ (Dungeon.run.depth * 2654435761)) >>> 0) || 1);
      const isLock = Dungeon.run.depth >= 2 && R.chance(SETTINGS.deep.lockChance);
      const spec = (isLock ? RoomKinds.lock : RoomKinds.monster).build(R, Dungeon.run.depth, SETTINGS.deep);
      R.unseed();
      return { pend, depth: Dungeon.run.depth, active: Dungeon.active,
        unbanked: Dungeon.run.unbanked, hp: Game.s.hp,
        offersResume: /Resume the descent/.test(map), namesRoom: /depth 3/.test(map),
        room3: isLock ? { kind: 'lock', topic: spec.q.topic }
                      : { kind: 'monster', foe: spec.foe.nm, hp: spec.foe.hp } };
    });

    t.ok('the checkpoint survived a page reload', !!after.pend && after.pend.seed === before.seed);
    t.ok('the map offers the descent back', after.offersResume);
    t.ok('and names the room you were in', after.namesRoom);
    t.eq('resuming re-enters room three', after.depth, 3);
    t.ok('the unbanked pile comes back', after.unbanked.gold === 200 && after.unbanked.xp === 80,
      JSON.stringify(after.unbanked));
    t.eq('so does the wound — a resume is not a free heal', after.hp, 57);
    t.eq('and it is the SAME room three', after.room3, before.room3);

    // --- the checkpoint is closed out at every ending ---
    const endings = await t.ev(() => {
      const out = {};
      Dungeon.leave();
      out.afterBanking = Game.s.run;
      Dungeon.descend('deep');
      out.duringRun = !!Game.s.run;
      Dungeon.died({ status: 'failed' });
      out.afterFalling = Game.s.run;
      // abandoning forfeits the pot, exactly as a fall would
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 300, xp: 10 } });
      const goldBefore = Game.s.gold;
      Dungeon.abandon();
      out.afterAbandon = Game.s.run;
      out.abandonBanksNothing = Game.s.gold === goldBefore;
      return out;
    });
    t.eq('banking the haul clears the checkpoint', endings.afterBanking, null);
    t.ok('a live run has one', endings.duringRun === true);
    t.eq('a fall clears it', endings.afterFalling, null);
    t.eq('abandoning clears it', endings.afterAbandon, null);
    t.ok('and abandoning banks nothing — walking away is not climbing out',
      endings.abandonBanksNothing);

    // --- a knight code carries no run ---
    const carried = await t.ev(() => {
      Dungeon.descend('deep');
      const k = Profiles.active();
      const d = Codec.decode(Codec.encode({ nm: k.nm, crest: k.crest, col: k.col }, Game.s, Date.now()));
      return { ok: d.ok, run: d.ok ? d.g.run : 'decode failed' };
    });
    t.ok('a knight code carries no descent — a code is who you are, not where you are',
      carried.ok && !carried.run, JSON.stringify(carried));
  }
};
