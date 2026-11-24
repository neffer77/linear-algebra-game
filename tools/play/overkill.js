/* Overkill.
 *
 * The part of the killing blow past the foe's last health pays gold: its
 * share of the foe's whole health, of up to half the foe's gold. The blow
 * says OVERKILL on the scene, the victory card says what it paid, and the
 * gold counted up on the card is the gold the knight gets. A blow that only
 * just fells the foe pays nothing, and the next fight starts with none. These
 * checks win real fights with real answers on a phone. Nothing new is saved.
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
/* The killing blow with a right answer, for the damage given, on a foe with the health given; then the victory card. */
const finish = async (t, left, blow) => {
  await t.ev(([left, blow]) => {
    window.__said = [];
    const f = Anim.float; Anim.float = function (x, y, text) { window.__said.push(text); return f.apply(this, arguments); };
    const cs = Combat.strike; Combat.strike = () => blow;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = left; window.__gold0 = Game.s.gold;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
    window.__restore = () => { Anim.float = f; };
  }, [left, blow]);
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);   // the gold counts up on the card
  return t.ev(() => {
    window.__restore();
    const o = document.getElementById('overLine');
    return { line: o ? o.innerText : null, said: window.__said.filter(x => /OVERKILL/.test(x)).join('|'),
      counted: +document.getElementById('rGold').innerText, paid: Game.s.gold - window.__gold0, emax: Battle.emax, gold: Battle.foe.gold };
  });
};

const win = async (t, left, blow) => { await fight(t, 0); await answer(t, true); return finish(t, left, blow); };

module.exports = {
  name: 'overkill',
  title: 'Overkill · a killing blow past the foe\'s last health pays gold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // a bounty met by these wins pays its own gold, apart from the victory card
    await t.ev(() => { window.__bounty = [Bounty.bump, Bounty.claim]; Bounty.bump = () => {}; Bounty.claim = () => {}; });
    await t.ev(() => { Game.s.cleared = { '0:0': 'S' }; WarPath.n = 0; });

    let g = await win(t, 40, 40);
    t.ok('a blow that only just fells the foe pays nothing extra', g.line === null && g.said === '', JSON.stringify(g));
    t.eq('and the card counts up the gold it pays', g.counted, g.paid);

    const quarter = Math.round(g.emax / 4);
    g = await win(t, 40, 40 + quarter);
    const want = Math.round(g.gold * 0.5 * Math.min(1, quarter / g.emax));
    t.ok('a blow a quarter of the foe past its last health says so on the scene', g.said === 'OVERKILL +' + quarter, JSON.stringify(g));
    t.ok('and on the card, with an eighth of its gold', g.line !== null && g.line.includes(quarter + ' past its last health, +' + want + ' gold'), JSON.stringify(g));
    t.eq('and the card counts up the gold it pays, overkill and all', g.counted, g.paid);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    g = await win(t, 10, 10 + g.emax * 5);
    t.ok('a blow far past the foe pays half its gold and no more', g.line !== null && g.line.includes('+' + Math.round(g.gold / 2) + ' gold'), JSON.stringify(g));

    await fight(t, 0);
    const carried = await t.ev(() => Battle.overkill);
    t.eq('the next fight starts with no overkill', carried, 0);
    await answer(t, true);
    g = await finish(t, 40, 40);
    t.ok('and a blow that only just fells its foe pays none of the last one\'s', g.line === null, JSON.stringify(g));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim] = window.__bounty; UI.go('s-title'); });
  }
};
