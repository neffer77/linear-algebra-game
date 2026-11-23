/* Weak points.
 *
 * Every campaign foe has one topic from its own realm that it cannot stand.
 * A question on it carries a green chip, a right answer on it lands half
 * again as hard with WEAK POINT on the scene, the first one in a fight names
 * the topic, and the Bestiary lists it once the foe is beaten. These checks
 * fight the first foe with set questions and real answers, then read the
 * Bestiary. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* Ask a question on the topic given, and read what the question line shows. */
const ask = (t, key) => t.ev(key => {
  Battle.answered = false; Battle.shownWork = false; Battle.lesson = null; Battle.rite = null;
  Battle.cur = buildQuestion(key, 1);
  Battle.renderStep();
  const q = document.getElementById('qtopic');
  return { text: q.innerText, chip: !!q.querySelector('.rev.weak') };
}, key);
/* Answer it right, with a fixed blow; record the bonus the strike was given and what was said. */
const hit = t => t.ev(() => {
  const cs = Combat.strike;
  let bonus = null;
  Combat.strike = (w, sp, c, cr, rg, b) => { bonus = b; return 1; };
  Battle.unassisted = false; Battle.perfect = false; Battle.finisher = null; Battle.diceUp = false; Battle.nudged = false;
  Battle.slamNext = false; Battle.charge = 0;
  Battle.answer(null, Battle.cur.a);
  Combat.strike = cs;
  return { bonus, said: window.__said.slice(), toasts: window.__toasts.slice() };
});

module.exports = {
  name: 'weakpoint',
  title: 'Weak points · every campaign foe has a topic it cannot stand',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const foe = await t.ev(() => {
      Prefs.d.motion = false; Prefs.d.lessons = false;
      Elite.force = null; const odds = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
      Elite.CHANCE = odds;
      Game.s.maxHp = Game.s.hp = 99999; Battle.beastLeft = 0; Battle.wardUp = false;
      Battle.ehp = Battle.emax = 99999;
      window.__said = []; window.__toasts = [];
      const f = Anim.float, u = UI.toast;
      Anim.float = function (x, y, text) { window.__said.push(text); return f.apply(this, arguments); };
      UI.toast = function (m) { window.__toasts.push(m); return u.apply(this, arguments); };
      return { nm: Battle.foe.nm, weak: Weak.of(Battle), label: TOPIC_LABEL[Weak.of(Battle)], other: REALMS[0].pool.find(k => k !== Weak.of(Battle)) };
    });
    t.eq('the first foe has its weak point', [foe.nm, foe.weak], ['Meadow Slime', 'mag']);

    let q = await ask(t, foe.other);
    t.ok('a question on another topic carries no chip', !q.chip && !/weak point/.test(q.text), q.text);
    let a = await hit(t);
    const plain = a.bonus;
    t.ok('and a right answer on it says nothing of one', !a.said.includes('WEAK POINT') && !a.toasts.some(m => /Weak point/.test(m)), JSON.stringify(a));

    q = await ask(t, foe.weak);
    t.ok('a question on the weak point says so', q.chip && /weak point ×1\.5/i.test(q.text), q.text);
    a = await hit(t);
    t.ok('a right answer on it lands half again as hard', Math.abs(a.bonus / plain - 1.5) < 1e-9, `${a.bonus} against ${plain}`);
    t.ok('with WEAK POINT on the scene', a.said.includes('WEAK POINT'), JSON.stringify(a.said));
    t.ok('and the topic named', a.toasts.filter(m => /Weak point/.test(m)).join() === `🎯 Weak point! Meadow Slime cannot stand ${foe.label}.`, JSON.stringify(a.toasts));

    await ask(t, foe.weak);
    a = await hit(t);
    t.eq('the topic is named once a fight', a.toasts.filter(m => /Weak point/.test(m)).length, 1);
    t.eq('while every hit is said on the scene', a.said.filter(s => s === 'WEAK POINT').length, 2);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.ev(() => Battle.flee());

    // the Bestiary names it once the foe is beaten, and not before
    await t.ev(() => { Game.s.cleared['0:0'] = true; UI.go('s-map'); });
    await t.tap('btnBest');
    await sleep(100);
    const rows = await t.ev(() => ({ slime: document.getElementById('best-0-0').innerText, goblin: document.getElementById('best-0-1').innerText }));
    t.ok('the Bestiary lists a beaten foe\'s weak point', rows.slime.includes(`🎯 Weak point: ${foe.label}`), rows.slime);
    t.ok('but not one still in the shadow', !/Weak point/.test(rows.goblin), rows.goblin);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
