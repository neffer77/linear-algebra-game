/* S11b — the Library: Loremaster's home, and Scribing.
 *
 * The eighth setting, and the fourth kind of pressure — the only one that comes
 * out of the mastery model rather than a foe table. The Deep ramps; the Summit
 * ramps and takes health away; the Wilds circles; the Sea draws weather. The
 * Library's foes are the gentlest in the game and barely grow. What stops a
 * knight is the STACKS: every shelf is asked at a harder tier than the last
 * until the whole shelf is at the top of it.
 *
 * Loremaster divides how fast that happens, and that is the whole reason this
 * is its home rather than the place a design chart assigned it to. So the
 * check that matters most is not "the stacks exist" but "a knight who has kept
 * their reading warm gets further along the shelf before it bites" — and its
 * mirror, that letting the strand go cold takes the benefit away again.
 *
 * Scribing is the Library's material, and the scriptorium is the only room
 * where being wrong is neither fatal nor free: a slip costs PRECISION, so every
 * line after it is worth less. Error accumulates rather than terminating, which
 * is what finite precision means and what no other room says.
 *
 * Pages buy the one thing no other currency touches: recency. That line —
 * recency yes, mastery never — is the ethic of the whole game in one bench, so
 * it is asserted rather than trusted.
 */
'use strict';

