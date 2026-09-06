#!/usr/bin/env node
/* The Dials — is the press-on-or-leave fork a real decision?
 *
 *   npm run balance              the full sweep
 *   npm run balance -- --runs 100    fewer runs per accuracy level
 *   npm run balance -- --json        machine-readable, for diffing a change
 *
 * After every cleared room the Deep asks: press deeper, or climb out with what
 * you carry? That is only a decision if the arithmetic can go either way. The
 * player is weighing
 *
 *     E[next room's loot]   >   P(you wipe)  ×  what you'd lose
 *
 * and the three terms are the three dials: the yield curve, the damage curve,
 * and the death cost. The property that makes the fork an expression of SKILL
 * rather than a formality is that the depth where that inequality flips — the
 * break-even depth — must rise with how good the player actually is. If a 40%
 * player and a 95% player should both bank at depth 4, the fork is a formality
 * and the Deep may as well hand out a fixed reward.
 *
 * So this plays the real game's arithmetic thousands of times at five accuracy
 * levels and reads the break-even depth out of the runs, rather than guessing
 * it. It drives Combat, WaveEngine and the settings table from index.html
 * itself — there is no second copy of the damage formula here to drift.
 */
'use strict';

const { loadPlaywright, launchOptions, URL } = require('./play/harness');

const ACCURACIES = [0.40, 0.55, 0.70, 0.85, 0.95];

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
}

/* Everything below runs INSIDE the page, so it can call the game's own
 * functions. It is written as one string-free function passed to evaluate. */
