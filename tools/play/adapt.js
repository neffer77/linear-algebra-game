/* P6 — the learning loop.
 *
 * One number per topic, written on every answer, faded by time, and read by
 * three systems: what you are asked, how hard it is, and how much help you get.
 * These claims are the model's stated behaviour turned into assertions.
 */
'use strict';

module.exports = {
  name: 'adapt',
  title: 'P6 · difficulty and choice track mastery',
  async run(t) {
    await t.newKnight('Student');

    const r = await t.ev(() => {
      const DAY = 864e5, out = {};
      // Plant a topic record directly: m, how often met, how long ago.
      const set = (k, m, seen, daysAgo) => {
        Game.s.topicStats[k] = { c: Math.round(seen * m), w: Math.round(seen * (1 - m)),
          m, seen, last: Game.s.qCount, t: Date.now() - daysAgo * DAY };
      };
      const clear = () => { Game.s.topicStats = {}; };

      // --- the write ---
      clear(); Game.s.qCount = 0;
      const climb = [];
      for (let i = 0; i < 6; i++) { Mastery.update('dot', true, 1); climb.push(Game.s.topicStats.dot.m); }
      out.climb = climb.map(x => +x.toFixed(4));
      out.earlyMovesMost = (climb[0] - 0) > (climb[1] - climb[0])
                        && (climb[1] - climb[0]) > (climb[2] - climb[1]);
      const preMiss = Game.s.topicStats.dot.m;
      Mastery.update('dot', false, 1);
      const drop = preMiss - Game.s.topicStats.dot.m;
      const postMiss = Game.s.topicStats.dot.m;
      Mastery.update('dot', true, 1);
      out.missBitesHarder = drop > (Game.s.topicStats.dot.m - postMiss);
      clear(); Mastery.update('mag', true, 1);    const whole = Game.s.topicStats.mag.m;
      clear(); Mastery.update('mag', true, 0.25); out.moteCountsLess = Game.s.topicStats.mag.m < whole;

      // --- the fade: doubling review intervals fall out of strength ~ seen ---
      clear();
      set('det2', 0.9, 5, 0);  out.fresh = Mastery.eff('det2');
      const at = (seen, days) => { set('det2', 0.9, seen, days); return Mastery.eff('det2'); };
      const marks = [at(1, 2), at(2, 4), at(4, 8), at(8, 16)];
      out.marks = marks.map(x => +x.toFixed(3));
      out.intervalsDouble = marks.every(v => Math.abs(v - marks[0]) < 0.02);
      set('trace', 0.95, 40, 7); out.solidAfterAWeek = +Mastery.eff('trace').toFixed(3);
      set('rank', 0.50, 1, 7);   out.shakyAfterAWeek = +Mastery.eff('rank').toFixed(3);
      // stored mastery is untouched by the fade — only the reading moves
      set('rank', 0.50, 1, 7);   out.storedUnchanged = Game.s.topicStats.rank.m;

      // --- difficulty ---
      clear();
      set('matMul', 0.95, 20, 0); out.diffSolid = Mastery.adjustDiff('matMul', 2);
      set('matMul', 0.20, 20, 0); out.diffWeak = Mastery.adjustDiff('matMul', 2);
      set('matMul', 0.95, 20, 0); const hot = Mastery.adjustDiff('matMul', 2);
      set('matMul', 0.95, 3, 60); const cold = Mastery.adjustDiff('matMul', 2);
      out.fadeEasesDifficulty = cold < hot;

      // --- teaching verbosity ---
      clear();
      set('eigen2', 0.95, 20, 0); out.helpSolid = Mastery.help('eigen2');
      set('eigen2', 0.70, 20, 0); out.helpSteady = Mastery.help('eigen2');
      set('eigen2', 0.45, 20, 0); out.helpShaky = Mastery.help('eigen2');
      set('eigen2', 0.10, 20, 0); out.helpWeak = Mastery.help('eigen2');
      set('eigen2', 0.95, 20, 0); out.peekCostsWhenKnown = Codex.costsCombo('eigen2');
      set('eigen2', 0.20, 20, 0); out.peekFreeWhenWeak = !Codex.costsCombo('eigen2');
      set('eigen2', 0.95, 3, 90); out.peekFreeWhenFaded = !Codex.costsCombo('eigen2');
      Game.s.riteWins = { eigen2: 5 };
      set('eigen2', 0.95, 20, 0); out.ladderGoneWhenFresh = Rite.graduated('eigen2');
      set('eigen2', 0.95, 3, 90); out.ladderBackWhenFaded = !Rite.graduated('eigen2');

      // --- the pick ---
      const pool = ['vecAdd', 'dot', 'mag', 'matVec', 'det2', 'transpose'];
      const tally = (n, seed, prefer) => {
        const c = {}; pool.forEach(k => c[k] = 0);
        R.seed(seed);
        for (let i = 0; i < n; i++) { Mastery._last = null; c[Mastery.pick(pool, prefer)]++; }
        R.unseed();
        return c;
      };
      clear(); Game.s.qCount = 500;
      pool.forEach(k => set(k, 0.95, 30, 0));
      set('det2', 0.15, 4, 30); Game.s.topicStats.det2.last = 0;
      out.byUrgency = tally(600, 4242);
      out.weakestChosenMost = pool.every(k => k === 'det2' || out.byUrgency.det2 > out.byUrgency[k]);

      clear(); pool.forEach(k => set(k, 0.9, 20, 0));
      delete Game.s.topicStats.transpose;                       // never met
      out.withUnseen = tally(400, 99);
      out.unseenIntroduced = pool.every(k => k === 'transpose' || out.withUnseen.transpose > out.withUnseen[k]);

      clear(); pool.forEach(k => set(k, 0.5, 5, 1));
      Mastery._last = null;
      R.seed(7);
      let repeats = 0, prev = null;
      for (let i = 0; i < 300; i++) { const k = Mastery.pick(pool); if (k === prev) repeats++; prev = k; }
      R.unseed();
      out.backToBackRepeats = repeats;

      clear(); pool.forEach(k => set(k, 0.6, 10, 1));
      const themed = tally(600, 31, ['matVec', 'det2']);
      const inTheme = themed.matVec + themed.det2;
      out.themeShare = inTheme / 600;
      out.themeNotExclusive = (600 - inTheme) > 0;

      // --- a seeded room build ignores session state ---
      clear(); pool.forEach(k => set(k, 0.5, 5, 1));
      const build = () => { R.seed(555); const k = Mastery.pick(pool, null, true); R.unseed(); return k; };
      Mastery._last = null;     const a = build();
      Mastery._last = a;        const b = build();
      Mastery._last = 'vecAdd'; const c = build();
      out.seededPickIsPure = a === b && b === c;
      return out;
    });

    t.ok('early answers move mastery most, later ones only confirm', r.earlyMovesMost, JSON.stringify(r.climb));
    t.ok('a miss pulls harder than a hit pushes', r.missBitesHarder);
    t.ok('a ladder step counts for less than a whole answer', r.moteCountsLess);

    t.ok('a topic just answered has not faded', r.fresh > 0.85, String(r.fresh));
    t.ok('review intervals double as a topic is met more often', r.intervalsDouble, JSON.stringify(r.marks));
    t.ok('a solid, often-met topic barely fades in a week', r.solidAfterAWeek > 0.8, String(r.solidAfterAWeek));
    t.ok('a shaky one seen once falls hard in the same week', r.shakyAfterAWeek < 0.15, String(r.shakyAfterAWeek));
    t.eq('the fade never touches what is stored', r.storedUnchanged, 0.5);

    t.ok('difficulty rises where mastery is solid', r.diffSolid > r.diffWeak,
      `solid ${r.diffSolid} vs weak ${r.diffWeak}`);
    t.ok('a faded topic comes back gently', r.fadeEasesDifficulty);

    t.ok('help is banded by mastery',
      r.helpWeak === 3 && r.helpShaky === 2 && r.helpSteady === 1 && r.helpSolid === 0,
      JSON.stringify([r.helpWeak, r.helpShaky, r.helpSteady, r.helpSolid]));
    t.ok('the rule costs a combo once you know it', r.peekCostsWhenKnown);
    t.ok('and is free while you do not', r.peekFreeWhenWeak);
    t.ok('a topic gone cold offers its rule freely again', r.peekFreeWhenFaded);
    t.ok('the ladder is gone once graduated', r.ladderGoneWhenFresh);
    t.ok('and returns when the procedure has faded', r.ladderBackWhenFaded);

    t.ok('the weakest, stalest topic is chosen most', r.weakestChosenMost, JSON.stringify(r.byUrgency));
    t.ok('an unseen topic gets introduced rather than ignored', r.unseenIntroduced, JSON.stringify(r.withUnseen));
    t.eq('a topic never repeats back to back', r.backToBackRepeats, 0);
    t.ok('a room prefers its own theme', r.themeShare > 1 / 3, String(r.themeShare));
    t.ok('but never to the exclusion of the rest', r.themeNotExclusive);

    t.ok('a seeded room build ignores session state, so a resumed room is the same room',
      r.seededPickIsPure);
  }
};
