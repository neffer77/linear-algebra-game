/* A boss's second phase.
 *
 * Every realm boss in the campaign rallies once, on the blow that leaves it
 * at half its health or below: a PHASE TWO banner, a line of its own, and
 * Phase II on its bar. From then on its wind-up comes a turn sooner and its
 * blows land a fifth harder, and three right answers in a row stagger it,
 * breaking off a wind-up and landing the next right answer for half again
 * as much. A second phase got through without a miss pays a quarter more
 * gold. These checks play it with real answers and fixed blows, so the
 * arithmetic is plain. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The first realm's boss, met for the first time, with a knight who cannot fall. */
const fight = (t, mode) => t.ev(mode => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  const r = REALMS[0], bi = r.foes.findIndex(f => f.boss);
  delete Game.s.cleared['0:' + bi];
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  WarPath.n = 0;                         // each fight's gold at the plain rate, not a run of wins
  if (mode === 'plain') Battle.begin(0, 0); else Battle.begin(0, bi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 99999;
  Battle.beastLeft = 0; Battle.wardUp = false;
  window.__said = [];
  if (!window.__wrapped) {
    window.__wrapped = true;
    const b = Celebrate.banner, f = Anim.float;
    Celebrate.banner = function (text, sub) { (window.__said || []).push(text + ': ' + sub); return b.apply(this, arguments); };
    Anim.float = function (x, y, text) { (window.__said || []).push(text); return f.apply(this, arguments); };
  }
  return { nm: Battle.foe.nm, hp: Battle.emax, atk: Battle.foe.atk, gold: Battle.foe.gold, charge: Battle.chargeMax, phase: Battle.phase,
           name: document.getElementById('foeName').textContent };
}, mode);
/* Answer the standing question, right or wrong, with a blow of the size given; record what the foe struck with. */
const answer = (t, right, dmg = 20) => t.ev(([right, dmg]) => {
  const cs = Combat.strike, fh = Combat.foeHit, wb = Weak.bonus;
  let bonus = null, atk = null;
  Weak.bonus = () => 1;                  // a question that lands on the boss's weak point is not a stagger
  Combat.strike = (w, sp, c, cr, rg, b) => { bonus = b; return dmg; };
  Combat.foeHit = a => { atk = a; return 7; };
  Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0;
  const c = Battle.cur;
  const weak = Weak.bonus(Battle);   // a question on the boss's weak point adds its own ×1.5, which is not the phase's
  Battle.answer(null, right ? c.a : '✗');
  Combat.strike = cs; Combat.foeHit = fh; Weak.bonus = wb;
  Battle.updateBars();
  return { ehp: Battle.ehp, phase: Battle.phase, charge: Battle.chargeMax, bonus: bonus === null ? null : bonus / weak, atk, run: Battle.phaseRun,
           staggered: Battle.staggered, said: (Talk.turn || {}).text || null,
           name: document.getElementById('foeName').textContent, shown: window.__said.slice() };
}, [right, dmg]);

module.exports = {
  name: 'phase',
  title: 'A boss\'s second phase · it rallies at half health, and a streak of three staggers it',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());

    let f = await fight(t);
    t.ok('the fight opens in the first phase', f.phase === 1 && !/Phase II/.test(f.name), JSON.stringify(f));
    const big = Math.ceil(f.hp / 2) - 10;               // leaves it above half
    let a = await answer(t, true, big);
    t.ok('a blow that leaves it above half does not rally it', a.phase === 1 && !a.shown.some(s => /PHASE TWO/.test(s)), JSON.stringify(a));
    a = await answer(t, true, 20);
    t.eq('the blow that takes it to half or below rallies it', a.phase, 2);
    t.ok('with a banner that says what to do', a.shown.includes('PHASE TWO: it rallies: three in a row will stagger it'), a.shown.join(' | '));
    const rally = await t.ev(nm => Talk.BOSS[nm].rally, f.nm);
    t.eq('and a line of the boss\'s own', a.said, rally);
    t.ok('the bar says so', /🔥 Phase II/.test(a.name), a.name);
    t.eq('its wind-up comes a turn sooner', a.charge, f.charge - 1);
    a = await answer(t, false);
    t.eq('its blows land a fifth harder', a.atk, Math.round(f.atk * 1.2));
    t.eq('and a miss breaks the streak', a.run, 0);
    a = await answer(t, true, 1); a = await answer(t, true, 1);
    t.ok('two in a row is not yet a stagger', !a.staggered && !a.shown.includes('STAGGERED'), JSON.stringify(a));
    a = await t.ev(() => {
      const cs = Combat.strike, sl = Combat.slam; let slammed = false;
      Combat.strike = () => 1; Combat.slam = () => { slammed = true; return 9; };
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = true;   // a wind-up is due
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs; Combat.slam = sl;
      return { slammed, slamNext: Battle.slamNext, charge: Battle.charge, staggered: Battle.staggered, shown: window.__said.slice() };
    });
    t.ok('the third in a row staggers it and breaks off its wind-up', a.staggered && !a.slammed && !a.slamNext && a.charge === 0 && a.shown.includes('STAGGERED'), JSON.stringify(a));
    a = await answer(t, true, 1);
    t.eq('the next right answer lands half again as hard', a.bonus, 1.5);
    a = await answer(t, true, 1);
    t.eq('and only that one', a.bonus, 1);

    /* What the win pays, counted as it pays it, with any bounty kept out of the sum. */
    const finish = async () => {
      await t.ev(() => {
        const w = Battle.win, bump = Bounty.bump;
        Battle.win = function () { const g0 = Game.s.gold; Bounty.bump = () => {}; w.call(this); Bounty.bump = bump; Battle.paid = Game.s.gold - g0; Battle.win = w; };
        Battle.paid = null; Battle.ehp = 1;
      });
      await answer(t, true, 5);
      await sleep(1400);                       // the killing blow settles, then the knight steps on
      await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
      for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
      return t.ev(() => Battle.paid);
    };
    let paid = await finish();
    t.eq('a second phase with a miss in it pays the boss\'s own gold', paid, f.gold);
    t.ok('and says nothing of a flawless phase', await t.ev(() => !document.getElementById('phaseWon')));

    f = await fight(t);
    await answer(t, true, Math.ceil(f.hp / 2) + 5);
    a = await answer(t, true, 3);
    t.eq('a boss rallies from any blow across half', a.phase, 2);
    paid = await finish();
    t.eq('a flawless second phase pays a quarter more gold', paid, Math.round(f.gold * 1.25));
    t.ok('and says so', await t.ev(() => {
      const el = document.getElementById('phaseWon');
      return !!el && /👑 A flawless second phase: a quarter more gold\./.test(el.innerText); }));

    f = await fight(t, 'plain');
    a = await answer(t, true, Math.ceil(f.hp / 2) + 1);
    t.ok('a plain foe never rallies', a.phase === 1 && !/Phase II/.test(a.name), JSON.stringify(a));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { Battle.flee(); UI.go('s-title'); });
  }
};
