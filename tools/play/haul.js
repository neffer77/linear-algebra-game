/* Spoils.
 *
 * A big win used to stack a dozen bold, centred bonus sentences above the
 * gold it paid, a long scroll on a phone. Now the totals lead the victory card
 * as chips, and the bonuses sit under them as one list with a small heading,
 * folded past the first three behind a line that opens the rest in place.
 * These checks win real fights with real answers on a phone. Nothing new is
 * saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, ri, fi, fresh) => t.ev(([ri, fi, fresh]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  if (fresh) delete Game.s.cleared[ri + ':' + fi];
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(ri, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 99999;
  Battle.beastLeft = 0; Battle.wardUp = false;
}, [ri, fi, fresh]);
/* The killing blow with the step's own right answer, then what the card says. */
const finish = async t => {
  for (let i = 0; i < 6; i++) {
    const won = await t.ev(() => {
      if (Battle.over || Battle.ehp <= 0) return true;
      const st = Battle.step && Battle.step(); if (!st) return false;
      const cs = Combat.strike; Combat.strike = () => 5;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
      Battle.answer(null, st.a);
      Combat.strike = cs;
      return Battle.ehp <= 0;
    });
    if (won) break;
    await sleep(900);
    await t.ev(() => { const b = document.querySelector('#explain button'); if (b && !Battle.over) b.click(); });
    await sleep(300);
  }
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(300);
  const c = await t.ev(() => {
    const box = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, h: r.height, left: r.left, right: r.right }; };
    const haul = document.getElementById('haul');
    const rows = haul ? Haul.rows(haul) : [];
    const op = document.getElementById('haulOpen');
    return { spoils: box('spoils'), haul: box('haul'), grade: box('gradeCard') || box('lvlBar'), gold: box('rGold'),
      head: haul && haul.querySelector('.haulHead') ? haul.querySelector('.haulHead').innerText : null,
      rows: rows.length, ids: rows.map(r => r.id), folded: !!haul && haul.classList.contains('folded'), opener: op ? op.innerText : null,
      lastShown: rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom <= haul.getBoundingClientRect().bottom + 1 : true,
      text: document.getElementById('resultBody').innerText, vh: innerHeight,
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1, screen: document.querySelector('.screen.on').id };
  });
  return c;
};
const shut = async t => {
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
};

module.exports = {
  name: 'haul',
  title: 'Spoils · the victory card leads with its totals as chips, and a big win\'s bonuses sit in one list, folded past the first three',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
    });

    // an ordinary first win: the totals at the top, on the first screen, the few bonuses under them, shown whole
    await fight(t, 0, 0, true);
    let c = await finish(t);
    t.ok('the gold and experience lead the card as chips, on the phone\'s first screen', c.screen === 's-result' && c.spoils && c.spoils.bottom < c.vh && c.gold && c.gold.top < c.vh, JSON.stringify(c));
    t.ok('the bonuses sit under the totals and above the grade, titled with their count', c.haul && c.haul.top > c.spoils.bottom && (!c.grade || c.haul.bottom <= c.grade.top + 1)
      && c.rows > 0 && c.head === (c.rows === 1 ? 'A BONUS' : 'BONUSES · ' + c.rows) && !c.folded && !c.opener && c.wide, JSON.stringify(c));
    await shut(t);

    // a big win: eight bonuses said, three shown, the rest folded behind one line that opens them
    await t.ev(() => {
      window.__lines = [Overkill.line, Revenge.line, Comeback.line, Gild.line, Oath.line, Treasure.line, Gauntlet.line, Sky.line];
      const say = (id, txt) => () => `<div id="${id}" style="color:#ffd36b;font-weight:800;margin-top:6px">${txt}</div>`;
      Overkill.line = say('xOver', '💥 Overkill: 9 past its last health, +5 gold.');
      Revenge.line = say('xRev', '⚔️ Revenge: the gold it took is yours again.');
      Comeback.line = say('xBack', '🔥 A comeback from the brink: +20 gold.');
      Gild.line = say('xGild', '🪙 The fight\'s gilded questions paid you 31 gold as you answered.');
      Oath.line = say('xOath', '🗡️ Your oath kept: +40 gold.');
      Treasure.line = say('xMap', '🗺️ A scrap of a treasure map.');
      Gauntlet.line = say('xGnt', '🏁 The gauntlet goes on.');
      Sky.line = say('xSky', '🌙 The moon paid 12 gold.');
    });
    await fight(t, 0, 0, false);
    c = await finish(t);
    const n = c.rows;
    t.ok('a big win: every bonus in the one list, titled with its count', n >= 8 && c.head === 'BONUSES · ' + n && ['xOver', 'xGild', 'xSky'].every(id => c.ids.includes(id)), JSON.stringify(c));
    t.ok('folded past the first three, with a line that says how many more', c.folded && c.opener === '＋ ' + (n - 3) + ' more bonuses' && !c.lastShown && c.haul.h < 260 && c.spoils.bottom < c.vh, JSON.stringify(c));
    t.ok('folding only clips the list: the last bonus is still in the card\'s text', /The moon paid 12 gold/.test(c.text) && c.wide, JSON.stringify(c));
    await shut(t);
    await t.ev(() => document.getElementById('haulOpen').click());
    await sleep(200);
    const o = await t.ev(() => { const h = document.getElementById('haul'), rows = Haul.rows(h), r = h.getBoundingClientRect();
      return { folded: h.classList.contains('folded'), opener: !!document.getElementById('haulOpen'), h: r.height, all: rows.every(x => x.getBoundingClientRect().bottom <= r.bottom + 1) }; });
    t.ok('the line opens the rest in place, and goes', !o.folded && !o.opener && o.all && o.h > c.haul.h + 60, JSON.stringify([o, c.haul]));
    await t.ev(() => { [Overkill.line, Revenge.line, Comeback.line, Gild.line, Oath.line, Treasure.line, Gauntlet.line, Sky.line] = window.__lines; });

    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
