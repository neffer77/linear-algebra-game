/* A chest riddle.
 *
 * A campaign chest whose find could be finer offers one riddle on the topic
 * just fought. Answered right, the find rises a rarity, on the chest and on
 * the victory card's loot line; missed, the find stays as it was and the right
 * answer is shown. Either way the answer counts toward the topic, and the
 * riddle is offered once. A legendary find offers none, and a knight can
 * always just collect. These checks win real fights with real answers on a
 * phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The first foe of the first realm, with a knight who cannot fall or level up. */
const fight = (t) => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
const answer = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* A clean win, so a chest is sure, with its find drawn at the rarity given;
   then the chest as it opens. */
const win = async (t, rar) => {
  await fight(t); await answer(t); await answer(t);
  await t.ev(rar => {
    window.__rr = Loot.rollRarity; Loot.rollRarity = () => rar;
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  }, rar);
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);   // the chest opens a beat after the card
  return look(t);
};
const look = (t) => t.ev(() => {
  Loot.rollRarity = window.__rr || Loot.rollRarity;
  const $ = id => document.getElementById(id), shown = e => !!e && e.style.display !== 'none' && e.offsetParent !== null;
  const p = Chest.pending;
  return { on: $('chest').classList.contains('on'), riddle: shown($('criddle')) ? $('criddle').innerText : null,
    q: shown($('criddleQ')) ? $('criddleQ').innerText : null, choices: document.querySelectorAll('#criddleChoices .choice').length,
    collect: shown($('cbtn')), card: shown($('ccard')) ? $('ccard').innerText : null, out: $('criddleOut') ? $('criddleOut').innerText : null,
    loot: $('rLoot') ? $('rLoot').innerText : null, rar: p ? p.rar : null, nm: p ? p.nm : null, key: p && p.ctx ? p.ctx.key : null,
    fits: $('chest').scrollWidth <= innerWidth + 1 };
});
const seen = (t, key) => t.ev(key => { const r = Game.s.topicStats[key]; return r ? r.seen : 0; }, key);

module.exports = {
  name: 'riddle',
  title: 'A chest riddle · answer one question on the fight\'s topic to raise a chest\'s find a rarity',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__keep = [Bounty.bump, Bounty.claim, Quarry.of]; Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null; });

    // Right: the find rises.
    let c = await win(t, 'common');
    t.ok('a campaign chest offers a riddle to raise its find', c.on && !!c.riddle && c.riddle.includes('Riddle the lock') && c.riddle.includes('Rare') && c.rar === 'uncommon', JSON.stringify(c));
    t.ok('beside the plain Collect', c.collect, JSON.stringify(c));
    t.ok('and the chest fits a phone', c.fits);
    const key = c.key, was = await seen(t, key);
    await t.ev(() => document.getElementById('criddle').click());
    await sleep(300);
    c = await look(t);
    t.ok('the riddle asks one question on the topic just fought, with what it wagers', !!c.q && c.q.toLowerCase().includes('a riddle on the lock') && c.q.includes('becomes Rare') && c.q.includes('A miss keeps what you found') && c.choices === 4, JSON.stringify(c));
    t.ok('with the find hidden and no Collect until it is answered', c.card === null && !c.collect && c.riddle === null, JSON.stringify(c));
    t.ok('and fits a phone', c.fits);
    await t.ev(() => document.querySelector('#criddleChoices .choice[data-correct="1"]').click());
    await sleep(500);
    c = await look(t);
    t.ok('a right answer raises the find a rarity, said on the chest', c.rar === 'rare' && !!c.out && c.out.includes('rises to Rare') && !!c.card && c.card.toLowerCase().includes('rare'), JSON.stringify(c));
    t.ok('and on the victory card\'s loot line', !!c.loot && c.loot.includes(c.nm), JSON.stringify(c));
    t.ok('the answer counts toward the topic', await seen(t, key) === was + 1);
    t.ok('and the riddle is not offered again', c.riddle === null && c.collect, JSON.stringify(c));
    const nm = c.nm;
    await t.ev(() => document.getElementById('cbtn').click());
    await sleep(400);
    t.ok('collected, the raised find is the knight\'s', await t.ev(nm => !document.getElementById('chest').classList.contains('on') &&
      (Object.keys(Game.s.owned).some(id => [...WEAPONS, ...ARMORS].some(x => x.id === id && x.nm === nm)) || nm === 'Buried Purse'), nm), nm);

    // Wrong: the find stays.
    c = await win(t, 'common');
    const before = { rar: c.rar, nm: c.nm }, key2 = c.key, was2 = await seen(t, key2);
    await t.ev(() => document.getElementById('criddle').click());
    await sleep(300);
    await t.ev(() => document.querySelector('#criddleChoices .choice:not([data-correct="1"])').click());
    await sleep(500);
    c = await look(t);
    t.ok('a miss keeps the find as it was', c.rar === before.rar && c.nm === before.nm && !!c.card && c.card.toLowerCase().includes('uncommon'), JSON.stringify([before, c]));
    t.ok('and shows the right answer', !!c.out && c.out.includes('The lock holds') && c.out.includes('The answer was'), JSON.stringify(c));
    t.ok('the miss counts toward the topic too', await seen(t, key2) === was2 + 1);
    t.ok('and Collect takes it', c.collect && c.riddle === null, JSON.stringify(c));
    await t.ev(() => document.getElementById('cbtn').click());
    await sleep(400);

    // A legendary find offers none; a knight can just collect.
    c = await win(t, 'legendary');
    t.ok('a legendary find offers no riddle', c.on && c.rar === 'legendary' && c.riddle === null && c.collect, JSON.stringify(c));
    await t.ev(() => document.getElementById('cbtn').click());
    await sleep(400);
    c = await win(t, 'common');
    const plain = c.nm;
    await t.ev(() => document.getElementById('cbtn').click());
    await sleep(400);
    t.ok('collecting without the riddle takes the find as it was', await t.ev(() => !document.getElementById('chest').classList.contains('on') && !Chest.pending) && !!plain);

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
