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

- **Speed bonus** — the window scales with difficulty (8s / 12s / 16s for ×1.5), so working
  a hard problem through carefully still earns it. There is no penalty for being slow, and
  nothing on screen counts down while a question is unanswered — the moment that needs
  concentration is the one moment nothing is moving.
- **Combo** — each consecutive correct answer adds +15% damage, up to ×2.05. One mistake
  resets it.
- **Crit** — scales with your weapon and grows as your streak builds.
- **Wind-up** — the foe also fights on its own clock. A meter beside its name fills each
  turn, and when it flashes ⚡ the next blow lands *regardless of your answer*. Answering
  correctly braces it down to about a third; armour subtracts from what's left. This is
  why gear, draughts and gold matter even to a player who never misses.

**⛓️ Rites.** A topic that is genuinely complex does not arrive as one hard question. It
arrives as a ladder of five-second steps — *pick u · find du · rewrite · integrate* — each
its own tap with its own small hit and rising tone, ending in one scaled finisher. Four
fast wins read better than one hard question, and they happen to be how procedure is
actually learnt. A clean ladder deals **5.8× weapon damage** against **3.6×** for a single
correct answer, so taking the long way is rewarded rather than taxed. The foe still acts
once per ladder, on the finisher.

**Scaffolding fades into damage.** Clear a topic's ladder three times at high mastery and
the game stops offering the ladder and hands you the whole problem instead — marked
*unassisted ×2*. The support disappears because you chose the bigger reward, not because a
difficulty setting moved. Ladder steps move mastery by a *fraction* of a full answer, so
being walked through something never convinces the scheduler you have mastered it.

**📖 The Codex.** Every complex topic carries a card: the rule in a sentence and a worked
scrap. A `?` sits beside the topic name — free to peek while a topic is still new to you,
and after that it costs your combo. Get one wrong and the rule appears in the explanation
alongside the diagnosis.

**⚔ Perfect Strike.** Where an answer is a plain number you can decline the four choices and
build it on a keypad instead, for **×3 damage**, with a miss costing the combo. Generation
rather than recognition, offered as a risk you may take rather than a friction everyone
pays.

**Misconception feedback.** The four choices are not padding — each wrong one is built
from a specific, common error. Pick the entrywise product on a matrix multiplication and
the game says so by name, then explains the row-times-column rule. Roughly 87% of wrong
answers carry a diagnosis of the exact mistake behind them.

**It adapts to you.** The game keeps a mastery score per topic and uses it to decide what
to ask next, so weak and overdue topics come back more often and solid ones step aside. In
a measured run, the topic a player kept missing drew **3.8× the airtime** of a mastered
one. Difficulty follows the same signal: a topic you are failing is asked at the easiest
tier, one you have mastered at the hardest. When a weak topic is deliberately brought back
it is marked ⟳ review, so the targeting is visible rather than mysterious.

**Progression.** Beating a foe earns gold and XP, and often loot. Levelling raises your
maximum health and heals you fully. Clearing a realm's boss unlocks the next realm.

**Loot** rolls a rarity — common through legendary — and opens as a chest that shakes,
bursts in the rarity's colour and sweeps a card in. Rare tiers and above hand over
*gear*, which until now could only ever be bought, so the Smithy is no longer the only
source of upgrades. A boss never drops common.

**Bounties.** Three rotating goals sit on the map — solve twenty riddles, land six crits,
win a fight without a single miss — each paying gold and rolling a replacement the moment
it completes. Beside them, the next unlock you are saving toward and how close you are.

**🗡️ Daily Skirmish.** Twelve riddles drawn from a seed derived from the date, so the run
is *identical on every device that day* — it deliberately ignores your mastery model,
which would otherwise personalise the questions and make the score meaningless. No health,
no death; the only thing at stake is the number. Best of the day and all-time are kept.

**Near death.** Below a third health a red vignette pulses at heartbeat tempo and a low
thump plays on each new question. Below a sixth, it quickens.

**Gear** — 9 weapons and 8 armour sets, bought at the Smithy and equipped from the Gear
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

