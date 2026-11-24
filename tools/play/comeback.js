/* A comeback.
 *
 * A campaign fight won after the knight's health fell to a quarter or less
 * pays a quarter more gold, said on the victory card and counted into the
 * gold shown. Health that comes back before the win keeps the comeback; a
 * fight that never fell that low says nothing; and the next fight starts
 * without it. These checks win real fights with real answers on a phone.
 * Nothing new is saved.
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
  WarPath.n = 0; Satchel.n = 0; Boon.open = false; Boon.held = null;
});
/* One answer that leaves the foe standing; a miss lands a blow of the size given. Returns the health after. */
const answer = async (t, right, blow) => {
  await t.ev(([right, blow]) => {
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => blow;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
  }, [right, blow || 1]);
  await sleep(900);
  const hp = await t.ev(() => Game.s.hp);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return hp;
};
/* The killing blow with a right answer; then the victory card. */
const finish = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);   // the gold counts up on the card
  const r = await t.ev(() => {
    const l = document.getElementById('comebackLine');
    return { line: l ? l.innerText : null, counted: +document.getElementById('rGold').innerText, paid: Game.s.gold - window.__gold0,
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'comeback',
  title: 'Comeback · a win from a quarter of your health or less pays a quarter more gold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    await fight(t);
    const hp = await answer(t, false, 800);
    t.ok('a miss knocks the knight to a quarter of their health or less', hp > 0 && hp <= 250, String(hp));
    await t.ev(() => { Game.s.hp = 1000; });   // and health comes back before the win
    let g = await finish(t);
    const n = +((g.line || '').match(/\+(\d+) gold/) || [])[1];
    t.ok('the win is a comeback, said on the card with its gold', n > 0 && /comeback/.test(g.line), JSON.stringify(g));
    t.eq('and the card counts it into the gold it pays', g.counted, g.paid);
    t.ok('the card fits a phone', g.wide);

    await fight(t);
    await answer(t, true);
    g = await finish(t);
    t.ok('the next fight starts without it', g.line === null, JSON.stringify(g));

    await fight(t);
    t.ok('a miss that leaves more than a quarter', (await answer(t, false, 700)) > 250);
    g = await finish(t);
    t.ok('is no comeback', g.line === null && g.counted === g.paid, JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
