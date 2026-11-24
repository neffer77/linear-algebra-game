/* A ballad.
 *
 * Every victory card sings the fight in a line under the foe's fall, and the
 * line is the fight's own. A fight with no miss is sung as flawless, a win
 * after a run of misses as hard work, a win with the knight nearly felled as
 * a win from the brink, and a bold stance as a bold one. The line names the
 * foe and pays nothing. These checks win real fights with real answers on a
 * phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, stance) => t.ev(stance => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  WarPath.n = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
  for (let i = 0; stance && i < 3 && Battle.stance !== stance; i++) Stance.turn(Battle);
}, stance || null);
/* One answer, right or wrong, struck softly unless it is the last. */
const answer = async (t, right, last, hp) => {
  await t.ev(([right, last, hp]) => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = last ? 1 : 1e6;
    Game.s.maxHp = 1000; Game.s.hp = hp;
    Battle.answer(null, right ? Battle.cur.a : Battle.cur.choices.find(c => c !== Battle.cur.a));
    Combat.strike = cs;
  }, [right, last, hp]).catch(() => null);
  await sleep(1200);
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  await sleep(400);
};
/* A fight won after some misses, ending at the health asked for. */
const win = async (t, misses, hp, stance) => {
  await fight(t, stance);
  for (let i = 0; i < misses; i++) await answer(t, false, false, 1000);
  await answer(t, true, false, 1000);
  await answer(t, true, true, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  const c = await t.ev(() => {
    const el = document.getElementById('ballad'), gold = document.getElementById('rGold');
    return { k: el ? el.dataset.k : null, text: el ? el.innerText : null, foe: Battle.foe.nm, missed: Battle.missed,
      after: !!el && !!el.previousElementSibling && /falls before your blade/.test(el.previousElementSibling.innerText),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1, screen: document.querySelector('.screen.on') && document.querySelector('.screen.on').id };
  });
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return c;
};

module.exports = {
  name: 'ballad',
  title: 'A ballad · every victory card sings the fight in a line of its own',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
    });

    let c = await win(t, 0, 1000);
    t.ok('a fight with no miss is sung as flawless, under the foe\'s fall', c.k === 'flawless' && c.after && /^🎶 /.test(c.text), JSON.stringify(c));
    t.ok('and the verse names the foe', !!c.text && c.text.toLowerCase().includes(c.foe.toLowerCase()), JSON.stringify(c));
    t.ok('and it fits a phone', c.wide, JSON.stringify(c));

    c = await win(t, 3, 1000);
    t.ok('a win after three misses is sung as hard work', c.k === 'grit' && c.missed === 3 && c.text.toLowerCase().includes(c.foe.toLowerCase()), JSON.stringify(c));

    c = await win(t, 1, 150);
    t.ok('a win with the knight nearly felled is sung from the brink', c.k === 'brink', JSON.stringify(c));

    c = await win(t, 1, 1000, 'bold');
    t.ok('a bold stance is sung as bold', c.k === 'bold', JSON.stringify(c));

    c = await win(t, 1, 1000);
    t.ok('a plain win is still sung', c.k === 'plain' && !!c.text, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
