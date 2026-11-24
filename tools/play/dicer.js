/* A dicer.
 *
 * On the fourth victory of a sitting, and the ninth, a dicer waits on the
 * victory card and offers double or nothing on the fight's purse: one
 * question on the topic the fight ended on. A right answer pays the purse
 * again; a miss loses it and shows the answer. One throw to a meeting. The
 * third and fifth victories meet no one. These checks win real fights with
 * real answers on a phone. Nothing new is saved.
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
  const $ = id => document.getElementById(id), go = $('dicerGo'), done = $('dicerDone');
  return { says: $('dicerSays') ? $('dicerSays').innerText : null, go: go ? go.innerText : null,
    q: !!$('dicerQ'), done: done ? done.innerText : null, ok: done ? done.dataset.ok : null,
    purse: +($('rGold') || {}).textContent || 0, wins: Sitting.wins, tally: Sitting.gold, gold: Game.s.gold,
    seen: Object.values(Game.s.topicStats).reduce((n, s) => n + (s.seen || 0), 0),
    wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});
const throwIt = (t, right) => t.ev(r => {
  document.getElementById('dicerGo').click();
  const b = [...document.querySelectorAll('#dicerChoices .choice')].find(x => (x.dataset.correct === '1') === r);
  b.click();
}, right);

module.exports = {
  name: 'dicer',
  title: 'A dicer · the fourth victory of a sitting offers double or nothing on the purse for one right answer',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Sitting.wins = 0; Sitting.gold = 0; Dicer.played = 0; Campfire.slips = [];
      Game.s.cleared['0:0'] = 'A';
    });

    let c;
    for (let w = 1; w <= 3; w++) {
      c = await win(t);
      t.ok(`victory ${w} meets no dicer`, c.wins === w && c.says === null && c.go === null, JSON.stringify(c));
    }
    c = await win(t);
    t.ok('the fourth meets a dicer, staking the purse the card counts on one question',
      c.wins === 4 && /Double or nothing on your purse, 🪙 \d+\?/.test(c.says || '') && c.purse > 0 && c.go && c.go.includes(`Throw for 🪙 ${c.purse}`), JSON.stringify(c));
    t.ok('on a phone', c.wide);
    const before = c;
    await throwIt(t, true);
    c = await card(t);
    t.ok('a right answer pays the purse again', c.ok === '1' && c.gold === before.gold + before.purse && c.tally === before.tally + before.purse
      && (c.done || '').includes(`+🪙 ${before.purse}`) && c.go === null, JSON.stringify([before, c]));
    t.ok('and counts toward its topic', c.seen === before.seen + 1, JSON.stringify([before.seen, c.seen]));
    t.eq('one throw to a meeting', await t.ev(() => { const g = Game.s.gold; Dicer.answer({ classList: { add() {}, remove() {} } }, 'x'); return Game.s.gold - g; }), 0);

    c = await win(t);
    t.ok('the fifth meets no dicer', c.wins === 5 && c.says === null, JSON.stringify(c));
    await t.ev(() => { Sitting.wins = 8; });
    c = await win(t);
    t.ok('the ninth meets him again', c.wins === 9 && c.go && c.go.includes(`Throw for 🪙 ${c.purse}`), JSON.stringify(c));
    const b9 = c;
    await throwIt(t, false);
    c = await card(t);
    t.ok('a miss loses the purse and shows the answer', c.ok === '0' && c.gold === b9.gold - b9.purse && c.tally === b9.tally - b9.purse
      && /The answer was/.test(c.done || '') && (c.done || '').includes(`−🪙 ${b9.purse}`), JSON.stringify([b9, c]));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
