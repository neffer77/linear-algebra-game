/* S13 — being shown the working.
 *
 * Every other teaching in this game arrives after you commit: answer, then read
 * why. That is right for practice and wrong for a player who is genuinely
 * stuck, because the only route to the explanation is a guess — and a lucky
 * guess banks mastery nobody has.
 *
 * So there is a door out: ask, and the problem is worked in front of you in
 * steps, ending on the answer. What it costs is the strike.
 *
 * Almost everything below is about the price, because a "solve it for me"
 * button is exactly the thing this project's rules exist to prevent. Three
 * properties have to hold or the whole mastery model is a decoration:
 *
 *   - It may not shorten a fight. The foe takes no damage, so the questions
 *     still have to be answered by somebody. This is the same rule every
 *     loadout ability is held to, asserted the same way.
 *   - It may not move mastery. Not the score, not the correct/wrong counts,
 *     not the question count — and NOT RECENCY, which is the one that would
 *     hurt. Recency is what the Scriptorium sells for pages; a button that
 *     quietly reset a topic's clock would be a free bench.
 *   - It may not leak. The flag that marks a turn as shown is per-question,
 *     and a ladder asks several questions per turn. If it survives a rung it
 *     follows the ladder out and steals credit for the assembled solution —
 *     which it did, in the first draft, and which the checks below now pin.
 */
'use strict';