function simulate({ accuracies, runs, maxDepth, waves, knight, scryCharges, setting }) {
  /* A seeded stream of our own, so a sweep is reproducible and never touches
     the game's R (which the page uses for its own draws). */
  const mkRng = s => { let x = (s >>> 0) || 1;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

  const set = SETTINGS[setting] || SETTINGS.deep;
  // The curve under test — the shipped one unless a sweep passed its own.
  const CURVE = waves ? Object.assign({}, set.waves, waves) : set.waves;

  /* One room, fought to a conclusion. Returns the health left, or null if the
     knight fell. Mirrors Battle's turn structure exactly: a correct answer
     strikes, a wrong one is struck, and the foe's wind-up lands on its own
     clock whatever you answered. */
  function fightRoom(st, foe, acc, rnd) {
    let ehp = foe.hp, combo = 0, charge = 0, slamNext = false;
    const chargeMax = foe.boss ? 2 : 3;
    let guard = 0;
    while (ehp > 0 && st.hp > 0 && guard++ < 400) {
      const ok = rnd() < acc;
      if (ok) {
        combo++;
        // Speed bonus: a player good enough to be right is usually quick, but
        // not always. Held fixed across accuracy levels so the sweep isolates
        // knowing the answer from typing it fast.
        const r = rnd();
        const speed = r < 0.35 ? 1.5 : r < 0.75 ? 1.2 : 1.0;
        const crit = rnd() < (st.crit + combo * 0.02);
        ehp -= Combat.strike(st.dmg, speed, combo, crit, false, 1, 0.9 + rnd() * 0.2);
      } else {
        combo = 0;
        st.hp -= Combat.foeHit(foe.atk, st.def, 0.85 + rnd() * 0.3);
      }
      if (slamNext) {
        slamNext = false;
        st.hp -= Combat.slam(foe.atk, st.def, ok);
      } else if (++charge >= chargeMax) { charge = 0; slamNext = true; }
      if (st.hp <= 0) return null;
    }
    return st.hp;
  }

  /* A whole descent, pressing on to `bankAt` and then climbing out. Returns
     what was banked (0 on a wipe — a fall costs exactly the unbanked pile) and
     how deep it got. */
  /* What a knight can hold at this height. On the Summit the air thins with
     every room climbed, down to a floor — the same multiplier Game.maxHp reads
     live, restated here because this harness never touches the live save. A
     setting without thin air returns the knight's whole health at every depth,
     so this is a no-op everywhere else. */
  function ceilingAt(depth) {
    if (!set.thinAir) return BASE.maxHp;
    const climbed = Math.max(0, depth - 1);
    const air = Math.min(1, Math.max(set.airFloor || 0.4, 1 - set.thinAir * climbed));
    return Math.round(BASE.maxHp * air);
  }

  function descend(acc, seed, bankAt) {
    const rnd = mkRng(seed);
    const st = { hp: BASE.maxHp, dmg: BASE.dmg, crit: BASE.crit, def: BASE.def };
    let pot = 0, depth = 0;
    while (depth < bankAt) {
      depth++;
      // Height is applied before the room, exactly as nextRoom applies it.
      st.hp = Math.min(st.hp, ceilingAt(depth));
      if (st.hp <= 0) return { banked: 0, depth, died: true };
      /* Rooms are laid out by the same seeded roll the real Dungeon uses —
         kept in step with Dungeon.nextRoom by hand, because the shell picks
         its kind inline. If a room kind is added there and not here, this
         harness quietly starts measuring a game nobody is playing. */
      R.seed(((seed ^ (depth * 2654435761)) >>> 0) || 1);
      const isLock = depth >= 2 && R.chance(set.lockChance);
      const isSeam = !isLock && depth >= 2 && R.chance(set.seamChance || 0);
      const foe = WaveEngine.foe(depth, CURVE);
      R.unseed();
      if (isLock) {
        // A chest is one riddle: no foe, so it cannot kill you. It pays the
        // lock room's yield when answered, and nothing when fumbled.
        if (rnd() < acc) pot += Math.round(60 + depth * 20);
        continue;
      }
      if (isSeam) {
        // A seam yields ore, not gold, so it adds nothing to the pot at risk —
        // but it also cannot kill you, which is what makes it matter here: it
        // is a free room, and free rooms make pressing on cheaper.
        continue;
      }
      const left = fightRoom(st, foe, acc, rnd);
      if (left === null) return { banked: 0, depth, died: true };
      pot += foe.gold;
    }
    return { banked: pot, depth, died: false };
  }

  /* The knight who actually walks into the Deep. It opens on the first realm's
     boss, which pays out around two hundred gold and enough experience for
     level three — so the honest model is a knight in the gear that buys, not
     one in a peasant tunic and not the Arena's fully-kitted champion. Health
     comes from the game's own formula. */
  const w = WEAPONS[knight.weapon], a = ARMORS[knight.armor];
  const BASE = { maxHp: 100 + (knight.lvl - 1) * 18 + a.hp,
                 dmg: w.dmg, crit: w.crit, def: a.def,
                 gear: `${w.nm} · ${a.nm} · level ${knight.lvl}` };

  const out = { base: BASE, levels: [], foresight: set.foresight || 'farsight' };
  for (const acc of accuracies) {
    /* Expected banked gold if you commit to leaving at depth d. Averaged over
       many seeds, this curve rises while rooms are survivable and falls once
       the chance of losing the pot outweighs the next room's loot. Its peak IS
       the break-even depth — the deepest point still worth pressing to. */
    const curve = [];
    for (let d = 1; d <= maxDepth; d++) {
      let total = 0, deaths = 0, reached = 0;
      for (let s = 0; s < runs; s++) {
        const r = descend(acc, s * 7919 + d * 104729 + 1, d);
        total += r.banked;
        if (r.died) deaths++; else reached++;
      }
      curve.push({ d, ev: total / runs, deathRate: deaths / runs, reached: reached / runs });
    }
    let best = curve[0];
    for (const p of curve) if (p.ev > best.ev) best = p;

    // An always-press-on player never banks: how deep before they fall?
    let fell = 0, survivedAll = 0;
    for (let s = 0; s < runs; s++) {
      const r = descend(acc, s * 31337 + 7, maxDepth);
      if (r.died) fell += r.depth; else { survivedAll++; fell += maxDepth; }
    }

    /* What Scrying is worth. A player who can bail out of a bad room can safely
       AIM deeper than one who cannot, so the honest measurement is not "does the
       same plan earn more" but "does the best plan change" — the break-even
       depth, swept again for a player carrying Farsight.

       The reading itself is the one a player actually gets: how many blows the
       next foe would need to fell them. Below four, they climb out. Note that
       information may always be ignored, so a foresight player can never do
       worse than a blind one at the same bank depth; what the sweep shows is
       how much deeper it becomes rational to go. */
    function scryRun(acc, seed, bankAt) {
      const rnd = mkRng(seed);
      const st = { hp: BASE.maxHp, dmg: BASE.dmg, crit: BASE.crit, def: BASE.def };
      let pot = 0, depth = 0, turned = false;
      /* Charges are the whole balance of this ability. A knight solid in the
         Sanctum's mathematics carries three readings for an ENTIRE descent, not
         one per fork — so foresight informs a few decisions, and the rest of
         the run is still judgement. Simulating unlimited scrying turns the fork
         into an algorithm (a 97% bail rate) and badly overstates what the
         ability is worth; this is the number that matters most here. */
      let charges = scryCharges;
      while (depth < bankAt) {
        const next = depth + 1;
        R.seed(((seed ^ (next * 2654435761)) >>> 0) || 1);
        const nLock = next >= 2 && R.chance(set.lockChance);
        const nSeam = !nLock && next >= 2 && R.chance(set.seamChance || 0);
        const nFoe = WaveEngine.foe(next, CURVE);
        R.unseed();
        // A player spends a reading when they feel the risk, not at random.
        const worried = st.hp < BASE.maxHp * 0.6;
        if (!nLock && !nSeam && charges > 0 && worried) {
          charges--;
          const per = Math.max(1, nFoe.atk - BASE.def);
          if (Math.floor(st.hp / per) <= 3) { turned = true; break; }
        }
        depth = next;
        /* The same ceiling the blind climb is under. A knight carrying
           foresight is not exempt from the air, and leaving this out measures
           an ability that never tires — which flatters it at exactly the
           heights where the reading is supposed to matter most. */
        st.hp = Math.min(st.hp, ceilingAt(depth));
        if (st.hp <= 0) return { banked: 0, depth, died: true, turned };
        if (nLock) { if (rnd() < acc) pot += Math.round(60 + next * 20); continue; }
        if (nSeam) continue;
        if (fightRoom(st, nFoe, acc, rnd) === null) return { banked: 0, depth, died: true, turned };
        pot += nFoe.gold;
      }
      return { banked: pot, depth, died: false, turned };
    }

    const scryCurve = [];
    for (let d = 1; d <= maxDepth; d++) {
      let total = 0, turned = 0, reach = 0;
      for (let s = 0; s < runs; s++) {
        const r = scryRun(acc, s * 7919 + d * 104729 + 1, d);
        total += r.banked; reach += r.depth; if (r.turned) turned++;
      }
      scryCurve.push({ d, ev: total / runs, turned: turned / runs, reach: reach / runs });
    }
    let scryBest = scryCurve[0];
    for (const p of scryCurve) if (p.ev > scryBest.ev) scryBest = p;

    out.levels.push({
      acc,
      breakEven: best.d,
      bestEv: Math.round(best.ev),
      deathAtBreakEven: curve[best.d - 1].deathRate,
      greedyMeanDepth: fell / runs,
      greedySurvivedAll: survivedAll / runs,
      scryBreakEven: scryBest.d,
      scryEv: scryBest.ev,
      scryTurned: scryBest.turned,
      curve: curve.map(p => ({ d: p.d, ev: Math.round(p.ev), death: +p.deathRate.toFixed(3) }))
    });
  }
  return out;
}

/* Does a sweep result satisfy the Dials' acceptance properties? Returned as a
   list of complaints, so an empty list is a pass. */
function judge(res) {
  const L = res.levels, fails = [];
  const depths = L.map(x => x.breakEven);
  if (!depths.every((d, i) => i === 0 || d >= depths[i - 1]))
    fails.push(`break-even depth is not monotonic across accuracy: ${depths.join(' → ')}`);
  if (!(depths[depths.length - 1] > depths[0]))
    fails.push(`break-even depth never moves with skill (${depths.join(' → ')}) — the fork is a formality`);
  const worst = L[0], best = L[L.length - 1];
  if (worst.greedySurvivedAll > 0.05)
    fails.push(`a ${worst.acc * 100}% player who always presses on reaches the floor ` +
               `${(worst.greedySurvivedAll * 100).toFixed(0)}% of the time — the Deep is too soft`);
  if (best.greedyMeanDepth <= worst.greedyMeanDepth)
    fails.push('a strong player gets no deeper than a weak one before falling');
  // Whatever the setting's own ability is, Farsight must never COST a player
  // anything: information may always be ignored, so a knight carrying it can
  // do no worse than one who is not. That holds everywhere.
  for (const x of L) {
    if (x.scryEv < x.bestEv * 0.98)
      fails.push(`at ${Math.round(x.acc * 100)}% accuracy Farsight banks ${Math.round(x.scryEv)} ` +
                 `against ${x.bestEv} blind — information the player may ignore should never cost them`);
  }
  /* Farsight is the only foresight this harness models, and it answers "is the
     NEXT room survivable" — which is the question the Deep asks. A setting
     built around a different ability is not failed for Farsight being quiet in
     it; on the Summit, where the danger is attrition rather than one foe
     spiking, a one-room reading genuinely cannot help, and demanding that it
     does would only push the curves somewhere dishonest. What is reported
     instead is that the sweep did not measure that setting's own ability. */
  if (res.foresight === 'farsight' && !L.some(x => x.scryBreakEven > x.breakEven))
    fails.push('seeing one room ahead never makes it rational to go deeper — ' +
               'foresight is decoration in a slot that could hold something that works');
  if (best.breakEven < 3)
    fails.push(`even a ${best.acc * 100}% player banks at depth ${best.breakEven} — ` +
               'there is no run to speak of');
  return fails;
}

(async () => {
  const runs = arg('--runs', 400);
  const maxDepth = arg('--depth', 25);
  const asJson = process.argv.includes('--json');
  const sweep = process.argv.includes('--sweep');
  // The knight the Deep opens for: first realm cleared, its gold spent.
  const knight = { lvl: arg('--lvl', 3), weapon: arg('--weapon', 1), armor: arg('--armor', 1) };
  /* Which setting to sweep. The Deep is the default because it is the loop the
     whole game is built on — but a setting shipped unmeasured is exactly how
     the Deep once came to be unplayable, so every new one gets swept before it
     is believed. */
  const setName = (() => {
    const i = process.argv.indexOf('--setting');
    return i > 0 ? process.argv[i + 1] : 'deep';
  })();

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof Combat !== 'undefined' && typeof WaveEngine !== 'undefined');
  await page.evaluate(() => { if (!Game.s) { Profiles.create('Sim'); Game.load(); } });

  /* --sweep searches the curve space for settings that satisfy the acceptance
     properties, instead of tuning by feel one guess at a time. */
  if (sweep) {
    const grid = [];
    for (const hp0 of [40, 55, 70])
      for (const hpPer of [18, 26, 34])
        for (const atk0 of [8, 11, 14])
          for (const atkGrow of [1.06, 1.09, 1.12])
            grid.push({ hp0, hpPer, atk0, atkGrow });
    console.log(`\nSweeping ${grid.length} curves at ${runs} runs each…\n`);
    const good = [];
    for (const waves of grid) {
      const r = await page.evaluate(simulate,
        { accuracies: ACCURACIES, runs, maxDepth, waves, knight, scryCharges: 3 });
      const fails = judge(r);
      if (!fails.length) {
        const depths = r.levels.map(x => x.breakEven);
        good.push({ waves, depths, spread: depths[depths.length - 1] - depths[0],
                    greedy: r.levels.map(x => +x.greedyMeanDepth.toFixed(1)) });
      }
    }
    await browser.close();
    if (!good.length) { console.log('No curve in the grid satisfied the properties.\n'); process.exit(1); }
    // The best curve is the one that spreads break-even widest across skill —
    // that spread IS how much the fork rewards knowing the material.
    good.sort((a, b) => b.spread - a.spread);
    console.log('  hp0  hpPer  atk0  grow   break-even by accuracy      spread');
    console.log('  ───  ─────  ────  ────   ──────────────────────      ──────');
    for (const g of good.slice(0, 12))
      console.log(`  ${String(g.waves.hp0).padStart(3)}  ${String(g.waves.hpPer).padStart(5)}` +
        `  ${String(g.waves.atk0).padStart(4)}  ${g.waves.atkGrow.toFixed(2)}   ` +
        `${g.depths.map(d => String(d).padStart(3)).join(' ')}        ${g.spread}`);
    console.log(`\n${good.length} of ${grid.length} curves hold up.\n`);
    process.exit(0);
  }

  const t0 = Date.now();
  const res = await page.evaluate(simulate,
    { accuracies: ACCURACIES, runs, maxDepth, waves: null, knight,
      scryCharges: arg('--scry', 3), setting: setName });
  await browser.close();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  if (asJson) { console.log(JSON.stringify(res, null, 2)); }
  else {
    console.log('\nKnights of the Eigenrealm — the Dials');
    console.log('──────────────────────────────────────────────────────────');
    console.log(`  setting: ${setName}`);
    console.log(`  the knight it opens for: ${res.base.gear}`);
    console.log(`  ${res.base.maxHp} health · ${res.base.dmg} damage · ${res.base.def} defence`);
    console.log(`  ${runs} runs per accuracy level, to depth ${maxDepth}`);
    if (res.foresight !== 'farsight')
      console.log(`  note: this setting's own foresight is ${res.foresight}, which this sweep` +
                  `\n        does not model — the Farsight column below is a floor, not its value`);
    console.log('');
    console.log('  accuracy   break-even   banked      with Farsight: aims   banks   bails');
    console.log('  ────────   ──────────   ──────      ───────────────────   ─────   ─────');
    for (const L of res.levels) {
      console.log(
        `     ${(L.acc * 100).toFixed(0).padStart(3)}%` +
        `       depth ${String(L.breakEven).padStart(2)}` +
        `   ${String(L.bestEv).padStart(6)}` +
        `` +
        `             depth ${String(L.scryBreakEven).padStart(2)}` +
        `  ${String(Math.round(L.scryEv)).padStart(6)}` +
        `   ${(L.scryTurned * 100).toFixed(0).padStart(3)}%`);
    }
    console.log('');
  }

  // --- the acceptance properties, from the Dials' "done when" ---
  const fails = judge(res);
  const depths = res.levels.map(x => x.breakEven);

  if (!asJson) {
    console.log('──────────────────────────────────────────────────────────');
    if (fails.length) {
      console.log('\nThe fork does not hold up:\n');
      for (const f of fails) console.log('  ✗ ' + f);
      console.log('\nTune ARENA_WAVES (the damage and yield curves) and re-run.\n');
    } else {
      console.log(`\nThe fork holds: break-even rises ${depths.join(' → ')} with skill.  (${secs}s)\n`);
    }
  }
  process.exit(fails.length ? 1 : 0);
})();
