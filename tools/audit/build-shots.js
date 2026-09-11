/* Build the SHOTS map the audit page inlines.
 *
 * Three kinds of picture. Whole screens, which tools/shots.js already renders.
 * Single panels out of a long scrolling screen — the Gear screen is five
 * thousand pixels tall, and a figure that shrinks all of it to page width is
 * not a screenshot, it is a texture. And viewport shots, for screens whose
 * whole point is what you see BEFORE you scroll: the map's reorder IS the first
 * screenful, so a full-page capture of it is eight thousand pixels of exactly
 * the thing the change was about.
 *
 * Everything is downscaled and JPEG-encoded through a canvas, because the page
 * carries them as data URIs and a published artifact has a size budget.
 *
 * Writes shots-inline.js beside this file. Run tools/shots.js first — the
 * whole-screen captures are read from its output and are checked for staleness.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadPlaywright, launchOptions, URL, sleep } = require('../play/harness');
const OUT = __dirname;

const strand = `const set=(n,m)=>{const st=STRANDS.find(x=>x[0]===n);
  st[1].forEach(k=>Game.s.topicStats[k]={c:20,w:2,m,seen:12,last:0,t:Date.now()});};`;

// One panel out of a long screen, found by the heading it carries.
const PANELS = [
  { key: 'skills', heading: /Skills/, list: 'gearList',
    setup: `${strand}
      Game.s.topicStats={};
      set('Vectors',0.95); set('Integrals',0.72); set('Applications',0.88);
      Game.s.loadout=['ward','dice','rumours'];
      UI.go('s-gear');` },
  { key: 'passage', heading: /What stays with you/, list: 'gearList',
    setup: `${strand}
      Game.s.topicStats={};
      set('Integrals',0.95); set('Eigen & Subspaces',0.68); set('Multivariable & Series',0.90);
      Game.s.bests={deep:11, summit:14};
      UI.go('s-gear');` },

  /* Alchemy's bench, lit, with a deep pile of pages and a shallow one of ore.
     Posed at exactly that gradient because the three quotes are the only
     teaching the room does: 40 pages come back as 26 and 120 as 54, so the
     second half of the pile is visibly worth half the first. */
  { key: 'crucible', heading: /The Crucible/, list: 'shopList',
    setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=18; Game.s.gold=1500;
      Game.s.mats={ore:6, essence:9, herb:23, page:120};
      Game.s.alch=0;
      strandTopics(Crucible.STRAND).forEach(k=>Game.s.topicStats[k]=
        {c:30,w:2,m:0.9,seen:20,last:Game.s.qCount||0,t:Date.now()});
      UI.go('s-shop');` }
];

/* What the player sees without scrolling. */
const VIEWPORTS = [
  { key: 'map', height: 1180, setup: `
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.firstRun=1; Game.s.gold=2400; Game.s.lvl=22; Game.s.hp=478;
      Game.s.bests={summit:14, deep:11}; Game.s.arenaBest=9;
      Game.s.owned={w0:1,a0:1,w9:1,a8:1}; Game.s.weapon='w9'; Game.s.armor='a8';
      UI.go('s-map');` },

  /* The ward-stone, mid-inscription. Posed at the second riddle with one layer
     already cut, because that is the only frame where the whole room is on
     screen at once: the strand it drills, the ladder of layers, and the stake
     that the next answer is riding on. */
  { key: 'sigil', height: 745, setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=12; Game.s.gold=640;
      set('Vectors',0.66);
      Dungeon.descend('deep');
      Dungeon.run.depth=5;
      R.seed(31337);
      const spec=RoomKinds.sigil.build(R,5,SETTINGS.deep);
      R.unseed();
      Sigil.begin(spec,{depth:5,run:Dungeon.run},()=>{});
      Sigil.layers=1; Sigil.at=1; Sigil.ask();` },

  /* A Wilds fork carrying a Tracking reading. Posed partway up the rising side
     of the swell, where the reading says the thing no other foresight can. */
  { key: 'tracking', height: 645, setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=13; Game.s.gold=900;
      STRANDS.forEach(s=>set(s[0],0.9));
      Game.s.loadout=['tracking','ward','dice'];
      Game.s.metRoom={monster:1,lock:1,seam:1,wager:1,rumour:1,sigil:1,forage:1};
      Dungeon.descend('wilds');
      Dungeon.run.depth=6;
      Dungeon.cur={kind:RoomKinds.monster, spec:{kind:'monster', foe:{nm:'Nilpotent Warden', boss:false}}};
      Dungeon.run.unbanked={gold:412, xp:96};
      Dungeon.takeTracking();` },

  /* The thicket, at the half the mathematics does not answer for you. Posed at
     two squares of basket with one plant already packed, because that is the
     frame where the trade is visible. */
  { key: 'thicket', height: 620, setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=13; Game.s.mats.herb=38;
      set('Eigen & Subspaces',0.72);
      Dungeon.descend('wilds');
      Dungeon.run.depth=7;
      R.seed(20260907);
      const spec=RoomKinds.forage.build(R,7,SETTINGS.wilds);
      R.unseed();
      Forage.begin(spec,{depth:7,run:Dungeon.run},()=>{});
      Forage.space=2; Forage.at=2;
      Forage.taken=[];
      Forage.choose();
      const small=spec.plants.findIndex(p=>p.bulk===1);
      if(small>=0) Forage.toggle(small);` },

  /* A Sea fork carrying a forecast. The one reading in the game about something
     nobody could have worked out — so the picture is the panel, not the room. */
  { key: 'weather', height: 632, setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=16; Game.s.gold=1400;
      STRANDS.forEach(s=>set(s[0],0.9));
      Game.s.loadout=['weather','ward','cards'];
      Game.s.metRoom={monster:1,lock:1,seam:1,wager:1,rumour:1,sigil:1,forage:1,hold:1,copy:1};
      Dungeon.descend('sea');
      Dungeon.run.seed=8171;
      Dungeon.run.depth=5;
      Dungeon.run.cargo=260;
      Dungeon.run.unbanked={gold:318, xp:120};
      Dungeon.cur={kind:RoomKinds.monster, spec:{kind:'monster', foe:{nm:'Divergent Warden', boss:false}}};
      Dungeon.readWeather();` },

  /* A scriptorium mid-copy, after a slip: the only screen in the game that
     shows precision falling and every later line worth less for it. */
  { key: 'scribe', height: 528, setup: `${strand}
      REALMS.forEach((r,ri)=>r.foes.forEach((f,i)=>Game.s.cleared[ri+':'+i]=1));
      Game.s.lvl=17; Game.s.mats.page=52;
      set('Limits & Derivatives',0.62);
      Dungeon.descend('library');
      Dungeon.run.depth=6;
      R.seed(20260909);
      const spec=RoomKinds.copy.build(R,6,SETTINGS.library);
      R.unseed();
      Scribe.begin(spec,{depth:6,run:Dungeon.run},()=>{});
      Scribe.at=2; Scribe.pages=4; Scribe.precision=0.7; Scribe.slips=1;
      Scribe.ask();` }
];

/* Whole screens, straight from tools/shots.js output — resolved by NAME, not
   by the NN- prefix. That prefix is the scene's position in the list, so it
   shifts every time a scene is added, and a hard-coded number quietly picks up
   whatever stale file still answers to it. That happened once; hence this. */
const shotNamed = (name) => {
  const dir = path.join(OUT, 'shots');
  if (!fs.existsSync(dir)) {
    throw new Error(`no ${dir} — run: npm run shots -- --out tools/audit/shots`);
  }
  const hit = fs.readdirSync(dir).filter(f => f.replace(/^\d+-/, '') === name + '.png');
  if (hit.length !== 1) throw new Error(`expected one shots/*-${name}.png, found ${hit.length}: ${hit}`);
  const full = path.join(dir, hit[0]);
  const age = (Date.now() - fs.statSync(full).mtimeMs) / 60000;
  if (age > 30) throw new Error(`shots/${hit[0]} is ${Math.round(age)} minutes old — re-run tools/shots.js`);
  return path.join('shots', hit[0]);
};
const FILES = [
  { key: 'wager', file: shotNamed('wager') },
  { key: 'summit', file: shotNamed('summit') }
];

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(launchOptions());

  const boot = async (page) => {
    await page.goto(URL);
    await page.waitForFunction(() => typeof Game !== 'undefined' && typeof UI !== 'undefined');
    await page.evaluate(() => { Profiles.create('Aveline'); Game.load();
                                Prefs.d.motion = false; Prefs.d.sound = false; });
  };

  for (const p of PANELS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await boot(page);
    await page.evaluate(p.setup);
    await sleep(500);
    const el = await page.evaluateHandle(({ list, heading }) => {
      const re = new RegExp(heading);
      return [...document.querySelectorAll('#' + list + ' .panel')].find(x => re.test(x.innerText));
    }, { list: p.list, heading: p.heading.source });
    const node = el.asElement();
    if (!node) throw new Error('no panel matched ' + p.key);
    await node.screenshot({ path: path.join(OUT, `panel-${p.key}.png`) });
    await ctx.close();
    FILES.push({ key: p.key, file: `panel-${p.key}.png` });
    console.log('panel   ', p.key);
  }

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: v.height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await boot(page);
    await page.evaluate(v.setup);
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, `view-${v.key}.png`) });   // NOT fullPage
    await ctx.close();
    FILES.push({ key: v.key, file: `view-${v.key}.png` });
    console.log('viewport', v.key);
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const shots = {};
  for (const f of FILES) {
    const buf = fs.readFileSync(path.join(OUT, f.file));
    const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
    shots[f.key] = await page.evaluate(async ({ src, wide }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
      const target = Math.min(img.width, wide);
      const c = document.createElement('canvas');
      c.width = target; c.height = Math.round(img.height * target / img.width);
      const g = c.getContext('2d');
      g.fillStyle = '#0d0a16'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.82);
    }, { src: dataUrl, wide: 760 });
    console.log(`${f.key.padEnd(9)} ${String(Math.round(shots[f.key].length / 1024)).padStart(5)}KB`);
  }
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'shots-inline.js'), 'const SHOTS = ' + JSON.stringify(shots) + ';');
  const total = Object.values(shots).reduce((n, v) => n + v.length, 0);
  console.log(`\ntotal ${Math.round(total / 1024)}KB across ${Object.keys(shots).length} images`);
})();
