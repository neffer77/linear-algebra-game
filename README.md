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

### On iPhone, as an app

Add it to your Home Screen from Safari (Share → **Add to Home Screen**) and it runs full
screen and offline. Or install the native app with a free Apple ID. That version adds real
haptics, which Safari on iPhone cannot do, and keeps its saves as app data. CI builds it as
an [`.ipa`](https://github.com/neffer77/linear-algebra-game/releases/download/ios-app/Eigenrealm.ipa)
on every change, for [SideStore](https://sidestore.io) to install and renew weekly on the
phone itself. You can also build it from [`ios/`](ios/README.md) with Xcode. Step-by-step
instructions for both are in [ios/README.md](ios/README.md).

### On iOS (Scriptable)

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) from the App Store.
2. Copy the entire contents of `scriptable/KnightsOfTheEigenrealm.js`.
3. In Scriptable, tap **+**, paste, and name it *Knights of the Eigenrealm*.
4. Tap **▶** to play.

The game is embedded inside that file, so it runs fully offline. Progress — every knight on
the device — is written to Scriptable's local storage when you close the view, so it
survives app restarts.

**One-tap launch from the home screen:** open the Shortcuts app → new shortcut → add the
*Run Script* action → pick this script → then *Add to Home Screen*.

If you edit `index.html`, regenerate the iOS file with:

```bash
node build-scriptable.js
```

---

## How the game works

Everything is clicking. The only typing anywhere is naming your knight, and even that comes
prefilled — tap through it and you need never touch a keyboard again.

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
  why gear, draughts and gold matter even to a player who never misses. An answer that
  beats the foe beats its wind-up too: nothing lands after its last words.
- **Foes talk.** A fight is a duel, and a duel is better with someone on the other side.
  Each foe says a line as the fight opens, gloats now and then when its blow lands, cries
  out at a crit, worries when your streak reaches five, begs once when nearly beaten, and
  has last words on the killing blow. On a phone the page glides down to the verdict and
  takes the bubble with it, so the verdict repeats what the foe just said. Slimes blorp,
  golems speak in capitals, and the eight realm bosses talk about their own mathematics:
  the Determinant Golem's is not zero, so it can undo anything, until it is. A foe gloats about the blow, never about
  you. It is all decoration: the bubble is hidden from screen readers, the daily's straw
  knight keeps silent, it never touches the seeded draw that makes the daily the same
  for everyone, and nothing of it is saved.

**⛓️ Rites.** A topic that is genuinely complex does not arrive as one hard question. It
arrives as a ladder of five-second steps — *pick u · find du · rewrite · integrate* — each
its own tap with its own small hit and rising tone, ending in one scaled finisher. Four
fast wins read better than one hard question, and they happen to be how procedure is
actually learnt. A clean ladder deals **5.8× weapon damage** against **3.6×** for a single
correct answer, so taking the long way is rewarded rather than taxed. The foe still acts
once per ladder, on the finisher. A trail above the ladder keeps each rung taken and its
answer, with its mathematics still drawn: a matrix stays a matrix and a power stays raised,
where it used to be read off column by column as a flat run of numbers.

**Scaffolding fades into damage.** Clear a topic's ladder three times at high mastery and
the game stops offering the ladder and hands you the whole problem instead — marked
*unassisted ×2*. The support disappears because you chose the bigger reward, not because a
difficulty setting moved. Ladder steps move mastery by a *fraction* of a full answer, so
being walked through something never convinces the scheduler you have mastered it.

**📖 The Codex.** Every complex topic carries a card: the rule in a sentence and a worked
scrap. A `?` sits beside the topic name — free to peek while a topic is still new to you,
and after that it costs your combo. Get one wrong and the rule appears in the explanation
alongside the diagnosis.

**🧮 Scratch pad.** A calculator sits one tap away during any fight, with `x²`, `√`,
brackets and a live result. It costs nothing and no combo, because the game is testing
whether you know that ‖v‖ is √(a² + b²) — not whether you can square 24 in your head. The
Codex charges combo because it hands you the *method*; this hands you a sum. Turn it off in
Settings if you would rather do it all in your head.

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

**What fades comes back.** Mastery fades while you are away, and a topic that has slipped
past its review point is named on the map, right under the daily skirmish, with what it has
fallen to and from — *Dot Product 35% ↓ from 95%*. One tap starts a review round of just
those topics. Each right answer brings one back and takes it off the list; a wrong one
keeps it in to come round again; and when the last is back the round says nothing is
fading now and ends, rather than asking more. It pays no gold, and nothing new is saved:
the list is read off the same two fields the fade already uses.

**The whole curriculum on one screen.** The 🧭 Competency Map shows all seventy topics in
their seven strands, laid out as the curriculum runs: a linear algebra track (vectors,
matrices, then eigenvalues and subspaces) and a calculus track (limits and derivatives,
then integrals and applications) that meet in multivariable calculus. Each strand says
what it builds on and how much of it you hold, with a topic you have never met counting
as nothing, and each track marks *you are here* at its first strand you do not yet hold.
Every topic shows the rung it is on, the same ladder the lessons climb (📖 first meeting,
⚖️ true or false, 🎯 choose, 🧩 build, then ✦ fluent), read off what you know today, so a
topic that has faded drops a rung and is marked ↓. One tap on a topic starts practising
it. The map node shows how many topics are fluent, and the Ledger links there too.
Nothing is stored: it is all read off the mastery records the save already has.

**Progression.** Beating a foe earns gold and XP, and often loot. Levelling raises your
maximum health and heals you fully. Clearing a realm's boss unlocks the next realm.

**Loot** rolls a rarity — common through legendary — and opens as a chest that shakes,
bursts in the rarity's colour and sweeps a card in. Rare tiers and above hand over
*gear*, which until now could only ever be bought, so the Smithy is no longer the only
source of upgrades. A boss never drops common.

**Bounties.** Three rotating goals sit on the map — solve twenty riddles, land six crits,
win a fight without a single miss — each paying gold and rolling a replacement the moment
it completes. A bounty for one topic only names a topic you have met or one from a realm
you have reached, and an untouched one that names anything further is rolled again. A new
roll is saved the moment it is made, so reloading the page never rerolls the board. Beside them, the next unlock you are saving toward and how close you are:
the cheapest blade or plate on sale that beats the best of its kind you own, so a knight
with a forged edge is never pointed back at a weaker sword. Once you can pay for it, the
bar becomes a way to the Smithy that says what it does against what you wear, such as
*hits for 14 against your Rusted Trainer's 9*.

**🗡️ Daily Skirmish.** Twelve riddles drawn from a seed derived from the date, so the run
is *identical on every device that day* — it deliberately ignores your mastery model,
which would otherwise personalise the questions and make the score meaningless. No health,
no death; the only thing at stake is the number. Best of the day and all-time are kept.
The counter over the riddle names the one on screen, from 1/12 to 12/12, with the points
so far beside it.
The straw knight cannot fall, so its bar is the mark to beat instead: today's best once
there is one, else your best ever, else a par of 900. Each right answer drains it by the
points it scored, a toast says when you pass it and how many riddles are left, and a run
that falls short is told by how much. The mark is worked out as the run starts and never
saved. The result screen also names every topic the run missed, each once, with what the
run moved in your mastery (headed "What this run taught"), and leads with a drill on just those topics in the Training
Grounds; a clean run says so and leads with running it again. The misses live only until
the next run.

**Near death.** Below a third health a red vignette pulses at heartbeat tempo and a low
thump plays on each new question. Below a sixth, it quickens.

**Gear** — 10 weapons and 9 armour sets, bought at the Smithy and equipped from the Gear
screen. Armour adds both flat damage reduction and maximum health.

**Relics** (usable mid-fight, one tap):

| Relic | Effect |
|---|---|
| 🧪 Healing Draught | Restores 45% of max health |
| 🔮 Sage's Insight | Burns away two wrong answers |
| 🔥 Berserker Rune | Next correct strike deals 2.5× damage |
| 🪶 Phoenix Feather | Automatically revives you once at half health |

**🛡️ Knights (save profiles).** Several people can share one browser — a family iPad, a
classroom laptop, a phone passed around — and each keeps their own knight with their own
save. A name is suggested for you, so the only screen that asks for typing doesn't insist
on it. The big gold button asks before starting over, because on a shared device it is the
easiest way to wipe somebody else's afternoon.

**Saves are written twice.** Browsers treat local storage as disposable — Safari clears a
site's storage after roughly a week without a visit, and any engine will drop it under
pressure. So every save also goes to IndexedDB, which is evicted later and less eagerly. If
local storage ever comes back empty the game restores from that copy and says so, rather
than presenting a fresh start as if nothing happened.

**Install it and the question mostly goes away.** Added to the home screen, the game is a
standalone web app and is not subject to that sweep — which is the real reason to install,
ahead of the full-screen chrome and offline play that come with it. The game offers the
hint once you have won a fight, drops it after three refusals, and never shows it if you
have already installed.

Saves live in this browser's local storage and nothing is sent anywhere; the game has no
server and no accounts. That also means one person's progress does not follow them between
devices on its own — **📤 Move** produces a code you copy into the game on the other device,
which brings a snapshot of that knight across. Anyone who was already playing before knights
existed keeps their progress: the old save is adopted as the first knight, and the original
is left in place as a backup rather than moved.

**Losing** costs 15% of your gold and nothing else. You keep every item, level, and piece
of gear. Death is a speed bump, not a wall. A fall leaves you at two-fifths health, so when
you can pay for it the first button rests you and puts you straight back in, and the plain
retry says what health it starts at.

**Game feel.** A landed blow is four things arriving together and decaying at different
rates, which is what reads as force: a slash crescent sweeping through the point of
contact, a shockwave ring, sparks that streak along their own velocity and cool from white
through gold to ember, and star glints that pop late so the moment keeps sparkling after
the bang. A crit adds radiating rays; a killing blow adds slow-motion and a shower of
coins. Colour says whose blow it was before the numbers land — gold when you strike, red
when you are struck. All of it sits behind a freeze-frame, a camera punch and a screen
flash. Health bars leave a white trail
showing the wound you just took. The tone that plays on a correct answer climbs a semitone
per consecutive hit, so a hot streak literally rises in pitch, and streaks of 3 / 5 / 8 /
12 / 16 / 25 fire escalating callouts. Rewards roll up rather than appearing. Every one of
these can be turned off — see Settings.

**🏟️ The Arena** opens once the final realm falls. Endless waves drawn from every topic you
have actually met — with seventy in the game, drawing from all of them would build a run
out of material you had never been taught — scaling until they kill you. There is no free
healing between waves — only a poultice after each fifth-wave champion — so a run is a war of attrition. Every third wave
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

## The eight realms

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
| 🟠 **Gradient Summit** | Gradient vectors, directional derivatives, the multivariable chain rule, tangent planes, double integrals, geometric series, Taylor polynomials — the capstone, where the two subjects finally meet |

**70 problem generators** in total, each producing randomised problems at three difficulty
levels — so you cannot memorise your way through. Every realm's difficulty curve is
simulated rather than guessed: see *Correctness* below.

---

## The eight settings

The campaign above is one half of the game. The other is the **descent loop**, and it is
where the twenty skills live.

A descent is a run of rooms with a fork after each one: **press on, or bank what you are
carrying and leave.** Gold, experience and materials ride unbanked until you walk out, and
in the places that can kill you a fall costs most of it. That fork is the whole game —
everything a skill does is either information to decide it with, or something that changes
what the next room costs.

| Setting | Shape | What makes it different |
|---|---|---|
| ⛏️ **The Deep** | endless, descended | The baseline: the foe curve simply climbs. Seams give ore, chests give essence |
| 🕯️ **The cellar** | 3 rooms, cannot kill you | The first run. It has to finish, or it has taught nothing |
| 🔮 **The Sanctum** | 6 rooms, fixed | Pays **essence** per room rather than gold — where Scrying is practised |
| 🍺 **The Tavern** | 5 rooms, cannot kill you | You buy in at the door and every table plays for the pot. The only place that can send you home poorer |
| 🧗 **The Summit** | endless, climbed | Its danger is not its foes. Every room above the first takes a slice off the health you can hold |
| 🥾 **The Wilds** | endless, walked | A herd circles it, so danger rises and falls on a period of nine rooms rather than climbing |
| ⛵ **The Sea** | endless, sailed | A third of leagues run rough on a roll and hit half again as hard — the one pressure you cannot deduce |
| 📚 **The Library** | endless, read | The pressure is the *questions*: every three shelves the material is asked a tier older |

Each place keeps its own words — the Deep is descended and counts *depth*, the Wilds is
walked and counts *rooms*, the Sea is sailed and counts *leagues* — so a fork never offers
to "climb out" of open country.

**Five kinds of pressure, not one curve at five speeds.** The Deep ramps. The Summit ramps
*and* shrinks you. The Wilds circles. The Sea draws. The Library ages the questions and
ignores your health entirely. Each is swept by the balance harness, which plays thousands
of runs at five accuracy levels and fails the build if the depth worth banking at stops
rising with skill:

| Setting | Break-even depth at 40 / 55 / 70 / 85 / 95% accuracy |
|---|---|
| The Deep | 3 · 4 · 7 · 9 · 13 |
| The Summit | 11 · 12 · 16 · 19 · 23 |
| The Wilds | 10 · 12 · 18 · 20 · 27 |
| The Sea | 10 · 14 · 17 · 22 · 28 |
| The Library | 13 · 16 · 21 · 24 · 27 |

Nine kinds of room can appear: a **fight**, a **chest** to pick, a **seam** to cut, a
**ward-stone** to inscribe, a **thicket** to gather, a **scriptorium** to copy, a **hold**
to stow cargo in, and the Tavern's **wagers** and **rumours**. Which kinds a setting grows
is part of what the setting *is*.

---

## The twenty skills

A skill is a body of mathematics, not a purchase. **Charges come from mastery and nothing
else** — know the strand a skill draws on and you carry more uses of it; let that strand go
cold and you carry fewer. Nothing in the game sells them.

They pay through one of four channels:

| Channel | What it gives | Skills |
|---|---|---|
| **Material** | something you carry out, spend, or convert | Lockpicking, Delving, Smithing, Enchanting, Scrying, Herbalism, Cargo, Scribing, Alchemy |
| **Combat** | something you press in a fight | Spellcraft, Dice, Cards |
| **Foresight** | something you know before you go | Farsight, Rumours, Sighting, Tracking, Weather-reading |
| **Passage** | a route, or permanent growth that travels | Climbing, Dead reckoning, Beast taming, Loremaster |

Ten are loadout abilities — you carry three at a time. Four are **Passage** skills, which
are never carried and cannot be pressed: they are simply true of you everywhere once the
mathematics is there, and stop being true if you let it go cold.

The five foresights are deliberately different *questions* rather than one answer at five
strengths. **Farsight** reads the next room exactly. **Rumours** totals the next three and
says nothing about their order. **Sighting** gives two distances and no detail.
**Tracking** reads a shape — the period the danger moves on and where in it you stand.
**Weather-reading** is the only one that reads something *drawn* rather than derived.

One rule holds all of them: **no ability may reduce the number of questions in a fight.**
They make the same practice more survivable or more informed, never shorter — and the
suite fires each one mid-fight and asserts the foe's health does not move.

---

## Materials and the Keep's rooms

Four materials, each given up by a different place and spent at the Keep. The Keep is a
hub off the map (🏰): one door a craft, and each door says what can be done behind it with
what you are carrying — *2 can be brewed*, *13 more ore for Deepsteel Edge*, *Cold — clear
a room to relight it*. Every room is its own screen, with the bench in it and a small drawn
scene that shows one true thing about the knight standing there: the Deepsteel on the
Forge's rack is dark until it is forged, a rune's place on the table is lit once it is
worn, and the Crucible's two vessels stand as full as the piles it is pointed between. The
Smithy keeps what gold buys.

| Material | Comes from | Spent at |
|---|---|---|
| 🪨 ore | seams in the Deep | **the Forge** — lockpicks, and Deepsteel gear no coin buys |
| 🜄 essence | chests, and the Sanctum | **the Rune Bench** — three permanent runes |
| 🌿 herbs | thickets in the Wilds | **the Apothecary** — draughts, and a satchel gold cannot buy |
| 📄 pages | passages in the Library | **the Scriptorium** — binds a topic's *recency*, never its mastery |

That last line is a rule rather than a detail: **a currency may buy convenience and may
never buy mastery.** A bench that could sell you knowing the mathematics would make every
other room optional, so both benches that come near it are checked field by field.

The fifth bench is **the Crucible**, where Alchemy converts one material into another. Its
rate is a diffusion — flux runs down a gradient, and the flow flattens the gradient that
drives it — so pouring a deep pile into an empty one pays well, pouring between two level
piles barely pays, and every unit poured makes the next worth less. No rate ever reaches
1:1, so a round trip strictly loses and there is no cycle to farm. It takes **one pour per
descent**, which is what makes *how much* a commitment rather than arithmetic.

**The Forge is struck, not pressed.** Choosing something to forge sets it on the anvil;
three strikes make it, and the ore is spent on the last one. Putting the work down before
then costs nothing.

**Your quarters** are the one room that sells nothing. The banner is the knight's crest in
their colour, the figure wears what they wear into a fight, and the shelf holds one trophy
for every realm whose champion has been put down, with the next place marked. Colours and
crest are free to change, are worn in battle (plume as chosen, cape a shade darker), and
travel in a knight code as they always did. The room itself has four styles, and none is
bought: each is opened by somewhere the knight has been — a champion beaten, a walk in the
Wilds, a climb banked from height ten.

**The Apothecary asks for a mix before it makes anything.** A potion is so many parts of
each herb, added up — a linear combination — so a recipe calls for a strength such as
⟨10, 14⟩, each herb on the bench carries its own, and the cauldron takes the mix when the
parts add up to exactly what was called for. The running total stays on screen, strength
by strength, with how far short or over each one is: it is solved by looking, not by
remembering. Every recipe can be mixed, in exactly one way, using every herb, because the
target is built from a hidden choice of parts and the herbs are always linearly
independent. It costs and gives precisely what brewing always did, walking away spends
nothing, and it tells the mastery model **nothing** — a puzzle with a live total can be
solved by nudging, so it is practice and not evidence.

Materials never gate anything. A knight with nothing can still descend, and a chest met
without a pick is a dead end rather than a dead run.

---

## The teaching parts

The game is built so that losing teaches you as much as winning.

- **Every answer, right or wrong, comes with a worked explanation** in plain language —
  the actual arithmetic of that specific problem, not a generic rule restated.
- **📖 A topic is taught before it is tested.** Recognising, judging, choosing and
  producing are four different things to ask of a learner, so a topic is walked up four
  rungs rather than dropped at the top:

  | Rung | What you are asked |
  |---|---|
  | 📖 first meeting | The rule, one small instance of it, a whole problem worked through (folded away), then an easy question with **three** answers and small numbers. Nothing strikes you for getting it wrong. |
  | ⚖️ true or false | A claimed answer, and you say whether it is right. A false claim is always one of the mistakes the question can diagnose, and the reason is read out either way. |
  | 🎯 choose | The question as it always was: four answers. |
  | 🧩 build it | No answers offered. A vector or matrix is assembled from number tiles, slot by slot; a whole number is typed. It strikes as a Perfect Strike does, ×3. |
  | 🔍 find the slip | Past the ladder, about one question in five. A squire's wrong answer, and which of three named mistakes made it. |

  **Where a topic stands is not stored anywhere.** It is read off *effective* mastery —
  the faded number that already sets difficulty — so a topic left alone for a month walks
  itself back down the ladder and is re-introduced, nothing is added to a save or a knight
  code, and a knight who existed before the ladder did is placed by what they know. The
  two easy rungs count for six-tenths of an answer in the mastery model, because saying
  "true" is weaker evidence than producing the answer; the weights are chosen so a clean
  run climbs exactly one rung an answer. A first meeting that goes wrong draws no blood,
  but it is still a wrong answer in every other respect, so there is nothing to gain by
  missing on purpose. The Training Grounds use the same ladder. The Daily Skirmish does
  not: it is the same twelve problems for everyone. The rooms of a descent — seams,
  thickets, ward-stones, tables, the scriptorium — keep their four answers, because each
  stakes its own thing on the answer, but a topic at its first meeting now arrives there
  with the rule above the question. That card draws nothing from the dice, so a room
  rebuilt from its seed on resuming a run is the room that was left.
- **The map opens on what to do next.** One card above everything else names the single
  thing the campaign is waiting on — the next foe, with the realm's progress as pips — and
  has one button for it. A descent left in flight outranks it; a knight who has not seen
  the cellar and has beaten nothing is sent there, while one who walked out early and has
  fought since keeps the campaign, with the cellar still offered first below. Health
  carries from fight to fight, so a knight below half is shown their health and what a miss
  against that foe costs, worked out, with a priced night's camp offered ahead of the fight
  when the purse can pay for it. Beneath, at most three smaller lines appear only when true: a
  streak, the weakest topic (one tap drills it), and a bench with something to make. A
  knight with nothing pressing sees none of them.
- **The campaign is a road.** The eight realms are stones on a winding path — won,
  where you are (with your progress), or sealed — with the road behind you in gold. Each
  realm's fights fold away beneath its heading, and only the realm you are working through
  is left open; tapping a stone opens its realm. Every fight is still on the page.
- **The title knows you, and the hall has doors.** A returning knight sees their banner,
  name, champions beaten and topics solid instead of the rules of play, which are kept for
  somebody who has not been down to the cellar and has beaten nothing. *Switch* opens the hall: a door for each
  knight, hung with their own banner, the one being played lit, with rename, move and
  erase beneath it as before, and a door for a new knight.
- **Answers are lettered tiles.** Short answers sit two by two so they can be compared at a
  glance; anything longer than about fourteen characters keeps the full width, so a minus
  sign is never squeezed out of sight. The tile you choose is marked ✓ or ✗ as well as
  green or red. On a keyboard, **1–4** or **A–D** answers and **Enter** moves on — never
  while the scratch pad is open, and never for an answer Insight has burned away. There is
  deliberately no countdown ring: nothing moves on screen while a question is waiting.
- **The end of a fight says what it taught.** Under the gold and the experience, the
  victory and defeat panels list each topic whose mastery moved — *Dot Product 0% → 30%* —
  with the rung it will be asked on next. Falls are listed as well as rises; being shown
  the working moves nothing and so lists nothing.
- **Every topic has a rule card.** Thirty-seven were written beside their generators; the
  other thirty-three — the simpler topics, which went without on the theory that they
  needed no introduction — fall back to `RULES`.
- **📌 Kept numbers.** The scratch pad works one sum at a time and most questions are two
  or three sums and a comparison. **Keep** pins a result beside the question until the
  next one, so the first product of a determinant does not have to be held in your head
  while you work out the second. Tapping a kept number drops it back into the sum.
- **🔎 Show me the working.** Every question carries a way out for a player who is
  genuinely stuck: ask, and the problem is worked in front of you in numbered steps,
  ending on the answer. Twelve topics are worked from a hand-written ladder — pick *u*,
  differentiate it, rewrite, integrate — and the rest from the explanation of that exact
  instance. It exists because every other teaching in the game arrives *after* you commit,
  which means the only route to it is a guess, and a lucky guess banks mastery nobody has.
  What it costs is the strike, not blood: you deal no damage and the streak breaks, but the
  foe's ordinary blow does not land — being shown is not a wrong answer, so it is not
  punished like one. Its wind-up still fires, because that runs on the foe's own clock
  whatever you do. And **the topic records nothing at all** — not a right answer, not a
  wrong one, and not a fresh timestamp either. Being shown is not knowing, so the question
  comes back.
- **💡 A nudge first.** Most players who are stuck need the way in, not the way through.
  Above the working sits a smaller door: the first step of the working on its own, stopped
  short of the answer. Where that step runs on to the answer, it is cut at the sign just
  before, so the sum is set up and left open — *Length is Pythagoras: √(7² + 24²) = …* — and
  a ladder's nudge is its first rung's question, without the rung's answer. A piece of the
  answer the question already shows does not count as a leak; the answer itself counts
  wherever a sum lands on it. Where nothing survives the cut, the topic's rule stands in.
  The question still has to be answered, and a right answer after a nudge lands for half
  the damage and moves mastery by half, because it is only part yours. It is not offered
  in the daily, on a ladder, or on a first meeting or a true-or-false rung, and nothing
  about it is saved.
- **⌨️ Played from the keyboard, read by a screen reader.** Much of the game is tapped on
  things that are not buttons: map doors, the nudge and the working, the settings rows. Every
  one of them is now a named button in the tab order, including the ones drawn mid-fight, so
  Tab reaches it, Enter or Space presses it, and a gold ring shows where the keyboard rests.
  A key that presses a control presses only that one, so Enter on a door, or on a button
  Tabbed onto, never also waves the turn on; a button merely clicked still lets Enter move on,
  the way a picked answer always has. What a turn's verdict says is read out when it lands. Number keys still pick an
  answer, and nothing about it is saved.
- **Wrong answers are diagnosed, not just corrected** — the game names the misconception
  your specific choice came from before explaining the right method.
- **The same slip twice is called a pattern** — one diagnosis cannot say "again". When a
  knight makes the same mistake a second time in a topic (the same misconception, whatever
  numbers it came with this time), the note beside it says so and asks them to check for
  exactly that before the next pick; a third time says how many. And the first time they
  then answer correctly with that very trap among the choices, the game says they walked
  past it. Counted per knight and per topic, for the sitting only: nothing is saved,
  because last week's slip is not this week's pattern, and what a player knows already
  lives in mastery.
- **↺ One like it, straight after a miss.** An explanation is only worth something if it is
  used, and the usual draw might not bring the topic round again for several questions. So
  in a fight, a miss (or a turn spent being shown the working) makes the next question a
  fresh one on the same topic at the same difficulty, marked *↺ one like it*, and the
  verdict says it is coming. It happens once: a miss on the second go returns to the usual
  draw, so a struggling knight is never held on one topic. Landing it is named. A first
  meeting is left to the lesson ladder, the daily is left as the same twelve for everyone,
  and nothing is saved.
- **🔍 Find the slip.** Choosing among four answers tests a method from one side: getting
  it right. Once a topic is past the ladder, about one question in five asks it from the
  other side. A squire's wrong answer is shown, and the question is which of three named
  mistakes made it, which is only answerable by working the problem and then working each
  mistake far enough to see where it lands. The three are the generator's own diagnoses of
  that question's wrong answers, all different; a question whose diagnoses would quote an
  answer on offer, and so hand the match over, is asked the plain way instead. Nor is the
  squire ever given an answer whose own mistake shares more of its words than the others
  do: "You would need the angle between them" beside "You never need the angle" can be
  matched without working anything, so the squire answers something else, and a question
  where every answer would echo is asked the plain way. Sixty-seven of the seventy topics
  can be asked it. The verdict lays each mistake beside the answer it
  gives, with the squire's marked, and then what the problem comes to done right. It
  strikes and is struck like any other question and counts as a whole answer; picking the
  wrong mistake is not recorded as making it. The Training Grounds ask it too; the daily
  and the ladders of complex topics do not, and nothing is saved. Building it also fixed
  the true-or-false claim, whose label style was shrinking a matrix claimed inside it.
- **Figures you can read at a glance** — twenty topics carry a drawn diagram beside the
  question, and a second one beside the explanation. The split is deliberate: the question
  figure is a *prompt*, never a solution. Vector addition draws **u** and **v** and stops
  there; the parallelogram and the resultant only appear once you have answered. A
  determinant question draws nothing, and then shows you the unit square turned into the
  parallelogram whose area is the answer's size. The working says it in words too: a
  determinant of −12 makes "a shape of area 12, flipped over: the minus sign is the
  flip", and 0 presses the square flat onto a line; a 3×3 says the same of the unit
  cube's volume. Six kinds cover it — the plane, a transformed
  grid, a curve, a shaded region, Riemann bars, and a number line with a hole in it.
- **📖 Tome of Lore** — thirteen short pages covering the conceptual spine of both subjects,
  ending with how gradients tie them together.
- **🧭 Workshop index** — the top of the Tome lists all forty-eight workshops
  as chips, under the seven strands and in each strand's order, so any one is a
  tap away instead of a long scroll down. A chip turns green with a ✓ once every
  topic it covers is solid, and is ringed in gold while one of them needs work, as
  the Training Grounds count it, which is where a visit pays most. Both are read off mastery as it
  stands; nothing is saved.
- **🛠 Matrix Workshop** — opened from the Tome. A 2×2 matrix you turn by hand, four
  numbers from −4 to 4 each with a − and a + button, and the plane redrawn on every tap.
  Beside it: where î and ĵ land (the first column is coloured like î and the second like
  ĵ, because a column is where a basis arrow goes), the determinant worked out with what
  it does to the unit square, and the directions the matrix keeps, drawn in red and pink
  with their eigenvalues. Nine things to make give the turning a point: stretch î alone,
  swap î and ĵ, a quarter-turn, a flip, a shear, an area of exactly 6, a press flat onto
  a line, a scale by 3, and a matrix that turns every arrow. Nothing is graded or timed,
  and nothing is saved: it is where you come to see what a matrix does before a drill
  asks you to work it out. `npm test` checks all 6,561 matrices it can show: every
  direction it draws is really kept, every eigenvalue is a root of λ² − (trace)λ + det,
  "no direction" means a negative discriminant, and each goal can be made in range.

  **🧩 Match the shape** turns it round: a matrix is drawn only as a dashed picture, its
  outline and where its î and ĵ end, and you turn your numbers until your gold shape
  sits on it. The picture is the whole clue. Reading where the dashed î ends on the grid
  gives the first column, and that reading is the skill, so the target's numbers are
  never shown. The axes are numbered and the dashed arrows named, so nothing has to be
  counted in your head, and the view is sized to fit both shapes. Each column is judged on its own ("î ✓ on its mark · ĵ not yet"), and a
  match sets the next shape at once. Targets keep to −2 to 2 so every corner sits on a
  grid line, are never flat (a flat shape hides where ĵ went), never the identity, and
  never the one just matched.

  **🔢 Which matrix?** turns it round once more: the shape is drawn dashed and
  four matrices are offered, one of which makes it. The other three are the
  slips people make writing a matrix down from its picture: the rows written
  as columns (the transpose, offered whenever it differs), the right columns
  in the wrong order, each arrow's across and up swapped, and one number with
  the wrong sign. A wrong pick is shut, drawn in gold over the dashed shape so
  the slip can be seen, and explained for the numbers on screen; a right one
  reads its columns back and deals a new shape. Nothing is saved, and there is
  no clock.
- **🎯 Dot Product Workshop** — the Tome's second linear algebra workshop. Set two
  arrows, u and v, with four steppers from −4 to 4, and the readout works everything a
  dot product says about them for the numbers on screen: u·v = 3·1 + 1·2 = 3 + 2 = 5,
  both lengths from their squares (√10 and √5), cos θ = 5 / (√10 × √5) ≈ 0.707, so
  θ = 45°. The figure marks the angle and draws u's shadow on v's line in gold, and the
  shadow is where the sign comes from: when it points back against v, the dot product
  is negative; when there is no shadow at all, the arrows are perpendicular. An arrow of
  length 0 is given no angle. Six things to find (perpendicular, perpendicular with no
  zero anywhere, negative, exactly opposite, exactly along at another length, and a dot
  product of exactly 10). `npm test` checks all 6,561 pairs, reading back every line the
  player reads: the products, the lengths, cos θ and the angle against atan2, an exact =
  only where nothing was rounded, and the shadow's length and direction.

  **🎯 Which u·v?** turns the workshop round: two arrows u and v, their numbers
  written beside them, and four numbers, one of them u·v. Every number in the
  arrows is a whole number from −3 to 3 and never 0, so no slip lands on the
  answer by luck. The wrong numbers are the slips people make: pairing the
  wrong parts (u₁v₂ + u₂v₁), taking the second product away, stopping after the
  first product, or the determinant u₁v₂ − u₂v₁, which measures area and not
  agreement. The rule says the sign can be read off the picture first: arrows
  that lean together give a positive number, arrows that lean apart a negative
  one. A wrong pick is shut and worked out beside the right sum, and u's shadow
  on v's line is drawn in gold, square to the line, pointing along v or back
  against it. Nothing is saved, and there is no clock. `npm test` checks every
  number on screen against the sum it stands for, every worked slip against
  its button, and reads u, v and the shadow back off the grid's own ticks.
- **👑 Eigenvector Hunt** — the Tome's third linear algebra workshop. A matrix knocks
  almost every arrow off its line; the hunt is for the few directions it only stretches.
  Pick one of four matrices, point v with two steppers from −2 to 2, and the readout
  works Av for the numbers on screen, Av = ⟨2·1 + 1·1, 1·1 + 2·1⟩ = ⟨3, 3⟩, then either
  names the stretch (Av = 3 × ⟨1, 1⟩, so λ = 3, and every arrow on that line is one too)
  or says how far Av was knocked off, about 27°. The figure dashes v's line so the miss
  can be seen. Six things to find: both directions of the first matrix (stretched by 3,
  left as it was), both of the second, one the third turns right round (λ = −1), and an
  eigenvector that is not the shortest on its line. The fourth matrix is a quarter-turn,
  and the readout says plainly that it has no real eigenvectors at all; the arrow of
  length 0 is never counted. `npm test` checks all 100 states against mathematics
  worked separately: Av and its sums, the cross product for staying on the line, λ, the
  flip, and the angle off from acos where the page uses atan2.

  **🔎 Spot one** turns the hunt round: a matrix and four arrows, each drawn in
  its own small panel with where the matrix sends it and a dotted line through
  it. One stays on its line; the other three are knocked off it, and one of
  them is always the arrow knocked off least, so the eye has to check the line
  rather than guess. The matrix is built as P·D·P⁻¹ from two whole-number
  directions with det P = ±1, so every entry and every eigenvalue is a whole
  number, never diagonal, and often negative: an eigenvector turned right round
  still counts, and the readout says why. A wrong pick is multiplied out, shut,
  drawn in red and told how many degrees it is knocked off; a right one is
  written as λ times itself and deals a new matrix. Nothing is saved, and there
  is no clock.
- **🔁 Order Matters** — matrix multiplication as two moves of the plane, one after the
  other. Pick a first move and a second from five (a quarter-turn, a flip over the x-axis,
  a flip over y = x, a shear and a stretch), and the readout follows î and ĵ through both:
  ĵ goes to ⟨1, 1⟩ under the shear, then to ⟨−1, 1⟩ under the turn, so the pair is the
  matrix with those columns, built from where the arrows land rather than from a rule to
  remember. Its determinant is the two determinants multiplied, and the other order is
  drawn dashed beside it, with where î and ĵ land that way round. Six things to find:
  an order that matters, two different moves that commute (only the flip and the stretch
  do), a move that undoes itself, a half-turn from two moves, a quarter-turn from two flips,
  and det = −2. `npm test` checks all 25 pairs against each move worked as what it does to
  a point: every column, the determinant against the signed area of where the square lands,
  whether the order matters, and what the pair makes.
- **🌫️ Limit Workshop** — the idea under every slope: some formulas give no number at
  one point, and a limit is what f(x) closes in on there. Pick one of four formulas, choose
  a side, and bring h down from 1 to 0.001, with x = a − h from the left or a + h from the
  right. The readout works f out at x for the numbers on screen, so (x² − 1)/(x − 1) at
  0.999 is (0.998001 − 1)/(−0.001) = 1.999, and says why x = a itself has no value (0/0,
  or 1/0). Once a side has been watched up close it says where f(x) heads from there, and
  names a limit only when both sides agree. The graph draws the hole the formula skips.
  Six things to find: the 2 that (x² − 1)/(x − 1) hides, to within 0.01, and both sides
  agreeing on it; sin x / x heading for 1; |x| / x staying at −1 on one side and 1 on the
  other, so its limit does not exist; and 1/x reaching 1000 on one side and falling without
  end on the other. `npm test` checks all 40 states against each value worked another way
  (x + 1 for the hole, the series for sin x / x), every step of the working, and each
  side's verdict against where three values closing in actually head.
- **📈 Slope Workshop** — also opened from the Tome, and the calculus side of the same
  idea. Pick a curve (x², x³ − 3x or 4 − x²), step the point a from −2 to 2, and bring
  h towards 0 through 1, 0.5, 0.1, 0.01 and 0.001. A blue secant runs through (a, f(a))
  and (a + h, f(a + h)), and its slope is worked out for the numbers on screen:
  (f(1.1) − f(1)) / 0.1 = (1.21 − 1) / 0.1 = 2.1. At the closest h the secant lies along
  the dashed tangent and the readout names where the slope is heading, f′(1) = 2. One
  tap watches from the other side, h below 0, because a limit has to agree from both.
  Five things to find (get within 0.01 of f′(a), come in from the left, a flat tangent,
  a falling curve, the steepest point) give it a direction. `npm test` checks all 150
  states: the derivative against the curve itself, the secant against its two points,
  the printed working against the printed numbers to the last digit, and that the
  closest h really is within 0.01 of the tangent everywhere it says so.
- **🏺 Area Workshop** — the Tome's third workshop, and the integral's turn. Pick a curve
  (x² from 0 to 3, 4 − x² from 0 to 2, or x³ from −1 to 2), choose where each rectangle
  takes its height (its left edge, middle or right edge), and step from 1 rectangle to
  64 by doubling. The rectangles are drawn under the curve, red where they hang below
  the axis and count against the sum, and the sum is worked for the numbers on screen:
  Δx = (3 − 0) / 4 = 0.75, then 0.75 × (0 + 0.5625 + 2.25 + 5.0625) = 5.90625, against
  ∫₀³ x² dx = 9, short by 3.09375. Past four rectangles the heights are added rather than
  listed, and a sum that needed rounding is shown with ≈ and "about", never with =.
  Five things to find (within 0.1, within 0.01, a sum that overshoots, one that falls
  short, a rectangle under the axis) count only once the player has turned something.
  `npm test` checks all 63 states: each sum against a Riemann sum worked from the curve,
  each exact area against a fine sum, the printed working against the printed numbers,
  and that 64 midpoint rectangles really are within 0.01 of the integral.

  **🎯 Which integral?** turns the workshop round: a shaded curve and four
  numbers, and the player picks the integral. The curve is a whole-number
  parabola or line, shaded between two whole numbers, and two in three cross
  the axis inside the shading, so part of it sits below in red and counts as
  minus. Every answer is a whole number or a half or a third, worked in sixths
  so nothing is rounded. The three wrong numbers are the slips people make:
  F(a) − F(b) the wrong way round, F(b) alone, the red part counted as plus,
  the power rule without its divide, and f(b) − f(a) in place of F. When the
  curve crosses, the red-as-plus slip is always one of the three. A wrong pick
  is shut and told which slip it is and what it gets wrong; a right one shows
  F(x), F(b) and F(a) worked out and deals a new curve. Nothing is saved, and
  there is no clock.
- **🌀 Taylor Workshop** — a function rebuilt from powers of x. Pick eˣ, sin x or cos x,
  raise the highest power from x⁰ to x⁹, and move x from −3 to 3. The figure draws the
  function in gold and the polynomial P in blue, both marked at x, and the readout names
  the series (eˣ = 1 + x + x²/2! + …), writes P out to the power chosen, works it at x
  term by term (P₃(1) = 1 + 1 + 0.5 + 0.1667 ≈ 2.6667) and sets it against the function:
  short by about 0.0516. At x = 0 P is exactly right whatever its length; far from 0 the
  guesses swing above and below until enough terms are in, and a term can make the guess
  worse, which the readout says and explains; sin x and cos x skip every other power, and
  a skipped power is said to change nothing. Six things to find count only once the
  player has turned something. `npm test` checks all 270 states: each coefficient from the
  function's own derivatives, each polynomial's powers and signs, the printed terms and
  total against the printed numbers, = only when nothing was rounded, and that every goal
  can be reached.

  **🎯 Which coefficient?** turns the workshop round: a·e^(kx) with a from 1
  to 6 and k up to 3 either way, a power xⁿ from x² to x⁴, and four numbers
  for its coefficient, one of them a·kⁿ/n!. The rule is stated first: put kx
  in place of x in the series of eˣ, so k is raised to the power n along with
  x, and divide by n!. The wrong numbers are the slips people make with it:
  forgetting the factorial, leaving k unraised, dividing by n instead of n!,
  the sign of kⁿ turned round, and stopping the factorial one short. A 0 is
  never offered, the coefficient is a whole number about half the time, and
  another number of its form always stands beside it. A wrong pick is shut
  and checked by Taylor's rule, the slope taken n times at 0 over n!; the
  right pick works c × n! back to that slope. Nothing is saved, and there is
  no clock. `npm test` reads every number back off its button as an exact
  fraction, checks it against the slip it is named as, checks the right one
  alone against the series summed out to forty terms, and works every
  product and factorial in the readout again.
- **🔎 Newton's Method Workshop** — a tangent's road to a root. Pick x² − 2, x³ − 2x + 2
  or x² − 4x + 3, set a first guess x₀ from −3 to 3, and take up to six steps. The figure
  draws the dashed tangent at the current guess, the earlier guesses in gold and where the
  next step lands in blue, and the readout works each step from f and f′
  (x₁ = 1 − (−1)/2 = 1.5) and says what happened: √2 run down to four places in three
  steps, a first step that jumps right past the root and why, a flat tangent with no next
  step, two guesses that go round each other for ever, and a guess that is a root already.
  Six things to find count only once the player has turned something. `npm test` checks
  all 273 states: f and f′ written out by hand, the cubic's root by bisection, every step
  line and verdict, = only when nothing behind a number was rounded, and that every goal
  can be reached.

  **🎯 Which x₁?** turns the workshop round: a quadratic, a whole-number first
  guess x₀ with f(x₀) and f′(x₀) worked out beside it, and four numbers, one of
  them the next guess x₁ = x₀ − f(x₀)/f′(x₀). The rule is stated first, as the
  tangent falling f(x₀) at f′(x₀) per step along. The wrong numbers are the
  slips people make with the step: adding f/f′ instead of taking it away; the
  fraction upside down, f′/f; the step alone, −f/f′, with x₀ left off; and
  x₀ − f(x₀), the height taken away without dividing by the slope. A 0 is never
  offered, x₁ is a fraction about half the time, and another number of its form
  always stands beside it. A wrong pick is shut and checked on the tangent
  itself, whose height there is not 0; the right pick works the step. Nothing is
  saved, and there is no clock. `npm test` reads every number back off its
  button as an exact fraction, checks it against the slip it is named as,
  checks the right one against the tangent at x₀ worked from f itself, and works
  every slope, step and tangent height in the readout again.
- **⛓️ Chain Rule Workshop** — one function inside another. Pick y = (3x − 1)², (x² − 1)³
  or (x²)² − 2x², each built as u = g(x) then y = f(u), and move x from −2 to 2. The
  readout works u and y, says how fast u moves for x (g′(x)) and how fast y moves for u
  (f′(u)), and multiplies the two: 4 × 3 = 12, so y moves 12 times as fast as x. A nudge
  either side of x checks it from y itself. A second button tries the slip everybody
  makes once, f′(x) × g′(x), draws it as a blue line across the tangent and lets the
  nudge catch it out, and finds the one point where it is right only by luck. Six things
  to find count only once the player has turned something. `npm test` checks all 54
  states against y and its slope written out in full, the slip from f′ by hand, and the
  nudge, and that every goal can be reached.

  **🎯 Which dy/dx?** turns the workshop round: y = f(g(x)) and four formulas,
  and the player picks the chain rule. The outside is a power (u², u³, u⁴),
  sin u, cos u or eᵘ, and the inside a x + b or x² + b. The three wrong
  formulas are the slips people make: stopping at f′(g(x)) without the inner
  slope, taking f′ at x instead of at g(x), putting the inner slope inside f′,
  or getting the outer slope wrong (the power kept, a minus on sin or none on
  cos, the power rule tried on eᵘ). Each slip is checked to look wrong at the
  point drawn on the curve, at least 10° off. A wrong pick is shut and named
  as its slip, and its slope there is drawn as a dashed red line cutting
  across the curve, beside a nudge of the curve itself; a right one works
  f′(u) and g′(x) out and deals a new curve. Nothing is saved, and there is no
  clock. `npm test` reads every formula on screen back as maths and checks the
  chain rule against a nudge of y and each slip against what it gets wrong.
- **⛰️ Downhill Workshop** — gradient descent, by hand. f(x, y) = (x − 1)² + 2(y + 1)² is
  a valley with its bottom at (1, −1), drawn from above as rings. Pick a step size η
  (0.1, 0.25, 0.4 or 0.55) and press Step downhill: the readout works f at the point
  ((−3)² + 2·2² = 17), the gradient ⟨2(x − 1), 4(y + 1)⟩ = ⟨−6, 8⟩ that points straight
  uphill, and the step against it, p − η∇f, worked to the next point, with ≈ wherever a
  part was rounded. The figure draws the walk so far and the next step as a dashed arrow,
  and after each step the readout says whether f fell, whether the step jumped across the
  valley floor, or whether it climbed because η was too big. Six things to find: landing
  on the floor in one step, the bottom, a zigzag that still falls, a step that climbs, a
  crawl that is still above 0.5 after five steps, and f run past 100. `npm test` walks
  every step size from the start, 94 states, and checks f, ∇f and each step against its
  own sums, the next point against the step, and each verdict against f before and after.
- **🧭 Span Workshop** — a mix of two arrows, a·u + b·v, walked out: a of u from the
  origin in blue, then b of v from its tip in green, and the gold sum. Pick one of four
  pairs and set a and b from −2 to 2 to land on the gold ring. The readout works the mix
  (1·⟨2, 1⟩ + 2·⟨1, 2⟩ = ⟨2, 1⟩ + ⟨2, 4⟩ = ⟨4, 5⟩) and says how far the target still is.
  The second pair's target takes a negative amount; with î and ĵ the amounts are just the
  target's coordinates; the fourth pair has v = 2u, so every mix is (a + 2b)·u on one
  dashed line, its target off it can never be reached, ⟨0, 0⟩ comes out of amounts that
  are not both 0, and the same point turns up twice, which the readout remembers. Six
  goals, from landing on a target to reaching one point two ways. `npm test` checks 100
  states: each sum against its own working, each target reachable only by an independent
  pair, and a second way to a point only on the pair that lies on one line.

  **🎯 Which mix?** turns the workshop round: two short arrows u and v, a gold
  ring, and four mixes such as 2u − v, and the player picks the one that lands
  on the ring. u and v always point different ways (never both along the axes,
  where the amounts would just be coordinates), so each mix lands somewhere
  different. The wrong mixes are the slips people make: the amounts swapped
  between u and v, u or v walked the wrong way, or both, which lands on the
  ring's mirror point through ⟨0, 0⟩. A wrong pick is shut and named as its
  slip, worked out for the numbers on screen, and walked in red on the grid, a
  lots of u and then b lots of v, to where it really lands; a right one works
  the mix and deals a new pair. Nothing is saved, and there is no clock.
  `npm test` reads every mix on screen back as amounts of u and v, checks each
  slip is the slip it is named as, and reads the arrows, the ring and every red
  walk back off the grid's own ticks.
- **⚖️ Elimination Workshop** — two equations solved by hand with row operations. Pick
  a row, set k from −3 to 3, and add k times the other row to it, multiply or divide it
  by k, or swap the rows; Undo and Start again are always there. The readout lists both
  equations and works each operation entry by entry (R2 − 3·R1: 3 − 3·1 = 0, 4 − 3·2 = −2,
  11 − 3·5 = −4), then says what the rows now tell you: x is gone from a row and what to
  do next, the system is solved, or a row reads 0 = 2 (no solution) or 0 = 0 (a whole line
  of solutions). Each row is drawn as its line with the crossing ringed, so the lines
  move while the point they share never does, and scaling a row leaves its line exactly
  where it was. Four systems, six goals. `npm test` redoes every operation reachable in
  three steps from each system, 35,000 states: each row against its own arithmetic, each
  equation read back into numbers, the crossing still on both lines, undo putting the
  rows back, and 0 = c and 0 = 0 only on the systems that have them.

  **🎯 Which k?** turns the workshop round: two rows with one crossing at whole
  numbers, and four numbers, one of them the k that clears x out of row 2 when
  k times row 1 is added to it. The rule is stated first,
  k = −(row 2's x coefficient)/(row 1's). The wrong numbers are the slips
  people make with it: the minus sign left off, so x doubles; the fraction
  upside down; the division left out; and the k that clears y instead, which
  can come out as a fraction. A 0 is never offered. A wrong pick is shut and
  worked through row 2's x coefficient plus k times row 1's, which is not 0;
  the right pick clears x, reads off y from what is left of row 2, and puts y
  back in row 1 for x. Nothing is saved, and there is no clock. `npm test`
  reads every number back off its button as an exact fraction, checks it
  against the slip it is named as and that only the right one clears x, and
  works every sum in the readout again.
- **↩️ Undo Workshop** — build the matrix that puts a move back. Pick A (a shear, a
  quarter-turn, a flip, a tilt or a squash) and turn the four numbers of B from −2 to 2.
  The readout says where A sends î and ĵ, then works B on each, number by number, and
  says whether that arrow is back home; the plane draws A's arrows in grey and B's
  results in blue and green, with home ringed. When both come home it says BA = I and
  names B as A⁻¹ with its rows; the flip turns out to be its own undo, and the squash has
  det 0, sends ⟨2, −1⟩ to ⟨0, 0⟩, and nothing undoes it. Five matrices, six goals.
  `npm test` turns every B on every A, 3,125 states, and checks each working against
  its own arithmetic, that exactly one B undoes each A and that it is the true inverse,
  and that no B undoes the squash.

  **🎯 Which A⁻¹?** turns the workshop round: a 2×2 matrix A with
  determinant 1 or −1, so its undo has whole numbers, and four matrices, one
  of them A⁻¹. The rule is stated first: swap a and d, change the signs of b
  and c, and divide by det A. The wrong matrices are the slips people make
  with it: a and d left where they were, b and c left with their signs, A
  turned on its side as if undoing were transposing, and, when det A = −1,
  the division forgotten. A wrong pick is shut and checked the way B is: it
  is followed through Aî or Aĵ, and the arrow that does not come home is
  worked out, with A⁻¹ worked from the rule beside it. Nothing is saved, and
  there is no clock. `npm test` reads every matrix back from both its name and
  its cells, checks it against the slip it is named as, and works every arrow
  in the readout again.
- **📏 Best Fit Workshop** — set a line y = m·x + c through a handful of points, with m
  from −2 to 2 and c from −3 to 3 in steps of a half. The readout works each point's miss
  (its y minus the line's height there), adds the misses and their squares, and says what
  one step of m or c either way would give; the plane draws the points as gold rings, the
  line in blue and every miss as a red arrow. The line-up has a line through every point;
  on the scatter the smallest total picks the least-squares line, through the average
  point, while a line whose misses add to 0 is still beaten; and with one far point the
  line through the four in a row pays 25 for it, so the best line tilts. Three sets of
  points, six goals. `npm test` sets every line on every set, 351 states, and checks each
  working against its own arithmetic, that each set has one best line through its average
  point, and that every goal can be found.
- **🏰 Two Castles Workshop** — a hundred knights live in two castles and ride between
  them every night by a fixed rule, so a night is a 2×2 matrix M times the split and n
  nights are Mⁿ. Set how many start in Castle A (0 to 100 in fives) and run up to ten
  nights; the readout works each night as what A keeps and what it gains, lists the split
  night by night, and gives A's gap from the steady split as the starting gap times the
  matrix's other eigenvalue to the nth. On Drift the gap shrinks to 0.6 of itself each
  night and settles on 75 from above or below, while starting at 75 changes nothing,
  which the readout names as the eigenvector with λ = 1; on Even one night is enough
  (λ = 0); on Swap the split flips for ever (λ = −1) unless it starts at 50. Three rules,
  six goals. `npm test` runs every rule, start and night, 693 states, works each split by
  multiplying by the matrix, checks each steady split is left alone and each other
  eigenvalue is the trace less 1, checks every line of the readout, and checks that every
  goal can be found.
- **🏗️ Biggest Build Workshop** — with a fixed 40 m of fence or a 12 cm sheet of card,
  what you build depends on one length x. Step x in halves; the readout writes what the
  build holds as a formula in x, works it at this x from its own lengths and half a unit
  either way, and reads the slope A′(x): above 0 more x helps, below 0 it hurts, and where
  it is 0 the tangent is flat. Against a castle wall the best paddock is 10 m wide and
  holds 200 m², and 150 m² is held at two widths, one each side of the peak; in the open
  the best paddock is a square; and the open box holds most with a 2 cm cut, while its
  other flat tangent at 6 cm holds nothing at all, so a flat tangent can mark the least.
  Three builds, six goals. `npm test` sets every x on every build, 86 states, works what
  each holds from its lengths and its slope by a nudge, finds the best by trying every x,
  checks every line of the readout, and checks that every goal can be found.
- **💧 Cistern Workshop** — a spring fills the castle cistern at a rate f that the
  player cannot change, and the total so far is the area under f. Step the hours; the
  figure shades the area so far, gold above the axis and red below, and draws the tangent
  to the total, whose slope is always the height of the flow there: F′ = f. The readout
  works the total, reads the flow, and shows the next tenth of an hour adding a strip f
  tall. The fading spring's cistern is fullest at hour 3, where the flow stops, then
  drains, and is empty at hour 6, where the area below the axis has cancelled the 9
  barrels above it; a steady spring fills a rectangle; a tidal sluice turns at hour 1 and
  runs dry at hour 3. Three springs, six goals. `npm test` sets every hour on every spring,
  35 states, adds up the area under each flow in thin strips and checks the total against
  it, checks F′ = f by a nudge and every turn of the total, checks every line of the
  readout, and checks that every goal can be found.

  **🎯 Which total?** turns the workshop round: an empty cistern filled at
  f(t) = ct² + at + b barrels an hour, an hour T, and four numbers, one of
  them the total F(T). The rule is stated first: integrate term by term,
  raising each power of t by one and dividing by the new power, then put in
  T. The wrong numbers are the slips people make: the flow at hour T read as
  the total, the flow held at its hour-T or starting value as a rectangle,
  the 2 or the 3 not divided by, and the steady b dropped. Every number is
  above 0, about half the totals are whole and half fractions, and a wrong
  number of the same form always stands beside the right one. A wrong pick is
  shut and checked by differentiating it: it is G(T) for some G, a total
  climbs exactly as fast as the water flows, and G′ is not the flow at the
  hour the check names. The right pick works F(T) out term by term. Nothing
  is saved, and there is no clock. `npm test` reads every total back off its
  button, checks it against the slip it is named as, checks the right one
  alone against the area under the flow by Simpson's sum, and works every
  check in the readout again.
- **🔬 L'Hôpital Workshop** — a ratio that gives 0/0 at a point says nothing there,
  so step h toward 0 from either side and read the top, the bottom and their ratio at
  x = a + h. The figure draws the top in gold and the bottom in blue, both crossing 0 at
  the point, with their heights marked. The readout finds the slopes of top and bottom
  at the point, says the ratio heads for the ratio of those slopes, and says whether h
  is close enough yet for the curves to be as good as their tangents. The square heads
  for 2 from both sides, the cube for 12/4 = 3 and sin x / x for 1; the last ratio is
  not 0/0 at all, so the rule's answer, 4, is wrong and the ratio heads for its plain
  value, 2. Four ratios, five goals. `npm test` sets every h on every ratio, 40 states,
  checks each ratio against its formula, the slopes by a nudge and the limit right at
  the point, checks that the gap shrinks as h closes in, checks every line of the
  readout, and checks that every goal can be found.

  **🎯 Which limit?** turns the workshop round: a ratio of two quadratics that
  gives 0/0 at a whole-number point, and four numbers, one of them its limit.
  The rule is stated first, with the slope of px² + qx + r as 2px + q, and the
  0/0 is pointed out. The wrong numbers are the slips people make with the
  rule: the ratio upside down, g′/f′; the x² coefficients alone, which is where
  the ratio heads far out, not near the point; the constant terms, f(0)/g(0);
  and the x coefficients, f′(0)/g′(0), the slopes taken at 0 instead of at the
  point. A 0 is never offered, the limit is a fraction about half the time,
  and another number of its form always stands beside it. A wrong pick is
  shut and worked out as the slip it is; the right pick works both slopes at
  the point. Nothing is saved, and there is no clock. `npm test` reads every
  number back off its button as an exact fraction, checks it against the slip
  it is named as, checks the right one against the ratio itself a hair from
  the point, and works every slope and fraction in the readout again.
- **🔬 See it work by hand** — when a fight ends with a topic that fell, its summary
  offers the workshop that shows that topic working, named as the Tome names it, so a
  miss on L'Hôpital's rule leads straight to the L'Hôpital Workshop and a miss on the
  chain rule to the Chain Rule Workshop. The biggest fall comes first, one button per
  workshop, two at most; a topic no workshop fits is offered nothing. The workshop's
  back button returns to the summary. Sixty-nine topics link to forty-eight workshops,
  and `npm test` checks each link is a real topic, opens its workshop, and uses the
  Tome's own name for it.
- **🌾 Product Rule Workshop** — a field f(x) wide and g(x) deep has area f × g.
  Move x on by h and the drawing shows where the new area comes from: a side
  strip Δf × g, a top strip f × Δg and a red corner Δf × Δg, all to scale. Per
  unit of h the strips head for f′g and fg′ and the corner for 0, so close h in
  and the rate settles on f′g + fg′. The readout names f′ × g′ for what it is:
  the size of the vanishing corner, which is why it is not the derivative.
  Three fields and five things to find, including the step where the corner
  outgrows a strip, and a fight where the product rule falls now offers it.

  **🎯 Which dy/dx?** turns the workshop round: y = f(x) · g(x) and four
  formulas, and the player picks the product rule. f is x², x³, x or a line,
  and g is sin x, cos x, eˣ or a line (never two lines). The three wrong
  formulas are the slips people make: multiplying the slopes, f′g′ (the corner
  the field shows vanishing), taking fg′ away as the quotient rule does, or
  keeping only one part, f′g or fg′. With g = eˣ, f′g′ and f′g are the same
  formula, so only one of them is offered. Each slip is checked to look wrong
  at the point drawn on the curve, at least 10° off. A wrong pick is shut and
  named as its slip, and its slope there is drawn as a dashed red line cutting
  across the curve, beside a nudge of the curve itself; a right one works f′
  and g′ out and deals a new curve. Nothing is saved, and there is no clock.
  `npm test` reads every formula on screen back as maths and checks the product
  rule against a nudge of y and each slip against what it gets wrong.
- **🪜 Ladder Workshop** — related rates on the battles' own ladder. Its length
  never changes, so x² + y² = L², and differentiating in time gives y′ = −x·x′/y:
  the top always moves x/y times as fast as the foot. Slide the foot out and the
  readout finds the top's height and speed, compares it with the foot's, and
  checks it against how far the top really falls in the next 0.01 s. The drawing
  shows the ladder and the two speeds as bars to one scale. Three ladders and
  four things to find, from a whole-number 3-4-5 ladder to the place near the
  ground where the top's speed is changing so fast that even 0.01 s shows it.

  **🎯 Which speed?** turns the workshop round: a whole-number ladder, its
  foot x m out and sliding away at x′ m/s, its top y m up, and four numbers,
  one of them the top's speed y′ = −x·x′/y. The rule is stated first, with
  where it comes from: differentiate x² + y² = L² in time. The wrong numbers
  are the slips people make with it: the minus left off; x and y swapped; the
  foot's speed left out; −x′, as if the top kept pace with the foot; and the
  ladder's length where its height belongs. A 0 is never offered, the speed is
  a whole number about half the time, and another number of its form always
  stands beside it. A wrong pick is shut and checked against
  x·x′ + y·y′ = 0, which it fails, so the ladder would be changing length;
  the right pick works −x·x′/y and passes it. Nothing is saved, and there is no
  clock. `npm test` reads every number back off its button as an exact
  fraction, checks it against the slip it is named as, checks the right one
  against how far the top really falls when the foot moves a hair, and works
  every x·x′ + y·y′ in the readout again.
- **🕳️ Null Space Workshop** — set an arrow v by hand and watch a matrix move
  it, with Av worked row by row. On a flat or steep matrix the second row is a
  multiple of the first, so every Av lands on one gold line, the column space,
  and a whole line of arrows is crushed to ⟨0, 0⟩, drawn in red once you find
  one. The full-rank matrix crushes only ⟨0, 0⟩ and can steer Av anywhere.
  The readout ends on rank plus nullity counting the columns. Three matrices
  and five things to find, and a fight where null space, column space or
  rank–nullity falls now offers it.

  **🎯 Which is crushed?** turns the workshop round: a flat matrix A, its
  second row −2, −1 or 2 times its first, and four arrows, one of them in its
  null space. The rule is stated first: v has to dot to 0 with the first row
  ⟨a, b⟩, and ⟨−b, a⟩ does. The wrong arrows are the slips people make with
  it: the first row itself, its entries swapped with no sign changed, a sign
  changed with the entries left in place, and the gold column-space line taken
  for the null space. A wrong pick is shut and dotted with both rows, as the
  workshop dots v, to show where A really sends it. Nothing is saved, and
  there is no clock. `npm test` reads every arrow back off its button, checks
  it against the slip it is named as and that only the right one is crushed,
  and works every dot product in the readout again.
- **📐 Gram–Schmidt Workshop** — u₁ is fixed and u₂ leans along it. Take c
  copies of u₁ away, half a copy at a time, and watch what is left, w = u₂ − c·u₁,
  turn in red. The readout works w and w · u₁ at every step and says which way w
  still leans; each copy taken away lowers w · u₁ by u₁ · u₁, so exactly one c
  leaves w at a right angle, and that c is the shadow (u₂ · u₁)/(u₁ · u₁) and
  gives the shortest w. Three pairs and four things to find, including a pair
  that needs half a copy and one that needs none, and a fight where
  Gram–Schmidt falls now offers it.

  **🎯 Which c?** turns the workshop round: two small arrows u₁ and u₂, and
  four numbers, one of them the c that leaves w = u₂ − c·u₁ at a right angle
  to u₁. The rule is stated first, c = (u₂ · u₁)/(u₁ · u₁), and c is as often
  a fraction as a whole number, written in lowest terms. The wrong numbers are
  the slips people make with it: the fraction upside down, the division left
  out, dividing by u₂ · u₂, and the right size with the wrong sign. A wrong
  pick is shut and worked the way the workshop works w, through
  w · u₁ = u₂ · u₁ − c × (u₁ · u₁), to show which way w still leans. Nothing
  is saved, and there is no clock. `npm test` reads every number back off its
  button as an exact fraction, checks it against the slip it is named as and
  that only the right one leaves w square to u₁, and works every sum in the
  readout again.
- **🧮 Geometric Series Workshop** — add the terms of a + ar + ar² + ⋯ one at
  a time and watch the running total as a staircase of bars, each from one
  total to the next. When |r| < 1 the readout finds the endless sum a/(1 − r)
  and how far the total still has to go, a gap that every term multiplies by
  r, so twelve terms of halves land within a hair of 2. A negative r swings
  the total above and below its sum; r = 2 runs away, and the readout says why
  a/(1 − r) = −1 is not its sum. Four series and four things to find, and a
  fight where geometric series falls now offers it.

  **🎯 Which sum?** turns the workshop round: a first term a and a ratio r
  between −1 and 1, the first four terms written out, and four numbers, one of
  them the endless sum a/(1 − r). The rule is stated first, with why it holds:
  take the first term off and what is left is r times the whole, so
  S = a + rS. The wrong numbers are the slips people make with it: a/(1 + r),
  the sign flipped; 1/(1 − r), with a left out; ar/(1 − r), the sum from the
  second term on; and a × (1 − r), multiplied where it should divide. A 0 is
  never offered, the sum is a fraction about half the time, and another number
  of its form always stands beside it. A wrong pick is shut and checked against
  S = a + rS, which it fails; the right pick works a/(1 − r) and passes it.
  Nothing is saved, and there is no clock. `npm test` reads every number back
  off its button as an exact fraction, checks it against the slip it is named
  as, checks the right one against two hundred terms added one at a time, and
  works every a + r × S in the readout again.
- **〰️ Bend Workshop** — slide a point along a curve, half a step at a
  time, and watch its tangent. The readout works f′ and f″ at the point and
  the slope half a step either side: where the slope rises, f″ > 0 and the
  curve bends up like a cup above its tangent; where it falls, it bends down
  like a cap below it. A flat tangent with f″ < 0 is a hilltop and with
  f″ > 0 a valley floor, which is the second derivative test. Find where the
  S-curve's bend flips over, where the slope bottoms out and the tangent
  crosses the curve, and the point on x⁴/4 where f″ = 0 but nothing flips.
  Three curves and five things to find, and a fight where second derivatives
  or inflection points fall now offers it.

  **🎯 Where does it flip?** turns the workshop round: a cubic
  ax³ + bx² + cx + d with whole numbers, and four numbers, one of them
  x = −b/(3a), where f″ = 6ax + 2b is 0. The rule is stated first, with where
  it comes from: differentiate twice, and c and d drop out. The wrong numbers
  are the slips people make with it: the sign of b lost; the 2 that bx² brings
  down dropped; the 6 that x³ brings down over two slopes dropped; and
  −b/(2a), the middle of a parabola, where a quadratic turns. A 0 is never
  offered, x is a whole number about half the time, and another number of its
  form always stands beside it. A wrong pick is shut and checked by putting
  it into f″, which misses 0; the right pick works f″ out to 0 there. Nothing
  is saved, and there is no clock. `npm test` reads every number back off its
  button as an exact fraction, checks it against the slip it is named as,
  checks on f itself that its bend flips at the right x, and works every
  check in the readout again.
- **🌊 Water Level Workshop** — pour the area under a curve into a flat
  tank of the same width and find the height it settles at. Raise or lower a
  gold level: the readout works the area under the curve, what the level
  holds across the width, the part of the curve sticking up above the level
  and the gaps under it, and says which way to move. They match at exactly
  one height, the average value (1/(b − a))∫f, and the readout shows why the
  middle of the two ends is the answer only for a straight line. Four curves,
  one with an average of 4/3, and five things to find, and a fight where
  average value falls now offers it.

  **🎯 Which level?** turns the workshop round: a quadratic on a whole-number
  interval, its area there and the width given, and four numbers, one of them
  the average value, the area ÷ the width. The rule is stated first. The wrong
  numbers are the slips people make with it: the area itself, not spread out;
  the area ÷ 2, as if it were the average of two numbers; the average of the
  two ends; and f at the middle. The last two work for a straight line and
  miss for a curve that bends. A 0 is never offered, the average is a fraction
  about half the time, and another number of its form always stands beside
  it. A wrong pick is shut and checked by what its level holds across the
  width; the right pick divides and holds the area exactly. Nothing is saved,
  and there is no clock. `npm test` reads every number back off its button as
  an exact fraction, checks it against the slip it is named as, checks the
  area shown against the curve summed in a thousand thin strips, and works
  every product and quotient in the readout again.
- **♾️ Endless Area Workshop** — can a region that goes on forever have a
  finite area? Push the right end b of ∫₁^b dx/xᵖ out, doubling it with each
  press. The readout works the area from the antiderivative and says what
  each doubling added against the one before: half as much under 1/x², a
  quarter under 1/x³, so the doublings form a geometric series and the area
  closes in on 1/(p − 1); exactly ln 2 every time under 1/x, so it runs away
  though 1/x falls to 0; and more each time under 1/√x. A bar per doubling
  and a gold limit line show it. Four curves and four things to find, and a
  fight where improper integrals fall now offers it.

  **🎯 Where does it close in?** turns the workshop round: ∫₁^∞ a/xᵖ dx with
  whole numbers and p from 2 to 7, and four numbers, one of them a/(p − 1).
  The rule is stated first, with where it comes from: integrate out to b,
  raising the power by one and dividing by the new power, then let b run to
  ∞. The wrong numbers are the slips people make with it: dividing by p, the
  power before it is raised; taking the power down instead of up, to
  a/(p + 1); the sign turned round by the 0 − F(1); and multiplying by p − 1
  instead of dividing. A 0 is never offered, the area is a whole number about
  half the time, and another number of its form always stands beside it. A
  wrong pick is shut and checked by the slope of the area out to b, which
  must be the curve itself; the right pick works c × (p − 1) back to a.
  Nothing is saved, and there is no clock. `npm test` reads every number back
  off its button as an exact fraction, checks it against the slip it is named
  as, checks the right one against the area added up by Simpson's rule, and
  works every check in the readout again.
- **🏺 Lathe Workshop** — spin a curve around the x-axis and measure the
  solid it sweeps out with disks. Double or halve the number of slices: each
  slice spins into a disk of radius f at its middle, holding π f(x)² Δx, and
  the readout adds them up against the exact π∫f(x)² dx and says how far off
  they are. The cone and the ball land on (1/3)πr²h and (4/3)πr³, the bowl
  is half its cylinder and so exact that one disk measures it, and the horn
  needs sixteen disks. Four solids and four things to find, and a fight where
  volumes of revolution fall now offers it.

  **🎯 Which volume?** turns the workshop round: a curve y = a·xⁿ, with a
  whole a up to 4 and n one of 1/2, 1, 2 and 3, spun around the x-axis from 0
  to a whole b, and four volumes, one of them π∫ a²x²ⁿ dx. The rule is stated
  first: each slice is a disk holding π y² Δx, so square y first, then raise
  the power by one and divide by the new power. The wrong volumes are the
  slips people make with it: integrating y and not y², squaring after
  integrating, dividing by the power before it is raised, squaring xⁿ but not
  the a in front, and the whole cylinder around the solid. Volumes run up to
  300π, the volume is a whole number of π about half the time, and another
  volume of its form always stands beside it. A wrong pick is shut and checked
  by its slope in b, which must be the end disk, π·y(b)², for every b; the
  right pick works π∫ y² dx out. Nothing is saved, and there is no clock.
  `npm test` reads every volume back off its button as an exact fraction of
  π, checks it against the slip it is named as, checks the right one alone
  against the disks added up over thousands of slices, and works every check
  in the readout again, differentiating each slip's form in b.
- **🔄 Swap Workshop** — u-substitution as a swap. Four integrals, three
  candidate u for each: try one and the readout works out du, then either
  shows the swap absorbing every x into an integral you know, puts x back and
  checks by differentiating, or says why that u leaves the integral no
  simpler. Once the right u is found, the answer is drawn in gold over the
  blue integrand, so its slope can be seen matching the height below it.
  One integral has du off by a constant, to show it can be divided out.
  Five things to find, and a fight where u-substitution falls now offers it.
- **⭕ Implicit Slope Workshop** — y′ without solving for y. Step a point
  round a circle, an ellipse and a tilted curve x² + xy + y² = 7. The readout
  differentiates both sides, with every y term picking up a y′ by the chain
  rule (and the xy term by the product rule), works y′ at the point, and
  checks it with a nudge along the curve. On the circle the dashed radius
  shows the tangent meeting it at a right angle; where the formula divides by
  0 the tangent stands straight up. Four things to find, and a fight where
  implicit differentiation falls now offers it.

  **🎯 Which slope?** turns the workshop round: a curve
  a·x² + b·xy + c·y² = k with whole numbers, a whole-number point on it, and
  four numbers, one of them the slope y′ = −(2ax + by)/(bx + 2cy). The rule
  is stated first, with where it comes from: the product rule on xy and the
  chain rule on y². The wrong numbers are the slips people make with it: the
  minus left off; the fraction upside down; xy taken to x·y′ alone, or to y
  alone; and the 2s the powers bring down forgotten. A 0 is never offered,
  the slope is a whole number about half the time, and another number of its
  form always stands beside it. A wrong pick is shut and checked against
  2ax + by + (bx + 2cy)·y′ = 0, which it fails, so the point would run off
  the curve; the right pick works the top and bottom out and passes it.
  Nothing is saved, and there is no clock. `npm test` reads every number back
  off its button as an exact fraction, checks it against the slip it is named
  as, checks the right one against the curve's real slope, found by solving
  for y a hair either side of the point, and works every check in the readout
  again.
- **✂️ Parts Workshop** — integration by parts as a split. Four integrals,
  two or three ways to split each into u and dv. Try one and the readout
  works out du and v and writes uv − ∫ v du, then either finishes the
  integral left, puts it together and checks it by the product rule, or says
  why the split made things worse or, with a dv nobody can integrate, never
  got started. ∫ ln x dx shows the hidden dv = dx. Six things to find, and a
  fight where integration by parts falls now offers it.
- **🔍 Eigenvalue Detective** — the characteristic polynomial, found by
  stepping. Pick a matrix, step λ by halves, and the readout works out
  A − λI and its determinant. Where that is 0 it names the eigenvalue,
  multiplies out the arrow A − λI crushes, and finds the other eigenvalue
  from the trace. The curve traced is λ² − (trace)λ + det A, crossing λ = 0
  at det A. A triangular matrix wears its eigenvalues on its diagonal, one
  matrix has a single eigenvalue counted twice, and a turning matrix's curve
  bottoms out above the axis: no real eigenvalues. Five things to find, and
  a fight where the characteristic polynomial or the trace falls now offers it.

  **🎯 Which λ?** turns the detective round: a 2×2 matrix A, and four pairs
  of numbers, one of them its eigenvalues. A is built as P·D·P⁻¹ with whole P
  of determinant ±1, so every entry and both eigenvalues are whole numbers,
  and it is never triangular, so its diagonal gives nothing away. The wrong
  pairs are the slips people make: reading the diagonal off as if A were
  triangular, flipping the sign of the trace term so both eigenvalues come out
  turned round, and taking the trace and the determinant themselves, which
  are what the eigenvalues add up to and multiply to. No curve is drawn until
  a miss, since the curve would show the answer. A wrong pick is shut and
  checked against det(A − λI) at its own two numbers, and the curve is drawn
  with gold rings on the axis at the eigenvalues and red dots at the wrong
  pair, off the axis, or one on it when a slip happens to share one. The
  four are lettered P to S, so none shares a name with A. Nothing is saved,
  and there is no clock. `npm test` solves every matrix by the
  quadratic formula, reads every pair back as its slip, and reads the curve,
  the rings and the dots back off the picture's own ticks.
- **🗺️ Hillwalker Workshop** — the directional derivative, by turning on a
  hillside. Stand on a hill, turn to face a heading û of length 1, and the
  readout works the slope that way as ∇f · û, checks it with a nudge, and
  reads off cos θ. Facing east or north it is just a partial derivative;
  along ∇f it is all of ‖∇f‖, the steepest climb; at a right angle it is 0,
  walking the contour; against ∇f it is the steepest drop. On an oval bowl
  the steepest way up is not straight away from the bottom, and a saddle has
  level headings through its pass. Five things to find, and a fight where the
  directional derivative or a partial derivative falls now offers it.

  **🎯 Which slope?** turns the workshop round: a hill f(x, y) = px² + qy²,
  with p and q whole and up to 3 either way, so bowls, domes and saddles, a
  whole point on it, and a heading û of length 1 off the axes, and four
  numbers, one of them the slope that way, ∇f · û. The rule is stated first:
  find ∇f = ⟨2px, 2qy⟩, then multiply part by part with û and add. The wrong
  numbers are the slips people make with it: a heading of length 5 not
  divided down, the parts paired the wrong way round, only the east part or
  only the north part, and the 2 a square brings down forgotten. A 0 is never
  offered, the slope is a whole number about half the time, and another
  number of its form always stands beside it. A wrong pick is shut and
  checked by a step of 5 along û, whose rise is always 5 times the slope plus
  the bend pu² + qv²; the right pick works ∇f · û out. Nothing is saved, and
  there is no clock. `npm test` reads every number back off its button as an
  exact fraction, checks it against the slip it is named as, checks the right
  one alone against f nudged a hair along û, and works every step, height and
  bend in the readout again.
- **♟️ Cofactor Workshop** — a 3×3 determinant, expanded along any row or
  column you pick. The readout strikes out each entry's row and column,
  works the 2×2 minor left behind, takes its sign from the checkerboard
  + − + / − + − / + − +, and adds the terms; a 0 on the line kills its term
  without working its minor. Every line agrees, so the clever pick is the one
  with the most zeros. A triangular matrix is just its diagonal multiplied,
  and a matrix whose third row is 2 × row 2 − row 1 flattens space and comes
  out 0. Five things to find, and a fight where the 3×3 determinant falls now
  offers it.

  **🎯 Which det A?** turns the workshop round: a 3×3 matrix with two or
  three zeros in it, and four numbers, one of them det A. The rule is stated
  first. The wrong numbers are the slips people make expanding it: every term
  along row 1 added with a + sign, each 2×2 minor worked as ad + bc, just the
  diagonal multiplied, only the three Sarrus diagonals that run down to the
  right, and the checkerboard started with a minus. A 0 is never offered,
  since det A is never 0 here. A wrong pick is shut, named as its slip and
  worked on this matrix, and the line with the most zeros is pointed out; the
  right pick works det A along that line, minor by minor. Nothing is saved,
  and there is no clock. `npm test` reads every number back off its button,
  checks it against the slip it is named as and against det A worked by
  Sarrus' rule, and works every minor and every sum in the readout again.
- **🙈 Cover-up Workshop** — partial fractions by choosing x. Clear the
  fractions and the equation left holds for every x, so step x along and keep
  the equations you want: where one factor is 0, every term but one vanishes
  and its unknown drops straight out, even though f itself is not defined
  there. Two ordinary x values solved together work too. Three factors fall
  to their three roots, and a repeated factor can only be covered up once, so
  it needs one ordinary equation as well. Once every unknown is found the
  pieces are drawn over f and integrated one by one. Five things to find, and
  a fight where partial fractions fall now offers it.

  **🎯 Which A?** turns the workshop round: a fraction
  (px + q)/((x − r)(x − s)) with whole numbers, split as
  A/(x − r) + B/(x − s), and four numbers, one of them A = (pr + q)/(r − s).
  The rule is stated first, with where it comes from: clear the fractions and
  at x = r the B term vanishes. The wrong numbers are the slips people make
  with it: B in A's place; the leftover factor taken the wrong way round; the
  other root put into the top; the top left undivided; and x = −r, the sign
  of the factor misread. A 0 is never offered, A is a whole number about half
  the time, and another number of its form always stands beside it. A wrong
  pick is shut and checked against the cleared equation at x = r, which it
  fails; the right pick works the top and what is left of the bottom out and
  passes it. Nothing is saved, and there is no clock. `npm test` reads every
  number back off its button as an exact fraction, checks it against the
  slip it is named as, checks that the right A and its B add back to f at a
  spread of x, and works every check in the readout again.
- **🍞 Slice Workshop** — a double integral, one variable at a time. Hold x
  still and the solid under f(x, y) over a rectangle is cut into slices, each
  an ordinary integral in y; step the slice along and the swept areas add up
  to the double integral. Hold y still instead and the total comes out the
  same. On x² every slice one way is alike, and on x + y one slice is exactly
  the average. Five things to find, and a fight on double integrals now
  offers it.
- **✍️ Slope Tracer Workshop** — the derivative as a curve of its own. Step
  along sin x, cos x, eˣ or ln x; at each stop the tangent's slope is worked
  out with a nudge either side and marked as a gold dot at that height. Mark
  every stop on sin x and the dots trace cos x, drawn dashed through them;
  those of eˣ land on eˣ itself, and ln x has slope 2 at x = ½. Six things to
  find, and a fight on trig or exponential derivatives now offers it.
  Its second mode, **🧩 Which is f′?**, turns it round: see f, and pick which
  of three graphs is its slope. The wrong two are the usual slips: f itself,
  f′ upside down, f′ slid sideways, or f″. A wrong pick is shut and explained
  at the x where it breaks the rule, with that spot marked on f and on the
  graph; a right one deals a new f, on a line, a parabola or a wave. Nothing is
  saved, and there is no clock.
- **➡️ Arrow Workshop** — vectors as arrows. Stretch u by k, walk v from its
  tip if you like, and the green arrow w goes straight to where you land. Its
  length is Pythagoras on the right triangle under it, dividing by that length
  gives the unit vector, and stretching by k stretches the length by |k|.
  Adding u and v shows that lengths do not add the way parts do. Six things to
  find, and fights on adding, scaling, length and unit vectors now offer it.
- **🌅 Horizon Workshop** — limits at infinity. Step x out from 1 to a million,
  ten times further each press, and watch a fraction's biggest terms take over
  from the rest. Equal powers head for the ratio of their numbers, a bigger
  power underneath crushes f to 0, and a bigger power on top sends it off for
  ever. A slow starter dips below 0 before settling on 3, because the biggest
  terms only decide f once they outgrow the rest. Five things to find, and a
  fight on limits at infinity now offers it.

  **🎯 Where does it head?** turns the workshop round: a fraction with the
  same power on top and underneath, x² or x, and four numbers, one of them
  where f heads as x grows without end. The rule is stated first: the
  biggest powers take over, so f heads for the ratio of their numbers. The
  wrong numbers are the slips people make: turning the ratio upside down,
  taking the plain numbers (f at 0), putting in x = 1, taking the x numbers
  when x² rules, or mixing the top's x² with the bottom's x. No number is 0,
  about half the answers are whole and half fractions, half are below 0, and
  a wrong number of the same form and one of the same sign always stand
  beside the right one. A wrong pick is shut and checked: if f headed for
  that number, the gap f(x) − L would shrink to 0, but the biggest-power part
  of its top is not 0. The right pick divides top and bottom by the biggest
  power. Nothing is saved, and there is no clock. `npm test` reads every
  number back off its button, checks it against the slip it is named as,
  checks the right one alone against f at ten million, and works every check
  in the readout again.
- **✖️ Cross Product Workshop** — the cross product, drawn in 3D. Turn v one
  part at a time and watch u × v worked out part by part from the other two
  slots, then checked square to both u and v, its length read as the area of
  the parallelogram they span. Lay v in the floor and u × v points straight up;
  turn v to −u and nothing is square to both; on the target set the general
  form ⟨−v₃, −v₃, v₁ + v₂⟩ says which v hits ⟨2, 2, 1⟩; and swapping the order
  turns the arrow round. Five things to find, and a fight on the cross product
  now offers it.

  **🎯 Which u × v?** turns the workshop round: u and v are shown, small
  whole arrows, and four arrows offered, one of them u × v. The others are the
  slips people make: v × u, the order swapped; every slot added instead of
  taken away; the middle slot worked the wrong way round; and matching parts
  multiplied, as if starting a dot product. A wrong pick is shut, named as its
  slip, and checked the way the rule says, by its dot product with u and with
  v, which u × v makes 0 both times; only the swap passes that test, and it is
  shown pointing the other way. Nothing is saved, and there is no clock.
  `npm test` reads every arrow back off its button, checks it against the slip
  it is named as, and works every product and dot product in the readout again.
- **➗ Quotient Rule Workshop** — the slope of f/g, worked by the quotient rule
  and checked with a nudge. Step x along x²/(x + 1), 1/(x² + 1) or x/(x² + 1)
  and every value goes into (f′g − fg′)/g² in full. Find a flat tangent, the gap
  where g = 0, the top of a bump and where a curve rises, and meet the
  reciprocal rule when f′ = 0. Then try the two slips everyone makes: swapping
  the top gives exactly minus the slope, and forgetting to square g is wrong
  everywhere except where g = 1, where it is right by luck. Seven things to
  find, and a fight on the quotient rule now offers it.

  **🎯 Which dy/dx?** turns the workshop round: y = f(x) / g(x) and four
  formulas, and the player picks the quotient rule. f is x², x, sin x or a
  line, and g is eˣ, x² + 1 or a line (never two lines), kept well away from 0
  across the picture. The wrong formulas are the slips people make: swapping
  the top, which gives exactly minus the slope; dividing by g once instead of
  g²; adding fg′ as the product rule does; or dividing the slopes, f′ / g′.
  Each slip is checked to look wrong at the point drawn on the curve, at least
  10° off, and to differ from every other formula offered. A wrong pick is
  shut and named as its slip, and its slope there is drawn as a dashed red line
  cutting across the curve, beside a nudge of the curve itself; a right one
  works f′ and g′ out and deals a new curve. Nothing is saved, and there is no
  clock. `npm test` reads every formula on screen back as maths and checks the
  quotient rule against a nudge of y and each slip against what it gets wrong.
- **🪃 Antiderivative Workshop** — the power rule run backwards. Guess
  F(x) = c·xⁿ + C by hand, with the power in halves, and its slope F′ is worked
  by the power rule and drawn in green over the target f in gold. Undo 6x²,
  3√x and 1/x²; raise the power but forget to divide and the slope comes out
  three times too big; add a C and the slope does not move, which is why every
  antiderivative ends in + C; and on 1/x find that power 0 would be needed,
  where the rule brings down a 0, the one gap in the power rule that ln x
  fills. Six things to find, and a fight on indefinite integrals now
  offers it.

  **🎯 Which F?** turns the workshop round: f is written out and drawn in
  gold, and four F are offered, one of them its antiderivative. Powers run from
  x⁻² to x⁴, halves included, so every F is a number times a power of x in
  simple fractions. The wrong F are the slips people make: raising the power
  but never dividing by it, dividing by the old power instead of the new one,
  multiplying by the new power, and taking the slope of f instead of undoing
  it. The rule says to check by the slope, so a wrong pick is shut, its slope
  worked by the power rule beside the right F's, and drawn in red off f.
  Nothing is saved, and there is no clock. `npm test` checks every F on screen
  against the slip it is named as, works each slope again from the button, and
  reads f and the red slope back off the picture's own ticks.
- **🪞 Transpose Workshop** — rows into columns, by hand. Pick up each
  entry of A and put it down in Aᵀ; a slot only takes the right number, and
  when it turns one away it says where that entry belongs and why. Copy an
  entry to the same spot and the slip is named; put a diagonal entry down and
  it stays put; fill a column and it reads as a row of A. A wide 2×3 turns
  into a 3×2, a square one swaps its off-diagonal pair, and a symmetric one
  comes out as itself. Six things to find, and a fight on transposes now
  offers it.

  **🎯 Which Aᵀ?** turns the workshop round: A is shown, wide, tall or
  square, with its main diagonal edged in gold, and four matrices offered, one
  of them Aᵀ. Every entry of A is a different whole number, so no slip lands
  on Aᵀ by luck. The wrong matrices are the slips people make: A copied as it
  was, A's entries poured into the new shape row by row, A flipped across the
  other diagonal, and A turned a quarter turn. A wrong pick is shut, the
  entries it has out of place turn red, and one of them is checked against A.
  The four are lettered P to S, so none shares a name with A. Nothing is
  saved, and there is no clock. `npm test` reads every matrix back
  from both its name and its cells, checks it against the slip it is named
  as, and checks that the red cells are exactly the entries out of place.
- **🔑 Diagonal Workshop** — build P from two arrows by hand and watch
  P⁻¹AP worked out exactly. Each column of P that is an eigenvector clears
  its own column of P⁻¹AP down to its eigenvalue, so one eigenvector clears
  half and two independent ones leave a diagonal D, in the order P's columns
  came in: swap them and D swaps too. Two arrows on one line leave P with no
  inverse, and a shear has only one line of eigenvectors, so no P
  diagonalises it. Six things to find, and a fight on diagonalisability now
  offers it.

  **🎯 Which Aⁿv?** turns the workshop round: a matrix A built from two
  eigenvectors p₁ and p₂ with whole eigenvalues, a vector v = a·p₁ + b·p₂,
  and four vectors, one of them A², A³ or A⁴ times v. The rule is stated
  first: A only stretches an eigenvector, so Aⁿv = a·λ₁ⁿ·p₁ + b·λ₂ⁿ·p₂. The
  wrong vectors are the slips people make with it: A applied only once, each
  eigenvalue paired with the other eigenvector, a and b raised to the power
  too, each eigenvalue multiplied by n instead of raised to it, and a and b
  forgotten. The zero vector is never offered and no entry runs past 200. A
  wrong pick is shut and checked by writing it in eigenvector parts, which do
  not hold what Aⁿv must. The right pick works Aⁿv out part by part. Nothing
  is saved, and there is no clock. `npm test` reads every vector back off its
  button, checks it against the slip it is named as, checks the right one
  alone against A multiplied into v n times, and works every check in the
  readout again.
- **🎢 Trig Integral Workshop** — undo a sine or cosine wave by guessing F
  and watching its slope, worked by the chain rule. Pick the wave and the
  number in front, and the green slope lands on the gold target only when
  both are right: the slope of sin is cos and of cos is −sin, and the k
  inside comes out in front, so integrating has to divide by it. Multiplying
  by it instead is named as the slip, a minus in front is followed through,
  and sin(x/2) shows dividing by a half doubling. Seven things to find, and a
  fight on trig integrals now offers it.

  **🎯 Which c?** turns the workshop round: a wave a·cos(kx) or a·sin(kx)
  with whole numbers, its antiderivative written c·sin(kx) or c·cos(kx), and
  four numbers, one of them c = a/k for a cosine or −a/k for a sine. The rule
  is stated first, with where it comes from: the chain rule run backwards,
  and the minus that the slope of cos carries. The wrong numbers are the
  slips people make with it: multiplying by k instead of dividing; leaving k
  out; the minus got wrong; and k/a, the division turned over. A 0 is never
  offered, c is a whole number about half the time, and another number of its
  form always stands beside it. A wrong pick is shut and checked by
  differentiating its F back, which misses the wave; the right pick works its
  slope out and lands on the wave. Nothing is saved, and there is no clock.
  `npm test` reads every number back off its button as an exact fraction,
  checks it against the slip it is named as, checks that the slope of the
  right F lands on the wave at a spread of x, and works every check in the
  readout again.
- **🪁 Tangent Plane Workshop** — build the plane that touches a surface
  from three numbers: the height at the point and a slope along each axis.
  Two slices, one along x and one along y, show the green plane against the
  gold surface, and each slope is worked from its own slice, where only one
  term changes. Right slopes at the wrong height, one slice touching and the
  slopes swapped are each named, and a bowl, a saddle, a lopsided bowl and a
  dome are touched in turn. Seven things to find, and a fight on tangent
  planes now offers it.

  **🎯 Which plane?** turns the workshop round: a surface ax² + cxy + by²
  with a cross term, a whole point, and four planes z = h + p(x − x₀) +
  q(y − y₀), one of them the tangent plane. The rule is stated first: the
  height by putting the point into f, then f_x with y held still, so cxy has
  slope cy along x, and f_y the same way. The wrong planes are built two ways
  at once, one slip in the height (not squaring, the point put in the wrong
  way round, or the cxy term left out) and one in the slopes (swapped, the 2
  forgotten, or the cxy term dropped): one plane has the height wrong, one
  the slopes and one both. So every plane shares its height with one other
  and its slopes with another, and none can be picked by agreeing with the
  rest. A wrong pick is shut and checked at the point for a wrong height, or
  by a step of 1 along x or y, where the surface sits exactly its x² or y²
  number above a plane that touches. The right pick works the height and both
  slopes out. Nothing is saved, and there is no clock. `npm test` reads every
  plane back off its button, checks it against the slip it is named as,
  checks the right one alone against f nudged a hair along x and along y, and
  works every check in the readout again.
- **🪩 Inverse Slope Workshop** — see arcsin, arccos and arctan as sin, cos
  and tan mirrored in the line y = x. Step u along and watch the point (x, u)
  on f land at (u, x) on g; mirroring swaps rise and run, so g′(u) = 1/f′(x),
  with f′ taken at x = g(u). Each slope is checked with a nudge. Forgetting to
  flip and flipping at u instead of x are both caught, arcsin's tangent stands
  straight up at u = 1, and forgetting to flip is right by luck where f′ is 1.
  Seven things to find, and a fight on inverse trig derivatives now offers it.

  **🎯 Which slope?** turns the workshop round: a rising curve f(x) =
  (x³ + bx + c)/d, a whole point x that f sends to a whole u, and four
  numbers, one of them g′(u), the slope of the inverse there. The rule is
  stated first: differentiate f, put in x (not u), and flip. The wrong
  numbers are the slips people make: not flipping, taking f′ at u, forgetting
  the /d, the 3 that x³ brings down, or the slope of the bx term. Every number
  is above 0, about half the answers are whole and half fractions, and a
  wrong number of the same form always stands beside the right one. A wrong
  pick is shut and checked by the chain rule: g(f(x)) = x has slope 1, so
  g′(u) × f′(x) must be 1, and the slip's number times f′ is not. The right
  pick works f′ out at the point and flips it. Nothing is saved, and there is
  no clock. `npm test` reads every number back off its button, checks it
  against the slip it is named as, checks the right one alone against the
  inverse solved for a hair either side of u, and works every check in the
  readout again.
- **🪵 Log Slope Workshop** — differentiate xˣ, x²ˣ and x^(1/x), where x is
  in the base and in the power at once. Take ln of both sides to bring the
  power down, differentiate with the product rule, then multiply back by y,
  and check each slope with a nudge. The power rule and the exponent rule are
  each offered as a slip and caught missing half the slope, and added together
  they make the whole of it. Find the bottom of xˣ at 1/e and the top of
  x^(1/x) at e. Seven things to find, and a fight on logarithmic
  differentiation now offers it.
- **🛤️ Path Chain Workshop** — walk a point along a path over a hill
  z = f(x, y) and watch dz/dt come from two parts: the x part
  (∂z/∂x)(dx/dt) and the y part (∂z/∂y)(dy/dt), drawn as bars that add up,
  with each rate checked by a nudge. Keeping only one part, or forgetting the
  speeds dx/dt and dy/dt, is offered as a slip and caught. Find where the parts
  cancel on a circle, the top of a path, a tug of war the y part wins, and the
  point where forgetting the speeds is right by luck. Seven things to find, and
  a fight on the multivariable chain rule now offers it.

  **🎯 Which rate?** turns the workshop round: a hill z = k·xᵐ·yⁿ, with k up
  to 3 and the powers xy, x²y or xy², a path x = αt + β, y = γt² + δ with
  whole numbers, and a whole t, and four numbers, one of them dz/dt there.
  The rule is stated first: dz/dt = (∂z/∂x)(dx/dt) + (∂z/∂y)(dy/dt), each
  partial by the power rule and each speed by differentiating the path. The
  wrong numbers are the slips people make with it: only the x part, only the
  y part, the two slopes added with the speeds forgotten, each slope paired
  with the other letter's speed, the power not brought down, and the 2 that t²
  brings down forgotten. A 0 is never offered and nothing runs past 300. A
  wrong pick is shut and checked by nudging t a hair either way: z really
  rises by about so much, and the slip's number times the nudge does not
  match it. The right pick works both parts out. Nothing is saved, and there
  is no clock. `npm test` reads every number back off its button, checks it
  against the slip it is named as, checks the right one alone against z put
  along the path and nudged, and works every nudge, height and rise in the
  readout again.
- **🪴 Growth Integral Workshop** — fit an antiderivative of e^(kx) to its
  slope field. Short dashes show the slope f(x) wherever you stand; pick the
  number in front of F and a lift + C, and F turns green when it runs along
  every dash, with F′ worked by the chain rule and checked by a nudge. Undo
  e^(2x), e^(−2x) and e^(x/2), catch the slip of multiplying by k instead of
  dividing, and the slip of raising the exponent as the power rule would, see
  a lift keep every slope, and find the one curve through (0, 1). Seven things
  to find, and a fight on integrating eˣ now offers it.

  **🎯 Which number in front?** turns the workshop round: ∫ a·e^(kx) dx =
  c·e^(kx) + C with whole numbers, a up to 12 either way and k from 2 to 6
  either way, and four numbers for c, one of them a/k. The rule is stated
  first: run the chain rule backwards, so c × k must be a, and the exponent
  stays as it is. The wrong numbers are the slips people make with it:
  multiplying by k instead of dividing, leaving the k out, dividing the wrong
  way round, treating e^(kx) like a power of x and dividing by k + 1, and the
  sign turned round. A 0 is never offered, c is a whole number about half the
  time, and another number of its form always stands beside it. A wrong pick
  is shut and checked by the chain rule; the right pick works c × k back to
  a. Nothing is saved, and there is no clock. `npm test` reads every number
  back off its button as an exact fraction, checks it against the slip it is
  named as, checks the right one alone by nudging c·e^(kx) and comparing its
  slope with the exponential, and works every check in the readout again.
- **🎯 Training Grounds** — practise any single topic with no combat, no damage, and no
  gold. Adaptive drills sit at the top: **Bring back what's fading** is the map's review
  round, **Drill my weakest** pulls from your six worst topics as you know them now, and
  **Review what's due** pulls whatever the spaced-repetition schedule says has gone stale.
  None requires you to know what you're bad at, and every topic's label there reads what
  you know today rather than the day you last practised.
- **📜 Chronicle** (on the Gear screen) — the five topics that need you most now (a topic
  that has slipped while you were away rises to the top), in full, then
  the other sixty-five folded into their strands. Each strand shows either its average
  mastery or how many of its topics need work, so you can see where you stand without
  reading seventy bars.
- **🧭 Competency Map** (from the map, or the Ledger) — every topic on its rung, strand by
  strand, with what each strand builds on and where you are on each track.
- **Seventy topics that stay reachable.** Both the Chronicle and the Training picker group
  topics into seven strands you tap open; opening one closes the rest and pulls it to the
  top, so the list never grows out from under your thumb. Measured at 320×568, the furthest
  topic is 1.1 viewports away in Training and 1.5 in the Chronicle — a flat list of all
  seventy runs to 6.3.
- **The loudest celebration in the game is for learning, not looting.** When a topic
  crosses into mastery you get a full-screen MASTERED callout and a fanfare — the same
  treatment a level-up gets. It fires once per topic, and can be lost and re-earned if
  your accuracy on it falls away.
- **Titles** — thirteen milestones, most tied to understanding rather than grinding
  (*Polymath* for ten topics mastered, *Grand Magister* for all 70), plus a daily practice
  streak, because spaced practice is how this material actually sticks.

---

## Settings and accessibility

Reachable from the title screen and the map (⚙️).

| Setting | Effect |
|---|---|
| 🔊 Sound | All synthesised audio. Off by default is never assumed — it respects your choice. |
| ✨ Full motion | Screen shake, hit-stop, camera punch, slow-motion and particle volume. Turning it off keeps the game fully playable and legible; it defaults to off if your OS asks for reduced motion. |
| 📳 Haptics | Vibration on hits and rewards, where the device supports it. |
| 🧮 Scratch pad | The in-fight calculator, with **Keep** to pin a result beside the question. On by default. |
| 📖 Step-by-step lessons | New and faded topics are taught up the four rungs. Off asks everything in the four-answer form. On by default. |

Verified free of horizontal overflow and undersized tap targets at 320×568, 375×667,
390×844, 414×896, 768×1024 and 844×390 (landscape).

---

## Project layout

```
index.html                             the entire game — open this to play
manifest.webmanifest, sw.js            make it installable and playable offline
icons/                                 generated; run tools/make-icons.js
build-scriptable.js                    packages index.html into the iOS script
scriptable/KnightsOfTheEigenrealm.js   generated; paste into Scriptable
ios/                                   the native iPhone app — open Eigenrealm.xcodeproj
tools/verify.js, tools/play.js         the checks: `npm test` and `npm run test:play`
tools/mutate.js, tools/mutations.json  breaks the latest change's guards to prove a check notices
```

Inside `index.html` the code is organised as:

| Section | Role |
|---|---|
| `GEN` | the 70 problem generators; each returns a question, answer, explanation, and distractors tagged with the mistake they represent |
| `REALMS`, `WEAPONS`, `ARMORS`, `ITEMS`, `TOME` | all game content, as plain data |
| `STRANDS` | the seven strands topics are grouped into; the Training picker and the Chronicle both fold into them |
| `Mastery` | per-topic mastery model, spaced-repetition schedule, the fading list across days, and weighted topic selection |
| `Figure` | the six diagram kinds; a generator declares `fig` and/or `figAnswer` as plain data |
| `Arena`, `BOONS` | endless mode: wave scaling, generated foes, and the run-scoped boon draft |
| `SETTINGS`, `VOICES`, `SETTING_ORDER` | the eight settings as plain data: curve, room plan, strands, material, and the words each place is spoken about in |
| `Dungeon` | the descent shell: the fork, the checkpoint, resuming, and every foresight reading |
| `RoomKinds` | the room contract — nine kinds, each a pure seeded `build` and an `enter` that reports an outcome the shell applies |
| `Sigil`, `Forage`, `Scribe`, `Hold`, `Seam`, `Wager` | the rooms themselves: ward-stone, thicket, scriptorium, cargo hold, seam, table |
| `SKILL_ABILITIES`, `Loadout` | the ten carried abilities, and the mastery bands their charges are read from |
| `PASSAGE_SKILLS`, `Passage` | the four skills that are never carried: salvage, guard, memory, and where a climb starts you |
| `MATERIALS`, `Crucible` | the four currencies, and Alchemy's diffusion bench that converts between them |
| `Working` | turns any question into numbered steps — the mote ladder where one exists, otherwise the instance's own explanation — and cuts its first step into a nudge that stops short of the answer |
| `A11y` | makes every element with a click handler a named button in the tab order, as the page loads and as anything is drawn after, and presses it on Enter or Space before any other key handler hears the key; notes whether focus last moved by Tab or by a pointer |
| `Slips` | counts each misconception a knight repeats in a topic this sitting, for the "same slip as last time" and "not caught this time" notes |
| `FORGE`, `RUNES`, `APOTHECARY`, `SCRIPTORIUM` and their modules | the Keep's four spending benches |
| `ROOMS`, `Rooms` | the Keep: the hub, what each door says, each room's drawn scene, and the bench lists |
| `ROOM_STYLES`, `Quarters` | the knight's own room: trophies read off cleared champions, colours and crest on the roster, and room styles opened by play |
| `Brew` | the Apothecary's mix: draws independent herbs, builds a target from hidden parts, and hands a right mix to the bench |
| `RULES`, `Lesson` | a rule card for every topic, and the ladder a topic is asked up — rung read off faded mastery, the true-or-false and three-answer steps, and the tile-and-slot build, and find the slip (`slipStep`) |
| `WaveEngine` | one foe curve for every setting — ramp, swell, thin air and champions in one place |
| `Codec` | the knight code: a binary save encoder, base32 and checksummed, small enough for a QR |
| `DESTINATIONS` | what the map offers and in what order, as a table rather than hand-written blocks |
| `Profiles`, `Knights` | one save slot per player on a shared browser, plus the code that carries a knight to another device |
| `Vault` | the second copy of every save, in IndexedDB, and the recovery that puts it back |
| `Keep` | service-worker registration, the update prompt (offered for a build found now, one left waiting, and one found when the game comes back into view), and the install nudge |
| `Calc` | the scratch pad: a keypad and a small expression evaluator that never calls `eval` |
| `Game` | state, saving to `localStorage`, save migration, levelling |
| `Anim` | the canvas render loop: knights, foes, lunges, particles, damage numbers, screen shake |
| `Talk` | what foes say as a fight opens, when a blow lands either way, at a streak of five, when nearly beaten and on the killing blow, repeated in the verdict; a voice for each kind of foe and one for each realm boss |
| `Battle` | turn flow, damage maths, victory and defeat; shared by campaign and arena via `mode`; after a miss, asks one fresh question on the same topic next (`redo`) |
| `Competency` | the competency map: each topic's rung read off effective mastery, strand scores, prerequisites and where you are on each track |
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
the Abyss, snow on the Citadel, rising shards in the Reach and on the Summit, drifting
motes in the Expanse and gold dust in the Arena. The two silhouette layers are
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

Give it a `codex:{rule, eg}` — one sentence of rule (200 characters at most) and one small
worked instance — or add one to `RULES`. Every topic must have one, because it is what a
first meeting shows; the `lesson` suite fails if any is missing. If the answer is a whole
number, a row vector or a matrix it can be built from tiles automatically; if it has more
than one right form (any multiple of an eigenvector, say), add the key to
`Lesson.NO_BUILD`.

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
npm run test:play   # play the game in a browser
npm run test:all    # both
```

`npm test` covers what can be checked without a browser — the mathematics below, and
the knight codec. It first parses the whole page script, because its other checks lift
pieces of it, and a slip outside those pieces would pass them all and still stop the page
loading. `npm run test:play` covers what cannot: it drives the real
`index.html` in Chromium, because there is no build step to import across and the run
loop only exists once the page is running. A hundred and twenty-four suites, about 5,100 checks, about a minute:

| suite | what it holds to |
| --- | --- |
| `save` | a save bumps its revision; the backup is reconciled newest-first; a v1 code still reads |
| `wave` | the arena's foe curve is byte-identical to a pinned snapshot |
| `lock` | a chest opens or snaps a pick, never ends a run, and always moves mastery |
| `run` | quit in room three, reload the page, resume the *same* room three |
| `frontdoor` | a blank browser reaches a finished first run, at 320px, through buttons alone |
| `adapt` | difficulty, topic choice and teaching all track effective mastery |
| `skills` | charges come from mastery and nothing else; no ability makes a fight shorter |
| `chain` | ore out of the Deep, runes back into it — the material loop closes |
| `foresight` | a reading names the room you actually meet, every time |
| `tavern` | the odds printed on a stake are the odds the stake pays at |
| `passage` | permanent skills are true of you everywhere, and fade with the maths |
| `rumours` | what a stranger sells is true of the rooms it describes |
| `summit` | thin air gives the climb a top, and the top rises with skill |
| `sigil` | a ward is cut out of the strand Ward is made of, and rides on the run |
| `wilds` | the ground turns on a period, and what Tracking says about it is true |
| `thicket` | riddles buy basket, the basket is spent, and it cannot be overfilled |
| `sea` | the forecast is true of water that is drawn rather than derived |
| `library` | the stacks age the questions, and pages buy recency but never mastery |
| `crucible` | the rate follows the gradient, a round trip always loses, and a pour never buys mastery |
| `working` | being shown the steps costs the strike and moves nothing in the mastery model |
| `nudge` | across every topic at every difficulty a nudge exists and never contains the answer, nor is it the working entire; a length, a dot product and a derivative are set up and left open, and a ladder asks its first rung; the rule stands in when nothing survives the cut, and nothing is offered when the rule would leak; in a fight it is offered once, shown above the choices, fits a phone, and costs half the strike and half the credit; it does not follow into the next question; it is not offered on a ladder, a first meeting, a true-or-false rung or in the daily; nothing is saved |
| `a11y` | on the title screen and every screen a knight walks through, everything that can be tapped is a named button in the tab order; Enter and Space press a door and a settings row with real keys; the nudge and working doors drawn mid-fight are buttons too, and Enter takes the nudge without answering; a key that presses a control does not also continue past the verdict; Enter on a native button Tabbed onto presses it and not Continue, while Enter after a click still moves on; the verdict is read out when it lands; number keys still pick an answer; a focus ring is styled; nothing is saved |
| `findslip` | a held topic can be asked as find the slip, tagged, with the squire's answer and the question; three different mistakes, all this question's own diagnoses, the right pick being the diagnosis of the answer shown; none marked a trap; a matrix in the claim keeps its shape; no Perfect Strike, the working still offered; a right pick strikes, counts whole and lays out all three with the squire's marked and the answer done right; a wrong pick is struck, is not recorded as a slip of the knight's own, and brings one like it; never on a topic not yet held, nor with lessons off; a diagnosis quoting an answer sends the question back to plain; a mistake sharing more of the squire's words than the others is caught as an echo, a tie or a shared word singles nothing out, and the squire never gives an answer whose own slip echoes it; about one in five; never on a ladder or in the daily; the yard asks and explains it the same way; nothing is saved |
| `talk` | every kind of foe has a line for every moment and every boss its own, none too long for the bubble; a foe speaks as the fight opens, in its own voice, with a boss's line its own; the bubble is hidden from screen readers, fits the scene at 320px even at its longest line and goes away by itself; a landed blow draws a gloat, repeated in the verdict and hidden there from screen readers too, a crit a cry and an ordinary hit nothing, with no line carried over from an earlier turn or the opening; a streak of five draws one worry, nearly beaten one plea, and the killing blow last words; a wind-up due on a foe left standing still lands, braced, and one due on a foe the answer beats dies with it; a new fight starts quiet; the daily's straw knight keeps silent and talk never moves the daily's seeded draw; nothing is saved |
| `again` | a miss leaves its topic and difficulty to come again and the verdict says so; the next question is a new one on that topic at that difficulty, marked; a miss on the second go queues no third and the next is drawn as usual; a landed second go is named; a right answer brings nothing back; the shown working brings the topic back and says so; a missed first meeting is left to the lesson ladder; a new fight starts clean; the daily is untouched; nothing is saved |
| `slips` | the same misconception a second time is named as a pattern in the yard and in a fight, a different one is not, walking past the trap is named once and restarts the count, numbers and brackets do not split a slip, topics and knights keep separate counts, and nothing is saved |
| `review` | the map names exactly the topics that have slipped past their review point, most slipped first and the same after a reload; the Ledger and the yard read what you know now; a tap starts a round of just those, a wrong answer keeps a topic in, each right one brings one back, and the round ends when the last is back |
| `competency` | every topic sits on the rung its effective mastery puts it, with lessons on or off, and a faded topic drops; a strand is scored over all its topics; the map node counts what is fluent and is absent for a knight who has met nothing; the map shows all seventy topics once, in curriculum order, each labelled for a screen reader; prerequisites and arrows are drawn only where a strand really builds on another; it fits a 390-pixel phone with full-size targets and each rung on one line; a tap practises a topic; the Ledger leads there; nothing is saved |
| `workshop` | the Tome opens the matrix workshop on the identity; each tap of a real button redraws the plane and the readout, where î and ĵ land, the determinant worked with negatives bracketed and the sign folded in, and the directions kept with their eigenvalues; a goal is ticked when, and only when, the matrix on screen makes it, and stays ticked through Start again; the numbers stop at −4 and 4; every button says which number it moves; Surprise me stays in range; it fits a phone; all nine goals can be made; Match the shape says how to read the dashed picture and never gives the target as numbers, numbers the axes and names the dashed arrows, sizes the view to the shapes, judges each column on its own, counts a match and sets a different, never-flat shape at once, and steps the goals aside until free play is back; nothing is saved |
| `dot` | the Tome opens the dot product workshop on u = ⟨3, 1⟩ and v = ⟨1, 2⟩; the readout works u·v = 5, both lengths, cos θ ≈ 0.707 and θ = 45°, and the gold shadow; nothing is found before anything is turned; v = u gives 10 and is not counted as a different length; a negative turns the shadow back against v; ⟨−1, 3⟩ is perpendicular with no shadow and the caption drops it; exactly opposite reads 180° and exactly along reads 0°, and all six goals are found; the steppers stop at 4, even when pressed past it; Start again keeps the finds; an arrow of length 0 is given no angle; every stepper is named; it fits a phone; nothing is saved |
| `eig` | the Tome opens the eigenvector hunt on the first matrix with v = ⟨1, 0⟩; the readout works Av = ⟨2, 1⟩ and says it is knocked about 27° off v's line; nothing is found before anything is turned; ⟨1, 1⟩ is stretched by 3 and ⟨1, −1⟩ left where it was, each ticked then, and the toast starts with a capital; sums are written with −, never + −; the third matrix flips ⟨1, −1⟩ with λ = −1 and ⟨2, −2⟩ counts as a longer eigenvector; the second matrix's two directions finish all six; the quarter-turn is 90° off and has no real eigenvectors; ⟨0, 0⟩ is never counted; the steppers stop at 2, even when pressed past it; every button is named and each matrix reads its rows; it fits a phone; nothing is saved |
| `compose` | the Tome opens Order Matters on a shear then a quarter-turn; the readout follows î and ĵ through both moves, gives the pair's columns ⟨0, 1⟩ and ⟨−1, 1⟩ and its determinant 1 × 1 = 1, and says the other order lands î on ⟨1, 1⟩, drawn dashed; nothing is found before anything is pressed and the picked moves are shown pressed; a flip twice brings every arrow back, with (−1) × (−1) = 1, and has no other order to try; flip then stretch gives det = −2 and lands the same either way round, which the caption says too; flip then swap is a single quarter-turn; two quarter-turns make a half-turn and finish all six; all ten buttons are named with the move and when; it fits a phone; nothing is saved |
| `limit` | the Tome opens the limit workshop on (x² − 1)/(x − 1) from the right at h = 1; the readout works f(2) = (4 − 1)/1 = 3/1 = 3, says 0/0 at x = 1 is no number, and asks for a smaller h; the figure draws the hole at (1, 2) and the dot on the curve; nothing is found before anything is pressed; h stops at 1 and at 0.001 even pressed past them; at h = 0.01 the working is 0.0201/0.01 = 2.01 and getting within 0.01 is found, with its toast; from the right at 0.001 it heads for 2, and from the left the negatives are bracketed, the sides agree and the limit 2 is named; sin x / x is worked to eight figures and heads for 1; \|x\| / x stays at −1 and at 1, so the limit does not exist; 1/x reaches 1000, is kept inside the picture, and falls without end from the left, finishing all six; a side watched up close is still remembered at h = 1; every button is named; it fits a phone; nothing is saved |
| `descent` | the Tome opens the downhill workshop at (−2, 1) with η = 0.1; the readout works f = (−3)² + 2·2² = 17, ∇f = ⟨−6, 8⟩ and the step to (−1.4, 0.2), and the figure draws the valley, the walk and a dashed next step; nothing is found before anything is pressed; five steps of 0.1 still leave f above 0.5, with its toast; picking a step size starts again; one step of 0.25 lands on y = −1 and seven reach f ≈ 0.0005, and at (1, −1) it says nothing is uphill and the Step button stops; 0.4 zigzags across the floor while f falls from 17 to 3.24; 0.55 climbs on its second step and passes 100 on its seventh, finishing all six; a walk past f = 1000 is stopped and Start again begins it afresh; every step size is named; it fits a phone; nothing is saved |
| `span` | the Tome opens the span workshop on ⟨2, 1⟩ and ⟨1, 2⟩ with a = b = 1; the readout works a·u + b·v = ⟨3, 3⟩, says ⟨1, 2⟩ is still to go and that the pair spans the plane, and the figure walks a·u, then b·v from its tip, with a ring on the target; nothing is found before anything is pressed; one more of v lands on ⟨4, 5⟩, with its toast; the second pair's target takes −2 of v, bracketed, and b stops at −2; with î and ĵ the amounts −2 and 1 are named as the coordinates; the fourth pair works out to (a + 2b)·u, says its target is off the line, makes ⟨0, 0⟩ from −2 and 1, draws the dashed line and no zero-length arrows, and at a = b = 0 remembers the other way to ⟨0, 0⟩, finishing all six; every button is named; it fits a phone; nothing is saved |
| `elim` | the Tome opens the elimination workshop on x + 2y = 5 and 3x + 4y = 11, working on row 2; the readout lists both equations and says the lines cross at (1, 2), and the figure draws both lines with the crossing ringed; nothing is found before anything is pressed; multiplying by 1 and a divide that would leave fractions are not offered; k skips 0 and stops at −3; R2 − 3·R1 is worked entry by entry, says x is gone and to divide by (−2), and is drawn, with its toast; dividing by −2 leaves y = 2 and says the line has not moved; R1 − 2·R2 leaves x = 1 and the system solved; Undo and Start again put rows back; the second system is solved with a swap, an add with a bracketed negative, a divide and an add; the third reads 0 = 2, draws only row 1 and says why; the fourth reads 0 = 0, finishing all six; every button is named; it fits a phone; nothing is saved |
| `undo` | the Tome opens the undo workshop on the shear with B = I; the readout says where A sends î and ĵ, works B on each number by number and says which is home; the caption names the colours and nothing is found before anything is turned; raising B's bottom-right leaves î home and ĵ away, found with its toast; B with rows 1, −1 and 0, 1 brings both home with bracketed negatives and is named A⁻¹; a new A puts B back to I; the quarter-turn and the tilt are undone, and the flip is its own undo; the squash works det A = 0, names ⟨2, −1⟩ landing on ⟨0, 0⟩ and says nothing undoes it, finishing all six; the steppers stop at 2 and −2; every button is named; it fits a phone; nothing is saved |
| `fit` | the Tome opens the best fit workshop on the line-up with y = 0.5x; the readout names the line, works each miss with bracketed negatives, adds the misses and their squares and gives the total one step either way; the figure draws a ring per point, the line and an arrow per miss; y = x misses every point by 1 and y = x + 1 runs through them all; on the scatter y = 0.5x + 2 is the least-squares line through (0, 2), and y = x + 2 has misses adding to 0 yet is beaten; with the far point y = −1 pays 25 against the best line's 10, and y = x is best and tilted by the far point, finishing all six; the steppers stop at their ends; every button is named; it fits a phone; nothing is saved |
| `newton` | the Tome opens the Newton's method workshop on x² − 2 at x₀ = 1 with no steps; the readout names f, f′ and the step rule and says where the first tangent meets the axis; one step is worked from f and f′, reads 1 step and jumps past √2, which it says and explains; three steps reach √2 to four places, writing ≈ for rounded numbers; x₀ = 0 has a flat tangent, no next step and the step button off; on x³ − 2x + 2 the steps from 0 go round 0 and 1 for ever, and from −1.5 they reach its root; on x² − 4x + 3, x₀ = 3 is a root already and does not count, then the roots 1 and 3 are both run down, finishing all six; the steppers stop at their ends; every button is named; it fits a phone; nothing is saved |
| `chainrule` | the Tome opens the chain rule workshop on (3x − 1)² at x = 1; the readout names both links, works u = 2 and y = 4, says u moves 3 times as fast as x and y 4 times as fast as u, multiplies them to 12 and checks it with a nudge from 0.999 to 1.001; at x = 0, y moves the other way, with negatives bracketed; the slip f′(x) × g′(x) is caught out by the nudge and its line cuts across the tangent, and at x = 0.5 it is right only by luck, which it says; on (x² − 1)³, g′(0) = 0 and f′ at x = 1 each stop y, and at x = 2 y moves 108 times as fast as x, finishing all six; the stepper stops at both ends; every button is named; it fits a phone; nothing is saved |
| `castles` | the Tome opens the two castles workshop on Drift with all 100 knights in Castle A; the readout states the rule, writes it as a matrix and says the steady split has 75 in A; the figure draws the steady line and a point per night; one night is worked as what A keeps and gains, and the gap shrinks by 0.6; seven nights list the split and bring A within 1 of 75, writing about for rounded numbers; from 75 nothing changes and the readout names the eigenvector with λ = 1; from 55 it closes in from below; Even reaches 50 in one night with the nights kept from before; Swap flips 55 and 45, and from 50 changes nothing, finishing all six; the steppers stop at their ends; every button is named; it fits a phone; nothing is saved |
| `optim` | the Tome opens the biggest build workshop on the wall paddock at x = 4; the readout states the build, writes A = x(40 − 2x), works 128 m² and half a metre either way, and reads the slope 24; at 5 m it holds 150 m² and says one more width does too, but one width alone is not both; at 10 m the tangent is flat, the figure moves it there, and 200 m² is the most; past it the slope is below 0; at 15 m the second 150 m² width is found; the open paddock starts at its own x and its best is a 10 by 10 square; the box is worked from its base and depth, its slope factors, a 2 cm cut holds 128 cm³, and at 6 cm the flat tangent holds nothing, finishing all six; the stepper stops at its ends; every button is named, the stepper with its unit; it fits a phone; nothing is saved |
| `cistern` | the Tome opens the cistern workshop on the fading spring at hour 1; the readout says the total is the area under the flow with F′ = f, works F(1) = 5, reads the flow and shows a tenth of an hour adding a strip close to f tall; the figure draws both curves, shades to the hour and puts the tangent there; at hour 3 the flow is 0 and 9 barrels is the most; past it the cistern drains while still holding water; at hour 6 it is empty and the area below the axis cancels the 9 barrels above; the steady spring starts at its own hour, fills a rectangle, holds 10 barrels at 2.5 hours and its strip is exactly f tall; the tidal sluice is worked term by term, turns at hour 1 and runs dry at hour 3, finishing all six; the stepper stops at its ends; every button is named; it fits a phone; nothing is saved |
| `hopital` | the Tome opens the L'Hôpital workshop on the square with h = 0.5; the readout says it gives 0/0 at x = 1, finds the slopes 2 and 1 and their ratio, reads the top, bottom and ratio at x = 1.5 and says the curves still bend away; the figure draws both curves and marks their heights; at h = 0.01 the ratio is 2.01, all but the ratio of the slopes, and from the left 1.99; the cube heads for 12/4 = 3 and sin x / x for 1; the last ratio is not 0/0, its readout calls the rule's 4 wrong, and closing in shows it heading for 2, finishing all five; the stepper stops at its ends; every button is named; it fits a phone; nothing is saved |
| `handson` | a fight whose summary shows L'Hôpital's rule and the chain rule falling offers their two workshops by the Tome's names, the biggest fall first, and skips a fall no workshop fits; two topics one workshop fits share a button, and no more than two are offered; a rise or a fall with no workshop offers nothing and no heading; a tap opens the L'Hôpital workshop and its back button returns to the summary as it was; it fits a phone; nothing is saved |
| `product` | the Tome opens the product rule workshop on the line field with h = 1; the readout names the field 3 × 5 = 15 at x = 2, the strips 5 and 6 and the corner 2, where the strips head, 5 + 6 = 11, and says the corner still counts; the drawing has four pieces to one scale, the strips against the field; at h = 0.001 the rate is 11.002 and f′ × g′ = 2 is named as only the corner; the square's equal strips and the mixed field's corner outgrowing its top strip are found, closing in on each finishes the hunt; the stepper stops at both ends, every button and the drawing are named, it fits a phone and saves nothing |
| `ladder` | the Tome opens the ladder workshop on the 5 m ladder with the foot 4.5 m out; the readout finds the top about 2.1794 m up by Pythagoras, differentiates x² + y² = 25 in time, works y′ ≈ −2.0647 m/s, says the top is faster than the foot by x/y, and checks it over the next 0.01 s; the speed bars stand in that ratio; at 3 m the 3-4-5 ladder's top falls at 0.75 m/s, slower than the foot, at 4.8 m it races at more than three times the foot, and the 10 m ladder at 9.5 m shows the check beating y′, which finishes the hunt; the stepper stops at both ends, every button and the drawing are named, it fits a phone and saves nothing |
| `null` | the Tome opens the null space workshop on the flat matrix with v = ⟨1, 1⟩; the readout works Av = ⟨3, 6⟩ row by row, says v is not crushed, names the gold column-space line through ⟨1, 2⟩ and counts rank 1 plus nullity 1; ⟨2, −1⟩ is crushed and the red null-space line appears, ⟨−2, 1⟩ is a second crushed arrow on it, the steep matrix crushes ⟨1, 2⟩, and ⟨0, 0⟩ is crushed by every matrix; the full-rank matrix has no gold line, works det A = 1, says nullity 0, and steers ⟨1, −1⟩ onto ⟨1, 0⟩, which finishes the hunt; the steppers stop at their ends, every button and the drawing are named, it fits a phone and saves nothing |
| `gram` | the Tome opens the Gram–Schmidt workshop on the tilted pair with nothing taken away; the readout works w = ⟨3, 4⟩, w · u₁ = 10 and \|w\| = 5; two copies of u₁ taken away leave w = ⟨−1, 2⟩ at a right angle to u₁, drawn that way with its dashed copy from 2u₁ to u₂, the shortest w, and the readout names that c as the shadow 10/5; half a copy more leans w back; the half pair needs half a copy, 5/10, and the square pair needs nothing, which finishes the hunt; the stepper stops at both ends, every button and the drawing are named, it fits a phone and saves nothing |
| `geo` | the Tome opens the geometric series workshop on the halves with one term, 1 short of the endless sum 2; eight terms add up to S₈ ≈ 1.9922, within 0.01, and the staircase all but reaches the gold line; the thirds close in on 3 after six terms; the swinging series writes real minus signs, starts over its sum 2/3 and drops below it with a red bar going back; the doubling series has no gold line, passes 1000 at S₁₀ = 1023, and says why a/(1 − r) = −1 is not its sum, which finishes the hunt; the stepper stops at 1 and 12 terms, every button and the drawing are named, it fits a phone and saves nothing |
| `bend` | the Tome opens the bend workshop on the S-curve x³ − 3x at x = −2, with f′ = 9, f″ = −12 and the curve bending down below a red tangent; x = −1 is the hilltop, a flat tangent with f″ = −6; at x = 0 the slope bottoms out at −3 and f″ changes sign either side, so the bend flips from cap to cup under a gold tangent; x = 1 is the valley floor under a green one; the shifted curve x³/3 − x² flips at x = 1; on x⁴/4, x = 0 has f″ = 0 but bends up both sides, so it is no inflection point and is a valley floor all the same, which finishes the hunt; the stepper stops at −2 and 2, every button and the drawing are named, it fits a phone and saves nothing |
| `avg` | the Tome opens the water level workshop on the bowl x² over [0, 3] at level 0, with the area 9 worked and the curve above the level the whole way; at 2 the curve sticks up by about 4.8856 and the gaps take about 1.8856, 3 apart, so raise it; at 3 both are about 3.4641, the average value (1/3) × 9 = 3, and the middle of the ends, 9/2, is not it; at 7/2 the gaps win by 3/2; the ramp 2x + 1 levels at 5, the middle of its ends; x³ on [0, 2] at 2; the narrow bowl at 4/3 in steps of a third, which finishes the hunt; the stepper stops at 0 and the top of the curve, every button and the drawing are named, it fits a phone and saves nothing |
| `tail` | the Tome opens the endless area workshop on 1/x² at b = 1 with no area and the gold limit 1 showing; each press doubles b, and each doubling adds half what the one before added, so at 64 the area is not yet within 0.01 of 1 and at 128 it is; under 1/x³ each doubling adds a quarter as much and b = 8 is enough for 1/2; under 1/x every doubling adds ln 2, there is no limit line, and the area passes 5 at b = 256; under 1/√x each adds √2 times the last and 2√64 − 2 = 14 finishes the hunt; the stepper stops at 1 and 1024, every button and the drawing are named, it fits a phone and saves nothing |
| `lathe` | the Tome opens the lathe workshop on the cone x over [0, 3] cut into 4 disks, adding up to about 8.8594 times π against the exact 9π, 1.56% short, with the cone formula named; 8 disks bring it within 1%; the bowl √x is exactly 8π with 4 disks and with 1, because x is a straight line, and is half its cylinder; the ball needs 8 disks and lands on (4/3)πr³; the horn x²/2 is 1.3% off with 8 and within 1% with 16, which finishes the hunt; one disk is drawn per slice, the stepper stops at 1 and 64, every button and the drawing are named, it fits a phone and saves nothing |
| `swap` | the Tome opens the swap workshop on ∫ 2x cos(x²) dx with no u picked, no answer drawn and nothing found; taking u to be the whole integrand works out its du and says why it fails, which finds the goal for a u that does not help; u = x² gives du = 2x dx, swaps the integral into ∫ cos u du, puts x back as sin(x²) + C and checks by differentiating, with the answer drawn in gold; a new integral clears the u; u = x changes nothing; u = x³ + 1, u = x² with a constant divided out, and u = ln x after u = 1/x brings the problem back, each finish their integral, the last finishing the hunt; every button is named and the pressed ones say so, it fits a phone and saves nothing |
| `implicit` | the Tome opens the implicit slope workshop on the circle at (4, 3) with nothing found; the readout differentiates both sides, solves y′ = −x/y, works y′ = −4/3, checks it with a nudge and shows the tangent meeting the radius at a right angle; two steps on, (0, 5) has a flat tangent and no radius line; back at (5, 0) the formula divides by 0 and the tangent stands straight up; the point wraps round the curve; the ellipse is flat at its top; the tilted curve takes the product rule and climbs at (−2, 3), finishing the hunt; every button is named and the pressed one says so, it fits a phone and saves nothing |
| `parts` | the Tome opens the parts workshop on ∫ x eˣ dx with no split picked, no answer drawn and nothing found; u = eˣ works du and v, writes uv − ∫ v du and says the power of x went up, finding the goal for a split that makes things worse; u = x leaves ∫ eˣ dx, puts it together as x eˣ − eˣ + C and checks it by the product rule, with the answer drawn in gold; a new integral clears the split; a dv that is the whole integrand never starts; ∫ x cos x dx, ∫ ln x dx with its hidden dv = dx, and ∫ x ln x dx each take their right split, the last finishing the hunt; every button is named and the pressed one says so, it fits a phone and saves nothing |
| `detect` | the Tome opens the eigenvalue detective on the first matrix at λ = −2 with nothing found and the point gold; λ = 0 reads det A off the curve; λ = 2 is an eigenvalue, with the crushed arrow ⟨1, −2⟩ multiplied out, the other eigenvalue 5 found from the trace, and the point turned green; a new matrix starts back at λ = −2 and picking it finds nothing; the triangular matrix's −1 flips its arrow and sits on the diagonal; the repeated matrix's 3 counts twice; the turning matrix bottoms out 1 above the axis, finishing the hunt; the stepper stops at both ends, every button is named and the pressed one says so, it fits a phone and saves nothing |
| `hill` | the Tome opens the hillwalker workshop on the round bowl facing east, where the slope is just ∂f/∂x = 6, with nothing found; a turn faces ⟨4/5, 3/5⟩, worked as 48/5 = 9.6, checked with a nudge and read as cos θ = 24/25; facing ⟨3/5, 4/5⟩ is all of ‖∇f‖, the steepest climb, with a toast; a right angle walks the contour and straight against ∇f is the steepest drop, the arrow taking a different colour for each; due south is −∂f/∂y; the oval bowl starts back at east with nothing new found, and its steepest climb is not straight away from the bottom; on the saddle a clockwise turn wraps round past east, and a level heading through the pass finishes all five; twelve turns come back round and neither turn button is ever off; every button is named, the map is described, it fits a phone, and nothing is saved |
| `cof` | the Tome opens the cofactor workshop on the first matrix with no line picked and nothing found, its six line buttons three to a row; row 1 works two minors, skips its 0 and adds to −25, the grid outlining row 1 and striking out the 0; column 2 needs only one minor and agrees with row 1, finding two goals with one toast; row 2's signs go − + −; the triangular matrix starts with no line pressed and nothing new found, and its first column leaves the diagonal 3 × 2 × (−1) = −6; the flattened matrix comes out 0, finishing all five; every button is named, the grid is described, it fits a phone, and nothing is saved |
| `cover` | the Tome opens the cover-up workshop on (5x + 1)/((x − 1)(x + 2)) at x = 3 with nothing kept or found; keeping x = 3 and x = 2 solves for A = 2 and B = 3 together, draws the pieces, integrates them and checks the split at x = 2; x = 1 covers up A and x = −2 covers up B, the upright line turning red where f is not defined and nothing counting until it is kept; the three-factor fraction falls to x = 1, 0 and −2 with no solving; the repeated factor gives B = 2 at x = −1, says why A cannot be covered up, and finds A at x = 0, finishing all five; the keep button names its x and switches off once kept, the stepper stops at −4 and 4, every button is named, it fits a phone, and nothing is saved |
| `slice` | the Tome opens the slice workshop on xy over 0 to 2 by 0 to 3, holding x = 0.5 with nothing found; x = 0 is a slice with no area and nothing swept or shaded; sweeping on to x = 2 adds the slices to 9 and switches the forward button off; holding y instead starts the slice again, renames the step buttons, and sweeping to y = 3 gives the same 9; on x² every slice across y has area 9, found once a second slice is looked at, while across x they grow; on x + y the slice at x = 1 is the average one, finishing all five; the stepper stops at 0, every button is named, it fits a phone, and nothing is saved |
| `tracer` | the Tome opens the slope tracer workshop on sin x at 0, slope 1 with one dot and nothing found; π/2 has a flat tangent at the top of a hump; π falls as steeply as sin x ever does and switches the forward button off; stepping back to −π marks all nine stops and the dots trace cos x, drawn dashed; cos x falls fastest at π/2; three slopes of eˣ land on eˣ; ln x has slope 2 at 0.5, finishing all six; every button is named, it fits a phone, and nothing is saved |
| `arrow` | the Tome opens the arrow workshop on u = ⟨3, 4⟩ at k = 1, length 5 by Pythagoras with its unit vector and nothing found; adding v at the tip lands flat on the x-axis, draws v in gold and shows the lengths do not add; k = 2 doubles the length and switches the forward button off; k = 0 leaves the zero vector, drawn as a dot; k = −1 turns it round; on ⟨1.2, 1.6⟩ k = ½ is a unit vector and adding v cancels it; on ⟨1, 1⟩ u + v has length 2, finishing all six; the stepper stops at −2, every button is named, it fits a phone, and nothing is saved |
| `horizon` | the Tome opens the horizon workshop on (3x² + 5x)/(x² + 2) at x = 100, worked in full with its biggest terms and their ratio 3, with nothing found; two presses reach x = 10,000 and within 0.001 of 3; a bigger power below heads for 0 by its ratio 2/x; a bigger power on top runs past 1,000, marked at the chart's edge with no limit line; the slow starter is below 0 at x = 10, where the rest still outweighs the biggest term, then settles within 0.001 of 3, finishing all five; the stepper stops at 1 and a million, every button is named, it fits a phone, and nothing is saved |
| `cross` | the Tome opens the cross product workshop on u = ⟨2, 0, 0⟩, v = ⟨1, 1, 1⟩, every part worked from the other two slots, checked square to both, its length √8 read as an area, with nothing found; v laid in the floor sends u × v straight up, and stretched gives an area of 6; on the tilted u, v turned to −u crosses to the zero vector, drawn as a dot; the target set's general form leads v onto ⟨2, 2, 1⟩; swapping puts v first in every part and turns the arrow round, finishing all five; picking again puts u first, the steppers stop at ±3, every button is named, it fits a phone, and nothing is saved |
| `quot` | the Tome opens the quotient rule workshop on x²/(x + 1) at x = 1, the rule worked with every value to 3/4 and checked by a nudge, with nothing found; swapping the top gives −0.75 and forgetting the square gives 1.5, and the nudge catches both; x = 0 has a flat tangent and x = −1 a gap with no point and no slope; on x/(x² + 1) the top of the bump is at x = 1 and the forgotten square is right by luck at x = 0; on 1/(x² + 1) the reciprocal rule shows and y rises at x = −1, finishing all seven; the stepper stops at ±3, every button is named, it fits a phone, and nothing is saved |
| `anti` | the Tome opens the antiderivative workshop on 6x² with the guess F = x, its slope 1 worked by the power rule and the power called off, both curves drawn, with nothing found; power 3 gives half of f, c = 2 lands on f, c = 6 is three times f with the divide-first sentence, and + 1 shows the + C; 2x^(3/2) undoes 3√x with its fraction kept, −x⁻¹ undoes 1/x² with its brackets kept, and power 0 on 1/x meets the gap in the power rule, finishing all six; the steppers stop at both ends, every button is named, it fits a phone, and nothing is saved |
| `transpose` | the Tome opens the transpose workshop on a wide 2×3 matrix with an empty 3×2 Aᵀ whose slots stay off until an entry is held; 2 copied to its own spot is turned away with the reason and the slip named, then lands in row 2, column 1; 1 on the diagonal stays put; a full first column reads as A's first row; filled, the shape has turned; the square one swaps −1 and 5; on the symmetric one an entry copied straight fits anyway and Aᵀ = A, finishing all six; a held entry can be put back, every cell is named, it fits a phone, and nothing is saved |
| `diag` | the Tome opens the diagonal workshop on the symmetric matrix with P = I and neither column an eigenvector; (1, 1) clears only its own column of P⁻¹AP; adding (1, −1) makes it diagonal with D = 3 then 1 and the eigenvectors at a right angle; two copies of one arrow leave no inverse; swapped, D reads 1 then 3; the lopsided matrix diagonalises with (1, 1) and (1, −2); the shear's one eigenvector (1, 0) is all it has, finishing all six; every button is named, it fits a phone, and nothing is saved |
| `trigint` | the Tome opens the trig integral workshop on cos 2x with the guess sin 2x, whose slope is twice f; a cosine is the wrong wave; c = 2 is the slip of multiplying by the 2 inside; c = 1/2 lands on f and c = −1/2 shows a minus staying in F′; −(1/3) cos 3x undoes sin 3x once the minus of cos is explained; 2 sin 3x undoes 6 cos 3x; −2 cos(x/2) undoes sin(x/2), finishing all seven; the stepper stops at its ends, every button is named, it fits a phone, and nothing is saved |
| `tanplane` | the Tome opens the tangent plane workshop on the bowl z = x² + y² at (1, 2) with the flat plane z = 0; slopes 2 and 4 at height 0 are tilted right but lifted off the point; height 5 makes the tangent plane z = 5 + 2(x − 1) + 4(y − 2); a wrong x slope leaves one slice cutting across, and the slopes swapped are caught; the saddle, the lopsided bowl and the dome are touched, finishing all seven; the steppers stop at ±6, every button is named, it fits a phone, and nothing is saved |
| `invslope` | the Tome opens the inverse slope workshop on arcsin at u = 0.6, where x = arcsin 0.6, f′(x) = √(1 − 0.6²) = 0.8 and the slope flips to 1.25, checked by a nudge; forgetting to flip and flipping at u are both caught; at u = 0 forgetting to flip is right by luck; at u = 1 the tangent stands straight up; arccos falls most gently at 0, where flipping at u divides by sin 0; arctan has slope 1/2 at u = 1; all seven goals; the stepper stops at its ends; every button named; fits a phone; nothing saved |
| `logdiff` | the Tome opens the log slope workshop on xˣ at x = 1.5, where ln y = x·ln x, y′/y = ln x + 1 ≈ 1.405 and y′ = 1.837 × 1.405 ≈ 2.582, checked by a nudge; the power rule and the exponent rule are each caught missing one part, and the two parts add to the slope; at x = 1/e the tangent is flat; at x = 1 the power rule is right by luck; x²ˣ has slope 2 at x = 1; x^(1/x) peaks at x = e; all seven goals; the stepper stops at its ends; every button named; fits a phone; nothing saved |
| `pathchain` | the Tome opens the path chain workshop on z = xy along x = t², y = t at t = 1, where the x part 1 × 2 and the y part 1 × 1 add to dz/dt = 3, checked by a nudge, with bars in the same proportion; keeping only one part and forgetting the speeds are each caught; at t = 0.5 forgetting the speeds is right by luck; on the circle the parts cancel at π/4; along x = t, y = 2 − t the top is at 4/3 and the y part wins at 5/3; all seven goals; the stepper stops at its ends; every button named; fits a phone; nothing saved |
| `expint` | the Tome opens the growth integral workshop on e^(2x) with F = e^(2x), twice too steep and drawn blue across 88 slope dashes; a 2 in front is caught as the multiply slip; a 1/2 in front fits, turns green and names ∫ e^(2x) dx = (1/2)·e^(2x) + C; a lift of 1/2 keeps every slope and passes through (0, 1); raising the exponent as the power rule would is caught; e^(−2x) needs −1/2 and e^(x/2) needs 2; all seven goals; both steppers stop at their ends; every button named; fits a phone; nothing saved |
| `wsindex` | the Tome's second card is the workshop index, on screen when it opens; it lists all 48 workshops once each under the seven strands in order, with a chip for every workshop card below, the vectors row in the strand's order; a new knight's chips are all plain; the Bend chip opens the same screen as its card; with one of its two topics solid it stays plain, with both solid it turns green with a ✓ and says so to a screen reader, and with one needing work it is ringed in gold and says so; chips sit side by side and wrap; every chip named; fits a phone; nothing saved |
| `slopematch` | the Tome says the slope tracer can be turned round; the tracer opens tracing, and switching to which is f′ hides the tracer and states the rule first; three graphs are offered, each named and told as words, and f is told as words; a wrong pick is explained at the x where f breaks it, names its slip, marks the spot on f and on the graph, is shut and told as not f′, and is not counted; the right pick after it is counted but not as a first try, with a toast and a new f; a first try counts as one; the fifth read brings a banner; every button named; fits a phone; the three graphs sit side by side; tracing comes back; nothing saved |
| `matpick` | the Tome says the matrix workshop can be turned round; the workshop opens on free play, and switching to which matrix puts away the steppers and goals and states the rule first; four matrices are offered, each named and read out row by row, and the shape is drawn dashed over the square, never given as numbers; a wrong pick says where it sends î and ĵ against the dashed ones, names its slip, is drawn in gold over the shape, is shut and told as not this one, and is not counted; the right pick reads its columns back, counts (not as a first try after a miss), toasts and deals a new shape with all four open; a first try counts as one, and the fifth pick brings MATRIX SPOTTER; every button is named, nothing runs off a phone, the matrices sit two by two with î and ĵ's colours on their columns, match the shape and free play come back, and the save is unchanged |
| `eigspot` | the Tome says the eigenvector hunt can be turned round; the hunt opens on hunting by hand, and switching to spot one puts away the matrices, the arrow, the figure and the goals and states the rule first; the matrix is read out row by row; four arrows are offered, each named with where A sends it and drawn with v in green, A·v in gold and v's dotted line; a wrong pick is multiplied out, told how many degrees it is knocked off its line, shut, drawn in red, told as not an eigenvector and not counted; the right pick is written as λ times itself, counts (not as a first try after a miss), toasts and deals a new matrix with all four open; a first try counts as one, and the fifth spot brings EIGEN SPOTTER; every button is named, nothing runs off a phone, the arrows sit two by two, hunting by hand comes back, and the save is unchanged |
| `intpick` | the Tome says the area workshop can be turned round; the workshop opens on closing in with rectangles, and switching to which integral puts away the curves, the figure, the stepper, the rules, the readout and the goals and states the rule first; the curve is named with its ends and the picture is read out, saying where it crosses and that part is under the axis; four numbers are offered two by two, each named; a wrong pick is shut, told which slip it is and not counted; the right pick shows F worked at both ends, counts (not as a first try after a miss), toasts and deals a new curve with all four open; a first try counts as one, and the fifth brings INTEGRAL READER; every button is named, nothing runs off a phone, closing in comes back, and the save is unchanged |
| `chainpick` | the Tome says the chain rule workshop can be turned round; the workshop opens on the two links, and switching to which dy/dx puts away the pairs, the figure, the rules, the x stepper, the readout and the goals and states the rule first; y is written and drawn with a point on it, and the picture is read out; four formulas are offered two by two, each named as dy/dx; a wrong pick is named as its slip, set against a nudge of the curve, drawn as a red line through the point that the picture names, shut and not counted; the right pick works f′(u) and g′(x) out, counts (not as a first try after a miss), toasts and deals a new curve with all four open and no red line; a first try counts as one, and the fifth brings CHAIN READER; every button is named, the eigenvalue detective still draws into its own panel while a curve is up, nothing runs off a phone, the two links come back, and the save is unchanged |
| `productpick` | the Tome says the product rule workshop can be turned round; the workshop opens on growing the field, and switching to which dy/dx puts away the fields, the figure, the h stepper, the readout and the goals and states the rule first; y is written and drawn with a point on it, and the picture is read out; four formulas are offered two by two, each named as dy/dx; a wrong pick is named as its slip, set against a nudge of the curve, drawn as a red line through the point that the picture names, shut and not counted; the right pick works f′ and g′ out, counts (not as a first try after a miss), toasts and deals a new curve with all four open and no red line; a first try counts as one, and the fifth brings PRODUCT READER; every button is named, nothing runs off a phone, the field comes back, and the save is unchanged |
| `quotpick` | the Tome says the quotient rule workshop can be turned round; the workshop opens on working the slope, and switching to which dy/dx puts away the sets, the figure, the x stepper, the modes, the readout and the goals and states the rule first; y is written and drawn with a point on it, and the picture is read out; four formulas are offered two by two, each named as dy/dx; a wrong pick is named as its slip, set against a nudge of the curve, drawn as a red line through the point that the picture names, shut and not counted; the right pick works f′ and g′ out, counts (not as a first try after a miss), toasts and deals a new curve with all four open and no red line; a first try counts as one, and the fifth brings QUOTIENT READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |\n| `slope` | the Tome opens the slope workshop on x² at a = 1; the readout works the secant's slope for the numbers on screen, 2.1 at h = 0.1 and 2.001 at h = 0.001; at the closest h it names f′(a) and the caption says the secant lies along the tangent; the other side brackets the negative h and gives 1.999; the curves and the point change what is worked (f′(2) = 9, f′(−1) = 0, f′(1) = −2); the point and h stop at their ends; every goal can be found with the buttons and is ticked only then; the toast for getting within 0.01 keeps the 0.01 whole; it fits a phone; nothing is saved |
| `lampick` | the Tome says the eigenvalue detective can be turned round; the detective opens on hunting them down, and switching to which λ puts away the matrices, the curve, the stepper, the readout and the goals and states the rule first; A is written and read out, with no curve yet; four pairs are offered two by two, each named as λ = x and y; a wrong pick is named as its slip, checked at its own two numbers and worked out, draws det(A − λI) with two gold rings and red dots at the pair that the picture names, is shut and not counted; the right pick works the trace and det A out, counts (not as a first try after a miss), toasts and deals a new matrix with all four open and the curve put away; a first try counts as one, and the fifth brings EIGENVALUE READER; every button is named, nothing runs off a phone, the hunt comes back, and the save is unchanged |
| `spanpick` | the Tome says the span workshop can be turned round; the workshop opens on mixing the arrows, and switching to which mix puts away the pairs, the amounts, the plane, the readout and the goals and states the rule first; u, v and the ring are written and drawn, and the picture is read out; four mixes are offered two by two, each named as a mix of u and v; a wrong pick is named as its slip, worked to where it lands, walked in red in two legs to a marked end that the picture names, shut and not counted; the right pick works the mix, counts (not as a first try after a miss), toasts and deals a new pair with all four open and no red walk; a first try counts as one, and the fifth brings SPAN READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `dotpick` | the Tome says the dot product workshop can be turned round; the workshop opens on setting the arrows, and switching to which u·v puts away the steppers, the plane, the readout, Start again and the goals and states the rule first; u and v are written and drawn with no shadow, and the picture is read out; four numbers are offered two by two, each named as u·v; a wrong pick is named as its slip, set beside the right sum and its sign, draws u's shadow on v's line that the picture names, is shut and not counted; the right pick works the sum, counts (not as a first try after a miss), toasts and deals a new pair with all four open and no shadow; a first try counts as one, and the fifth brings DOT READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `antipick` | the Tome says the antiderivative workshop can be turned round; the workshop opens on guessing by hand, and switching to which F puts away the targets, the curves, F, the steppers, the readout and the goals and states the rule first; f is written and drawn in gold with no red slope yet, and the picture is read out; four F are offered two by two, each named as an F; a wrong pick is named as its slip, checked by its slope beside the right F's, draws its slope in red that the picture names, is shut and not counted; the right pick works its slope out, counts (not as a first try after a miss), toasts and deals a new f with all four open and no red slope; a first try counts as one, and the fifth brings ANTIDERIVATIVE READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `transpick` | the Tome says the transpose workshop can be turned round; the workshop opens on moving by hand, and switching to which Aᵀ puts away the matrices, the grids, the readout and the goals and states the rule first; A is drawn and read out with its main diagonal edged in gold; four matrices are offered two by two, each named by its shape and rows; a wrong pick is named as its slip, checked against A, shut and told as not Aᵀ, turns exactly its out-of-place entries red, and is not counted; the right pick is worked out row by row, counts (not as a first try after a miss), toasts and deals a new A with nothing red; a first try counts as one, and the fifth brings TRANSPOSE READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `crosspick` | the Tome says the cross product workshop can be turned round; the workshop opens on turning v by hand, and switching to which u × v puts away the pairs, the drawing, the steps, the swap, the readout and the goals and states the rule first; u and v are shown, and four arrows offered two by two, each named by its parts; a wrong pick is named as its slip, checked by its dot products with u and v beside u × v worked out, shut and told as not u × v, and is not counted; the right pick is worked out and shown square to both, counts (not as a first try after a miss), toasts and deals a new pair; a first try counts as one, and the fifth brings CROSS READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `undopick` | the Tome says the undo workshop can be turned round; the workshop opens on building B by hand, and switching to which A⁻¹ puts away the matrices, B, the drawing, the readout and the goals and states the rule first; A is drawn, and four matrices offered two by two, each named by its rows; a wrong pick is named as its slip, followed through the arrow that does not come home beside A⁻¹ worked from the rule, shut and told as not A⁻¹, and is not counted; the right pick sends both arrows home, counts (not as a first try after a miss), toasts and deals a new A; a first try counts as one, and the fifth brings INVERSE READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `nullpick` | the Tome says the null space workshop can be turned round; the workshop opens on setting v by hand, and switching to which is crushed puts away the matrices, v, the drawing, the readout and the goals and states the rule first; a flat A is drawn, and four arrows offered two by two, each named by its entries; a wrong pick is named as its slip, dotted with both rows to show where A sends it, shut and told as not crushed, and is not counted; the right pick dots to 0 with both rows, counts (not as a first try after a miss), toasts and deals a new A; a first try counts as one, and the fifth brings NULL SPACE READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `grampick` | the Tome says the Gram–Schmidt workshop can be turned round; the workshop opens on taking copies by hand, and switching to which c puts away the pairs, the drawing, the stepper, the readout and the goals and states the rule first; u₁ and u₂ are shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, worked through w · u₁ = u₂ · u₁ − c × (u₁ · u₁) to show which way w leans, shut and told as not c, and is not counted; the right pick brings w · u₁ to 0 and shows w, counts (not as a first try after a miss), toasts and deals a new pair; a first try counts as one, and the fifth brings SHADOW READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `cofpick` | the Tome says the cofactor workshop can be turned round; the workshop opens on expanding by hand, and switching to which det A puts away the matrices, the grid, the lines, the readout and the goals and states the rule first; A is shown three by three and named row by row, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, the quickest line is pointed out, and it is shut and told as not det A, and is not counted; the right pick works det A along the quickest line, minor by minor, counts (not as a first try after a miss), toasts and deals a new A; a first try counts as one, and the fifth brings DETERMINANT READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `elimpick` | the Tome says the elimination workshop can be turned round; the workshop opens on row operations by hand, and switching to which k puts away the systems, the rows, k, the operations, the drawing, the readout and the goals and states the rule first; both rows are shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, worked through row 2's x coefficient, shut and told as not clearing x, and is not counted; the right pick clears x, reads off y and then x, counts (not as a first try after a miss), toasts and deals new rows; a first try counts as one, and the fifth brings ROW CLEARER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `hoppick` | the Tome says the L'Hôpital workshop can be turned round; the workshop opens on closing in by hand, and switching to which limit puts away the ratios, the drawing, h, the readout and the goals and states the rule first; the ratio is shown as a limit with its 0/0 pointed out, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, worked out, shut and told as not the limit, and is not counted; the right pick works both slopes at the point, counts (not as a first try after a miss), toasts and deals a new ratio; a first try counts as one, and the fifth brings LIMIT HUNTER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `newtonpick` | the Tome says the Newton's method workshop can be turned round; the workshop opens on stepping by hand, and switching to which x₁ puts away the curves, the drawing, the steppers, the readout and the goals and states the rule first; the curve and x₀ are shown with f(x₀) and f′(x₀) worked out, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked on the tangent, shut and told as not x₁, and is not counted; the right pick works the step, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings TANGENT RIDER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `avgpick` | the Tome says the water level workshop can be turned round; the workshop opens on levelling by hand, and switching to which level puts away the curves, the drawing, the level, the readout and the goals and states the rule first; the curve and its interval are shown with the area and the width, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by what its level holds, shut and told as not the average, and is not counted; the right pick divides the area by the width, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings LEVEL KEEPER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `geopick` | the Tome says the geometric series workshop can be turned round; the workshop opens on adding by hand, and switching to which sum puts away the series, the drawing, the stepper, the readout and the goals and states the rule first; the first four terms are shown with a and r, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked against S = a + rS, shut and told as not the sum, and is not counted; the right pick works a/(1 − r) and checks it, counts (not as a first try after a miss), toasts and deals a new series; a first try counts as one, and the fifth brings TAIL TAMER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `ladpick` | the Tome says the ladder workshop can be turned round; the workshop opens on sliding by hand, and switching to which speed puts away the ladders, the drawing, the stepper, the readout and the goals and states the rule first; the ladder is shown with x, x′ and y, and four numbers offered two by two, each named by its value in m/s; a wrong pick is named as its slip, checked against x·x′ + y·y′ = 0, shut and told as not the speed, and is not counted; the right pick works −x·x′/y and checks it, counts (not as a first try after a miss), toasts and deals a new ladder; a first try counts as one, and the fifth brings LADDER READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `imppick` | the Tome says the implicit slope workshop can be turned round; the workshop opens on stepping by hand, and switching to which slope puts away the curves, the drawing, the stepper, the readout and the goals and states the rule first; the curve is shown with its point and a, b and c, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked against 2ax + by + (bx + 2cy)·y′ = 0, shut and told as not the slope, and is not counted; the right pick works the top and bottom out and checks them, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings SLOPE UNVEILER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `covpick` | the Tome says the cover-up workshop can be turned round; the workshop opens on covering up by hand, and switching to which A puts away the fractions, the drawing, the stepper, the keep button, the readout and the goals and states the rule first; the fraction is shown split as A and B, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked against the cleared equation at x = r, shut and told as not A, and is not counted; the right pick works the top and what is left of the bottom out and checks them, counts (not as a first try after a miss), toasts and deals a new fraction; a first try counts as one, and the fifth brings COVER-UP ARTIST; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `trigpick` | the Tome says the trig integral workshop can be turned round; the workshop opens on undoing a wave by hand, and switching to which c puts away the targets, the drawing, F, the wave buttons, the stepper, the readout and the goals and states the rule first; the wave is shown with its antiderivative, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by differentiating its F back, shut and told as not c, and is not counted; the right pick works its slope out and checks it, counts (not as a first try after a miss), toasts and deals a new wave; a first try counts as one, and the fifth brings WAVE UNDOER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `flippick` | the Tome says the bend workshop can be turned round; the workshop opens on sliding along by hand, and switching to where does it flip puts away the curves, the drawing, the stepper, the readout and the goals and states the rule first; the cubic is shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by putting it into f″, shut and told as not where it flips, and is not counted; the right pick works f″ out to 0 there, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings BEND SPOTTER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `tailpick` | the Tome says the endless area workshop can be turned round; the workshop opens on pushing b out by hand, and switching to where does it close in puts away the curves, the drawing, the stepper, the readout and the goals and states the rule first; the endless integral is shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by the slope of the area out to b, shut and told as not where it closes in, and is not counted; the right pick works c × (p − 1) back to a, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings TAIL TAMER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `growpick` | the Tome says the growth integral workshop can be turned round; the workshop opens on fitting F by hand, and switching to which number in front puts away the curves, the field, the steppers, the exponent buttons, the readout and the goals and states the rule first; the integral is shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by the chain rule, shut and told as not the number in front, and is not counted; the right pick works c × k back to a, counts (not as a first try after a miss), toasts and deals a new exponential; a first try counts as one, and the fifth brings GROWTH TAMER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `seriespick` | the Tome says the Taylor workshop can be turned round; the workshop opens on building the series by hand, and switching to which coefficient puts away the curves, the drawing, the steppers, the readout and the goals and states the rule first; the exponential and the power are shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by Taylor's rule, shut and told as not the coefficient, and is not counted; the right pick works c × n! back to the slope taken n times at 0, counts (not as a first try after a miss), toasts and deals a new term; a first try counts as one, and the fifth brings SERIES READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `lathepick` | the Tome says the lathe workshop can be turned round; the workshop opens on measuring by hand, and switching to which volume puts away the solids, the drawing, the stepper, the readout and the goals and states the rule first; the curve and its ends are shown, and four volumes offered two by two, each named by its value; a wrong pick is named as its slip, checked by its slope in b against the end disk, shut and told as not the volume, and is not counted; the right pick works π∫ y² dx out, counts (not as a first try after a miss), toasts and deals a new solid; a first try counts as one, and the fifth brings MASTER TURNER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `hillpick` | the Tome says the hillwalker workshop can be turned round; the workshop opens on walking it by hand, and switching to which slope puts away the hills, the map, the turn buttons, the readout and the goals and states the rule first; the hill, the point and the heading are shown, and four slopes offered two by two, each named by its value; a wrong pick is named as its slip, checked by a step of 5 along û against 5 times the slope plus the bend, shut and told as not the slope, and is not counted; the right pick works ∇f · û out, counts (not as a first try after a miss), toasts and deals a new hill; a first try counts as one, and the fifth brings TRAIL READER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `pathpick` | the Tome says the path chain workshop can be turned round; the workshop opens on walking it by hand, and switching to which rate puts away the hills, the drawing, the t stepper, the slip modes, the readout and the goals and states the rule first; the hill, the path and the moment are shown, and four numbers offered two by two, each named by its value; a wrong pick is named as its slip, checked by a nudge in t against the rise it would give, shut and told as not dz/dt, and is not counted; the right pick works both parts of dz/dt out, counts (not as a first try after a miss), toasts and deals a new hill and path; a first try counts as one, and the fifth brings PATHFINDER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `powpick` | the Tome says the diagonal workshop can be turned round; the workshop opens on building P by hand, and switching to which Aⁿv puts away the matrices, the drawing, the columns of P, the readout and the goals and states the rule first; A, its eigenvectors and v are shown, with the power asked for, and four vectors offered two by two, each named by its value; a wrong pick is named as its slip, checked in eigenvector parts, shut and told as not Aⁿv, and is not counted; the right pick works Aⁿv out part by part, counts (not as a first try after a miss), toasts and deals a new A; a first try counts as one, and the fifth brings POWER BROKER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `tanpick` | the Tome says the tangent plane workshop can be turned round; the workshop opens on building a plane by hand, and switching to which plane puts away the surfaces, the slices, the plane, its steppers, the readout and the goals and states the rule first; the surface and the point are shown, and four planes offered one under another, each named by its plane; a wrong slope is named as its slip and checked by a step of 1, a wrong height named and checked at the point, each shut and told as not the tangent plane, and neither counted; the right pick works the height and both slopes out, counts (not as a first try after a miss), toasts and deals a new surface; a first try counts as one, and the fifth brings PLANE TOUCHER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `cisternpick` | the Tome says the cistern workshop can be turned round; the workshop opens on stepping a spring by hand, and switching to which total puts away the springs, the figure, the stepper, the readout and the goals and states the rule first; the flow is shown and four totals offered, each named by its number; two wrong picks are each named as their slip and checked by differentiating their G, shut and told as not the total, and not counted; the right pick works F(T) out term by term, counts (not as a first try after a miss), toasts and deals a new spring; a first try counts as one, and the fifth brings CISTERN KEEPER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `invpick` | the Tome says the inverse slope workshop can be turned round; the workshop opens on mirroring a curve by hand, and switching to which slope puts away the curves, the figure, the stepper, the modes, the readout and the goals and states the rule first; a rising curve and the point it sends to u are shown, and four numbers offered, each named by its number; two wrong picks are each named as their slip and checked against g′(u) × f′(p) = 1, shut and told as not g′(u), and not counted; the right pick works f′ at the point out and flips it, counts (not as a first try after a miss), toasts and deals a new curve; a first try counts as one, and the fifth brings SLOPE FLIPPER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `hzpick` | the Tome says the horizon workshop can be turned round; the workshop opens on stepping x out by hand, and switching to where does it head puts away the fractions, the figure, the stepper, the readout and the goals and states the rule first; a fraction is shown and four numbers offered, each named by its number; two wrong picks are each named as their slip and checked by the biggest-power part of the gap, shut and told as not where f heads, and not counted; the right pick divides top and bottom by the biggest power, counts (not as a first try after a miss), toasts and deals a new fraction; a first try counts as one, and the fifth brings HORIZON GAZER; every button is named, nothing runs off a phone, the workshop comes back, and the save is unchanged |
| `area` | the Tome opens the area workshop on x² from 0 to 3 with four left-edge rectangles; the readout works Δx = 0.75 and the sum 0.75 × 7.875 = 5.90625, short of 9 by 3.09375; nothing is found before anything is turned; the middle gives 8.859375, eight rectangles 8.96484375 and sixteen ≈ 8.9912, short by about 0.0088, ticking within 0.1 and within 0.01, and the toast keeps the 0.1 whole; at 64 it says the sum closes in and the count stops; right edges overshoot; x³ puts a rectangle under the axis; one rectangle is worked as 3 × (−1) = −3; both counts stop at their ends; the steppers are named and the pressed curve and rule are marked; it fits a phone; nothing is saved |
| `taylor` | the Tome opens the Taylor workshop on eˣ up to x¹ at x = 1; the readout names the series, writes P₁(x) = 1 + x, works P₁(1) = 1 + 1 = 2 and says it is short of eˣ ≈ 2.7183 by about 0.7183; nothing is found before anything is turned; up to x³ the terms are 1, 1, 0.5 and 0.1667 ≈ 2.6667, and up to x⁶ e is within 0.001, with a toast that keeps the 0.001; at x = 0 every term but the first is 0 and P is exactly right; at x = −2 P₆ is over and P₇ short, inside 0.01; sin x names its odd powers and says it has no x⁸ term; at x = 3, P₉ comes within 0.01 and P₁ = 3 alone is worse than nothing, which it says and explains; P₀ of sin x is 0; both steppers stop at their ends, even when pressed past them; every button is named; it fits a phone; nothing is saved |
| `lesson` | a topic climbs meet → true-or-false → choose → build one rung an answer, the rung is derived and never stored, a first meeting draws no blood, and a fight ends by saying what it taught, under a heading that calls it a fight; a rite's trail draws each rung's matrices as the matrices that were asked |
| `keep` | every craft has a room that says what can be done in it, the forge is struck three times, the quarters sell nothing, and a potion is a mix that can always be made in exactly one way and teaches the mastery model nothing |
| `ios` | the iPhone app's bridge carries the game's haptics and knight code to native code, and leaves the web version untouched |
| `pwa` | served over HTTP like the live site, a player who tapped Later, left the game open, or met a stale HTTP cache still lands on the newest build, and only it stays cached |
| `map` | the places you can go are above the campaign, one card at the top says what to do next (the cellar only for a knight who has beaten nothing), the campaign is a road with one realm open, the rules of play show only for a knight who has beaten nothing, and the hall has a door for each knight; below half health the card gives the cost of a miss and offers a priced rest first, and after a fall resting and trying again comes first when affordable; the next unlock beats what is owned and, once affordable, goes to the Smithy; a topic bounty names only a topic met or one from a realm reached, and an untouched one beyond that is rolled again; the board as rolled is saved, so a reload leaves it as it was; the daily's bar is the mark to beat (a par, then your best ever, then today's best), drains by each answer's points and not by a miss, says when it is passed and how many are left without ending the run, fits a 320px phone, a short run is told by how much, and nothing of it is saved; a daily run's misses are named on its result screen, each once, with a drill on exactly those topics ahead of running it again, a new run starts with none, a clean run says so and leads with running it again, and nothing about the misses is saved; the daily's counter names the riddle on screen from the first to the last, a miss moves it on too, and it carries the points so far; the mastery recap after a run is headed as a run, not a fight |
| `cheat` | the testing door opens for nobody who has not typed it |

It needs Playwright (`npm install && npx playwright install chromium`). Run one suite
with `npm run test:play -- --suite run`, or watch it with `PLAY_HEADED=1`.

### Mutations

A check that cannot fail proves nothing, so each change is shipped with the guards it
added broken on purpose. `tools/mutations.json` lists them for the latest change: the
text of each guard, the broken version, and the suite that should notice.

```bash
node tools/mutate.js tools/mutations.json            # every break, one at a time
node tools/mutate.js tools/mutations.json --only X   # one
```

Each break is applied alone, the named suite runs (`verify`, `play`, `play:<suite>` or
`balance`), and the file is put back before the next. A break whose text no longer
appears exactly once is reported as **stale** rather than skipped, and a suite that
cannot start (no browser) is an **error** rather than a catch. Branch CI runs it.

`npm test` also holds the workflows themselves to three things: every action runs on
Node 24 (an action below its floor, or one with no floor on record, fails), every branch
is checked on push, only `main` is ever built and deployed, and a deploy cannot pass
until the live site reads back the commit it published.

The `wave` suite pins a hash on purpose: any change to the escalation numbers or the
RNG call order will fail it. That is a balance change, so update the pin *and* say so
in the commit rather than treating it as noise.

### The dials

```bash
npm run balance             # the sweep, and its acceptance properties
npm run balance -- --sweep  # search the curve space for settings that hold
```

After every cleared room the Deep asks: press deeper, or climb out with what you
carry? That is only a decision if the arithmetic can go either way — the player is
weighing `E[next room's loot] > P(wipe) × what you'd lose`. The property that makes it
an expression of *skill* is that the **break-even depth** — the deepest point still
worth pressing to — must rise with accuracy. If a 40% player and a 95% player should
both bank at depth four, the fork is a formality.

`tools/balance.js` plays thousands of runs at five accuracy levels and reads that depth
out of the results, driving `Combat` and `WaveEngine` from `index.html` so there is no
second copy of the damage formula to drift. It currently reports:

| accuracy | break-even | banked | always presses on, falls at |
| --- | --- | --- | --- |
| 40% | depth 3 | 140 | 4.1 |
| 55% | depth 4 | 273 | 5.5 |
| 70% | depth 5 | 409 | 7.2 |
| 85% | depth 8 | 1011 | 10.8 |
| 95% | depth 12 | 1940 | 14.8 |

This is what caught the Deep shipping with the *Arena's* foe curve — 295 health and 30
attack at depth one, against a knight who has just cleared one realm and swings for
fourteen. `DEEP_WAVES` exists because of this harness, and CI runs it so a curve edit
that flattens the spread fails the build.

`tools/mathexpr.js` compiles the game's *display HTML* — nested fraction spans, `<sup>`
powers, unicode superscripts, U+2212 minus — back into evaluable expressions, which is
what lets an answer be checked numerically at all. `tools/verify.js` runs three layers:
structure (four unique choices, answer present, misconceptions substantial), algebra
(matrices parsed back out of the rendered HTML and recomputed, including
`A · adj(A) = det(A) · I`), and analysis (derivatives against finite differences,
integrals differentiated back to their integrand so the `+ C` cancels, definite integrals
against Simpson's rule, limits by direct evaluation).

**All 70 generators are independently verified against the mathematics**, up from 8 when
the harness could only parse polynomials. Every one of the 32 topics added with Spectral
Reach, Infinite Expanse and Gradient Summit is in that number, and each is checked against
the mathematics rather than against the formula that produced it: an eigenvector is fed back through its
own matrix, a rank is recomputed by elimination, an optimum is found by dense sampling, an
implicit derivative is compared against the slope of the curve itself, and a Riemann sum is
summed for 200,000 terms and matched to the integral the answer claims. A tangent plane
must share the surface's height *and* both of its slopes at the point; a Taylor polynomial
must match the function's value, slope and curvature at zero. A 2×2 system's worked
solution is a hand elimination, and the harness rebuilds it from the two equations: the
step it names must really cancel x and leave the y equation shown, and y put back into
the first equation must give the x the answer claims. A scalar projection is recomputed
as u·v / ‖v‖ from the two vectors in the riddle. The last ten, the
first topics a player meets plus the yes/no and root-set answers, are checked the same way.
A cross product must be at right angles to both vectors, have the length Lagrange's
identity gives, and turn the right-handed way, so v × u is caught as surely as a slipped
sign. Each eigenvalue must make A − λI singular, each critical point must zero the
derivative with no other integer root between −10 and 10, and a vector's length squared
must equal the sum of its squared components. The sums and products written out in the
vector workings, such as (−3)(4) + (2)(5) = −12 + 10 = −2, are re-added too. The cross product's working is written on the riddle's own numbers, one
line per component, and each line must cross the right two slots and come out true.
A matrix product's working does the same for all four entries, each taking the right row
and column. Markup is stripped by matching real tags only, so a literal "|r| < 1" in a
working no longer hides the text after it from the notation check; that let
"1 − −1/4" through in the geometric series working.
Mote ladders are checked the same way, on the choices a player is actually
shown rather than the authored list — 45,600 rendered steps per run.

The generators were also checked by:

- **84,000 generated problems** across all 70 generators at every difficulty, asserting
  four unique choices, the answer present among them, and no malformed output.
- **About 1.25 million lines of text read for notation** — every question, choice,
  misconception, rule, worked explanation and mote step a player can be shown — asserting
  they are written the way a teacher would write them: never two signs in a row
  (`5 + −1`, `x − −3`, `3·−2`), never a negative squared without brackets (`−2²` is −4),
  never a coefficient of 1 or 0 spelled out (`1x`, `0(x + 1)`), never a power of 1 or 0
  written out (`x¹`, `(−1)⁰`), and never a term worth nothing worked as `0(−1)`. The first
  run found eighteen of the seventy generators doing at least one of the first three, including a question that read `2x² + 1x`, a
  determinant expansion of `−1·−5 − 2·−8`, and a discriminant written `−4² − 4(4)` that
  means the opposite of what it says. The rule on powers found six more generators doing it, among them a chain-rule
  answer `10(5x + 5)¹`, a limit worked as `(3)(−1)² + (0)(−1)¹ + (−4)(−1)⁰`, and a double
  integral of 1 worked as `3¹/1 = 3`. A limit by substitution is now worked as by hand,
  `3(−2)² − 4(−2) + 5 = 12 + 8 + 5`, and a check adds up the term values against the answer.
  Every fraction is written with its sign on top and never over 0 or 1 (`1/−3`, `5/0`,
  `1/1`), and no choice offers one in higher terms (`40/10` where `4` is meant). That
  rule found five generators: a scalar projection answered `20/5`, or `0/10` beside a
  choice of `10/0`, an inverse written `1/−3` in front of its matrix, and a limit at
  infinity answered `6/9`. A root is simplified unless the next step works it out: a
  matrix's complex eigenvalues read `4 ± 2i`, not `4 ± i√4`, and a length of `√25` in the
  angle working is written `5`. A cosine rounded to two places is written `≈ −0.71`, never
  `= −0.71`, and the characteristic polynomial is worked on the matrix's own numbers,
  `(4 − λ)(−5 − λ) − (2)(3)`, not on letters `a − λ` and `d − λ`. A slope at a point is
  worked the same way as a limit, `f′(3) = 8(3) + 7 = 24 + 7 = 31`, where it used to jump
  straight from f′(x) to the number, and the check adds the term values up against the answer.
- **6,300 tile banks drawn** for every vector and matrix answer that can be built from
  tiles, asserting the bank holds every number the answer needs and does not point at
  it: picking the most crowded tiles must not beat picking at random by more than 30%.
  The first run found it beating chance by about 45%, because the spare tiles were all
  near misses of the answer's own numbers; they are now drawn around every number on
  offer, and the tell sits near 15%, which is what small answers like ⟨0, 1⟩ cost honestly.
- **About 4,600 find-the-slip questions** asked of every topic at every difficulty,
  asserting three different mistakes, each one of that question's own diagnoses; the one
  to pick is the diagnosis of the squire's answer, which is a wrong one; no mistake quotes
  an answer on offer, and the one to pick never shares more words with the squire's answer
  than the other two; the verdict lays out all three with the squire's marked and says
  what the problem comes to; and a wrong pick would not be recorded as a slip. At least
  sixty topics must be askable this way; sixty-seven are.
- **45,600 rite trail lines**, one for every rung rendered, asserting each keeps the
  question's own words from its start, draws every matrix, fraction and power it reaches
  exactly as the question drew it, keeps no other markup, says when it was cut, cuts
  only after a whole word, and reads in 64 characters or fewer. Stripping the markup,
  as the trail used to, turned the first matrix rung into "Row 1 of −1 2 −3 −2 dotted
  with c".
- **2,400 determinant workings**, 2×2 and 3×3, recomputed from the matrix shown and
  asserting the working says what the number does to the unit square or cube: its size
  as the new area or volume, "flipped over" exactly when it is negative, and pressed flat
  exactly when it is zero. The 2×2 answer figure's caption must say the same. The
  working used to call the number a "signed area scaling factor" and stop, so a −25
  never said what its minus sign meant.
- **27,000 matrix identities** — rendered matrices parsed back out of the HTML and
  recomputed independently, including `A · adj(A) = det(A) · I` for the inverse.
- **Reachability of every one of the 70 topics** at 320×568, measured as the scroll
  distance needed to get to each topic's row — including the tap that opens its strand.
  The worst case is 1.1 viewports in the Training picker and 1.5 in the Chronicle; a flat
  list of all seventy would run to 6.3.
- **The scratch pad's arithmetic**, against 22 expressions with known values — squares,
  roots, precedence, unary minus, implicit multiplication, floating point — plus eleven
  malformed ones it has to refuse rather than guess at. That second list caught `1..2`
  quietly evaluating to 1, because `parseFloat` stops at the second dot.
- **The progressive web app, over real HTTP from a subdirectory** — the same shape as a
  GitHub project page. Asserts the worker registers at the right scope, the manifest parses
  and every icon it names returns 200, the shell precaches, and the game still loads and
  plays with the network switched off. A second test deploys a new build behind a running
  player and asserts they are told, that reloading lands them on it, and that the old cache
  is swept up.
- **Recovery from an evicted browser** — play, wipe local storage the way Safari would,
  reload, and assert both knights come back with their levels and cleared nodes intact,
  while a genuinely fresh browser stays fresh rather than inventing a save.
- **Save isolation on a shared browser** — two knights kept apart through switching back
  and forth, erasing one leaving the other intact, a pre-profiles save adopted without loss,
  a knight carried to an empty browser by code, and a corrupted code refused rather than
  overwriting anything. Plus the shared-device footgun itself: cancelling the "start over"
  prompt has to leave the save untouched.
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
- **41,000 calculus checks** — derivatives against centred finite differences, definite
  integrals against Simpson's rule, and limits against numeric evaluation.
- **Every realm's difficulty curve**, simulated by running the real combat code with a
  player of known accuracy and the gear that realm's gold could actually have bought, 40
  runs per cell. Across all eight realms perfect play always clears, 60% accuracy usually
  does not, and accuracy beats gear everywhere. The simulation is also what found that the
  Integral Abyss had been *easier* than the Cliffs before it — an inversion that predated
  these realms and is now flattened.
- **38,400 figure specs**, checked for a known kind, the fields that kind cannot draw
  without, a domain the function is actually defined over, and — for question figures —
  that they do not give the answer away. That last check earned its keep immediately: it
  found that scalar multiplication could roll a scalar of 1, asking "1 · v = ?" over a
  picture of v, and that a linear combination could land back on one of its own inputs.
- **1,152 figures rendered in a headless browser at 320px**, asserting every one carries
  real ink rather than an empty frame, that none overflows its column, and that a full
  32-node campaign holds steady at one battle canvas with at most two figures alive —
  no leaked canvases.
- **Every id on one element.** The page finds each panel by its id, so two elements
  sharing one id means the second is never found, and whichever comes first gets written
  to, even on a screen that is shut. Every id written in the file, in the page and in the
  HTML its scripts build, is counted, and only alternatives that fill one slot may repeat.
  It found that the chain rule's which-dy/dx drew its curve and readout under the
  eigenvalue detective's ids, so after one round of it the detective drew its curve into
  the hidden chain rule panel and showed an empty frame. The chain rule's pick now has
  ids of its own.

---

## Installing it

Served over http(s) the game is a progressive web app: a manifest, an app icon and a
service worker that precaches the single HTML file. That buys three things, in the order
they matter:

1. **Storage that survives.** A home-screen web app is exempt from the storage sweep that
   would otherwise delete a knight left alone for a week.
2. **Offline play**, the same property the Scriptable build exists to provide, without
   needing Scriptable.
3. Full-screen chrome and an app icon.

The icons are drawn rather than stored — `node tools/make-icons.js` renders the crest with
canvas code and exports the PNGs, so the app icon cannot drift from the game's palette.
Opened straight off disk there is no worker and no manifest; those requests 404 and the
game is otherwise unaffected.

A single-file game cached aggressively could pin players to whatever build they first
opened, so the deploy stamps `sw.js` with the commit SHA. That guarantees a byte-different
worker per deploy, which is what makes a browser notice an update at all; the page then
offers **A new version is ready → Reload** rather than swapping the game out mid-fight.

Four things used to be able to leave a returning player on an old build, or looking at
the wrong build number, and the `pwa` suite now deploys builds behind a running player to
hold each one shut:

- **Later meant never.** A build found on an earlier visit sits installed and waiting, and
  the browser never announces it again, so a player who tapped *Later* — or closed the tab
  before the bar appeared — while another copy of the game was open was never told. Any
  waiting build is now offered on every load.
- **The new worker could cache the old game.** GitHub Pages serves with a ten-minute
  max-age, so the worker's precache could be filled from the browser's HTTP cache and
  serve the old `index.html` under the new version's name. The precache now goes past the
  HTTP cache.
- **The build stamp could name the old build.** Settings shows which build is running so a
  bug report can name it, but right after an update `build-info.json` came back from the
  browser's HTTP cache, or from the old version's cache before it was swept. The worker now
  answers only from its own version's cache and fetches anything else past the HTTP cache.
- **A home-screen game is never navigated**, and a navigation is the only time a browser
  looks for a new worker on its own. The game now looks whenever it comes back into view.

---

## Deployment

Every push to `main` publishes to https://neffer77.github.io/linear-algebra-game/ via
`.github/workflows/pages.yml`, which runs `validate → playthrough → build → deploy`.
Every push to any other branch runs the same `validate` and `playthrough` and stops
there, so a change is checked before it merges rather than after. A branch run also
breaks each guard listed in `tools/mutations.json` to confirm a check notices (see
*Mutations* below), and keeps a set of screenshots from `npm run shots` as a build
artifact. Branch runs get a concurrency group of their own and replace each other;
runs on `main` share one group and never cancel a deploy mid-publish.

- **validate** — syntax-checks JavaScript, confirms `index.html` has no missing local
  asset references, and regenerates `scriptable/KnightsOfTheEigenrealm.js` to verify the
  committed copy is not stale. A commit that fails any of these never reaches the site.
- **build** — stages `index.html`, `README.md`, and `scriptable/` into the published
  artifact, plus `.nojekyll` and a `build-info.json` stamped with the commit SHA.
- **deploy** — publishes the artifact to GitHub Pages, then reads `build-info.json` back
  from the live site, past every cache, and fails until it names the commit just built.
  A green deploy therefore means players are being served it, not only that GitHub took it.

Because the Scriptable file is generated, the sync check is what keeps the iOS build from
silently falling behind `index.html` when someone forgets to run `node build-scriptable.js`.
