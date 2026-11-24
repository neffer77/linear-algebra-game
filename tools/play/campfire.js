/* A campfire.
 *
 * A campaign miss is a slip to go over later. A wounded knight with a slip
 * waiting is offered, on the victory card, a camp by the fire: one question
 * on the slip's topic. A miss there shows the answer and keeps the slip for
 * the next camp; a right answer mends half the knight's wounds and puts the
 * slip behind them, so the next victory offers no camp. A knight at full
 * health is offered none. These checks win real fights with real answers on
 * a phone. Nothing new is saved.
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
/* One answer, right or wrong, struck softly unless it is the last. */
const answer = async (t, right, last, hp) => {
  const key = await t.ev(([right, last]) => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = last ? 1 : 1e6;
    const k = Battle.cur.key;
    Battle.answer(null, right ? Battle.cur.a : Battle.cur.choices.find(c => c !== Battle.cur.a));
    Combat.strike = cs;
    return k;
  }, [right, last]).catch(() => null);
  await sleep(1200);
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  await sleep(400);
  return key;
};
/* A fight won, with a miss first if asked, ending wounded or whole. */
const win = async (t, miss, hp) => {
  await fight(t);
  let key = null;
  if (miss) key = await answer(t, false, false, 1000);
  await answer(t, true, false, 1000);
  await t.ev(hp => { Game.s.hp = hp; }, hp);
  await answer(t, true, true, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return key;
};
const card = (t) => t.ev(() => {
  const $ = id => document.getElementById(id);
  return { box: $('camp') ? $('camp').innerText : null, go: !!$('campGo'), q: $('campQ') ? $('campQ').innerText : null,
    choices: document.querySelectorAll('#campChoices .choice').length, done: $('campDone') ? $('campDone').innerText : null,
    key: Campfire.cur ? Campfire.cur.key : null, slips: Campfire.slips.map(s => s.key), hp: Game.s.hp, max: Game.s.maxHp,
    wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'campfire',
  title: 'A campfire · a wounded knight goes over a slip from earlier by the fire, and a right answer mends half the wounds',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Campfire.slips = [];
    });

    // a miss, then a victory with wounds: the camp is offered on that slip
    const slip = await win(t, true, 400);
    let c = await card(t);
    const label = await t.ev(k => TOPIC_LABEL[k] || k, slip);
    t.ok('a miss is a slip kept for later', c.slips.includes(slip), JSON.stringify([slip, c]));
    t.ok('a wounded knight is offered a camp on it, with what it mends', !!c.box && c.go && c.key === slip && c.box.includes(label)
      && c.box.includes('+' + Math.round((c.max - c.hp) / 2)), JSON.stringify(c));
    t.ok('and it fits a phone', c.wide);
    await t.ev(() => document.getElementById('campGo').click());
    await sleep(300);
    c = await card(t);
    t.ok('the camp asks one question', !!c.q && c.choices === 4 && !c.go, JSON.stringify(c));
    const was = c.hp;
    await t.ev(() => document.querySelector('#campChoices .choice:not([data-correct="1"])').click());
    await sleep(300);
    c = await card(t);
    t.ok('a miss by the fire shows the answer and keeps the slip', !!c.done && c.done.includes('The answer was') && c.done.includes('next camp')
      && c.slips.includes(slip) && c.hp === was, JSON.stringify(c));

    // the next victory, wounded: the same slip, gone over right
    await win(t, false, 300);
    c = await card(t);
    t.ok('the next wounded victory offers the camp again', !!c.box && c.key === slip, JSON.stringify(c));
    const before = c.hp, n = Math.round((c.max - c.hp) / 2);
    await t.ev(() => document.getElementById('campGo').click());
    await sleep(300);
    await t.ev(() => document.querySelector('#campChoices .choice[data-correct="1"]').click());
    await sleep(300);
    c = await card(t);
    t.ok('a right answer mends half the wounds, said on the card', c.hp === before + n && !!c.done && c.done.includes('+' + n), JSON.stringify([before, n, c]));
    t.ok('and puts the slip behind the knight', !c.slips.includes(slip), JSON.stringify(c));

    // nothing left to go over: no camp
    await win(t, false, 300);
    c = await card(t);
    t.ok('with no slip waiting, no camp is offered', c.box === null, JSON.stringify(c));

    // a slip, but a whole knight: no camp
    await win(t, true, 1000);
    c = await card(t);
    t.ok('a knight at full health is offered none', c.box === null && c.slips.length === 1, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
