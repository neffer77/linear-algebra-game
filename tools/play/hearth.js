/* The hearth.
 *
 * The title's day streak pays the first campaign victory of a sitting a tenth
 * more gold for each day in a row, up to seven. The card says so and counts
 * it in with the rest of the gold; the second victory of the sitting pays
 * nothing extra. These checks win real fights with real answers on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A fight won with right answers; then what the victory card shows. */
const win = async (t) => {
  await t.ev(() => {
    Battle.flee();
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Elite.force = null;
    const e = Elite.CHANCE; Elite.CHANCE = 0;
    Battle.begin(0, 0);
    Elite.CHANCE = e;
    Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
    Battle.beastLeft = 0; Battle.wardUp = false;
    Satchel.n = 0; Boon.open = false; Boon.held = null;
  });
  for (let i = 0; i < 5 && await t.screen() !== 's-result'; i++) {
    await t.ev(() => {
      if (!Battle.cur) return;
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = 1;
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs;
    }).catch(() => null);
    await sleep(1200);
    await t.ev(() => { Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
    for (let j = 0; j < 12 && await t.screen() !== 's-result'; j++) await sleep(250);
  }
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return card(t);
};
const card = (t) => t.ev(() => {
  const $ = id => document.getElementById(id);
  return { line: $('hearthLine') ? $('hearthLine').innerText : null, paid: +$('rGold').textContent,
    wins: Sitting.wins, tally: Sitting.gold, gold: Game.s.gold, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'hearth',
  title: 'The hearth · a day streak pays the first victory of each sitting a tenth more gold a day, up to seven',
  viewport: { width: 390, height: 844 },
  hearth: true,
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Sitting.wins = 0; Sitting.gold = 0; Campfire.slips = []; Dicer.played = 0;
      Game.s.cleared['0:0'] = 'S';
      Game.s.streak.days = 3;
    });
    const g0 = await t.ev(() => Game.s.gold);
    let c = await win(t);
    const n = +((c.line || '').match(/\+(\d+)\./) || [])[1];
    t.ok('the first victory of a sitting on day three of a streak pays three tenths more gold, said on the card',
      /🔥 Day 3 in a row: your first victory this sitting pays 30% more gold, \+\d+\./.test(c.line || '') && n > 0 && n === Math.round((c.paid - n) * 0.3), JSON.stringify(c));
    t.ok('counted in with the rest of the card\'s gold, and paid', c.tally === c.paid && c.gold === g0 + c.paid, JSON.stringify([g0, c]));
    t.ok('on a phone', c.wide);
    const g1 = c.gold;
    c = await win(t);
    t.ok('the second victory pays nothing extra', c.wins === 2 && c.line === null && c.gold === g1 + c.paid, JSON.stringify(c));
    await t.ev(() => { Sitting.wins = 0; Sitting.gold = 0; Game.s.streak.days = 12; });
    c = await win(t);
    const m = +((c.line || '').match(/\+(\d+)\./) || [])[1];
    t.ok('a long streak pays seven tenths more at the most', /Day 12 in a row: your first victory this sitting pays 70% more gold/.test(c.line || '') && m === Math.round((c.paid - m) * 0.7), JSON.stringify(c));
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
