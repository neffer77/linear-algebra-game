/* S11a — the Sea: Weather-reading, and Cargo.
 *
 * The seventh setting, and the third kind of pressure. The Deep ramps; the
 * Summit ramps and takes health away; the Wilds circles on a period you can
 * work out. The Sea does none of those. Its foes are ordinary and its danger is
 * the WEATHER — a roll, not a formula. About a third of its leagues run rough
 * and hit half again as hard, and no arithmetic tells you which.
 *
 * That is the point, and it is what makes this the home of the last foresight.
 * Every other reading in the game describes something derivable: a room the
 * seed has already fixed, a total over three of them, a distance, a period. A
 * squall is DRAWN. Weather-reading is the one ability that sells information
 * rather than arithmetic — so the thing to test hardest is that the forecast is
 * true of the water, league by league, and that it cannot drift out of step
 * with it.
 *
 * The weather runs on a stream of its own, mixed from the run seed with a
 * different constant than the room cascade uses, and it is read from inside a
 * build the shell has already seeded. That is a real hazard: a bare unseed in
 * there would drop the room's own stream mid-build. Several checks below exist
 * only to hold that down.
 *
 * Cargo is the Sea's material, and the first that is CONVERTED rather than
 * gathered: unbanked gold turned into freight that compounds every league and
 * goes down whole in a wreck. Gold in the pot is partly salvaged by Dead
 * reckoning; cargo never is. Interest against insurance.
 */
'use strict';

