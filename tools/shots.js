#!/usr/bin/env node
/* Screenshot the game, so a change can be looked at rather than described.
 *
 *   npm run shots                    every scene, at phone size
 *   npm run shots -- --only map      one scene
 *   npm run shots -- --wide          desktop width too
 *   npm run shots -- --out somewhere where to put them
 *
 * A scene is a named function that puts the game into a state worth seeing —
 * a knight mid-descent, a chest whose pick just snapped, the Ledger of a player
 * who has been away a fortnight. Reaching those states through the real UI is
 * slow and fragile, so scenes set up the save directly and then call the game's
 * own render, which is what a player would be looking at.
 *
 * Files land as NN-name.png so they sort into the order a player meets them.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadPlaywright, launchOptions, URL, sleep } = require('./play/harness');

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1100, height: 900 };

/* Each scene: { name, note, go } where `go` runs in the page and leaves the
   screen showing what we want. Anything returned is printed beside the file. */
const SCENES = [
  { name: 'title-cold', note: 'a browser that has never played',
    go: () => { UI.go('s-title'); UI.refreshTitle(); } },

  { name: 'opening', note: 'the first of three cards',
    go: () => { Profiles.create('Aveline'); Game.load(); Game.s.seenOpening = 0;
                Opening.play(() => UI.go('s-map')); } },

  { name: 'quartermaster', note: 'who sends a new knight down',
    go: () => { Quartermaster.open(); } },

  { name: 'room-intro-fight', note: 'the fight verb, taught once',
    go: () => { Game.s.metRoom = {}; RoomIntro.show('monster', () => {}); } },

  { name: 'battle', note: 'a cellar fight, mid-question',
    go: () => { Game.s.metRoom = { monster: 1, lock: 1 };
                Dungeon.descend('cellar'); } },

  { name: 'room-intro-lock', note: 'the chest verb, taught once',
    go: () => { Game.s.metRoom = {}; RoomIntro.show('lock', () => {}); } },

  { name: 'lock', note: 'a locked chest, one riddle from open',
    go: () => { Game.s.metRoom = { monster: 1, lock: 1 }; Game.s.items.pick = 3;
                R.seed(4); const spec = RoomKinds.lock.build(R, 3, SETTINGS.deep); R.unseed();
                Lock.begin(spec, { depth: 3 }, () => {}); Lock.tumblers(); } },

  { name: 'lock-snapped', note: 'the pick breaks, and it says why',
    go: () => { Game.s.metRoom = { monster: 1, lock: 1 }; Game.s.items.pick = 3;
                R.seed(4); const spec = RoomKinds.lock.build(R, 3, SETTINGS.deep); R.unseed();
                Lock.begin(spec, { depth: 3 }, () => {}); Lock.tumblers();
                const wrong = document.querySelector('#lockChoices .choice:not([data-correct="1"])');
                if (wrong) wrong.click(); } },

  { name: 'scry', note: 'the fork, with a reading paid for',
    go: () => { const set=(n,m)=>{const st=STRANDS.find(x=>x[0]===n);
                  st[1].forEach(k=>Game.s.topicStats[k]={c:20,w:2,m,seen:12,last:0,t:Date.now()});};
                Game.s.topicStats={}; set('Multivariable & Series',0.95);
                Game.s.loadout=['farsight','ward','steady'];
                Game.s.metRoom={monster:1,lock:1,seam:1};
                Dungeon.descend('deep');
                // A monster reading is the one worth showing: it is where the
                // ability does arithmetic rather than just naming a room.
                for(let i=0;i<60;i++){ Dungeon.run.seed=1000+i;
                  if(Dungeon.peek(2).name==='monster') break; }
                Dungeon.resolve({status:'cleared',quality:1,topics:[],yield:{gold:210,xp:60}});
                Dungeon.scry(); } },

  { name: 'fork', note: 'press deeper, or climb out with the haul',
    go: () => { Game.s.metRoom = { monster: 1, lock: 1 };
                Dungeon.descend('deep');
                Dungeon.resolve({ status: 'cleared', quality: 1, topics: [],
                                  yield: { gold: 210, xp: 60 } }); } },

  { name: 'run-end', note: 'the cellar walks you back up the stairs',
    go: () => { Dungeon.descend('cellar'); Dungeon.run.depth = 3;
                Dungeon.finishRun({ status: 'cleared', quality: 1, topics: [], yield: {} }); } },

  { name: 'died', note: 'the Deep keeps what you had not banked',
    // Only a monster room can end a run, so put one there rather than taking
    // whatever the seed rolls — a lock room has no foe to name on the screen.
    go: () => { Dungeon.descend('deep');
                Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 340, xp: 80 } });
                Dungeon.run.depth = 5;
                R.seed(2); const spec = RoomKinds.monster.build(R, 5, SETTINGS.deep); R.unseed();
                Dungeon.cur = { kind: RoomKinds.monster, spec };
                Dungeon.died({ status: 'failed' }); } },

  { name: 'title-midrun', note: 'a knight parked mid-descent',
    go: () => { Dungeon.descend('deep');
                Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 180, xp: 40 } });
                UI.go('s-title'); UI.refreshTitle(); } },

  { name: 'map', note: 'the overworld, with a descent waiting',
    go: () => { REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
                Game.s.firstRun = 1; Game.s.gold = 640; Game.s.lvl = 4;
                UI.go('s-map'); } },

  { name: 'seam', note: 'Delving — how deep do you mean to cut?',
    go: () => { Game.s.metRoom = { monster:1, lock:1, seam:1 }; Game.s.mats={ore:12,essence:3};
                R.seed(11); const spec = RoomKinds.seam.build(R, 6, SETTINGS.deep); R.unseed();
                Seam.begin(spec, { depth: 6 }, () => {}); } },

  { name: 'forge', note: 'the Keep spends what the Deep gave up',
    go: () => { Game.s.gold = 900; Game.s.mats = { ore: 26, essence: 9 };
                Game.s.runes = { r_edge: 1 };
                UI.go('s-shop'); } },

  { name: 'shop', note: 'the Smithy, lockpicks included',
    go: () => { Game.s.gold = 900; UI.go('s-shop'); } },

  { name: 'ledger', note: 'mastery after a fortnight away — note the fade',
    go: () => { const keys = Object.keys(TOPIC_LABEL).slice(0, 14);
                Game.s.topicStats = {};
                keys.forEach((k, i) => {
                  const m = [0.95, 0.9, 0.75, 0.62, 0.5, 0.35, 0.2][i % 7];
                  Game.s.topicStats[k] = { c: 20, w: 6, m, seen: 8 + i,
                    last: Math.max(0, Game.s.qCount - i * 4),
                    t: Date.now() - (i % 5) * 4 * 864e5 };
                });
                Game.s.qCount = 400; UI.go('s-gear'); } },

  { name: 'skills', note: 'the loadout — uses come from what you know',
    go: () => { const set=(n,m)=>{const st=STRANDS.find(x=>x[0]===n);
                  st[1].forEach(k=>Game.s.topicStats[k]={c:20,w:2,m,seen:12,last:0,t:Date.now()});};
                Game.s.topicStats={};
                set('Vectors',0.95); set('Limits & Derivatives',0.68); set('Applications',0.4);
                UI.go('s-gear'); } },

  { name: 'tome', note: 'the tale is re-readable here',
    go: () => { UI.go('s-tome'); } },

  { name: 'settings', note: 'build and save-format stamp at the foot',
    go: () => { UI.go('s-prefs'); } }
];

