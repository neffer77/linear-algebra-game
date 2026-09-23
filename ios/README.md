# Knights of the Eigenrealm for iPhone

A native app around the game, built from this folder with Xcode and installed
straight onto your own phone. No App Store and no paid developer account:
a free Apple ID is enough.

## What you need

- A Mac with **Xcode** (free from the Mac App Store). CI builds this with
  Xcode 26; nothing in it needs newer than Xcode 15.
- Your iPhone and a cable (after the first install, Wi-Fi works too)
- An Apple ID — the one you already use is fine

## Install it

1. **Get the code** if you don't have it yet:

   ```bash
   git clone https://github.com/neffer77/linear-algebra-game.git
   ```

2. **Open** `ios/Eigenrealm.xcodeproj` in Xcode.

3. **Sign it with your Apple ID.** Click the blue *Eigenrealm* project at the
   top of the left sidebar → the *Eigenrealm* target → **Signing & Capabilities**
   → **Team** → *Add an Account…* → sign in → choose **Your Name (Personal Team)**.

   If Xcode says the bundle identifier *io.github.neffer77.eigenrealm* is
   unavailable, change it to anything unique, such as
   `io.github.neffer77.eigenrealm.yourname`.

4. **Connect your iPhone**, unlock it, and tap **Trust** when it asks. Choose
   it from the device menu in Xcode's toolbar.

5. **Turn on Developer Mode** on the iPhone: *Settings → Privacy & Security →
   Developer Mode* → on. The phone restarts. You only do this once.

6. **Press Run** (▶ or ⌘R). The app installs and appears on your Home Screen.

7. **Trust yourself, once.** The first launch is refused until the phone
   trusts your certificate: *Settings → General → VPN & Device Management* →
   your Apple ID → **Trust**. Then open the app.

That's it. It works offline, and it has its own icon and dark launch screen.

## Keeping it running

| | Free Apple ID | Paid developer account |
|---|---|---|
| The app keeps working for | **7 days** | 1 year |
| To renew | plug in, press **Run** again | same |

After seven days the app stops opening. Nothing is lost: plug the phone in and
press Run again, and it reinstalls **over the top of itself**, keeping your
knights. **Don't delete the app to fix it** — deleting it deletes its saves.

After the first install you can skip the cable: *Window → Devices and
Simulators* → your iPhone → **Connect via network**.

## Getting updates

The app does not update itself. To put the latest game on your phone:

```bash
git pull
```

then press **Run**. There is no copy of the game inside this folder to keep in
step: the *Copy the game in* build step takes `index.html` from the top of the
repository every time you build, so whatever you pulled is what you get.

## Moving your knight in

The app keeps its own saves, separate from the website in Safari. To bring a
knight across, use the game's own transfer:

1. Where the knight is now (e.g. Safari): open your knights, tap **📤 Move** on
   that knight, and copy the code (or show the QR).
2. In the app: open your knights → **📜 Bring a knight from another device** →
   paste the code.

The same works in reverse, and between two phones.

## What's different from the website

- **Haptics work.** Safari on iPhone can't vibrate, so the game's taps, hits
  and wins have always been silent there. The app plays them on the Taptic
  Engine. They still follow the game's own haptics setting.
- **Saves are the app's own**, stored like any app's data rather than as
  website data Safari may clear.
- **No automatic updates** — see above.
- The build stamp in the corner reads *build local*, because the app has no
  server to ask which version it is.

## How it works

Four files, all in `Eigenrealm/`:

| File | What it does |
|---|---|
| `EigenrealmApp.swift` | The whole app: a web view serving the game from `eigenrealm://localhost`, native dialogs, haptics, and a self-test that only CI switches on |
| `Bridge.js` | Injected before the game. Routes `navigator.vibrate`, `navigator.clipboard` and `navigator.standalone` to Swift, so `index.html` needs no changes |
| `Info.plist` | Just the launch-screen colour; everything else is generated from build settings |
| `Assets.xcassets` | The icon (drawn by `tools/make-icons.js ios`) and the launch colour |

Two of those choices exist because the game would otherwise break silently:

- The game names, renames and erases knights with `prompt()` and `confirm()`.
  A plain web view answers those with nothing and "no", so without the app's
  native dialogs you couldn't name a knight at all.
- The game is served from a custom URL scheme rather than a file, because a
  file URL is not somewhere WebKit reliably keeps `localStorage` and
  `IndexedDB` — where the knights live.

## Debugging

Debug builds (the default when you press Run) can be inspected live from the
Mac: in Safari, turn on *Settings → Advanced → Show features for web
developers*, then **Develop → your iPhone → Eigenrealm**.

## Tests

- `tools/play/ios.js` runs `Bridge.js` against the real game on every push.
- `.github/workflows/ios.yml` builds the app on a macOS runner, launches it in
  the iOS Simulator twice, and has it report on itself: the game loaded,
  storage works and persists across a relaunch, the bridge reaches Swift, and
  the dialogs are wired.
