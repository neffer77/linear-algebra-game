#!/usr/bin/env node
/* Playthrough suites — the game, driven in a real browser.
 *
 *   npm run test:play                 every suite
 *   npm run test:play -- --suite run  just one
 *   PLAY_HEADED=1 npm run test:play   watch it happen
 *
 * tools/verify.js checks the things that can be checked without a browser: the
 * mathematics the generators claim to teach, and the knight codec. These check
 * the things that cannot — the run loop, the save referee, the first ninety
 * seconds, and the scheduler that decides what you are asked next.
 *
 * Each suite gets a fresh browser context, so a knight saved by one can never
 * leak into another.
 */
'use strict';

const { loadPlaywright, launchOptions, runSuite } = require('./play/harness');

const SUITES = [
  require('./play/save'),        // P0
  require('./play/wave'),        // P1
  require('./play/lock'),        // P3
  require('./play/run'),         // P4
  require('./play/frontdoor'),   // P5
  require('./play/adapt'),       // P6
  require('./play/skills'),      // S1
  require('./play/chain'),       // S2
  require('./play/foresight'),   // S3
  require('./play/tavern'),      // S4
  require('./play/passage'),     // S5
  require('./play/rumours'),     // S6
  require('./play/summit'),      // S7
  require('./play/sigil'),       // S8
  require('./play/wilds'),       // S9
  require('./play/thicket'),     // S10
  require('./play/sea'),         // S11a
  require('./play/library'),     // S11b
  require('./play/crucible'),    // S12
  require('./play/working'),     // S13
  require('./play/nudge'),       // the first step of the working, stopped short of the answer
  require('./play/a11y'),        // every control can be reached, named and pressed from the keyboard
  require('./play/again'),       // a miss is followed by a fresh question on the same topic
  require('./play/findslip'),    // a mastered topic is now and then asked as find the slip
  require('./play/talk'),        // foes speak: an opening line, gloats, worries and last words
  require('./play/elite'),       // a beaten foe comes back as an elite, one fight in four
  require('./play/phase'),       // a realm boss rallies at half health into a second phase
  require('./play/bestiary'),    // every foe on one page, a shadow until it is beaten
  require('./play/saga'),        // a chapter of the story told as each realm's boss falls
  require('./play/grade'),       // a victory graded S to C on three marks the fight holds
  require('./play/warpath'),     // victories in a row this sitting pay more gold
  require('./play/recover'),     // land the question like the one you missed for half the blow back
  require('./play/riposte'),     // a right answer as the foe winds up lands half again as hard
  require('./play/coup'),        // a right answer finishes a foe on its last 15% of health
  require('./play/nextfight'),   // a campaign victory offers the next fight on the road as one tap
  require('./play/secondwind'),  // a blow that would fell you leaves you at 1 health once a fight, and a last stand after
  require('./play/bestgrade'),   // each foe keeps its best grade on the map, and an all-S realm is crowned
  require('./play/gradetitles'), // Exemplar, Crowned and Paragon, from the best grades on the map
  require('./play/firsts'),      // the first S on a foe pays its gold once more
  require('./play/overkill'),    // a killing blow past the foe's last health pays gold
  require('./play/quarry'),      // one beaten foe a day pays its full gold again
  require('./play/parry'),       // five right in a row turn away the next miss's blow
  require('./play/sweep'),       // a win with no miss drops a sure, richer chest
  require('./play/revenge'),     // the foe that felled you holds your lost gold until you beat it
  require('./play/satchel'),     // twenty-five right answers open a chest with a rare find
  require('./play/boon'),        // a level-up offers a fat purse or a lucky find for the next win
  require('./play/march'),       // every foe of a realm beaten with no fall between drops an epic chest
  require('./play/comeback'),    // a win from a quarter of your health or less pays a quarter more gold
  require('./play/sitting'),     // the map counts this sitting's victories, gold and best streak
  require('./play/milestone'),   // every fifth victory of a sitting drops a sure chest
  require('./play/fresh'),       // the first victory of a sitting pays double experience
  require('./play/gild'),        // now and then a question pays gold when answered right
  require('./play/oath'),        // swear to win a fight with no miss, for more gold and an epic chest
  require('./play/greedy'),      // a beaten foe comes back with triple gold and flees after six questions
  require('./play/riddle'),      // a chest's riddle on the fight's topic raises its find a rarity
  require('./play/heroic'),      // a beaten foe fought again with the hardest riddles, for double gold
  require('./play/scout'),       // study the next foe's weak point first, and strikes on it land twice as hard
  require('./play/wayfarer'),    // now and then someone on the road asks a question for a small prize
  require('./play/familiar'),    // twenty right answers in a sitting hatch an egg, and the familiar mends health
  require('./play/rival'),       // Sir Corvin waits on the road of each realm's strongest foe and offers a duel
  require('./play/campfire'),    // a wounded knight goes over a slip by the fire, and a right answer mends half
  require('./play/treasure'),    // three wins at A or better make a map, and a win where X marks digs up a hoard
  require('./play/gauntlet'),    // a realm all beaten runs again back to back for every first-clear purse
  require('./play/flourish'),    // eight right in a row can be spent for one blow three times as hard
  require('./play/stance'),      // before the first answer, go in bold or guarded
  require('./play/peddler'),     // the third victory of a sitting meets one thing to buy at half price
  require('./play/dicer'),       // the fourth victory of a sitting offers double or nothing on the purse
  require('./play/hearth'),      // a day streak pays the first victory of each sitting more gold
  require('./play/letters'),     // every tenth victory brings a letter from home, with a draught inside
  require('./play/sky'),         // a realm's omen this sitting: a gold moon, a fair wind or a mist
  require('./play/ballad'),      // every victory card sings the fight in a line of its own
  require('./play/tale'),        // every campaign victory's verse kept on the map, newest first
  require('./play/honours'),     // a star on the shield for every boss beaten, a shining blade from the third
  require('./play/weakpoint'),   // every campaign foe has a topic it cannot stand
  require('./play/slips'),       // the same mistake twice is named
  require('./play/review'),      // what has faded is named on the map and brought back
  require('./play/competency'),  // the curriculum on one screen, every topic on its rung
  require('./play/workshop'),    // a matrix turned by hand, the plane redrawn on each tap
  require('./play/dot'),         // two arrows set by hand, their dot product, angle and shadow
  require('./play/eig'),         // one arrow, four matrices: hunt the directions each only stretches
  require('./play/slope'),       // a secant becomes a tangent as h closes in
  require('./play/compose'),     // two moves of the plane, and why their order matters
  require('./play/limit'),       // closing in on a point from the left and the right
  require('./play/limpick'),   // see a ratio and where x heads, pick its limit or that it has none
  require('./play/gapread'),   // see a graph with four points, say at each whether it is joined up, has a hole, jumps or runs off
  require('./play/descent'),     // a walk down a valley against its gradient
  require('./play/span'),        // a of one arrow and b of another
  require('./play/elim'),        // two equations solved with row operations
  require('./play/undo'),        // the matrix that puts a move back
  require('./play/fit'),         // the line that misses least
  require('./play/newton'),      // a tangent's road to a root
  require('./play/chainrule'),   // why the slopes of two links multiply
  require('./play/castles'),     // the split a matrix leaves alone
  require('./play/optim'),       // the biggest build a fixed fence allows
  require('./play/cistern'),     // what an integral adds up
  require('./play/hopital'),     // ratios that give 0/0
  require('./play/handson'),     // the workshop that fits a fall
  require('./play/product'),     // two strips and a corner
  require('./play/ladder'),      // a sliding ladder's two speeds
  require('./play/null'),        // the arrows a matrix crushes
  require('./play/gram'),        // taking a shadow away
  require('./play/geo'),         // an endless sum, term by term
  require('./play/bend'),        // the slope of the slope, and where the bend flips
  require('./play/avg'),         // the average value as the height an area settles at
  require('./play/tail'),        // improper integrals: which endless areas stay finite
  require('./play/lathe'),       // volumes of revolution as a stack of disks
  require('./play/swap'),        // u-substitution as a swap
  require('./play/implicit'),    // implicit differentiation round a curve
  require('./play/parts'),       // integration by parts as a split
  require('./play/detect'),      // eigenvalues where det(A − λI) = 0
  require('./play/hill'),        // the slope each way you face: ∇f · û
  require('./play/cof'),         // a 3×3 determinant along any row or column
  require('./play/cover'),       // partial fractions by covering up roots
  require('./play/slice'),       // double integrals one slice at a time
  require('./play/tracer'),      // the derivative traced out as dots
  require('./play/arrow'),       // adding, stretching and measuring vectors
  require('./play/horizon'),     // where a fraction heads as x grows
  require('./play/cross'),       // an arrow square to two others
  require('./play/quot'),        // the slope of f/g
  require('./play/anti'),        // the power rule run backwards
  require('./play/transpose'),   // rows into columns, by hand
  require('./play/diag'),        // eigenvectors make P⁻¹AP diagonal
  require('./play/trigint'),     // divide by the k inside
  require('./play/tanplane'),    // a height and two slopes
  require('./play/invslope'),   // mirror the curve, flip the slope
  require('./play/logdiff'),    // x in the base and the power: take ln first
  require('./play/pathchain'),  // dz/dt along a path: an x part and a y part
  require('./play/expint'),  // ∫ e^(kx) dx: fit F to a slope field, divide by k
  require('./play/eulerwalk'), // walk y′ = f(x, y) in Euler's steps by hand
  require('./play/doubling'),  // walk y′ = ky a whole or half stretch at a time
  require('./play/meanvalue'), // match a tangent to the chord by hand
  require('./play/chordpick'), // see a curve and its chord, pick which of four numbers is c
  require('./play/chordturn'), // see four curves with their chords, call whether each c lies left of the middle, at it, or right
  require('./play/tanline'),   // estimate f(x) from the tangent at a and measure the miss
  require('./play/estpick'),   // see a curve and an x near a, pick which of four numbers is the tangent's estimate
  require('./play/tanturn'),   // see four curves, call each tangent estimate too high, too low or exact
  require('./play/arclen'),    // lay chords along a curve and watch them close in on its length
  require('./play/arcpick'),  // see a curve, pick which of four integrals is its length
  require('./play/logistic'),  // step a population toward its ceiling and watch the rate rise and fall
  require('./play/logipick'),  // see r, K and P, pick which of four numbers is dP/dt
  require('./play/logiturn'),  // see four populations, call each growing, holding or shrinking
  require('./play/trapezoid'), // cut an area into strips and watch the trapezoids' gap quarter
  require('./play/trappick'),  // see a curve and its heights, pick which number is the trapezoid estimate
  require('./play/trapturn'),  // see four curves cut into strips, call each estimate over, exact or under
  require('./play/stretchpick'), // see y(0) and y one stretch on, pick which of four numbers is y later
  require('./play/wsindex'), // every workshop one tap from the top of the Tome
  require('./play/slopematch'), // see f, pick which of three graphs is f′
  require('./play/slopesketch'), // see f, set its slope at five stops and draw f′ by hand
  require('./play/matpick'), // see a shape, pick which of four matrices makes it
  require('./play/detrank'), // see four matrices, and rank them from the biggest stretch of area to the smallest
  require('./play/eigspot'), // see four arrows, spot the one a matrix keeps on its line
  require('./play/eigturn'), // see four matrices with an arrow each, call each arrow kept, turned or knocked off
  require('./play/intpick'), // see a shaded curve, pick which of four numbers is its integral
  require('./play/areaturn'), // see four curves cut into rectangles, call each sum over, exact or under
  require('./play/chainpick'), // see y = f(g(x)), pick which of four formulas is its slope
  require('./play/chaincurve'), // step t along a curve and read dy/dx as dy/dt over dx/dt
  require('./play/productpick'), // see y = f(x) · g(x), pick which of four formulas is its slope
  require('./play/productturn'), // see four products at a point each, call each rising, flat or falling
  require('./play/quotpick'), // see y = f(x) / g(x), pick which of four formulas is its slope
  require('./play/quotturn'), // see four fractions y = f/g, call whether each is rising, flat or falling at its point
  require('./play/lampick'),  // see a matrix, pick which of four pairs are its eigenvalues
  require('./play/charmatch'),  // match four matrices to their det(A − λI)
  require('./play/spanpick'), // see two arrows and a ring, pick which of four mixes lands on it
  require('./play/spanturn'), // see four pairs of arrows, call each the plane, a line or a point
  require('./play/dotpick'),  // see two arrows, pick which of four numbers is u·v
  require('./play/dotturn'),  // see four pairs of arrows, call each angle less than, exactly or more than 90°
  require('./play/antipick'), // see f, pick which of four F has f as its slope
  require('./play/antiturn'), // see four guesses F, call whether each is too steep, just right or too shallow for its f
  require('./play/transpick'), // see A, pick which of four matrices is Aᵀ
  require('./play/transsort'), // call four square matrices: Aᵀ = A, Aᵀ = −A or neither
  require('./play/crosspick'), // see u and v, pick which of four arrows is u × v
  require('./play/crossturn'), // call four pairs flat on the page: u × v out, in or zero
  require('./play/undopick'), // see A, pick which of four matrices is A⁻¹
  require('./play/undosort'), // see four matrices, name what undoes each
  require('./play/nullpick'), // see a flat A, pick which of four arrows it crushes
  require('./play/kermatch'), // see four flat matrices and four arrows, and match each matrix to the arrow it crushes
  require('./play/grampick'), // see u₁ and u₂, pick which of four numbers is c
  require('./play/gramturn'), // see four pairs of arrows with a c each, call each c too low, just right or too high
  require('./play/cofpick'), // see a 3×3 matrix, pick which of four numbers is det A
  require('./play/elimpick'), // see two rows, pick which of four numbers k clears x
  require('./play/hoppick'), // see a 0/0 ratio, pick which of four numbers is its limit
  require('./play/hopsort'), // see four ratios, and sort which are 0/0 and need the rule and which plug straight in
  require('./play/newtonpick'), // see a curve and a first guess, pick which of four numbers is the next guess
  require('./play/newtonturn'), // see four curves with a first guess each, call where each Newton step goes
  require('./play/avgpick'), // see a curve and its area, pick which of four numbers is its average value
  require('./play/avgturn'), // see four curves, call each average above f at the middle, equal to it or below it
  require('./play/geopick'), // see a series, pick which of four numbers is its endless sum
  require('./play/georeach'), // step x along a power series and find how far it still adds up
  require('./play/rowmoves'), // work a 3×3 matrix down with row moves and keep track of its determinant
  require('./play/elimcramer'), // find each unknown of a 2×2 system as a ratio of two parallelogram areas
  require('./play/ladpick'), // see a ladder, pick which of four numbers is the top's speed
  require('./play/ladderturn'), // see four ladders, call each top faster, just as fast or slower than its foot
  require('./play/imppick'), // see a curve and a point, pick which of four numbers is the slope there
  require('./play/impturn'), // see four curves with a point each, call each tangent rising, falling, flat or upright
  require('./play/covpick'), // see a fraction split in two, pick which of four numbers is A
  require('./play/coverturn'), // see four fractions split in two, call whether A is bigger than B, the same or smaller
  require('./play/trigpick'), // see a wave to undo, pick which of four numbers is c
  require('./play/trigturn'), // see four waves with a guess F each, call whether F is right, flipped, or the wrong size
  require('./play/flippick'), // see a cubic, pick which of four numbers is where its bend flips
  require('./play/shaperead'), // read a curve's four points: rises or falls, cup or cap
  require('./play/tailpick'), // see an endless area, pick which of four numbers it closes in on
  require('./play/tailsort'), // see four endless areas, and call which close in and which run off
  require('./play/growpick'), // see an exponential, pick which of four numbers goes in front of its antiderivative
  require('./play/seriespick'), // see an exponential, pick which of four numbers sits in front of a power of x
  require('./play/taylorturn'), // see four functions cut off after a few terms, call each P over, exact or under
  require('./play/taylormatch'), // match four functions to the polynomial that hugs each near 0
  require('./play/lathepick'), // see a curve spun into a solid, pick which of four numbers is its volume
  require('./play/latheturn'), // see four pairs of curves spun into solids, call whether f's holds more than g's, the same or less
  require('./play/hillpick'), // see a hill, a point and a heading, pick which of four numbers is the slope that way
  require('./play/hillfence'), // walk a fence across a hill to its lowest point, where ∇f lines up with ∇g
  require('./play/pathpick'), // see a hill, a path and a moment, pick which of four numbers is dz/dt
  require('./play/powpick'), // see A, its eigenvectors and v, pick which of four vectors is Aⁿv
  require('./play/flowmatch'), // see the arrows of x′ = Ax, pick which of four matrices drew them
  require('./play/tanpick'), // see a surface and a point, pick which of four planes touches it there
  require('./play/planeturn'), // see four surfaces, call each above its tangent plane, below it or crossing it
  require('./play/cisternpick'), // see a spring's flow, pick which of four numbers is the total after so many hours
  require('./play/cisternsketch'), // see a spring's flow, set the total at the end of each hour and draw F
  require('./play/invpick'), // see a rising curve and a point, pick which of four numbers is the slope of its inverse there
  require('./play/invturn'), // see four curves and a point on each inverse, call it steeper than 1, exactly 1 or gentler
  require('./play/hzpick'), // see a fraction with the same power on top and underneath, pick which of four numbers it heads for
  require('./play/hzrace'), // see four functions, rank them from slowest to fastest as x grows without end
  require('./play/fitpick'), // see a few points, pick which of four numbers is the slope of the best line through them
  require('./play/fitrank'), // see four lines through the same points, and rank them from the best fit to the worst
  require('./play/buildpick'), // see a fence and a paddock count, pick which of four widths holds the most
  require('./play/optturn'), // see four slopes that are 0 at a point, call each a peak, a valley or neither
  require('./play/slicepick'), // see a plane over a rectangle, pick which of four numbers is the volume under it
  require('./play/sliceturn'), // see four planes over rectangles, call whether each holds more than its box, the same or less
  require('./play/swappick'), // see an integral to swap, pick which of four numbers goes in front of the answer
  require('./play/swapturn'), // see four integrals with their u, call whether the rest is du exactly, up to a number, or leaves an x over
  require('./play/splitpick'), // see how the knights ride, pick which of four numbers is the steady split
  require('./play/castleturn'), // see four pairs of castles, call whether A gains, holds or loses in a night
  require('./play/partspick'), // see an integral to split, pick which of four numbers stands alone in the answer
  require('./play/partsturn'), // see four integrals split into u and dv, call whether what parts leaves is easier, the same kind or harder
  require('./play/secantpick'), // see a curve and a step, pick which of four numbers is the secant's slope
  require('./play/secturn'), // see four curves with a secant each, call its slope more than f′(a), equal to it or less
  require('./play/descentpick'), // see a valley, a start and a step size, pick which of four numbers one step lands on
  require('./play/contourmatch'), // see a contour map and pick which of four functions f(x, y) drew it
  require('./play/arrowpick'), // see u, v and k, pick which of four lengths is the length of k·u + v
  require('./play/arrowturn'), // see four pairs of arrows, call whether u + v or u − v is longer, or they are the same
  require('./play/mixpick'), // the Tome's mix: one question from a different workshop's pick mode each time
  require('./play/composepick'), // see A and B, pick which of four matrices does A first, then B
  require('./play/composeturn'), // see four pairs of matrices, call whether the order makes a difference to each
  require('./play/lnpick'), // see a product of powers, pick which of four numbers is the slope of ln y
  require('./play/eulerpick'), // see y′ = px + qy, a start and a step, pick which of four numbers is Euler's estimate
  require('./play/fieldmatch'), // see a slope field and pick which of four equations y′ = f(x, y) drew it
  require('./play/area'),        // rectangles under a curve close in on the integral
  require('./play/taylor'),      // a function rebuilt from powers of x
  require('./play/lesson'),      // S14
  require('./play/keep'),        // S15
  require('./play/ios'),         // the iOS app's bridge
  require('./play/pwa'),         // the installed game finds the newest build
  require('./play/map'),         // M1
  require('./play/cheat')        // T1
];

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
}

