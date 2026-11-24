/* The satchel.
 *
 * Every right answer in a campaign fight drops a spoil in the satchel, shown
 * beside the streak, and a miss takes nothing out. At twenty-five it is full,
 * the scene says so, and the next victory opens it: a sure chest with a rare
 * find at the least, said on the victory card. Then it starts again. These
 * checks fight with real answers on a phone. Nothing new is saved.
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
const streak = (t) => t.ev(() => document.getElementById('comboTxt').textContent);
/* One answer, right or wrong, that leaves the foe standing. */
const answer = async (t, right) => {
  await t.ev(right => {
    window.__said = window.__said || [];
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    const f = Anim.float; Anim.float = function (x, y, text) { window.__said.push(text); return f.apply(this, arguments); };
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh; Anim.float = f;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return streak(t);
};
/* The killing blow with a right answer; then the victory card and what it dropped. */
const finish = async (t) => {
  await t.ev(() => {
    window.__rolls = [];
    // only a sure chest drops, so a chest is the satchel's and not the dice's
    window.__chance = R.chance; R.chance = p => p >= 1;
    const roll = Loot.roll; window.__roll = roll;
    Loot.roll = function (ctx) { const d = roll.apply(this, arguments); window.__rolls.push({ satchel: !!ctx.satchel, rar: d.rar }); return d; };
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  const r = await t.ev(() => {
    Loot.roll = window.__roll; R.chance = window.__chance;
    const l = document.getElementById('satchelLine');
    return { line: l ? l.innerText : null, rolls: window.__rolls, chest: document.getElementById('chest').classList.contains('on'),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'satchel',
  title: 'Satchel · twenty-five right answers open a chest with a rare find',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    await fight(t);
    t.ok('a campaign fight shows an empty satchel beside the streak', (await streak(t)).includes('🎒 0/25'), await streak(t));
    let s;
    for (let i = 0; i < 3; i++) s = await answer(t, true);
    t.ok('each right answer adds a spoil', s.includes('🎒 3/25'), s);
    s = await answer(t, false);
    t.ok('and a miss takes nothing out', s.includes('🎒 3/25'), s);

    // a sitting of fights later: two short of full
    await t.ev(() => { Satchel.n = 23; window.__said = []; });
    s = await answer(t, true);
    t.ok('the count goes on from fight to fight', s.includes('🎒 24/25'), s);
    s = await answer(t, true);
    t.ok('at twenty-five it is full', s.includes('🎒 full'), s);
    t.ok('and the scene says so', (await t.ev(() => window.__said)).includes('SATCHEL FULL'));
    s = await answer(t, true);
    t.ok('it holds no more', s.includes('🎒 full'), s);

    let g = await finish(t);
    t.ok('the next victory opens it, said on the card', !!g.line && /satchel was full/.test(g.line), JSON.stringify(g));
    t.ok('for a sure chest', g.chest && g.rolls.length === 1 && g.rolls[0].satchel, JSON.stringify(g));
    t.ok('with a rare find at the least', ['rare', 'epic', 'legendary'].includes((g.rolls[0] || {}).rar), JSON.stringify(g.rolls));
    t.ok('and the card fits a phone', g.wide);

    await fight(t);
    t.ok('then it starts again from nothing', (await streak(t)).includes('🎒 0/25'), await streak(t));
    await answer(t, true);
    g = await finish(t);
    t.ok('and a victory with it not full says nothing of it', g.line === null && g.rolls.every(r => !r.satchel), JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
