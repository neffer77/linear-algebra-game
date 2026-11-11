/* The installed game finds its way to the newest build.
 *
 * Every other suite opens index.html from disk, where there is no service
 * worker. This one serves the game over real HTTP from a subdirectory, the
 * same shape as a GitHub project page, with the same ten-minute max-age GitHub
 * Pages sends, and then deploys new builds behind a player who is already
 * there. Three ways a player could be left on an old build are each closed:
 *
 *   - they tapped Later (or left before the bar appeared), so the new worker
 *     is installed and waiting, and no event will ever announce it again;
 *   - the new worker filled its cache from the browser's HTTP cache, and so
 *     serves the old game under the new version's name;
 *   - the game sits open on a home screen for days and is never navigated,
 *     which is the only time a browser looks for a new worker by itself.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { sleep } = require('./harness');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
                '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

/* Write one build into the served folder: the worker stamped with its version
   the way the deploy stamps it, the game marked so a page can say which build
   it is showing, and the build stamp beside it. */
function deploy(dir, version) {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
    .replace("const VERSION = 'dev';", `const VERSION = '${version}';`);
  if (!sw.includes(`'${version}'`)) throw new Error('sw.js VERSION line not found');
  fs.writeFileSync(path.join(dir, 'sw.js'), sw);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace('<head>', `<head><meta name="test-build" content="${version}">`);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'build-info.json'),
    JSON.stringify({ version, builtAt: '2026-01-01T00:00:00Z', ref: 'main' }));
}

function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    // What GitHub Pages sends, which is what makes the HTTP cache matter.
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                         'Cache-Control': 'max-age=600' });
    res.end(fs.readFileSync(file));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function until(page, fn, ms) {
  const end = Date.now() + (ms || 15000);
  while (Date.now() < end) {
    if (await page.evaluate(fn).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
}

const build = page => page.evaluate(() => {
  const m = document.querySelector('meta[name="test-build"]');
  return m ? m.content : null;
});
const barOn = () => document.getElementById('updateBar').classList.contains('on');
const controlled = () => !!navigator.serviceWorker.controller;
const waiting = () => navigator.serviceWorker.getRegistration().then(r => !!(r && r.waiting));

module.exports = {
  name: 'pwa',
  title: 'PWA · an installed game finds the newest build',
  async run(t) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eigen-pwa-'));
    const dir = path.join(tmp, 'linear-algebra-game');
    fs.mkdirSync(dir);
    for (const f of ['manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
    fs.cpSync(path.join(ROOT, 'icons'), path.join(dir, 'icons'), { recursive: true });
    deploy(dir, 'A');
    const server = await serve(tmp);
    const base = `http://127.0.0.1:${server.address().port}/linear-algebra-game/`;
    const ctx = await t.page.context().browser().newContext();
    const errors = [];
    const open = async () => {
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(base);
      await p.waitForFunction(() => typeof Game !== 'undefined' && typeof Keep !== 'undefined');
      return p;
    };
    try {
      // --- a first visit installs build A and is controlled by it ---
      let page = await open();
      t.ok('the first visit is taken over by the worker',
        await until(page, controlled), 'no controller after the first visit');
      t.eq('and shows build A', await build(page), 'A');
      t.ok('a first install offers no update', !(await until(page, barOn, 1500)));

      // --- B is deployed; the next visit finds it and says so ---
      deploy(dir, 'B');
      await page.reload();
      t.ok('a visit after a deploy is told a new version is ready',
        await until(page, barOn), 'no update bar after B was deployed');
      t.eq('and is still showing A until it agrees', await build(page), 'A');

      // --- Later, then leave: B is waiting, and nothing will announce it ---
      // A second copy of the game stays open throughout, as a second tab or a
      // home-screen app the system has kept alive would. With no copy open at
      // all the browser would simply start B next time; it is the copy that
      // stays open that keeps B waiting, and that is the player who got stuck.
      const other = await open();
      await page.evaluate(() => document.getElementById('updNo').click());
      t.ok('Later puts the bar away', !(await page.evaluate(barOn)));
      t.ok('leaving B installed and waiting', await page.evaluate(waiting));
      await page.close();
      page = await open();
      t.eq('a new visit is still served A while B waits', await build(page), 'A');
      t.ok('coming back to a waiting build offers it again',
        await until(page, barOn, 8000), 'a player who tapped Later is never told again');

      // --- Reload lands on B, and B is B all the way through ---
      const nav = page.waitForNavigation({ timeout: 15000 }).catch(() => null);
      await page.evaluate(() => document.getElementById('updGo').click());
      await nav;
      await page.waitForFunction(() => typeof Game !== 'undefined');
      await other.close();
      t.eq('Reload lands on build B', await build(page), 'B');
      t.eq('the build stamp says B', await page.evaluate(() =>
        fetch('build-info.json').then(r => r.json()).then(j => j.version)), 'B');
      const keys = await page.evaluate(() => caches.keys());
      t.eq('and only B is cached: the old build was swept up', keys.sort(), ['eigenrealm-B']);
      // Served from the worker's cache alone, the game is still B. This is the
      // copy an offline player gets, and what a plain fetch could have filled
      // from the HTTP cache with A.
      const cached = await page.evaluate(() =>
        caches.open('eigenrealm-B').then(c => Promise.all(['./', './index.html'].map(u =>
          c.match(u).then(r => r ? r.text() : '')))).then(ts => ts.map(x => (x.match(/test-build" content="(\w+)"/) || [])[1] || null)));
      t.eq('the cached game is B, not an HTTP-cached A', cached, ['B', 'B']);
      // Right after an update the old version's cache can outlive the reload
      // for a moment. Whatever it holds must never answer for the new build.
      fs.writeFileSync(path.join(dir, 'probe.txt'), 'fresh');
      const probe = await page.evaluate(() =>
        caches.open('eigenrealm-A').then(c => c.put('probe.txt', new Response('stale')))
          .then(() => fetch('probe.txt')).then(r => r.text())
          .finally(() => caches.delete('eigenrealm-A')));
      t.eq("an old version's leftover cache never answers for the new build", probe, 'fresh');

      // --- a game left open is told about C when it comes back into view ---
      deploy(dir, 'C');
      // Count the checks the game asks for, so coming into view is seen to
      // ask for one rather than the browser happening to look by itself.
      await page.evaluate(() => {
        window.__updates = 0;
        const real = ServiceWorkerRegistration.prototype.update;
        ServiceWorkerRegistration.prototype.update = function () { window.__updates++; return real.call(this); };
      });
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      t.eq('coming back into view looks for a new build', await page.evaluate(() => window.__updates), 1);
      t.ok('and is offered C', await until(page, barOn, 10000),
        'a home-screen game never checks for a new build');
      await page.close();

      t.ok('the served game raised no errors', errors.length === 0, errors.join(' | '));
    } finally {
      await ctx.close();
      server.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
};
