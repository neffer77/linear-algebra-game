/* A greedy foe.
 *
 * Now and then a foe already beaten comes back greedy, with three times the
 * gold, and flees after six questions if it still stands. The scene says so
 * as it arrives, the foe's name carries it, and each question is counted
 * above it. Felled in time, the victory card says the purse is yours. Gone,
 * it costs nothing: no war path broken, no health or gold lost. These checks
 * fight with real answers on a phone, with every beaten foe greedy so that
 * each can be watched. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, odds) => t.ev(odds => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const e = Elite.CHANCE; Elite.CHANCE = 0;
  Greedy.CHANCE = odds;
  window.__toasts = [];
  Battle.begin(0, 0);
  Elite.CHANCE = e;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
}, odds);
const scene = (t) => t.ev(() => { const e = document.getElementById('greedyTele'), tg = document.getElementById('telegraph');
  return { tele: e && tg.style.display === 'block' ? e.innerText : null, name: document.getElementById('foeName').innerText,
    screen: document.querySelector('.screen.on').id, over: Battle.over, toasts: window.__toasts.slice() }; });
/* One right answer that leaves the foe standing. */
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
/* The killing blow with a right answer; then the victory card's word on the purse. */
const finish = async (t) => {
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
  await sleep(900);
  const r = await t.ev(() => { const l = document.getElementById('greedyWon');
    return { line: l ? l.innerText : null, wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 }; });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'greedy',
  greedy: true,
  title: 'A greedy foe · a beaten foe comes back with three times the gold and flees after six questions',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, UI.toast];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      const toast = UI.toast; UI.toast = function (m) { (window.__toasts = window.__toasts || []).push(m); return toast.apply(this, arguments); };
    });
    t.ok('a foe can come greedy in a real game', await t.ev(() => Greedy.CHANCE > 0 && Greedy.CHANCE < 0.5));

    await fight(t, 1);
    let s = await scene(t);
    t.ok('a foe never beaten is never greedy', s.tele === null && !s.name.includes('Greedy'), JSON.stringify(s));
    await finish(t);

    await fight(t, 1);
    s = await scene(t);
    t.ok('a beaten foe can come back greedy, said as it arrives', s.toasts.some(m => m.includes('greedy') && m.includes('within 6 questions')), JSON.stringify(s));
    t.ok('with its name marked', s.name.includes('Greedy'), s.name);
    t.ok('and its purse three times as fat', await t.ev(() => Battle.foe.gold === 3 * REALMS[0].foes[0].gold));
    t.ok('the first question is counted above it', !!s.tele && s.tele.includes('question 1 of 6'), JSON.stringify(s));
    t.ok('and the scene fits a phone', await t.ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const before = await t.ev(() => ({ gold: Game.s.gold, hp: Game.s.hp, path: WarPath.n }));
    for (let i = 0; i < 5; i++) await answer(t);
    s = await scene(t);
    t.ok('each question after is counted', !!s.tele && s.tele.includes('question 6 of 6') && s.over === null, JSON.stringify(s));
    await answer(t);
    s = await scene(t);
    t.ok('after the sixth it flees, back to the map', s.over === 'escape' && s.screen === 's-map', JSON.stringify(s));
    t.ok('and the map says it got away', s.toasts.some(m => m.includes('slips away')), JSON.stringify(s.toasts));
    t.eq('and it took nothing', await t.ev(() => ({ gold: Game.s.gold, hp: Game.s.hp, path: WarPath.n })), before);

    await fight(t, 1);
    await answer(t); await answer(t);
    let g = await finish(t);
    t.ok('felled in time, the card says its purse is yours', !!g.line && g.line.includes('greedy') && g.line.includes('purse is yours'), JSON.stringify(g));
    t.ok('and fits a phone', g.wide);

    await fight(t, 0);
    for (let i = 0; i < 7; i++) await answer(t);
    s = await scene(t);
    t.ok('a plain foe is not counted and never flees', s.tele === null && s.over === null && s.screen === 's-battle', JSON.stringify(s));
    g = await finish(t);
    t.eq('and its card says nothing of a purse', g.line, null);

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of, UI.toast] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