module.exports = {
  name: 'working',
  title: 'S13 · shown is not known',
  async run(t) {
    await t.newKnight('Learner');

    // --- every question in the game can be worked ---
    const cover = await t.ev(() => {
      const out = { bad: [], sources: { ladder: 0, explanation: 0 }, min: 99, max: 0, n: 0 };
      for (const key of Object.keys(GEN)) {
        for (const d of [1, 2, 3]) {
          let q;
          try { R.seed(1000 + d * 77); q = buildQuestion(key, d); R.unseed(); }
          catch (e) { out.bad.push(key + ' threw'); continue; }
          out.n++;
          if (!Working.has(q)) { out.bad.push(key + ' d' + d); continue; }
          const w = Working.forStep(q);
          out.sources[w.source]++;
          out.min = Math.min(out.min, w.steps.length);
          out.max = Math.max(out.max, w.steps.length);
          // the working must end on the real answer, never on something else
          if (w.answer !== q.a) out.bad.push(key + ' d' + d + ' wrong answer');
          // and every step must actually say something
          if (w.steps.some(s => !s.why && !s.ask && !s.got)) out.bad.push(key + ' d' + d + ' empty step');
        }
      }
      out.topics = Object.keys(GEN).length;
      return out;
    });
    t.eq('every generator in the game can be worked', cover.bad, []);
    t.ok('across all seventy topics at three difficulties',
      cover.n >= 200 && cover.topics === 70, `${cover.n} questions, ${cover.topics} topics`);
    t.ok('some are worked from a hand-written ladder', cover.sources.ladder > 0,
      String(cover.sources.ladder));
    t.ok('and the rest from the explanation of that very instance',
      cover.sources.explanation > 0, String(cover.sources.explanation));
    t.ok('no working is empty', cover.min >= 1, String(cover.min));

    // --- a ladder is preferred over prose, because it was written by hand ---
    const prefers = await t.ev(() => {
      const out = {};
      R.seed(4242);
      const withLadder = buildQuestion('uSub', 2);
      R.unseed();
      out.hasMotes = Array.isArray(withLadder.motes) && withLadder.motes.length > 0;
      const w = Working.forStep(withLadder);
      out.source = w.source;
      out.steps = w.steps.length;
      out.motes = withLadder.motes.length;
      // every rung carries its own question, result and reason
      out.whole = w.steps.every(s => s.ask && s.got && s.why);
      // strip the ladder and the same question falls back to prose
      const bare = Object.assign({}, withLadder); delete bare.motes;
      out.fallback = Working.forStep(bare).source;
      out.fallbackSteps = Working.forStep(bare).steps.length;
      return out;
    });
    t.ok('the topic used here really does carry a ladder', prefers.hasMotes);
    t.eq('and the working is taken from it rather than from prose', prefers.source, 'ladder');
    t.eq('one step per rung', prefers.steps, prefers.motes);
    t.ok('each rung shows what was asked, what came out, and why', prefers.whole);
    t.eq('with the ladder gone it falls back to the explanation',
      prefers.fallback, 'explanation');
    t.ok('and still produces steps', prefers.fallbackSteps > 0, String(prefers.fallbackSteps));

    // --- the explanation splits into real steps, not one blob ---
    const split = await t.ev(() => {
      const out = {};
      out.three = Working.sentences('Add the slots. 7+3 = 10 on top. Then walk along v.').length;
      out.one = Working.sentences('Just the one sentence here').length;
      out.empty = Working.sentences('').length;
      out.nullish = Working.sentences(null).length;
      // a decimal must not be mistaken for a sentence boundary
      out.decimal = Working.sentences('The slope is 0.5 there.').length;
      return out;
    });
    t.eq('three sentences make three steps', split.three, 3);
    t.eq('one makes one', split.one, 1);
    t.eq('nothing makes none', split.empty, 0);
    t.eq('and neither does null', split.nullish, 0);
    t.eq('a decimal point does not start a new step', split.decimal, 1);

    // --- the price: the strike, and nothing the model hears about ---
    const price = await t.ev(async () => {
      const out = {};
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      Battle.slamNext = false;        // the wind-up is its own thing; see below
      // Give the topic a real history, so "unchanged" is a meaningful claim
      // rather than a comparison of two empty objects.
      const key = Battle.cur.key;
      Game.s.topicStats[key] = { c: 7, w: 2, m: 0.55, seen: 9, last: 40, t: 1234567 };
      const before = JSON.parse(JSON.stringify(Game.s.topicStats[key]));
      const ehp = Battle.ehp, hp = Game.s.hp, qc = Game.s.qCount;
      const correct = Game.s.stats.correct, wrong = Game.s.stats.wrong;
      Battle.combo = 6;
      Battle.showWork();
      await new Promise(r => setTimeout(r, 300));
      const after = Game.s.topicStats[key];
      out.moved = [];
      for (const f of ['c', 'w', 'm', 'seen', 'last', 't']) {
        if (before[f] !== after[f]) out.moved.push(f);
      }
      out.foeUnhurt = Battle.ehp === ehp;
      out.tookNoDamage = Game.s.hp === hp;
      out.comboBroken = Battle.combo === 0;
      out.qCountSame = Game.s.qCount === qc;
      out.correctSame = Game.s.stats.correct === correct;
      out.wrongSame = Game.s.stats.wrong === wrong;
      out.counted = Game.s.shown === 1;
      out.answered = Battle.answered;
      out.panel = document.getElementById('explain').innerText;
      return out;
    });
    t.eq('being shown moves no field of the topic — including recency',
      price.moved, []);
    t.ok('the foe takes no damage: it cannot shorten a fight', price.foeUnhurt);
    t.ok('and the knight takes none either — it costs the strike, not blood',
      price.tookNoDamage);
    t.ok('the streak breaks', price.comboBroken);
    t.ok('it does not count as a question answered', price.qCountSame);
    t.ok('nor as a right answer', price.correctSame);
    t.ok('nor as a wrong one — it was not an answer at all', price.wrongSame);
    t.ok('but the knight remembers asking', price.counted);
    t.ok('and the turn is closed to further answers', price.answered);
    t.ok('the panel shows the working rather than a verdict',
      /Worked through for you/.test(price.panel), price.panel.slice(0, 80));
    t.ok('and says plainly that nothing was recorded',
      /being shown is not knowing/i.test(price.panel));

    // --- the flag is per question, and must not follow a ladder out ---
    const ladder = await t.ev(async () => {
      const out = {};
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 200));
      // Stand up a ladder by hand, the way the shell does.
      R.seed(777);
      Battle.cur = buildQuestion('uSub', 2);
      R.unseed();
      Battle.rite = { motes: Battle.cur.motes, i: 0, clean: 0, trail: [], parent: Battle.cur };
      Battle.answered = false; Battle.shownWork = false;
      Battle.renderStep();
      out.rungs = Battle.rite.motes.length;

      // Show the working on the first rung.
      Battle.showWork();
      await new Promise(r => setTimeout(r, 150));
      out.shownOnRung = Battle.shownWork === true;
      // Advance off that rung the way the Continue button does.
      Battle.afterTurn();
      await new Promise(r => setTimeout(r, 200));
      out.clearedOnNextRung = Battle.shownWork === false;
      out.stillOnLadder = !!Battle.rite;
      return out;
    });
    t.ok('a ladder really has several rungs', ladder.rungs > 1, String(ladder.rungs));
    t.ok('the working can be shown on a rung', ladder.shownOnRung);
    t.ok('and the flag is cleared before the next rung is asked',
      ladder.clearedOnNextRung);
    t.ok('the ladder carries on rather than collapsing', ladder.stillOnLadder);

    // --- the assembled solution still reaches the mastery model ---
    const finisher = await t.ev(async () => {
      const out = {};
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 200));
      R.seed(555);
      Battle.cur = buildQuestion('uSub', 2);
      R.unseed();
      const key = Battle.cur.key;
      Game.s.topicStats[key] = { c: 1, w: 0, m: 0.3, seen: 1, last: 0, t: 1 };
      Battle.rite = { motes: Battle.cur.motes, i: Battle.cur.motes.length - 1,
                      clean: 0, trail: [], parent: Battle.cur };
      Battle.answered = false;
      Battle.shownWork = true;           // as if a rung had been shown earlier
      const before = JSON.parse(JSON.stringify(Game.s.topicStats[key]));
      Battle.renderStep();
      // Answer the last rung correctly; the ladder then fires the finisher.
      Battle.answer(null, Battle.step().a);
      await new Promise(r => setTimeout(r, 150));
      Battle.afterTurn();
      await new Promise(r => setTimeout(r, 350));
      const after = Game.s.topicStats[key];
      out.flagCleared = Battle.shownWork === false;
      out.masteryMoved = JSON.stringify(before) !== JSON.stringify(after);
      return out;
    });
    t.ok('finishing a ladder clears the shown flag', finisher.flagCleared);
    t.ok('so the assembled solution still counts — a peek partway up must not '
       + 'cost credit for the whole topic', finisher.masteryMoved);

    // --- the button is offered when it can be, and not when it cannot ---
    const button = await t.ev(async () => {
      const out = {};
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      const el = () => document.getElementById('showwork');
      out.offered = el().style.display !== 'none' && /wgo/.test(el().innerHTML);
      out.wording = el().innerText;
      Battle.answer(null, Battle.step().a);
      await new Promise(r => setTimeout(r, 200));
      out.goneAfterAnswer = el().style.display === 'none';
      // Redrawing the controls must not put it back: the question is closed.
      Battle.renderWork();
      out.goneOnRedraw = el().style.display === 'none';
      return out;
    });
    t.ok('the working is offered while the question is open', button.offered);
    t.ok('and the button says what it costs, and what it does not',
      /costs the strike/i.test(button.wording) && /not blood/i.test(button.wording),
      button.wording);
    t.ok('once answered it is gone', button.goneAfterAnswer);
    t.ok('and stays gone even if the fight redraws its controls',
      button.goneOnRedraw);

    /* What the gentler price does and does not touch. Showing costs the strike
       and the streak; it is not a wrong answer, so the things that exist to
       soften a wrong answer are left alone, and the things that ride on a
       strike are not. */
    const spares = await t.ev(async () => {
      const out = {};
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      Battle.slamNext = false;

      // Steady Hand holds a streak through a MISS. Being shown is not one, so
      // it must still be in hand afterwards for the miss it was meant for.
      Battle.steadyUp = true;
      Battle.diceUp = true;                 // a stake rode on a strike that never came
      const hp = Game.s.hp;
      const missed0 = Battle.missed;
      Battle.showWork();
      await new Promise(r => setTimeout(r, 250));
      out.notFlawless = Battle.missed === missed0 + 1;
      out.steadyKept = Battle.steadyUp === true;
      out.stakeSpent = Battle.diceUp === false;
      out.unhurt = Game.s.hp === hp;

      // The wind-up is the foe's own clock and fires whatever the player does.
      // Standing here must not be a way to wait one out.
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      Battle.slamNext = true;
      const hp2 = Game.s.hp;
      Battle.showWork();
      await new Promise(r => setTimeout(r, 1400));
      out.slamLanded = Game.s.hp < hp2;
      return out;
    });
    t.ok('a fight with a working shown in it is no longer flawless',
      spares.notFlawless);
    t.ok('Steady Hand is not spent — being shown is not the miss it guards against',
      spares.steadyKept);
    t.ok('but a stake is spent: there was no strike for it to ride on',
      spares.stakeSpent);
    t.ok('and with no wind-up due, nothing touches the knight at all', spares.unhurt);
    t.ok('a wind-up still lands — this is not a way to wait one out',
      spares.slamLanded);

    /* Three checks that exist because a mutation walked past the first draft of
       this suite. Each names a guard that was real but unasserted. */

    // A second press must do nothing. Without the guard it works the turn
    // twice: two blows taken for one question, and the counter double-counts.
    const twice = await t.ev(async () => {
      const out = {};
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      Game.s.shown = 0;
      const combo0 = (Battle.combo = 5);
      Battle.showWork();
      await new Promise(r => setTimeout(r, 150));
      Battle.combo = combo0;                 // if a second press lands, it breaks this again
      Battle.showWork();
      Battle.showWork();
      await new Promise(r => setTimeout(r, 200));
      out.countedOnce = Game.s.shown === 1;
      out.onlyOnce = Battle.combo === combo0;
      return out;
    });
    t.ok('pressing it again does nothing — one working, one turn', twice.countedOnce);
    t.ok('and the turn is not resolved a second time', twice.onlyOnce);

    // The sentinel stands in for "no answer given". If it were ever a value a
    // generator could produce, being shown would read as a correct strike.
    const sentinel = await t.ev(() => {
      const out = { collisions: [] };
      out.kind = typeof Battle.SHOWN;
      for (const key of Object.keys(GEN)) {
        for (const d of [1, 2, 3]) {
          let q;
          try { R.seed(31 + d); q = buildQuestion(key, d); R.unseed(); } catch (e) { continue; }
          if (q.a === Battle.SHOWN) out.collisions.push(key);
          if ((q.c || []).some(c => c === Battle.SHOWN)) out.collisions.push(key + ' choice');
        }
      }
      return out;
    });
    t.eq('the sentinel is not a value any answer could be', sentinel.kind, 'object');
    t.eq('so it collides with no answer or choice in the game', sentinel.collisions, []);
  }
};
