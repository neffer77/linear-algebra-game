/* Riposte.
 *
 * A foe that winds up says so a turn ahead, and a right answer on that turn
 * braces the slam and ripostes: the strike lands half again as hard, with
 * RIPOSTE on the scene, a line in the explanation, and the first one in a
 * fight told in a toast. A miss on that turn ripostes nothing. These checks
 * fight the first foe with set questions and real answers on a phone.
 * Nothing new is saved.
 */
'use strict';

/* Ask a question on the topic given, with the foe winding up or not, and read the warning. */
const ask = (t, key, windup) => t.ev(([key, windup]) => {
  Battle.answered = false; Battle.shownWork = false;
  Battle.charge = 0; Battle.slamNext = windup;
  Battle.nextQuestion();
  Battle.lesson = null; Battle.rite = null;
  Battle.cur = buildQuestion(key, 1);
  Battle.renderStep();
  const tg = document.getElementById('telegraph');
  return { shown: tg.style.display !== 'none', text: tg.innerText };
}, [key, windup]);
/* Answer it, right or wrong, with a fixed blow; record the bonus, what was said and the explanation. */
const answer = (t, right) => t.ev(right => {
  const cs = Combat.strike, sl = Combat.slam;
  let bonus = null;
  Combat.strike = (w, sp, c, cr, rg, b) => { bonus = b; return 1; };
  Combat.slam = () => 9;
  Battle.unassisted = false; Battle.perfect = false; Battle.finisher = null; Battle.diceUp = false; Battle.nudged = false;
  Battle.answer(null, right ? Battle.cur.a : '✗');
  Combat.strike = cs; Combat.slam = sl;
  const line = document.getElementById('riposteLine');
  return { bonus, said: window.__said.slice(), toasts: window.__toasts.slice(), line: line ? line.innerText : null,
           slam: Battle.lastSlam, braced: Battle.lastBraced };
}, right);
const count = (a, s) => a.filter(x => x === s).length;

module.exports = {
  name: 'riposte',
  title: 'Riposte · a right answer as the foe winds up lands half again as hard',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const start = () => t.ev(() => {
      Prefs.d.motion = false; Prefs.d.lessons = false;
      Elite.force = null; const odds = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
      Elite.CHANCE = odds;
      Game.s.maxHp = Game.s.hp = 99999; Battle.beastLeft = 0; Battle.wardUp = false;
      Battle.ehp = Battle.emax = 99999;
      window.__said = []; window.__toasts = [];
      if (!window.__hooked) {
        window.__hooked = true;
        const f = Anim.float, u = UI.toast;
        Anim.float = function (x, y, text) { window.__said.push(text); return f.apply(this, arguments); };
        UI.toast = function (m) { window.__toasts.push(m); return u.apply(this, arguments); };
      }
      return { nm: Battle.foe.nm, weak: Weak.of(Battle), other: REALMS[0].pool.find(k => k !== Weak.of(Battle)) };
    });
    const foe = await start();

    let q = await ask(t, foe.other, false);
    t.ok('with no wind-up there is no warning', !q.shown, q.text);
    let a = await answer(t, true);
    const plain = a.bonus;
    t.ok('and a right answer ripostes nothing', !a.said.includes('RIPOSTE') && a.line === null && !a.toasts.some(m => /Riposte/.test(m)), JSON.stringify(a));

    q = await ask(t, foe.other, true);
    t.ok('a wind-up warns of the riposte', q.shown && q.text.includes(foe.nm) && /riposte for ×1\.5/.test(q.text), q.text);
    a = await answer(t, true);
    t.ok('a right answer as it winds up lands half again as hard', Math.abs(a.bonus / plain - 1.5) < 1e-9, `${a.bonus} against ${plain}`);
    t.ok('with RIPOSTE on the scene', count(a.said, 'RIPOSTE') === 1, JSON.stringify(a.said));
    t.ok('the riposte told once', a.toasts.filter(m => /Riposte/.test(m)).join() === `🤺 Riposte! A right answer as ${foe.nm} winds up lands half again as hard.`, JSON.stringify(a.toasts));
    t.ok('and said in the explanation', /Riposte!/.test(a.line || '') && /half again as hard/.test(a.line), a.line);
    t.ok('while the slam still lands, braced', a.slam === 9 && a.braced === true, JSON.stringify(a));

    await ask(t, foe.other, false);
    a = await answer(t, true);
    t.ok('the next strike with no wind-up is plain again', a.bonus === plain && a.line === null, JSON.stringify(a));

    await ask(t, foe.other, true);
    a = await answer(t, false);
    t.ok('a miss as it winds up ripostes nothing', a.bonus === null && count(a.said, 'RIPOSTE') === 1 && a.line === null, JSON.stringify(a));

    await ask(t, foe.other, true);
    a = await answer(t, true);
    t.eq('the riposte is told once a fight', a.toasts.filter(m => /Riposte/.test(m)).length, 1);
    t.eq('while every one is said on the scene', count(a.said, 'RIPOSTE'), 2);

    await ask(t, foe.weak, true);
    a = await answer(t, true);
    t.ok('on the foe\'s weak point it stacks', Math.abs(a.bonus / plain - 2.25) < 1e-9, `${a.bonus} against ${plain}`);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.ev(() => Battle.flee());

    await start();
    await ask(t, foe.other, true);
    a = await answer(t, true);
    t.eq('a new fight tells it again', a.toasts.filter(m => /Riposte/.test(m)).length, 1);
    await t.ev(() => Battle.flee());

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
