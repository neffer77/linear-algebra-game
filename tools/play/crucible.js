/* S12 — Alchemy: the Crucible, and the last skill on the roll.
 *
 * Nineteen skills gathered, spent, read or pressed. This one CONVERTS, which
 * is the third verb the Material channel names and the only one nothing in the
 * game did. It has no gathering room, for the same reason Smithing and
 * Enchanting have none: there is nothing to go and cut.
 *
 * So almost everything worth checking here is about the RATE, because the rate
 * is the entire design. It is a diffusion: flux runs down a gradient and the
 * flow flattens the gradient that drives it. Three consequences have to hold or
 * the bench is either useless or ruinous, and each gets its own section below.
 *
 *   - Pouring downhill pays and pouring uphill does not, so WHAT you are
 *     holding decides whether the bench is worth visiting.
 *   - The rate decays as you pour, so the three buttons say genuinely
 *     different things rather than three multiples of one number. That is the
 *     only teaching the room does, and it does it without a word of prose.
 *   - The marginal rate never reaches 1. This is the load-bearing one. At 1
 *     the bench mints material and every other room in the game becomes
 *     optional, so it is checked at every tier, from many states, and by
 *     actually running round trips until they die.
 *
 * And the line the Scriptorium was held to, which this bench could break more
 * cheaply than any other: a currency may buy convenience and may never buy
 * mastery. Pouring is checked field by field against topicStats.
 */
'use strict';

