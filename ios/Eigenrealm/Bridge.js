/* Runs before the game, and only inside the iOS app.
 *
 * The game is written for a browser and does not know it is inside an app.
 * This teaches three browser APIs to reach the app instead, so index.html
 * needs no changes at all and the web version is untouched:
 *
 *   navigator.vibrate     Safari on iPhone has none, so the game's Haptic
 *                         module does nothing there. The app has a Taptic
 *                         Engine; the pattern is passed across as-is and the
 *                         app plays each "on" pulse as an impact.
 *   navigator.clipboard   May be missing on a custom URL scheme. Copying the
 *                         knight code is how a save moves between devices, and
 *                         the game guards that call with an `if` — so without
 *                         this it would fail silently. The app's pasteboard
 *                         cannot.
 *   navigator.standalone  The app IS installed. Saying so means the game never
 *                         suggests adding itself to the Home Screen.
 *
 * Everything is defined on the navigator instance rather than its prototype:
 * an own property shadows whatever the engine provides, whether or not the
 * engine's own property can be redefined.
 *
 * Outside the app there is no window.webkit.messageHandlers and this does
 * nothing, which is also what lets it be tested in an ordinary browser.
 */
(function () {
  'use strict';
  var handlers = window.webkit && window.webkit.messageHandlers;
  if (!handlers) return;

  function own(name, descriptor) {
    try {
      descriptor.configurable = true;
      Object.defineProperty(navigator, name, descriptor);
    } catch (e) { /* leave the engine's own property in place */ }
  }

  own('standalone', { get: function () { return true; } });

  if (handlers.haptic) {
    own('vibrate', {
      writable: true,
      value: function vibrate(pattern) {
        // navigator.vibrate takes a number or a list of alternating on/off
        // durations in milliseconds. Normalised here so the app only ever
        // sees a short list of sane numbers.
        var list = Array.isArray(pattern) ? pattern : [pattern];
        var clean = [];
        for (var i = 0; i < list.length && i < 32; i++) {
          var n = Number(list[i]);
          clean.push(isFinite(n) && n > 0 ? Math.min(n, 5000) : 0);
        }
        try { handlers.haptic.postMessage(clean); } catch (e) { return false; }
        return true;
      }
    });
  }

  if (handlers.clipboard) {
    var clipboard = {
      writeText: function (text) {
        try {
          handlers.clipboard.postMessage(String(text));
          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      }
    };
    own('clipboard', { get: function () { return clipboard; } });
  }
})();