module.exports = {
  name: 'sea',
  title: 'S11a · the weather is drawn, not derived',
  async run(t) {
    await t.newKnight('Mariner');

    // --- the setting ---
    const set = await t.ev(() => {
      const S = SETTINGS.sea, out = {};
      out.exists = !!S;
      out.endless = S.rooms;
      out.canDie = S.canDie;
      out.voice = S.voice;
      out.foresight = S.foresight;
      out.noBuyIn = !S.buyIn;
      out.noThinAir = !S.thinAir;
      out.noSwell = !S.waves.swell;
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;

      // opens one realm later than the Wilds
      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.seaOpen();
      [0, 1, 2, 3, 4].forEach(ri => REALMS[ri].foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      out.sealedAfterFive = !Dungeon.seaOpen();
      REALMS[5].foes.forEach((f, i) => Game.s.cleared['5:' + i] = 1);
      out.openAfterSix = Dungeon.seaOpen();
      UI.renderMap();
      out.onMap = /The Sea/.test(document.getElementById('mapList').innerText);
      return out;
    });
    t.ok('the Sea exists as a setting', set.exists);
    t.eq('it runs until you make shore', set.endless, 0);
    t.ok('and it can drown you', set.canDie === true);
    t.eq('it is sailed, in its own words', set.voice, 'sea');
    t.eq('and built around Weather-reading', set.foresight, 'weather');
    t.ok('nothing is charged at the door', set.noBuyIn);
    t.ok('and its danger is neither the air nor a period',
      set.noThinAir && set.noSwell);
    t.ok('it is about its own mathematics', set.topicsResolve,
      String(set.topics && set.topics.length));
    t.ok('it is sealed until the sixth realm falls',
      set.sealedAtStart && set.sealedAfterFive && set.openAfterSix);
    t.ok('and it has its own node on the map', set.onMap);

    /* --- the weather ---
       Drawn rather than derived, which is a property of a distribution, so it
       is measured over many leagues rather than asserted about a formula. */
    const weather = await t.ev(() => {
      const out = {};
      const c = SEA_WAVES;
      out.chance = c.squallChance;
      out.mul = c.squallMul;

      // nowhere else has weather at all
      out.elsewhere = Object.keys(SETTINGS).filter(k => k !== 'sea' && SETTINGS[k].waves.squallChance);
      out.deepAlwaysCalm = [1, 2, 3, 9, 40].every(d =>
        Dungeon.rough(d, SETTINGS.deep, 4242) === 1);
      out.wildsAlwaysCalm = [1, 2, 3, 9, 40].every(d =>
        Dungeon.rough(d, SETTINGS.wilds, 4242) === 1);

      // roughly a third of leagues, over a lot of them
      let rough = 0, n = 0;
      for (let seed = 1; seed <= 60; seed++)
        for (let d = 1; d <= 40; d++) { n++; if (Dungeon.isRough(d, SETTINGS.sea, seed * 977)) rough++; }
      out.seen = n;
      out.roughShare = rough / n;

      // and it reads the same way twice, however it is reached
      out.stable = true;
      for (let d = 1; d <= 30; d++) {
        const a = Dungeon.rough(d, SETTINGS.sea, 31337);
        const b = Dungeon.rough(d, SETTINGS.sea, 31337);
        if (a !== b) { out.stable = false; break; }
      }
      // different seeds give different weather — it is not a constant dressed up
      const oneSeed = [], other = [];
      for (let d = 1; d <= 30; d++) {
        oneSeed.push(Dungeon.isRough(d, SETTINGS.sea, 11));
        other.push(Dungeon.isRough(d, SETTINGS.sea, 22));
      }
      out.seedsDiffer = JSON.stringify(oneSeed) !== JSON.stringify(other);
      out.bothKinds = oneSeed.some(Boolean) && oneSeed.some(x => !x);

      // a rough league really is harder than the same league calm
      R.seed(5); const calm = WaveEngine.foe(6, c, 1); R.unseed();
      R.seed(5); const blow = WaveEngine.foe(6, c, c.squallMul); R.unseed();
      out.harder = blow.hp > calm.hp && blow.atk > calm.atk;
      out.ratio = blow.atk / calm.atk;
      // and pays no more for it — the weather is danger, not a reward band
      out.samePay = blow.gold === calm.gold && blow.xp === calm.xp;
      return out;
    });
    t.eq('no other setting has weather at all', weather.elsewhere, []);
    t.ok('the Deep is always calm', weather.deepAlwaysCalm);
    t.ok('and so are the Wilds', weather.wildsAlwaysCalm);
    t.ok('about a third of the Sea runs rough',
      Math.abs(weather.roughShare - weather.chance) < 0.03,
      `${weather.roughShare.toFixed(3)} of ${weather.seen} against ${weather.chance}`);
    t.ok('the same league reads the same way twice', weather.stable);
    t.ok('two voyages get different weather', weather.seedsDiffer);
    t.ok('and any one of them gets both kinds', weather.bothKinds);
    t.ok('a rough league is harder in both health and reach', weather.harder);
    t.ok('by about half again', Math.abs(weather.ratio - weather.mul) < 0.06,
      String(weather.ratio));
    t.ok('and pays no more for it — weather is danger, not a reward band',
      weather.samePay);

    /* --- the weather does not disturb the rooms ---
       `rough` is called from inside a build the shell has already seeded. A
       bare R.unseed() in there would drop the room's own stream on the floor,
       and the failure would be a run that does not replay. */
    const stream = await t.ev(() => {
      const out = {};
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Dungeon.descend('sea');

      // the same seed and depth build the same room, foe and all
      const build = () => {
        R.seed(((77771 ^ (5 * 2654435761)) >>> 0) || 1);
        const spec = RoomKinds.monster.build(R, 5, SETTINGS.sea);
        const after = R._r();                 // where the stream stands afterwards
        R.unseed();
        return { nm: spec.foe.nm, hp: spec.foe.hp, rough: spec.rough, after };
      };
      const a = build(), b = build();
      out.sameRoom = JSON.stringify(a) === JSON.stringify(b);
      out.streamIntact = a.after === b.after;
      out.carriesWeather = typeof a.rough === 'boolean';

      /* And the reading agrees with the room, league by league — the whole
         point of putting the weather on its own stream. A second, hand-written
         cascade, so this proves agreement rather than self-consistency. */
      out.checked = 0; out.wrong = [];
      for (let seed = 1; seed <= 25; seed++) {
        Dungeon.run.seed = seed * 6151;
        for (let d = 2; d <= 20; d++) {
          const seen = Dungeon.peek(d);
          R.seed(((Dungeon.run.seed ^ (d * 2654435761)) >>> 0) || 1);
          const kind = Dungeon.roomKindAt(d, SETTINGS.sea);
          const spec = RoomKinds[kind].build(R, d, SETTINGS.sea);
          R.unseed();
          out.checked++;
          if (seen.name !== kind) out.wrong.push(`kind d${d}: ${seen.name} vs ${kind}`);
          else if (kind === 'monster') {
            if (seen.foe.nm !== spec.foe.nm || seen.foe.hp !== spec.foe.hp)
              out.wrong.push(`foe d${d}: ${seen.foe.nm}/${seen.foe.hp} vs ${spec.foe.nm}/${spec.foe.hp}`);
            if (seen.rough !== spec.rough)
              out.wrong.push(`weather d${d}: ${seen.rough} vs ${spec.rough}`);
          }
        }
      }
      return out;
    });
    t.ok('the same seed and league build the same room', stream.sameRoom);
    t.ok('and leave the room\'s own stream exactly where they found it',
      stream.streamIntact);
    t.ok('a built room knows whether it is running rough', stream.carriesWeather);
    t.eq('what foresight reads is what the shell builds, weather and all',
      stream.wrong, []);
    t.ok('over a whole voyage', stream.checked > 400, String(stream.checked));

    // --- Weather-reading, the fifth and last foresight ---
    const abil = await t.ev(() => {
      const a = Loadout.byId('weather'), out = {};
      out.exists = !!a;
      out.where = a.where;
      out.skill = a.skill;
      out.inTable = Dungeon.FORESIGHT.some(f => f.id === 'weather');
      out.count = Dungeon.FORESIGHT.length;
      out.allReal = Dungeon.FORESIGHT.every(f => !!Loadout.byId(f.id));
      out.everyForkAbilityIsListed = SKILL_ABILITIES
        .filter(x => x.where === 'fork')
        .every(x => Dungeon.FORESIGHT.some(f => f.id === x.id));
      // every setting that declares a foresight names one that now exists
      out.declaredAreReal = Object.keys(SETTINGS)
        .filter(k => SETTINGS[k].foresight)
        .every(k => Dungeon.FORESIGHT.some(f => f.id === SETTINGS[k].foresight));
      const s = STRANDS.find(x => x[0] === a.strand);
      Game.s.topicStats = {};
      out.cold = Loadout.charges(a);
      s[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      out.warm = Loadout.charges(a);
      return out;
    });
    t.ok('Weather-reading is an ability', abil.exists);
    t.eq('spent at the fork', abil.where, 'fork');
    t.eq('and it is its own skill', abil.skill, 'Weather-reading');
    t.ok('it is in the fork\'s foresight table', abil.inTable);
    t.eq('which is now the whole five of five', abil.count, 5);
    t.ok('every entry in which is a real ability', abil.allReal);
    t.ok('and every fork ability is in it', abil.everyForkAbilityIsListed);
    t.ok('every setting that names a foresight names a real one', abil.declaredAreReal);
    t.eq('a knight who knows none of the strand carries none', abil.cold, 0);
    t.ok('and one who knows it carries some', abil.warm > 0, String(abil.warm));

    /* --- the forecast is true of the water ---
       The way this claim fails is not a missing sentence but a plausible one:
       a forecast that names leagues rough that are not. So every reading is
       checked against the weather of the leagues it is talking about. */
    const truth = await t.ev(() => {
      const out = { trials: 0, wrong: [] };
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Game.s.loadout = ['weather'];
      Dungeon.descend('sea');
      for (let seed = 1; seed <= 12; seed++) {
        Dungeon.run.seed = seed * 8171;
        for (let at = 1; at <= 6; at++) {
          Dungeon.run.depth = at;
          Dungeon.forecast = { from: at, through: at + Dungeon.FORECAST_SPAN };
          const line = Dungeon.forecastLine();
          out.trials++;

          // the marks, in order, against the weather they describe
          const marks = (line.match(/(rough|calm)/g) || [])
            .filter((w, i, arr) => true);
          const said = [];
          // pull the ordered run of marks out of the list, which sits before
          // any prose that mentions "rough" again
          const listed = /leagues: ([^.]+)\./.exec(line);
          if (!listed) { out.wrong.push(`no list at ${at}: ${line}`); continue; }
          listed[1].split('·').forEach(p => said.push(/rough/.test(p)));

          const real = [];
          for (let i = 0; i < Dungeon.FORECAST_SPAN; i++)
            real.push(Dungeon.isRough(at + 1 + i, SETTINGS.sea));
          if (JSON.stringify(said) !== JSON.stringify(real))
            out.wrong.push(`marks at ${at}: ${JSON.stringify(said)} vs ${JSON.stringify(real)}`);

          const roughCount = real.filter(Boolean).length;
          const claimed = /<b>(\d+)<\/b> of them are weather/.exec(line);
          if (roughCount && (!claimed || Number(claimed[1]) !== roughCount))
            out.wrong.push(`count at ${at}: ${line}`);
          if (!roughCount && !/Clear water the whole way/.test(line))
            out.wrong.push(`calm not called at ${at}: ${line}`);

          // and where it says the first blow is, is where the first blow is
          if (roughCount) {
            const firstReal = real.indexOf(true) + 1;
            if (firstReal === 1) {
              if (!/starts with the very next one/.test(line))
                out.wrong.push(`first at ${at}: ${line}`);
            } else {
              const m = /The first is <b>(\d+)<\/b> leagues on/.exec(line);
              if (!m || Number(m[1]) !== firstReal)
                out.wrong.push(`first at ${at}: said ${m && m[1]} vs ${firstReal}`);
            }
          }
        }
      }
      return out;
    });
    t.eq('every forecast is true of the water it describes', truth.wrong, []);
    t.ok('over a useful number of them', truth.trials >= 60, String(truth.trials));

    // --- it is rationed, covers a stretch, and is silent where nothing is drawn ---
    const spend = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Game.s.loadout = ['weather'];
      Game.s.runes = {};
      const s = STRANDS.find(x => x[0] === 'Applications');
      s[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });

      Dungeon.descend('sea');
      out.armed = Dungeon.forkCharges('weather');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 30, xp: 6 } });
      const at = Dungeon.run.depth;
      Dungeon.readWeather();
      out.afterOne = Dungeon.forkCharges('weather');
      out.reads = Dungeon.forecastHere();
      Dungeon.readWeather();
      out.noDouble = Dungeon.forkCharges('weather') === out.afterOne;

      Dungeon.nextRoom();
      out.survivesALeague = Dungeon.forecastHere();
      Dungeon.run.depth = at + Dungeon.FORECAST_SPAN;
      out.spentAfterTheSpan = !Dungeon.forecastHere();
      Dungeon.run.depth = at + Dungeon.FORECAST_SPAN - 1;
      out.holdsJustBefore = Dungeon.forecastHere();

      // and in a place with no weather it says so and keeps the charge
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      const before = Dungeon.forkCharges('weather');
      Dungeon.readWeather();
      out.keptTheCharge = Dungeon.forkCharges('weather') === before;
      out.noReading = !Dungeon.forecastHere();
      const txt = document.getElementById('resultBody').innerText;
      out.saysSo = /nothing to say — nothing is drawn/.test(txt);
      out.noButton = !/Read the sky/.test(txt);

      Dungeon.descend('sea');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      out.offeredAtSea = /Read the sky/.test(document.getElementById('resultBody').innerText);
      return out;
    });
    t.ok('a knight solid in the strand puts out with charges',
      spend.armed > 0, String(spend.armed));
    t.eq('a forecast costs exactly one', spend.afterOne, spend.armed - 1);
    t.ok('and gives a reading', spend.reads);
    t.ok('reading the sky twice from the same spot costs nothing more', spend.noDouble);
    t.ok('it survives sailing a league — it was about a stretch', spend.survivesALeague);
    t.ok('and holds to the end of the stretch', spend.holdsJustBefore);
    t.ok('after which the sky has to be read again', spend.spentAfterTheSpan);
    t.ok('where nothing is drawn the fork says so', spend.saysSo);
    t.ok('and offers no reading of it', spend.noButton);
    t.ok('pressing it there costs nothing', spend.keptTheCharge);
    t.ok('and buys nothing', spend.noReading);
    t.ok('at sea it is offered', spend.offeredAtSea);

    // --- the hold: Cargo's room ---
    const hold = await t.ev(() => {
      const out = { counts: {} };
      out.kindExists = !!RoomKinds.hold;
      out.introduced = !!ROOM_INTRO.hold;
      out.elsewhere = Object.keys(SETTINGS).filter(k => k !== 'sea' && SETTINGS[k].holdChance);
      out.inNoPlan = Object.keys(SETTINGS).filter(k => (SETTINGS[k].plan || []).indexOf('hold') >= 0);

      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      for (const key of ['sea', 'deep', 'wilds']) {
        Dungeon.descend(key);
        let n = 0, atOne = 0;
        for (let seed = 1; seed <= 40; seed++) {
          Dungeon.run.seed = seed * 3313;
          for (let d = 1; d <= 25; d++) {
            const r = Dungeon.peek(d);
            if (r.name === 'hold') { n++; if (d === 1) atOne++; }
          }
        }
        out.counts[key] = n;
        out['atOne_' + key] = atOne;
      }
      return out;
    });
    t.ok('the hold is a room kind like any other', hold.kindExists);
    t.ok('and introduces itself the first time', hold.introduced);
    t.ok('holds are found at sea', hold.counts.sea > 40, String(hold.counts.sea));
    t.eq('and nowhere else — the Deep has none', hold.counts.deep, 0);
    t.eq('nor the Wilds', hold.counts.wilds, 0);
    t.eq('no other setting declares a chance of one', hold.elsewhere, []);
    t.eq('and none lays one out by hand', hold.inNoPlan, []);
    t.eq('never on the first league', hold.atOne_sea, 0);

    /* --- the hold's arithmetic ---
       Interest against insurance. Both numbers are on the buttons, so both have
       to be right, and the break-even it quotes has to be the one the growth
       and the salvage actually produce. */
    const sums = await t.ev(() => {
      const out = {};
      out.growth = Hold.GROWTH;
      out.shares = Hold.SHARES.map(s => s.frac);
      // compounding, checked against the definition rather than a table
      out.grown0 = Hold.grown(100, 0);
      out.grown1 = Hold.grown(100, 1);
      out.grown5 = Hold.grown(100, 5);
      out.grownMatches = Hold.grown(250, 7) === Math.round(250 * Math.pow(1 + Hold.GROWTH, 7));

      /* The break-even it quotes: how many leagues of growth it takes to cover
         the salvage given up. Checked by finding the smallest n for which
         (1+g)^n actually clears 1/(1-save), at three different salvage tiers. */
      const st = STRANDS.find(x => x[0] === 'Integrals');
      const setMastery = m => st[1].forEach(k => Game.s.topicStats[k] =
        { c: 20, w: 2, m, seen: 12, last: 0, t: Date.now() });
      out.tiers = [];
      for (const m of [0, 0.7, 0.95]) {
        setMastery(m);
        const save = Passage.salvage();
        const said = Hold.breakEven();
        let want = 0;
        if (save > 0) { while (Math.pow(1 + Hold.GROWTH, want) < 1 / (1 - save)) want++; }
        out.tiers.push({ save, said, want, ok: said === want });
      }
      setMastery(0);
      return out;
    });
    t.eq('freight grows twelve per cent a league', sums.growth, 0.12);
    t.eq('three shares of the pot on offer', sums.shares.length, 3);
    t.eq('nothing stowed for no leagues is what it was', sums.grown0, 100);
    t.eq('one league compounds once', sums.grown1, 112);
    t.eq('and five compound five times', sums.grown5, 176);
    t.ok('the growth it quotes is the growth it applies', sums.grownMatches);
    t.ok('and the break-even it prints is the one the numbers give, at every salvage tier',
      sums.tiers.every(x => x.ok), JSON.stringify(sums.tiers));
    t.ok('with nothing to salvage there is nothing to wait for',
      sums.tiers[0].said === 0, JSON.stringify(sums.tiers[0]));

    // --- stowing moves gold across, and the shell is what moves it ---
    const stow = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Dungeon.descend('sea');
      Dungeon.run.unbanked.gold = 300;
      Dungeon.run.cargo = 0;

      const play = (frac) => {
        let got = null, calls = 0;
        Hold.begin({ kind: 'hold', depth: 4 }, { depth: 4, run: Dungeon.run },
          o => { calls++; got = o; });
        if (frac === null) Hold.walkAway(); else Hold.stow(frac);
        const go = document.getElementById('holdGo');
        if (go) go.click();
        return { stowed: got && got.hold.stowed, status: got && got.status, calls };
      };

      const half = play(0.5);
      out.reported = half.stowed;
      out.status = half.status;
      out.calls = half.calls;
      out.potBefore = Dungeon.run.unbanked.gold;   // the room does NOT move it
      out.cargoBefore = Dungeon.run.cargo;

      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {}, hold: { stowed: half.stowed } });
      out.potAfter = Dungeon.run.unbanked.gold;
      out.cargoAfter = Dungeon.run.cargo;

      // walking past costs nothing and still reports once
      Dungeon.run.unbanked.gold = 300; Dungeon.run.cargo = 0;
      const past = play(null);
      out.walkedPast = past.stowed;
      out.walkCalls = past.calls;

      // and the shell never lets the hold take more than is in the pot
      Dungeon.run.unbanked.gold = 40; Dungeon.run.cargo = 0;
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {}, hold: { stowed: 5000 } });
      out.clampedPot = Dungeon.run.unbanked.gold;
      out.clampedCargo = Dungeon.run.cargo;
      return out;
    });
    t.eq('half of three hundred is a hundred and fifty', stow.reported, 150);
    t.eq('a hold can never end a voyage', stow.status, 'cleared');
    t.eq('and reports exactly once', stow.calls, 1);
    t.ok('the room itself moves nothing — the shell does',
      stow.potBefore === 300 && stow.cargoBefore === 0,
      `${stow.potBefore} / ${stow.cargoBefore}`);
    t.eq('the shell takes it out of the pot', stow.potAfter, 150);
    t.eq('and puts it in the hold', stow.cargoAfter, 150);
    t.eq('sailing past stows nothing', stow.walkedPast, 0);
    t.eq('and still reports once', stow.walkCalls, 1);
    t.eq('a hold can never take more than the pot holds', stow.clampedPot, 0);
    t.eq('however much it asks for', stow.clampedCargo, 40);

    // --- freight compounds, banks, and drowns ---
    const voyage = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Game.s.bests = {};
      const clearIntegrals = () => {
        const st = STRANDS.find(x => x[0] === 'Integrals');
        st[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0, seen: 12, last: 0, t: Date.now() });
      };

      // it grows one league at a time
      Dungeon.descend('sea');
      Dungeon.run.cargo = 100;
      const ladder = [Math.round(Dungeon.run.cargo)];
      for (let i = 0; i < 4; i++) {
        Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
        Dungeon.nextRoom();
        ladder.push(Math.round(Dungeon.run.cargo));
      }
      out.ladder = ladder;
      out.compounds = ladder.every((v, i) =>
        i === 0 || v === Math.round(ladder[i - 1] * (1 + Hold.GROWTH)));

      /* It rides on the checkpoint, so a reload does not sink it — and, the
         harder half, does not FEED it either. Growth is counted per league
         cleared, and a resume re-enters a league already cleared, so quitting
         and coming back must be worth exactly nothing. Done three times over,
         because the exploit would compound. */
      out.inCheckpoint = Game.s.run.cargo;
      for (let i = 0; i < 3; i++) { Dungeon.active = false; Dungeon.resume(); }
      out.afterResume = Math.round(Dungeon.run.cargo);

      // and it is sold the moment it reaches shore
      Game.s.gold = 0;
      Dungeon.run.unbanked.gold = 60;
      const freight = Math.floor(Dungeon.run.cargo);
      Dungeon.leave();
      out.banked = Game.s.gold;
      out.expected = 60 + freight;

      // a wreck takes it whole, and Dead reckoning does not save a gram of it
      clearIntegrals();
      Dungeon.descend('sea');
      Dungeon.run.unbanked.gold = 200;
      Dungeon.run.cargo = 500;
      Game.s.gold = 0;
      Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
      out.coldWreck = Game.s.gold;

      const st = STRANDS.find(x => x[0] === 'Integrals');
      st[1].forEach(k => Game.s.topicStats[k] = { c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      Dungeon.descend('sea');
      Dungeon.run.unbanked.gold = 200;
      Dungeon.run.cargo = 500;
      Game.s.gold = 0;
      out.salvage = Passage.salvage();
      Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
      out.savedWreck = Game.s.gold;
      out.expectedSaved = Math.floor(200 * out.salvage);

      // a fresh voyage starts with an empty hold
      Dungeon.descend('sea');
      out.freshCargo = Dungeon.run.cargo;
      return out;
    });
    t.ok('freight compounds a league at a time', voyage.compounds,
      JSON.stringify(voyage.ladder));
    t.ok('and really grows', voyage.ladder[4] > voyage.ladder[0],
      JSON.stringify(voyage.ladder));
    t.ok('it rides on the checkpoint', voyage.inCheckpoint > 0, String(voyage.inCheckpoint));
    t.eq('so a reload neither sinks it nor feeds it',
      voyage.afterResume, voyage.inCheckpoint);
    t.eq('making shore sells it at what it grew to', voyage.banked, voyage.expected);
    t.eq('a wreck with no Dead reckoning leaves nothing at all', voyage.coldWreck, 0);
    t.ok('and with Dead reckoning it saves the pot', voyage.savedWreck > 0,
      String(voyage.savedWreck));
    t.eq('but not one coin of the cargo', voyage.savedWreck, voyage.expectedSaved);
    t.eq('a fresh voyage starts with an empty hold', voyage.freshCargo, 0);

    // --- the Sea speaks like the sea ---
    const words = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Game.s.loadout = [];
      out.voices = Object.keys(VOICES);
      out.everyVoiceComplete = Object.values(VOICES).every(v =>
        v.unit && v.ic && v.passage && v.on && v.out && v.left && v.killer &&
        v.keeps && v.ends && v.reached && v.again && v.risk);
      out.distinct = new Set(Object.values(VOICES).map(v => v.passage)).size ===
                     Object.keys(VOICES).length;
      out.everySettingsVoiceReal = Object.keys(SETTINGS)
        .every(k => !SETTINGS[k].voice || !!VOICES[SETTINGS[k].voice]);

      Dungeon.descend('sea');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 40, xp: 8 } });
      const fork = document.getElementById('resultBody').innerText;
      out.leagues = new RegExp('League ' + Dungeon.run.depth + ' cleared').test(fork);
      out.openWater = /Open water, and no bottom under you/.test(fork);
      out.sailsOn = /Sail on/.test(fork);
      out.makesShore = /Make for shore/.test(fork);
      out.notDepth = !/Depth/.test(fork);

      Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
      out.seaKeeps = /The sea keeps you/.test(document.getElementById('resultBody').innerText);
      return out;
    });
    t.eq('there are four voices now', words.voices.length, 4);
    t.ok('each fully written out', words.everyVoiceComplete);
    t.ok('and each says something different', words.distinct);
    t.ok('every setting that names a voice names a real one', words.everySettingsVoiceReal);
    t.ok('the Sea counts leagues', words.leagues && words.notDepth);
    t.ok('open water lies ahead rather than a passage into the dark', words.openWater);
    t.ok('you sail on', words.sailsOn);
    t.ok('and make for shore', words.makesShore);
    t.ok('and a wreck is the sea, not the dark', words.seaKeeps);

    // --- the codec carries the voyage ---
    const codec = await t.ev(() => {
      const out = {};
      out.ordersMatch = JSON.stringify(SETTING_ORDER) === JSON.stringify(Object.keys(SETTINGS));
      out.seaLast = SETTING_ORDER[SETTING_ORDER.length - 1] === 'sea';
      out.ver = Codec.VER;
      Game.s.bests = { deep: 9, wilds: 21, sea: 17 };
      const back = Codec.decode(Codec.encode(Profiles.active(), Game.s, Date.now()));
      out.ok = back.ok;
      out.bests = back.ok ? back.g.bests : null;
      return out;
    });
    t.ok('SETTING_ORDER still matches SETTINGS', codec.ordersMatch);
    t.ok('with the Sea appended rather than inserted', codec.seaLast);
    t.eq('and no format bump — the count is written down', codec.ver, 5);
    t.ok('a knight code carries the voyage', codec.ok);
    t.eq('exactly', codec.bests, { deep: 9, wilds: 21, sea: 17 });

    // --- and one hold, actually sailed into ---
    await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1, hold: 1 };
      Dungeon.descend('sea');
      for (let s = 1; s <= 400; s++) {
        Dungeon.run.seed = s * 3313;
        if (Dungeon.peek(2).name === 'hold') break;
      }
      Dungeon.run.depth = 1;
      Dungeon.run.unbanked.gold = 240;
      Dungeon.nextRoom();
    });
    t.eq('a hold found in a real voyage draws its own screen', await t.screen(), 's-lock');
    const seen = await t.text();
    t.ok('and says what it is', /cargo hold/i.test(seen));
    t.ok('quoting both sides of it — growth and what is not insured',
      /12% a league/.test(seen) && /not insured/i.test(seen), seen.slice(0, 260));

    await t.tapText(/Stow half/);
    await t.tapText(/Onward/);
    const after = await t.ev(() => ({
      screen: document.querySelector('.screen.on').id,
      cargo: Math.floor(Dungeon.run.cargo),
      pot: Math.floor(Dungeon.run.unbanked.gold),
      fork: document.getElementById('resultBody').innerText
    }));
    t.eq('stowing lands on the fork', after.screen, 's-result');
    t.eq('with half the pot in the hold', after.cargo, 120);
    t.eq('and half still in it', after.pot, 120);
    t.ok('and the fork says what is riding uninsured',
      /120 in freight — uninsured/.test(after.fork), after.fork.slice(0, 240));
  }
};
