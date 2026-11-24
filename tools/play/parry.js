/* A parry.
 *
 * Five right answers in a row earn a parry, shown beside the streak, and the
 * next blow a miss would land is turned away: the miss costs no health, the
 * explanation says it was parried, and the streak starts again. The next miss
 * lands as ever. Four in a row earn nothing. These checks fight the first foe
 * with real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t) => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
});
/* One answer that leaves the foe standing, with the foe's blow a set size; then what the fight shows. */
const answer = async (t, right) => {
  const r = await t.ev(right => {
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 30;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.steadyUp = false; Battle.diceUp = false; Battle.beastLeft = 0; Battle.wardUp = false;
    const hp = Game.s.hp;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
    return { lost: hp - Game.s.hp };
  }, right);
  await sleep(700);
  const seen = await t.ev(() => {
    const l = document.getElementById('parryLine');
    return { line: l ? l.innerText : null, streak: document.getElementById('comboTxt').textContent };
  });
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return Object.assign(r, seen, await t.ev(() => ({ combo: Battle.combo, after: document.getElementById('comboTxt').textContent })));
};

module.exports = {
  name: 'parry',
  title: 'Parry · five right in a row turn away the next miss',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await fight(t);

    let a;
    for (let i = 0; i < 4; i++) a = await answer(t, true);
    t.ok('four right in a row earn no parry', !a.after.includes('parry'), JSON.stringify(a));
    a = await answer(t, false);
    t.ok('so the miss lands as ever', a.lost > 0 && a.line === null, JSON.stringify(a));

    for (let i = 0; i < 5; i++) a = await answer(t, true);
    t.ok('five right in a row earn a parry, shown beside the streak', a.after.includes('🛡️ parry ready'), JSON.stringify(a));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    a = await answer(t, false);
    t.eq('the next miss costs no health', a.lost, 0);
    t.ok('and the explanation says it was parried', a.line !== null && a.line.includes('Parried'), JSON.stringify(a));
    t.ok('the parry is spent and the streak starts again', !a.after.includes('parry') && a.combo === 0, JSON.stringify(a));

    a = await answer(t, false);
    t.ok('the miss after that lands as ever', a.lost > 0 && a.line === null, JSON.stringify(a));

    for (let i = 0; i < 10; i++) a = await answer(t, true);
    t.ok('ten in a row hold one parry, not two', a.after.split('parry ready').length === 2, JSON.stringify(a));
    a = await answer(t, false);
    t.eq('which turns away one miss', a.lost, 0);
    a = await answer(t, false);
    t.ok('and only one', a.lost > 0, JSON.stringify(a));

    await fight(t);
    t.ok('a new fight starts with no parry', await t.ev(() => !Battle.parry && !document.getElementById('comboTxt').textContent.includes('parry')));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { Battle.flee(); UI.go('s-title'); });
  }
};
