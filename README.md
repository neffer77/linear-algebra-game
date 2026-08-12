# ⚔️ Knights of the Eigenrealm

A turn-based knight battler where the combat system *is* linear algebra and calculus.
Solve a riddle, your knight strikes. Miss it, and the blow lands on you — along with an
explanation of what you should have done.

Pure vanilla JavaScript in a single file. No build step, no dependencies, no network.
Runs in any browser and as an offline iOS **Scriptable** script.

---

## Play it

### In a browser
Open `index.html`. That's the whole thing.

To play from your phone's browser over your network:

```bash
npx http-server . -p 8080     # then visit http://<your-ip>:8080
```

### On iOS (Scriptable)

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) from the App Store.
2. Copy the entire contents of `scriptable/KnightsOfTheEigenrealm.js`.
3. In Scriptable, tap **+**, paste, and name it *Knights of the Eigenrealm*.
4. Tap **▶** to play.

The game is embedded inside that file, so it runs fully offline. Progress is written to
Scriptable's local storage when you close the view, so it survives app restarts.

**One-tap launch from the home screen:** open the Shortcuts app → new shortcut → add the
*Run Script* action → pick this script → then *Add to Home Screen*.

If you edit `index.html`, regenerate the iOS file with:

```bash
node build-scriptable.js
```

---

## How the game works

Everything is clicking. The only typing you will ever do is your own name, and the game
doesn't even ask for that.

**Combat.** Each turn presents one problem with four tappable answers.

| Outcome | Effect |
|---|---|
| Correct | Your knight lunges and strikes. Damage = weapon × speed × combo × crit. |
| Wrong | The foe strikes you, and the correct method is explained before you continue. |

- **Speed bonus** — answer under 7s for ×1.5, under 14s for ×1.2. There is no penalty for
  being slow, so thinking is never punished.
- **Combo** — each consecutive correct answer adds +15% damage, up to ×2.05. One mistake
  resets it.
- **Crit** — scales with your weapon and grows as your streak builds.
- **Wind-up** — the foe also fights on its own clock. A meter beside its name fills each
  turn, and when it flashes ⚡ the next blow lands *regardless of your answer*. Answering
  correctly braces it down to about a third; armour subtracts from what's left. This is
  why gear, draughts and gold matter even to a player who never misses.

**Misconception feedback.** The four choices are not padding — each wrong one is built
from a specific, common error. Pick the entrywise product on a matrix multiplication and
the game says so by name, then explains the row-times-column rule. Roughly 78% of wrong
answers carry a diagnosis of the exact mistake behind them.

**It adapts to you.** The game keeps a mastery score per topic and uses it to decide what
to ask next, so weak and overdue topics come back more often and solid ones step aside. In
a measured run, the topic a player kept missing drew **3.8× the airtime** of a mastered
one. Difficulty follows the same signal: a topic you are failing is asked at the easiest
tier, one you have mastered at the hardest. When a weak topic is deliberately brought back
it is marked ⟳ review, so the targeting is visible rather than mysterious.

**Progression.** Beating a foe earns gold and XP, and often loot. Levelling raises your
maximum health and heals you fully. Clearing a realm's boss unlocks the next realm.

**Gear** — 7 weapons and 6 armour sets, bought at the Smithy and equipped from the Gear
screen. Armour adds both flat damage reduction and maximum health.

**Relics** (usable mid-fight, one tap):

| Relic | Effect |
|---|---|
| 🧪 Healing Draught | Restores 45% of max health |
| 🔮 Sage's Insight | Burns away two wrong answers |
| 🔥 Berserker Rune | Next correct strike deals 2.5× damage |
| 🪶 Phoenix Feather | Automatically revives you once at half health |

**Losing** costs 15% of your gold and nothing else. You keep every item, level, and piece
of gear. Death is a speed bump, not a wall.

**Game feel.** Hits land with a freeze-frame, a camera punch and a screen flash; the
killing blow adds slow-motion and a shower of coins. Health bars leave a white trail
showing the wound you just took. The tone that plays on a correct answer climbs a semitone
per consecutive hit, so a hot streak literally rises in pitch, and streaks of 3 / 5 / 8 /
12 / 16 / 25 fire escalating callouts. Rewards roll up rather than appearing. Every one of
these can be turned off — see Settings.

