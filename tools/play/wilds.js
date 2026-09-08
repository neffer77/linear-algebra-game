/* S9 — the Wilds, and Tracking.
 *
 * The sixth setting, and the first whose danger does not only grow. Everywhere
 * else the curve climbs: the Deep ramps, the Summit ramps and takes health away
 * as well. Out here a herd circles, so the ground rises and falls on a period —
 * which changes the question the fork asks. "Can I take the next room" is no
 * longer the interesting one; "is the stretch ahead worsening or easing" is,
 * and no one-room reading can answer it.
 *
 * Which is the whole reason Tracking exists, and the thing to test hardest. A
 * fourth foresight is only worth a slot if it answers a question the other
 * three do not, and the way that claim goes wrong is subtle: not that the
 * reading is missing, but that it is TRUE OF NOTHING — a sentence about a
 * rhythm the foes do not actually have. So most of what follows checks the
 * reading against the curve it describes rather than against itself.
 */
'use strict';

module.exports = {
  name: 'wilds',
  title: 'S9 · the ground turns',
  async run(t) {
    await t.newKnight('Ranger');

    // --- the setting ---
    const set = await t.ev(() => {
      const S = SETTINGS.wilds, out = {};
      out.exists = !!S;
      out.endless = S.rooms;
      out.canDie = S.canDie;
      out.hasNoMaterial = !S.essencePerRoom && !S.orePerRoom && !S.buyIn;
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;
      out.foresight = S.foresight;
      out.notClimbed = !S.up && !S.thinAir;

      // opens one realm later than the Summit
      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.wildsOpen();
      [0, 1, 2, 3].forEach(ri => REALMS[ri].foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      out.sealedAfterFour = !Dungeon.wildsOpen();
      REALMS[4].foes.forEach((f, i) => Game.s.cleared['4:' + i] = 1);
      out.openAfterFive = Dungeon.wildsOpen();
      UI.renderMap();
      out.onMap = /Wilds/.test(document.getElementById('mapList').innerText);
      return out;
    });
    t.ok('the Wilds exists as a setting', set.exists);
    t.eq('it runs until you turn back', set.endless, 0);
    t.ok('and it can kill you', set.canDie === true);
    t.ok('it takes no toll at the door and gives up no material', set.hasNoMaterial);
    t.ok('its danger is the herd rather than the ground under you', set.notClimbed);
    t.ok('it is about its own mathematics', set.topicsResolve,
      String(set.topics && set.topics.length));
    t.eq('and it is built around Tracking', set.foresight, 'tracking');
    t.ok('it is sealed until the fifth realm falls',
      set.sealedAtStart && set.sealedAfterFour && set.openAfterFive);
    t.ok('and it has its own node on the map', set.onMap);

    /* --- the swell ---
       The claim is that danger rises and falls rather than climbing. That is a
       property of a sequence, so it is measured over one, not asserted about a
       formula. */
    const swell = await t.ev(() => {
      const c = WILDS_WAVES, out = {};
      out.period = c.swellEvery;
      out.amplitude = c.swell;

      // it is 1 at every step for a curve that does not have one
      out.deepFlat = [1, 2, 3, 9, 40].every(n => WaveEngine.swell(n, DEEP_WAVES) === 1);
      out.summitFlat = [1, 2, 3, 9, 40].every(n => WaveEngine.swell(n, SUMMIT_WAVES) === 1);

      const vals = [];
      for (let n = 1; n <= 40; n++) vals.push(WaveEngine.swell(n, c));
      out.min = Math.min(...vals);
      out.max = Math.max(...vals);
      // it comes back to where it started, every period
      out.repeats = vals.every((v, i) =>
        i + c.swellEvery >= vals.length || Math.abs(v - vals[i + c.swellEvery]) < 1e-9);
      // and it genuinely goes down as well as up
      out.fallsSomewhere = vals.some((v, i) => i > 0 && v < vals[i - 1]);
      out.risesSomewhere = vals.some((v, i) => i > 0 && v > vals[i - 1]);

      /* The property that makes the setting what it is: a foe deeper in is
         sometimes WEAKER than one shallower, which is true nowhere else. Read
         off real foes rather than off the multiplier, because that is what a
         player meets. */
      /* Champions are excluded from every sequence below. They multiply health
         and reward on their own clock, so a run that includes them is not
         monotonic in ANY setting and the comparison would say nothing about the
         swell. What is being asked here is what the ordinary foes do. */
      const rank = (curve, field) => {
        const out2 = [];
        for (let n = 1; n <= 40; n++) {
          if (n % curve.championEvery === 0) continue;
          R.seed(7); out2.push(WaveEngine.foe(n, curve)[field]); R.unseed();
        }
        return out2;
      };
      const hp = rank(c, 'hp');
      out.someDeeperIsSofter = hp.some((v, i) => i > 0 && v < hp[i - 1]);
      out.hp = hp;

      // and the Deep, for contrast, only ever gets harder
      const deepHp = rank(DEEP_WAVES, 'hp');
      out.deepOnlyClimbs = deepHp.every((v, i) => i === 0 || v >= deepHp[i - 1]);

      // reward is deliberately flat through the swell: a trough is a safer
      // stretch, not a poorer one
      const gold = rank(c, 'gold');
      out.goldOnlyClimbs = gold.every((v, i) => i === 0 || v >= gold[i - 1]);
      return out;
    });
    t.eq('the herd goes round in nine rooms', swell.period, 9);
    t.ok('a curve without a swell is unaffected at every step',
      swell.deepFlat && swell.summitFlat);
    t.ok('the swell repeats exactly, every period', swell.repeats);
    t.ok('it rises', swell.risesSomewhere);
    t.ok('and it falls', swell.fallsSomewhere);
    t.ok('by a third either way, near enough',
      swell.max > 1.3 && swell.min < 0.7, `${swell.min} … ${swell.max}`);
    t.ok('so a room deeper in is sometimes softer than one behind it',
      swell.someDeeperIsSofter, JSON.stringify(swell.hp));
    t.ok('which is true nowhere else — the Deep only ever climbs',
      swell.deepOnlyClimbs);
    t.ok('and the pay does not swell with the danger: a trough is safer, not poorer',
      swell.goldOnlyClimbs);

    // --- Tracking is an ability, and a different question from the other three ---
    const abil = await t.ev(() => {
      const a = Loadout.byId('tracking'), out = {};
      out.exists = !!a;
      out.where = a.where;
      out.strand = a.strand;
      out.skill = a.skill;
      out.inTable = Dungeon.FORESIGHT.some(f => f.id === 'tracking');
      out.foresightCount = Dungeon.FORESIGHT.length;
      out.everyForesightIsReal = Dungeon.FORESIGHT.every(f => !!Loadout.byId(f.id));
      out.everyForkAbilityIsListed = SKILL_ABILITIES
        .filter(x => x.where === 'fork')
        .every(x => Dungeon.FORESIGHT.some(f => f.id === x.id));
      // charges come off mastery like every other ability, and nothing else
      const s = STRANDS.find(x => x[0] === a.strand);
      Game.s.topicStats = {};
      out.cold = Loadout.charges(a);
      s[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      out.warm = Loadout.charges(a);
      return out;
    });
    t.ok('Tracking is an ability', abil.exists);
    t.eq('spent at the fork, where the decision is', abil.where, 'fork');
    t.eq('drawn from the mathematics of what actually varies', abil.strand, 'Eigen & Subspaces');
    t.eq('and it is its own skill', abil.skill, 'Tracking');
    t.ok('it is in the fork\'s foresight table', abil.inTable);
    t.eq('which now holds four of the five', abil.foresightCount, 4);
    t.ok('every entry in which is a real ability', abil.everyForesightIsReal);
    t.ok('and every fork ability is in it — none is left with nowhere to be pressed',
      abil.everyForkAbilityIsListed);
    t.eq('a knight who knows none of the strand carries none', abil.cold, 0);
    t.ok('and one who knows it carries some', abil.warm > 0, String(abil.warm));

    /* --- the reading is true of the ground it describes ---
       The failure that matters is not a missing sentence, it is a sentence
       about a rhythm the foes do not have. So every reading is checked against
       the foes that actually stand in the rooms it is talking about. */
    const truth = await t.ev(() => {
      const out = { trials: 0, wrong: [] };
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1 };
      Game.s.loadout = ['tracking'];
      const c = SETTINGS.wilds.waves;

      Dungeon.descend('wilds');
      for (let d = 1; d <= 27; d++) {
        Dungeon.run.depth = d;
        Dungeon.tracked = { from: d, through: d + c.swellEvery };
        const line = Dungeon.trackingLine();
        out.trials++;

        const next = d + 1;
        const here = WaveEngine.swell(next, c);
        const after = WaveEngine.swell(next + 1, c);
        const before = WaveEngine.swell(next - 1, c);

        // it must name the period, and name it right
        if (!new RegExp('<b>' + c.swellEvery + '</b>-room round').test(line))
          out.wrong.push(`period at ${d}: ${line}`);

        /* Four claims it can make, and each has to be true of the swell at the
           room the walker is about to enter. The two ends of the turn are the
           interesting ones: standing on the crest is not the same advice as
           walking towards it, and a reading that conflated them would tell a
           wounded knight to press on at exactly the wrong moment. */
        const atCrest = /very next room is the crest/.test(line);
        const atLow = /very next room is the low/.test(line);
        const worsening = /worsens to a crest/.test(line);
        const easing = /eases to the low/.test(line);
        const claims = [atCrest, atLow, worsening, easing].filter(Boolean).length;
        if (claims !== 1) { out.wrong.push(`${claims} claims at ${d}: ${line}`); continue; }

        if (atCrest && !(here >= before && here >= after))
          out.wrong.push(`not a crest at ${d}: ${before} ${here} ${after}`);
        if (atLow && !(here <= before && here <= after))
          out.wrong.push(`not a low at ${d}: ${before} ${here} ${after}`);
        if (worsening && !(after > here)) out.wrong.push(`not worsening at ${d}: ${line}`);
        if (easing && !(after < here)) out.wrong.push(`not easing at ${d}: ${line}`);

        // and where it says the turn ends has to be where the turn ends
        if (worsening || easing) {
          const m = /(?:worsens to a crest|eases to the low) <b>(\d+)<\/b> rooms? on/.exec(line);
          if (!m) { out.wrong.push(`no distance at ${d}: ${line}`); continue; }
          const away = Number(m[1]);
          const mark = next + away;
          const atMark = WaveEngine.swell(mark, c);
          const isCrest = atMark >= WaveEngine.swell(mark - 1, c) && atMark >= WaveEngine.swell(mark + 1, c);
          const isLow = atMark <= WaveEngine.swell(mark - 1, c) && atMark <= WaveEngine.swell(mark + 1, c);
          if (worsening && !isCrest) out.wrong.push(`crest at ${d} lands on ${mark}: ${line}`);
          if (easing && !isLow) out.wrong.push(`low at ${d} lands on ${mark}: ${line}`);
          if (away >= c.swellEvery) out.wrong.push(`distance ${away} is more than a whole turn`);
        }
      }
      return out;
    });
    t.eq('every reading is true of the ground it describes', truth.wrong, []);
    t.ok('over more than two full turns of it', truth.trials >= 27, String(truth.trials));

    // --- and it is rationed, and lasts a stretch rather than a room ---
    const spend = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1 };
      Game.s.loadout = ['tracking'];
      Game.s.runes = {};
      const s = STRANDS.find(x => x[0] === 'Eigen & Subspaces');
      s[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });

      Dungeon.descend('wilds');
      out.armed = Dungeon.forkCharges('tracking');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 4 } });
      const at = Dungeon.run.depth;
      Dungeon.takeTracking();
      out.afterOne = Dungeon.forkCharges('tracking');
      out.reads = !!Dungeon.trackedHere();
      Dungeon.takeTracking();
      out.noDouble = Dungeon.forkCharges('tracking') === out.afterOne;

      // it survives walking into the next room, unlike Farsight
      Dungeon.nextRoom();
      out.stillReadsNextRoom = Dungeon.trackedHere();
      // and runs out after one whole turn of the swell
      Dungeon.run.depth = at + SETTINGS.wilds.waves.swellEvery;
      out.spentAfterATurn = !Dungeon.trackedHere();
      Dungeon.run.depth = at + SETTINGS.wilds.waves.swellEvery - 1;
      out.holdsJustBefore = Dungeon.trackedHere();

      // a fresh walk re-arms it
      Dungeon.descend('wilds');
      out.freshRun = Dungeon.forkCharges('tracking');
      out.freshReads = !Dungeon.trackedHere();
      return out;
    });
    t.ok('a knight solid in the strand walks out with charges',
      spend.armed > 0, String(spend.armed));
    t.eq('reading the ground costs exactly one', spend.afterOne, spend.armed - 1);
    t.ok('and gives a reading', spend.reads);
    t.ok('reading it twice from the same spot costs nothing more', spend.noDouble);
    t.ok('it survives walking into the next room — it was about a stretch',
      spend.stillReadsNextRoom);
    t.ok('and holds right up to the end of the turn', spend.holdsJustBefore);
    t.ok('after which the ground has to be read again', spend.spentAfterATurn);
    t.eq('a new walk re-arms it', spend.freshRun, spend.armed);
    t.ok('with nothing carried over from the last one', spend.freshReads);

    /* --- and it says nothing where there is nothing to say ---
       An ability that sells a charge for "this does not apply here" is a trap.
       In a setting that only climbs the fork says so and keeps the charge. */
    const quiet = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1 };
      Game.s.loadout = ['tracking'];
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      const before = Dungeon.forkCharges('tracking');
      Dungeon.takeTracking();
      out.keptTheCharge = Dungeon.forkCharges('tracking') === before;
      out.noReading = !Dungeon.trackedHere();
      const txt = document.getElementById('resultBody').innerText;
      out.saysSo = /Nothing here circles/.test(txt);
      out.noButton = !/Read the ground/.test(txt);

      // and in the Wilds the offer is there
      Dungeon.descend('wilds');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      const wild = document.getElementById('resultBody').innerText;
      out.offeredInTheWilds = /Read the ground/.test(wild);
      out.notMutedThere = !/Nothing here circles/.test(wild);
      return out;
    });
    t.ok('in a place that only climbs the fork says the ground does not turn',
      quiet.saysSo);
    t.ok('and does not offer a reading of it', quiet.noButton);
    t.ok('pressing it there costs nothing', quiet.keptTheCharge);
    t.ok('and buys nothing', quiet.noReading);
    t.ok('out in the Wilds it is offered', quiet.offeredInTheWilds);
    t.ok('and not muted', quiet.notMutedThere);

    // --- the four readings coexist, and none of them is another one ---
    const four = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1 };
      Game.s.runes = {};
      Game.s.loadout = ['tracking', 'farsight', 'rumours'];
      STRANDS.forEach(s => s[1].forEach(k =>
        Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() }));
      Dungeon.descend('wilds');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 30, xp: 6 } });
      Dungeon.scry();
      Dungeon.hearRumours();
      Dungeon.takeTracking();
      const html = document.getElementById('resultBody').innerHTML;
      out.allThree = ['🔭', '🗣️', '🐾'].every(ic => html.indexOf(ic) >= 0);
      // each says a different kind of thing
      out.tracking = Dungeon.trackingLine();
      out.rumour = Dungeon.heard.line;
      out.differentText = out.tracking !== out.rumour;
      // tracking is silent about contents, which is what the other three sell
      out.silentOnContents = !/fight|chest|seam|ward-stone|champion|health/.test(out.tracking);
      return out;
    });
    t.ok('all three carried readings show at once', four.allThree);
    t.ok('and say different things', four.differentText);
    t.ok('Tracking names the rhythm and nothing about what is in it',
      four.silentOnContents, four.tracking);

    // --- the codec carries a sixth setting without a format bump ---
    const codec = await t.ev(() => {
      const out = {};
      out.ordersMatch = JSON.stringify(SETTING_ORDER) === JSON.stringify(Object.keys(SETTINGS));
      out.wildsLast = SETTING_ORDER[SETTING_ORDER.length - 1] === 'wilds';
      out.ver = Codec.VER;
      Game.s.bests = { deep: 9, summit: 21, wilds: 17 };
      const code = Codec.encode(Profiles.active(), Game.s, Date.now());
      const back = Codec.decode(code);
      out.ok = back.ok;
      out.bests = back.ok ? back.g.bests : null;
      return out;
    });
    t.ok('SETTING_ORDER still matches SETTINGS', codec.ordersMatch);
    t.ok('with the Wilds appended rather than inserted', codec.wildsLast);
    t.eq('and the format is where the last deliberate bump left it', codec.ver, 5);
    t.ok('a knight code carries the walk', codec.ok);
    t.eq('exactly', codec.bests, { deep: 9, summit: 21, wilds: 17 });

    // --- a walk, actually walked ---
    const walk = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1 };
      Game.s.bests = {};
      Dungeon.descend('wilds');
      for (let i = 0; i < 4; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 25, xp: 5 } });
        if (i < 3) Dungeon.nextRoom();
      }
      out.carried = Dungeon.run.unbanked.gold;
      Dungeon.leave();
      out.banked = Game.s.bests.wilds;
      out.gold = Game.s.gold;

      /* And a fall out here costs the haul, like everywhere that can kill you —
         with the one exception the game already has. Dead reckoning is a
         Passage skill, so it is true of a knight in EVERY setting, and the
         Wilds is a new place for that claim to be wrong in. Both halves are
         checked: cold, a fall takes everything; solid, it takes half. */
      const fall = (mastery) => {
        const st = STRANDS.find(x => x[0] === 'Integrals');
        st[1].forEach(k => Game.s.topicStats[k] =
          { c: 20, w: 2, m: mastery, seen: 12, last: 0, t: Date.now() });
        Dungeon.descend('wilds');
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 300, xp: 5 } });
        const before = Game.s.gold;
        Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
        return { kept: Game.s.gold - before, salvage: Passage.salvage() };
      };
      // Read after the strand is set, not before — salvage is a live number.
      const cold = fall(0), solid = fall(0.95);
      out.keptWhenCold = cold.kept;   out.salvageCold = cold.salvage;
      out.keptWhenSolid = solid.kept; out.salvageSolid = solid.salvage;
      return out;
    });
    t.ok('a walk carries its haul unbanked', walk.carried > 0, String(walk.carried));
    t.ok('turning back records how far you got', walk.banked > 0, String(walk.banked));
    t.ok('and banks the gold', walk.gold > 0, String(walk.gold));
    t.eq('a knight without Dead reckoning loses the whole haul to a fall',
      walk.keptWhenCold, 0);
    t.eq('and carries nothing out by definition', walk.salvageCold, 0);
    t.eq('one who has it carries half of it out, out here as anywhere else',
      walk.keptWhenSolid, Math.round(300 * walk.salvageSolid));
    t.ok('which is more than nothing', walk.keptWhenSolid > 0,
      String(walk.keptWhenSolid));
  }
};
