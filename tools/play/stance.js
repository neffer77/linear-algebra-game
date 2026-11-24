/* A stance.
 *
 * Before the first answer of a campaign fight the power bar offers the
 * knight's stance, even to begin with. A tap turns it bold: the knight's
 * blows land a third harder and the foe's half again as hard. Another turns
 * it guarded: the foe's blows halved, the knight's a fifth lighter. A third
 * goes back to even. Once anything is answered it is set for the fight, and
 * a new fight starts even. A practice bout has no stance. These checks fight
 * the first foe with real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, mode) => t.ev(mode => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const e = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = e;
  if (mode) Battle.mode = mode;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Battle.renderPowers();
}, mode || null);
const bar = (t) => t.ev(() => { const d = document.querySelector('#powerbar [data-pw="stance"]');
  return d ? { text: d.innerText, on: !d.classList.contains('off') } : null; });
const turn = async (t) => { await t.ev(() => document.querySelector('#powerbar [data-pw="stance"]').click()); await sleep(250); return bar(t); };
/* One answer that leaves the foe standing, with the foe's blow a set 30; then the knight's blow and what the miss cost. */
const answer = async (t, right) => {
  const r = await t.ev(right => {
    let bonus = null;
    const cs = Combat.strike, fh = Combat.foeHit;
    Combat.strike = (d, s, c, cr, rg, b) => { bonus = b; return 1; }; Combat.foeHit = () => 30;
    // the blow's other multipliers held at one, so the stance is all that moves it
    const held = [Phase, Weak, Riposte, Elite, SecondWind, Flourish].map(m => [m, m.bonus]);
    for (const [m] of held) m.bonus = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.diceUp = false; Battle.beastLeft = 0; Battle.wardUp = false; Battle.perfect = false; Battle.unassisted = false;
    Battle.finisher = 1; Battle.nudged = false; Battle.parry = false;
    const hp = Game.s.hp = 1000;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
    for (const [m, f] of held) m.bonus = f;
    return { bonus, lost: hp - Game.s.hp };
  }, right);
  await sleep(700);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'stance',
  title: 'A stance · before the first answer, go in bold or guarded',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await fight(t);
    let b = await bar(t);
    t.ok('a campaign fight opens even, the stance to turn on the bar', b && b.on && b.text.includes('Even'), JSON.stringify(b));
    let a = await answer(t, true);
    const plain = a.bonus;
    a = await answer(t, false);
    const hit = a.lost;
    t.ok('even, blows land as ever', plain === 1 && hit === 30, JSON.stringify({ plain, hit }));
    b = await bar(t);
    t.ok('once anything is answered the stance is set', b && !b.on, JSON.stringify(b));

    await fight(t);
    b = await turn(t);
    t.ok('a tap turns it bold, said on the bar', b && b.on && b.text.includes('Bold'), JSON.stringify(b));
    const said = await t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
    t.ok('and what bold does is said', /third harder/.test(said), said);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    a = await answer(t, true);
    t.ok('bold, the knight\'s blow lands a third harder', Math.abs(a.bonus - 4 / 3) < 1e-9, JSON.stringify(a));
    a = await answer(t, false);
    t.eq('and the foe\'s half again as hard', a.lost, 45);
    b = await bar(t);
    t.ok('and it cannot be turned now', b && !b.on && b.text.includes('Bold'), JSON.stringify(b));

    await fight(t);
    b = await bar(t);
    t.ok('a new fight starts even', b && b.text.includes('Even'), JSON.stringify(b));
    await turn(t);
    b = await turn(t);
    t.ok('two taps turn it guarded', b && b.text.includes('Guarded'), JSON.stringify(b));
    a = await answer(t, false);
    t.eq('guarded, the foe\'s blow is halved', a.lost, 15);
    a = await answer(t, true);
    t.ok('and the knight\'s a fifth lighter', Math.abs(a.bonus - 0.8) < 1e-9, JSON.stringify(a));

    await fight(t);
    await turn(t); await turn(t);
    b = await turn(t);
    t.ok('a third tap goes back to even', b && b.text.includes('Even'), JSON.stringify(b));
    a = await answer(t, false);
    t.eq('where blows land as ever', a.lost, 30);

    await fight(t, 'arena');
    t.eq('a practice bout has no stance', await bar(t), null);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { Battle.flee(); UI.go('s-title'); });
  }
};
