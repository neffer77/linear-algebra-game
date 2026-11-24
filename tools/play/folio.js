/* Folio.
 *
 * The first time a campaign foe is beaten, the victory card opens its page
 * in the Bestiary: its line of lore, where its weak point lies, and how many
 * of the realms' foes the book now holds. Beaten again, the card says
 * nothing of it. These checks win real fights with real answers on a phone.
 * Nothing new is saved.
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
    const el = document.getElementById('folioWon'), r = el && el.getBoundingClientRect();
    const pic = document.getElementById('folioPic');
    let inked = 0;
    if (pic) { const d = pic.getContext('2d').getImageData(0, 0, pic.width, pic.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) inked++; }
    return { page: el ? el.innerText : null, inked, inside: !el || (r.left >= -1 && r.right <= innerWidth + 1),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1, screen: document.querySelector('.screen.on').id };
  });
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return c;
};

module.exports = {
  name: 'folio',
  title: "Folio · a foe's first fall opens its page in the Bestiary on the victory card",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
    });

    await fight(t, 0, 0, true);
    let c = await finish(t);
    t.ok('the first Meadow Slime beaten opens its page: the first of the book, with its lore', c.screen === 's-result'
      && /📖 A new page in the Bestiary · 1 of 32/.test(c.page || '') && /wobbles the same distance/.test(c.page || ''), JSON.stringify(c));
    t.ok('the page says where its weak point lies, and fits the phone', /🎯 Weak point:/.test(c.page || '') && c.inside && c.wide, JSON.stringify(c));
    t.ok('the page carries the foe\'s likeness, drawn in', c.inked > 400, JSON.stringify(c));

    await fight(t, 0, 0, false);
    c = await finish(t);
    t.ok('beaten again, the card opens no page', c.page === null, JSON.stringify(c));

    await fight(t, 0, 1, true);
    c = await finish(t);
    t.ok('the next new foe is the second page of the book, with its own lore', /· 2 of 32/.test(c.page || '') && /thorns tip to tail/.test(c.page || ''), JSON.stringify(c));

    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
