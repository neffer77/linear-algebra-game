/* An oath.
 *
 * Before the first answer of a campaign fight the knight may swear, from the
 * power bar, to win it with no miss. Kept, the victory pays half again the
 * gold and a sure chest, an epic find at the least. Broken by a miss, it costs
 * a quarter of the gold at the victory. Once anything is answered it can no
 * longer be sworn. These checks fight with real answers on a phone. Nothing
 * new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t) => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const e = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = e;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
  Battle.renderPowers();
});
const bar = (t) => t.ev(() => { const d = document.querySelector('#powerbar [data-pw="oath"]');
  return d ? { text: d.innerText, on: !d.classList.contains('off') } : null; });
const swear = (t) => t.ev(() => { const d = document.querySelector('#powerbar [data-pw="oath"]'); if (d) d.click(); });
/* One answer, right or wrong, that leaves the foe standing. */
const answer = async (t, right) => {
  await t.ev(right => {
    window.__said = window.__said || [];
    const cs = Combat.strike, fh = Combat.foeHit; Combat.strike = () => 1; Combat.foeHit = () => 1;
    const f = Anim.float; Anim.float = function (x, y, text) { window.__said.push(text); return f.apply(this, arguments); };
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    const wrong = (Battle.cur.choices || []).find(c => c !== Battle.cur.a);
    Battle.answer(null, right ? Battle.cur.a : (wrong || '✗'));
    Combat.strike = cs; Combat.foeHit = fh; Anim.float = f;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* The killing blow with a right answer; then the victory card and what it dropped. */
const finish = async (t) => {
  await t.ev(() => {
    window.__rolls = [];
    window.__chance = R.chance; R.chance = p => p >= 1;
    const roll = Loot.roll; window.__roll = roll;
    Loot.roll = function (ctx) { const d = roll.apply(this, arguments); window.__rolls.push({ vow: !!ctx.vow, rar: d.rar }); return d; };
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  const r = await t.ev(() => {
    Loot.roll = window.__roll; R.chance = window.__chance;
    const l = document.getElementById('oathLine');
    return { line: l ? l.innerText : null, rolls: window.__rolls, paid: Game.s.gold - window.__gold0,
      shown: +document.getElementById('rGold').textContent, wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'oath',
  title: 'An oath · swear to win a fight with no miss, for half again the gold and an epic chest',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });

    await fight(t);
    let b = await bar(t);
    t.ok('a campaign fight offers an oath before the first answer', !!b && b.on && b.text.includes('Swear an oath'), JSON.stringify(b));
    await swear(t); await sleep(200);
    b = await bar(t);
    t.ok('swearing it shows it sworn', !!b && b.text.includes('Oath sworn') && !b.on, JSON.stringify(b));
    t.ok('and the bar fits a phone', await t.ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await answer(t, true); await answer(t, true);
    t.ok('it holds through right answers', ((await bar(t)) || {}).text === '🗡️ Oath sworn', JSON.stringify(await bar(t)));
    let g = await finish(t);
    t.ok('a win with no miss keeps it, said on the card', !!g.line && g.line.includes('oath was kept'), JSON.stringify(g));
    t.ok('for a sure chest', g.rolls.length === 1 && g.rolls[0].vow, JSON.stringify(g.rolls));
    t.ok('an epic find at the least', ['epic', 'legendary'].includes((g.rolls[0] || {}).rar), JSON.stringify(g.rolls));
    t.ok('and the card fits a phone', g.wide);

    await fight(t);
    await answer(t, true);
    t.eq('once an answer is given, no oath can be sworn', await bar(t), null);

    await fight(t);
    await swear(t); await sleep(200);
    await t.ev(() => { window.__said = []; });
    await answer(t, false);
    t.ok('a miss breaks the oath, and the scene says so', (await t.ev(() => window.__said)).includes('OATH BROKEN'));
    await sleep(200);
    t.ok('and the bar shows it broken', ((await bar(t)) || {}).text === '🗡️ Oath broken', JSON.stringify(await bar(t)));
    await answer(t, true);
    g = await finish(t);
    t.ok('the victory says what the broken oath cost', !!g.line && g.line.includes('oath was broken') && g.line.includes('forfeit'), JSON.stringify(g));
    t.ok('with no sure chest', g.rolls.length === 0, JSON.stringify(g.rolls));
    t.ok('and the gold the card counts is the gold paid', g.shown === g.paid && g.paid > 0, JSON.stringify(g));

    await fight(t);
    await answer(t, false); await answer(t, true);
    g = await finish(t);
    t.eq('a fight with no oath says nothing of one', g.line, null);

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
