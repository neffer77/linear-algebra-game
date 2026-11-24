/* Coup de grâce.
 *
 * A foe down to its last 15% of health as a question is asked is on its last
 * legs: the question says so, beside a wind-up's warning if there is one, and
 * a right answer finishes it however small the blow, with COUP DE GRÂCE on the
 * scene. A miss leaves it standing, and above 15% the blow is its own. These
 * checks fight the first foe with set questions and real answers on a phone.
 * Nothing new is saved.
 */
'use strict';

/* Ask a question with the foe at the health given, winding up or not, and read the warning. */
const ask = (t, key, ehp, windup) => t.ev(([key, ehp, windup]) => {
  Battle.answered = false; Battle.shownWork = false;
  Battle.charge = 0; Battle.slamNext = windup;
  Battle.ehp = ehp;
  Battle.nextQuestion();
  Battle.lesson = null; Battle.rite = null;
  Battle.cur = buildQuestion(key, 1);
  Battle.renderStep();
  const tg = document.getElementById('telegraph');
  return { shown: tg.style.display !== 'none', text: tg.innerText, coup: Battle.coup };
}, [key, ehp, windup]);
/* Answer it, right or wrong, with a blow of 1; record what was said and the health left. */
const answer = (t, right) => t.ev(right => {
  const cs = Combat.strike, sl = Combat.slam, fh = Combat.foeHit;
  Combat.strike = () => 1;
  Combat.slam = () => 1; Combat.foeHit = () => 1;
  Battle.unassisted = false; Battle.perfect = false; Battle.finisher = null; Battle.diceUp = false; Battle.nudged = false;
  Battle.answer(null, right ? Battle.cur.a : '✗');
  Combat.strike = cs; Combat.slam = sl; Combat.foeHit = fh;
  return { ehp: Battle.ehp, said: window.__said.slice(), coup: Battle.lastCoup };
}, right);

module.exports = {
  name: 'coup',
  title: 'Coup de grâce · a right answer finishes a foe on its last 15% of health',
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
      Battle.emax = 1000; Battle.ehp = 1000;
      window.__said = [];
      if (!window.__coupHooked) {
        window.__coupHooked = true;
        const f = Anim.float;
        Anim.float = function (x, y, text) { (window.__said = window.__said || []).push(text); return f.apply(this, arguments); };
      }
      return { nm: Battle.foe.nm, key: REALMS[0].pool.find(k => k !== Weak.of(Battle)) };
    });
    const foe = await start();

    let q = await ask(t, foe.key, 151, false);
    t.ok('above 15% there is no warning', !q.shown && !q.coup, JSON.stringify(q));
    let a = await answer(t, true);
    t.ok('and the blow is its own', a.ehp === 150 && !a.coup && !a.said.includes('COUP DE GRÂCE'), JSON.stringify(a));

    q = await ask(t, foe.key, 150, false);
    t.ok('at 15% the question warns it is on its last legs', q.shown && q.coup && q.text.includes(`${foe.nm} is down to its last 150 health`) && /finish it/.test(q.text), q.text);
    a = await answer(t, false);
    t.ok('a miss leaves it standing', a.ehp === 150 && !a.coup && !a.said.includes('COUP DE GRÂCE'), JSON.stringify(a));

    q = await ask(t, foe.key, 150, true);
    t.ok('beside a wind-up, both are warned of', q.shown && /winding up/.test(q.text) && /riposte/.test(q.text) && q.text.includes('down to its last 150 health'), q.text);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.ev(() => { Battle.slamNext = false; Battle.charge = 0; });
    q = await ask(t, foe.key, 150, false);
    a = await answer(t, true);
    t.ok('a right answer finishes it with the smallest blow', a.ehp === 0 && a.coup === true, JSON.stringify(a));
    t.ok('with COUP DE GRÂCE on the scene', a.said.filter(x => x === 'COUP DE GRÂCE').length === 1, JSON.stringify(a.said));
    await t.ev(() => Battle.flee());

    await start();
    q = await ask(t, foe.key, 80, false);
    t.ok('a rite is left to its own pace', await t.ev(() => {
      Battle.rite = { motes: [Battle.cur], i: 0, clean: 0, trail: [], parent: Battle.cur };
      return Coup.ready(Battle) === false;
    }), 'a rite is taken as on its last legs');
    await t.ev(() => { Battle.rite = null; Battle.flee(); });

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
