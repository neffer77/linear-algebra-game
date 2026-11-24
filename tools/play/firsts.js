/* First S.
 *
 * The first win at S on a foe pays the foe's gold once more, and the victory
 * card says so; the gold counted up on the card is the gold the knight gets.
 * A lower grade pays nothing extra, nor does a second S. A foe cleared before
 * grades were kept earns it on its first S. These checks win real fights with
 * real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe of the first realm, with a knight who cannot fall or level up. */
const fight = (t, fi) => t.ev(fi => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  window.__banners = [];
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
/* The killing blow with a right answer, at the health given as the foe falls; then the victory card. */
const finish = async (t, hp) => {
  await t.ev(() => {
    const cb = Celebrate.banner; Celebrate.banner = function (txt) { window.__banners.push(txt); return cb.apply(this, arguments); };
    const cs = Combat.strike; Combat.strike = () => 5;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
    window.__restore = () => { Celebrate.banner = cb; };
  });
  await sleep(1400);
  // the map recomputes the health bar from the knight's level, so the health is set as the foe falls
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);   // the gold counts up on the card
  return t.ev(() => {
    window.__restore();
    const l = document.getElementById('gradeLet'), f = document.getElementById('firstS');
    return { grade: l && l.dataset.grade, first: f ? f.innerText : null,
      counted: +document.getElementById('rGold').innerText, gold: Game.s.gold };
  });
};
const win = async (t, fi, grade) => {
  await fight(t, fi);
  await t.ev(() => { window.__gold0 = Game.s.gold; });
  if (grade === 'S') for (let i = 0; i < 4; i++) await answer(t, true);
  else if (grade === 'B') { await answer(t, false); for (let i = 0; i < 4; i++) await answer(t, true); }
  else { await answer(t, true); await answer(t, false); await answer(t, true); }
  const r = await finish(t, grade === 'S' ? 1000 : 300);
  r.paid = r.gold - await t.ev(() => window.__gold0);
  return r;
};

module.exports = {
  name: 'firsts',
  title: 'First S · the first S on a foe pays its gold once more',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // a bounty met by these wins pays its own gold, apart from the victory card
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });
    const foe = await t.ev(() => { Game.s.cleared = {}; WarPath.n = 0; return { gold: REALMS[0].foes[0].gold, last: REALMS[0].foes.length - 1, lastGold: REALMS[0].foes[REALMS[0].foes.length - 1].gold }; });

    let g = await win(t, 0, 'B');
    t.ok('a win below S pays no bonus', g.first === null && g.grade === 'B', JSON.stringify(g));
    t.eq('and the card counts up the gold it pays', g.counted, g.paid);

    g = await win(t, 0, 'S');
    t.eq('the first S on a foe', g.grade, 'S');
    t.ok('says its bonus on the card', g.first !== null && g.first.includes('+' + foe.gold + ' bonus gold'), JSON.stringify(g));
    t.eq('and the card counts up the gold it pays, bonus and all', g.counted, g.paid);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    g = await win(t, 0, 'S');
    t.ok('a second S pays no bonus', g.first === null && g.grade === 'S', JSON.stringify(g));
    t.eq('and the card counts up the gold it pays', g.counted, g.paid);

    await t.ev(n => { Game.s.cleared['0:' + n] = true; }, foe.last);
    g = await win(t, foe.last, 'S');
    t.ok('a foe cleared before grades earns it on its first S', g.first !== null && g.first.includes('+' + foe.lastGold + ' bonus gold'), JSON.stringify(g));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
  }
};