module.exports = {
  name: 'library',
  title: 'S11b · what stops you is what you forgot',
  async run(t) {
    await t.newKnight('Scholar');

    // --- the setting ---
    const set = await t.ev(() => {
      const S = SETTINGS.library, out = {};
      out.exists = !!S;
      out.endless = S.rooms;
      out.canDie = S.canDie;
      out.voice = S.voice;
      out.stackEvery = S.stackEvery;
      out.foresight = S.foresight;
      out.counter = S.counter;

      out.noThinAir = !S.thinAir;
      out.noSwell = !S.waves.swell;
      out.noWeather = !S.waves.squallChance;
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;

      // its foes are the gentlest in the game — they are not the pressure
      R.seed(3); const lib = WaveEngine.foe(6, LIBRARY_WAVES); R.unseed();
      R.seed(3); const deep = WaveEngine.foe(6, DEEP_WAVES); R.unseed();
      R.seed(3); const sea = WaveEngine.foe(6, SEA_WAVES); R.unseed();
      out.gentler = lib.hp < deep.hp && lib.atk < deep.atk && lib.atk < sea.atk;

      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.libraryOpen();
      [0, 1, 2, 3, 4, 5].forEach(ri => REALMS[ri].foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      out.sealedAfterSix = !Dungeon.libraryOpen();
      REALMS[6].foes.forEach((f, i) => Game.s.cleared['6:' + i] = 1);
      out.openAfterSeven = Dungeon.libraryOpen();
      UI.renderMap();
      out.onMap = /The Library/.test(document.getElementById('mapList').innerText);
      return out;
    });
    t.ok('the Library exists as a setting', set.exists);
    t.eq('it runs until you sign out', set.endless, 0);
    t.ok('and it can keep you', set.canDie === true);
    t.eq('it is read into, in its own words', set.voice, 'in');
    t.ok('its danger is none of the other three',
      set.noThinAir && set.noSwell && set.noWeather);
    t.ok('its foes are the gentlest in the game — they are not the pressure',
      set.gentler);
    t.eq('the stacks age every three shelves', set.stackEvery, 3);
    t.ok('it names no foresight at all', !set.foresight);
    t.eq('because what answers it is Loremaster, a Passage skill', set.counter, 'loremaster');

    t.ok('it is about its own mathematics', set.topicsResolve,
      String(set.topics && set.topics.length));
    t.ok('it is sealed until the seventh realm falls',
      set.sealedAtStart && set.sealedAfterSix && set.openAfterSeven);
    t.ok('and it has its own node on the map', set.onMap);

    /* --- the stacks ---
       Read against the setting rather than a number: how many tiers the shelf
       has added, at a range of depths, with Loremaster cold and warm. */
    const stacks = await t.ev(() => {
      const out = {};
      const lore = STRANDS.find(x => x[0] === 'Limits & Derivatives');
      const setLore = m => lore[1].forEach(k => Game.s.topicStats[k] =
        { c: 20, w: 2, m, seen: 12, last: 0, t: Date.now() });

      // nowhere else has stacks at all
      out.elsewhere = Object.keys(SETTINGS).filter(k => k !== 'library' && SETTINGS[k].stackEvery);
      setLore(0);
      out.deepFlat = [1, 5, 20, 60].every(d => Dungeon.stacks(d, SETTINGS.deep) === 0);
      out.seaFlat = [1, 5, 20, 60].every(d => Dungeon.stacks(d, SETTINGS.sea) === 0);

      // in the Library it rises, and the first shelf is free
      const at = d => Dungeon.stacks(d, SETTINGS.library);
      out.firstFree = at(1);
      const ladder = [1, 2, 3, 4, 5, 7, 10, 13].map(at);
      out.ladder = ladder;
      out.risesWithDepth = ladder.every((v, i) => i === 0 || v >= ladder[i - 1]);
      out.reallyRises = ladder[ladder.length - 1] > ladder[0];
      /* Monotone is not enough: a shelf counted from the wrong end is still
         monotone. So the whole ladder is checked against what the setting
         says it should be, tier by tier, at a known memory. */
      out.want = [1, 2, 3, 4, 5, 7, 10, 13]
        .map(d => Math.floor(Math.max(0, d - 1) / (SETTINGS.library.stackEvery * Passage.memory())));
      out.exact = JSON.stringify(ladder) === JSON.stringify(out.want);
      // and the second shelf is still free, which the first alone does not prove
      out.secondFree = at(2);


      /* And Loremaster slows it. Three tiers of the skill, and the same shelf
         read at each: the better the memory, the fewer tiers the stacks have
         added by the time you get there. */
      out.tiers = [];
      for (const m of [0, 0.7, 0.95]) {
        setLore(m);
        out.tiers.push({ m, memory: Passage.memory(), at12: at(12) });
      }
      out.warmIsKinder = out.tiers[0].at12 > out.tiers[2].at12;
      out.monotone = out.tiers.every((x, i) => i === 0 || x.at12 <= out.tiers[i - 1].at12);

      // and letting the strand go cold takes it back
      setLore(0.95);
      const warm = at(12);
      setLore(0);
      out.afterCooling = at(12);
      out.warmWas = warm;
      return out;
    });
    t.eq('no other setting has stacks at all', stacks.elsewhere, []);
    t.ok('the Deep never ages its material', stacks.deepFlat);
    t.ok('nor does the Sea', stacks.seaFlat);
    t.eq('the first shelf is free', stacks.firstFree, 0);
    t.eq('and so is the second', stacks.secondFree, 0);
    t.ok('every shelf is aged by exactly what the setting says',
      stacks.exact, `${JSON.stringify(stacks.ladder)} vs ${JSON.stringify(stacks.want)}`);

    t.ok('and the material ages the further in you read',
      stacks.risesWithDepth && stacks.reallyRises, JSON.stringify(stacks.ladder));
    t.ok('Loremaster slows the stacks', stacks.warmIsKinder,
      JSON.stringify(stacks.tiers));
    t.ok('and slows them more at every tier of it', stacks.monotone,
      JSON.stringify(stacks.tiers));
    t.ok('letting the strand go cold takes the benefit back',
      stacks.afterCooling > stacks.warmWas,
      `${stacks.warmWas} warm, ${stacks.afterCooling} cold`);

    /* --- the stacks actually reach the questions ---
       A pressure that changes a number nothing reads is not a pressure. The
       tier is clamped to three, so what is checked is that a deep shelf asks
       at the ceiling where a shallow one does not — measured on real builds. */
    const asked = await t.ev(() => {
      const out = {};
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      /* A knight who knows everything at 0.7 — inside the band where
         adjustDiff hands back the base it was given, so mastery is not the
         variable here — except Loremaster's own strand, held just below the
         first tier of the skill so its memory multiplier is 1 and the stacks
         are read at their plain rate. Without that the skill quietly cancels
         the very thing being measured. */
      STRANDS.forEach(s => s[1].forEach(k => Game.s.topicStats[k] =
        { c: 40, w: 1, m: 0.7, seen: 30, last: 0, t: Date.now() }));
      STRANDS.find(s => s[0] === 'Limits & Derivatives')[1]
        .forEach(k => Game.s.topicStats[k] = { c: 40, w: 1, m: 0.5, seen: 30, last: 0, t: Date.now() });
      out.memoryHere = Passage.memory();


      /* The tier a room actually asks for, caught at the call rather than
         inferred: buildQuestion is wrapped for the length of one build and the
         difficulty it was handed is recorded. That tests the real path instead
         of re-deriving the arithmetic in the check. */
      const tierAt = (depth, key) => {
        Dungeon.descend(key);
        Dungeon.run.depth = depth;
        const real = window.buildQuestion;
        let saw = null;
        window.buildQuestion = (k, d) => { saw = d; return real(k, d); };
        R.seed(4242);
        try { RoomKinds.lock.build(R, depth, SETTINGS[key]); }
        finally { window.buildQuestion = real; R.unseed(); }
        return saw;
      };

      /* Measured at a depth where the ROOM's own ramp has not already reached
         the ceiling, or the stacks would be invisible behind it: at shelf four
         a chest asks tier two everywhere, and only the Library adds to it. */
      out.libAtFour = tierAt(4, 'library');
      out.deepAtFour = tierAt(4, 'deep');
      out.shallowLib = tierAt(2, 'library');
      out.deepLib = tierAt(30, 'library');

      // the tier never runs off the end of what the generators can build
      out.everyTierValid = [1, 2, 3].indexOf(out.deepLib) >= 0;
      out.clampHolds = Mastery.adjustDiff('vecAdd', 99) <= 3 &&
                       Mastery.adjustDiff('vecAdd', -5) >= 1;
      return out;
    });
    t.eq('with Loremaster cold, the stacks run at their plain rate', asked.memoryHere, 1);
    t.ok('and the same room at the same depth is asked harder in the Library',
      asked.libAtFour > asked.deepAtFour,
      `library ${asked.libAtFour}, deep ${asked.deepAtFour}`);

    t.ok('and a deep shelf is asked harder than a shallow one',
      asked.deepLib > asked.shallowLib || asked.deepLib === 3,
      `${asked.shallowLib} → ${asked.deepLib}`);

    t.ok('and the tier stays a tier the generators can build',
      asked.everyTierValid, String(asked.deepLib));
    t.ok('however high the stacks reach, the clamp holds', asked.clampHolds);

    // --- the scriptorium ---
    const room = await t.ev(() => {
      const out = { counts: {} };
      out.kindExists = !!RoomKinds.copy;
      out.introduced = !!ROOM_INTRO.copy;
      out.elsewhere = Object.keys(SETTINGS).filter(k => k !== 'library' && SETTINGS[k].copyChance);
      out.inNoPlan = Object.keys(SETTINGS).filter(k => (SETTINGS[k].plan || []).indexOf('copy') >= 0);

      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      for (const key of ['library', 'deep', 'sea']) {
        Dungeon.descend(key);
        let n = 0, atOne = 0;
        for (let seed = 1; seed <= 40; seed++) {
          Dungeon.run.seed = seed * 5501;
          for (let d = 1; d <= 25; d++) {
            const r = Dungeon.peek(d);
            if (r.name === 'copy') { n++; if (d === 1) atOne++; }
          }
        }
        out.counts[key] = n;
        out['atOne_' + key] = atOne;
      }

      // it drills the Library's own strand
      out.roomStrand = Scribe.strand();
      out.settingFirst = SETTINGS.library.strands[0];
      const inStrand = new Set(strandTopics(Scribe.strand()));
      Dungeon.descend('library');
      let count = 0; const off = [];
      for (let s = 0; s < 20; s++) {
        R.seed(7300 + s * 331);
        const spec = RoomKinds.copy.build(R, 3 + (s % 9), SETTINGS.library);
        R.unseed();
        for (const q of spec.qs) { count++; if (!inStrand.has(q.key)) off.push(q.key); }
      }
      out.asked = count;
      out.offStrand = off;

      // and it is built purely, like every room
      const build = () => {
        R.seed(9119);
        const spec = RoomKinds.copy.build(R, 6, SETTINGS.library);
        R.unseed();
        return spec.qs.map(q => q.key + '|' + q.q);
      };
      out.samePlan = JSON.stringify(build()) === JSON.stringify(build());
      Mastery._last = 'sentinel';
      R.seed(55); RoomKinds.copy.build(R, 4, SETTINGS.library); R.unseed();
      out.cursorHeld = Mastery._last === 'sentinel';
      out.steps = Scribe.STEPS;
      return out;
    });
    t.ok('the scriptorium is a room kind like any other', room.kindExists);
    t.ok('and introduces itself the first time', room.introduced);
    t.ok('scriptoria are found in the Library', room.counts.library > 50,
      String(room.counts.library));
    t.eq('and nowhere else — the Deep has none', room.counts.deep, 0);
    t.eq('nor the Sea', room.counts.sea, 0);
    t.eq('no other setting declares a chance of one', room.elsewhere, []);
    t.eq('and none lays one out by hand', room.inNoPlan, []);
    t.eq('never on the first shelf', room.atOne_library, 0);
    t.eq('it drills the strand the Library is built on',
      room.roomStrand, room.settingFirst);
    t.eq('every line it asks comes out of that strand and no other', room.offStrand, []);
    t.ok('across a useful number of them', room.asked >= 60, String(room.asked));
    t.ok('the same seed and shelf lay out the same passage', room.samePlan);
    t.ok('and building it does not disturb what the next fight will ask',
      room.cursorHeld);
    t.eq('four lines to a passage', room.steps, 4);

    /* --- precision ---
       The room's whole claim: a slip costs precision rather than the room, so
       error ACCUMULATES. Every path is played out and the pages checked against
       the arithmetic rather than against a table of expected numbers. */
    const copy = await t.ev(() => {
      const out = {};
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Dungeon.descend('library');

      const play = (script) => {
        Game.s.mats.page = 0;
        R.seed(13131);
        const spec = RoomKinds.copy.build(R, 5, SETTINGS.library);
        R.unseed();
        let got = null, calls = 0;
        Scribe.begin(spec, { depth: 5, run: Dungeon.run }, o => { calls++; got = o; });
        Scribe.ask();
        for (const ok of script) {
          const q = spec.qs[Scribe.at];
          if (!q) break;
          Scribe.answer({ classList: { remove() {}, add() {} } },
            ok ? q.a : q.choices.find(c => c !== q.a));
          if (Scribe.resolved) break;
          if (Scribe.at < Scribe.STEPS) Scribe.ask(); else Scribe.finishCopy();
        }
        const go = document.getElementById('scribeGo');
        if (go) go.click();
        return { pages: got && got.copy.pages, slips: got && got.copy.slips,
                 status: got && got.status, calls, pouch: Game.s.mats.page };
      };

      // the arithmetic, written out here independently of the room
      const expect = (script) => {
        let pages = 0, prec = 1;
        for (const ok of script) {
          if (ok) pages += Scribe.PER_STEP * prec;
          else prec *= (1 - Scribe.SLIP);
        }
        return Math.floor(pages);
      };

      const clean = [true, true, true, true];
      const early = [false, true, true, true];
      const late = [true, true, true, false];
      const half = [true, false, true, false];
      const none = [false, false, false, false];

      out.clean = play(clean); out.cleanWant = expect(clean);
      out.early = play(early); out.earlyWant = expect(early);
      out.late = play(late); out.lateWant = expect(late);
      out.half = play(half); out.halfWant = expect(half);
      out.none = play(none); out.noneWant = expect(none);

      // and never taking up the pen at all
      Game.s.mats.page = 0;
      R.seed(13131);
      const spec = RoomKinds.copy.build(R, 5, SETTINGS.library);
      R.unseed();
      let left = null, leftCalls = 0;
      Scribe.begin(spec, { depth: 5, run: Dungeon.run }, o => { leftCalls++; left = o; });
      Scribe.walkAway();
      const goAway = document.getElementById('scribeGo');
      if (goAway) goAway.click();
      out.walked = { pages: left && left.copy.pages, calls: leftCalls,
                     pouch: Game.s.mats.page };

      /* A resolved passage, poked the way a stale timer would poke it — and
         poked on a copy that actually EARNED something, because a finished
         empty one has nothing left to pay twice. */
      Game.s.mats.page = 0;
      R.seed(2024);
      const paid = RoomKinds.copy.build(R, 5, SETTINGS.library);
      R.unseed();
      let paidCalls = 0;
      Scribe.begin(paid, { depth: 5, run: Dungeon.run }, () => { paidCalls++; });
      Scribe.ask();
      for (let i = 0; i < Scribe.STEPS; i++) {
        const q = paid.qs[Scribe.at];
        Scribe.answer({ classList: { remove() {}, add() {} } }, q.a);
        if (Scribe.at < Scribe.STEPS) Scribe.ask(); else Scribe.finishCopy();
      }
      const earned = Game.s.mats.page;
      Scribe.ask();
      Scribe.finishCopy();                 // exactly what a late timer would do
      out.lateTimers = earned > 0 && Game.s.mats.page === earned && paidCalls === 0;
      out.earned = earned;


      /* And the harder half: a step left in flight by one passage must not
         land inside the NEXT one. Begin a fresh copy and fire what the old one
         had pending — the token has moved, so it does nothing at all. */
      R.seed(4711);
      const fresh = RoomKinds.copy.build(R, 5, SETTINGS.library);
      R.unseed();
      let stray = 0;
      Scribe.begin(fresh, { depth: 5, run: Dungeon.run }, () => { stray++; });
      const staleFinish = (tok => () => { if (Scribe.token === tok) Scribe.finishCopy(); })(Scribe.token - 1);
      staleFinish();
      out.strayTimerIgnored = stray === 0 && !Scribe.resolved;



      return out;
    });
    t.eq('a clean copy is worth every line at full worth',
      copy.clean.pages, copy.cleanWant);
    t.eq('and reports no slips', copy.clean.slips, 0);
    t.eq('a slip on the first line still finishes the copy',
      copy.early.slips, 1);
    t.eq('worth exactly what the precision says', copy.early.pages, copy.earlyWant);
    t.eq('a slip on the last line costs the same precision',
      copy.late.slips, 1);
    t.ok('but far less of the copy — that is what accumulating error means',
      copy.late.pages > copy.early.pages,
      `early ${copy.early.pages}, late ${copy.late.pages}`);
    t.eq('two slips compound rather than add', copy.half.pages, copy.halfWant);
    t.eq('and four of them leave nothing', copy.none.pages, 0);
    t.ok('a scriptorium can never end a reading',
      [copy.clean, copy.early, copy.late, copy.half, copy.none]
        .every(r => r.status === 'cleared'));
    t.ok('and reports exactly once, however it goes',
      [copy.clean, copy.early, copy.late, copy.half, copy.none]
        .every(r => r.calls === 1));
    /* And a passage that has reported stays reported. Every step here is
       reached through a timer, so a late one from a finished copy must not
       render over the next room or pay into it. */
    t.ok('a finished copy ignores anything that arrives late', copy.lateTimers,
      `earned ${copy.earned}`);

    t.ok('and a step left in flight by one passage cannot resolve the next',
      copy.strayTimerIgnored);
    t.eq('what it reports is what reaches the pouch',
      copy.clean.pouch, copy.clean.pages);
    t.eq('never taking up the pen copies nothing', copy.walked.pages, 0);
    t.eq('and reports once all the same', copy.walked.calls, 1);
    t.eq('nor does it quietly add to the pouch', copy.walked.pouch, 0);


    /* --- pages buy recency, and only recency ---
       The line the whole game rests on. A currency that could buy mastery would
       make every other room optional, so the bench is checked field by field. */
    const bench = await t.ev(() => {
      const out = {};
      out.entries = SCRIPTORIUM.length;
      out.everyOneComplete = SCRIPTORIUM.every(e => e.id && e.nm && e.ic && e.ds && e.page > 0 && e.topics > 0);
      out.risesWithSize = SCRIPTORIUM.every((e, i) =>
        i === 0 || (e.page > SCRIPTORIUM[i - 1].page && e.topics > SCRIPTORIUM[i - 1].topics));
      // and the bigger binding is cheaper a topic, or nobody would buy it
      out.cheaperInBulk = SCRIPTORIUM.every((e, i) =>
        i === 0 || (e.page / e.topics) < (SCRIPTORIUM[i - 1].page / SCRIPTORIUM[i - 1].topics));

      // a knight with faded topics
      const old = Date.now() - 40 * 864e5;
      Game.s.topicStats = {};
      Game.s.qCount = 500;
      const keys = ['vecAdd', 'dot', 'det2', 'matVec', 'limPoly'];
      keys.forEach((k, i) => Game.s.topicStats[k] =
        { c: 20, w: 2, m: 0.9, seen: 20, last: 0, t: old - i * 864e5 });
      const before = {};
      keys.forEach(k => before[k] = { m: Game.s.topicStats[k].m, seen: Game.s.topicStats[k].seen,
                                      t: Game.s.topicStats[k].t, last: Game.s.topicStats[k].last,
                                      eff: Mastery.eff(k) });
      out.fadedFirst = keys.every(k => before[k].eff < before[k].m);

      /* An empty pouch buys nothing. Compared on the STORED fields rather than
         on effective mastery: eff is a function of the clock, so two reads a
         millisecond apart are not equal and never were. */
      Game.s.mats.page = 0;
      Scriptorium.bind('s_one');
      out.brokeNothing = keys.every(k =>
        Game.s.topicStats[k].t === before[k].t && Game.s.topicStats[k].last === before[k].last);


      Game.s.mats.page = 200;
      const coldest = Scriptorium.coldest(1)[0];
      Scriptorium.bind('s_one');
      out.spent = 200 - Game.s.mats.page;
      out.boundOne = coldest;
      out.effRose = Mastery.eff(coldest) > before[coldest].eff;
      out.effIsNowFull = Math.abs(Mastery.eff(coldest) - before[coldest].m) < 0.001;

      // and the numbers that are NOT for sale did not move, anywhere
      out.masteryUntouched = keys.every(k => Game.s.topicStats[k].m === before[k].m);
      out.seenUntouched = keys.every(k => Game.s.topicStats[k].seen === before[k].seen);

      // the coldest is chosen, not an arbitrary one
      out.pickedTheColdest = coldest === keys[keys.length - 1];

      // nothing faded, nothing to buy
      STRANDS.forEach(s => s[1].forEach(k => Game.s.topicStats[k] =
        { c: 20, w: 2, m: 0.9, seen: 20, last: Game.s.qCount, t: Date.now() }));
      Game.s.mats.page = 200;
      Scriptorium.bind('s_all');
      out.refusedWhenFresh = Game.s.mats.page === 200;
      return out;
    });
    t.eq('three bindings on the bench', bench.entries, 3);
    t.ok('each fully described', bench.everyOneComplete);
    t.ok('a bigger binding costs more and covers more', bench.risesWithSize);
    t.ok('and is cheaper a topic, or nobody would buy it', bench.cheaperInBulk);
    t.ok('a faded topic is worth less than it was learned at', bench.fadedFirst);
    t.ok('an empty pouch binds nothing', bench.brokeNothing);
    t.ok('binding costs pages', bench.spent > 0, String(bench.spent));
    t.ok('and it picks the coldest topic', bench.pickedTheColdest, bench.boundOne);
    t.ok('binding restores what decay had taken', bench.effRose);
    t.ok('right back to what the knight actually knows', bench.effIsNowFull);
    t.ok('mastery itself is not for sale, and does not move', bench.masteryUntouched);
    t.ok('nor does how much has been practised', bench.seenUntouched);
    t.ok('and with nothing faded there is nothing to sell', bench.refusedWhenFresh);

    // --- the Library speaks like a library ---
    const words = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1,
                         sigil: 1, forage: 1, hold: 1, copy: 1 };
      Game.s.loadout = [];
      out.voices = Object.keys(VOICES).length;
      out.everySettingsVoiceReal = Object.keys(SETTINGS)
        .every(k => !SETTINGS[k].voice || !!VOICES[SETTINGS[k].voice]);
      out.distinct = new Set(Object.values(VOICES).map(v => v.passage)).size === out.voices;

      Dungeon.descend('library');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 20, xp: 12 } });
      const fork = document.getElementById('resultBody').innerText;
      out.shelves = new RegExp('Shelf ' + Dungeon.run.depth + ' cleared').test(fork);
      out.stacksGoBack = /stacks go back further than the light/.test(fork);
      out.readsOn = /Read on/.test(fork);
      out.toTheDesk = /Take it to the desk/.test(fork);
      out.notDepth = !/Depth/.test(fork);

      /* The killer's name is only used when the room has no foe to name — a
         chest or a scriptorium — which is exactly the case the fallback exists
         for and the one that used to crash. */
      Dungeon.cur = { kind: RoomKinds.copy, spec: { kind: 'copy' } };
      Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
      const dead = document.getElementById('resultBody').innerText;
      out.stacksKeep = /The stacks keep you/.test(dead);
      out.killerIsForgetting = /What you had forgotten/.test(dead);

      return out;
    });
    t.eq('there are five voices now', words.voices, 5);

    t.ok('every setting that names a voice names a real one', words.everySettingsVoiceReal);
    t.ok('and each says something different', words.distinct);
    t.ok('the Library counts shelves', words.shelves && words.notDepth);
    t.ok('the stacks go back further than the light does', words.stacksGoBack);
    t.ok('you read on', words.readsOn);
    t.ok('and take it to the desk', words.toTheDesk);
    t.ok('and what keeps you is what you had forgotten',
      words.stacksKeep && words.killerIsForgetting);

    // --- the codec carries the pages ---
    const codec = await t.ev(() => {
      const out = {};
      out.ordersMatch = JSON.stringify(SETTING_ORDER) === JSON.stringify(Object.keys(SETTINGS));
      out.libraryLast = SETTING_ORDER[SETTING_ORDER.length - 1] === 'library';
      out.ver = Codec.VER;
      out.tag = Codec.TAG;
      Game.s.mats.page = 231;
      Game.s.mats.herb = 12;
      Game.s.bests = { deep: 9, library: 14 };
      const back = Codec.decode(Codec.encode(Profiles.active(), Game.s, Date.now()));
      out.ok = back.ok;
      out.page = back.ok ? back.g.mats.page : null;
      out.herb = back.ok ? back.g.mats.herb : null;
      out.bests = back.ok ? back.g.bests : null;

      Game.s.mats.page = 0;
      const bare = Codec.decode(Codec.encode(Profiles.active(), Game.s, Date.now()));
      out.barePage = bare.ok ? bare.g.mats.page : null;
      return out;
    });
    t.ok('SETTING_ORDER still matches SETTINGS', codec.ordersMatch);
    t.ok('with the Library appended rather than inserted', codec.libraryLast);
    t.eq('the format moved to six for the pages', codec.ver, 6);
    t.eq('and the tag with it', codec.tag, 'KE6-');
    t.ok('a knight code carries the pages', codec.ok);
    t.eq('exactly', codec.page, 231);
    t.eq('without disturbing what was already in there', codec.herb, 12);
    t.eq('nor the depth records', codec.bests, { deep: 9, library: 14 });
    t.eq('and a knight who never read carries none', codec.barePage, 0);

    // --- and one passage, actually copied ---
    await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1,
                         sigil: 1, forage: 1, hold: 1, copy: 1 };
      Game.s.mats.page = 0;
      window.__pagesBefore = Game.s.mats.page;

      Dungeon.descend('library');
      for (let s = 1; s <= 400; s++) {

        Dungeon.run.seed = s * 5501;
        if (Dungeon.peek(2).name === 'copy') break;
      }
      Dungeon.run.depth = 1;
      Dungeon.nextRoom();
    });
    t.eq('a scriptorium found in a real reading draws its own screen',
      await t.screen(), 's-lock');
    const seen = await t.text();
    t.ok('and says what it is', /scriptorium/i.test(seen));
    t.ok('quoting what a line is worth and what a slip costs',
      /4<\/b> pages|4 pages/.test(seen) && /precision/.test(seen), seen.slice(0, 300));

    await t.tapText(/Take up the pen/);
    t.ok('the first line is on the screen',
      await t.ev(() => {
        const box = document.getElementById('scribeChoices');
        return !!box && box.children.length >= 2;
      }));

    // copy it cleanly, all four lines
    for (let i = 0; i < 4; i++) {
      await t.ev(() => {
        const b = document.querySelector('#scribeChoices .choice[data-correct="1"]');
        if (b) b.click();
      });
      await new Promise(r => setTimeout(r, 900));
    }
    /* Measured as a DELTA against what the pouch held before, and against the
       room's own numbers rather than a hard-coded sixteen — earlier blocks in
       this suite leave pages in the pouch, and a literal here would be testing
       the order the blocks happen to run in. */
    const done = await t.ev(() => ({
      text: document.getElementById('lockBody').innerText,
      gained: Game.s.mats.page - window.__pagesBefore,
      want: Scribe.STEPS * Scribe.PER_STEP
    }));
    t.ok('a clean copy is called one', /clean copy/i.test(done.text),
      done.text.slice(0, 200));
    t.eq('and every line is worth full price', done.gained, done.want);


    await t.tapText(/Onward/);
    const after = await t.ev(() => ({
      screen: document.querySelector('.screen.on').id,
      fork: document.getElementById('resultBody').innerText
    }));
    t.eq('stepping off it lands on the fork', after.screen, 's-result');
    t.ok('and the fork says what came of the copying',
      new RegExp(done.want + ' pages copied without a slip').test(after.fork),
      after.fork.slice(0, 200));

  }
};
