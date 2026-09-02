/* S3 — Scrying, and the Sanctum to learn it in.
 *
 * The complaint this answers: the fork was a test of nerve, because there was
 * nothing to know about what lay below. Farsight is the first ability spent
 * OUTSIDE a fight, on the decision itself, and the first whose charges last a
 * descent rather than a room — a decision you can re-buy every time it comes
 * round is not one.
 *
 * The Sanctum is the second setting, and the pattern the other five will follow:
 * its own curve, its own room plan, its own mathematics, and its own material.
 */
'use strict';

module.exports = {
  name: 'foresight',
  title: 'S3 · seeing one room down',
  async run(t) {
    await t.newKnight('Seer');

    // --- the ability is scoped to the run, not the fight ---
    const scope = await t.ev(() => {
      const out = {};
      const set = (n, m) => {
        const st = STRANDS.find(x => x[0] === n);
        st[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: 0, t: Date.now() });
      };
      Game.s.topicStats = {};
      set('Multivariable & Series', 0.95);       // solid: three readings
      set('Vectors', 0.95);                      // so Ward has charges to compare
      Game.s.loadout = ['farsight', 'ward'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1 };
      Game.s.runes = {};

      Dungeon.descend('deep');
      out.armedAtMouth = Dungeon.forkCharges('farsight');
      out.notInPowerBar = !/Farsight/.test(document.getElementById('powerbar').innerText);
      out.fightAbilityStillThere = Battle.skillLeft.ward > 0;
      out.forkNotInFightLedger = Battle.skillLeft.farsight === undefined;

      // clearing a room reaches the fork, which offers the reading
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 100, xp: 20 } });
      out.forkOffers = /Scry the passage/.test(document.getElementById('resultBody').innerText);

      Dungeon.scry();
      out.afterOne = Dungeon.forkCharges('farsight');
      out.readingShown = document.getElementById('resultBody').innerText;
      out.hasReading = !!Dungeon.scried;

      // a second scry at the same fork is refused — one room, one reading
      Dungeon.scry();
      out.noDoubleScry = Dungeon.forkCharges('farsight') === out.afterOne;

      // entering the room spends the knowledge
      Dungeon.nextRoom();
      out.readingCleared = Dungeon.scried === null;

      // charges do NOT come back with the next fight
      out.stillSpent = Dungeon.forkCharges('farsight') === out.afterOne;

      // but a fresh descent re-arms them
      Dungeon.descend('deep');
      out.freshDescent = Dungeon.forkCharges('farsight');
      return out;
    });

    t.eq('a solid Scryer carries three readings into a descent', scope.armedAtMouth, 3);
    t.ok('Farsight is not in the fight power bar — it is spent at the fork', scope.notInPowerBar);
    t.ok('and not in the fight ledger', scope.forkNotInFightLedger);
    t.ok('fight abilities are unaffected', scope.fightAbilityStillThere);
    t.ok('the fork offers the reading', scope.forkOffers);
    t.eq('scrying spends one', scope.afterOne, 2);
    t.ok('and produces a reading', scope.hasReading);
    t.ok('a second scry at the same fork is refused', scope.noDoubleScry);
    t.ok('entering the room clears the reading', scope.readingCleared);
    t.ok('charges do not refill between rooms — that is the whole point',
      scope.stillSpent);
    t.eq('a fresh descent re-arms them', scope.freshDescent, 3);

    // --- what the reading says has to be TRUE of the room you then meet ---
    const truth = await t.ev(() => {
      const out = { checked: 0, mismatches: [] };
      Game.s.loadout = ['farsight'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1 };
      for (let trial = 0; trial < 12; trial++) {
        Dungeon.descend('deep');
        Dungeon.run.seed = 1000 + trial * 37;
        Dungeon.run.depth = 2;
        const seen = Dungeon.peek(3);
        // build room three the way nextRoom would, and compare
        const set = SETTINGS.deep;
        R.seed(((Dungeon.run.seed ^ (3 * 2654435761)) >>> 0) || 1);
        const real = set.plan ? set.plan[2]
                   : R.chance(set.lockChance) ? 'lock'
                   : R.chance(set.seamChance || 0) ? 'seam' : 'monster';
        const realFoe = real === 'monster' ? WaveEngine.foe(3, set.waves) : null;
        R.unseed();
        out.checked++;
        if (seen.name !== real) out.mismatches.push(`kind ${seen.name} vs ${real}`);
        else if (realFoe && (seen.foe.nm !== realFoe.nm || seen.foe.hp !== realFoe.hp))
          out.mismatches.push(`foe ${seen.foe.nm} vs ${realFoe.nm}`);
      }
      return out;
    });
    t.ok('a reading names the room you actually meet, every time',
      truth.mismatches.length === 0, `${truth.checked} checked; ${truth.mismatches.join('; ')}`);

    // --- nothing is offered to a knight who cannot use it ---
    const quiet = await t.ev(() => {
      const out = {};
      Game.s.loadout = ['ward', 'sight', 'steady'];        // Farsight not carried
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 50, xp: 10 } });
      out.silentWhenNotCarried = !/Scry|Farsight/.test(document.getElementById('resultBody').innerText);

      // carried but unknown: the button is honest about being empty
      Game.s.topicStats = {};                              // weak: no charges
      Game.s.loadout = ['farsight'];
      Game.s.runes = {};
      Dungeon.descend('deep');
      out.zeroCharges = Dungeon.forkCharges('farsight');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 50, xp: 10 } });
      const txt = document.getElementById('resultBody').innerText;
      out.saysSpent = /spent for this descent/.test(txt);
      Dungeon.scry();
      out.cannotScryOnEmpty = Dungeon.scried === null;
      return out;
    });
    t.ok('the fork says nothing to a knight not carrying Farsight', quiet.silentWhenNotCarried);
    t.eq('an unlearned skill grants no readings', quiet.zeroCharges, 0);
    t.ok('and the fork says so rather than offering a dead button', quiet.saysSpent);
    t.ok('scrying on empty does nothing', quiet.cannotScryOnEmpty);

    // --- the Sanctum ---
    const sanctum = await t.ev(() => {
      const out = {};
      const S = SETTINGS.sanctum;
      out.exists = !!S;
      out.rooms = S.rooms;
      out.canDie = S.canDie;
      out.plan = S.plan.slice();
      out.paysEssence = S.essencePerRoom;
      // it is about its own mathematics
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;
      // harder per point of health than the Deep, gentler than the Arena
      R.seed(1); const sanF = WaveEngine.foe(3, SANCTUM_WAVES); R.unseed();
      R.seed(1); const deepF = WaveEngine.foe(3, DEEP_WAVES); R.unseed();
      R.seed(1); const areF = WaveEngine.foe(3, ARENA_WAVES); R.unseed();
      out.sharperThanDeep = (sanF.atk / sanF.hp) > (deepF.atk / deepF.hp);
      out.gentlerThanArena = sanF.hp < areF.hp && sanF.atk < areF.atk;

      // opens one realm later than the Deep
      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.sanctumOpen();
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      out.stillSealedAfterOne = !Dungeon.sanctumOpen();
      REALMS[1].foes.forEach((f, i) => Game.s.cleared['1:' + i] = 1);
      out.openAfterTwo = Dungeon.sanctumOpen();
      UI.renderMap();
      out.onMap = /Sanctum/.test(document.getElementById('mapList').innerText);

      // essence accrues per room and banks on the way out
      Game.s.mats = { ore: 0, essence: 0 };
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1 };
      Dungeon.descend('sanctum');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 5 } });
      out.carriedAfterOne = Dungeon.run.unbanked.essence;
      out.bankedYet = Game.s.mats.essence;
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 5 } });
      Dungeon.leave();
      out.bankedOnLeaving = Game.s.mats.essence;

      // and a fall costs it, exactly as it costs the gold
      Game.s.mats.essence = 0;
      Dungeon.descend('sanctum');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 5 } });
      out.carriedBeforeFall = Dungeon.run.unbanked.essence;
      Dungeon.died({ status: 'failed' });
      out.lostOnFalling = Game.s.mats.essence;
      return out;
    });
    t.ok('the Sanctum exists as a setting', sanctum.exists);
    t.eq('six rooms', sanctum.rooms, 6);
    t.ok('and it can kill you — it is not a tutorial', sanctum.canDie === true);
    t.ok('its rooms are laid out by hand', sanctum.plan.length === 6);
    t.ok('it is about its own mathematics', sanctum.topicsResolve, String(sanctum.topics && sanctum.topics.length));
    t.ok('its foes are sharper per point of health than the Deep', sanctum.sharperThanDeep);
    t.ok('but gentler than the Arena', sanctum.gentlerThanArena);
    t.ok('it is sealed until the second realm falls',
      sanctum.sealedAtStart && sanctum.stillSealedAfterOne && sanctum.openAfterTwo);
    t.ok('and it has its own node on the map', sanctum.onMap);
    t.eq('a cleared room carries essence', sanctum.carriedAfterOne, 1);
    t.eq('which is unbanked until you walk out', sanctum.bankedYet, 0);
    t.eq('walking out banks it', sanctum.bankedOnLeaving, 2);
    t.ok('a fall takes it, exactly as it takes the gold',
      sanctum.carriedBeforeFall > 0 && sanctum.lostOnFalling === 0,
      `carried ${sanctum.carriedBeforeFall}, banked ${sanctum.lostOnFalling}`);

    // --- and the Sanctum is a place to go, never a gate ---
    const gate = await t.ev(() => {
      Game.s.cleared = {};                            // Sanctum sealed
      Game.s.topicStats = {};
      Game.s.loadout = ['farsight'];
      return {
        scryingStillCarryable: Loadout.chosen().some(a => a.id === 'farsight'),
        chargesFromMasteryNotEntry: (() => {
          const st = STRANDS.find(x => x[0] === 'Multivariable & Series');
          st[1].forEach(k => Game.s.topicStats[k] = {
            c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
          return Loadout.charges(Loadout.byId('farsight'));
        })()
      };
    });
    t.ok('Scrying can be carried without ever entering the Sanctum', gate.scryingStillCarryable);
    t.ok('and its charges come from the mathematics, not from admission',
      gate.chargesFromMasteryNotEntry === 3, String(gate.chargesFromMasteryNotEntry));
  }
};
