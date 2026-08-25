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
function simulate({ accuracies, runs, maxDepth, waves, knight }) {
  /* A seeded stream of our own, so a sweep is reproducible and never touches
     the game's R (which the page uses for its own draws). */
  const mkRng = s => { let x = (s >>> 0) || 1;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

  const set = SETTINGS.deep;
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
  function descend(acc, seed, bankAt) {
    const rnd = mkRng(seed);
    const st = { hp: BASE.maxHp, dmg: BASE.dmg, crit: BASE.crit, def: BASE.def };
    let pot = 0, depth = 0;
    while (depth < bankAt) {
      depth++;
      // Rooms are laid out by the same seeded roll the real Dungeon uses.
      R.seed(((seed ^ (depth * 2654435761)) >>> 0) || 1);
      const isLock = depth >= 2 && R.chance(set.lockChance);
      const foe = WaveEngine.foe(depth, CURVE);
      R.unseed();
      if (isLock) {
        // A chest is one riddle: no foe, so it cannot kill you. It pays the
        // lock room's yield when answered, and nothing when fumbled.
        if (rnd() < acc) pot += Math.round(60 + depth * 20);
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

  const out = { base: BASE, levels: [] };
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
    out.levels.push({
      acc,
      breakEven: best.d,
      bestEv: Math.round(best.ev),
      deathAtBreakEven: curve[best.d - 1].deathRate,
      greedyMeanDepth: fell / runs,
      greedySurvivedAll: survivedAll / runs,
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
        { accuracies: ACCURACIES, runs, maxDepth, waves, knight });
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
    { accuracies: ACCURACIES, runs, maxDepth, waves: null, knight });
  await browser.close();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  if (asJson) { console.log(JSON.stringify(res, null, 2)); }
  else {
    console.log('\nKnights of the Eigenrealm — the Dials');
    console.log('──────────────────────────────────────────────────────────');
    console.log(`  the knight the Deep opens for: ${res.base.gear}`);
    console.log(`  ${res.base.maxHp} health · ${res.base.dmg} damage · ${res.base.def} defence`);
    console.log(`  ${runs} runs per accuracy level, to depth ${maxDepth}\n`);
    console.log('  accuracy   break-even   banked   wipe risk   always-press-on');
    console.log('  ────────   ──────────   ──────   ─────────   ───────────────');
    for (const L of res.levels) {
      console.log(
        `     ${(L.acc * 100).toFixed(0).padStart(3)}%` +
        `       depth ${String(L.breakEven).padStart(2)}` +
        `   ${String(L.bestEv).padStart(6)}` +
        `      ${(L.deathAtBreakEven * 100).toFixed(0).padStart(3)}%` +
        `        falls at ${L.greedyMeanDepth.toFixed(1)}` +
        (L.greedySurvivedAll > 0.02 ? ` (${(L.greedySurvivedAll * 100).toFixed(0)}% reach the floor)` : ''));
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
