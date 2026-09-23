/* The iOS app's bridge, checked against the real game.
 *
 * The app is a WKWebView around index.html, plus ios/Eigenrealm/Bridge.js
 * injected before the game runs. Bridge.js teaches three browser APIs to reach
 * native code instead — navigator.vibrate, navigator.clipboard and
 * navigator.standalone — so the game needs no changes to live in an app.
 *
 * The Swift half can only be compiled on a Mac, and CI does that (see
 * .github/workflows/ios.yml). This half is JavaScript, and it is tested here,
 * on every push, against the game as it actually is. That matters more than
 * it sounds: the bridge is only useful while the game keeps calling the APIs
 * it bridges. If the game's Haptic module stopped using navigator.vibrate, the
 * app would go quiet and nothing in the app's own build would notice. This
 * suite would.
 *
 * WebKit's message handlers are stood in for by a recorder, installed before
 * the page's own scripts exactly as the app installs the real ones.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BRIDGE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'ios', 'Eigenrealm', 'Bridge.js'), 'utf8');

module.exports = {
  name: 'ios',
  title: 'iOS · the game reaches the phone',
  async run(t) {
    // --- outside the app, the bridge must change nothing at all ---
    const outside = await t.ev(src => {
      const before = {
        vibrate: navigator.vibrate,
        standalone: navigator.standalone,
        clipboard: navigator.clipboard
      };
      (0, eval)(src);
      return {
        vibrateSame: navigator.vibrate === before.vibrate,
        standaloneSame: navigator.standalone === before.standalone,
        clipboardSame: navigator.clipboard === before.clipboard,
        installed: Keep.installed()
      };
    }, BRIDGE);
    t.ok('in an ordinary browser the bridge leaves vibrate alone', outside.vibrateSame);
    t.ok('and standalone', outside.standaloneSame);
    t.ok('and the clipboard', outside.clipboardSame);
    t.ok('so the web version still knows it is not installed', !outside.installed);

    // --- inside the app: the same page, with WebKit's handlers present ---
    await t.page.addInitScript(() => {
      window.__sent = [];
      const post = name => ({ postMessage: m => window.__sent.push({ name, m }) });
      window.webkit = { messageHandlers: { haptic: post('haptic'), clipboard: post('clipboard') } };
    });
    await t.page.addInitScript(BRIDGE);
    await t.reload();
    await t.newKnight('Pocket');

    const inside = await t.ev(() => ({
      standalone: navigator.standalone,
      installed: Keep.installed(),
      ownVibrate: Object.prototype.hasOwnProperty.call(navigator, 'vibrate'),
      ownClipboard: Object.prototype.hasOwnProperty.call(navigator, 'clipboard')
    }));
    t.eq('inside the app the game is told it is installed', inside.standalone, true);
    t.ok('and believes it, so it never asks to be added to the Home Screen', inside.installed);
    t.ok('vibrate is the bridge, not the engine', inside.ownVibrate);
    t.ok('and so is the clipboard', inside.ownClipboard);

    // --- the game's own haptics reach the app, pattern intact ---
    const haptics = await t.ev(() => {
      const out = {};
      Prefs.d.haptics = true;
      window.__sent.length = 0;
      Haptic.tap(); Haptic.hit(); Haptic.crit(); Haptic.hurt(); Haptic.win();
      out.sent = window.__sent.filter(s => s.name === 'haptic').map(s => s.m);
      // The player's own preference still wins: the bridge must not bypass it.
      Prefs.d.haptics = false;
      window.__sent.length = 0;
      Haptic.win();
      out.whenOff = window.__sent.length;
      Prefs.d.haptics = true;
      return out;
    });
    t.eq('every haptic the game fires arrives, with its pattern', haptics.sent,
      [[12], [22], [28, 40, 55], [50, 30, 50], [30, 50, 30, 50, 90]]);
    t.eq('and none do when the player has turned haptics off', haptics.whenOff, 0);

    // --- whatever a page passes, the app only ever sees sane numbers ---
    const clean = await t.ev(() => {
      window.__sent.length = 0;
      const r = [];
      r.push(navigator.vibrate(['a', -5, Infinity, 40]));
      navigator.vibrate(99999);
      navigator.vibrate(new Array(100).fill(10));
      navigator.vibrate(0);
      const sent = window.__sent.map(s => s.m);
      return { returned: r[0], junk: sent[0], huge: sent[1], long: sent[2].length, zero: sent[3] };
    });
    t.eq('junk entries become zeroes', clean.junk, [0, 0, 0, 40]);
    t.eq('a huge duration is capped', clean.huge, [5000]);
    t.eq('and a long pattern is cut short', clean.long, 32);
    t.eq('zero is passed through, which means stop', clean.zero, [0]);
    t.eq('vibrate reports success, as the real API does', clean.returned, true);

    // --- the knight code copies through the app, via the game's own button ---
    const copy = await t.ev(async () => {
      window.__sent.length = 0;
      const id = Profiles.r.active;
      const code = Profiles.export(id);
      Knights.carry(id);
      await new Promise(r => setTimeout(r, 100));
      document.getElementById('codeCopy').click();
      await new Promise(r => setTimeout(r, 100));
      const got = window.__sent.filter(s => s.name === 'clipboard').map(s => s.m);
      const resolved = await navigator.clipboard.writeText('x').then(() => true, () => false);
      return { code, got, resolved };
    });
    t.ok('pressing Copy sends the knight code to the phone\'s clipboard',
      copy.got.length === 1 && copy.got[0] === copy.code,
      JSON.stringify(copy.got).slice(0, 80));
    t.ok('and writeText resolves, so the game never sees a failure', copy.resolved);

    // --- and the game plays normally with all of this in place ---
    const plays = await t.ev(async () => {
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Battle.begin(0, 0);
      await new Promise(r => setTimeout(r, 250));
      const before = Battle.ehp;
      Battle.answer(null, Battle.step().a);
      await new Promise(r => setTimeout(r, 250));
      return { struck: Battle.ehp < before };
    });
    t.ok('a fight still plays through with the bridge installed', plays.struck);
  }
};
