/* A level-up boon.
 *
 * A campaign win that lifts the knight a level offers a choice on the
 * victory card: a fat purse, which pays half again the next campaign win's
 * gold, or a lucky find, which drops a sure chest on it. The pick shows as
 * held, the next win spends it and says so, and an offer not yet taken waits
 * on the next card. These checks win real fights with real answers on a
 * phone. Nothing new is saved.
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
  WarPath.n = 0; Satchel.n = 0;
});
/* One answer, right or wrong, that leaves the foe standing. */
const answer = async (t, right) => {
  await t.ev(right => {
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* The killing blow, levelling up or not; only sure chests drop; then the victory card. */
const finish = async (t, up) => {
  await t.ev(up => {
    window.__chance = R.chance; R.chance = p => p >= 1;
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; Game.s.xp = up ? Game.xpNeeded() - 1 : 0; window.__lvl = Game.s.lvl; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  }, up);
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);   // the gold counts up on the card
  const r = await t.ev(() => {
    R.chance = window.__chance;
    const c = document.getElementById('boonCard'), w = document.getElementById('boonWon');
    return { card: c ? c.innerText : null, buttons: document.querySelectorAll('#boonCard button').length,
      won: w ? w.innerText : null, up: Game.s.lvl > window.__lvl, chest: document.getElementById('chest').classList.contains('on'),
      counted: +document.getElementById('rGold').innerText, paid: Game.s.gold - window.__gold0,
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};
// a miss in every fight, so no win is a clean sweep with a sure chest of its own
const win = async (t, up) => { await fight(t); await answer(t, false); await answer(t, true); return finish(t, up); };
const pick = async (t, id) => { await t.ev(id => document.getElementById(id).click(), id); await sleep(300);
  return t.ev(() => { const c = document.getElementById('boonCard'); return c ? c.innerText : null; }); };

module.exports = {
  name: 'boon',
  title: 'Boon · a level-up offers a fat purse or a lucky find for the next win',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });
    await t.ev(() => { Game.s.cleared = { '0:0': 'S' }; });

    let g = await win(t, false);
    t.ok('a win with no level-up offers no boon', g.card === null && g.won === null, JSON.stringify(g));

    g = await win(t, true);
    t.ok('a win that lifts a level offers a choice of two boons', g.up && g.buttons === 2 && /boon for your new level/.test(g.card), JSON.stringify(g));
    t.ok('and the card fits a phone', g.wide);
    let held = await pick(t, 'boonPurse');
    t.ok('picking the purse holds it', !!held && /hold a fat purse/.test(held), held);
    t.eq('with nothing left to pick', await t.ev(() => document.querySelectorAll('#boonCard button').length), 0);

    g = await win(t, false);
    const n = +((g.won || '').match(/\+(\d+) gold/) || [])[1];
    t.ok('the next win spends the purse, said on the card', n > 0 && /a fat purse/.test(g.won), JSON.stringify(g));
    t.eq('and the card counts it into the gold it pays', g.counted, g.paid);
    t.ok('the boon is gone after', g.card === null, JSON.stringify(g));
    g = await win(t, false);
    t.ok('and a second win pays no purse', g.won === null && g.counted === g.paid, JSON.stringify(g));
    t.ok('nor any chest a plain win only might drop', !g.chest, JSON.stringify(g));

    g = await win(t, true);
    t.ok('a second level-up offers the boons again', g.buttons === 2, JSON.stringify(g));
    g = await win(t, false);
    t.ok('an offer not taken waits on the next card', g.buttons === 2 && g.won === null, JSON.stringify(g));
    held = await pick(t, 'boonFind');
    t.ok('picking the find holds it', !!held && /hold a lucky find/.test(held), held);
    g = await win(t, false);
    t.ok('the next win spends the find for a sure chest, said on the card', g.chest && !!g.won && /lucky find/.test(g.won), JSON.stringify(g));
    t.eq('and pays no extra gold', g.counted, g.paid);

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