**🏟️ The Arena** opens once the Eigen Dragon falls. Endless waves drawn from *every* topic
in the game, scaling until they kill you. There is no free healing between waves — only a
poultice after each fifth-wave champion — so a run is a war of attrition. Every third wave
you draft one of three run-scoped boons (more health, damage, defence, crit, supplies, a
slower enemy wind-up, richer purses). You keep every coin you earn whether you retire on
your own terms or are carried out, and your deepest wave is recorded.

Because your damage is roughly fixed and the foes' is not, how deep you get is mostly a
measure of your accuracy rather than your gear:

| Run | Median wave reached |
|---|---|
| Campaign gear, 75% accuracy | 8 |
| Campaign gear, 90% accuracy | 12 |
| Campaign gear, 100% accuracy | 20 |
| Best gear, 100% accuracy | 25 |

---

## The five realms

Each realm draws its problems from its own topic pool, and difficulty scales with how deep
into the realm you are. Bosses occasionally reach back into earlier realms, so nothing
stays forgotten.

| Realm | What it teaches |
|---|---|
| 🟢 **Vale of Vectors** | Vector addition, scalar multiplication, linear combinations, dot product, magnitude, orthogonality |
| 🔵 **Matrix Marches** | Matrix × vector, 2×2 determinants, transpose, matrix multiplication, trace, linear systems |
| 🟡 **Cliffs of Change** | Limits by substitution, 0/0 limits, limits at infinity, power rule, derivatives at a point, trig derivatives, tangent lines, product rule |
| 🟣 **Integral Abyss** | Indefinite and definite integrals, u-substitution, integrating trig and eˣ, area under curves, chain rule, quotient rule |
| 🔴 **Eigen Citadel** | Matrix inverses, 3×3 determinants, cross products, linear independence, eigenvalues, projections, second derivatives, critical points, partial derivatives |

**38 problem generators** in total, each producing randomised problems at three difficulty
levels — so you cannot memorise your way through.

---

## The teaching parts

The game is built so that losing teaches you as much as winning.

- **Every answer, right or wrong, comes with a worked explanation** in plain language —
  the actual arithmetic of that specific problem, not a generic rule restated.
- **Wrong answers are diagnosed, not just corrected** — the game names the misconception
  your specific choice came from before explaining the right method.
- **📖 Tome of Lore** — nine short pages covering the conceptual spine of both subjects,
  ending with how gradients tie them together.
- **🎯 Training Grounds** — practise any single topic with no combat, no damage, and no
  gold. Two adaptive drills sit at the top: **Drill my weakest** pulls from your six worst
  topics, and **Review what's due** pulls whatever the spaced-repetition schedule says has
  gone stale. Neither requires you to know what you're bad at.
- **📜 Chronicle** (on the Gear screen) — per-topic mastery bars, weakest first, labelled
  weak / shaky / steady / solid, with a running count of what needs work and what is due.
- **The loudest celebration in the game is for learning, not looting.** When a topic
  crosses into mastery you get a full-screen MASTERED callout and a fanfare — the same
  treatment a level-up gets. It fires once per topic, and can be lost and re-earned if
  your accuracy on it falls away.
- **Titles** — twelve milestones, most tied to understanding rather than grinding
  (*Polymath* for ten topics mastered, *Grand Magister* for all 38), plus a daily practice
  streak, because spaced practice is how this material actually sticks.

---

## Settings and accessibility

Reachable from the title screen and the map (⚙️).

| Setting | Effect |
|---|---|
| 🔊 Sound | All synthesised audio. Off by default is never assumed — it respects your choice. |
| ✨ Full motion | Screen shake, hit-stop, camera punch, slow-motion and particle volume. Turning it off keeps the game fully playable and legible; it defaults to off if your OS asks for reduced motion. |
| 📳 Haptics | Vibration on hits and rewards, where the device supports it. |

Verified free of horizontal overflow and undersized tap targets at 320×568, 375×667,
390×844, 414×896, 768×1024 and 844×390 (landscape).

