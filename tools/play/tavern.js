/* S4 — the Tavern, and the two combat skills.
 *
 * Dice and Cards were in the game before they had names: the Berserker Rune
 * was always a bet, and the Sage's Insight was always information. Turning them
 * into skills means the uses come from what you know rather than what you
 * bought, and it means the Combat channel finally has more in it than one
 * borrowed ability.
 *
 * The Tavern is where they are learned, and it is the first setting whose risk
 * is not your life. You buy in at the door, every table plays for the pot, and
 * you can walk out poorer than you walked in — which is what makes the odds
 * printed on the buttons worth reading rather than decoration.
 *
 * Most of what is checked here is the arithmetic on those buttons, because a
 * game that teaches expectation by showing a number has to show the right one.
 */
'use strict';

module.exports = {
  name: 'tavern',
  title: 'S4 · a bet is a decision with a number on it',
  async run(t) {
    await t.newKnight('Gambler');

    // --- the setting ---
    const set = await t.ev(() => {
      const S = SETTINGS.tavern, out = {};
      out.exists = !!S;
      out.rooms = S.rooms;
      out.canDie = S.canDie;
      out.plan = S.plan.slice();
      out.wagerRooms = S.plan.filter(k => k === 'wager').length;
      out.buyIn = S.buyIn;
      out.hasNoMaterial = !S.essencePerRoom && !S.orePerRoom;
      out.topics = settingTopics(S);
      out.topicsResolve = Array.isArray(out.topics) && out.topics.length > 10;
      out.kindExists = !!RoomKinds.wager;

      // people at a table, not things in a hole: softer than the Deep
      R.seed(1); const tav = WaveEngine.foe(3, TAVERN_WAVES); R.unseed();
      R.seed(1); const deep = WaveEngine.foe(3, DEEP_WAVES); R.unseed();
      out.softerThanDeep = tav.hp < deep.hp && tav.atk < deep.atk;

      // opens one realm later than the Sanctum
      Game.s.cleared = {};
      out.sealedAtStart = !Dungeon.tavernOpen();
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      REALMS[1].foes.forEach((f, i) => Game.s.cleared['1:' + i] = 1);
      out.sealedAfterTwo = !Dungeon.tavernOpen();
      REALMS[2].foes.forEach((f, i) => Game.s.cleared['2:' + i] = 1);
      out.openAfterThree = Dungeon.tavernOpen();
      UI.renderMap();
      out.onMap = /Tavern/.test(document.getElementById('mapList').innerText);
      return out;
    });
    t.ok('the Tavern exists as a setting', set.exists);
    t.ok('and the wager is a room kind like any other', set.kindExists);
    t.eq('five tables', set.rooms, 5);
    t.eq('three of them are hands', set.wagerRooms, 3);
    t.ok('nothing here can kill you', set.canDie === false);
    t.eq('but it costs to sit down', set.buyIn, 100);
    t.ok('it yields no material — its skills are Combat, so it pays in gold at variance',
      set.hasNoMaterial);
    t.ok('it is about its own mathematics', set.topicsResolve,
      String(set.topics && set.topics.length));
    t.ok('its rivals are softer than the Deep', set.softerThanDeep);
    t.ok('it is sealed until the third realm falls',
      set.sealedAtStart && set.sealedAfterTwo && set.openAfterThree);
    t.ok('and it has its own node on the map', set.onMap);

    // --- the buy-in: a cost, never a gate ---
    const door = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };

      Game.s.gold = 500;
      Dungeon.descend('tavern');
      out.rich = { purse: Game.s.gold, pot: Dungeon.run.unbanked.gold, paid: Dungeon.run.paid };

      // short of the toll: you buy in with what you have rather than being turned away
      Game.s.gold = 40;
      Dungeon.descend('tavern');
      out.short = { purse: Game.s.gold, pot: Dungeon.run.unbanked.gold, paid: Dungeon.run.paid };

      // and with nothing at all, the door still opens
      Game.s.gold = 0;
      Dungeon.descend('tavern');
      out.broke = { purse: Game.s.gold, pot: Dungeon.run.unbanked.gold, entered: Dungeon.active };

      // no other setting charges anything
      out.deepFree = Dungeon.buyIn(SETTINGS.deep);
      out.cellarFree = Dungeon.buyIn(SETTINGS.cellar);
      out.sanctumFree = Dungeon.buyIn(SETTINGS.sanctum);
      return out;
    });
    t.eq('the buy-in leaves the purse', door.rich.purse, 400);
    t.eq('and becomes the pot', door.rich.pot, 100);
    t.eq('the run remembers what the door cost', door.rich.paid, 100);
    t.eq('a knight short of the toll buys in with what they have', door.short.pot, 40);
    t.eq('emptying the purse rather than being refused', door.short.purse, 0);
    t.ok('and a knight with nothing is still let in — a cost, never a gate',
      door.broke.entered && door.broke.pot === 0);
    t.ok('no other setting charges at the door',
      door.deepFree === 0 && door.cellarFree === 0 && door.sanctumFree === 0);

    // --- the odds on the buttons have to be the right odds ---
    const maths = await t.ev(() => {
      const out = {};
      // break-even probability for a tier is 1/(1+mult): at exactly that
      // chance the bet is worth nothing, which is what the button claims.
      out.tiers = Wager.TIERS.map(x => ({
        frac: x.frac, mult: x.mult,
        breakEven: 1 / (1 + x.mult),
        evAtBreakEven: Wager.ev(100, x.mult, 1 / (1 + x.mult))
      }));
      out.evExact = Math.abs(Wager.ev(100, 2.0, 0.6) - (100 * (0.6 * 2 - 0.4))) < 1e-9;
      // a bigger stake buys a worse multiplier — that is the whole trade
      out.multsFall = Wager.TIERS.every((x, i, a) => i === 0 || x.mult < a[i - 1].mult);
      out.fracsRise = Wager.TIERS.every((x, i, a) => i === 0 || x.frac > a[i - 1].frac);
      // and the sign of the bet flips with what you know
      out.badWhenWeak = Wager.ev(100, 1.0, 0.30) < 0;
      out.goodWhenStrong = Wager.ev(100, 1.0, 0.70) > 0;
      out.smallStillGoodMidBand = Wager.ev(25, 2.0, 0.40) > 0 && Wager.ev(100, 1.0, 0.40) < 0;

      // the probability shown is the player's own faded mastery
      const s = STRANDS.find(x => x[0] === 'Integrals');
      const k = s[1][0];
      Game.s.topicStats = {};
      Game.s.topicStats[k] = { c: 20, w: 2, m: 0.8, seen: 12, last: 0, t: Date.now() };
      out.readsMastery = Math.abs(Wager.odds(k) - Mastery.eff(k)) < 1e-9;
      // faded by time, exactly as everything else reads it
      Game.s.topicStats[k].t = Date.now() - 90 * 864e5;
      out.fades = Wager.odds(k) < 0.8;
      // the floor is what a guesser gets, and it follows the number of answers
      Game.s.topicStats = {};
      out.floor = Wager.odds(k, 4);
      out.floorThree = Wager.odds(k, 3);
      Game.s.topicStats[k] = { c: 999, w: 0, m: 1, seen: 99, last: 0, t: Date.now() };
      out.ceiling = Wager.odds(k, 4);

      out.stakeOfPot = Wager.TIERS.map(x => Wager.stakeFor(200, x));
      out.neverZeroStake = Wager.stakeFor(1, Wager.TIERS[0]) >= 1;
      return out;
    });
    t.ok('every tier is worth exactly nothing at its own break-even chance',
      maths.tiers.every(x => Math.abs(x.evAtBreakEven) < 1e-9),
      JSON.stringify(maths.tiers));
    t.ok('and the expected value is the expected value', maths.evExact);
    t.ok('a bigger stake buys a worse multiplier', maths.multsFall && maths.fracsRise);
    t.ok('the same bet is bad when you are weak and good when you are strong',
      maths.badWhenWeak && maths.goodWhenStrong);
    t.ok('and between the two break-evens the small bet is right and the big one is not',
      maths.smallStillGoodMidBand);
    t.ok('the chance shown is the knight\'s own mastery, not a house number',
      maths.readsMastery);
    t.ok('faded by time like everything else that reads mastery', maths.fades);
    t.ok('an unmet topic is priced at what a guesser gets, never below it',
      Math.abs(maths.floor - 0.25) < 1e-9, String(maths.floor));
    t.ok('and that floor follows how many answers are on offer',
      Math.abs(maths.floorThree - 1 / 3) < 1e-9, String(maths.floorThree));
    t.ok('and nothing is ever a certainty', maths.ceiling < 1, String(maths.ceiling));
    t.eq('the stakes are a quarter, a half and the lot', maths.stakeOfPot, [50, 100, 200]);
    t.ok('and a stake is never nothing', maths.neverZeroStake);

    // --- a hand, played both ways ---
    const hand = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.gold = 500;

      const playFirstWager = (right) => {
        Dungeon.descend('tavern');
        // the plan opens on a wager, so this is the room we are in
        const potBefore = Dungeon.run.unbanked.gold;
        Wager.stake(1);                                   // half the pot, ×1.4
        const staked = Wager.staked, mult = Wager.mult;
        const btns = [...document.querySelectorAll('#wagerChoices .choice')];
        const pick = right ? btns.find(b => b.dataset.correct === '1')
                           : btns.find(b => b.dataset.correct !== '1');
        pick.click();
        return { potBefore, staked, mult, potAfter: Dungeon.run.unbanked.gold };
      };

      out.firstRoomIsAHand = (() => {
        Dungeon.descend('tavern');
        return Dungeon.cur.spec.kind === 'wager';
      })();

      const lost = playFirstWager(false);
      out.lost = lost;
      // the losing outcome is handed to the shell, which must not then pay out
      Dungeon.resolve(Dungeon.lastWagerOutcome || { status: 'cleared', quality: 0, topics: [], yield: {} });
      out.potAfterResolveOnLoss = Dungeon.run.unbanked.gold;

      const won = playFirstWager(true);
      out.won = won;
      return out;
    });
    t.ok('the Tavern opens on a hand', hand.firstRoomIsAHand);
    t.eq('a lost hand takes the stake out of the pot',
      hand.lost.potAfter, hand.lost.potBefore - hand.lost.staked);
    t.ok('a won hand is staged as a yield rather than paid twice',
      hand.won.potAfter === hand.won.potBefore,
      `pot ${hand.won.potBefore} → ${hand.won.potAfter}`);

    // --- the pot, end to end, through the shell ---
    const pot = await t.ev(() => {
      const out = {};
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1 };
      Game.s.gold = 500;
      Dungeon.descend('tavern');
      const start = Dungeon.run.unbanked.gold;
      // a winning hand, resolved by the shell the way a room's outcome is
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 140, xp: 8 },
                        wager: { staked: 50, won: 140, mult: 1.4 } });
      out.afterWin = Dungeon.run.unbanked.gold;
      out.forkNamesTheTable = /table pays 140/.test(document.getElementById('resultBody').innerText);
      Dungeon.leave();
      out.purseAfter = Game.s.gold;
      out.start = start;

      // and the defining property: you can leave poorer than you arrived
      Game.s.gold = 500;
      Dungeon.descend('tavern');
      Dungeon.run.unbanked.gold = 0;              // every hand lost
      Dungeon.leave();
      out.pooreThanBefore = Game.s.gold;
      return out;
    });
    t.eq('a won hand grows the pot', pot.afterWin, pot.start + 140);
    t.ok('and the fork says what the table did', pot.forkNamesTheTable);
    t.eq('walking out banks the pot', pot.purseAfter, 400 + pot.start + 140);
    t.eq('and a bad night sends you home poorer than you came', pot.pooreThanBefore, 400);

    // --- Dice ---
    const dice = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      const a = Loadout.byId('dice');
      out.exists = !!a;
      out.strand = a.strand;
      out.isFightAbility = a.where !== 'fork';

      Game.s.topicStats = {};
      setStrand('Integrals', 0.95);
      out.charges = Loadout.charges(a);

      Game.s.loadout = ['dice'];
      Game.s.metRoom = { monster: 1, lock: 1 };
      Dungeon.descend('cellar');
      out.inFight = Battle.skillLeft.dice;

      const foeBefore = Battle.ehp;
      Battle.useSkill('dice');
      out.staked = Battle.diceUp;
      out.foeUnmoved = Battle.ehp === foeBefore;
      out.spentACharge = Battle.skillLeft.dice === out.inFight - 1;
      // and it cannot be stacked on itself
      out.notReadyTwice = !a.ready();

      /* The wiring, measured rather than eyeballed: capture the bonus the strike
         is actually built with, staked and unstaked, at the same combo.

         Each measurement gets a fresh question and an unkillable pair, because
         a fight that ends — or a question already answered — silently stops
         registering clicks, and a test that mistook that for "no second blow"
         would pass for the wrong reason. */
      const realStrike = Combat.strike, realHit = Combat.foeHit;
      const seen = [];
      Combat.strike = function (dmg, speed, combo, crit, rage, bonus, jitter) {
        seen.push(bonus); return realStrike.call(this, dmg, speed, combo, crit, rage, bonus, jitter);
      };
      const answerWith = (right) => {
        Battle.emax = Battle.ehp = 1e6;              // nobody dies mid-measurement
        Game.s.maxHp = Game.s.hp = 1e6;
        Battle.combo = 0; Battle.over = null;
        Battle.nextQuestion();
        /* A complex topic arrives as a Rite ladder, and a ladder STEP is graded
           on its own branch that never builds a strike at all. Measuring the
           strike means being on the whole problem — and the ladder has to be
           stood down BEFORE the choices are drawn, because the buttons are
           marked correct against whichever step is showing. Nulling it after
           the render leaves the right answer marked for a mote and graded
           against the parent, which reads as a wrong answer. */
        if (Battle.rite) { Battle.rite = null; Battle.renderStep(); }
        Battle.unassisted = false;
        Battle.perfect = false; Battle.slamNext = false;
        const btns = [...document.querySelectorAll('#choices .choice')];
        const b = right ? btns.find(x => x.dataset.correct === '1')
                        : btns.find(x => x.dataset.correct !== '1');
        if (b) b.click();
        return !!b;
      };
      const before = seen.length;
      Battle.diceUp = true;
      out.clickedStaked = answerWith(true);
      out.stakedBonus = seen[seen.length - 1];
      out.stakeSpentOnAWin = Battle.diceUp === false;
      out.strikeWasBuilt = seen.length > before;

      out.clickedPlain = answerWith(true);
      out.plainBonus = seen[seen.length - 1];
      Combat.strike = realStrike;

      // a lost stake is two blows rather than one bigger one
      let hits = 0;
      Combat.foeHit = function (atk, def, jitter) { hits++; return realHit.call(this, atk, def, jitter); };
      Battle.diceUp = true;
      answerWith(false);
      out.blowsWhenStaked = hits;
      out.stakeSpentOnALoss = Battle.diceUp === false;
      hits = 0;
      answerWith(false);
      out.blowsWhenPlain = hits;
      Combat.foeHit = realHit;
      return out;
    });
    t.ok('Dice is an ability', dice.exists);
    t.eq('drawn from the mathematics of expectation', dice.strand, 'Integrals');
    t.ok('spent in a fight, not at the fork', dice.isFightAbility);
    t.eq('a solid knight carries three', dice.charges, 3);
    t.eq('and takes them into a fight', dice.inFight, 3);
    t.ok('pressing it stakes the strike', dice.staked);
    t.ok('and does not touch the foe — the fight is not one question shorter',
      dice.foeUnmoved);
    t.ok('it costs a charge', dice.spentACharge);
    t.ok('and cannot be stacked on itself', dice.notReadyTwice);
    t.ok('the measurement actually landed a strike', dice.strikeWasBuilt &&
      dice.clickedStaked && dice.clickedPlain);
    t.ok('a staked strike is built with three times the bonus',
      dice.stakedBonus === dice.plainBonus * 3,
      `staked ${dice.stakedBonus} vs plain ${dice.plainBonus}`);
    t.ok('the stake is spent whether it wins', dice.stakeSpentOnAWin);
    t.ok('or loses', dice.stakeSpentOnALoss);
    t.eq('and a lost stake is struck at twice', dice.blowsWhenStaked, 2);
    t.eq('where a plain miss is struck at once', dice.blowsWhenPlain, 1);

    // --- Cards ---
    const cards = await t.ev(() => {
      const out = {};
      const a = Loadout.byId('cards');
      out.exists = !!a;
      out.strand = a.strand;

      Game.s.topicStats = {};
      const s = STRANDS.find(x => x[0] === 'Matrices');
      s[1].forEach(k => Game.s.topicStats[k] = {
        c: 20, w: 2, m: 0.95, seen: 12, last: 0, t: Date.now() });
      out.charges = Loadout.charges(a);

      Game.s.loadout = ['cards'];
      Game.s.metRoom = { monster: 1, lock: 1 };
      Dungeon.descend('cellar');

      const upNow = () => [...document.querySelectorAll('#choices .choice')]
        .filter(b => !b.classList.contains('faded'));
      const foeBefore = Battle.ehp;
      out.before = upNow().length;
      Battle.useSkill('cards');
      out.after = upNow().length;
      out.foeUnmoved = Battle.ehp === foeBefore;
      out.rightAnswerSurvives = upNow().some(b => b.dataset.correct === '1');

      /* The two it turns over are the ones the question is built to catch. The
         claim worth testing is not "this question had traps" — which question
         comes up is the scheduler's business — but that the marking on the
         buttons agrees with the generator's own diagnoses, every time. So draw
         a run of questions and compare the two directly. */
      out.drawn = 0; out.disagreements = 0; out.withTraps = 0;
      let trapped = null;
      for (let i = 0; i < 40; i++) {
        Battle.emax = Battle.ehp = 1e6; Battle.over = null;
        Battle.nextQuestion();
        if (Battle.rite) { Battle.rite = null; Battle.renderStep(); }
        const q = Battle.cur, why = q.why || {};
        const wantTraps = q.choices.filter(c => c !== q.a && why[c]).length;
        const marked = [...document.querySelectorAll('#choices .choice')]
          .filter(b => b.dataset.trap === '1').length;
        out.drawn++;
        if (marked !== wantTraps) out.disagreements++;
        if (wantTraps > 0) { out.withTraps++; if (!trapped) trapped = wantTraps; }
        if (trapped && out.drawn > 12) break;
      }

      /* And on a question that has them, Cards turns those over first.
         "Has them" has to mean has SOME — a question whose every wrong answer
         is diagnosed cannot tell preference from luck, since any two turned are
         traps either way. So only questions with a genuine non-trap wrong
         answer count as trials, and a run of them is needed before the claim
         means anything. */
      out.trials = 0; out.allTrapsTurned = 0;
      for (let i = 0; i < 80 && out.trials < 10; i++) {
        Battle.emax = Battle.ehp = 1e6; Battle.over = null;
        Battle.nextQuestion();
        if (Battle.rite) { Battle.rite = null; Battle.renderStep(); }
        const wrong = [...document.querySelectorAll('#choices .choice')]
          .filter(b => b.dataset.correct !== '1');
        const traps = wrong.filter(b => b.dataset.trap === '1');
        if (!traps.length || traps.length >= wrong.length || traps.length > 2) continue;
        out.trials++;
        Battle.playCards();
        if (traps.every(b => b.classList.contains('faded'))) out.allTrapsTurned++;
      }

      // and it is not offered once the answer is in
      Battle.answered = true;
      out.notAfterAnswering = !a.ready();
      return out;
    });
    t.ok('Cards is an ability', cards.exists);
    t.eq('drawn from the mathematics of elimination', cards.strand, 'Matrices');
    t.eq('a solid knight carries three', cards.charges, 3);
    t.eq('it turns two wrong answers face up', cards.before - cards.after, 2);
    t.ok('never the right one', cards.rightAnswerSurvives);
    t.ok('and never the foe — this one shortens nothing either', cards.foeUnmoved);
    t.ok('the marking on the buttons agrees with the generator\'s own diagnoses',
      cards.drawn > 0 && cards.disagreements === 0,
      `${cards.disagreements} disagreements over ${cards.drawn} questions`);
    t.ok('and the questions do carry diagnosed traps to turn over',
      cards.withTraps > 0, `${cards.withTraps} of ${cards.drawn} drawn`);
    t.ok('and Cards turns the diagnosed ones over first, every time',
      cards.trials >= 8 && cards.allTrapsTurned === cards.trials,
      `${cards.allTrapsTurned} of ${cards.trials} trials (needs 8 trials)`);
    t.ok('it is not offered once the answer is in', cards.notAfterAnswering);

    // --- and the rule, re-asserted over the widened table ---
    const safe = await t.ev(() => {
      const out = { offenders: [] };
      Game.s.metRoom = { monster: 1, lock: 1 };
      Dungeon.descend('cellar');
      out.swept = 0;
      for (const a of SKILL_ABILITIES) {
        const before = Battle.ehp;
        Battle.wardUp = false; Battle.steadyUp = false; Battle.diceUp = false;
        Battle.answered = false;
        out.swept++;
        try { a.go(); } catch (e) { /* a UI-only ability is fine */ }
        if (Battle.ehp !== before) out.offenders.push(a.id);
      }
      out.count = SKILL_ABILITIES.length;
      return out;
    });
    /* What matters is that the sweep saw the whole table, not that the table is
       a particular size — pinning the size means bumping a number every time a
       slice adds an ability, which is a chore that teaches nothing. The floor
       still catches an ability going missing. */
    t.ok('the sweep covers every ability in the table',
      safe.swept === safe.count && safe.count >= 6, `${safe.swept} of ${safe.count}`);
    t.ok('and not one of them damages the foe',
      safe.offenders.length === 0, 'offenders: ' + safe.offenders.join(', '));
  }
};