## The seven realms

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
| 🩵 **Spectral Reach** | Characteristic polynomials, eigenvectors, diagonalisability, matrix powers, null space, rank–nullity, column space, Gram–Schmidt, vector projection, unit vectors, angles between vectors, transformation matrices |
| 🔷 **Infinite Expanse** | L'Hôpital's rule, implicit differentiation, related rates, optimisation, inflection points, inverse-trig derivatives, logarithmic differentiation, integration by parts, partial fractions, improper integrals, average value, volumes of revolution, Riemann sums |

**63 problem generators** in total, each producing randomised problems at three difficulty
levels — so you cannot memorise your way through. Every realm's difficulty curve is
simulated rather than guessed: see *Correctness* below.

---

## The teaching parts

The game is built so that losing teaches you as much as winning.

- **Every answer, right or wrong, comes with a worked explanation** in plain language —
  the actual arithmetic of that specific problem, not a generic rule restated.
- **Wrong answers are diagnosed, not just corrected** — the game names the misconception
  your specific choice came from before explaining the right method.
- **Figures you can read at a glance** — nineteen topics carry a drawn diagram beside the
  question, and a second one beside the explanation. The split is deliberate: the question
  figure is a *prompt*, never a solution. Vector addition draws **u** and **v** and stops
  there; the parallelogram and the resultant only appear once you have answered. A
  determinant question draws nothing, and then shows you the unit square turned into the
  parallelogram whose area is the answer. Six kinds cover it — the plane, a transformed
  grid, a curve, a shaded region, Riemann bars, and a number line with a hole in it.
- **📖 Tome of Lore** — twelve short pages covering the conceptual spine of both subjects,
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
  (*Polymath* for ten topics mastered, *Grand Magister* for all 63), plus a daily practice
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
| `GEN` | the 63 problem generators; each returns a question, answer, explanation, and distractors tagged with the mistake they represent |
| `REALMS`, `WEAPONS`, `ARMORS`, `ITEMS`, `TOME` | all game content, as plain data |
| `Mastery` | per-topic mastery model, spaced-repetition schedule, and weighted topic selection |
| `Figure` | the six diagram kinds; a generator declares `fig` and/or `figAnswer` as plain data |
| `Arena`, `BOONS` | endless mode: wave scaling, generated foes, and the run-scoped boon draft |
| `Game` | state, saving to `localStorage`, save migration, levelling |
| `Anim` | the canvas render loop: knights, foes, lunges, particles, damage numbers, screen shake |
| `Battle` | turn flow, damage maths, victory and defeat; shared by campaign and arena via `mode` |
| `UI`, `Shop`, `Train` | screens |
| `Sfx` | WebAudio synthesis — impacts, streak tones, fanfares; no audio files |
| `Prefs`, `Haptic`, `Celebrate` | sound/motion/haptic preferences, vibration, and the single funnel every full-screen callout goes through |
| `TITLES`, `Titles` | milestone definitions and award checks |

The interface is heraldic rather than generic: panel titles are pennants with a
swallowtail notch, dividers are gold hairlines broken for a lozenge, buttons read as cast
metal, and the question card is framed with gold corner brackets. Headings are set in a
system serif with a gold-leaf gradient — no webfont is inlined, which keeps the Scriptable
file paste-able and sidesteps font licensing entirely. Changing screens sweeps a
sword-glint across, suppressed under reduced motion.

All artwork is drawn procedurally on a `<canvas>`: the knight, ten enemy types, eight
skylines, weather, torches and a twinkling sky. There are no image assets to load.

Sprites are drawn twice — once flat and dark at four offsets to lay down an outline, then
normally on top — over gradient fills, radial highlights and a contact shadow that spreads
as a sprite rises. Each realm owns a skyline, a ground tint and a weather system:
fireflies in the Vale, rain over the Marches, rising embers on the Cliffs, falling ash in
the Abyss, snow on the Citadel, rising shards in the Reach, drifting motes in the Expanse
and gold dust in the Arena. The two silhouette layers are
painted once into offscreen canvases and blitted with parallax, so the per-frame cost is
two draw calls rather than a few hundred paths. Measured at 61 fps with weather and
outlines running; particle systems drop to zero under reduced motion.

