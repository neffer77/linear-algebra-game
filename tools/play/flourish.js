/* A flourish.
 *
 * From the eighth right answer in a row the power bar offers a flourish:
 * spend the streak, and the next right answer lands three times as hard. The
 * streak starts again from nothing. A miss before the blow loses the
 * flourish, and a new fight starts without one. Seven in a row offer nothing,
 * and a practice bout offers nothing at all. These checks fight the first foe
 * with real answers on a phone. Nothing new is saved.
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
const bar = (t) => t.ev(() => { const d = document.querySelector('#powerbar [data-pw="flourish"]');
  return d ? { text: d.innerText, on: !d.classList.contains('off') } : null; });
/* One answer that leaves the foe standing; then the blow's bonus and the streak. */
const answer = async (t, right) => {
  const r = await t.ev(right => {
    let bonus = null;
    const cs = Combat.strike, fh = Combat.foeHit;
    Combat.strike = (d, s, c, cr, rg, b) => { bonus = b; return 1; }; Combat.foeHit = () => 1;
    // the blow's other multipliers held at one, so the flourish is all that moves it
    const held = [Phase, Weak, Riposte, Elite, SecondWind].map(m => [m, m.bonus]);
    for (const [m] of held) m.bonus = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.diceUp = false; Battle.beastLeft = 0; Battle.wardUp = false; Battle.perfect = false; Battle.unassisted = false;
    Battle.finisher = 1; Battle.nudged = false;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
    for (const [m, f] of held) m.bonus = f;
    return { bonus };
  }, right);
  await sleep(700);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return Object.assign(r, await t.ev(() => ({ combo: Battle.combo, flourish: !!Battle.flourish })));
};

module.exports = {
  name: 'flourish',
  title: 'A flourish · eight right in a row can be spent for one blow three times as hard',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await fight(t);
    t.eq('a fight starts with no flourish on the bar', await bar(t), null);

    let a, plain;
    for (let i = 0; i < 7; i++) a = await answer(t, true);
    plain = a.bonus;
    t.eq('seven in a row offer nothing', await bar(t), null);
    a = await answer(t, true);
    const b = await bar(t);
    t.ok('the eighth in a row offers a flourish, spending the streak', b && b.on && b.text.includes('Flourish') && b.text.includes('spend 8'), JSON.stringify(b));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.ev(() => document.querySelector('#powerbar [data-pw="flourish"]').click());
    await sleep(300);
    const st = await t.ev(() => ({ combo: Battle.combo, flourish: Battle.flourish, streak: document.getElementById('comboTxt').textContent }));
    t.ok('spending it ends the streak and readies the flourish', st.combo === 0 && st.flourish === true, JSON.stringify(st));
    const b2 = await bar(t);
    t.ok('and the bar says it is ready, with nothing more to press', b2 && !b2.on && b2.text.includes('Flourish ready'), JSON.stringify(b2));

    a = await answer(t, true);
    t.ok('the next right answer lands three times as hard', plain === 1 && a.bonus === 3, JSON.stringify({ plain, a }));
    t.ok('and spends it, the streak at one', !a.flourish && a.combo === 1, JSON.stringify(a));
    a = await answer(t, true);
    t.ok('the blow after lands as ever', a.bonus === plain, JSON.stringify({ plain, a }));

    for (let i = 0; i < 6; i++) a = await answer(t, true);
    t.ok('eight in a row again offer it again', ((await bar(t)) || {}).on === true);
    await t.ev(() => document.querySelector('#powerbar [data-pw="flourish"]').click());
    await sleep(300);
    a = await answer(t, false);
    t.ok('a miss before the blow loses it', !a.flourish && a.combo === 0, JSON.stringify(a));
    a = await answer(t, true);
    t.ok('so the next right answer lands as ever', a.bonus === plain, JSON.stringify({ plain, a }));

    for (let i = 0; i < 8; i++) a = await answer(t, true);
    await t.ev(() => document.querySelector('#powerbar [data-pw="flourish"]').click());
    await fight(t);
    t.ok('a new fight starts without a readied flourish', await t.ev(() => !Battle.flourish) && await bar(t) === null);

    await fight(t, 'arena');
    for (let i = 0; i < 8; i++) a = await answer(t, true);
    t.eq('a practice bout offers none', await bar(t), null);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { Battle.flee(); UI.go('s-title'); });
  }
};
