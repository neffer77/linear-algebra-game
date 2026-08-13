# ⚔️ Knights of the Eigenrealm

A turn-based knight battler where the combat system *is* linear algebra and calculus.
Solve a riddle, your knight strikes. Miss it, and the blow lands on you — along with an
explanation of what you should have done.

Pure vanilla JavaScript in a single file. No build step, no dependencies, no network.
Runs in any browser and as an offline iOS **Scriptable** script.

---

## Play it

### In a browser
Play it live at **https://neffer77.github.io/linear-algebra-game/** — or open `index.html`
locally. That's the whole thing.

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
- **📖 Tome of Lore** — nine short pages covering the conceptual spine of both subjects,
  ending with how gradients tie them together.
- **🎯 Training Grounds** — practise any single topic with no combat, no damage, and no
  gold. Just repetitions and explanations.
- **📜 Chronicle** (on the Gear screen) — per-topic accuracy bars showing exactly where you
  are strong and where you bleed.

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
| `GEN` | the 38 problem generators; each returns a question, answer, distractors, and explanation |
| `REALMS`, `WEAPONS`, `ARMORS`, `ITEMS`, `TOME` | all game content, as plain data |
| `Game` | state, saving to `localStorage`, levelling |
| `Anim` | the canvas render loop: knights, foes, lunges, particles, damage numbers, screen shake |
| `Battle` | turn flow, damage maths, victory and defeat |
| `UI`, `Shop`, `Train` | screens |
| `Sfx` | WebAudio blips, synthesised — no audio files |

All artwork is drawn procedurally on a `<canvas>`: the knight, seven enemy types, torches,
towers, and a twinkling sky. There are no image assets to load.

### Adding a topic

Add a generator to `GEN` returning `{topic, q, a, d, ex}` — where `q` and the choices may
contain HTML (helpers `mat()`, `vec()`, `poly()`, `frac()`, `sup()` are provided) — then
add its key to `TOPIC_LABEL`, to a realm's `pool`, and to a group in `Train.renderPick`.

---

## Correctness

The mathematics is verified rather than assumed. The generators were checked by:

- **57,000 generated problems** across all 38 generators at every difficulty, asserting
  four unique choices, the answer present among them, and no malformed output.
- **21,000 matrix identities** — rendered matrices parsed back out of the HTML and
  recomputed independently, including `A · adj(A) = det(A) · I` for the inverse.
- **21,000 calculus checks** — derivatives against centred finite differences, definite
  integrals against Simpson's rule, and limits against numeric evaluation.

---

## Deployment

Every push to `main` publishes to https://neffer77.github.io/linear-algebra-game/ via
`.github/workflows/pages.yml`, which runs `validate → build → deploy`:

- **validate** — syntax-checks JavaScript, confirms `index.html` has no missing local
  asset references, and regenerates `scriptable/KnightsOfTheEigenrealm.js` to verify the
  committed copy is not stale. A commit that fails any of these never reaches the site.
- **build** — stages `index.html`, `README.md`, and `scriptable/` into the published
  artifact, plus `.nojekyll` and a `build-info.json` stamped with the commit SHA.
- **deploy** — publishes the artifact to GitHub Pages.

Because the Scriptable file is generated, the sync check is what keeps the iOS build from
silently falling behind `index.html` when someone forgets to run `node build-scriptable.js`.