module.exports = {
  name: 'crucible',
  title: 'S12 · the rate is a gradient, and it never pays you twice',
  async run(t) {
    await t.newKnight('Alchemist');

    // --- the bench exists, and knows exactly the materials the game has ---
    const shape = await t.ev(() => {
      const out = {};
      out.exists = typeof Crucible === 'object' && !!Crucible;
      out.listed = MATERIALS.map(m => m.id);
      out.held = Object.keys(Game.s.mats).sort();
      out.whole = MATERIALS.every(m => m.id && m.nm && m.ic && m.from);
      // Its mathematics is the Sanctum's own, rather than a chart's assignment.
      out.strand = Crucible.STRAND;
      out.sanctumStrands = SETTINGS.sanctum.strands;
      out.topics = strandTopics(Crucible.STRAND);
      // It converts; it does not gather. No setting grows a room for it.
      out.roomKinds = Object.keys(RoomKinds);
      out.anyPlan = Object.keys(SETTINGS)
        .filter(k => (SETTINGS[k].plan || []).some(p => /crucible|alchem/.test(p)));
      return out;
    });
    t.ok('the Crucible is there', shape.exists);
    t.eq('it knows every material the knight can hold',
      shape.listed.slice().sort(), shape.held);
    t.ok('and every entry is whole — name, icon, and where it comes from', shape.whole);
    t.ok('its mathematics is one the Sanctum actually declares',
      shape.sanctumStrands.indexOf(shape.strand) >= 0,
      `${shape.strand} vs ${JSON.stringify(shape.sanctumStrands)}`);
    t.ok('which resolves to real topics',
      Array.isArray(shape.topics) && shape.topics.length >= 5, JSON.stringify(shape.topics));
    t.ok('it grows no room of its own — it converts rather than gathers',
      !shape.roomKinds.some(k => /crucible|alchem/.test(k)), JSON.stringify(shape.roomKinds));
    t.eq('and no setting lays one out by hand', shape.anyPlan, []);

    // --- the rate follows the gradient ---
    const grad = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 0 };
      out.downhill = Crucible.rate(100, 0);
      out.level = Crucible.rate(50, 50);
      out.uphill = Crucible.rate(0, 100);
      out.mild = Crucible.rate(60, 40);
      const f = Crucible.FLOORS[Crucible.tier()], c = Crucible.CEILS[Crucible.tier()];
      out.floor = f; out.ceil = c;
      // Across a wide sweep of states the rate stays inside its own band.
      let below = 0, above = 0, bad = 0;
      for (let s = 0; s <= 200; s += 7) {
        for (let d = 0; d <= 200; d += 7) {
          const r = Crucible.rate(s, d);
          if (!isFinite(r)) bad++;
          if (r < f - 1e-9) below++;
          if (r > c + 1e-9) above++;
        }
      }
      out.below = below; out.above = above; out.bad = bad;
      // Monotone: a steeper gradient never pays less.
      let breaks = 0, prev = -1;
      for (let s = 0; s <= 120; s += 4) { const r = Crucible.rate(s, 60); if (r < prev - 1e-9) breaks++; prev = r; }
      out.monotoneBreaks = breaks;
      return out;
    });
    t.ok('pouring a deep pile into an empty one pays the most',
      grad.downhill > grad.mild && grad.mild > grad.level,
      `${grad.downhill} > ${grad.mild} > ${grad.level}`);
    t.ok('between two level piles it pays the floor and no more',
      Math.abs(grad.level - grad.floor) < 1e-9, `${grad.level} vs ${grad.floor}`);
    t.ok('and pouring uphill pays the floor too — never a negative',
      Math.abs(grad.uphill - grad.floor) < 1e-9, `${grad.uphill}`);
    t.eq('no state anywhere pays under the floor', grad.below, 0);
    t.eq('nor over the ceiling', grad.above, 0);
    t.eq('and none of them is NaN', grad.bad, 0);
    t.eq('a steeper gradient never pays less than a shallower one', grad.monotoneBreaks, 0);

    // --- the flow flattens the slope that drives it ---
    const decay = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 120 };
      const third = Crucible.quote('page', 'ore', 40);
      const half = Crucible.quote('page', 'ore', 60);
      const all = Crucible.quote('page', 'ore', 120);
      out.third = third.get; out.half = half.get; out.all = all.get;
      // The buttons are not multiples of one another: that IS the lesson.
      out.notTriple = all.get < third.get * 3;
      out.notDouble = all.get < half.get * 2;
      // The second half of a pile is worth strictly less than the first half.
      out.firstHalf = half.get;
      out.secondHalf = all.get - half.get;
      // Marginal rate at the start of a pour beats the rate at the end of it.
      out.marginalStart = Crucible.rate(120, 0);
      out.marginalEnd = Crucible.rate(120 - 119, 0 + all.get);
      return out;
    });
    t.ok('a third of a pile comes back as something', decay.third > 0, String(decay.third));
    t.ok('pouring everything is not three times pouring a third', decay.notTriple,
      `all ${decay.all} vs 3×${decay.third}`);
    t.ok('nor twice pouring a half', decay.notDouble, `all ${decay.all} vs 2×${decay.half}`);
    t.ok('the second half of a pile is worth less than the first half',
      decay.secondHalf < decay.firstHalf, `${decay.secondHalf} < ${decay.firstHalf}`);
    t.ok('because the rate at the end of a pour is below the rate at its start',
      decay.marginalEnd < decay.marginalStart,
      `${decay.marginalEnd} < ${decay.marginalStart}`);

    // --- the rate can never reach 1, at any tier ---
    const bounded = await t.ev(() => {
      const out = { ceilings: Crucible.CEILS.slice(), floors: Crucible.FLOORS.slice() };
      out.allUnderOne = Crucible.CEILS.every(c => c < 1);
      out.floorsUnderCeils = Crucible.CEILS.every((c, i) => Crucible.FLOORS[i] < c);
      out.floorsPositive = Crucible.FLOORS.every(f => f > 0);
      // Sweep every tier and a wide grid: no state may yield more than it spends.
      const T = strandTopics(Crucible.STRAND);
      const set = m => T.forEach(k => Game.s.topicStats[k] =
        { c: 30, w: 1, m, seen: 20, last: Game.s.qCount || 0, t: Date.now() });
      const seen = {}; let mints = 0, worst = 0;
      for (const m of [0.1, 0.5, 0.7, 0.9, 0.99]) {
        set(m);
        seen[Crucible.tier()] = true;
        for (const s of [1, 5, 20, 60, 200, 500]) {
          for (const d of [0, 1, 10, 100]) {
            Game.s.mats = { ore: 0, essence: 0, herb: 0, page: s };
            Game.s.mats.ore = d;
            const q = Crucible.quote('page', 'ore', s);
            if (q.get > q.spend) mints++;
            worst = Math.max(worst, q.spend > 0 ? q.get / q.spend : 0);
          }
        }
      }
      out.tiersSeen = Object.keys(seen).map(Number).sort();
      out.mints = mints;
      out.worstRatio = worst;
      return out;
    });
    t.ok('no ceiling reaches 1 — the bench cannot mint material', bounded.allUnderOne,
      JSON.stringify(bounded.ceilings));
    t.ok('every floor sits under its own ceiling', bounded.floorsUnderCeils);
    t.ok('and every floor is above zero, so a pour is never wholly wasted',
      bounded.floorsPositive, JSON.stringify(bounded.floors));
    t.eq('all three mastery bands are reachable', bounded.tiersSeen, [0, 1, 2]);
    t.eq('and across every one of them, no pour returns more than it took',
      bounded.mints, 0);
    t.ok('the best rate anywhere stays under 1', bounded.worstRatio < 1,
      String(bounded.worstRatio));

    // --- so a round trip strictly loses, and keeps losing ---
    const trip = await t.ev(() => {
      const out = {};
      const T = strandTopics(Crucible.STRAND);
      T.forEach(k => Game.s.topicStats[k] =
        { c: 30, w: 1, m: 0.99, seen: 20, last: Game.s.qCount || 0, t: Date.now() });
      out.tier = Crucible.tier();                       // the most generous case
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 100 };
      const seq = [];
      for (let i = 0; i < 8; i++) {
        Crucible.pour('page', 'ore', Game.s.mats.page);
        Crucible.pour('ore', 'page', Game.s.mats.ore);
        seq.push(Game.s.mats.page);
      }
      out.seq = seq;
      out.startedAt = 100;
      out.neverGrew = seq.every((v, i) => v < (i === 0 ? 100 : seq[i - 1]) || v === seq[i - 1]);
      out.strictlyDown = seq[0] < 100;
      out.ended = seq[seq.length - 1];
      // A three-cornered cycle is no better than a two-cornered one.
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 100 };
      Crucible.pour('page', 'ore', 100);
      Crucible.pour('ore', 'herb', Game.s.mats.ore);
      Crucible.pour('herb', 'page', Game.s.mats.herb);
      out.threeCorner = Game.s.mats.page;
      return out;
    });
    t.eq('taking the most generous band the game offers', trip.tier, 2);
    t.ok('one round trip already loses', trip.strictlyDown,
      `100 → ${trip.seq[0]}`);
    t.ok('and no round trip ever gains', trip.neverGrew, JSON.stringify(trip.seq));
    t.ok('repeated trips fall to nothing rather than settling into a farm',
      trip.ended <= 1, JSON.stringify(trip.seq));
    t.ok('going the long way round three materials loses too',
      trip.threeCorner < 100, `100 → ${trip.threeCorner}`);

    // --- knowing the mathematics is what moves the rate ---
    const skill = await t.ev(() => {
      const out = {};
      const T = strandTopics(Crucible.STRAND);
      const yieldAt = m => {
        T.forEach(k => Game.s.topicStats[k] =
          { c: 30, w: 1, m, seen: 20, last: Game.s.qCount || 0, t: Date.now() });
        Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 120 };
        return { tier: Crucible.tier(), got: Crucible.quote('page', 'ore', 120).get };
      };
      out.weak = yieldAt(0.2);
      out.steady = yieldAt(0.7);
      out.solid = yieldAt(0.95);

      // Faded mastery, not raw: letting the strand go cold takes the rate back.
      T.forEach(k => Game.s.topicStats[k] =
        { c: 30, w: 1, m: 0.95, seen: 20, last: Game.s.qCount || 0, t: Date.now() });
      const hot = Crucible.reach();
      T.forEach(k => { Game.s.topicStats[k].t = Date.now() - 1000 * 60 * 60 * 24 * 400;
                       Game.s.topicStats[k].last = -100000; });
      out.cold = Crucible.reach();
      out.hot = hot;
      out.fades = out.cold < hot;
      return out;
    });
    t.eq('a weak grasp of the strand reads as the bottom band', skill.weak.tier, 0);
    t.eq('a steady one as the middle', skill.steady.tier, 1);
    t.eq('a solid one as the top', skill.solid.tier, 2);
    t.ok('and the same pile comes back bigger the better you know it',
      skill.solid.got > skill.steady.got && skill.steady.got > skill.weak.got,
      `${skill.weak.got} < ${skill.steady.got} < ${skill.solid.got}`);
    t.ok('meaningfully bigger — mastery is worth more than a rounding error',
      skill.solid.got >= skill.weak.got * 1.4,
      `${skill.weak.got} → ${skill.solid.got}`);
    t.ok('the rate is read off FADED mastery, so a cold strand loses it',
      skill.fades, `${skill.hot} → ${skill.cold}`);

    // --- and it may never buy the mathematics itself ---
    const noSale = await t.ev(() => {
      const out = {};
      const T = strandTopics(Crucible.STRAND);
      T.forEach(k => Game.s.topicStats[k] =
        { c: 30, w: 1, m: 0.9, seen: 20, last: 5, t: 1000 });
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 200 };
      const before = JSON.parse(JSON.stringify(Game.s.topicStats));
      const qBefore = Game.s.qCount;
      Crucible.pour('page', 'ore', 200);
      const after = Game.s.topicStats;
      const moved = [];
      for (const k of Object.keys(before)) {
        for (const f of ['m', 'c', 'w', 'seen', 'last', 't']) {
          if (before[k][f] !== after[k][f]) moved.push(`${k}.${f}`);
        }
      }
      out.moved = moved;
      out.sameKeys = Object.keys(before).length === Object.keys(after).length;
      out.qUnmoved = Game.s.qCount === qBefore;
      return out;
    });
    t.eq('pouring moves no field of any topic — not mastery, not recency, nothing',
      noSale.moved, []);
    t.ok('and invents no topics', noSale.sameKeys);
    t.ok('nor counts itself as a question answered', noSale.qUnmoved);

    // --- the bookkeeping is exact ---
    const books = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 3, essence: 11, herb: 7, page: 90 };
      const q = Crucible.quote('page', 'ore', 45);
      Crucible.pour('page', 'ore', 45);
      out.spent = 90 - Game.s.mats.page;
      out.gained = Game.s.mats.ore - 3;
      out.quotedSpend = q.spend; out.quotedGet = q.get;
      out.essenceUntouched = Game.s.mats.essence === 11;
      out.herbUntouched = Game.s.mats.herb === 7;
      out.integers = Object.values(Game.s.mats).every(v => Number.isInteger(v));

      // You cannot spend what you do not have.
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 5 };
      out.clamped = Crucible.quote('page', 'ore', 9999).spend;
      Crucible.pour('page', 'ore', 9999);
      out.notNegative = Game.s.mats.page >= 0;

      // An empty pile is a refusal, not a crash.
      Game.s.mats = { ore: 4, essence: 0, herb: 0, page: 0 };
      Crucible.pour('page', 'ore', 10);
      out.emptyNoop = Game.s.mats.ore === 4 && Game.s.mats.page === 0;

      // A pile cannot pour into itself.
      Game.s.mats = { ore: 20, essence: 0, herb: 0, page: 0 };
      Crucible.pour('ore', 'ore', 20);
      out.selfNoop = Game.s.mats.ore === 20;

      // A quote that would come back as nothing is refused rather than taken.
      Game.s.mats = { ore: 500, essence: 0, herb: 0, page: 1 };
      const dud = Crucible.quote('page', 'ore', 1);
      Crucible.pour('page', 'ore', 1);
      out.dudGet = dud.get;
      out.dudRefused = Game.s.mats.page === 1;
      return out;
    });
    t.eq('what leaves the pile is exactly what was quoted',
      books.spent, books.quotedSpend);
    t.eq('and what arrives is exactly what was quoted', books.gained, books.quotedGet);
    t.ok('the materials it was not pointed at do not move',
      books.essenceUntouched && books.herbUntouched);
    t.ok('every pile stays a whole number', books.integers);
    t.eq('a pour larger than the pile is clamped to the pile', books.clamped, 5);
    t.ok('and never drives it negative', books.notNegative);
    t.ok('pouring from an empty pile changes nothing', books.emptyNoop);
    t.ok('a pile cannot pour into itself', books.selfNoop);
    t.eq('a pour worth nothing is quoted as nothing', books.dudGet, 0);
    t.ok('and is refused rather than swallowing the material', books.dudRefused);

    // --- the bench points somewhere, and that is not part of the knight ---
    const bench = await t.ev(() => {
      const out = {};
      Crucible.point('from', 'herb');
      out.from = Crucible.from;
      Crucible.point('to', 'herb');          // same as source: must be refused
      out.toAfterClash = Crucible.to;
      Crucible.point('from', Crucible.to);   // source onto target: target steps aside
      out.distinct = Crucible.from !== Crucible.to;
      Crucible.point('from', 'nonsense');    // unknown ids are ignored
      out.ignoredJunk = Crucible.from !== 'nonsense';

      Game.s.mats = { ore: 2, essence: 3, herb: 4, page: 5 };
      const k = Profiles.active();
      const code = Codec.encode({ nm: k.nm, crest: k.crest, col: k.col }, Game.s, Date.now());
      const back = Codec.decode(code);
      out.tag = Codec.TAG;
      out.decoded = !!back.ok;
      out.matsSurvive = !!back.ok &&
        JSON.stringify(back.g.mats) === JSON.stringify(Game.s.mats);
      out.noBenchField = !!back.ok &&
        !('from' in back.g) && !('to' in back.g) && !('crucible' in back.g);
      return out;
    });
    t.eq('the bench can be pointed at a material', bench.from, 'herb');
    t.ok('it refuses to pour a pile into itself', bench.toAfterClash !== 'herb');
    t.ok('and shoves the target aside rather than allowing a collision', bench.distinct);
    t.ok('an unknown material is ignored', bench.ignoredJunk);
    t.ok('a code still reads back', bench.decoded);
    t.ok('the four piles still survive a save', bench.matsSurvive);
    t.ok('and where the bench happens to be pointed is not saved with them',
      bench.noBenchField);
    t.eq('this slice appends no field, so the codec is unmoved', bench.tag, 'KE6-');
  }
};