function arg(flag) { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; }

(async () => {
  const only = arg('--only');
  const outDir = arg('--out') || path.join(__dirname, '..', 'screenshots');
  const wide = process.argv.includes('--wide');
  const picked = only ? SCENES.filter(s => s.name === only) : SCENES;
  if (only && !picked.length) {
    console.error(`No scene named "${only}". Try: ${SCENES.map(s => s.name).join(', ')}`);
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(launchOptions());

  const sizes = wide ? [['', PHONE], ['-wide', WIDE]] : [['', PHONE]];
  const written = [];

  for (const [suffix, viewport] of sizes) {
    for (let i = 0; i < picked.length; i++) {
      const scene = picked[i];
      // A fresh context per scene: no save, no scroll, no leftover screen.
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto(URL);
      await page.waitForFunction(() => typeof Game !== 'undefined' && typeof UI !== 'undefined');
      // Most scenes want a knight already in hand; title-cold deliberately does not.
      if (scene.name !== 'title-cold' && scene.name !== 'opening')
        await page.evaluate(() => { if (!Game.s) { Profiles.create('Aveline'); Game.load(); } });
      // Animation off, so a shot is the same shot every time.
      await page.evaluate(() => { Prefs.d.motion = false; Prefs.d.sound = false; });
      try { await page.evaluate(scene.go); } catch (e) { errs.push('scene: ' + e.message); }
      await sleep(700);

      const idx = String((only ? SCENES.findIndex(s => s.name === scene.name) : i) + 1).padStart(2, '0');
      const file = path.join(outDir, `${idx}-${scene.name}${suffix}.png`);
      await page.screenshot({ path: file, fullPage: true });
      written.push({ file, scene, errs });
      await ctx.close();
    }
  }
  await browser.close();

  console.log('');
  for (const w of written) {
    console.log(`  ${path.basename(w.file)}`);
    console.log(`      ${w.scene.note}`);
    if (w.errs.length) console.log(`      ⚠ ${w.errs.join(' | ')}`);
  }
  console.log(`\n${written.length} shots in ${outDir}\n`);
})();
