/* S14 — Lessons: a topic is taught before it is tested.
 *
 * Every question used to arrive in one form — four answers, pick one — whether
 * the knight had met the topic a hundred times or never. This suite is about
 * the ladder that replaced that: meet, true-or-false, choose, build.
 *
 * The claims worth protecting are not that the four forms render. They are:
 *
 *   - where a topic stands is DERIVED from faded mastery and stored nowhere, so
 *     a topic left alone walks back down the ladder by itself;
 *   - a clean run climbs one rung an answer and never lands on a band's edge;
 *   - the easy rungs count for less, so being walked through is not mastery;
 *   - a first meeting costs no blood, and is still a wrong answer in every
 *     other respect, so there is nothing to gain by missing on purpose;
 *   - a built answer is graded exactly as a chosen one is.
 */
'use strict';

/* Everything below runs in the page. `ask` puts one topic on screen in a fight
 * that cannot end and cannot slam, with the mastery record the claim needs. */
const SETUP = () => {
  window.__L = {
    begin() {
      Prefs.d.motion = false;
      Battle.begin(0, 0);
    },
    // rec: undefined → never met;  a number → mastery, practised just now
    ask(key, rec, opts) {
      opts = opts || {};
      if (rec === undefined) delete Game.s.topicStats[key];
      else if (typeof rec === 'number')
        Game.s.topicStats[key] = { c: 5, w: 0, m: rec, seen: 5, last: Game.s.qCount, t: Date.now() };
      else Game.s.topicStats[key] = rec;
      Battle.realm = Object.assign({}, REALMS[0], { pool: [key] });
      Battle.foe = Object.assign({}, Battle.foe, { atk: 30, boss: !!opts.boss });
      Battle.fi = opts.fi || 0;
      Battle.emax = Battle.ehp = 1e6; Battle.over = null;
      Battle.charge = 0; Battle.chargeMax = 99; Battle.slamNext = false;
      Battle.combo = opts.combo || 0;
      Game.s.hp = Game.s.maxHp;
      Mastery._last = null;
      Battle.nextQuestion();
      return __L.see();
    },
    see() {
      const p = Battle.lesson, st = Battle.step();
      const text = el => el ? el.innerText : '';
      return {
        key: Battle.cur.key,
        stage: p && p.stage, format: p && p.format,
        choices: [...document.querySelectorAll('#choices .choice')].map(b => b.innerHTML),
        right: document.querySelectorAll('#choices .choice[data-correct="1"]').length,
        card: text(document.querySelector('#lcard .lcard')),
        cardHasWorked: !!document.querySelector('#lcard .lcard details .wksteps'),
        chip: text(document.querySelector('#qtopic .lsn')),
        claim: (document.querySelector('#qbox .claim') || {}).innerHTML || '',
        building: !!document.querySelector('#pstrike .bld'),
        pad: !!document.querySelector('#pad'),
        perfectOffered: !!document.getElementById('pgo'),
        insight: !(document.querySelector('[data-pw="insight"]') || { className: 'off' }).className.includes('off'),
        diff: Battle.curDiff, a: st.a, realA: Battle.cur.a
      };
    },
    rec(key) { return Object.assign({}, Game.s.topicStats[key || Battle.cur.key] || {}); },
    // Answer through the buttons. `right` false picks a wrong answer.
    answer(right) {
      const st = Battle.step();
      const sel = right === false ? ':not([data-correct="1"])' : '[data-correct="1"]';
      const b = document.querySelector('#choices .choice' + sel);
      if (b) { b.click(); return true; }
      const pad = k => document.querySelector(`#pad button[data-k="${k}"]`);
      if (pad('ok')) {
        const a = right === false ? '999' : String(st.a);
        for (const ch of a.replace('−', '')) pad(ch).click();
        if (a.startsWith('−')) pad('−').click();
        pad('ok').click(); return true;
      }
      const nums = String(st.a).match(/−?\d+/g) || [];
      nums.forEach((n, i) => {
        document.querySelector(`#pstrike .bslot[data-i="${i}"]`).click();
        let tile = document.querySelector(`#pstrike .btile[data-v="${n}"]`);
        if (right === false && i === 0)
          tile = [...document.querySelectorAll('#pstrike .btile')].find(x => x.dataset.v !== n);
        tile.click();
      });
      document.querySelector('#pstrike #bgo').click(); return true;
    },
    explain() { return document.getElementById('explain').innerText; },
    next() { const b = document.getElementById('contBtn'); if (b) b.click(); }
  };
};

