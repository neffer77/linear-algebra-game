/* A sitting's milestones.
 *
 * Every fifth campaign victory of a sitting is a milestone: it drops a sure
 * chest, a rare find at the least, and the victory card says which victory
 * it was. The map's tally says where the next one falls. These checks win
 * real fights with real answers on a phone. Nothing new is saved.
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
/* A fight with a miss in it (so it is no clean sweep), won with a right answer;
   then the victory card and what it dropped. Only a sure chest can drop. */
const win = async (t) => {
  await fight(t);
  await answer(t, false); await answer(t, true);
  await t.ev(() => {
    window.__rolls = [];
    window.__chance = R.chance; R.chance = p => p >= 1;
    const roll = Loot.roll; window.__roll = roll;
    Loot.roll = function (ctx) { const d = roll.apply(this, arguments); window.__rolls.push({ mile: !!ctx.mile, rar: d.rar }); return d; };
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  const r = await t.ev(() => {
    Loot.roll = window.__roll; R.chance = window.__chance;
    const l = document.getElementById('sittingMile');
    return { line: l ? l.innerText : null, rolls: window.__rolls, chest: document.getElementById('chest').classList.contains('on'),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};
const tally = (t) => t.ev(() => { UI.go('s-map'); const e = document.getElementById('sittingTally'); return e ? e.innerText : ''; });

module.exports = {
  name: 'milestone',
  title: "A sitting's milestones · every fifth victory of a sitting drops a sure chest",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    let g = await win(t);
    t.ok('a first victory is no milestone', g.line === null && g.rolls.length === 0 && !g.chest, JSON.stringify(g));
    t.ok('and the map says the next falls at the 5th', (await tally(t)).includes('a sure chest at 5'), await tally(t));

    // a sitting of fights later: three won
    await t.ev(() => { Sitting.wins = 3; });
    g = await win(t);
    t.ok('the 4th victory is none either', g.line === null && g.rolls.length === 0, JSON.stringify(g));
    g = await win(t);
    t.ok('the 5th is a milestone, said on the card', !!g.line && g.line.includes('Your 5th victory this sitting'), JSON.stringify(g));
    t.ok('for a sure chest', g.chest && g.rolls.length === 1 && g.rolls[0].mile, JSON.stringify(g));
    t.ok('with a rare find at the least', ['rare', 'epic', 'legendary'].includes((g.rolls[0] || {}).rar), JSON.stringify(g.rolls));
    t.ok('and the card fits a phone', g.wide);
    t.ok('then the map names the 10th', (await tally(t)).includes('a sure chest at 10'), await tally(t));
    g = await win(t);
    t.ok('and the 6th is no milestone', g.line === null && g.rolls.length === 0, JSON.stringify(g));

    await t.ev(() => { Sitting.wins = 20; });
    g = await win(t);
    t.ok('the 21st is none', g.line === null && g.rolls.length === 0, JSON.stringify(g));
    await t.ev(() => { Sitting.wins = 24; });
    g = await win(t);
    t.ok('and the 25th is one too', !!g.line && g.line.includes('Your 25th victory') && g.rolls.length === 1, JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
