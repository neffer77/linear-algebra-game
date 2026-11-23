/* Elite rematches.
 *
 * A campaign foe already beaten comes back, one fight in four, as an elite
 * with one twist: Armoured halves every blow until three answers in a row
 * crack it, Vampiric heals by the blow it lands on a miss, Swift winds up a
 * turn sooner, and Frenzied hits half again as hard on a quarter less
 * health. These checks stand each one up and play it with real answers: a
 * first meeting is never an elite, the dice pick a twist only for a beaten
 * foe, the bar names the twist and the fight opens by saying what it does,
 * each twist does what it says, and beating an elite pays the first-clear
 * reward with a sure chest and says so. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A fight against the realm's second foe, already beaten, with a knight who cannot fall. */
const fight = (t, kind, beaten = true) => t.ev(([kind, beaten]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  document.querySelectorAll('.toast').forEach(d => d.remove());
  if (beaten) Game.s.cleared['0:1'] = true; else delete Game.s.cleared['0:1'];
  Elite.force = kind;
  // with no twist named: a beaten foe plain, and a first meeting with the dice sure to bring an elite if they could
  const odds = Elite.CHANCE; if (!kind) Elite.CHANCE = beaten ? 0 : 1;
  WarPath.n = 0;                         // each fight's gold at the plain rate, not a run of wins
  Battle.begin(0, 1);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 99999;
  Battle.beastLeft = 0; Battle.wardUp = false;
  return { elite: Battle.foe.elite || null, hp: Battle.emax, atk: Battle.foe.atk, charge: Battle.chargeMax, base: REALMS[0].foes[1],
           name: document.getElementById('foeName').textContent, toast: [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | ') };
}, [kind, beaten]);
/* Answer the standing question, right or wrong, with every blow fixed so the arithmetic is plain. */
const answer = (t, right) => t.ev(right => {
  const cs = Combat.strike, fh = Combat.foeHit;
  Combat.strike = () => 20; Combat.foeHit = () => 7;
  Battle.answered = false; Battle.shownWork = false;
  const c = Battle.cur;
  Battle.answer(null, right ? c.a : '✗');
  Combat.strike = cs; Combat.foeHit = fh;
  Battle.updateBars();
  return { ehp: Battle.ehp, armour: Battle.armour, name: document.getElementById('foeName').textContent };
}, right);

module.exports = {
  name: 'elite',
  title: 'Elite rematches · a beaten foe comes back with one twist, for the full reward and a sure chest',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());

    // --- who comes back as an elite ---
    const dice = await t.ev(() => {
      const r = R._r, out = [];
      Game.s.cleared['0:1'] = true;
      R._r = () => 0.1; out.push(Elite.roll(REALMS[0].foes[1], true).elite);    // under one in four: an elite, the first twist
      R._r = () => 0.9; out.push(Elite.roll(REALMS[0].foes[1], true).elite || 'plain');
      R._r = () => 0.1; out.push(Elite.roll(REALMS[0].foes[1], false).elite || 'plain');
      R._r = r;
      return out.join();
    });
    t.eq('a beaten foe is an elite one fight in four, and a first meeting never is', dice, 'armoured,plain,plain');
    const first = await fight(t, null, false);
    t.ok('a first meeting is the foe itself', first.elite === null && first.hp === first.base.hp && !/⭐/.test(first.name), JSON.stringify(first));

    // --- Armoured: half of every blow, until three in a row crack it ---
    let f = await fight(t, 'armoured');
    t.eq('an armoured elite has a quarter more health', f.hp, Math.round(f.base.hp * 1.25));
    t.ok('the bar names the twist and shows the armour', /⭐ Armoured Bramble Goblin/.test(f.name) && /🛡️/.test(f.name), f.name);
    t.ok('the fight opens by saying what the twist does', /⭐ Elite! 🛡️ Armoured Bramble Goblin: it shrugs off half of every blow until you land three answers in a row\./.test(f.toast), f.toast);
    let a = await answer(t, true);
    t.eq('the first blow is halved', a.ehp, f.hp - 10);
    a = await answer(t, true);
    t.eq('so is the second', a.ehp, f.hp - 20);
    a = await answer(t, true);
    t.eq('the third in a row cracks the armour and lands in full', [a.ehp, a.armour], [f.hp - 40, 0]);
    t.ok('and the armour is gone from the bar', !/🛡️/.test(a.name), a.name);
    a = await answer(t, true);
    t.eq('it stays cracked', a.ehp, f.hp - 60);

    // --- Vampiric: a miss heals it by the blow it lands ---
    f = await fight(t, 'vampiric');
    a = await answer(t, true);
    t.eq('a vampiric elite takes blows in full', a.ehp, f.hp - 20);
    a = await answer(t, false);
    t.eq('and drinks back the blow it lands on a miss', a.ehp, f.hp - 13);
    t.ok('without healing past its own health', await t.ev(() => Battle.ehp <= Battle.emax));

    // --- Swift and Frenzied ---
    f = await fight(t, 'swift');
    t.eq('a swift elite winds up a turn sooner', f.charge, 2);
    const plain = await fight(t, null);
    t.eq('than the same foe plain', plain.charge, 3);
    f = await fight(t, 'frenzied');
    t.eq('a frenzied elite has a quarter less than an elite\'s health', f.hp, Math.round(f.base.hp * 1.25 * 0.75));
    t.eq('and hits half again as hard', f.atk, Math.round(f.base.atk * 1.5));

    // --- beating one: the full reward, a sure chest, and a word to say so ---
    /* What the win pays, counted as it pays it: the gold a chest may hold is
       its own reward, revealed later, and a bounty that completes is the
       bounty's, so both are kept out of the sum. */
    const finish = async () => {
      await t.ev(() => {
        const w = Battle.win, bump = Bounty.bump;
        Battle.win = function () { const g0 = Game.s.gold; Bounty.bump = () => {}; w.call(this); Bounty.bump = bump; Battle.paid = Game.s.gold - g0; Battle.win = w; };
        Battle.paid = null; Battle.ehp = 1;
      });
      await answer(t, true);
      await sleep(1400);                       // the killing blow settles, then the knight steps on
      await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
      for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
      return t.ev(() => Battle.paid);
    };
    f = await fight(t, 'swift');
    const paid = await finish();
    t.eq('the victory panel is up', await t.screen(), 's-result');
    t.ok('it names the elite and says what it paid', await t.ev(() => {
      const el = document.getElementById('eliteWon'), body = document.getElementById('resultBody').innerText;
      return !!el && /⭐ An elite felled: the full reward and a sure chest\./.test(el.innerText) && /The swift Bramble Goblin falls before your blade\./.test(body); }));
    t.eq('the gold is a first clear\'s, not a rematch\'s', paid, f.base.gold);
    t.ok('and a chest is looted', /Looted/.test(await t.ev(() => document.getElementById('resultBody').innerText)));

    // --- a plain rematch still pays under half, and leaves the chest to chance ---
    await fight(t, null);
    t.eq('a plain rematch pays under half', await finish(), Math.round(f.base.gold * 0.45));
    t.ok('and says nothing of elites', await t.ev(() => !document.getElementById('eliteWon')));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { Elite.force = null; UI.go('s-title'); });
  }
};
