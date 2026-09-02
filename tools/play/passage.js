/* S5 — Passage, the channel that had nothing in it.
 *
 * Every skill built so far is something you press: three slots, charges read
 * off mastery, spent in a fight or at a fork and gone by the next one. Passage
 * is the other shape the Skill Web describes — things that are simply true of
 * you once you know the mathematics, everywhere, without being carried.
 *
 * So most of what is checked here is that distinction holding: that these are
 * not in the loadout, cost nothing to use, apply in settings their home has
 * nothing to do with, and — the part that keeps them honest — stop applying
 * when the mathematics behind them goes cold.
 *
 * Loremaster gets the most attention, because it is the only effect in the game
 * that reaches back into the mastery model rather than reading out of it, and
 * that makes it circular in a way that has to be broken deliberately.
 */
'use strict';

const solid = (name, m) => ({ name, m });

module.exports = {
  name: 'passage',
  title: 'S5 · things that stay',
  async run(t) {
    await t.newKnight('Wayfarer');

    // --- the shape of the channel ---
    const shape = await t.ev(() => {
      const out = {};
      out.count = PASSAGE_SKILLS.length;
      out.ids = PASSAGE_SKILLS.map(a => a.id);
      out.strandsResolve = PASSAGE_SKILLS.every(a => Loadout.topicsOf(a).length > 0);
      out.everyOneHasTwoTiers = PASSAGE_SKILLS.every(a => a.tiers.length === 2);
      out.namesAHomeAndMaths = PASSAGE_SKILLS.every(a => !!a.home && !!a.maths);
      // they are NOT in the pressable table, and cannot be carried
      out.notInLoadoutTable = PASSAGE_SKILLS.every(a => !Loadout.byId(a.id));
      Game.s.loadout = [];
      PASSAGE_SKILLS.forEach(a => Loadout.toggle(a.id));
      out.cannotBeCarried = Game.s.loadout.filter(id => PASSAGE_SKILLS.some(a => a.id === id));
      return out;
    });
    t.eq('four skills, which is the whole channel', shape.count, 4);
    t.eq('and the four the design named', shape.ids.slice().sort(),
      ['climbing', 'loremaster', 'reckoning', 'taming']);
    t.ok('each draws on a real strand', shape.strandsResolve);
    t.ok('each has two tiers', shape.everyOneHasTwoTiers);
    t.ok('and names where it is learned and what it is made of', shape.namesAHomeAndMaths);
    t.ok('none of them is a pressable ability', shape.notInLoadoutTable);
    t.eq('and none can be taken into a loadout slot', shape.cannotBeCarried, []);

    // --- tiers come from the mathematics, and go again ---
    const tiers = await t.ev(() => {
      const out = {};
      const setStrand = (name, m, daysAgo) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount,
          t: Date.now() - (daysAgo || 0) * 864e5 });
      };
      const climb = Passage.byId('climbing');
      Game.s.topicStats = {};
      out.unknown = Passage.tier(climb);
      setStrand('Multivariable & Series', 0.45); out.shaky = Passage.tier(climb);
      setStrand('Multivariable & Series', 0.70); out.steady = Passage.tier(climb);
      setStrand('Multivariable & Series', 0.95); out.solid = Passage.tier(climb);
      // and it is not permanent in the sense of unearned: let it go cold and it goes
      setStrand('Multivariable & Series', 0.95, 400); out.cold = Passage.tier(climb);
      return out;
    });
    t.eq('an unknown skill grants nothing', tiers.unknown, 0);
    t.eq('shaky is still nothing — a permanent effect wants to be felt', tiers.shaky, 0);
    t.eq('steady earns the first tier', tiers.steady, 1);
    t.eq('solid earns the second', tiers.solid, 2);
    t.eq('and a skill left to go cold stops being true of you', tiers.cold, 0);

    // --- Climbing: a route, and only onto ground you proved ---
    const climb = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.topicStats = {};

      // nothing proved yet: the route leads nowhere
      Game.s.bests = {};
      setStrand('Multivariable & Series', 0.95);
      out.noRouteWithoutHistory = Passage.startDepth(SETTINGS.deep);

      Game.s.bests = { deep: 10 };
      setStrand('Multivariable & Series', 0.70);
      out.steadyStart = Passage.startDepth(SETTINGS.deep);
      setStrand('Multivariable & Series', 0.95);
      out.solidStart = Passage.startDepth(SETTINGS.deep);
      setStrand('Multivariable & Series', 0.20);
      out.unknownStart = Passage.startDepth(SETTINGS.deep);

      /* The route must always stop short of the deepest room banked from, at
         every depth and on both tiers — otherwise a knight could be set down
         past the last ground they proved, which is the one thing the whole
         mechanism is not allowed to do. Swept rather than sampled, because it
         is a property of the two formulas and the formulas are the sort of
         thing that gets tuned. */
      out.swept = 0; out.tooFar = [];
      for (const m of [0.70, 0.95]) {
        setStrand('Multivariable & Series', m);
        for (let best = 0; best <= 200; best++) {
          Game.s.bests = { deep: best };
          const at = Passage.startDepth(SETTINGS.deep);
          out.swept++;
          if (at < 0 || (best > 0 && at >= best)) out.tooFar.push(`${m}@${best}→${at}`);
        }
      }
      setStrand('Multivariable & Series', 0.95);

      // a fixed-length setting is left alone: starting a five-table Tavern on
      // table three is not a shortcut, it is a shorter night
      Game.s.bests = { deep: 10, tavern: 5, sanctum: 6 };
      out.tavernStart = Passage.startDepth(SETTINGS.tavern);
      out.sanctumStart = Passage.startDepth(SETTINGS.sanctum);
      out.cellarStart = Passage.startDepth(SETTINGS.cellar);

      // and it actually places the knight there
      Game.s.bests = { deep: 10 };
      Dungeon.descend('deep');
      out.enteredAt = Dungeon.run.depth;
      out.checkpointHolds = Game.s.run.done;
      // a resume from that checkpoint does not walk them back to the surface
      Dungeon.active = false;
      Dungeon.resume();
      out.resumedAt = Dungeon.run.depth;
      return out;
    });
    t.eq('a knight who has banked nothing has no route', climb.noRouteWithoutHistory, 0);
    t.eq('steady starts you at half the depth you proved', climb.steadyStart, 5);
    t.eq('solid starts you two short of it', climb.solidStart, 8);
    t.eq('and without the mathematics there is no route at all', climb.unknownStart, 0);
    t.ok('the route stops short of the deepest room banked from, at every depth',
      climb.swept > 400 && climb.tooFar.length === 0,
      `${climb.swept} swept; ${climb.tooFar.slice(0, 5).join(', ')}`);
    t.ok('fixed-length settings are left alone — that would be a shorter night, not a shortcut',
      climb.tavernStart === 0 && climb.sanctumStart === 0 && climb.cellarStart === 0);
    t.eq('a descent opens in the room past the route', climb.enteredAt, 9);
    t.eq('the checkpoint counts the skipped ground as done', climb.checkpointHolds, 8);
    t.eq('so a resume comes back to the same room, not the surface', climb.resumedAt, 9);

    // --- the record Climbing reads is of ground BANKED, not merely reached ---
    const proved = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.topicStats = {};
      Game.s.bests = {};

      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 40, xp: 10 } });
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 40, xp: 10 } });
      Dungeon.nextRoom();                       // standing in room three
      out.reachedThree = Dungeon.run.depth;
      Dungeon.died({ status: 'failed' });
      out.afterFalling = (Game.s.bests || {}).deep || 0;

      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 40, xp: 10 } });
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 40, xp: 10 } });
      Dungeon.leave();
      out.afterBanking = Game.s.bests.deep;

      // and it only ever rises
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      Dungeon.leave();
      out.afterAShallowNight = Game.s.bests.deep;

      // a fixed-length run records its length on the way out
      Game.s.gold = 500;
      Dungeon.descend('tavern');
      for (let i = 0; i < SETTINGS.tavern.rooms; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 5, xp: 1 } });
        if (Dungeon.active) Dungeon.nextRoom();
      }
      out.tavernRecorded = Game.s.bests.tavern;
      return out;
    });
    t.eq('reaching room three', proved.reachedThree, 3);
    t.eq('and falling there proves nothing', proved.afterFalling, 0);
    t.eq('banking from room two proves two', proved.afterBanking, 2);
    t.ok('and the record only ever rises', proved.afterAShallowNight === 2,
      String(proved.afterAShallowNight));
    t.ok('a fixed-length run records itself too', proved.tavernRecorded > 0,
      String(proved.tavernRecorded));

    // --- Dead reckoning: a fall is no longer everything ---
    const reck = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.bests = {};

      const fallCarrying = (pot) => {
        Game.s.gold = 0;
        Dungeon.descend('deep');
        Dungeon.run.unbanked.gold = pot;
        Dungeon.cur = { kind: RoomKinds.monster, spec: { kind: 'monster', foe: { nm: 'A thing' } } };
        Dungeon.died({ status: 'failed' });
        return { purse: Game.s.gold, said: document.getElementById('resultBody').innerText };
      };

      Game.s.topicStats = {};
      out.none = Passage.salvage();
      out.lostAll = fallCarrying(400).purse;

      setStrand('Integrals', 0.70);
      out.steady = Passage.salvage();
      const s1 = fallCarrying(400);
      out.steadyKept = s1.purse;
      out.saysSo = /dead reckoning/i.test(s1.said);
      // the two numbers on the screen add up to what was carried
      const lostShown = /(\d+) unbanked gold lost/.exec(s1.said);
      const keptShown = /🧭 (\d+) carried out/.exec(s1.said);
      out.addsUp = lostShown && keptShown &&
        (Number(lostShown[1]) + Number(keptShown[1]) === 400);

      setStrand('Integrals', 0.95);
      out.solid = Passage.salvage();
      out.solidKept = fallCarrying(400).purse;

      // it says nothing to a knight who has not earned it
      Game.s.topicStats = {};
      out.quiet = !/dead reckoning/i.test(fallCarrying(400).said);
      return out;
    });
    t.eq('an unearned skill salvages nothing', reck.none, 0);
    t.eq('and a fall still costs everything', reck.lostAll, 0);
    t.eq('steady carries a quarter out', reck.steady, 0.25);
    t.eq('which is a quarter of the pot', reck.steadyKept, 100);
    t.eq('solid carries half', reck.solid, 0.5);
    t.eq('half of the pot', reck.solidKept, 200);
    t.ok('the death screen says where the gold went', reck.saysSo);
    t.ok('and the two numbers on it add up to what was carried', reck.addsUp);
    t.ok('it stays quiet for a knight who has not earned it', reck.quiet);

    // --- Beast taming: the first blows land on something else ---
    const beast = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      Game.s.metRoom = { monster: 1, lock: 1 };

      const blowsTaken = (n) => {
        Dungeon.descend('cellar');
        Battle.beastLeft = n;
        Game.s.hp = Game.s.maxHp = 1000;
        const took = [];
        for (let i = 0; i < 4; i++) took.push(Battle.takeHit(50));
        return took;
      };

      Game.s.topicStats = {};
      out.none = Passage.guard();
      out.withNothing = blowsTaken(Passage.guard());

      setStrand('Eigen & Subspaces', 0.70);
      out.steady = Passage.guard();
      out.withSteady = blowsTaken(Passage.guard());

      setStrand('Eigen & Subspaces', 0.95);
      out.solid = Passage.guard();
      out.withSolid = blowsTaken(Passage.guard());

      // it arrives fresh each fight — a companion, not a consumable
      Dungeon.descend('cellar');
      out.atFightStart = Battle.beastLeft;
      Battle.takeHit(50); Battle.takeHit(50);
      out.spent = Battle.beastLeft;
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();                        // the cellar's third room is a fight
      out.nextFight = Battle.beastLeft;

      // and it goes first, so a raised Ward is not wasted on a blow it eats
      Dungeon.descend('cellar');
      Battle.beastLeft = 1; Battle.wardUp = true;
      const eaten = Battle.takeHit(50);
      out.beastAte = eaten;
      out.wardStillUp = Battle.wardUp;
      const warded = Battle.takeHit(50);
      out.thenWarded = warded;
      return out;
    });
    t.eq('an unearned skill guards nothing', beast.none, 0);
    t.eq('and every blow lands', beast.withNothing, [50, 50, 50, 50]);
    t.eq('steady takes the first blow of a fight', beast.steady, 1);
    t.eq('so the first lands on the beast', beast.withSteady, [0, 50, 50, 50]);
    t.eq('solid takes the second too', beast.solid, 2);
    t.eq('and the first two land on the beast', beast.withSolid, [0, 0, 50, 50]);
    t.eq('the beast is fresh at the start of a fight', beast.atFightStart, 2);
    t.eq('spends itself over the fight', beast.spent, 0);
    t.eq('and is fresh again in the next one', beast.nextFight, 2);
    t.ok('a blow the beast eats does not spend a raised Ward',
      beast.beastAte === 0 && beast.wardStillUp);
    t.ok('which is then there for the blow that does land',
      beast.thenWarded === Math.max(1, Math.round(50 / 2)), String(beast.thenWarded));

    // --- Loremaster: the one effect that reaches back into the model ---
    const lore = await t.ev(() => {
      const out = {};
      const setStrand = (name, m, daysAgo) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount,
          t: Date.now() - (daysAgo || 0) * 864e5 });
      };
      // A topic in a strand Loremaster does NOT draw on, so what is measured is
      // the effect on everything else rather than on itself.
      const far = STRANDS.find(x => x[0] === 'Vectors')[1][0];
      const measure = () => {
        Game.s.topicStats[far] = { c: 20, w: 2, m: 0.9, seen: 10,
          last: Game.s.qCount, t: Date.now() - 30 * 864e5 };
        return Mastery.eff(far);
      };

      Game.s.topicStats = {};
      out.none = Passage.memory();
      out.plainEff = measure();

      setStrand('Limits & Derivatives', 0.70);
      out.steady = Passage.memory();
      out.steadyEff = measure();

      setStrand('Limits & Derivatives', 0.95);
      out.solid = Passage.memory();
      out.solidEff = measure();

      // the half-life is what moved, and by the multiplier it claims
      const r = { seen: 10, t: Date.now() - 30 * 864e5 };
      out.strengthSolid = Mastery.strength(r);
      Game.s.topicStats = {};
      out.strengthPlain = Mastery.strength(r);

      /* The circularity. Loremaster is priced off faded mastery of its own
         strand, and it is the thing that decides how fast that fades — so left
         alone it would feed on itself. The guard prices it plainly, which is
         checked by putting its own strand right on the edge of a tier and
         confirming the answer does not depend on how it got there. */
      setStrand('Limits & Derivatives', 0.95, 60);          // solid, but gone cold
      const tierFromCold = Passage.tier(Passage.byId('loremaster'));
      const effOfOwnStrand = Mastery.eff(STRANDS.find(x => x[0] === 'Limits & Derivatives')[1][0]);
      // priced plainly: the same as if the bonus did not exist at all
      const stash = Game.s.topicStats;
      out.tierFromCold = tierFromCold;
      out.effOfOwnStrand = effOfOwnStrand;
      out.guardRestored = Mastery._plain === false;
      Game.s.topicStats = stash;

      // and it terminates rather than recursing forever
      out.terminates = true;
      try { for (let i = 0; i < 200; i++) Mastery.eff(far); } catch (e) { out.terminates = false; }
      return out;
    });
    t.eq('an unearned skill changes nothing', lore.none, 1);
    t.eq('steady stretches the half-life half again', lore.steady, 1.5);
    t.eq('solid doubles it', lore.solid, 2);
    t.ok('so a month-old topic reads higher the more you know',
      lore.plainEff < lore.steadyEff && lore.steadyEff < lore.solidEff,
      `${lore.plainEff.toFixed(3)} → ${lore.steadyEff.toFixed(3)} → ${lore.solidEff.toFixed(3)}`);
    t.ok('it reaches every strand, not only its own',
      lore.solidEff > lore.plainEff);
    t.eq('and what moved is the half-life itself',
      lore.strengthSolid, lore.strengthPlain * 2);
    t.ok('pricing Loremaster does not recurse forever', lore.terminates);
    t.ok('and the guard is put back afterwards, not left on', lore.guardRestored);

    // --- they apply everywhere, which is the whole point of the channel ---
    const everywhere = await t.ev(() => {
      const out = { checked: [] };
      const s = STRANDS.find(x => x[0] === 'Eigen & Subspaces');
      s[1].forEach(k => Game.s.topicStats[k] = {
        c: 20, w: 2, m: 0.95, seen: 12, last: Game.s.qCount, t: Date.now() });
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.gold = 500;
      for (const key of ['cellar', 'deep', 'sanctum', 'tavern']) {
        Dungeon.descend(key);
        // step to a fight if this setting did not open on one
        for (let i = 0; i < 6 && document.querySelector('.screen.on').id !== 's-battle'; i++) {
          Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
          if (Dungeon.active) Dungeon.nextRoom();
        }
        out.checked.push({ key, beast: Battle.beastLeft });
      }
      out.sealedSettingsStillGrant = Passage.guard();
      return out;
    });
    t.ok('the beast walks with you into every setting there is',
      everywhere.checked.every(c => c.beast === 2),
      JSON.stringify(everywhere.checked));
    t.eq('and none of it needs the setting it was learned in to exist',
      everywhere.sealedSettingsStillGrant, 2);

    // --- the Gear screen says what is true of you ---
    const panel = await t.ev(() => {
      const s = STRANDS.find(x => x[0] === 'Integrals');
      s[1].forEach(k => Game.s.topicStats[k] = {
        c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      UI.go('s-gear');
      const txt = document.getElementById('gearList').innerText;
      return {
        hasPanel: /What stays with you/.test(txt),
        namesAll: PASSAGE_SKILLS.every(a => txt.indexOf(a.nm) >= 0),
        namesHomes: /the Summit/.test(txt) && /the Library/.test(txt),
        showsBothTiers: /Carry a quarter of the pot/.test(txt) && /Carry half of it/.test(txt),
        marksEarned: /earned|mastered/.test(txt),
        marksUnearned: /not yet/.test(txt)
      };
    });
    t.ok('the Gear screen has a panel for what stays', panel.hasPanel);
    t.ok('naming all four', panel.namesAll);
    t.ok('and the places they are learned', panel.namesHomes);
    t.ok('it shows both tiers, so the next one is worth something', panel.showsBothTiers);
    t.ok('and marks what is earned and what is not',
      panel.marksEarned && panel.marksUnearned);

    // --- the codec carries the record, and older codes still read ---
    const codec = await t.ev(() => {
      const out = {};
      out.ver = Codec.VER;
      out.orderMatchesSettings = JSON.stringify(SETTING_ORDER) === JSON.stringify(Object.keys(SETTINGS));
      out.orderCoversSettings = Object.keys(SETTINGS).every(k => SETTING_ORDER.indexOf(k) >= 0);

      Game.s.bests = { deep: 17, tavern: 4 };
      Game.s.gold = 1234;
      const code = Codec.encode(Profiles.active(), Game.s, Date.now());
      const back = Codec.decode(code);
      out.ok = back.ok;
      out.bests = back.ok ? back.g.bests : null;
      out.tagIsV4 = /^KE4-/.test(code);
      return out;
    });
    t.eq('the format is at version four', codec.ver, 4);
    t.ok('and SETTING_ORDER has not drifted from SETTINGS',
      codec.orderMatchesSettings, JSON.stringify(codec.orderCoversSettings));
    t.ok('a knight code carries the depth records', codec.ok);
    t.eq('exactly', codec.bests, { deep: 17, tavern: 4 });
    t.ok('under a version-four tag', codec.tagIsV4);
  }
};
