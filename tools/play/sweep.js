/* A clean sweep.
 *
 * A campaign fight won without one miss always drops a chest, and never a
 * plain one: its find is drawn with more luck, and the victory card says so.
 * A win with a miss in it drops a chest only by chance, as ever, and the card
 * says nothing. These checks win real fights with real answers on a phone.
 * Nothing new is saved.
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
/* The killing blow with a right answer; then the victory card and what it dropped. */
const finish = async (t) => {
  await t.ev(() => {
    window.__rolls = [];
    const roll = Loot.roll; window.__roll = roll;
    Loot.roll = function (ctx) { const d = roll.apply(this, arguments); window.__rolls.push({ sweep: !!ctx.sweep, rar: d.rar }); return d; };
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);   // the chest opens a beat after the card
  const r = await t.ev(() => {
    Loot.roll = window.__roll;
    const l = document.getElementById('sweepLine');
    return { line: l ? l.innerText : null, rolls: window.__rolls,
      chest: document.getElementById('chest').classList.contains('on'), missed: Battle.missed };
  });
  return r;
};
const shut = (t) => t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });

module.exports = {
  name: 'sweep',
  title: 'Clean sweep · a win with no miss drops a sure, richer chest',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    let swept = 0, rich = 0;
    for (let n = 0; n < 3; n++) {
      await fight(t); await answer(t, true); await answer(t, true);
      const g = await finish(t);
      if (n === 0) {
        t.ok('a win with no miss says so on the victory card', !!g.line && /Clean sweep/.test(g.line) && /sure chest/.test(g.line), JSON.stringify(g));
        t.ok('and the card fits a phone', await t.ev(() => document.getElementById('resultBody').scrollWidth <= innerWidth + 1));
      }
      if (g.line && g.chest && g.rolls.length === 1 && g.rolls[0].sweep) swept++;
      if (g.rolls.length === 1 && g.rolls[0].rar !== 'common') rich++;
      await shut(t); await sleep(500);
    }
    t.eq('every clean sweep drops a chest drawn with a sweep\'s luck', swept, 3);
    t.eq('and none of them is a plain one', rich, 3);

    await fight(t); await answer(t, true); await answer(t, false);
    let g = await finish(t);
    t.ok('a win with a miss in it says nothing of a sweep', g.line === null && g.missed === 1, JSON.stringify(g));
    t.ok('and any chest it drops is drawn as ever', g.rolls.every(r => !r.sweep), JSON.stringify(g.rolls));
    await shut(t); await sleep(500);

    await fight(t);
    t.eq('the next fight starts with no miss', await t.ev(() => Battle.missed), 0);
    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