module.exports = {
  name: 'lesson',
  title: 'S14 · taught before it is tested',
  async run(t) {
    await t.newKnight('Pupil');
    await t.ev(SETUP);

    // ------------------------------------------------------------------
    // Every topic can be introduced, because every topic has a rule.
    // ------------------------------------------------------------------
    const rules = await t.ev(() => {
      const bad = [];
      for (const k of Object.keys(GEN)) {
        const q = buildQuestion(k, 1);
        if (!q.codex || !q.codex.rule || q.codex.rule.length > 200 || !q.codex.eg) bad.push(k);
      }
      const shadowed = Object.keys(RULES).filter(k => !GEN[k] || GEN[k](1).codex);
      return { n: Object.keys(GEN).length, bad, shadowed };
    });
    t.eq('all seventy topics carry a rule and a small example', rules.bad, []);
    t.eq('and no fallback rule hides one written beside its generator', rules.shadowed, []);

    // ------------------------------------------------------------------
    // Where a topic stands is read off faded mastery, and stored nowhere.
    // ------------------------------------------------------------------
    const bands = await t.ev(() => {
      const now = Date.now(), day = 864e5, out = {};
      const at = m => { Game.s.topicStats.dot = { c: 5, w: 0, m, seen: 5, last: 0, t: now }; return Lesson.stage('dot'); };
      delete Game.s.topicStats.dot;
      out.unseen = Lesson.stage('dot');
      out.rungs = [0.05, 0.25, 0.5, 0.7, 0.9].map(at);
      out.edges = [Lesson.MEET, Lesson.TF, Lesson.CHOOSE, Lesson.BUILD];

      // The same record, a month on: nothing rewritten, and the rung has fallen.
      Game.s.topicStats.dot = { c: 4, w: 0, m: 0.9, seen: 4, last: 0, t: now };
      out.fresh = Lesson.stage('dot');
      Game.s.topicStats.dot.t = now - 4 * day;
      out.aFewDays = Lesson.stage('dot');
      Game.s.topicStats.dot.t = now - 30 * day;
      out.aMonth = Lesson.stage('dot');
      out.storedUnchanged = Game.s.topicStats.dot.m === 0.9;

      // A topic met forty times barely moves in the same month.
      Game.s.topicStats.dot = { c: 40, w: 0, m: 0.95, seen: 40, last: 0, t: now - 30 * day };
      out.solidAMonth = Lesson.stage('dot');

      Prefs.d.lessons = false;
      delete Game.s.topicStats.dot;
      out.switchedOff = Lesson.stage('dot');
      Prefs.d.lessons = true;
      return out;
    });
    t.eq('a topic never met is at the first meeting', bands.unseen, 'meet');
    t.eq('and mastery walks it up the four rungs and off the top',
      bands.rungs, ['meet', 'tf', 'choose', 'build', 'free']);
    t.eq('a topic practised today, and known, is past the ladder', bands.fresh, 'free');
    t.ok('left alone a few days, it has come down a rung',
      ['build', 'choose'].includes(bands.aFewDays), bands.aFewDays);
    t.eq('left alone a month, it is re-introduced from the start', bands.aMonth, 'meet');
    t.ok('and nothing in the save was rewritten to make that happen', bands.storedUnchanged);
    t.ok('a topic met forty times is not sent back by the same month',
      bands.solidAMonth !== 'meet' && bands.solidAMonth !== 'tf', bands.solidAMonth);
    t.eq('with lessons switched off, nothing is re-shaped', bands.switchedOff, 'free');

    // ------------------------------------------------------------------
    // A clean run climbs one rung an answer, and lands clear of every edge.
    // ------------------------------------------------------------------
    const climb = await t.ev(() => {
      __L.begin();
      const edges = [Lesson.MEET, Lesson.TF, Lesson.CHOOSE, Lesson.BUILD];
      const run = key => {
        const forms = [], ms = [];
        let s = __L.ask(key, undefined);
        for (let i = 0; i < 7; i++) {
          forms.push(s.format + (s.stage !== s.format && s.stage !== 'free' ? '(' + s.stage + ')' : ''));
          __L.answer(true); __L.next();
          ms.push(__L.rec(key).m);
          Battle.charge = 0; Battle.slamNext = false; Battle.ehp = 1e6;
          s = __L.see();
        }
        const nearest = Math.min(...ms.slice(0, 5).map(m => Math.min(...edges.map(e => Math.abs(m - e)))));
        return { forms, nearest, seen: __L.rec(key).seen };
      };
      return { vec: run('vecAdd'), int: run('det2'), mtx: run('matVec'), sym: run('powerRule') };
    });
    const CLIMB = ['meet', 'tf', 'choose', 'build', 'build', 'choose', 'choose'];
    t.eq('a vector topic: meet, judge, choose, build twice, then free', climb.vec.forms, CLIMB);
    t.eq('a whole-number topic climbs the same way', climb.int.forms, CLIMB);
    t.eq('and a matrix topic', climb.mtx.forms, CLIMB);
    t.eq('an answer that cannot be built is chosen on the build rung instead',
      climb.sym.forms, ['meet', 'tf', 'choose', 'choose(build)', 'choose(build)', 'choose', 'choose']);
    t.ok('no landing sits within 0.02 of a band edge',
      Math.min(climb.vec.nearest, climb.int.nearest) > 0.02, String(climb.vec.nearest));
    t.ok('the two easy rungs counted for less than a whole answer each',
      Math.abs(climb.vec.seen - (0.6 + 0.6 + 5)) < 1e-9, String(climb.vec.seen));

    // ------------------------------------------------------------------
    // The first meeting.
    // ------------------------------------------------------------------
    const meet = await t.ev(() => {
      const out = {};
      const s = __L.ask('det2', undefined, { boss: true, fi: 3, combo: 4 });
      out.see = s;
      out.threeDistinct = new Set(s.choices).size === 3;
      out.subsetOfFour = s.choices.every(c => Battle.cur.choices.includes(c));
      out.rule = buildQuestion('det2', 1).codex.rule;

      // a wrong answer
      const hp = Game.s.hp, missed = Battle.missed, wrongBefore = Game.s.stats.wrong;
      __L.answer(false);
      out.wrong = { hpLost: hp - Game.s.hp, combo: Battle.combo, missed: Battle.missed - missed,
        rec: __L.rec('det2'), counted: Game.s.stats.wrong - wrongBefore,
        dealt: 1e6 - Battle.ehp, text: __L.explain() };
      __L.next();
      out.afterWrong = __L.see().stage;

      // the same miss with a stake riding on it and a steady hand raised
      __L.ask('det2', undefined);
      Battle.diceUp = true; Battle.steadyUp = true; Battle.combo = 3;
      __L.answer(false);
      out.staked = { hpLost: Game.s.maxHp - Game.s.hp, dice: Battle.diceUp, steady: Battle.steadyUp, combo: Battle.combo };
      Battle.steadyUp = false;
      __L.next();

      // the wind-up is the foe's own clock, and lands regardless
      __L.ask('det2', undefined);
      Battle.slamNext = true;
      __L.answer(false);
      out.slammed = Game.s.maxHp - Game.s.hp;
      __L.next();

      // a right one
      __L.ask('det2', undefined);
      __L.answer(true);
      out.right = { rec: __L.rec('det2'), dealt: 1e6 - Battle.ehp, combo: Battle.combo };
      __L.next();
      return out;
    });
    t.eq('a first meeting is tagged as one', meet.see.format, 'meet');
    t.eq('it offers three answers', meet.see.choices.length, 3);
    t.ok('all different, exactly one of them right, all from the real question',
      meet.threeDistinct && meet.see.right === 1 && meet.subsetOfFour);
    t.ok('the rule is on screen above the question', meet.see.card.includes(meet.rule), meet.see.card.slice(0, 80));
    t.ok('with a whole problem worked through, folded beneath it', meet.see.cardHasWorked);
    t.eq('the numbers are kept small, even against a boss', meet.see.diff, 1);
    t.ok('nothing is offered that would answer it for you',
      !meet.see.perfectOffered && !meet.see.insight);
    t.eq('getting it wrong draws no blood', meet.wrong.hpLost, 0);
    t.eq('but it breaks the streak', meet.wrong.combo, 0);
    t.eq('deals nothing', meet.wrong.dealt, 0);
    t.eq('ends a flawless fight', meet.wrong.missed, 1);
    t.ok('and is recorded as the wrong answer it was',
      meet.wrong.counted === 1 && meet.wrong.rec.w === 0.6 && meet.wrong.rec.m === 0, JSON.stringify(meet.wrong.rec));
    t.ok('the panel says why no blow landed', /no blow lands on a first meeting/i.test(meet.wrong.text), meet.wrong.text.slice(0, 80));
    t.eq('a topic met and missed is met again', meet.afterWrong, 'meet');
    t.ok('a stake is spent on it; a steady hand is kept for a miss that costs something',
      meet.staked.hpLost === 0 && meet.staked.dice === false && meet.staked.steady === true && meet.staked.combo === 0,
      JSON.stringify(meet.staked));
    t.ok('the foe\'s wind-up still lands on its own clock', meet.slammed > 0, String(meet.slammed));
    t.ok('a right answer strikes', meet.right.dealt > 0 && meet.right.combo === 1);
    t.ok('and counts for six-tenths of an answer',
      Math.abs(meet.right.rec.seen - 0.6) < 1e-9 && Math.abs(meet.right.rec.m - 0.3) < 1e-9, JSON.stringify(meet.right.rec));

    // ------------------------------------------------------------------
    // True or false.
    // ------------------------------------------------------------------
    const tf = await t.ev(() => {
      const out = { trues: 0, falses: 0, badClaim: 0, badKey: 0, nonTrap: 0, n: 0 };
      for (let i = 0; i < 60; i++) {
        const s = __L.ask(i % 2 ? 'vecAdd' : 'det2', 0.25);
        const q = Battle.cur, st = Battle.step();
        out.n++;
        if (st.truth) out.trues++; else out.falses++;
        if (st.truth !== (st.claim === q.a)) out.badClaim++;
        if ((st.a === Lesson.TRUE) !== st.truth) out.badKey++;
        if (!st.truth) {
          const traps = q.choices.filter(c => c !== q.a && q.why[c]);
          if (!q.choices.includes(st.claim) || (traps.length && !traps.includes(st.claim))) out.nonTrap++;
        }
        if (i === 0) out.first = s;
      }
      // a false claim, called true: an ordinary miss
      let s, tries = 0; do { s = __L.ask('det2', 0.25); } while (Battle.step().truth && ++tries < 200);
      out.falseClaim = Battle.step().claim; out.falseReal = Battle.cur.a;
      [...document.querySelectorAll('#choices .choice')].find(b => b.innerHTML === Lesson.TRUE).click();
      out.calledTrue = { hpLost: Game.s.maxHp - Game.s.hp, rec: __L.rec('det2'), text: __L.explain() };
      __L.next();
      // a true claim, called true
      tries = 0; do { s = __L.ask('det2', 0.25); } while (!Battle.step().truth && ++tries < 200);
      const before = __L.rec('det2');
      __L.answer(true);
      out.right = { dealt: 1e6 - Battle.ehp, seenUp: __L.rec('det2').seen - before.seen, text: __L.explain() };
      __L.next();
      // asking to be shown works the problem, not the claim
      __L.ask('det2', 0.25);
      const b4 = JSON.stringify(__L.rec('det2')), real = Battle.cur.a;
      document.getElementById('wgo').click();
      out.shown = { text: __L.explain(), real, untouched: JSON.stringify(__L.rec('det2')) === b4 };
      __L.next();
      return out;
    });
    t.eq('a claim to judge offers two answers', tf.first.choices.length, 2);
    t.ok('and shows the claim', tf.first.claim.length > 0 && tf.first.right === 1);
    t.ok('true and false both come up', tf.trues >= 12 && tf.falses >= 12, `${tf.trues} true, ${tf.falses} false`);
    t.eq('the claim is the answer exactly when it is called true', tf.badClaim + tf.badKey, 0);
    t.eq('a false claim is always one of the question\'s diagnosed mistakes', tf.nonTrap, 0);
    t.ok('calling a false claim true is an ordinary miss, blood and all', tf.calledTrue.hpLost > 0, String(tf.calledTrue.hpLost));
    t.ok('the panel names the real answer, never "the answer was False"',
      tf.calledTrue.text.includes(tf.falseReal) && !/answer was\s+[✔✘]/.test(tf.calledTrue.text), tf.calledTrue.text.slice(0, 120));
    t.ok('a right call strikes', tf.right.dealt > 0);
    t.ok('and counts for six-tenths', Math.abs(tf.right.seenUp - 0.6) < 1e-9, String(tf.right.seenUp));
    t.ok('being shown the working shows the problem\'s own answer',
      tf.shown.text.includes('The answer is ' + tf.shown.real), tf.shown.text.slice(-80));
    t.ok('and still records nothing', tf.shown.untouched);

    // ------------------------------------------------------------------
    // Building an answer.
    // ------------------------------------------------------------------
    const shapes = await t.ev(() => {
      const out = { roundTrip: 0, bankShort: 0, bankMissing: 0, unsorted: 0, kinds: {}, noBuild: [] };
      const val = s => Number(String(s).replace('−', '-'));
      for (const k of Object.keys(GEN)) for (let d = 1; d <= 3; d++) for (let r = 0; r < 4; r++) {
        const q = buildQuestion(k, d), sh = Lesson.shape(q.a);
        if (!sh) continue;
        (out.kinds[sh] = out.kinds[sh] || new Set()).add(k);
        const { nums, gaps } = Lesson.pieces(q.a);
        if (Lesson.join(gaps, nums) !== q.a) out.roundTrip++;
        if (sh !== 'int') {
          const bank = Lesson.bank(nums, q.choices);
          if (bank.length < 6) out.bankShort++;
          if (!nums.every(n => bank.includes(n))) out.bankMissing++;
          if (bank.some((x, i) => i && val(bank[i - 1]) > val(x))) out.unsorted++;
        }
        if (Lesson.NO_BUILD[k] && Lesson.buildable(q)) out.noBuild.push(k);
      }
      for (const s of Object.keys(out.kinds)) out.kinds[s] = [...out.kinds[s]].sort();
      out.rejects = ['3x⁵ + C', 'x = −5, y = 1', 'Diverges', '90°', '<span class="frac"><span>1</span><span>2</span></span>']
        .map(a => Lesson.shape(a));
      return out;
    });
    t.ok('whole numbers, vectors and matrices can all be built',
      shapes.kinds.int.includes('det2') && shapes.kinds.vec.includes('vecAdd') && shapes.kinds.mtx.includes('matMul'),
      JSON.stringify(shapes.kinds));
    t.eq('anything with more structure than that is chosen', shapes.rejects, [null, null, null, null, null]);
    t.eq('every buildable answer splits and rejoins to exactly itself', shapes.roundTrip, 0);
    t.eq('the tiles always include every number the answer needs', shapes.bankMissing, 0);
    t.eq('there are never fewer than six', shapes.bankShort, 0);
    t.eq('and they are laid out in order', shapes.unsorted, 0);
    t.eq('an answer with more than one right form is never built', shapes.noBuild, []);

    const build = await t.ev(() => {
      const out = {};
      // a vector, built right
      let s = __L.ask('vecAdd', 0.7);
      out.see = s;
      out.strikeShut = document.querySelector('#pstrike #bgo').disabled;
      const nums = Battle.cur.a.match(/−?\d+/g);
      document.querySelector(`#pstrike .btile[data-v="${nums[0]}"]`).click();
      out.halfShut = document.querySelector('#pstrike #bgo').disabled;
      document.querySelector(`#pstrike .btile[data-v="${nums[1]}"]`).click();
      out.fullOpen = !document.querySelector('#pstrike #bgo').disabled;
      const before = __L.rec('vecAdd');
      const banners = [], realBanner = Celebrate.banner;
      Celebrate.banner = (title) => { banners.push(title); };
      document.querySelector('#pstrike #bgo').click();
      Celebrate.banner = realBanner;
      out.right = { dealt: 1e6 - Battle.ehp, combo: Battle.combo, seenUp: __L.rec('vecAdd').seen - before.seen,
        text: __L.explain(), banners };
      __L.next();

      // the same, built as the question's own diagnosed mistake: u − v
      __L.ask('vecAdd', 0.7);
      const q = Battle.cur, trap = q.choices.find(c => c !== q.a && q.why[c] && Lesson.shape(c) === 'vec');
      out.hadTrap = !!trap;
      if (trap) {
        Lesson._b.vals = trap.match(/−?\d+/g); Lesson.paintBuild();
        document.querySelector('#pstrike #bgo').click();
        out.trap = { hpLost: Game.s.maxHp - Game.s.hp, text: __L.explain(), why: q.why[trap], a: q.a };
        __L.next();
      }

      // a matrix fills in reading order when nothing but tiles is tapped
      __L.ask('transpose', 0.7);
      const m = Battle.cur.a.match(/−?\d+/g);          // column-major: TL, BL, TR, BR
      const reading = [m[0], m[2], m[1], m[3]];
      reading.forEach(n => document.querySelector(`#pstrike .btile[data-v="${n}"]`).click());
      out.mtxFilled = Lesson._b && Lesson._b.vals.join() === m.join();
      document.querySelector('#pstrike #bgo').click();
      out.mtxRight = Battle.combo > 0;
      __L.next();

      // a whole number takes the keypad it always had
      s = __L.ask('det2', 0.7);
      out.intSee = s;
      __L.answer(true);
      out.intRight = 1e6 - Battle.ehp > 0;
      __L.next();

      // past the ladder, building is offered rather than required — for vectors too
      s = __L.ask('vecAdd', 0.95);
      out.free = s;
      document.getElementById('pgo').click();
      out.freeOpens = !!document.querySelector('#pstrike .bld') && document.querySelectorAll('#choices .choice').length === 0;
      __L.answer(true); __L.next();
      out.eigen = __L.ask('eigenvec', 0.95);
      out.eigenBuild = __L.ask('eigenvec', 0.7);
      return out;
    });
    t.eq('on the build rung no answers are offered', build.see.choices.length, 0);
    t.ok('the slots open by themselves', build.see.building && build.see.format === 'build');
    t.ok('the strike stays shut until every slot is filled',
      build.strikeShut && build.halfShut && build.fullOpen);
    t.ok('a built answer strikes', build.right.dealt > 0 && build.right.combo === 1);
    t.ok('as a Perfect Strike — built, not chosen', build.right.banners.includes('PERFECT STRIKE'), build.right.banners.join());
    t.eq('and counts as a whole answer', build.right.seenUp, 1);
    t.ok('a vector question carries a mistake that can be built', build.hadTrap);
    t.ok('building the diagnosed mistake is a miss', build.trap && build.trap.hpLost > 0);
    t.ok('and is explained as that mistake, by the same words a chosen one gets',
      build.trap && build.trap.text.includes(build.trap.why) && build.trap.text.includes(build.trap.a),
      build.trap && build.trap.text.slice(0, 140));
    t.ok('a matrix fills row by row, the way it is read', build.mtxFilled && build.mtxRight);
    t.ok('a whole number is typed on the keypad', build.intSee.pad && !build.intSee.building && build.intRight);
    t.ok('past the ladder the four answers are back, with building on offer',
      build.free.choices.length === 4 && build.free.perfectOffered && build.free.chip === '');
    t.ok('and taking the offer swaps the answers for slots', build.freeOpens);
    t.ok('an eigenvector is never built: any multiple of it is right',
      !build.eigen.perfectOffered && build.eigenBuild.choices.length === 4 && build.eigenBuild.format === 'choose');

    // ------------------------------------------------------------------
    // A complex topic keeps its ladder of steps, and gains the card.
    // ------------------------------------------------------------------
    const rite = await t.ev(() => {
      const out = {};
      const s = __L.ask('matMul', undefined);
      out.first = { format: s.format, card: s.card.length > 0, rite: !!Battle.rite, n: s.choices.length, chip: s.chip };
      __L.answer(true); __L.next();
      const s2 = __L.see();
      out.second = { card: s2.card.length > 0, rite: !!Battle.rite };
      const later = __L.ask('matMul', 0.5);
      out.later = { format: later.format, card: later.card.length > 0, chip: later.chip };
      return out;
    });
    t.ok('a ladder topic still arrives as its ladder', rite.first.rite && rite.first.format === 'rite' && rite.first.n === 4);
    t.ok('with the rule card over its first rung', rite.first.card && /first meeting/i.test(rite.first.chip));
    t.ok('and only its first', rite.second.rite && !rite.second.card);
    t.ok('once met, the ladder is the whole of its teaching', rite.later.format === 'rite' && !rite.later.card && rite.later.chip === '');

    // ------------------------------------------------------------------
    // The daily is the same twelve problems for everyone.
    // ------------------------------------------------------------------
    const daily = await t.ev(() => {
      Game.s.topicStats = {};
      Battle.beginDaily();
      const out = { lesson: Battle.lesson, n: document.querySelectorAll('#choices .choice').length,
        card: document.getElementById('lcard').innerHTML, chip: !!document.querySelector('#qtopic .lsn') };
      Battle.flee();
      return out;
    });
    t.ok('the daily skirmish is never re-shaped by what one knight knows',
      daily.lesson === null && daily.n === 4 && daily.card === '' && !daily.chip, JSON.stringify(daily));

    // ------------------------------------------------------------------
    // The training yard teaches the same way.
    // ------------------------------------------------------------------
    const yard = await t.ev(() => {
      const out = {};
      const see = () => ({
        format: Train.lesson && Train.lesson.format,
        n: document.querySelectorAll('#tChoices .choice').length,
        card: document.getElementById('tCard').innerText,
        building: !!document.querySelector('#tChoices .bld')
      });
      Game.s.topicStats = {};
      UI.go('s-train'); Train.startPool('vecAdd');
      out.meet = see();
      document.querySelector('#tChoices .choice[data-correct="1"]').click();
      out.meetSeen = Game.s.topicStats.vecAdd.seen;
      Train.next(); out.tf = see();
      document.querySelector('#tChoices .choice[data-correct="1"]').click();
      Train.next(); out.choose = see();
      document.querySelector('#tChoices .choice[data-correct="1"]').click();
      Train.next(); out.build = see();
      const nums = Train.cur.a.match(/−?\d+/g);
      nums.forEach(n => document.querySelector(`#tChoices .btile[data-v="${n}"]`).click());
      const c = Train.c;
      document.querySelector('#tChoices #bgo').click();
      out.builtRight = Train.c === c + 1;
      out.builtShown = !!document.querySelector('#tChoices .choice.right') && !document.querySelector('#tChoices .bld');

      // a typed whole number: "007" is seven, and ± makes it negative
      const got = [];
      const host = document.createElement('div'); document.body.appendChild(host);
      Lesson.build(host, '7', [], v => got.push(v));
      ['0', '0', '7'].forEach(k => host.querySelector(`.btile[data-k="${k}"]`).click());
      host.querySelector('#bgo').click();
      Lesson.build(host, '−12', [], v => got.push(v));
      ['1', '2', '±'].forEach(k => host.querySelector(`.btile[data-k="${k}"]`).click());
      host.querySelector('#bgo').click();
      Lesson.build(host, '5', [], v => got.push(v));
      host.querySelector('.btile[data-k="±"]').click();
      out.loneMinusShut = host.querySelector('#bgo').disabled;
      host.remove();
      out.typed = got;
      UI.go('s-title');
      return out;
    });
    t.ok('the yard meets a new topic with the card and three answers',
      yard.meet.format === 'meet' && yard.meet.n === 3 && yard.meet.card.length > 20, JSON.stringify(yard.meet));
    t.ok('weighs it as a fight does', Math.abs(yard.meetSeen - 0.6) < 1e-9, String(yard.meetSeen));
    t.ok('then a claim, then a choice, then a build',
      yard.tf.format === 'tf' && yard.tf.n === 2 && yard.choose.format === 'choose' && yard.choose.n === 4
      && yard.build.format === 'build' && yard.build.building, JSON.stringify([yard.tf, yard.choose, yard.build]));
    t.ok('a build in the yard is graded, and what was built stays to be read', yard.builtRight && yard.builtShown);
    t.eq('typed numbers are read as numbers', yard.typed, ['7', '−12']);
    t.ok('and a minus sign alone is not an answer', yard.loneMinusShut);

    // ------------------------------------------------------------------
    // The rooms of a descent keep their own form, and gain the rule.
    // ------------------------------------------------------------------
    const sideRooms = await t.ev(() => {
      const out = { seen: {}, known: {} };
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 0 };
      const cardIn = id => !!document.getElementById(id).closest('.panel').querySelector('.lcard');
      // never met: the rule is above the question, and the four answers are still there
      Game.s.topicStats = {};
      R.seed(11); const spec = RoomKinds.seam.build(R, 6, SETTINGS.deep); R.unseed();
      Seam.begin(spec, { depth: 6 }, () => {}); Seam.cut(1);
      out.seen.seam = { card: cardIn('seamChoices'), choices: document.querySelectorAll('#seamChoices .choice').length };
      // the same seam, once its topic is known: no card
      Game.s.topicStats[spec.qs[0].key] = { c: 5, w: 0, m: 0.9, seen: 5, last: 0, t: Date.now() };
      Seam.begin(spec, { depth: 6 }, () => {}); Seam.cut(1);
      out.known.seam = cardIn('seamChoices');
      // the card for a room draws nothing from the dice
      Game.s.topicStats = {};
      const q = buildQuestion('det2', 1);
      const realR = R._r; let drew = 0; R._r = () => { drew++; return realR(); };
      const html = Lesson.roomCard(q);
      R._r = realR;
      out.plain = { drew, hasRule: html.includes(q.codex.rule), noWorked: !/Watch one worked/.test(html) };
      // the fight's own card may: it rolls a worked example
      R._r = () => { drew++; return realR(); }; drew = 0;
      const full = Lesson.card(q);
      R._r = realR;
      out.full = { drew, worked: /Watch one worked/.test(full) };
      Game.s.topicStats.det2 = { c: 5, w: 0, m: 0.9, seen: 5, last: 0, t: Date.now() };
      out.noneWhenKnown = Lesson.roomCard(q);
      UI.go('s-title');
      return out;
    });
    t.ok('a seam on a topic never met shows the rule above the question',
      sideRooms.seen.seam.card === true && sideRooms.seen.seam.choices === 4, JSON.stringify(sideRooms.seen));
    t.eq('and does not once the topic is known', sideRooms.known.seam, false);
    t.ok('a room\'s card carries the rule and no worked example', sideRooms.plain.hasRule && sideRooms.plain.noWorked);
    t.eq('so it draws nothing from the dice a seeded room is rebuilt from', sideRooms.plain.drew, 0);
    t.ok('where a fight\'s card rolls one', sideRooms.full.worked && sideRooms.full.drew > 0);
    t.eq('no card at all for a topic past its first meeting', sideRooms.noneWhenKnown, '');

    // ------------------------------------------------------------------
    // The end of a fight says what it taught.
    // ------------------------------------------------------------------
    const taught = await t.ev(() => {
      const out = {};
      __L.begin();
      __L.ask('vecAdd', undefined); __L.answer(true); __L.next();
      __L.ask('det2', 0.7); __L.answer(false); __L.next();
      __L.ask('dot', 0.5);
      document.getElementById('wgo').click(); __L.next();      // shown: records nothing
      out.learned = JSON.parse(JSON.stringify(Battle.learned));
      const host = document.createElement('div'); host.innerHTML = Battle.learnedHtml();
      out.rows = [...host.querySelectorAll('[data-learned]')].map(r => r.dataset.learned);
      out.text = host.innerText || host.textContent;
      // a new fight starts with nothing learned
      Battle.begin(0, 0);
      out.fresh = { n: Object.keys(Battle.learned).length, html: Battle.learnedHtml() };
      Battle.flee();
      return out;
    });
    t.ok('a topic that rose is listed with where it started and where it stands',
      taught.rows.includes('vecAdd') && /0% → 30%/.test(taught.text), taught.text.slice(0, 160));
    t.ok('one that fell is listed too', taught.rows.includes('det2') && taught.learned.det2.to < taught.learned.det2.from);
    t.ok('one that was only shown is not: nothing moved', !taught.rows.includes('dot') && !taught.learned.dot);
    t.ok('rises come before falls', taught.rows.indexOf('vecAdd') < taught.rows.indexOf('det2'));
    t.ok('and a new fight begins with nothing to report', taught.fresh.n === 0 && taught.fresh.html === '');

    // ------------------------------------------------------------------
    // Answer tiles: lettered, side by side when short, and answerable by key.
    // ------------------------------------------------------------------
    const tiles = await t.ev(() => {
      const out = {};
      const press = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      const box = () => document.getElementById('choices');
      __L.begin();
      const s1 = __L.ask('det2', 0.9);
      out.short = { grid: box().classList.contains('grid2'), tiles: box().classList.contains('tiles'),
        letter: getComputedStyle(box().querySelector('.choice'), '::before').content,
        markup: s1.choices.every(c => [...box().querySelectorAll('.choice')].some(b => b.innerHTML === c)) };
      // "x = −3 and x = 3" is never fewer than fifteen characters
      __L.ask('critical', 0.9);
      out.long = box().classList.contains('grid2');
      __L.ask('vecAdd', 0.25);
      out.tf = box().classList.contains('grid2') && box().querySelectorAll('.choice').length === 2;

      // a key answers: the letter of the right one
      __L.ask('det2', 0.9);
      const i = [...box().querySelectorAll('.choice')].findIndex(b => b.dataset.correct === '1');
      const combo = Battle.combo;
      press('abcd'[i]);
      out.byLetter = { answered: Battle.answered, right: Battle.combo === combo + 1,
        tick: getComputedStyle(box().querySelector('.choice.right'), '::before').content };
      // a second key does nothing once the turn is answered
      press('abcd'[(i + 1) % 4]);
      out.noSecond = Battle.combo === combo + 1 && !box().querySelector('.choice.wrong');
      // Enter moves on
      press('Enter');
      out.enterMoves = !Battle.answered;
      // and digits work as letters do
      const j = [...box().querySelectorAll('.choice')].findIndex(b => b.dataset.correct === '1');
      press(String(j + 1));
      out.byDigit = Battle.answered;
      press('Enter');

      // a faded answer cannot be picked by key
      __L.ask('det2', 0.9);
      const wrong = [...box().querySelectorAll('.choice')].map((b, k) => [b, k]).filter(([b]) => b.dataset.correct !== '1')[0];
      wrong[0].classList.add('faded');
      press('abcd'[wrong[1]]);
      out.fadedIgnored = !Battle.answered;

      // nor while the scratch pad is open, nor with a modifier held
      Calc.open(); press('abcd'[wrong[1] === 0 ? 1 : 0]); out.calcBlocks = !Battle.answered; Calc.close();
      const ri = [...box().querySelectorAll('.choice')].findIndex(b => b.dataset.correct === '1');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'abcd'[ri], ctrlKey: true, bubbles: true }));
      out.ctrlIgnored = !Battle.answered;

      // and not at all on a screen that asks nothing
      Battle.flee(); UI.go('s-map');
      const before = document.querySelector('.screen.on').id;
      press('a'); press('Enter');
      out.mapIgnores = document.querySelector('.screen.on').id === before;

      // the training yard lays out and answers the same way
      Game.s.topicStats.det2 = { c: 9, w: 0, m: 0.9, seen: 9, last: 0, t: Date.now() };
      UI.go('s-train'); Train.startPool('det2');
      const tb = document.getElementById('tChoices');
      out.yard = { grid: tb.classList.contains('grid2') };
      const c0 = Train.c;
      const yi = [...tb.querySelectorAll('.choice')].findIndex(b => b.dataset.correct === '1');
      press(String(yi + 1));
      out.yard.answered = Train.c === c0 + 1;
      press('Enter');
      out.yard.next = !!tb.querySelector('.choice:not(.right):not(.wrong):not(.faded)');
      UI.go('s-title');
      return out;
    });
    t.ok('short answers sit two by two, lettered, with their markup untouched',
      tiles.short.grid && tiles.short.tiles && /counter\(tile/.test(tiles.short.letter) && tiles.short.markup, JSON.stringify(tiles.short));
    t.ok('a long answer keeps the whole width', !tiles.long);
    t.ok('true and false sit side by side', tiles.tf);
    t.ok('pressing an answer\'s letter answers it', tiles.byLetter.answered && tiles.byLetter.right);
    t.ok('and the tile it chose is marked with a tick, not colour alone', /✓/.test(tiles.byLetter.tick), tiles.byLetter.tick);
    t.ok('a second key changes nothing once answered', tiles.noSecond);
    t.ok('Enter moves on', tiles.enterMoves);
    t.ok('a digit works as its letter does', tiles.byDigit);
    t.ok('an answer burned away cannot be picked by key', tiles.fadedIgnored);
    t.ok('keys go to the scratch pad while it is open', tiles.calcBlocks);
    t.ok('and a key with Ctrl held is left to the browser', tiles.ctrlIgnored);
    t.ok('a screen that asks nothing ignores them', tiles.mapIgnores);
    t.ok('the training yard lays out and answers the same way',
      tiles.yard.grid && tiles.yard.answered && tiles.yard.next, JSON.stringify(tiles.yard));

    // ------------------------------------------------------------------
    // Kept numbers: the pad holds a sum so the knight does not have to.
    // ------------------------------------------------------------------
    const kept = await t.ev(() => {
      const out = {};
      __L.begin(); __L.ask('det2', 0.5);
      Calc.open();
      const press = ks => ks.forEach(k => document.querySelector(`#calcKeys button[data-k="${k}"]`).click());
      press(['3', '×', '4', 'K']);
      out.afterKeep = { kept: Calc.kept.slice(), ex: Calc.ex };
      press(['K']);                                    // nothing typed: nothing kept
      press(['2', '+', 'K']);                          // not a whole sum: nothing kept
      out.onlyOne = Calc.kept.length;
      press(['C', '1', '−', '3', 'K']);
      out.two = Calc.kept.slice();
      out.onQuestion = document.querySelector('#qpanel .slate').innerText;
      // a kept number goes back into the sum
      press(['5']);
      document.querySelector('#calcPanel .slate button[data-kept="1"]').click();
      out.reused = Calc.ex;
      out.reusedValue = Calc.evaluate(Calc.ex);
      Calc.close();
      // never more than six
      Calc.kept = []; for (let i = 1; i <= 9; i++) { Calc.ex = String(i); Calc.keep(); }
      out.capped = Calc.kept.slice();
      // and the next question starts clean
      __L.answer(true); __L.next();
      out.afterNext = { kept: Calc.kept.length, shown: document.querySelector('#qpanel .slate').innerHTML };
      return out;
    });
    t.eq('Keep pins what the pad is showing', kept.afterKeep.kept, ['12']);
    t.eq('and clears the pad for the next sum', kept.afterKeep.ex, '');
    t.eq('half a sum is not kept, and nor is nothing', kept.onlyOne, 1);
    t.eq('a second result sits beside the first', kept.two, ['12', '−2']);
    t.ok('both are shown beside the question', /12/.test(kept.onQuestion) && /−2/.test(kept.onQuestion), kept.onQuestion);
    t.ok('tapping one drops it back into the sum being typed', kept.reused === '5+(−2)' && kept.reusedValue === 3, kept.reused);
    t.eq('the slate holds the last six', kept.capped, ['4', '5', '6', '7', '8', '9']);
    t.ok('and is wiped when the next question arrives', kept.afterNext.kept === 0 && kept.afterNext.shown === '');

    // ------------------------------------------------------------------
    // None of it is in the save.
    // ------------------------------------------------------------------
    const save = await t.ev(() => {
      const fields = new Set();
      for (const r of Object.values(Game.s.topicStats)) Object.keys(r).forEach(k => fields.add(k));
      return { fields: [...fields].sort(), keys: Object.keys(Game.s).filter(k => /lesson|stage|rung/i.test(k)),
        ver: Codec.VER };
    });
    t.ok('a topic\'s record holds only what it always held',
      save.fields.every(f => ['c', 'w', 'm', 'seen', 'last', 't', 'mastered'].includes(f)), save.fields.join());
    t.eq('the knight has no ladder written on it', save.keys, []);
    t.eq('and the knight code is the version it was', save.ver, 7);
  }
};
