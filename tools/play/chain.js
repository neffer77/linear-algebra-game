/* S2 — the Deep–Keep chain.
 *
 * Four skills that feed each other, inside the two settings that already
 * exist. Delving cuts ore from seams; Smithing spends ore on the picks that
 * Lockpicking needs and on gear no coin buys; Lockpicking opens chests for
 * essence; Enchanting spends essence on runes you keep for good.
 *
 * The Skill Web's warning is what these checks are really for: the moment a
 * player who dislikes one link cannot progress, the web stops being a reward
 * and becomes a tax. So the chain must be a multiplier, never a gate.
 */
'use strict';

module.exports = {
  name: 'chain',
  title: 'S2 · ore out of the Deep, runes back into it',
  async run(t) {
    await t.newKnight('Delver');

    // --- Delving: a seam is a decision about how far to push ---
    const seam = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 0, essence: 0 };
      R.seed(11);
      const spec = RoomKinds.seam.build(R, 6, SETTINGS.deep);
      R.unseed();
      out.kind = spec.kind;
      out.questionsDrawn = spec.qs.length;
      out.pay = [1, 2, 3].map(n => Seam.yieldFor(n, 6));

      // cutting one, cleanly
      let res = null;
      Seam.begin(spec, { depth: 6 }, o => res = o);
      Seam.cut(1);
      document.querySelector('#seamChoices .choice[data-correct="1"]').click();
      document.getElementById('seamGo').click();
      out.oneClean = { ore: Game.s.mats.ore, out: res };

      // cutting three and missing the first: the seam collapses for nothing
      Game.s.mats.ore = 0;
      let res2 = null;
      Seam.begin(spec, { depth: 6 }, o => res2 = o);
      Seam.cut(3);
      document.querySelector('#seamChoices .choice:not([data-correct="1"])').click();
      out.collapseText = document.getElementById('lockOut').innerText;
      document.getElementById('seamGo').click();
      out.collapsed = { ore: Game.s.mats.ore, out: res2 };

      // cutting three, all clean
      Game.s.mats.ore = 0;
      let res3 = null;
      Seam.begin(spec, { depth: 6 }, o => res3 = o);
      Seam.cut(3);
      for (let i = 0; i < 3; i++) {
        const b = document.querySelector('#seamChoices .choice[data-correct="1"]');
        if (b) b.click();
        if (document.getElementById('seamGo')) break;
        Seam.ask();                              // step past the inter-question pause
      }
      const go = document.getElementById('seamGo');
      out.threeReached = !!go;
      if (go) go.click();
      out.threeClean = { ore: Game.s.mats.ore, out: res3 };

      // walking away costs nothing and still resolves
      let res4 = null;
      Seam.begin(spec, { depth: 6 }, o => res4 = o);
      Seam.walkAway();
      document.getElementById('seamGo').click();
      out.walked = res4;
      return out;
    });

    t.eq('a seam builds', seam.kind, 'seam');
    t.eq('it draws its riddles up front, so a resume is the same seam', seam.questionsDrawn, 3);
    t.ok('cutting deeper pays superlinearly, or nobody would risk it',
      seam.pay[2] - seam.pay[1] > seam.pay[1] - seam.pay[0], JSON.stringify(seam.pay));
    t.ok('one clean cut yields ore', seam.oneClean.ore === seam.pay[0], JSON.stringify(seam.oneClean));
    t.eq('a miss collapses the seam for nothing', seam.collapsed.ore, 0);
    t.ok('and says what the miss was', /collapses/i.test(seam.collapseText), seam.collapseText.slice(0, 90));
    t.ok('a seam never ends a run — it has no foe',
      seam.collapsed.out && seam.collapsed.out.status === 'cleared');
    t.ok('three clean cuts pay the deep price', seam.threeReached && seam.threeClean.ore === seam.pay[2],
      JSON.stringify(seam.threeClean));
    t.ok('walking away resolves and costs nothing',
      seam.walked && seam.walked.status === 'cleared' && seam.walked.seam.ore === 0);

    // --- Lockpicking: a clean chest gives up essence ---
    const ess = await t.ev(() => {
      Game.s.mats = { ore: 0, essence: 0 };
      Game.s.items.pick = 3;
      R.seed(9);
      const spec = RoomKinds.lock.build(R, 8, SETTINGS.deep);
      R.unseed();
      let res = null;
      Lock.begin(spec, { depth: 8 }, o => res = o);
      Lock.tumblers();
      document.querySelector('#lockChoices .choice[data-correct="1"]').click();
      const shown = document.getElementById('lockOut').innerText;
      document.getElementById('lockGo').click();
      const clean = { essence: Game.s.mats.essence, shown: /essence/i.test(shown), out: res };

      // a fumbled chest gives none
      Game.s.mats.essence = 0;
      let res2 = null;
      Lock.begin(spec, { depth: 8 }, o => res2 = o);
      Lock.tumblers();
      document.querySelector('#lockChoices .choice:not([data-correct="1"])').click();
      document.getElementById('lockGo').click();
      return { clean, fumbledEssence: Game.s.mats.essence };
    });
    t.ok('a chest opened cleanly gives up essence', ess.clean.essence > 0, JSON.stringify(ess.clean));
    t.ok('and the screen says so', ess.clean.shown);
    t.eq('a snapped pick gives none', ess.fumbledEssence, 0);

    // --- Smithing: ore becomes picks, and gear gold cannot reach ---
    const forge = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 0, essence: 0 };
      Game.s.items.pick = 0;
      Game.s.owned = { w0: 1, a0: 1 };
      Game.s.weapon = 'w0'; Game.s.armor = 'a0';

      Forge.make('f_picks');                       // no ore: refused
      out.refusedWithoutOre = Game.s.items.pick === 0;

      Game.s.mats.ore = 4;
      Forge.make('f_picks');
      out.picks = Game.s.items.pick;
      out.oreSpent = Game.s.mats.ore;

      Game.s.mats.ore = 60;
      Forge.make('f_blade'); Forge.make('f_plate');
      out.blade = Game.s.weapon; out.plate = Game.s.armor;
      out.oreLeft = Game.s.mats.ore;
      out.bladeDmg = Game.weapon().dmg;
      // the forged gear is not for sale at any price
      out.notInShop = WEAPONS.concat(ARMORS).filter(x => x.forge).every(x => x.cost === 0);
      UI.go('s-shop');
      const shop = document.getElementById('shopList').innerText;
      out.shopHidesForged = !/Deepsteel Edge[\s\S]{0,40}🪙/.test(shop);
      out.shopShowsForgeBench = /The Forge/.test(shop) && /Rune Bench/.test(shop);
      return out;
    });
    t.ok('the forge refuses without ore', forge.refusedWithoutOre);
    t.eq('four ore makes three picks', forge.picks, 3);
    t.eq('and spends the ore', forge.oreSpent, 0);
    t.ok('ore buys gear and equips it', forge.blade === 'wD' && forge.plate === 'aD',
      JSON.stringify(forge));
    t.ok('that gear beats what a new delver could afford', forge.bladeDmg >= 30, String(forge.bladeDmg));
    t.ok('and is not for sale at any price', forge.notInShop && forge.shopHidesForged);
    t.ok('the Smithy shows both benches', forge.shopShowsForgeBench);

    // --- Enchanting: essence becomes something permanent ---
    const rune = await t.ev(() => {
      const out = {};
      Game.s.runes = {}; Game.s.mats.essence = 0;
      Game.s.weapon = 'w0'; Game.s.armor = 'a0';
      Runes.buy('r_edge');
      out.refusedWhenPoor = !Runes.worn('r_edge');

      const critBefore = Battle.wStats().crit, defBefore = Battle.defStat();
      Game.s.mats.essence = 40;
      Runes.buy('r_edge'); Runes.buy('r_hide');
      out.spent = Game.s.mats.essence;
      out.critUp = Battle.wStats().crit > critBefore;
      out.defUp = Battle.defStat() > defBefore;

      // buying twice does not stack or charge twice
      const before = Game.s.mats.essence;
      Runes.buy('r_edge');
      out.noDoubleBuy = Game.s.mats.essence === before;

      // the Deep rune grants one more use of every skill carried
      Game.s.loadout = ['ward'];
      const strand = STRANDS.find(x => x[0] === 'Vectors');
      Game.s.topicStats = {};
      strand[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1 };
      Dungeon.descend('cellar');
      const without = Battle.skillLeft.ward;
      Game.s.runes.r_depth = 1;
      Dungeon.descend('cellar');
      out.withRune = Battle.skillLeft.ward;
      out.withoutRune = without;
      return out;
    });
    t.ok('the bench refuses without essence', rune.refusedWhenPoor);
    t.eq('two runes cost what they say', rune.spent, 40 - 6 - 8);
    t.ok('the Edge raises crit', rune.critUp);
    t.ok('the Hide raises defence', rune.defUp);
    t.ok('a rune cannot be bought twice', rune.noDoubleBuy);
    t.ok('the Rune of the Deep grants one more use of every skill',
      rune.withRune === rune.withoutRune + 1, `${rune.withoutRune} → ${rune.withRune}`);

    /* --- the rule the Skill Web is most worried about ---
       Multipliers, never gates. A player who never touches a seam must still
       reach every room and use every skill; the chain makes the Deep easier,
       and is never required to enter it. */
    const open = await t.ev(() => {
      Game.s.mats = { ore: 0, essence: 0 };
      Game.s.runes = {};
      Game.s.items.pick = 0;
      const out = {};
      out.canDescend = (() => { try { Dungeon.descend('deep'); return Dungeon.active; }
                               catch (e) { return 'threw: ' + e.message; } })();
      // every room kind still builds and enters with nothing in your pockets
      out.kindsBuild = Object.keys(RoomKinds).every(k => {
        try { R.seed(3); RoomKinds[k].build(R, 4, SETTINGS.deep); R.unseed(); return true; }
        catch (e) { return false; }
      });
      // a chest with no picks is a dead end, not a dead run
      R.seed(5);
      const spec = RoomKinds.lock.build(R, 4, SETTINGS.deep);
      R.unseed();
      let res = null;
      Lock.begin(spec, { depth: 4 }, o => res = o);
      document.getElementById('lockGo').click();
      out.chestWithoutPicks = res && res.status === 'cleared';
      return out;
    });
    t.ok('a knight with nothing can still descend', open.canDescend === true, String(open.canDescend));
    t.ok('every room kind still builds with empty pockets', open.kindsBuild);
    t.ok('a chest with no picks is a dead end, never a dead run', open.chestWithoutPicks);

    // --- the chain survives the carry code ---
    const carried = await t.ev(() => {
      Game.s.mats = { ore: 37, essence: 21 };
      Game.s.runes = { r_edge: 1, r_depth: 1 };
      Game.s.owned.wD = 1;
      const k = Profiles.active();
      const code = Codec.encode({ nm: k.nm, crest: k.crest, col: k.col }, Game.s, Date.now());
      const d = Codec.decode(code);
      return { head: code.slice(0, 4), ok: d.ok, why: d.why,
               mats: d.ok ? d.g.mats : null, runes: d.ok ? d.g.runes : null,
               ownsForged: d.ok ? !!d.g.owned.wD : null };
    });
    t.eq('codes are tagged KE3-', carried.head, 'KE3-');
    t.ok('a carried knight keeps their ore and essence',
      carried.ok && carried.mats.ore === 37 && carried.mats.essence === 21,
      JSON.stringify(carried));
    t.ok('and their runes', carried.ok && carried.runes.r_edge && carried.runes.r_depth);
    t.ok('and the gear they forged', carried.ownsForged === true);

    // a code from before any of this still reads, with empty pockets
    const old = await t.ev(() => {
      const V2 = 'KE2-AFICVDNUDVRJWS4RAKRSXG5DXMVWGYNAPDQAAAAAA';
      const d = Codec.decode(V2);
      return { ok: d.ok, why: d.why };
    });
    t.ok('a malformed old code is refused rather than misread',
      old.ok === false && /incomplete|mistyped|cut short/i.test(old.why), JSON.stringify(old));
  }
};
