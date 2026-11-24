/* Letters from home.
 *
 * Every tenth victory brings a letter from Maren in Linden Ford, with a
 * Healing Draught tucked inside, shown on the victory card. The Saga page
 * keeps every letter received and says when the next arrives. These checks
 * win real fights with real answers on a phone. Nothing new is saved.
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
  const $ = id => document.getElementById(id), l = $('letterCard');
  return { n: l ? +l.dataset.n : 0, text: l ? l.innerText : null, gift: $('letterGift') ? $('letterGift').innerText : null,
    wins: Game.s.stats.wins, potions: Game.s.items.potion, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});
const page = (t) => t.ev(() => {
  UI.go('s-saga');
  const el = document.getElementById('letterList');
  return { head: (document.getElementById('lettersHead') || {}).innerText || '', shown: el.querySelectorAll('.letter').length,
    wide: document.getElementById('s-saga').scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'letters',
  title: 'Letters from home · every tenth victory a letter from Linden Ford, with a draught inside',
  viewport: { width: 390, height: 844 },
  letters: true,
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      // no chests: a draught found in one would be counted with the letter's
      window.__chest = Chest.open; Chest.open = () => {};
      Sitting.wins = 0; Campfire.slips = []; Dicer.played = 0;
      Game.s.cleared['0:0'] = 'A';
    });
    let p = await page(t);
    t.ok('a new knight has had no letter yet, and the page says when the first comes', p.shown === 0 && /0 of 8 received\. The next arrives at your 10th victory\./.test(p.head), JSON.stringify(p));
    await t.ev(() => { Game.s.stats.wins = 8; });
    let c = await win(t);
    t.ok('the ninth victory brings none', c.wins === 9 && c.n === 0, JSON.stringify(c));
    const pot = c.potions;
    c = await win(t);
    t.ok('the tenth brings the first letter, said on the card', c.wins === 10 && c.n === 1 && /A LETTER FROM HOME · 1 OF 8/.test(c.text || '') && /Maren, Linden Ford/.test(c.text || ''), JSON.stringify(c));
    t.ok('with a draught tucked inside', c.potions === pot + 1 && /Healing Draught, now in your pack/.test(c.gift || ''), JSON.stringify(c));
    t.ok('on a phone', c.wide);
    c = await win(t);
    t.ok('the eleventh brings none', c.wins === 11 && c.n === 0 && c.potions === pot + 1, JSON.stringify(c));
    p = await page(t);
    t.ok('the Saga page keeps it, and says when the next comes', p.shown === 1 && /1 of 8 received\. The next arrives at your 20th victory\./.test(p.head) && p.wide, JSON.stringify(p));
    await t.ev(() => { Game.s.stats.wins = 79; });
    c = await win(t);
    t.ok('the eightieth brings the last', c.wins === 80 && c.n === 8, JSON.stringify(c));
    p = await page(t);
    t.ok('and then the page keeps all eight', p.shown === 8 && /8 of 8 received\. Every letter has come\./.test(p.head), JSON.stringify(p));
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Chest.open = window.__chest; Battle.flee(); UI.go('s-title'); });
  }
};
