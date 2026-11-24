/* A heroic rematch.
 *
 * Any campaign foe already beaten can be fought again as a heroic rematch,
 * from its victory card: harder blows, the hardest riddles, and twice the
 * gold of a plain rematch. The scene says so as it arrives and the foe's
 * name carries it; the victory card says what it paid. The plain rematch is
 * still offered, and a foe never beaten cannot be fought heroic. These checks
 * win real fights with real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const setup = (t) => t.ev(() => {
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
const fight = async (t, fi, heroic) => {
  await t.ev(([fi, heroic]) => {
    Battle.flee();
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Elite.force = null;
    const odds = Elite.CHANCE; Elite.CHANCE = 0;
    window.__toasts = [];
    Battle.begin(0, fi, heroic);
    Elite.CHANCE = odds;
  }, [fi, heroic]);
  await setup(t);
};
const scene = (t) => t.ev(() => ({ name: document.getElementById('foeName').innerText, heroic: !!Battle.foe.heroic,
  gold: Battle.foe.gold, atk: Battle.foe.atk, toasts: window.__toasts.slice(), screen: document.querySelector('.screen.on').id }));
const answer = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* The killing blow, exactly, with a right answer; then the victory card. */
const finish = async (t) => {
  const g0 = await t.ev(() => Game.s.gold);
  await t.ev(() => {
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
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b && document.getElementById('chest').classList.contains('on')) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return t.ev(g0 => { const b = document.getElementById('heroicGo'), l = document.getElementById('heroicWon');
    return { button: b ? b.innerText : null, line: l ? l.innerText : null, paid: Game.s.gold - g0,
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 }; }, g0);
};

module.exports = {
  name: 'heroic',
  title: 'A heroic rematch · a beaten foe fought again with the hardest riddles and harder blows, for double gold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, UI.toast, R.chance];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null; R.chance = p => p >= 1;
      const toast = UI.toast; UI.toast = function (m) { (window.__toasts = window.__toasts || []).push(m); return toast.apply(this, arguments); };
    });
    const base = await t.ev(() => ({ gold: REALMS[0].foes[0].gold, atk: REALMS[0].foes[0].atk }));

    await fight(t, 1, true);
    let s = await scene(t);
    t.ok('a foe never beaten cannot be fought heroic', !s.heroic && !s.name.includes('Heroic'), JSON.stringify(s));

    await fight(t, 0, false); await answer(t);
    let g = await finish(t);
    t.ok('a campaign victory card offers a heroic rematch', !!g.button && g.button.includes('Heroic rematch') && g.button.includes('double gold'), JSON.stringify(g));
    t.ok('and fits a phone', g.wide);
    t.eq('a plain victory says nothing heroic', g.line, null);

    // a plain rematch, its pay the mark for the heroic one
    await fight(t, 0, false); await answer(t);
    g = await finish(t);
    const plain = g.paid;
    await t.ev(() => document.querySelector('#resultBody button[onclick^="Battle.begin(0,0)"]').click());
    await sleep(600); await setup(t);
    s = await scene(t);
    t.ok('the plain rematch is still plain', s.screen === 's-battle' && !s.heroic && !s.name.includes('Heroic'), JSON.stringify(s));
    await answer(t);
    g = await finish(t);

    await t.ev(() => document.getElementById('heroicGo').click());
    await sleep(600); await setup(t);
    s = await scene(t);
    t.ok('the heroic rematch says so as it arrives', s.screen === 's-battle' && s.toasts.some(m => m.includes('heroic rematch') && m.includes('double the gold')), JSON.stringify(s));
    t.ok('with its name marked', s.name.includes('Heroic'), s.name);
    t.ok('its purse doubled and its blows a quarter harder', s.gold === 2 * base.gold && s.atk === Math.round(base.atk * 1.25), JSON.stringify([s, base]));
    t.ok('and the scene fits a phone', await t.ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await answer(t);
    g = await finish(t);
    t.ok('a heroic victory says so on the card', !!g.line && g.line.includes('heroic victory') && g.line.includes('double gold'), JSON.stringify(g));
    t.ok('and pays about twice a plain rematch', plain > 0 && g.paid >= 1.8 * plain, JSON.stringify({ plain, heroic: g.paid }));
    t.ok('and offers another', !!g.button, JSON.stringify(g));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of, UI.toast, R.chance] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
