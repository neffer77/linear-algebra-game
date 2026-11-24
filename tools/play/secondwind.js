/* Second wind.
 *
 * Once a campaign fight, a blow that would fell the knight leaves them at 1
 * health, with SECOND WIND on the scene and a line in the explanation. The
 * question after it says it is a last stand, and a right answer to it strikes
 * twice as hard as the same answer would have. The next blow that would fell
 * them does. These checks fight the first foe with set questions and real
 * answers on a phone. Nothing new is saved.
 */
'use strict';

/* Ask a question on the topic given and read the warning. */
const ask = (t, key) => t.ev(key => {
  Battle.answered = false; Battle.shownWork = false;
  Battle.charge = 0; Battle.slamNext = false;
  Battle.ehp = Battle.emax = 100000;
  Battle.nextQuestion();
  Battle.lesson = null; Battle.rite = null;
  Battle.cur = buildQuestion(key, 1);
  Battle.renderStep();
  const tg = document.getElementById('telegraph');
  return { shown: tg.style.display !== 'none', text: tg.innerText };
}, key);
/* Answer it, right or wrong, with blows of the size given; record the strike's bonus, health and what was said. */
const answer = (t, right, blow) => t.ev(([right, blow]) => {
  const cs = Combat.strike, fh = Combat.foeHit;
  let bonus = null;
  Combat.strike = (d, s, c, cr, r, b) => { bonus = b; return 1; };
  Combat.foeHit = () => blow;
  Battle.unassisted = false; Battle.perfect = false; Battle.finisher = null; Battle.diceUp = false; Battle.nudged = false; Battle.rage = false;
  Battle.answer(null, right ? Battle.cur.a : '✗');
  Combat.strike = cs; Combat.foeHit = fh;
  const e = document.getElementById('explain');
  return { hp: Game.s.hp, bonus, said: window.__said.slice(), wind: !!document.getElementById('windLine'),
    stand: !!document.getElementById('standLine'), explain: e ? e.innerText : '' };
}, [right, blow]);

module.exports = {
  name: 'secondwind',
  title: 'Second wind · a blow that would fell you leaves you at 1 health, once a fight',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const start = (hp) => t.ev(hp => {
      Prefs.d.motion = false; Prefs.d.lessons = false;
      Elite.force = null; const odds = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
      Elite.CHANCE = odds;
      Game.s.maxHp = 1000; Game.s.hp = hp; Game.s.items.feather = 0;
      Battle.beastLeft = 0; Battle.wardUp = false;
      window.__said = [];
      if (!window.__windHooked) {
        window.__windHooked = true;
        const f = Anim.float;
        Anim.float = function (x, y, text) { (window.__said = window.__said || []).push(text); return f.apply(this, arguments); };
      }
      return { key: REALMS[0].pool.find(k => k !== Weak.of(Battle)) };
    }, hp);
    const { key } = await start(40);

    // a plain right answer, for the size of a strike
    let q = await ask(t, key);
    t.ok('at full stride there is no last stand', !q.shown, q.text);
    let a = await answer(t, true, 0);
    const plain = a.bonus;

    q = await ask(t, key);
    a = await answer(t, false, 25);
    t.eq('a blow short of felling lands as it is', a.hp, 15);
    t.ok('and is no second wind', !a.said.includes('SECOND WIND') && !a.wind, JSON.stringify(a));

    q = await ask(t, key);
    a = await answer(t, false, 60);
    t.eq('a blow that would fell the knight leaves them at 1 health', a.hp, 1);
    t.ok('with SECOND WIND on the scene', a.said.filter(x => x === 'SECOND WIND').length === 1, JSON.stringify(a.said));
    t.ok('and said in the explanation', a.wind && /Second wind!/.test(a.explain) && /1 health/.test(a.explain), a.explain);

    q = await ask(t, key);
    t.ok('the question after it is a last stand', q.shown && /Last stand/.test(q.text) && /twice as hard/.test(q.text), q.text);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    a = await answer(t, true, 0);
    t.ok('a right answer to it strikes twice as hard', Math.abs(a.bonus - plain * 2) < 1e-9, `${a.bonus} against ${plain}`);
    t.ok('and is said so', a.stand && /Last stand!/.test(a.explain), a.explain);

    q = await ask(t, key);
    t.ok('the stand is over after one answer', !q.shown, q.text);
    a = await answer(t, true, 0);
    t.ok('and the next strike is its own size again', Math.abs(a.bonus - plain) < 1e-9, `${a.bonus} against ${plain}`);

    q = await ask(t, key);
    a = await answer(t, false, 60);
    t.eq('the next blow that would fell the knight does', a.hp, 0);
    t.ok('with no second wind left', a.said.filter(x => x === 'SECOND WIND').length === 1 && !a.wind, JSON.stringify(a));
    await t.ev(() => { Game.s.hp = 1000; Battle.flee(); });

    // a new fight brings it back
    await start(10);
    await ask(t, key);
    a = await answer(t, false, 60);
    t.eq('a new fight brings a new second wind', a.hp, 1);
    await t.ev(() => { Game.s.hp = 1000; Battle.flee(); });

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