### Adding a topic

Add a generator to `GEN` returning `{topic, q, a, d, ex}` — where `q` and the choices may
contain HTML (helpers `mat()`, `vec()`, `poly()`, `frac()`, `sup()` are provided) — then
add its key to `TOPIC_LABEL`, to a realm's `pool`, and to a group in `Train.renderPick`.

To give it a diagram, add `fig` (drawn beside the question) and/or `figAnswer` (drawn with
the explanation) — plain serialisable data, e.g.
`{kind:'plane', vecs:[{v:[3,1], col:'#5aa9e6', label:'u'}], caption:'…'}`. Figures are
painted once into a static canvas and never join the battle's animation loop. The one rule
the harness enforces is that a question figure may not carry a reveal flag (`para`, `proj`,
`tangent`, `legs`, `right`, `sum`) nor draw the answer vector — the payoff picture belongs
in `figAnswer`.

Entries in `d` are either a bare string or `[text, "the mistake it represents"]`. Prefer
the tagged form: it is what lets the game tell a player *what they did wrong* rather than
only what the answer was. Reserve bare strings for filler with no teachable error behind
it, such as an off-by-a-few arithmetic slip.

---

## Correctness

The mathematics is verified rather than assumed, and the harness ships with the game:

```bash
npm test            # every check
npm run test:quick  # fewer repetitions
```

`tools/mathexpr.js` compiles the game's *display HTML* — nested fraction spans, `<sup>`
powers, unicode superscripts, U+2212 minus — back into evaluable expressions, which is
what lets an answer be checked numerically at all. `tools/verify.js` runs three layers:
structure (four unique choices, answer present, misconceptions substantial), algebra
(matrices parsed back out of the rendered HTML and recomputed, including
`A · adj(A) = det(A) · I`), and analysis (derivatives against finite differences,
integrals differentiated back to their integrand so the `+ C` cancels, definite integrals
against Simpson's rule, limits by direct evaluation).

**51 of 63 generators are independently verified against the mathematics**, up from 8 when
the harness could only parse polynomials. Every one of the 25 topics added with Spectral
Reach and Infinite Expanse is in that number, and each is checked against the mathematics
rather than against the formula that produced it: an eigenvector is fed back through its
own matrix, a rank is recomputed by elimination, an optimum is found by dense sampling, an
implicit derivative is compared against the slope of the curve itself, and a Riemann sum is
summed for 200,000 terms and matched to the integral the answer claims. The remaining
twelve have answers that are not scalar expressions — yes/no judgements, sets of roots,
prose — and the harness now names them in its report rather than leaving the gap to
arithmetic. Mote ladders are checked the same way, on the choices a player is actually
shown rather than the authored list — 42,000 rendered steps per run.

The generators were also checked by:

- **75,000 generated problems** across all 63 generators at every difficulty, asserting
  four unique choices, the answer present among them, and no malformed output.
- **27,000 matrix identities** — rendered matrices parsed back out of the HTML and
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
- **36,000 calculus checks** — derivatives against centred finite differences, definite
  integrals against Simpson's rule, and limits against numeric evaluation.
- **Every realm's difficulty curve**, simulated by running the real combat code with a
  player of known accuracy and the gear that realm's gold could actually have bought, 40
  runs per cell. Across all seven realms perfect play always clears, 60% accuracy usually
  does not, and accuracy beats gear everywhere. The simulation is also what found that the
  Integral Abyss had been *easier* than the Cliffs before it — an inversion that predated
  these realms and is now flattened.
- **37,200 figure specs**, checked for a known kind, the fields that kind cannot draw
  without, a domain the function is actually defined over, and — for question figures —
  that they do not give the answer away. That last check earned its keep immediately: it
  found that scalar multiplication could roll a scalar of 1, asking "1 · v = ?" over a
  picture of v, and that a linear combination could land back on one of its own inputs.
- **1,116 figures rendered in a headless browser at 320px**, asserting every one carries
  real ink rather than an empty frame, that none overflows its column, and that a full
  28-node campaign holds steady at one battle canvas with at most two figures alive —
  no leaked canvases.
