/* Find the slip · a mastered topic, asked from the other side.
 *
 * Past the ladder, a topic is asked with its four answers, which tests the
 * method from one side only: getting it right. Now and then the same problem
 * is asked the other way round. A squire's wrong answer is shown, and the
 * question is which of three named mistakes made it. That is only answerable
 * by working the problem and then each mistake far enough to see where it
 * lands, and the verdict lays all three out beside the answers they give.
 *
 * These checks pin down the shape of that: it is only ever asked of a topic
 * past the ladder, with lessons on, outside the daily; the three mistakes are
 * the generator's own, all different, and none of them quotes an answer on
 * offer, nor echoes the squire's own words; it is a whole question that strikes and is struck like any other,
 * with no Perfect Strike and the working still on offer; picking the wrong
 * mistake is not recorded as making it; the yard asks it too; and nothing is
 * saved.
 */
'use strict';

const { sleep } = require('./harness');

const SETUP = () => {
  window.__F = {
    // A fight that cannot end, on one topic, with the record the claim needs.
    ask(key, rec) {
      if (rec === undefined) delete Game.s.topicStats[key];
      else Game.s.topicStats[key] = rec;
      Battle.realm = Object.assign({}, REALMS[0], { pool: [key] });
      Battle.emax = Battle.ehp = 1e6; Battle.over = null;
      Battle.charge = 0; Battle.chargeMax = 99; Battle.slamNext = false;
      Battle.redo = null; Battle.combo = 0;
      Game.s.maxHp = Game.s.hp = 99999;
      Mastery._last = null;
      Battle.nextQuestion();
      return __F.see();
    },
    held: () => ({ c: 30, w: 0, m: 0.97, seen: 30, last: Game.s.qCount, t: Date.now() }),
    see() {
      const p = Battle.lesson, st = Battle.step();
      const claim = document.querySelector('#qbox .claim');
      const shown = claim && claim.querySelector('.mtx');
      return {
        key: Battle.cur.key, format: p && p.format, stage: p && p.stage,
        choices: [...document.querySelectorAll('#choices .choice')].map(b => b.innerText.trim()),
        right: document.querySelectorAll('#choices .choice[data-correct="1"]').length,
        traps: document.querySelectorAll('#choices .choice[data-trap="1"]').length,
        chip: (document.querySelector('#qtopic .lsn') || {}).innerText || '',
        claim: claim ? claim.innerText : '',
        ask: (document.querySelector('#qbox .slipq') || {}).innerText || '',
        shownDisplay: shown ? getComputedStyle(shown).display : null,
        perfect: !!document.getElementById('pgo'),
        working: !!document.getElementById('wgo'),
        a: st.a, shownAns: st.shown, realA: Battle.cur.a
      };
    }
  };
};

