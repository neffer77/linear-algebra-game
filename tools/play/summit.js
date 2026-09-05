/* S7 — the Summit, and Sighting.
 *
 * The fifth setting, and the first that is climbed rather than descended. Every
 * other place in the game gets harder because the foes do; this one gets harder
 * because you get smaller. Each room above the first takes a slice off the
 * health a knight can hold, so what ends a climb is your own diminishing
 * capacity rather than something you cannot out-damage.
 *
 * That makes the thin air the thing to test hardest. It is a multiplier read
 * live off the run's height rather than a number written into the save, which
 * is what keeps it from leaking into the rest of the game — and the failure
 * mode if it does leak is a knight permanently reduced by a mountain they left
 * an hour ago.
 *
 * Sighting is the third Foresight ability, and the same risk applies as when
 * Rumours was added: it has to answer a question the other two do not.
 */
'use strict';

module.exports = {
  name: 'summit',
  title: 'S7 · the air is what stops you',
  async run(t) {
    await t.newKnight('Climber');

    // --- the setting ---
    const set = await t.ev(() => {
      const S = SETTINGS.summit, out = {};
      out.exists = !!S;
      out.endless = S.rooms;
      out.canDie = S.canDie;
      out.climbed = !!S.up;
      out.thinAir = S.thinAir;
      out.floor = S.airFloor;
      out.hasNoMaterial = !S.essencePerRoom && !S.orePerRoom && !S.buyIn;
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;

      // gentler than the Deep at the same height: the air does the work
      R.seed(1); const up = WaveEngine.foe(4, SUMMIT_WAVES); R.unseed();
      R.seed(1); const deep = WaveEngine.foe(4, DEEP_WAVES); R.unseed();
      out.gentlerThanDeep = up.hp < deep.hp && up.atk < deep.atk;

      // opens one realm later than the Tavern
      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.summitOpen();
      [0, 1, 2].forEach(ri => REALMS[ri].foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      out.sealedAfterThree = !Dungeon.summitOpen();
      REALMS[3].foes.forEach((f, i) => Game.s.cleared['3:' + i] = 1);
      out.openAfterFour = Dungeon.summitOpen();
      UI.renderMap();
      out.onMap = /Summit/.test(document.getElementById('mapList').innerText);
      return out;
    });
    t.ok('the Summit exists as a setting', set.exists);
    t.eq('it runs until you turn back', set.endless, 0);
    t.ok('and it can kill you', set.canDie === true);
    t.ok('it is climbed rather than descended', set.climbed);
    t.ok('it yields no material and charges nothing at the door', set.hasNoMaterial);
    t.ok('it is about its own mathematics', set.topicsResolve,
      String(set.topics && set.topics.length));
    t.ok('its foes are gentler than the Deep at the same height', set.gentlerThanDeep);
    t.ok('it is sealed until the fourth realm falls',
      set.sealedAtStart && set.sealedAfterThree && set.openAfterFour);
    t.ok('and it has its own node on the map', set.onMap);

    // --- the thin air ---
    const air = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Game.s.lvl = 10;

      // outside the Summit it does nothing at all
      out.idle = Dungeon.thinAir();
      Dungeon.descend('deep');
      out.inTheDeep = Dungeon.thinAir();
      const deepMax = Game.s.maxHp;
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();
      out.deepUnchanged = Game.s.maxHp === deepMax;

      // on the Summit it falls with every room, from the first being free
      Dungeon.descend('summit');
      out.atOne = Dungeon.thinAir();
      const ladder = [Game.s.maxHp];
      for (let i = 0; i < 5; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
        Dungeon.nextRoom();
        ladder.push(Game.s.maxHp);
      }
      out.ladder = ladder;
      out.falls = ladder.every((v, i) => i === 0 || v < ladder[i - 1]);

      // and it stops falling at the floor rather than reaching nothing
      Dungeon.run.depth = 400;
      out.deepAir = Dungeon.thinAir();
      out.atFloor = Math.abs(Dungeon.thinAir() - SETTINGS.summit.airFloor) < 1e-9;
      Game.s.maxHp = Game.maxHp();
      out.floorHp = Game.s.maxHp;
      return out;
    });
    t.eq('outside a run the air is ordinary', air.idle, 1);
    t.eq('and in the Deep it is ordinary too', air.inTheDeep, 1);
    t.ok('a descent in the Deep never changes what a knight can hold', air.deepUnchanged);
    t.eq('the first room of a climb is free', air.atOne, 1);
    t.ok('and every room after it takes a slice',
      air.falls, JSON.stringify(air.ladder));
    t.ok('the air stops thinning at a floor', air.atFloor, String(air.deepAir));
    t.ok('so a knight always has something left to spend', air.floorHp > 20,
      String(air.floorHp));

    /* The leak that would matter most: a knight reduced by a mountain they have
       already left. The multiplier is read live rather than stored, so walking
       out has to put the number back on its own. */
    const leak = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Game.s.lvl = 10;
      Game.s.bests = {};
      const whole = (() => { Dungeon.active = false; return Game.maxHp(); })();

      Dungeon.descend('summit');
      for (let i = 0; i < 6; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 4 } });
        Dungeon.nextRoom();
      }
      out.thinNow = Game.s.maxHp;
      Dungeon.leave();
      out.afterTurningBack = Game.maxHp();
      out.savedAfter = Game.s.maxHp;
      out.whole = whole;

      // and a fall puts it back too
      Dungeon.descend('summit');
      for (let i = 0; i < 6; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 4 } });
        Dungeon.nextRoom();
      }
      Dungeon.died({ status: 'failed' });
      out.afterFalling = Game.maxHp();
      out.hpWithin = Game.s.hp <= Game.maxHp();
      return out;
    });
    t.ok('the air is thin while you are up there', leak.thinNow < leak.whole,
      `${leak.thinNow} of ${leak.whole}`);
    t.eq('turning back restores what a knight can hold', leak.afterTurningBack, leak.whole);
    t.eq('and the saved number with it', leak.savedAfter, leak.whole);
    t.eq('a fall restores it too', leak.afterFalling, leak.whole);
    t.ok('and never leaves a knight above their own maximum', leak.hpWithin);

    // --- the climb records its height, which is what Climbing reads ---
    const record = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Game.s.bests = {};
      Dungeon.descend('summit');
      for (let i = 0; i < 4; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 4 } });
        if (i < 3) Dungeon.nextRoom();
      }
      Dungeon.leave();
      out.banked = Game.s.bests.summit;

      // and Climbing reads it, so the Summit is the setting that feeds it
      const s = STRANDS.find(x => x[0] === 'Multivariable & Series');
      s[1].forEach(k => Game.s.topicStats[k] = {
        c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      Game.s.bests = { summit: 12 };
      out.startsAt = Passage.startDepth(SETTINGS.summit);
      return out;
    });
    t.ok('a climb records the height it banked from', record.banked > 0, String(record.banked));
    t.eq('and Climbing reads that record — the Summit is what feeds it', record.startsAt, 10);

    // --- Sighting ---
    const sight = await t.ev(() => {
      const out = {};
      const a = Loadout.byId('sighting');
      out.exists = !!a;
      out.where = a.where;
      out.strand = a.strand;
      out.inTable = Dungeon.FORESIGHT.some(f => f.id === 'sighting');
      out.everyForesightIsReal = Dungeon.FORESIGHT.every(f => !!Loadout.byId(f.id));
      out.foresightCount = Dungeon.FORESIGHT.length;
      out.range = Dungeon.SIGHT_RANGE;

      const s = STRANDS.find(x => x[0] === 'Multivariable & Series');
      Game.s.topicStats = {};
      s[1].forEach(k => Game.s.topicStats[k] = {
        c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      Game.s.loadout = ['sighting'];
      Game.s.runes = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };

      Dungeon.descend('summit');
      out.armed = Dungeon.forkCharges('sighting');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 4 } });
      Dungeon.takeSighting();
      out.afterOne = Dungeon.forkCharges('sighting');
      out.line = Dungeon.sighted && Dungeon.sighted.line;
      Dungeon.takeSighting();
      out.noDouble = Dungeon.forkCharges('sighting') === out.afterOne;
      Dungeon.nextRoom();
      out.spentOnEntering = Dungeon.sighted === null;
      return out;
    });
    t.ok('Sighting is an ability', sight.exists);
    t.eq('spent at the fork', sight.where, 'fork');
    t.eq('drawn from the mathematics of gradients', sight.strand, 'Multivariable & Series');
    t.ok('it is in the fork\'s foresight table', sight.inTable);
    t.ok('every entry in which is a real ability', sight.everyForesightIsReal);
    t.eq('foresight now has three of its five', sight.foresightCount, 3);
    t.eq('it looks ten rooms up', sight.range, 10);
    t.eq('a solid knight carries three', sight.armed, 3);
    t.eq('taking one spends a charge', sight.afterOne, 2);
    t.ok('and produces a reading', !!sight.line, String(sight.line));
    t.ok('a second sighting from the same spot is refused', sight.noDouble);
    t.ok('and a distance measured from here expires when you move',
      sight.spentOnEntering);

    // --- what it says has to be the distance that is actually there ---
    const truth = await t.ev(() => {
      const out = { trials: 0, wrong: [] };
      Game.s.loadout = ['sighting'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      for (let i = 0; i < 12; i++) {
        Dungeon.descend('summit');
        Dungeon.run.seed = 7000 + i * 97;
        Dungeon.run.depth = 2;
        Dungeon.forkLeft = { sighting: 1 };
        Dungeon.sighted = null;
        Dungeon.lastOutcome = { status: 'cleared', quality: 1, topics: [], yield: {} };
        Dungeon.takeSighting();
        const line = Dungeon.sighted.line;
        out.trials++;

        // work out the truth independently, the same way a player would count
        let champ = 0, pays = 0;
        for (let d = 3; d < 3 + Dungeon.SIGHT_RANGE; d++) {
          const r = Dungeon.peek(d);
          if (!r) break;
          const at = d - 2;
          if (!champ && r.name === 'monster' && r.foe && r.foe.boss) champ = at;
          if (!pays && (r.name === 'lock' || r.name === 'seam')) pays = at;
        }
        const said = /<b>(\d+)<\/b> rooms? to the next champion/.exec(line);
        const saidPays = /<b>(\d+)<\/b> rooms? to the next room that pays/.exec(line);
        if (champ && (!said || Number(said[1]) !== champ)) out.wrong.push(`champ ${champ}: ${line}`);
        if (!champ && said) out.wrong.push(`champ claimed at ${said[1]} with none`);
        if (pays && (!saidPays || Number(saidPays[1]) !== pays)) out.wrong.push(`pays ${pays}: ${line}`);
        if (!pays && saidPays) out.wrong.push(`pays claimed with none`);
        // it names distances, never what the room is
        if (/health|striking|<b>[A-Z]/.test(line)) out.wrong.push('said too much');
      }
      return out;
    });
    t.ok('the distances it reports are the distances that are there',
      truth.trials >= 12 && truth.wrong.length === 0,
      `${truth.trials} trials; ${truth.wrong.slice(0, 3).join('; ')}`);

    // --- three abilities, three different answers ---
    const distinct = await t.ev(() => {
      const out = {};
      Game.s.topicStats = {};
      ['Multivariable & Series', 'Applications'].forEach(n => {
        const s = STRANDS.find(x => x[0] === n);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      });
      Game.s.loadout = ['farsight', 'rumours', 'sighting'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('summit');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 30, xp: 6 } });
      Dungeon.scry();
      Dungeon.hearRumours();
      Dungeon.takeSighting();
      const txt = document.getElementById('resultBody').innerText;
      out.allThree = !!(Dungeon.scried && Dungeon.heard && Dungeon.sighted);
      out.lines = [Dungeon.scried.line, Dungeon.heard.line, Dungeon.sighted.line];
      out.allDifferent = new Set(out.lines).size === 3;
      out.allOnScreen = /rooms? to the next/.test(txt) && /rooms hold|room holds/.test(txt);
      return out;
    });
    t.ok('a knight can carry all three at once', distinct.allThree);
    t.ok('and gets three different answers rather than one three times',
      distinct.allDifferent, JSON.stringify(distinct.lines));
    t.ok('with all of them on the fork', distinct.allOnScreen);

    // --- the words match the direction of travel ---
    const words = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Game.s.loadout = [];
      // A plain climb from the bottom: an earlier block in this suite left a
      // Summit record behind, and Climbing would otherwise start this one ten
      // rooms up and make the heading read Height 11.
      Game.s.bests = {};
      Dungeon.descend('summit');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 30, xp: 6 } });
      const up = document.getElementById('resultBody').innerText;
      out.saysHeight = /Height 1 cleared/.test(up);
      out.saysClimb = /Climb higher/.test(up);
      out.saysTurnBack = /Turn back/.test(up);
      out.noDepth = !/Depth/.test(up);

      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 30, xp: 6 } });
      const down = document.getElementById('resultBody').innerText;
      out.deepSaysDepth = /Depth 1 cleared/.test(down) && /Press on/.test(down);
      out.deepUnchanged = !/Climb higher|Turn back/.test(down);

      // and the death screen too, which has no foe to name on a ridge
      Dungeon.descend('summit');
      Dungeon.cur = { kind: RoomKinds.lock, spec: { kind: 'lock' } };
      Dungeon.died({ status: 'failed' });
      const dead = document.getElementById('resultBody').innerText;
      out.deathSaysMountain = /mountain/i.test(dead);
      out.deathNamesTheAir = /thin air/i.test(dead);
      return out;
    });
    t.ok('the fork speaks of height on a climb',
      words.saysHeight && words.saysClimb && words.saysTurnBack && words.noDepth,
      JSON.stringify(words));
    t.ok('and still speaks of depth in the Deep',
      words.deepSaysDepth && words.deepUnchanged);
    t.ok('the death screen knows which way it was going', words.deathSaysMountain);
    t.ok('and names the air when there is no foe to name', words.deathNamesTheAir);

    // --- the codec still round-trips with a fifth setting on the list ---
    const codec = await t.ev(() => {
      const out = {};
      out.ordersMatch = JSON.stringify(SETTING_ORDER) === JSON.stringify(Object.keys(SETTINGS));
      out.summitLast = SETTING_ORDER[SETTING_ORDER.length - 1] === 'summit';
      out.ver = Codec.VER;
      Game.s.bests = { deep: 9, summit: 21 };
      const code = Codec.encode(Profiles.active(), Game.s, Date.now());
      const back = Codec.decode(code);
      out.ok = back.ok;
      out.bests = back.ok ? back.g.bests : null;
      return out;
    });
    t.ok('SETTING_ORDER still matches SETTINGS', codec.ordersMatch);
    t.ok('with the new setting appended rather than inserted', codec.summitLast);
    t.eq('and no format bump was needed — the count is written down', codec.ver, 4);
    t.ok('a knight code carries the climb', codec.ok);
    t.eq('exactly', codec.bests, { deep: 9, summit: 21 });
    /* The Summit declares its own foresight, which tells the balance harness
       not to fail it for Farsight being quiet there. That is a real escape
       hatch, so it is worth pinning what may use it: the Deep's danger IS a
       single foe spiking, so the Deep must keep asserting the Farsight property
       rather than opting out of it. */
    const owns = await t.ev(() => ({
      summit: SETTINGS.summit.foresight,
      deep: SETTINGS.deep.foresight || 'farsight',
      sanctum: SETTINGS.sanctum.foresight || 'farsight',
      declared: Object.keys(SETTINGS).filter(k => SETTINGS[k].foresight)
    }));
    t.eq('the Summit is built around Sighting', owns.summit, 'sighting');
    t.eq('the Deep is still built around Farsight, and still asserts it', owns.deep, 'farsight');
    t.eq('as is the Sanctum', owns.sanctum, 'farsight');
    t.eq('and only the Summit opts out', owns.declared, ['summit']);
  }
};
