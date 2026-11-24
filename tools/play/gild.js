/* Gilded questions.
 *
 * Now and then a campaign question comes gilded, said above it before you
 * answer. A right answer pays a fifth of the foe's gold on the spot; a miss
 * costs only the gilding, and the question asked again after it is never
 * gilded. The victory card says what the fight's gilded questions paid.
 * These checks fight with real answers on a phone, with every fresh question
 * gilded so that each one can be watched. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, odds) => t.ev(odds => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const e = Elite.CHANCE; Elite.CHANCE = 0;
  Gild.CHANCE = odds;
  Battle.begin(0, 0);
  Elite.CHANCE = e;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
}, odds);
const told = (t) => t.ev(() => { const e = document.getElementById('gildTele'), tg = document.getElementById('telegraph');
  return e && tg.style.display === 'block' ? e.innerText : null; });
/* One answer that leaves the foe standing; returns the gold it paid. */
const answer = async (t, right) => {
  const paid = await t.ev(right => {
    const was = Game.s.gold;
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
    return Game.s.gold - was;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
  return paid;
};
/* The killing blow with a right answer; then the victory card's word on the gilding. */
const finish = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; Gild.CHANCE = 0; Battle.gilded = false;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(900);
  const r = await t.ev(() => { const l = document.getElementById('gildWon');
    return { line: l ? l.innerText : null, wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 }; });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'gild',
  gild: true,
  title: 'Gilded questions · now and then a question pays gold when answered right',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });
    t.ok('a question can come gilded in a real game', await t.ev(() => Gild.CHANCE > 0 && Gild.CHANCE < 0.5));

    await fight(t, 1);
    const worth = await t.ev(() => Gild.worth(Battle.foe));
    let s = await told(t);
    t.ok('a gilded question says so above it, with its gold', !!s && s.includes('gilded question') && s.includes(worth + ' gold'), String(s));
    t.ok('and the scene fits a phone', await t.ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
    let p = await answer(t, true);
    t.eq('a right answer pays its gold on the spot', p, worth);
    t.ok('and the next fresh question is gilded again', !!(await told(t)));
    p = await answer(t, false);
    t.eq('a miss pays nothing', p, 0);
    t.eq('and the question asked again is not gilded', await told(t), null);
    p = await answer(t, true);
    t.eq('so answering it pays nothing either', p, 0);
    p = await answer(t, true);
    t.eq('then a fresh question pays again', p, worth);
    let g = await finish(t);
    t.ok('the victory card says what the gilding paid', !!g.line && g.line.includes('paid you ' + 2 * worth + ' gold'), JSON.stringify(g));
    t.ok('and fits a phone', g.wide);

    await fight(t, 0);
    t.eq('with no gilding, nothing is told', await told(t), null);
    p = await answer(t, true);
    t.eq('and a right answer pays no gilded gold', p, 0);
    g = await finish(t);
    t.eq('and the card says nothing of the last fight\'s gilding', g.line, null);

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
