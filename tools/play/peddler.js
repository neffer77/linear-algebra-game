/* A peddler.
 *
 * On the third victory of a sitting, and the eighth, a peddler waits on the
 * victory card with one thing at half the shop's price: whichever of a
 * draught, an insight or a rune the knight carries fewest of. A tap buys it
 * into the pack, once. A purse that will not stand it buys nothing. The first
 * and second victories meet no one. These checks win real fights with real
 * answers on a phone. Nothing new is saved.
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
  const $ = id => document.getElementById(id), b = $('peddlerBuy');
  return { says: $('peddlerSays') ? $('peddlerSays').innerText : null, buy: b ? b.innerText : null, off: b ? b.disabled : null,
    wins: Sitting.wins, items: Object.assign({}, Game.s.items), gold: Game.s.gold, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'peddler',
  title: 'A peddler · the third victory of a sitting meets one thing to buy at half price',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Sitting.wins = 0; Peddler.sold = 0; Campfire.slips = [];
      Game.s.cleared['0:0'] = 'A';
      Object.assign(Game.s.items, { potion: 2, insight: 0, rage: 1 });
    });

    let c = await win(t);
    t.ok('the first victory meets no one', c.wins === 1 && c.says === null, JSON.stringify(c));
    c = await win(t);
    t.ok('nor the second', c.wins === 2 && c.says === null, JSON.stringify(c));
    await t.ev(() => { Game.s.gold = 500; });
    c = await win(t);
    t.ok('the third meets a peddler with what the pack is shortest of, at half the shop\'s price',
      c.wins === 3 && /🔮 Sage's Insight, half what the shop asks\./.test(c.says || '') && /Buy · 🪙 28/.test(c.buy || '') && c.off === false, JSON.stringify(c));
    t.ok('on a phone', c.wide);
    const gold = c.gold;
    await t.ev(() => document.getElementById('peddlerBuy').click());
    c = await card(t);
    t.ok('a tap buys it into the pack', c.items.insight === 1 && c.gold === gold - 28 && /Bought: 🔮 ×1 in your pack/.test(c.buy || '') && c.off === true, JSON.stringify(c));
    await t.ev(() => document.getElementById('peddlerBuy').click());
    c = await card(t);
    t.ok('once', c.items.insight === 1 && c.gold === gold - 28, JSON.stringify(c));
    t.eq('and the shop would have asked twice as much', await t.ev(() => ITEMS.insight.cost), 55);

    c = await win(t);
    t.ok('the fourth meets no one', c.wins === 4 && c.says === null, JSON.stringify(c));
    await t.ev(() => { Sitting.wins = 7; Object.assign(Game.s.items, { potion: 0, insight: 3, rage: 3 }); });
    c = await win(t);
    t.ok('the eighth meets another, with a draught this time', c.wins === 8 && /🧪 Healing Draught/.test(c.says || ''), JSON.stringify(c));
    await t.ev(() => { Game.s.gold = 3; document.getElementById('peddlerBuy').click(); });
    c = await card(t);
    t.ok('which a thin purse cannot buy', c.items.potion === 0 && c.gold === 3, JSON.stringify(c));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
