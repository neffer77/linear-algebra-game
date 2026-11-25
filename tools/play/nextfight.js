/* Straight on.
 *
 * A campaign victory's first button is the next fight on the road, named with
 * its health and blow and, on a war path, what that win would pay. These
 * checks win real fights with real answers on a phone, press the button and
 * land in the next fight, win below half health to be warned and offered a
 * rest that clears both once paid, and beat the last foe on the road to see
 * no next fight offered and the map keep its gold. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe of the first realm, with a knight who cannot level up. */
const fight = (t, fi, hp) => t.ev(([fi, hp]) => {
  const path = WarPath.n; Battle.flee(); WarPath.n = path;   // fleeing ends a war path; these fights stand in for walking on
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = 1000; Game.s.hp = hp; Game.s.lvl = 40; Game.s.xp = 0; Game.s.gold = 5000;
  Battle.beastLeft = 0; Battle.wardUp = false;
}, [fi, hp]);
/* The killing blow, with a right answer; then the victory screen. */
const win = async (t, fi, hp = 1000) => {
  await fight(t, fi, hp);
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 5;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(400);
  return t.ev(() => {
    const txt = id => { const e = document.getElementById(id); return e ? e.innerText : null; };
    const map = [...document.querySelectorAll('#resultBody button')].find(b => /Map|map|Onward/.test(b.innerText));
    const btns = [...document.querySelectorAll('#resultBody button')].map(b => b.id || b.innerText.trim());
    return { next: txt('nextFight'), go: txt('nextGo'), low: txt('nextLow'), rest: txt('nextRest'),
      map: map ? map.innerText.trim() : null, mapGold: map ? map.classList.contains('gold') : null, btns,
      reckon: (() => { const e = document.querySelector('#resultBody .reckon'), nf = document.getElementById('nextFight');
        return e ? { blows: +e.dataset.blows, falls: +e.dataset.falls, text: e.innerText, after: !!(nf && nf.compareDocumentPosition(e) & 4),
          dmg: Game.weapon().dmg } : null; })() };
  });
};

module.exports = {
  name: 'nextfight',
  title: 'Straight on · a campaign victory offers the next fight on the road',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const foes = await t.ev(() => REALMS[0].foes.map(f => ({ nm: f.nm, hp: f.hp, atk: f.atk })));
    await t.ev(() => { WarPath.n = 0; Game.s.cleared = {}; });

    let r = await win(t, 0);
    t.eq('a victory names the next fight on the road', r.next, `Next on the road: ${foes[1].nm} · ❤️ ${foes[1].hp} · ⚔️ ${foes[1].atk}. Win it for +10% gold on your war path.`);
    t.eq('as its first button', r.go, `⚔️ Fight ${foes[1].nm}`);
    t.ok('under it, the blows that fell it and the blows that fell you', r.reckon && r.reckon.after && r.reckon.blows === Math.ceil(foes[1].hp / r.reckon.dmg) && r.reckon.falls >= 1 && /plain blows? fells? it/.test(r.reckon.text), JSON.stringify(r.reckon));
    t.ok('ahead of the map, which gives up its gold', r.btns[0] === 'nextGo' && r.map === '🗺️ Map' && r.mapGold === false, JSON.stringify(r));
    t.ok('with no warning at full health', r.low === null && r.rest === null, JSON.stringify(r));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    await t.ev(() => document.getElementById('nextGo').click());
    await sleep(300);
    const into = await t.ev(() => ({ screen: document.querySelector('.screen.on').id, nm: Battle.foe.nm, ri: Battle.ri, fi: Battle.fi, path: WarPath.n }));
    t.ok('pressing it starts that fight', into.screen === 's-battle' && into.nm === foes[1].nm && into.ri === 0 && into.fi === 1, JSON.stringify(into));
    t.eq('and keeps the war path', into.path, 1);

    // below half health: warned, and offered a rest first
    r = await win(t, 1, 300);
    t.eq('the war path pay grows with it', r.next, `Next on the road: ${foes[2].nm} · ❤️ ${foes[2].hp} · ⚔️ ${foes[2].atk}. Win it for +20% gold on your war path.`);
    t.ok('below half health it warns', /You are at ❤️ 300 of 1000 · a miss costs about \d+/.test(r.low || ''), r.low);
    t.ok('and offers a rest first', /Rest first/.test(r.rest || '') && r.btns.indexOf('nextRest') < r.btns.indexOf('nextGo'), JSON.stringify(r));
    await t.ev(() => document.getElementById('nextRest').click());
    const after = await t.ev(() => ({ hp: Game.s.hp, max: Game.s.maxHp, low: !!document.getElementById('nextLow'), rest: !!document.getElementById('nextRest'), go: !!document.getElementById('nextGo') }));
    t.ok('a rest heals and clears the warning, leaving the fight', after.hp === after.max && !after.low && !after.rest && after.go, JSON.stringify(after));

    // the last foe on the road: nothing next, and the map keeps its gold
    await t.ev(() => { REALMS.forEach((rl, ri) => rl.foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = true; })); delete Game.s.cleared['0:0']; });
    r = await win(t, 0);
    t.ok('the last foe on the road offers no next fight', r.next === null && r.go === null, JSON.stringify(r));
    t.ok('and the map is the gold button again', r.map === '🗺️ Onward' && r.mapGold === true, JSON.stringify(r));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
