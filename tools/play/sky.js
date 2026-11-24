/* The sky.
 *
 * Each realm's sky is kept for the sitting, and an omen shows on its heading
 * on the map. A fight under one says so as it starts. A gold moon pays a
 * quarter more gold for the victory, said on the card; a fair wind lands the
 * knight's blows a fifth harder; a mist has the foe's blows land a fifth
 * lighter. A plain sky does none of it, and a practice bout is under no sky.
 * These checks fight the first foe with real answers on a phone. Nothing new
 * is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, sky, mode) => t.ev(([sky, mode]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  Sky.sky = { 0: sky, 1: null, 2: null, 3: null, 4: null };
  document.querySelectorAll('.toast').forEach(d => d.remove());
  const e = Elite.CHANCE; Elite.CHANCE = 0;
  WarPath.n = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = e;
  if (mode) Battle.mode = mode;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
  return [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | ');
}, [sky, mode || null]);
/* One answer that leaves the foe standing, the foe's blow a set 30; then the knight's blow and what a miss cost. */
const answer = (t, right) => t.ev(right => {
  let bonus = null;
  const cs = Combat.strike, fh = Combat.foeHit;
  Combat.strike = (d, s, c, cr, rg, b) => { bonus = b; return 1; }; Combat.foeHit = () => 30;
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
  const b = document.querySelector('#explain button'); if (b) b.click();
  return { bonus, lost: hp - Game.s.hp };
}, right);
/* The killing blow; then the victory card and the gold it paid. */
const finish = async (t) => {
  await t.ev(() => {
    window.__gold0 = Game.s.gold;
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1200);
  await t.ev(() => { Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  return t.ev(() => ({ paid: Game.s.gold - window.__gold0, line: document.getElementById('skyLine') ? document.getElementById('skyLine').innerText : null,
    wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 }));
};
const heading = (t) => t.ev(() => {
  UI.go('s-map');
  const tag = ri => { const d = document.getElementById('realm-' + ri), g = d && d.querySelector('summary .skyTag'); return g ? g.innerText : null; };
  return { vale: tag(0), marches: tag(1), wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'sky',
  sky: true,
  title: 'The sky · a realm\'s omen this sitting: a gold moon, a fair wind or a mist',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null; Campfire.slips = [];
      for (const k of ['0:0', '0:1', '0:2', '0:3', '1:0']) Game.s.cleared[k] = 'A';
    });

    let said = await fight(t, null);
    t.eq('a fight under a plain sky says nothing of it', said, '');
    let a = await answer(t, true), b = await answer(t, false);
    t.ok('and its blows land as ever', a.bonus === 1 && b.lost === 30, JSON.stringify([a, b]));
    let w = await finish(t);
    const plain = w.paid;
    t.ok('and its victory pays plain gold, with no word of the sky', plain > 0 && w.line === null, JSON.stringify(w));
    await t.ev(() => { Sky.sky = { 0: null, 1: null }; });
    let m = await heading(t);
    t.ok('the map shows no omen on a plain sky', m.vale === null && m.marches === null, JSON.stringify(m));

    await t.ev(() => { Sky.sky = { 0: 'moon', 1: null }; });
    m = await heading(t);
    t.ok('a gold moon shows on its realm\'s heading, and no other', m.vale === '🌕' && m.marches === null && m.wide, JSON.stringify(m));
    said = await fight(t, 'moon');
    t.ok('a fight under it says so as it starts', /🌕 A gold moon over Vale of Vectors: a quarter more gold for every victory\./.test(said), said);
    await answer(t, true);
    w = await finish(t);
    t.ok('and its victory pays a quarter more gold, said on the card', Math.abs(w.paid - plain * 1.25) <= 1 && /Under a gold moon/.test(w.line || '') && w.wide, JSON.stringify({ plain, w }));

    said = await fight(t, 'wind');
    t.ok('a fair wind says so', /🌬️ A fair wind over Vale of Vectors/.test(said), said);
    a = await answer(t, true);
    t.ok('and lands the knight\'s blows a fifth harder', Math.abs(a.bonus - 1.2) < 1e-9, JSON.stringify(a));
    b = await answer(t, false);
    t.eq('the foe\'s as ever', b.lost, 30);

    said = await fight(t, 'mist');
    t.ok('a mist says so', /🌫️ A mist over Vale of Vectors/.test(said), said);
    b = await answer(t, false);
    t.eq('and the foe\'s blow lands a fifth lighter', b.lost, 24);
    a = await answer(t, true);
    t.eq('the knight\'s as ever', a.bonus, 1);

    said = await fight(t, 'wind', 'arena');
    a = await answer(t, true);
    t.ok('a practice bout is under no sky', a.bonus === 1, JSON.stringify(a));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
