/* S8 — the ward-stone, and Spellcraft finally having something to practise on.
 *
 * Ward has worked since the first slice: press it, and the next blow that lands
 * is halved. But the SKILL behind it has never had a room. Delving has the
 * seam, Scrying has the fork, Dice and Cards have the tables — Spellcraft had a
 * strand of mathematics nothing in the game ever asked about on purpose, which
 * is why the build audit has been calling it half-built for four slices.
 *
 * So there are two different claims here, and both need checking.
 *
 * The first is that the room is PRACTICE: its riddles come from the skill's own
 * strand, read off the ability table rather than written down a second time, so
 * that standing in one is the thing that fills Ward's charges.
 *
 * The second is that what it pays is a real decision. Each clean answer cuts a
 * layer; pressing on stakes the last layer you cut against one more. That is a
 * bet of n to win n+1 at your own accuracy p, worth n + 2p − 1 — so it is worth
 * taking exactly when p > ½, whatever n is. The n falling out is the whole
 * lesson, and it is worth nothing if the arithmetic in the room disagrees.
 */
'use strict';

module.exports = {
  name: 'sigil',
  title: 'S8 · a ward is cut, not bought',
  async run(t) {
    await t.newKnight('Warder');

    // --- the room is practice for the skill, not for the place ---
    const strand = await t.ev(() => {
      const out = {};
      const ward = Loadout.byId('ward');
      out.wardSkill = ward.skill;
      out.wardStrand = ward.strand;
      out.roomStrand = Sigil.strand();
      out.topics = strandTopics(Sigil.strand());
      out.kindExists = !!RoomKinds.sigil;

      /* Every riddle the stone asks, over many builds, has to come out of that
         strand. Not "usually" — the room's whole claim is that it is where this
         skill is practised, and a room that drifts onto other mathematics half
         the time is a room that teaches something else. */
      Game.s.cleared = {};
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      Dungeon.descend('deep');
      const inStrand = new Set(out.topics);
      let asked = 0, off = [];
      for (let s = 0; s < 20; s++) {
        R.seed(9000 + s * 613);
        const spec = RoomKinds.sigil.build(R, 3 + (s % 9), SETTINGS.deep);
        R.unseed();
        for (const q of spec.qs) { asked++; if (!inStrand.has(q.key)) off.push(q.key); }
      }
      out.asked = asked;
      out.offStrand = off;
      return out;
    });
    t.ok('the ward-stone is a room kind like any other', strand.kindExists);
    t.eq('Ward is Spellcraft', strand.wardSkill, 'Spellcraft');
    t.eq('and the stone drills the strand Ward is made of',
      strand.roomStrand, strand.wardStrand);
    t.ok('which resolves to real topics',
      Array.isArray(strand.topics) && strand.topics.length > 5,
      JSON.stringify(strand.topics));
    t.eq('every riddle it asks comes out of that strand and no other',
      strand.offStrand, []);
    t.ok('across a useful number of them', strand.asked >= 60, String(strand.asked));

    // --- and it is built purely, like every other room ---
    const pure = await t.ev(() => {
      const out = {};
      const build = () => {
        R.seed(4242);
        const spec = RoomKinds.sigil.build(R, 5, SETTINGS.deep);
        R.unseed();
        return spec.qs.map(q => q.key + '|' + q.q);
      };
      const a = build(), b = build();
      out.same = JSON.stringify(a) === JSON.stringify(b);
      out.count = a.length;

      /* Building a room must not move the scheduler's no-repeat cursor, or
         merely peeking at the dungeon would change what the next fight asks.
         That is what the `pure` flag on Mastery.pick is for, and this is the
         check that it was passed. */
      Mastery._last = 'sentinel';
      R.seed(77); RoomKinds.sigil.build(R, 4, SETTINGS.deep); R.unseed();
      out.cursorHeld = Mastery._last === 'sentinel';
      return out;
    });
    t.ok('the same seed and depth build the same stone', pure.same);
    t.eq('with one riddle per layer', pure.count, 3);
    t.ok('and building it does not disturb what the next fight will ask',
      pure.cursorHeld);

    // --- where stones are found ---
    const where = await t.ev(() => {
      const out = { deep: 0, summit: 0, atOne: 0, rooms: 0 };
      for (const key of ['deep', 'summit']) {
        Dungeon.descend(key);
        for (let seed = 1; seed <= 60; seed++) {
          Dungeon.run.seed = seed * 2654;
          for (let d = 1; d <= 25; d++) {
            const r = Dungeon.peek(d);
            out.rooms++;
            if (r.name === 'sigil') { out[key]++; if (d === 1) out.atOne++; }
          }
        }
      }
      // never in a setting that lays its rooms out by hand
      out.planned = ['cellar', 'sanctum', 'tavern'].filter(k =>
        (SETTINGS[k].plan || []).indexOf('sigil') >= 0);
      out.deepChance = SETTINGS.deep.sigilChance;
      out.summitChance = SETTINGS.summit.sigilChance;
      return out;
    });
    t.ok('stones are found in the Deep', where.deep > 20, String(where.deep));
    t.ok('and more often on the Summit, where a banked blow is worth most',
      where.summit > where.deep, `deep ${where.deep}, summit ${where.summit}`);
    t.ok('the Summit says so in its table',
      where.summitChance > where.deepChance,
      `${where.deepChance} vs ${where.summitChance}`);
    t.eq('never on the first room, like every other kind', where.atOne, 0);
    t.eq('and never in a setting that lays its rooms out by hand', where.planned, []);

    /* --- the shell and foresight read the same layout ---
       This is the bug the extraction was for: two copies of the room cascade,
       one in nextRoom and one in peek, kept in step by hand. A reading that
       disagrees with the room is worse than no reading at all. */
    const agree = await t.ev(() => {
      const out = { checked: 0, wrong: [] };
      Dungeon.descend('deep');
      for (let seed = 1; seed <= 30; seed++) {
        Dungeon.run.seed = seed * 7717;
        for (let d = 2; d <= 20; d++) {
          // what foresight says
          const said = Dungeon.peek(d).name;
          // and the cascade written out by hand — a second implementation on
          // purpose, so this proves agreement rather than self-consistency
          const set = SETTINGS.deep;
          R.seed(((Dungeon.run.seed ^ (d * 2654435761)) >>> 0) || 1);
          const real = R.chance(set.lockChance) ? 'lock'
                     : R.chance(set.seamChance || 0) ? 'seam'
                     : R.chance(set.sigilChance || 0) ? 'sigil' : 'monster';
          R.unseed();
          out.checked++;
          if (said !== real) out.wrong.push(`d${d} seed${seed}: ${said} vs ${real}`);
        }
      }
      out.everyKindReal = ['lock', 'seam', 'sigil', 'monster'].every(k => !!RoomKinds[k]);
      return out;
    });
    t.eq('the layout foresight reads is the layout the shell builds',
      agree.wrong, []);
    t.ok('over the whole depth of a descent', agree.checked > 500, String(agree.checked));
    t.ok('and every kind it can name is a kind that exists', agree.everyKindReal);

    /* --- the bet ---
       Driven through Sigil directly rather than by clicking, because what is
       being checked is the arithmetic of the stake and not the buttons. Every
       path ends in exactly one outcome, and none of them is a failure: a stone
       has no foe, so it can no more end a run than a chest can. */
    const bet = await t.ev(() => {
      const out = {};
      // A stone, played by answering a scripted string of right and wrong.
      const play = (script) => {
        let got = null, calls = 0;
        R.seed(31337);
        const spec = RoomKinds.sigil.build(R, 4, SETTINGS.deep);
        R.unseed();
        Sigil.begin(spec, { depth: 4, run: Dungeon.run }, o => { calls++; got = o; });
        for (const step of script) {
          if (step === 'seal') { Sigil.sealNow(); break; }
          if (step === 'leave') { Sigil.walkAway(); break; }
          const q = spec.qs[Sigil.at];
          if (!q) break;
          const choice = step ? q.a : q.choices.find(c => c !== q.a);
          Sigil.answer({ classList: { remove(){}, add(){} } }, choice);
          if (Sigil.resolved) break;
          Sigil.offer();                       // the timeout, taken by hand
        }
        // the room only reports when the player steps off it
        const go = document.getElementById('sigilGo');
        if (go) go.click();
        return { ward: got && got.ward, status: got && got.status,
                 asked: got && got.sigil.asked, calls };
      };

      Game.s.cleared = {};
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      Dungeon.descend('deep');

      out.missFirst = play([false]);
      out.allThree  = play([true, true, true]);
      out.twoThenMiss = play([true, true, false]);
      out.sealAtTwo = play([true, true, 'seal']);
      out.leave = play(['leave']);
      out.oneThenSeal = play([true, 'seal']);
      return out;
    });
    t.eq('missing the first riddle cuts nothing — and costs nothing',
      bet.missFirst.ward, 0);
    t.eq('three clean answers fill the stone', bet.allThree.ward, 3);
    t.eq('two and then a miss leaves one: the staked layer cracks',
      bet.twoThenMiss.ward, 1);
    t.eq('sealing keeps what was cut', bet.sealAtTwo.ward, 2);
    t.eq('and walking away keeps nothing', bet.leave.ward, 0);
    t.eq('one layer, sealed, is one ward', bet.oneThenSeal.ward, 1);
    t.ok('a stone can never end a run, whatever happens on it',
      [bet.missFirst, bet.allThree, bet.twoThenMiss, bet.sealAtTwo, bet.leave]
        .every(r => r.status === 'cleared'),
      JSON.stringify([bet.missFirst.status, bet.twoThenMiss.status]));
    t.ok('and reports exactly once, however it ends',
      [bet.missFirst, bet.allThree, bet.twoThenMiss, bet.sealAtTwo, bet.leave]
        .every(r => r.calls === 1));

    /* No ability may make a fight shorter, and no room may make one shorter
       either. Pressing on for another layer costs another riddle — the count of
       questions asked has to rise with the layers taken, or the stone is a way
       of buying protection with less work rather than more. */
    t.ok('a deeper ward is more questions, never fewer',
      bet.allThree.asked === 3 && bet.sealAtTwo.asked === 2 &&
      bet.oneThenSeal.asked === 1 && bet.leave.asked === 0,
      JSON.stringify([bet.allThree.asked, bet.sealAtTwo.asked,
                      bet.oneThenSeal.asked, bet.leave.asked]));

    // --- the run records what the room reports ---
    const run = await t.ev(() => {
      const out = {};
      Dungeon.descend('deep');
      out.startsEmpty = Dungeon.wards();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {}, ward: 2 });
      out.afterTwo = Dungeon.wards();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {}, ward: 3 });
      out.afterFive = Dungeon.wards();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {}, ward: 3 });
      out.capped = Dungeon.wards();
      out.cap = Dungeon.WARD_CAP;

      // it rides on the checkpoint, so closing the tab does not cost you the work
      out.inCheckpoint = Game.s.run.wards;
      Dungeon.active = false;
      Dungeon.resume();
      out.afterResume = Dungeon.wards();

      // and a fall takes them with the rest of the pot
      Dungeon.run.unbanked.gold = 500;
      Dungeon.died({ status: 'failed', quality: 0, topics: [], yield: {} });
      out.afterFall = Dungeon.wards();
      out.runGone = Game.s.run === null;

      // nothing is carried between descents either
      Dungeon.descend('deep');
      out.freshRun = Dungeon.wards();
      // and none of it leaks out of a run at all
      out.outsideRun = (Dungeon.active = false, Dungeon.wards());
      return out;
    });
    t.eq('a descent opens with no wards', run.startsEmpty, 0);
    t.eq('a sealed stone puts them on the run', run.afterTwo, 2);
    t.eq('and a second stone adds to the first', run.afterFive, 5);
    t.eq('up to a ceiling', run.capped, run.cap);
    t.eq('six of them', run.cap, 6);
    t.eq('they ride on the checkpoint', run.inCheckpoint, run.cap);
    t.eq('so a reload does not take back three answered riddles',
      run.afterResume, run.cap);
    t.eq('a fall loses them with the rest of the pot', run.afterFall, 0);
    t.ok('and the run with them', run.runGone);
    t.eq('a new descent starts bare', run.freshRun, 0);
    t.eq('and outside a descent there are none at all', run.outsideRun, 0);

    /* --- what a ward actually does ---
       Three things can stop a blow, and the order they are tried in is the
       design: the beast first because it is free, then a raised Ward because
       the player pressed it for THIS blow, then a banked layer because it will
       still be there for the next one. Cheapest first, so nothing a knight
       chose is ever spent on a blow something free was going to eat. */
    const blow = await t.ev(() => {
      const out = {};
      Dungeon.descend('deep');
      Battle.beastLeft = 0; Battle.wardUp = false;

      Dungeon.run.wards = 0;
      out.bare = Battle.takeHit(100);

      Dungeon.run.wards = 2;
      out.warded = Battle.takeHit(100);
      out.spentOne = Dungeon.wards();
      out.wardedAgain = Battle.takeHit(60);
      out.spentBoth = Dungeon.wards();
      out.bareAfter = Battle.takeHit(100);

      // a raised Ward goes first, and the banked layer is untouched
      Dungeon.run.wards = 1;
      Battle.wardUp = true;
      out.pressed = Battle.takeHit(100);
      out.wardStillThere = Dungeon.wards();
      out.pressedSpent = Battle.wardUp;

      // and the beast goes before both
      Battle.beastLeft = 1; Battle.wardUp = true; Dungeon.run.wards = 1;
      out.beast = Battle.takeHit(100);
      out.wardKept = Battle.wardUp;
      out.layerKept = Dungeon.wards();

      // never rounded away to nothing
      Battle.beastLeft = 0; Battle.wardUp = false; Dungeon.run.wards = 1;
      out.tiny = Battle.takeHit(1);
      return out;
    });
    t.eq('with no ward a blow lands whole', blow.bare, 100);
    t.eq('a banked layer halves it', blow.warded, 50);
    t.eq('and is spent doing so', blow.spentOne, 1);
    t.eq('the next one halves the next blow', blow.wardedAgain, 30);
    t.eq('until there are none left', blow.spentBoth, 0);
    t.eq('after which blows land whole again', blow.bareAfter, 100);
    t.eq('a raised Ward is spent before a banked one', blow.pressed, 50);
    t.eq('leaving the banked layer where it was', blow.wardStillThere, 1);
    t.ok('the pressed one is gone', blow.pressedSpent === false);
    t.eq('and the beast eats the blow before either', blow.beast, 0);
    t.ok('with the Ward still raised', blow.wardKept === true);
    t.eq('and the layer still banked', blow.layerKept, 1);
    t.eq('a halved blow never rounds away to nothing', blow.tiny, 1);

    // --- and it is visible, in the fight and at the fork ---
    const seen = await t.ev(() => {
      const out = {};
      Dungeon.descend('deep');
      Dungeon.run.wards = 3;
      Dungeon.cur = { kind: RoomKinds.sigil, spec: { kind: 'sigil' } };
      Dungeon.fork({ status: 'cleared', quality: 1, topics: [], yield: {},
                     ward: 3, sigil: { layers: 3, asked: 3 } });
      const fork = document.getElementById('resultBody').innerText;
      out.forkCounts = /3 wards carried/.test(fork);
      out.forkSaysSo = /ward holds at 3 layers/.test(fork);

      Dungeon.run.wards = 0;
      Dungeon.fork({ status: 'cleared', quality: 0, topics: [], yield: {},
                     ward: 0, sigil: { layers: 0, asked: 1 } });
      const blank = document.getElementById('resultBody').innerText;
      out.quietWhenNone = !/wards? carried/.test(blank);
      out.blankStone = /stone stays blank/.test(blank);

      // the powerbar carries the readout into the fight
      Dungeon.run.wards = 2;
      Battle.mode = 'dungeon';
      Battle.skillLeft = {};
      Battle.renderPowers();
      /* Read by its own slot rather than by matching text: the Ward ABILITY is
         also called Ward and also renders "×n", so a text match here would pass
         on the wrong thing entirely. */
      const slot = () => document.querySelector('#powerbar [data-pw="sigil"]');
      out.inFight = !!slot() && /Ward ×2/.test(slot().innerText);
      Dungeon.run.wards = 0;
      Battle.renderPowers();
      out.quietInFight = !slot();
      return out;
    });
    t.ok('the fork counts the wards you are carrying', seen.forkCounts);
    t.ok('and says what the stone gave', seen.forkSaysSo);
    t.ok('a blank stone says that instead', seen.blankStone);
    t.ok('and nothing is claimed when there is nothing', seen.quietWhenNone);
    t.ok('the fight shows what you are carrying', seen.inFight);
    t.ok('and shows nothing when you carry nothing', seen.quietInFight);

    // --- foresight knows what a ward-stone is ---
    const read = await t.ev(() => {
      const out = {};
      Dungeon.descend('deep');
      // Farsight names it
      out.scried = Dungeon.peek(2) &&
        (function () {
          const rooms = [];
          for (let seed = 1; seed <= 200 && rooms.length < 1; seed++) {
            Dungeon.run.seed = seed * 613;
            for (let d = 2; d <= 20; d++) if (Dungeon.peek(d).name === 'sigil') { rooms.push(d); break; }
          }
          if (!rooms.length) return null;
          Dungeon.run.depth = rooms[0] - 1;
          Dungeon.forkLeft = { farsight: 1 };
          Dungeon.scried = null;
          Dungeon.cur = { kind: RoomKinds.monster, spec: { kind: 'monster', foe: { nm: 'x' } } };
          Dungeon.scry();
          return Dungeon.scried && Dungeon.scried.line;
        })();
      // Rumours counts them
      out.rumoured = Dungeon.rumourLine([{ name: 'sigil' }, { name: 'sigil' }, { name: 'lock' }]);
      out.oneOfThem = Dungeon.rumourLine([{ name: 'sigil' }]);
      return out;
    });
    t.ok('Farsight names a ward-stone for what it is',
      /ward-stone/.test(read.scried || ''), String(read.scried));
    t.ok('and says there is no foe in it', /No foe/.test(read.scried || ''));
    t.ok('a rumour counts them', /<b>2<\/b> ward-stones/.test(read.rumoured), read.rumoured);
    t.ok('one of them is named singly', /<b>a ward-stone<\/b>/.test(read.oneOfThem),
      read.oneOfThem);

    /* --- and now the same room, actually played ---
       Everything above drives Sigil directly, which is how the arithmetic gets
       checked without forty seconds of animation. But a room nobody has clicked
       through is a room that might not render, so one stone is walked end to
       end: found in a real descent, entered by the shell, answered by pressing
       the buttons the player presses, and left through the fork. */
    await t.ev(() => {
      Game.s.cleared = {};
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, sigil: 1 };
      Dungeon.descend('deep');
      // the first seed whose second room is a ward-stone
      for (let s = 1; s <= 400; s++) {
        Dungeon.run.seed = s * 613;
        if (Dungeon.peek(2).name === 'sigil') break;
      }
      Dungeon.run.depth = 1;
      Dungeon.nextRoom();
    });
    const onStone = await t.screen();
    t.eq('a stone found in a real descent draws its own screen', onStone, 's-lock');
    t.ok('and says what it is', /ward-stone/i.test(await t.text()));

    await t.tapText(/Begin the inscription/);
    const asked = await t.ev(() => {
      const box = document.getElementById('sigilChoices');
      return { choices: box ? box.children.length : 0,
               layer: /layer 1\/3/.test(document.getElementById('lockBody').innerText),
               topic: Sigil.spec.qs[0].topic };
    });
    t.ok('the first riddle is on the screen, with choices',
      asked.choices >= 2 && asked.layer, JSON.stringify(asked));

    // answer it correctly, the way a player would
    await t.ev(() => {
      const b = document.querySelector('#sigilChoices .choice[data-correct="1"]');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 900));
    const offered = await t.ev(() => ({
      text: document.getElementById('lockBody').innerText,
      layers: Sigil.layers
    }));
    t.eq('a right answer cuts a layer', offered.layers, 1);
    t.ok('and the stone offers the stake in the plainest words it can',
      /stake 1 for 2/.test(offered.text), offered.text.slice(0, 200));
    t.ok('with the way out beside it', /Seal it at 1/.test(offered.text));
    /* And no third way out. Walking away is offered before the first riddle
       and never after, because once a layer is cut, leaving and sealing are the
       same act — two buttons doing one thing, one of which sounds like it
       forfeits something. */
    t.ok('and no way to leave that would throw away what was cut',
      !/unmarked/.test(offered.text), offered.text.slice(0, 200));

    await t.tapText(/Seal it at 1/);
    const sealed = await t.ev(() => ({
      text: document.getElementById('lockBody').innerText,
      wardsNotYet: Dungeon.wards()
    }));
    t.ok('sealing says what was carried', /\+1 ward carried/.test(sealed.text),
      sealed.text.slice(0, 200));
    t.eq('and the run has not been given it until the player steps off the room',
      sealed.wardsNotYet, 0);

    await t.tapText(/Onward/);
    const atFork = await t.ev(() => ({
      screen: document.querySelector('.screen.on').id,
      wards: Dungeon.wards(),
      fork: document.getElementById('resultBody').innerText
    }));
    t.eq('stepping off it lands on the fork', atFork.screen, 's-result');
    t.eq('with the ward now riding on the descent', atFork.wards, 1);
    t.ok('and counted there', /1 ward carried/.test(atFork.fork));

    // --- and a knight is told what the room is, once ---
    const intro = await t.ev(() => {
      const out = {};
      out.hasEntry = !!ROOM_INTRO.sigil;
      out.saysTheStake = /stake|cracks/.test((ROOM_INTRO.sigil || {}).b || '');
      out.saysWhatItPays = /halves one blow/.test((ROOM_INTRO.sigil || {}).b || '');
      Game.s.metRoom = {};
      out.neededFirst = RoomIntro.needed('sigil');
      RoomIntro.show('sigil', () => {});
      out.neededAfter = RoomIntro.needed('sigil');
      // every kind the shell can build has one
      out.everyKindIntroduced = Object.keys(RoomKinds).every(k => !!ROOM_INTRO[k]);
      return out;
    });
    t.ok('the stone introduces itself the first time', intro.hasEntry && intro.neededFirst);
    t.ok('and never again', intro.neededAfter === false);
    t.ok('the introduction names the stake', intro.saysTheStake);
    t.ok('and what a layer is worth', intro.saysWhatItPays);
    t.ok('as every room kind does', intro.everyKindIntroduced);
  }
};
