/* Wayfarers.
 *
 * Now and then a campaign victory meets someone on the road: the victory card
 * tells the meeting and offers one question on a topic of the realm already
 * met, for a small prize it names. A right answer wins just that prize, said
 * on the card; a miss shows the answer and gives nothing; either way the
 * answer counts toward the topic, and the meeting asks only once. With the
 * odds at nothing, a victory meets no one. These checks win real fights with
 * real answers on a phone. Nothing new is saved.
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
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
/* A fight won with two right answers, through to the victory card. */
const win = async (t) => {
  await fight(t);
  for (let i = 0; i < 2; i++) {
    await t.ev(i => {
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = i ? 1 : 1e6;
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs;
    }, i).catch(() => {});
    await sleep(1200);
    await t.ev(() => { Game.s.maxHp = Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
    await sleep(400);
  }
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
};
const card = (t) => t.ev(() => {
  const $ = id => document.getElementById(id), w = Wayfarer.cur;
  return { box: $('wayfarer') ? $('wayfarer').innerText : null, go: $('wayGo') ? $('wayGo').innerText : null,
    q: $('wayQ') ? $('wayQ').innerText : null, choices: document.querySelectorAll('#wayChoices .choice').length,
    done: $('wayDone') ? $('wayDone').innerText : null, kind: w ? w.kind.id : null, key: w ? w.key : null,
    prize: w ? w.kind.prize(w) : null, seen: w ? (Game.s.topicStats[w.key] || { seen: 0 }).seen : null,
    wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});
const purse = (t) => t.ev(() => ({ gold: Game.s.gold, potion: Game.s.items.potion, insight: Game.s.items.insight, rage: Game.s.items.rage }));
const ITEM = { scholar: 'potion', hermit: 'insight', bard: 'rage' };

module.exports = {
  name: 'wayfarer',
  title: 'Wayfarers · now and then someone on the road asks a question for a small prize',
  viewport: { width: 390, height: 844 },
  wayfarer: true,
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, Wayfarer.CHANCE];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Wayfarer.CHANCE = 1;
    });

    // a meeting, answered right
    await win(t);
    let c = await card(t);
    t.ok('a victory can meet a wayfarer, told on the card with the prize named', !!c.box && !!c.go && c.go.includes('Answer for ' + c.prize), JSON.stringify(c));
    t.ok('and it fits a phone', c.wide);
    t.ok('the question is on a topic of the realm already met', c.seen > 0 && await t.ev(k => REALMS[0].pool.includes(k), c.key), JSON.stringify(c));
    const met = c, before = await purse(t);
    await t.ev(() => document.getElementById('wayGo').click());
    await sleep(300);
    c = await card(t);
    t.ok('answering asks one question with its choices', !!c.q && c.choices === 4 && !c.go, JSON.stringify(c));
    await t.ev(() => document.querySelector('#wayChoices .choice[data-correct="1"]').click());
    await sleep(300);
    c = await card(t);
    const after = await purse(t);
    t.ok('a right answer is said on the card with its prize', !!c.done && c.done.includes('Well answered') && c.done.includes(met.prize), JSON.stringify(c));
    const want = Object.assign({}, before);
    if (met.kind !== 'smith') want[ITEM[met.kind]] += 1;
    t.ok('and gives just that prize', met.kind === 'smith'
      ? after.gold > before.gold && after.potion === before.potion && after.insight === before.insight && after.rage === before.rage
      : JSON.stringify(after) === JSON.stringify(want), JSON.stringify({ kind: met.kind, before, after }));
    t.eq('the answer counts toward the topic', await t.ev(k => Game.s.topicStats[k].seen, met.key), met.seen + 1);
    await t.ev(() => { const b = document.querySelector('#wayChoices .choice:not([data-correct="1"])'); if (b && b.onclick) b.onclick(); });
    await sleep(200);
    t.ok('and the meeting pays once', JSON.stringify(await purse(t)) === JSON.stringify(after) && (await t.ev(() => document.querySelectorAll('#wayDone').length)) === 1);

    // a meeting, missed
    await win(t);
    c = await card(t);
    const miss = c, was = await purse(t);
    await t.ev(() => document.getElementById('wayGo').click());
    await sleep(300);
    await t.ev(() => document.querySelector('#wayChoices .choice:not([data-correct="1"])').click());
    await sleep(300);
    c = await card(t);
    t.ok('a miss shows the answer and costs nothing', !!c.done && c.done.includes('The answer was') && c.done.includes('costs you nothing'), JSON.stringify(c));
    t.ok('and gives nothing', JSON.stringify(await purse(t)) === JSON.stringify(was), JSON.stringify([was, await purse(t)]));
    t.eq('the miss counts toward the topic too', await t.ev(k => Game.s.topicStats[k].seen, miss.key), miss.seen + 1);

    // with the odds at nothing, no one
    await t.ev(() => { Wayfarer.CHANCE = 0; });
    await win(t);
    c = await card(t);
    t.ok('a victory with no meeting shows none', c.box === null && c.go === null, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of, Wayfarer.CHANCE] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
