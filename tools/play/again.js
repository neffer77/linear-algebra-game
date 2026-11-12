/* One like it, straight after a miss.
 *
 * A wrong answer is followed by its explanation, and the explanation is only
 * worth something if it is used. Left to the usual draw, the same topic might
 * not come round for several questions, by which time the reading has gone.
 * So a miss, or a turn spent being shown the working, makes the next question
 * a fresh one on the same topic at the same difficulty, marked as such.
 *
 * These checks pin down the shape of that: it follows a miss and the shown
 * working, never a right answer; it is the same topic at the same difficulty
 * and a new question; it happens once, so a miss on the second go returns to
 * the usual draw; the verdict says it is coming and says when it landed; the
 * daily, which must be the same twelve for everyone, is left alone; a new
 * fight starts clean; and nothing about it is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* Stand a fight up on one known question, the way the shell would ask it. */
function pose(t, key, seed) {
  return t.ev(([key, seed]) => {
    R.seed(seed); Battle.cur = buildQuestion(key, 2); R.unseed();
    Battle.curDiff = 2;
    Battle.rite = null; Battle.lesson = null; Battle.nudged = null; Battle.redo = null;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false;
    Battle.ehp = 99999;                        // no question here may end the fight
    Game.s.maxHp = Game.s.hp = 99999;          // and no blow may end the knight
    Battle.renderStep();
    return { key: Battle.cur.key, q: Battle.cur.q };
  }, [key, seed]);
}

const wrong = t => t.ev(() => { Battle.answer(null, Battle.cur.choices.find(c => c !== Battle.cur.a)); });
const right = t => t.ev(() => { Battle.answer(null, Battle.cur.a); });
const verdict = t => t.ev(() => document.getElementById('explain').innerText);
async function next(t) {
  await t.ev(() => document.getElementById('contBtn').click());
  await sleep(250);
  return t.ev(() => ({ key: Battle.cur.key, diff: Battle.curDiff, redo: !!Battle.cur.redo, q: Battle.cur.q,
    tag: document.getElementById('qtopic').innerText, rite: !!Battle.rite }));
}

module.exports = {
  name: 'again',
  title: 'One like it · a miss is followed by a fresh question on the same topic',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    await t.ev(() => { Prefs.d.lessons = false; Battle.begin(0, 0); });
    await sleep(350);

    // --- a miss: the verdict says one like it is next, and it is ---
    const first = await pose(t, 'dot', 4242);
    await wrong(t);
    t.eq('a miss leaves the topic and difficulty to come again',
      await t.ev(() => Battle.redo), { key: 'dot', diff: 2 });
    t.ok('the verdict says the next one is like it', /The next one is like it/.test(await verdict(t)));
    const two = await next(t);
    t.eq('the next question is on the same topic', two.key, first.key);
    t.eq('at the same difficulty', two.diff, 2);
    t.ok('and is a new question, not the same one again', two.q !== first.q, two.q);
    t.ok('it is marked as one like it', two.redo && /one like it/i.test(two.tag), two.tag);

    // --- a miss on the second go does not hold the knight on the topic ---
    await wrong(t);
    t.eq('missing the second go queues no third', await t.ev(() => Battle.redo), null);
    t.ok('and the verdict promises nothing more', !/The next one is like it/.test(await verdict(t)));
    const three = await next(t);
    t.ok('the question after it is drawn as usual, not marked', !three.redo && !/one like it/i.test(three.tag), three.tag);

    // --- the second go landed ---
    await pose(t, 'det2', 77);
    await wrong(t);
    const again = await next(t);
    await t.ev(() => { Battle.rite = null; Battle.renderStep(); });   // answer it whole, not as a ladder
    await right(t);
    t.ok('a right answer on the second go is named', again.redo && /Got it this time/.test(await verdict(t)));

    // --- a right answer the first time brings nothing back ---
    await pose(t, 'mag', 99);
    await right(t);
    t.eq('a right answer leaves nothing to come again', await t.ev(() => Battle.redo), null);
    t.ok('and claims no second go', !/Got it this time|The next one is like it/.test(await verdict(t)));

    // --- being shown the working is not knowing, so it comes again ---
    await pose(t, 'dot', 31);
    await t.ev(() => Battle.showWork());
    t.eq('after the working is shown, the topic comes again', await t.ev(() => Battle.redo && Battle.redo.key), 'dot');
    t.ok('and the worked page says so', /The next one is like it/.test(await verdict(t)));
    t.ok('marked when it comes', (await next(t)).redo);

    // --- a first meeting is the lesson ladder's to pace ---
    await pose(t, 'dot', 12);
    await t.ev(() => { Battle.lesson = { format: 'meet' }; });
    await wrong(t);
    t.eq('a first meeting missed is left to the lesson ladder', await t.ev(() => Battle.redo), null);
    await t.ev(() => { Battle.lesson = null; });

    // --- a new fight starts clean ---
    await pose(t, 'dot', 5);
    await wrong(t);
    await t.ev(() => { Battle.flee(); Battle.begin(0, 0); });
    await sleep(350);
    t.eq('a second go does not follow the knight into the next fight', await t.ev(() => Battle.redo), null);
    t.ok('and the first question there is not marked', !(await t.ev(() => !!Battle.cur.redo)));

    // --- the daily is the same twelve for everyone, so it is left alone ---
    const daily = await t.ev(() => {
      Battle.flee();
      Battle.redo = { key: 'det2', diff: 1 };          // as if a miss had just happened
      Daily.start();
      return { mode: Battle.mode, redo: !!Battle.cur.redo };
    });
    await sleep(300);
    t.ok('a waiting second go is not carried into the daily', daily.mode === 'daily' && !daily.redo, JSON.stringify(daily));
    await t.ev(() => {
      Battle.answered = false; Battle.cur.redo = false;
      Battle.answer(null, Battle.cur.choices.find(c => c !== Battle.cur.a));
    });
    t.eq('and a miss in the daily asks for none', await t.ev(() => Battle.redo), null);
    await t.ev(() => { Battle.flee(); R.unseed(); });

    // --- nothing is saved ---
    t.ok('none of it is written into the save', await t.ev(() => !/redo|again/i.test(JSON.stringify(Game.s))));

    await t.ev(() => { Prefs.d.lessons = true; UI.go('s-title'); });
  }
};