---

## Project layout

```
index.html                             the entire game — open this to play
build-scriptable.js                    packages index.html into the iOS script
scriptable/KnightsOfTheEigenrealm.js   generated; paste into Scriptable
```

Inside `index.html` the code is organised as:

| Section | Role |
|---|---|
| `GEN` | the 38 problem generators; each returns a question, answer, explanation, and distractors tagged with the mistake they represent |
| `REALMS`, `WEAPONS`, `ARMORS`, `ITEMS`, `TOME` | all game content, as plain data |
| `Mastery` | per-topic mastery model, spaced-repetition schedule, and weighted topic selection |
| `Arena`, `BOONS` | endless mode: wave scaling, generated foes, and the run-scoped boon draft |
| `Game` | state, saving to `localStorage`, save migration, levelling |
| `Anim` | the canvas render loop: knights, foes, lunges, particles, damage numbers, screen shake |
| `Battle` | turn flow, damage maths, victory and defeat; shared by campaign and arena via `mode` |
| `UI`, `Shop`, `Train` | screens |
| `Sfx` | WebAudio synthesis — impacts, streak tones, fanfares; no audio files |
| `Prefs`, `Haptic`, `Celebrate` | sound/motion/haptic preferences, vibration, and the single funnel every full-screen callout goes through |
| `TITLES`, `Titles` | milestone definitions and award checks |

All artwork is drawn procedurally on a `<canvas>`: the knight, ten enemy types, six
skylines, weather, torches and a twinkling sky. There are no image assets to load.

Sprites are drawn twice — once flat and dark at four offsets to lay down an outline, then
normally on top — over gradient fills, radial highlights and a contact shadow that spreads
as a sprite rises. Each realm owns a skyline, a ground tint and a weather system:
fireflies in the Vale, rain over the Marches, rising embers on the Cliffs, falling ash in
the Abyss, snow on the Citadel and gold dust in the Arena. The two silhouette layers are
painted once into offscreen canvases and blitted with parallax, so the per-frame cost is
two draw calls rather than a few hundred paths. Measured at 61 fps with weather and
outlines running; particle systems drop to zero under reduced motion.

### Adding a topic

Add a generator to `GEN` returning `{topic, q, a, d, ex}` — where `q` and the choices may
contain HTML (helpers `mat()`, `vec()`, `poly()`, `frac()`, `sup()` are provided) — then
add its key to `TOPIC_LABEL`, to a realm's `pool`, and to a group in `Train.renderPick`.

Entries in `d` are either a bare string or `[text, "the mistake it represents"]`. Prefer
the tagged form: it is what lets the game tell a player *what they did wrong* rather than
only what the answer was. Reserve bare strings for filler with no teachable error behind
it, such as an off-by-a-few arithmetic slip.

---

## Correctness

The mathematics is verified rather than assumed. The generators were checked by:

- **57,000 generated problems** across all 38 generators at every difficulty, asserting
  four unique choices, the answer present among them, and no malformed output.
- **21,000 matrix identities** — rendered matrices parsed back out of the HTML and
  recomputed independently, including `A · adj(A) = det(A) · I` for the inverse.
- **Layout at six viewports** from a 320px iPhone SE to a 768px iPad and 844×390 landscape,
  asserting no horizontal overflow, no tap target under 32px, and that the largest
  full-screen callouts still fit — including at the peak of their overshooting pop
  animation, which is where they first broke.
- **Arena pacing**, simulated over 300 runs per scenario to confirm that runs reliably end,
  that accuracy dominates gear in how deep you get, and that the boon draft keeps a
  well-played run growing rather than stalling.
- **The adaptive scheduler**, simulated over thousands of questions against a synthetic
  learner with known per-topic skill: weak topics drew 3.8× the airtime of mastered ones,
  the mastery model tracked true skill to within 5% mean error, mastered topics still
  resurfaced rather than starving, and back-to-back repeats stayed near 2%.
- **21,000 calculus checks** — derivatives against centred finite differences, definite
  integrals against Simpson's rule, and limits against numeric evaluation.
