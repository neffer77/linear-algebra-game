/* A realm march.
 *
 * Every foe of one realm beaten in a sitting, in any order, with no fall and
 * no flight from a live fight between, makes a realm march: the last of them
 * drops a sure chest with an epic find at the least, said on the victory
 * card. The map counts the march on the realm's heading. A fall, or a flight,
 * sets it back to nothing, and a realm pays its march once a sitting. These
 * checks win real fights with real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, fi) => t.ev(fi => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
}, fi);
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
/* The killing blow; only sure chests drop; then the victory card and what it dropped. */
const finish = async (t) => {
  await t.ev(() => {
    window.__chance = R.chance; R.chance = p => p >= 1;
    window.__rolls = []; const roll = Loot.roll; window.__roll = roll;
    Loot.roll = function (ctx) { const d = roll.apply(this, arguments); window.__rolls.push({ march: !!ctx.march, rar: d.rar }); return d; };
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);
  const r = await t.ev(() => {
    R.chance = window.__chance; Loot.roll = window.__roll;
    const l = document.getElementById('marchWon');
    return { line: l ? l.innerText : null, rolls: window.__rolls, chest: document.getElementById('chest').classList.contains('on'),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};
/* A miss in every fight, so no win is a clean sweep with a sure chest of its own. */
const win = async (t, fi) => { await fight(t, fi); await answer(t, false); await answer(t, true); return finish(t); };
const tag = (t) => t.ev(() => { UI.go('s-map'); const e = document.querySelector('#realm-0 .marchTag'); return e ? e.innerText : null; });

module.exports = {
  name: 'march',
  title: 'Realm march · every foe of a realm beaten with no fall between drops an epic chest',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });
    const n = await t.ev(() => REALMS[0].foes.length);

    t.eq('no march shows on the map before a win', await tag(t), null);
    let g = await win(t, 1);
    t.ok('a win says nothing of a march and drops no chest', g.line === null && !g.chest, JSON.stringify(g));
    t.eq('the map counts it', await tag(t), `🥾 1/${n} in a row`);
    await win(t, 2);
    await win(t, 2);
    t.eq('and counts each foe once', await tag(t), `🥾 2/${n} in a row`);

    await fight(t, 0);
    await t.ev(() => Battle.lose());
    for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
    await sleep(400);
    t.eq('a fall sets the march back to nothing', await tag(t), null);

    await win(t, 1);
    await fight(t, 2); await answer(t, true);
    await t.ev(() => Battle.flee());
    t.eq('and so does a flight from a live fight', await tag(t), null);

    // the boss first, and the first foe last, so the last win is a plain foe's
    for (let fi = n - 1; fi >= 1; fi--) await win(t, fi);
    t.eq('every foe but one counted', await tag(t), `🥾 ${n - 1}/${n} in a row`);
    g = await win(t, 0);
    t.ok('the last foe makes the march, said on the card', !!g.line && /Realm march/.test(g.line), JSON.stringify(g));
    t.ok('for a sure chest', g.chest && g.rolls.length === 1 && g.rolls[0].march, JSON.stringify(g));
    t.ok('with an epic find at the least', ['epic', 'legendary'].includes((g.rolls[0] || {}).rar), JSON.stringify(g.rolls));
    t.ok('and the card fits a phone', g.wide);
    t.eq('the map no longer counts a march it has paid', await tag(t), null);
    g = await win(t, 1);
    t.ok('and the realm pays it once a sitting', g.line === null && !g.chest, JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
