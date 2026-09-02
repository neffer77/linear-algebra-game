/* S6 — Rumours, and the table that sells them.
 *
 * Foresight is the channel the design calls the strongest reward in the game,
 * and it had one ability of five. The risk in adding a second is that it turns
 * out to be the first one again with a different icon — so most of what is
 * checked here is the two staying different.
 *
 * Farsight is a point observation: one room, named exactly, spent the moment
 * you walk into it. Rumours is a summary of a sample: three rooms counted and
 * totalled, silent about the order, and lasting the whole stretch it describes.
 * They answer different questions, and a knight carrying both should get two
 * different answers rather than the same one twice.
 */
'use strict';

module.exports = {
  name: 'rumours',
  title: 'S6 · what the next three rooms hold',
  async run(t) {
    await t.newKnight('Listener');

    // --- the ability, and where it sits ---
    const shape = await t.ev(() => {
      const out = {};
      const a = Loadout.byId('rumours');
      out.exists = !!a;
      out.where = a.where;
      out.strand = a.strand;
      out.strandResolves = Loadout.topicsOf(a).length > 0;
      out.inForesightTable = Dungeon.FORESIGHT.some(f => f.id === 'rumours');
      out.foresightCovered = Dungeon.FORESIGHT.every(f => !!Loadout.byId(f.id));
      out.span = Dungeon.RUMOUR_SPAN;
      return out;
    });
    t.ok('Rumours is an ability', shape.exists);
    t.eq('spent at the fork, like the foresight it is', shape.where, 'fork');
    t.eq('drawn from the mathematics of deciding on a sample', shape.strand, 'Applications');
    t.ok('whose strand exists', shape.strandResolves);
    t.ok('it is in the fork\'s foresight table', shape.inForesightTable);
    t.ok('and every entry in that table is a real ability', shape.foresightCovered);
    t.eq('it reaches three rooms', shape.span, 3);

    // --- charges behave like a fork ability, not a fight one ---
    const charges = await t.ev(() => {
      const out = {};
      const set = (n) => {
        const s = STRANDS.find(x => x[0] === n);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m: 0.95, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      Game.s.topicStats = {}; set('Applications'); set('Multivariable & Series');
      Game.s.loadout = ['rumours', 'farsight'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Game.s.runes = {};

      Dungeon.descend('deep');
      out.armed = Dungeon.forkCharges('rumours');
      out.notInPowerBar = !/Rumours/.test(document.getElementById('powerbar').innerText);
      out.notInFightLedger = Battle.skillLeft.rumours === undefined;

      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 60, xp: 10 } });
      Dungeon.hearRumours();
      out.afterOne = Dungeon.forkCharges('rumours');
      out.heard = !!Dungeon.heard;
      // a second listen while the stretch still stands is refused
      Dungeon.hearRumours();
      out.noDouble = Dungeon.forkCharges('rumours') === out.afterOne;
      // and a fresh descent re-arms
      Dungeon.descend('deep');
      out.fresh = Dungeon.forkCharges('rumours');
      out.clearedOnDescent = Dungeon.heard === null;
      return out;
    });
    t.eq('a solid knight carries three', charges.armed, 3);
    t.ok('it is not in the fight power bar', charges.notInPowerBar);
    t.ok('nor in the fight ledger', charges.notInFightLedger);
    t.eq('listening spends one', charges.afterOne, 2);
    t.ok('and produces a reading', charges.heard);
    t.ok('listening twice over the same ground is refused', charges.noDouble);
    t.eq('a fresh descent re-arms it', charges.fresh, 3);
    t.ok('and starts you deaf again', charges.clearedOnDescent);

    // --- it lasts the stretch it describes, which Farsight does not ---
    const span = await t.ev(() => {
      const out = {};
      Game.s.loadout = ['rumours', 'farsight'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      const at = Dungeon.run.depth;
      Dungeon.scry();
      Dungeon.hearRumours();
      out.through = Dungeon.heard.through;
      out.from = Dungeon.heard.from;
      out.bothShown = /Scry|blows|health/.test(document.getElementById('resultBody').innerText)
                   && /rooms hold|room holds/.test(document.getElementById('resultBody').innerText);

      // walk one room: the scried reading is gone, the rumour is not
      Dungeon.nextRoom();
      out.scriedGone = Dungeon.scried === null;
      out.stillHeard = Dungeon.heardHere();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      out.heardAtSecond = Dungeon.heardHere();
      Dungeon.nextRoom();
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      out.heardAtThird = Dungeon.heardHere();
      out.depthNow = Dungeon.run.depth;
      out.startedAt = at;
      return out;
    });
    t.eq('the reading covers three rooms from the next one', span.through, span.from + 2);
    t.ok('the fork shows both readings at once when both are paid for', span.bothShown);
    t.ok('walking a room spends the Farsight reading', span.scriedGone);
    t.ok('but not the rumour — it was about the stretch', span.stillHeard);
    t.ok('which still stands a room later', span.heardAtSecond);
    t.ok('and is spent only once the stretch is behind you',
      !span.heardAtThird, `depth ${span.depthNow}, heard through ${span.through}`);

    // --- and what it says has to be true of the rooms it describes ---
    const truth = await t.ev(() => {
      const out = { trials: 0, wrong: [] };
      Game.s.loadout = ['rumours'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      for (let i = 0; i < 15; i++) {
        Dungeon.descend('deep');
        Dungeon.run.seed = 4000 + i * 131;
        Dungeon.run.depth = 3;
        const rooms = [4, 5, 6].map(d => Dungeon.peek(d));
        const line = Dungeon.rumourLine(rooms);
        const fights = rooms.filter(r => r.name === 'monster');
        const hp = fights.reduce((n, r) => n + r.foe.hp, 0);
        out.trials++;
        // the count it states must be the count there is
        if (fights.length) {
          const m = /<b>(\d+)<\/b> fights?/.exec(line);
          if (!m || Number(m[1]) !== fights.length) out.wrong.push(`fights ${line}`);
          const h = /<b>(\d+)<\/b>\s*health/.exec(line);
          if (!h || Number(h[1]) !== hp) out.wrong.push(`health ${hp} vs ${h && h[1]}`);
        }
        // a champion is announced when there is one, and never when there is not
        const saysChamp = /champion/.test(line);
        const hasChamp = fights.some(r => r.foe.boss);
        if (saysChamp !== hasChamp) out.wrong.push('champion claim');
        // and it never names which room is which — that is Farsight's job
        for (const r of rooms) {
          if (r.foe && line.indexOf(r.foe.nm) >= 0) out.wrong.push('named a foe');
        }
        if (/Depth|room \d/.test(line)) out.wrong.push('named a position');
      }
      return out;
    });
    t.ok('the counts and totals it states are the ones the rooms actually hold',
      truth.trials >= 15 && truth.wrong.length === 0,
      `${truth.trials} trials; ${truth.wrong.slice(0, 4).join('; ')}`);

    // --- it stops at the end of a fixed-length setting rather than inventing rooms ---
    const edge = await t.ev(() => {
      Game.s.gold = 500;
      Game.s.loadout = ['rumours'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('tavern');
      Dungeon.run.depth = 4;                       // one room left of five
      return { peekPastEnd: Dungeon.peek(6) };
    });
    t.eq('peeking past the last room of a fixed setting reads as nothing', edge.peekPastEnd, null);

    const shortSpan = await t.ev(() => {
      Game.s.gold = 500;
      Game.s.loadout = ['rumours'];
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('tavern');
      Dungeon.run.depth = 4;
      Dungeon.hearRumours();
      return { through: Dungeon.heard.through, line: Dungeon.heard.line };
    });
    t.eq('so a rumour at the end of a night covers only what is left',
      shortSpan.through, 5);
    t.ok('and says so in the singular', /The next room holds/.test(shortSpan.line),
      shortSpan.line);

    // --- nothing is offered to a knight who cannot use it ---
    const quiet = await t.ev(() => {
      const out = {};
      Game.s.loadout = ['ward', 'sight', 'steady'];
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      out.silent = !/rumour|Rumours|Listen/i.test(document.getElementById('resultBody').innerText);

      Game.s.topicStats = {};
      Game.s.loadout = ['rumours'];
      Game.s.runes = {};
      Dungeon.descend('deep');
      out.zero = Dungeon.forkCharges('rumours');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 10, xp: 2 } });
      out.saysSpent = /Nothing more is being said/.test(document.getElementById('resultBody').innerText);
      Dungeon.hearRumours();
      out.cannotOnEmpty = Dungeon.heard === null;
      return out;
    });
    t.ok('the fork says nothing to a knight not carrying it', quiet.silent);
    t.eq('an unlearned skill grants no readings', quiet.zero, 0);
    t.ok('and the fork says so rather than offering a dead button', quiet.saysSpent);
    t.ok('listening on empty does nothing', quiet.cannotOnEmpty);

    // --- the rumour table ---
    const table = await t.ev(() => {
      const out = {};
      out.kindExists = !!RoomKinds.rumour;
      out.inTavernPlan = SETTINGS.tavern.plan.indexOf('rumour');
      out.tavernStillFive = SETTINGS.tavern.rooms === SETTINGS.tavern.plan.length;
      out.stillThreeHands = SETTINGS.tavern.plan.filter(k => k === 'wager').length;

      // the price is a fraction of what you carry, so it costs what it is worth
      out.priceOf100 = Rumour.price(100);
      out.priceOf400 = Rumour.price(400);
      out.priceOfNothing = Rumour.price(0);
      out.neverFree = Rumour.price(1);
      out.scales = Rumour.price(400) === 4 * Rumour.price(100);
      return out;
    });
    t.ok('the rumour table is a room kind', table.kindExists);
    t.eq('and the Tavern deals it second', table.inTavernPlan, 1);
    t.ok('without changing the length of a night', table.tavernStillFive);
    t.eq('or how many hands are in it', table.stillThreeHands, 3);
    t.ok('the price is a cut of what you carry, not a number',
      table.scales, `${table.priceOf100} vs ${table.priceOf400}`);
    t.eq('an empty pot is charged nothing', table.priceOfNothing, 0);
    t.ok('but a cut is never free', table.neverFree >= 1);

    // --- what the table sells has to be what the hands then ask ---
    const sells = await t.ev(() => {
      const out = { trials: 0, wrong: [] };
      Game.s.gold = 500;
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      for (let i = 0; i < 8; i++) {
        Dungeon.descend('tavern');
        Dungeon.run.seed = 9000 + i * 77;
        // stand at the rumour table (depth 2 in the plan)
        Dungeon.run.depth = 2;
        Rumour.ctx = { run: Dungeon.run, depth: 2, setting: 'tavern' };
        const sold = Rumour.ahead();
        out.trials++;
        // every hand it names must be a hand, and the topic must be the topic
        for (const s of sold) {
          const real = Dungeon.peek(s.depth);
          if (!real || real.name !== 'wager') out.wrong.push(`depth ${s.depth} is ${real && real.name}`);
          else if (real.topic !== s.topic) out.wrong.push(`topic ${s.topic} vs ${real.topic}`);
        }
        // and it names every remaining hand, not some of them
        const remaining = [3, 4, 5].filter(d => {
          const r = Dungeon.peek(d); return r && r.name === 'wager';
        });
        if (sold.length !== remaining.length) out.wrong.push(`${sold.length} of ${remaining.length}`);
      }
      return out;
    });
    t.ok('every topic the stranger sells is the topic that hand actually asks',
      sells.trials >= 8 && sells.wrong.length === 0,
      `${sells.trials} trials; ${sells.wrong.slice(0, 4).join('; ')}`);

    // --- peeking must not change what it peeks at ---
    const inert = await t.ev(() => {
      const out = {};
      Game.s.gold = 500;
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('tavern');
      Dungeon.run.seed = 12345;
      const before = Mastery._last;
      const first = Dungeon.peek(3).topic;
      const second = Dungeon.peek(3).topic;
      for (let i = 0; i < 20; i++) Dungeon.peek(3);
      const after = Dungeon.peek(3).topic;
      out.stable = first === second && second === after;
      out.cursorUntouched = Mastery._last === before;
      // and the room built for real asks what the peek said it would
      Dungeon.run.depth = 2;
      Dungeon.nextRoom();
      out.built = Dungeon.cur.spec.kind;
      out.builtTopic = Dungeon.cur.spec.q && Dungeon.cur.spec.q.key;
      out.promised = first;
      return out;
    });
    t.ok('peeking the same room twice gives the same answer', inert.stable);
    t.ok('and does not move the scheduler\'s no-repeat cursor', inert.cursorUntouched);
    t.eq('the room built for real is the one that was peeked', inert.built, 'wager');
    t.eq('asking the topic the stranger sold', inert.builtTopic, inert.promised);

    // --- buying is a choice, and folding is free ---
    const buying = await t.ev(() => {
      const out = {};
      Game.s.gold = 500;
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };

      Dungeon.descend('tavern');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();                            // the rumour table
      out.screenIsTheTable = /stranger/i.test(document.getElementById('lockBody').innerText);
      const potBefore = Dungeon.run.unbanked.gold;
      out.offersAPrice = /Hear it/.test(document.getElementById('lockBody').innerText);
      Rumour.buy();
      out.paid = potBefore - Dungeon.run.unbanked.gold;
      out.expected = Rumour.price(potBefore);
      out.namesTopics = /Table \d/.test(document.getElementById('lockBody').innerText);

      // and folding costs nothing
      Dungeon.descend('tavern');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();
      const pot2 = Dungeon.run.unbanked.gold;
      Rumour.walkAway();
      out.foldCost = pot2 - Dungeon.run.unbanked.gold;
      return out;
    });
    t.ok('the Tavern deals the rumour table where it says it does', buying.screenIsTheTable);
    t.ok('and it quotes a price', buying.offersAPrice);
    t.eq('buying costs the cut', buying.paid, buying.expected);
    t.ok('and names the tables it knows about', buying.namesTopics);
    t.eq('folding costs nothing at all — a room is never a gate', buying.foldCost, 0);

    // --- the room walks through the shell like every other kind ---
    const shell = await t.ev(() => {
      const out = { crashes: [] };
      Game.s.gold = 500;
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      for (const outcome of [{ paid: 12, heard: 2 }, { paid: 0, heard: 0 }]) {
        try {
          Dungeon.descend('tavern');
          Dungeon.cur = { kind: RoomKinds.rumour, spec: { kind: 'rumour', depth: 2 } };
          Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {},
                            rumour: outcome });
          const txt = document.getElementById('resultBody').innerText;
          if (!/table waits|tables of/.test(txt) && !/Out into the night/.test(txt))
            out.crashes.push('fork said: ' + txt.slice(0, 60));
        } catch (e) { out.crashes.push(e.message); }
      }
      // and through a death screen, which has no foe to name here
      try {
        Dungeon.descend('deep');
        Dungeon.cur = { kind: RoomKinds.rumour, spec: { kind: 'rumour', depth: 1 } };
        Dungeon.died({ status: 'failed' });
      } catch (e) { out.crashes.push('died: ' + e.message); }
      return out;
    });
    t.ok('the fork and the death screen both survive a rumour room',
      shell.crashes.length === 0, shell.crashes.join(' | '));
  }
};
