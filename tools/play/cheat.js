/* T1 — the testing door.
 *
 * A cheat that opens the whole game is a testing tool, and the risk in it is
 * not that it works but that it fires when nobody asked. A player who taps the
 * build stamp while reading it, or pastes something odd into a box, must not
 * end up in an unlocked Sanctum at level one wondering what broke.
 *
 * So most of what is checked here is the door staying shut: the wrong word,
 * the sixth tap, taps spread out over time, and — once it has been used — the
 * knight carrying a mark that says the gates were opened rather than won.
 */
'use strict';

module.exports = {
  name: 'cheat',
  title: 'T1 · a door for testing, shut to everyone else',
  async run(t) {
    await t.newKnight('Tester');

    // --- everything is sealed to begin with ---
    const before = await t.ev(() => ({
      deep: Dungeon.unlocked(),
      sanctum: Dungeon.sanctumOpen(),
      arena: Arena.unlocked(),
      cleared: Object.keys(Game.s.cleared).length,
      cheated: Game.s.cheated,
      firstRun: Game.s.firstRun
    }));
    t.ok('a new knight finds the Deep sealed', !before.deep);
    t.ok('and the Sanctum', !before.sanctum);
    t.ok('and the Arena', !before.arena);
    t.eq('with no foe cleared', before.cleared, 0);
    t.eq('and no mark on them', before.cheated, 0);

    // --- the wrong word does nothing at all ---
    const wrong = await t.ev(() => {
      const out = {};
      const said = ['', 'open sesame', 'the gates', 'opnthegates', 'OPEN THE GATE'];
      out.refused = said.map(s => Cheats.say(s).ok);
      out.why = Cheats.say('open sesame').why;
      out.cleared = Object.keys(Game.s.cleared).length;
      out.deep = Dungeon.unlocked();
      out.cheated = Game.s.cheated;
      return out;
    });
    t.ok('a wrong word is refused, every time', wrong.refused.every(r => r === false),
      JSON.stringify(wrong.refused));
    t.ok('and says so without hinting', /Nothing answers/.test(wrong.why), wrong.why);
    t.eq('a refused word opens nothing', wrong.cleared, 0);
    t.ok('and leaves no mark', !wrong.deep && wrong.cheated === 0);

    // --- the right word opens all four gates at once ---
    const after = await t.ev(() => {
      const res = Cheats.say('open the gates');
      const foes = REALMS.reduce((n, r) => n + r.foes.length, 0);
      return {
        ok: res.ok, note: res.note,
        deep: Dungeon.unlocked(),
        sanctum: Dungeon.sanctumOpen(),
        arena: Arena.unlocked(),
        cleared: Object.keys(Game.s.cleared).length,
        foes,
        lastRealmOpen: !!Game.s.cleared[(REALMS.length - 1) + ':0'],
        cheated: Game.s.cheated,
        firstRun: Game.s.firstRun
      };
    });
    t.ok('the word opens the door', after.ok, after.note);
    t.ok('the Deep opens', after.deep);
    t.ok('the Sanctum opens', after.sanctum);
    t.ok('the Arena opens', after.arena);
    t.eq('every foe in every realm reads as cleared', after.cleared, after.foes);
    t.ok('including the last realm, which is otherwise eight bosses away',
      after.lastRealmOpen);
    t.eq('and the cellar is behind them, so the map is theirs', after.firstRun, 1);
    t.eq('the knight is marked', after.cheated, 1);

    // --- arming: the gates alone leave a level-one knight to die in the Sanctum ---
    const armed = await t.ev(() => {
      Game.s.cleared = {}; Game.s.cheated = 0;      // back to a sealed map
      Game.s.lvl = 1; Game.s.gold = 0; Game.s.xp = 30;
      Game.s.weapon = 'w0'; Game.s.armor = 'a0'; Game.s.owned = { w0: 1, a0: 1 };
      Game.s.items = { potion: 0, insight: 0, rage: 0, feather: 0, pick: 0 };
      Game.s.mats = { ore: 0, essence: 0 };
      const wasHp = Game.maxHp();
      const res = Cheats.say('arm the knight');
      const buyable = t => t.filter(x => !x.forge);
      return {
        ok: res.ok, note: res.note,
        lvl: Game.s.lvl, gold: Game.s.gold,
        weapon: Game.s.weapon, armor: Game.s.armor,
        bestWeapon: buyable(WEAPONS)[buyable(WEAPONS).length - 1].id,
        bestArmor: buyable(ARMORS)[buyable(ARMORS).length - 1].id,
        ownsAllBuyable: buyable(WEAPONS).concat(buyable(ARMORS)).every(x => Game.s.owned[x.id]),
        ownsDeepsteel: !!(Game.s.owned.wD || Game.s.owned.aD),
        picks: Game.s.items.pick,
        ore: Game.s.mats.ore, essence: Game.s.mats.essence,
        runes: Object.keys(Game.s.runes || {}).length,
        wasHp, maxHp: Game.s.maxHp, hp: Game.s.hp,
        // the gates are a different door, and arming must not open them
        deep: Dungeon.unlocked(), cleared: Object.keys(Game.s.cleared).length
      };
    });
    t.ok('the second word arms the knight', armed.ok, armed.note);
    t.ok('at a level fit for the end of the game', armed.lvl >= 30, String(armed.lvl));
    t.ok('with gold past the price of everything', armed.gold >= 99999, String(armed.gold));
    t.eq('the best blade on the bench, drawn', armed.weapon, armed.bestWeapon);
    t.eq('and the best plate, worn', armed.armor, armed.bestArmor);
    t.ok('everything the Smithy sells is owned', armed.ownsAllBuyable);
    t.ok('but not the deepsteel — that is the Forge\'s to make, and the point of testing it',
      !armed.ownsDeepsteel);
    t.eq('a full purse of lockpicks', armed.picks, 9);
    t.ok('and ore and essence to feed the Forge', armed.ore >= 200 && armed.essence >= 100,
      `${armed.ore} ore, ${armed.essence} essence`);
    t.eq('runes are left to be forged, not given', armed.runes, 0);
    t.ok('health follows the new plate rather than the old body',
      armed.maxHp > armed.wasHp && armed.hp === armed.maxHp,
      `${armed.wasHp} → ${armed.maxHp}, at ${armed.hp}`);
    t.ok('and arming opens no gate — that is the other word',
      !armed.deep && armed.cleared === 0);

    // --- teaching: skill charges are cut from mastery, so an armed knight
    //     with an empty head still carries an empty loadout ---
    const taught = await t.ev(() => {
      Game.s.cleared = {}; Game.s.cheated = 0; Game.s.gold = 0;
      Game.s.topicStats = {};
      Game.s.loadout = ['farsight', 'ward', 'steady'];
      const before = Loadout.chosen().map(a => Loadout.charges(a));
      const res = Cheats.say('teach me everything');
      const topics = Object.keys(TOPIC_LABEL);
      return {
        ok: res.ok, note: res.note,
        before,
        after: Loadout.chosen().map(a => Loadout.charges(a)),
        everyTopic: topics.every(k => Game.s.topicStats[k] && Game.s.topicStats[k].seen > 0),
        solid: topics.every(k => Mastery.eff(k) >= 0.85),
        count: Object.keys(Game.s.topicStats).length,
        want: topics.length,
        // again, its own door only
        gold: Game.s.gold, deep: Dungeon.unlocked()
      };
    });
    t.ok('the third word teaches every topic', taught.ok, taught.note);
    t.eq('all of them, not a strand', taught.count, taught.want);
    t.ok('every topic reads solid after the fade is applied', taught.solid);
    t.ok('an untaught knight carries skills with no charges',
      taught.before.every(c => c === 0), JSON.stringify(taught.before));
    t.ok('and a taught one carries them full',
      taught.after.every(c => c === 3), JSON.stringify(taught.after));
    t.ok('teaching hands out no gold and opens no gate',
      taught.gold === 0 && !taught.deep);

    // --- and one word for all three, which is the usual thing to want ---
    const everything = await t.ev(() => {
      Game.s.cleared = {}; Game.s.cheated = 0; Game.s.topicStats = {};
      Game.s.lvl = 1; Game.s.gold = 0; Game.s.weapon = 'w0'; Game.s.armor = 'a0';
      Game.s.owned = { w0: 1, a0: 1 };
      Game.s.loadout = ['farsight', 'ward', 'steady'];
      const res = Cheats.say('show me everything');
      const again = Cheats.say('show me everything');
      return {
        ok: res.ok, note: res.note, againNote: again.note,
        sanctum: Dungeon.sanctumOpen(), arena: Arena.unlocked(),
        lvl: Game.s.lvl, gold: Game.s.gold,
        charges: Loadout.chosen().map(a => Loadout.charges(a)),
        cheated: Game.s.cheated
      };
    });
    t.ok('one word does all three', everything.ok, everything.note);
    t.ok('the Sanctum and the Arena open', everything.sanctum && everything.arena);
    t.ok('the knight is armed', everything.lvl >= 30 && everything.gold >= 99999);
    t.ok('and carries full skills', everything.charges.every(c => c === 3),
      JSON.stringify(everything.charges));
    t.eq('and is marked', everything.cheated, 1);
    t.ok('saying it twice says there is nothing left to give',
      /nothing left/i.test(everything.againNote), everything.againNote);

    // --- it opens gates, and touches nothing else ---
    const untouched = await t.ev(() => {
      Game.s.gold = 137; Game.s.lvl = 2; Game.s.xp = 40;
      Game.s.items = { potion: 2, insight: 1, rage: 0, feather: 0, pick: 3 };
      Game.s.weapon = 'w0'; Game.s.armor = 'a0';
      Game.s.cleared = {}; Game.s.cheated = 0;
      Cheats.say('open the gates');
      return { gold: Game.s.gold, lvl: Game.s.lvl, xp: Game.s.xp,
               picks: Game.s.items.pick, weapon: Game.s.weapon, armor: Game.s.armor };
    });
    t.eq('it hands out no gold', untouched.gold, 137);
    t.eq('no levels', untouched.lvl, 2);
    t.eq('no experience', untouched.xp, 40);
    t.eq('no gear', untouched.weapon, 'w0');
    t.eq('no plate', untouched.armor, 'a0');
    t.eq('and no lockpicks', untouched.picks, 3);

    // --- spelling is forgiven, because it is a door and not a puzzle ---
    const spelling = await t.ev(() => {
      const forms = ['Open The Gates', 'OPEN THE GATES', 'open  the  gates',
                     'open-the-gates', ' open the gates! '];
      return forms.map(f => {
        Game.s.cleared = {}; Game.s.cheated = 0;
        return Cheats.say(f).ok;
      });
    });
    t.ok('case, spacing and punctuation are all forgiven',
      spelling.every(Boolean), JSON.stringify(spelling));

    // --- saying it twice is honest about there being nothing left to open ---
    const twice = await t.ev(() => {
      Game.s.cleared = {}; Game.s.cheated = 0;
      const first = Cheats.say('open the gates');
      const again = Cheats.say('open the gates');
      return { first: first.note, again: again.note, stillOk: again.ok };
    });
    t.ok('the first time says the gates are open', /stands open/i.test(twice.first), twice.first);
    t.ok('the second says they already were', /already/i.test(twice.again), twice.again);
    t.ok('and neither is an error', twice.stillOk);

    // --- the door needs seven deliberate taps ---
    const taps = await t.ev(() => {
      const out = {};
      const shut = () => !document.getElementById('codeBox').classList.contains('on');
      Cheats.close(); Cheats.taps = 0; Cheats.at = 0;
      for (let i = 0; i < 6; i++) Cheats.knock();
      out.shutAtSix = shut();
      Cheats.knock();
      out.openAtSeven = !shut();
      out.asksForWords = /testing door/i.test(document.getElementById('codeBox').innerText);
      Cheats.close();

      // ...and they have to be quick: a finger resting on the stamp over a
      // minute of reading must never add up to entry.
      Cheats.taps = 0; Cheats.at = 0;
      for (let i = 0; i < 20; i++) {
        Cheats.knock();
        Cheats.at -= (Cheats.GAP + 100);        // as if each tap were seconds apart
      }
      out.shutWhenSlow = shut();
      Cheats.close();
      return out;
    });
    t.ok('six taps leave the door shut', taps.shutAtSix);
    t.ok('the seventh opens it', taps.openAtSeven);
    t.ok('and it asks for the words rather than just firing', taps.asksForWords);
    t.ok('taps spread out over time never add up', taps.shutWhenSlow);

    // --- the stamp is the way in, and says so afterwards ---
    const stamp = await t.ev(() => {
      Game.s.cheated = 0;
      UI.go('s-prefs');
      const plain = document.getElementById('buildStamp').textContent;
      Cheats.say('open the gates');
      UI.go('s-prefs');
      const marked = document.getElementById('buildStamp').textContent;
      return { plain, marked, wired: typeof document.getElementById('buildStamp').onclick === 'function' };
    });
    t.ok('the build stamp is the way in', stamp.wired);
    t.ok('an honest knight has an unremarkable stamp',
      !/unlocked/.test(stamp.plain), stamp.plain);
    t.ok('an unlocked one says so, where a bug report will carry it',
      /unlocked for testing/.test(stamp.marked), stamp.marked);
    t.ok('and the stamp still names the build and the save format',
      /build/.test(stamp.marked) && /save format v/.test(stamp.marked), stamp.marked);

    // --- and the mark, like the gates, survives being put down ---
    await t.reload();
    const kept = await t.ev(() => ({
      cheated: Game.s && Game.s.cheated,
      deep: Dungeon.unlocked(),
      sanctum: Dungeon.sanctumOpen()
    }));
    t.eq('the mark survives a reload', kept.cheated, 1);
    t.ok('and so do the open gates', kept.deep && kept.sanctum);

    // --- the door is shut to a browser with nobody playing ---
    const nobody = await t.ev(() => {
      const held = Game.s;
      Game.s = null;
      const res = Cheats.say('open the gates');
      Game.s = held;
      return res;
    });
    t.ok('with no knight in hand the words do nothing', !nobody.ok, nobody.why);
  }
};