module.exports = {
  name: 'findslip',
  title: 'Find the slip · a mastered topic, asked from the other side',
  viewport: { width: 390, height: 844 },
  slips: true,
  async run(t) {
    await t.newKnight('Ada');
    await t.ev(SETUP);
    await t.ev(() => { Prefs.d.motion = false; Battle.begin(0, 0); });
    await sleep(350);
    await t.ev(() => { Lesson.SLIP = 1; });

    // --- a held topic, asked the other way round ---
    const q = await t.ev(() => __F.ask('matPow', __F.held()));
    t.eq('a topic past the ladder can be asked as find the slip', q.format, 'slip');
    t.ok('and the tag says so', /find the slip/i.test(q.chip), q.chip);
    t.ok("the squire's answer is shown", /A squire answered/i.test(q.claim), q.claim);
    t.ok('and the question asks which slip gives it', /Which slip gives that/.test(q.ask), q.ask);
    t.eq('three mistakes are on offer', q.choices.length, 3);
    t.eq('one of them is the one that was made', q.right, 1);
    t.ok('all three are different', new Set(q.choices).size === 3, q.choices.join(' | '));
    const truth = await t.ev(() => {
      const c = Battle.cur, st = Battle.step();
      const names = c.choices.filter(x => x !== c.a && c.why[x]).map(x => Lesson.cap(c.why[x]));
      return { theirs: st._choices.every(n => names.includes(n)),
               shownWrong: st.shown !== c.a && c.choices.includes(st.shown),
               matches: Lesson.cap(c.why[st.shown]) === st.a };
    });
    t.ok("they are the generator's own diagnoses of this question's wrong answers", truth.theirs);
    t.ok("the squire's answer is one of the wrong answers", truth.shownWrong);
    t.ok('and the right pick is the diagnosis of that very answer', truth.matches);
    t.eq('none is marked as a trap of its own', q.traps, 0);
    t.eq('a matrix in the claim keeps its shape', q.shownDisplay, 'inline-grid');
    t.ok('there is nothing to build, so no Perfect Strike', !q.perfect);
    t.ok('the working of the problem is still on offer', q.working);

    // --- a right pick strikes, and the verdict lays out all three ---
    const hit = await t.ev(() => {
      const before = { ehp: Battle.ehp, seen: Game.s.topicStats.matPow.seen };
      document.querySelector('#choices .choice[data-correct="1"]').click();
      const e = document.getElementById('explain');
      return { dealt: before.ehp - Battle.ehp, combo: Battle.combo,
               seenUp: Game.s.topicStats.matPow.seen - before.seen,
               text: e.innerText, rows: e.querySelectorAll('.sltab .sl').length,
               was: e.querySelectorAll('.sltab .sl.was').length,
               redo: Battle.redo };
    });
    t.ok('a right pick strikes like any right answer', hit.dealt > 0 && hit.combo === 1, JSON.stringify(hit).slice(0, 200));
    t.eq('and counts as a whole answer on the topic', hit.seenUp, 1);
    t.ok("the verdict names the squire's slip", /The squire's slip/.test(hit.text), hit.text.slice(0, 200));
    t.eq('and lays each mistake beside the answer it gives', hit.rows, 3);
    t.eq("with the squire's own picked out", hit.was, 1);
    t.ok('and says what it comes to done right', /Done right, it comes to/.test(hit.text));
    t.eq('a right pick brings nothing back', hit.redo, null);

    // --- a wrong pick is a miss, but not a slip of the knight's own ---
    await t.ev(() => document.getElementById('contBtn').click());
    await sleep(250);
    await t.ev(() => __F.ask('matPow', __F.held()));
    const miss = await t.ev(() => {
      const hp = Game.s.hp, before = JSON.stringify(Slips.log);
      document.querySelector('#choices .choice:not([data-correct="1"])').click();
      return { hpLost: hp - Game.s.hp, combo: Battle.combo, slips: JSON.stringify(Slips.log) === before,
               text: document.getElementById('explain').innerText, redo: Battle.redo };
    });
    t.ok('a wrong pick is struck like any miss', miss.hpLost > 0 && miss.combo === 0, JSON.stringify(miss).slice(0, 160));
    t.ok('but picking the wrong mistake is not recorded as making it', miss.slips);
    t.ok('the verdict still lays out all three', /The squire's slip/.test(miss.text));
    t.eq('and one like it comes next, as after any miss', miss.redo && miss.redo.key, 'matPow');

    // --- only past the ladder, only with lessons on ---
    const fresh = await t.ev(() => __F.ask('matPow', undefined));
    t.eq('a topic never met is met, not asked about a squire', fresh.format, 'meet');
    const mid = await t.ev(() => __F.ask('matPow', { c: 5, w: 0, m: 0.5, seen: 5, last: Game.s.qCount, t: Date.now() }));
    t.ok('nor is a topic still on the ladder', mid.format !== 'slip', mid.format);
    const off = await t.ev(() => { Prefs.d.lessons = false; const s = __F.ask('matPow', __F.held()); Prefs.d.lessons = true; return s; });
    t.ok('with lessons switched off, the question is asked plain', off.format !== 'slip' && off.choices.length === 4, JSON.stringify(off).slice(0, 120));

    // --- a diagnosis that quotes an answer would give the match away ---
    const angle = await t.ev(() => __F.ask('angleVec', __F.held()));
    t.ok('where a mistake names an answer on offer, it is asked the plain way', angle.format === 'choose' && angle.choices.length === 4, angle.format);
    const leak = await t.ev(() => Lesson.quotes('45° needs cos θ = 0.71', '45°') && !Lesson.quotes('the 2 from differentiating', '−2'));
    t.ok('a quoted answer is told from a number that only looks like it', leak);

    // --- a mistake that echoes the squire's words would give itself away ---
    const echo = await t.ev(() => {
      const opts = ['You would need the angle between them', 'Only if they have the same length', 'Yes — they are perpendicular'];
      const names = ['You never need the angle; the dot product settles it',
                     'Equal length has nothing to do with meeting at a right angle',
                     'Their dot product is 14, not 0'];
      const flagged = Lesson.echoes(opts, names, opts[0]) && Lesson.echoes(opts, names, opts[1]);
      const fair = !Lesson.echoes(opts, names, opts[2])
        // a word two mistakes share with the answer singles neither out
        && !Lesson.echoes(['Only if both have the same length', 'No', 'Yes'],
                          ['Equal length is beside the point', 'A length of zero', 'The dot product decides'],
                          'Only if both have the same length')
        // and a word is the same word whatever its ending
        && Lesson.shared('the columns depend on it', 'one column depends on the others') === 2;
      Game.s.topicStats.orth = __F.held();
      let asked = 0, echoed = 0;
      for (let i = 0; i < 300; i++) {
        const q = buildQuestion('orth', 2), st = Lesson.slipStep(q);
        if (!st) continue;
        asked++;
        const o = q.choices.filter(c => c !== q.a && q.why[c]).slice(0, 3);
        if (Lesson.echoes(o, o.map(c => Lesson.cap(q.why[c])), st.shown)) echoed++;
      }
      return { flagged, fair, asked, echoed };
    });
    t.ok("a mistake sharing the squire's words is caught as an echo", echo.flagged && echo.fair, JSON.stringify(echo));
    t.ok('and the squire never gives an answer whose own slip echoes it', echo.asked > 200 && echo.echoed === 0, JSON.stringify(echo));

    // --- how often: now and then, not every time ---
    const share = await t.ev(() => {
      Lesson.SLIP = 0.2;
      Game.s.topicStats.matPow = __F.held();
      let n = 0;
      for (let i = 0; i < 600; i++) {
        const p = Lesson.plan(buildQuestion('matPow', 2), false);
        if (p.format === 'slip') n++;
      }
      return n / 600;
    });
    t.ok('a held topic is asked this way about one time in five', share > 0.12 && share < 0.28, String(share));

    // --- a ladder and the daily are left alone ---
    const rite = await t.ev(() => {
      Lesson.SLIP = 1;
      const q = buildQuestion('byParts', 2);
      return Lesson.plan(q, true).format;
    });
    t.eq('a complex topic arriving as its ladder keeps its own form', rite, 'rite');
    const daily = await t.ev(() => {
      Battle.flee();
      for (const k of Object.keys(TOPIC_LABEL)) Game.s.topicStats[k] = __F.held();
      Daily.start();
      const seen = [Battle.lesson];
      for (let i = 0; i < 5; i++) { Battle.answered = false; Battle.nextQuestion(); seen.push(Battle.lesson); }
      Battle.flee(); R.unseed();
      return seen.every(l => l === null);
    });
    t.ok('the daily, the same for everyone, is never re-shaped', daily);

    // --- the yard asks it too ---
    const yard = await t.ev(() => {
      Game.s.topicStats.matPow = __F.held();
      UI.go('s-train');
      Train.startPool('matPow');
      const n = document.querySelectorAll('#tChoices .choice').length;
      const chip = (document.querySelector('#tTopic .lsn') || {}).innerText || '';
      document.querySelector('#tChoices .choice[data-correct="1"]').click();
      return { n, chip, text: document.getElementById('tExplain').innerText };
    });
    t.ok('the Training Grounds ask it the same way', yard.n === 3 && /find the slip/i.test(yard.chip), JSON.stringify(yard).slice(0, 160));
    t.ok('and explain it the same way', /The squire's slip/.test(yard.text) && /^Correct/.test(yard.text.trim()));

    // --- nothing is saved ---
    t.ok('none of it is written into the save', await t.ev(() => !/squire|sltab|find the slip/i.test(JSON.stringify(Game.s))));

    await t.ev(() => { Lesson.SLIP = 0; UI.go('s-title'); });
  }
};