(async () => {
  const only = arg('--suite');
  const picked = only ? SUITES.filter(s => s.name === only) : SUITES;
  if (only && !picked.length) {
    console.error(`No suite named "${only}". Try: ${SUITES.map(s => s.name).join(', ')}`);
    process.exit(2);
  }

  const { chromium } = loadPlaywright();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
  } catch (e) {
    console.error('Could not start Chromium: ' + e.message +
      '\nInstall it with: npx playwright install chromium');
    process.exit(2);
  }

  console.log('\nKnights of the Eigenrealm — playthrough');
  console.log('──────────────────────────────────────────────────────────');

  let failed = 0, total = 0;
  const started = Date.now();
  for (const suite of picked) {
    const checks = await runSuite(browser, suite);
    const bad = checks.filter(c => !c.pass);
    total += checks.length;
    failed += bad.length;
    const mark = bad.length ? '✗' : '✓';
    console.log(`\n  ${mark} ${suite.title}   ${checks.length - bad.length}/${checks.length}`);
    // Passing suites stay quiet; a failing one shows everything it knows.
    for (const c of bad) {
      console.log(`      FAIL  ${c.name}`);
      if (c.detail) console.log(`            ${c.detail}`);
    }
  }
  await browser.close();

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\n──────────────────────────────────────────────────────────');
  if (failed) {
    console.log(`\n${failed} of ${total} checks failed  (${secs}s)\n`);
    process.exit(1);
  }
  console.log(`\nAll ${total} checks passed  (${secs}s)\n`);
})();
