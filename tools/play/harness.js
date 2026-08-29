/* Shared machinery for the playthrough suites.
 *
 * These tests drive the real index.html in a real browser, because that is the
 * only place the game actually exists — there is no build step to hook into and
 * no module boundary to import across. Everything the suites need to talk to
 * the page lives here, so a suite is a list of claims rather than a pile of
 * Playwright boilerplate.
 */
'use strict';

const path = require('path');

const INDEX = path.join(__dirname, '..', '..', 'index.html');
const URL = 'file://' + INDEX;

/* Playwright is a devDependency, but this repo has no node_modules in the
 * common case — it is a single HTML file with a couple of scripts beside it.
 * So resolve generously and say something useful when it is missing, rather
 * than failing with a bare MODULE_NOT_FOUND. */
function loadPlaywright() {
  const tries = ['playwright', 'playwright-core'];
  for (const name of tries) {
    try { return require(name); } catch (e) { /* keep looking */ }
  }
  // A globally installed copy is common on CI images and dev boxes.
  const globals = (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean);
  for (const root of globals) {
    for (const name of tries) {
      try { return require(path.join(root, name)); } catch (e) { /* keep looking */ }
    }
  }
  console.error(
    'The playthrough suites need Playwright, which is not installed.\n' +
    '  npm install            # installs it as a devDependency\n' +
    '  npx playwright install chromium\n' +
    'Then re-run: npm run test:play');
  process.exit(2);
}

/* PLAYWRIGHT_CHROMIUM is an escape hatch for images that ship a browser
 * outside Playwright's own cache; normally Playwright finds its own. */
function launchOptions() {
  const o = { headless: process.env.PLAY_HEADED !== '1' };
  if (process.env.PLAYWRIGHT_CHROMIUM) o.executablePath = process.env.PLAYWRIGHT_CHROMIUM;
  return o;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* One suite's view of the game. Wraps a fresh browser context so suites cannot
 * leak saved knights into each other, and collects page errors — an uncaught
 * exception on the page is a failure even if every claim passes. */
class Play {
  constructor(page, errors) { this.page = page; this.errors = errors; this.checks = []; }

  /* Record a claim. Kept as data rather than throwing, so one broken claim does
   * not hide the twenty after it — a failing suite should say everything it
   * knows in one run. */
  ok(name, cond, detail) {
    this.checks.push({ name, pass: !!cond, detail: cond ? null : detail });
  }
  eq(name, got, want) {
    this.ok(name, Object.is(got, want) || JSON.stringify(got) === JSON.stringify(want),
      `expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }

  // --- talking to the page ---
  ev(fn, arg) { return this.page.evaluate(fn, arg); }
  screen() { return this.ev(() => document.querySelector('.screen.on').id); }
  text() { return this.ev(() => document.querySelector('.screen.on').innerText); }
  reload() { return this.page.reload().then(() => this.ready()); }

  ready() {
    return this.page.waitForFunction(
      () => typeof Game !== 'undefined' && typeof Dungeon !== 'undefined'
         && typeof Mastery !== 'undefined' && typeof Profiles !== 'undefined');
  }
  /* The game opens on the title screen with nobody playing. Most suites want a
   * knight in hand; the front-door suite deliberately does not call this. */
  newKnight(nm) {
    return this.ev(n => { if (!Game.s) { Profiles.create(n); Game.load(); } }, nm || 'Tester');
  }
  // Open the Deep without playing the campaign that unlocks it.
  unlockDeep() {
    return this.ev(() => REALMS[0].foes.forEach((f, fi) => Game.s.cleared['0:' + fi] = 1));
  }

  /* Click by id, but through the DOM rather than Playwright's actionability
   * checks: several of these buttons live on screens that are swapped by class,
   * and a stale hidden twin elsewhere in the document makes a plain click hang.
   * Returns false when the button is not on the ACTIVE screen. */
  async tap(id) {
    const hit = await this.ev(sel => {
      const on = document.querySelector('.screen.on');
      const el = on && on.querySelector('#' + sel);
      if (!el) return false;
      el.click(); return true;
    }, id);
    if (hit) await sleep(120);
    return hit;
  }
  // Is this button showing on the screen the player is actually looking at?
  showing(id) {
    return this.ev(sel => {
      const on = document.querySelector('.screen.on');
      return !!(on && on.querySelector('#' + sel));
    }, id);
  }
  // Click the first button on the active screen whose label matches.
  async tapText(re) {
    const hit = await this.ev(src => {
      const on = document.querySelector('.screen.on');
      const b = [...on.querySelectorAll('button')].find(x => new RegExp(src).test(x.textContent));
      if (!b) return false;
      b.click(); return true;
    }, re.source || String(re));
    if (hit) await sleep(200);
    return hit;
  }

  /* Answer a fight correctly until it ends. The correct choice is marked in the
   * DOM by the game itself (it needs the marker to colour the buttons), so this
   * plays a perfect game without reimplementing any mathematics. */
  async winFight(limit) {
    for (let i = 0; i < (limit || 40); i++) {
      if (await this.screen() !== 's-battle') return true;
      const clicked = await this.ev(() => {
        const b = document.querySelector('#choices .choice[data-correct="1"]');
        if (!b) return false;
        b.click(); return true;
      });
      if (!clicked) { await sleep(250); continue; }
      await sleep(1400);                       // the strike animation must settle
      await this.ev(() => {                    // step past the explanation, if shown
        const ex = document.getElementById('explain');
        if (ex && ex.style.display !== 'none') {
          const b = ex.querySelector('button'); if (b) b.click();
        }
      });
      await sleep(500);
    }
    return false;
  }
  // Step past a room-kind introduction if one is up.
  async passIntro() {
    if (await this.showing('introGo')) { await this.tap('introGo'); await sleep(300); return true; }
    return false;
  }
}

/* Run one suite in its own context, so storage never carries between them. */
async function runSuite(browser, suite) {
  const ctx = await browser.newContext(suite.viewport ? { viewport: suite.viewport } : {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const t = new Play(page, errors);
  let crash = null;
  try {
    await page.goto(URL);
    await t.ready();
    await suite.run(t);
  } catch (e) {
    // The stack, not just the message: a suite that throws is usually throwing
    // in ITS own code rather than the game's, and the line number says which.
    crash = (e.stack || e.message).split('\n').slice(0, 4).join('\n');
  }
  // An uncaught page exception fails the suite even if every claim passed.
  t.ok('the page raised no errors', errors.length === 0, errors.join(' | '));
  if (crash) t.ok('the suite ran to completion', false, crash);
  await ctx.close();
  return t.checks;
}

module.exports = { loadPlaywright, launchOptions, runSuite, sleep, URL, Play };
