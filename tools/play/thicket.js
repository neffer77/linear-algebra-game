/* S10 — Herbalism: the thicket, and the Apothecary that spends what it gives.
 *
 * The Wilds shipped without a material and said so in its own table, which was
 * honest but left the setting paying in nothing but gold. This closes that: a
 * gathering room out there, a third currency, and a bench at the Keep that
 * turns it into things you carry back out.
 *
 * The room is the first in the game with TWO decisions in it, and that is the
 * whole reason it exists. Answering riddles buys basket space; the space is
 * then spent on plants that differ in worth and in bulk. Knowing the
 * mathematics gets you a bigger basket and tells you nothing about how to fill
 * it — so a knight who answers everything and packs badly walks out with less
 * than one who answered less and chose well. Most of what follows checks that
 * the second decision is real: that the basket cannot be overfilled, that the
 * obvious greedy pick is not always the best one, and that what the room hands
 * over is exactly what was packed.
 */
'use strict';

module.exports = {
  name: 'thicket',
  title: 'S10 · you cannot carry it all',
  async run(t) {
    await t.newKnight('Herbalist');

    // --- the room exists, and only where its skill lives ---
    const where = await t.ev(() => {
      const out = { counts: {} };
      out.kindExists = !!RoomKinds.forage;
      out.introduced = !!ROOM_INTRO.forage;
      out.wildsChance = SETTINGS.wilds.forageChance;
      // every other setting: no thickets at all
      out.elsewhere = Object.keys(SETTINGS).filter(k => k !== 'wilds' && SETTINGS[k].forageChance);
      out.inNoPlan = Object.keys(SETTINGS)
        .filter(k => (SETTINGS[k].plan || []).indexOf('forage') >= 0);

      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      for (const key of ['wilds', 'deep', 'summit']) {
        Dungeon.descend(key);
        let n = 0, atOne = 0;
        for (let seed = 1; seed <= 40; seed++) {
          Dungeon.run.seed = seed * 4441;
          for (let d = 1; d <= 25; d++) {
            const r = Dungeon.peek(d);
            if (r.name === 'forage') { n++; if (d === 1) atOne++; }
          }
        }
        out.counts[key] = n;
        out['atOne_' + key] = atOne;
      }
      return out;
    });
    t.ok('the thicket is a room kind like any other', where.kindExists);
    t.ok('and introduces itself the first time, as they all do', where.introduced);
    t.ok('thickets grow in the Wilds', where.counts.wilds > 50, String(where.counts.wilds));
    t.eq('and nowhere else — the Deep has none', where.counts.deep, 0);
    t.eq('nor the Summit', where.counts.summit, 0);
    t.eq('no other setting even declares a chance of one', where.elsewhere, []);
    t.eq('and none lays one out by hand', where.inNoPlan, []);
    t.eq('never on the first room, like every other kind', where.atOne_wilds, 0);

    // --- it drills the Wilds' own mathematics ---
    const strand = await t.ev(() => {
      const out = {};
      out.roomStrand = Forage.strand();
      out.settingFirst = SETTINGS.wilds.strands[0];
      out.topics = strandTopics(Forage.strand());
      const inStrand = new Set(out.topics);
      Dungeon.descend('wilds');
      let asked = 0; const off = [];
      for (let s = 0; s < 20; s++) {
        R.seed(5000 + s * 907);
        const spec = RoomKinds.forage.build(R, 3 + (s % 9), SETTINGS.wilds);
        R.unseed();
        for (const q of spec.qs) { asked++; if (!inStrand.has(q.key)) off.push(q.key); }
      }
      out.asked = asked;
      out.offStrand = off;
      return out;
    });
    t.eq('the thicket drills the strand the Wilds is built on',
      strand.roomStrand, strand.settingFirst);
    t.ok('which resolves to real topics',
      Array.isArray(strand.topics) && strand.topics.length > 5, JSON.stringify(strand.topics));
    t.eq('every riddle it asks comes out of that strand and no other', strand.offStrand, []);
    t.ok('across a useful number of them', strand.asked >= 60, String(strand.asked));

    // --- and it is built purely and seeded, like every other room ---
    const pure = await t.ev(() => {
      const out = {};
      const build = () => {
        R.seed(8181);
        const spec = RoomKinds.forage.build(R, 6, SETTINGS.wilds);
        R.unseed();
        return spec;
      };
      const a = build(), b = build();
      out.samePlants = JSON.stringify(a.plants) === JSON.stringify(b.plants);
      out.sameQs = JSON.stringify(a.qs.map(q => q.key + q.q)) ===
                   JSON.stringify(b.qs.map(q => q.key + q.q));
      out.plantCount = a.plants.length;
      out.qCount = a.qs.length;
      out.everyPlantWhole = a.plants.every(p =>
        p.nm && p.ic && p.bulk >= 1 && p.bulk <= Forage.MAX_SPACE && p.worth > 0);

      Mastery._last = 'sentinel';
      R.seed(99); RoomKinds.forage.build(R, 4, SETTINGS.wilds); R.unseed();
      out.cursorHeld = Mastery._last === 'sentinel';

      // names are dealt without replacement, over many thickets
      out.namesDistinct = true;
      for (let s2 = 0; s2 < 40; s2++) {
        R.seed(6100 + s2 * 271);
        const p2 = RoomKinds.forage.build(R, 5, SETTINGS.wilds).plants;
        R.unseed();
        if (new Set(p2.map(x => x.nm)).size !== p2.length) {
          out.namesDistinct = false;
          out.someNames = p2.map(x => x.nm);
          break;
        }
      }
      out.someNames = out.someNames || a.plants.map(x => x.nm);

      /* Bulk and worth have to vary independently, or there is one right answer
         at every basket size and the second decision is not a decision. Read
         over many thickets rather than one. */
      const pairs = [];
      for (let s = 0; s < 60; s++) {
        R.seed(3000 + s * 137);
        RoomKinds.forage.build(R, 5, SETTINGS.wilds).plants
          .forEach(p => pairs.push([p.bulk, p.worth]));
        R.unseed();
      }
      const bulks = new Set(pairs.map(p => p[0]));
      // is the dearest plant always the bulkiest? if so, nothing to weigh
      const byBulk = {};
      pairs.forEach(([b, w]) => { (byBulk[b] = byBulk[b] || []).push(w); });
      const spans = Object.keys(byBulk).map(b =>
        Math.max(...byBulk[b]) - Math.min(...byBulk[b]));
      out.bulkVaries = bulks.size >= 3;
      out.worthVariesWithinBulk = spans.every(s => s > 0);
      // a cheap small plant sometimes beats a dear big one per square
      out.perSquareVaries = new Set(pairs.map(([b, w]) => Math.round(w / b))).size > 3;
      return out;
    });
    t.ok('the same seed and depth build the same thicket',
      pure.samePlants && pure.sameQs);
    t.eq('five plants in it', pure.plantCount, 5);
    t.eq('and one riddle per square of basket', pure.qCount, 3);
    t.ok('every plant is fully described', pure.everyPlantWhole);
    t.ok('and no two in a thicket share a name — five things to compare, five names',
      pure.namesDistinct, JSON.stringify(pure.someNames));
    t.ok('building it does not disturb what the next fight will ask', pure.cursorHeld);
    t.ok('plants differ in bulk', pure.bulkVaries);
    t.ok('and two of the same bulk are not worth the same', pure.worthVariesWithinBulk);
    t.ok('so what a plant is worth per square is a real spread', pure.perSquareVaries);

    /* --- the first decision: riddles buy basket, and a miss ends it ---
       Driven through Forage directly. The seam's bargain would be wrong here —
       there the miss takes back what you cut, because the cutting IS the room.
       Here the room's real decision comes afterwards, so a miss must stop the
       gathering without deleting it. */
    const basket = await t.ev(() => {
      const out = {};
      Dungeon.descend('wilds');
      const play = (script) => {
        R.seed(31337);
        const spec = RoomKinds.forage.build(R, 4, SETTINGS.wilds);
        R.unseed();
        Forage.begin(spec, { depth: 4, run: Dungeon.run }, () => {});
        Forage.ask();                       // the button a player presses
        for (const ok of script) {
          const q = spec.qs[Forage.at];
          if (!q) break;
          Forage.answer({ classList: { remove() {}, add() {} } },
            ok ? q.a : q.choices.find(c => c !== q.a));
          if (Forage.resolved) break;
        }
        return Forage.space;
      };
      out.none = play([false]);
      out.one = play([true, false]);
      out.two = play([true, true, false]);
      out.three = play([true, true, true]);
      out.max = Forage.MAX_SPACE;
      return out;
    });
    t.eq('a miss on the first riddle opens no basket at all', basket.none, 0);
    t.eq('one clean answer clears one square', basket.one, 1);
    t.eq('two clear two — a miss keeps what was already earned', basket.two, 2);
    t.eq('and three fill it', basket.three, 3);
    t.eq('which is as big as a basket gets', basket.three, basket.max);

    /* --- the second decision: what fits, and what is worth the room ---
       This is the half the mathematics does not answer for you, so it is the
       half worth testing hardest. */
    const pack = await t.ev(() => {
      const out = {};
      Dungeon.descend('wilds');
      // a thicket posed by hand, so the arithmetic is unambiguous
      const spec = {
        kind: 'forage', depth: 4, qs: [],
        plants: [
          { nm: 'a', ic: '🌿', bulk: 3, worth: 9 },   // dearest, fills the basket
          { nm: 'b', ic: '🌿', bulk: 1, worth: 4 },   // three of these beat it
          { nm: 'c', ic: '🌿', bulk: 1, worth: 4 },
          { nm: 'd', ic: '🌿', bulk: 1, worth: 4 },
          { nm: 'e', ic: '🌿', bulk: 2, worth: 1 }    // never worth taking
        ]
      };
      const open = (space) => {
        Forage.begin(spec, { depth: 4, run: Dungeon.run }, () => {});
        Forage.space = space; Forage.taken = []; Forage.at = 3;
        Forage.choose();
      };

      // the greedy pick is not the best pick
      open(3);
      Forage.toggle(0);
      out.greedy = Forage.worth();
      Forage.toggle(0);
      Forage.toggle(1); Forage.toggle(2); Forage.toggle(3);
      out.considered = Forage.worth();
      out.bothFit = Forage.held() <= Forage.space;

      // the basket cannot be overfilled, however hard you try
      open(2);
      out.bigOneRefused = (Forage.toggle(0), Forage.taken.length === 0);
      Forage.toggle(1); Forage.toggle(2);
      out.twoSmallFit = Forage.held();
      out.thirdRefused = (Forage.toggle(3), Forage.taken.length === 2);
      out.neverOverfull = Forage.held() <= Forage.space;

      // and packing can be undone
      Forage.toggle(1);
      out.afterUnpack = Forage.taken.length;
      out.roomBack = Forage.room();
      return out;
    });
    t.eq('the dearest single plant is worth nine', pack.greedy, 9);
    t.eq('but three small ones are worth twelve', pack.considered, 12);
    t.ok('and both fit the same basket', pack.bothFit);
    t.ok('a plant too bulky for the room left is refused', pack.bigOneRefused);
    t.eq('two that fit go in', pack.twoSmallFit, 2);
    t.ok('and the third is refused rather than overfilling it', pack.thirdRefused);
    t.ok('the basket is never over-full', pack.neverOverfull);
    t.eq('packing can be undone', pack.afterUnpack, 1);
    t.eq('and the room comes back with it', pack.roomBack, 1);

    // --- what is packed is what is carried, and it reaches the pouch ---
    const carry = await t.ev(() => {
      const out = {};
      Dungeon.descend('wilds');
      Game.s.mats.herb = 0;
      const spec = {
        kind: 'forage', depth: 4, qs: [],
        plants: [
          { nm: 'a', ic: '🌿', bulk: 1, worth: 5 },
          { nm: 'b', ic: '🌿', bulk: 1, worth: 7 },
          { nm: 'c', ic: '🌿', bulk: 3, worth: 2 },
          { nm: 'd', ic: '🌿', bulk: 2, worth: 3 },
          { nm: 'e', ic: '🌿', bulk: 1, worth: 1 }
        ]
      };
      let got = null, calls = 0;
      Forage.begin(spec, { depth: 4, run: Dungeon.run }, o => { calls++; got = o; });
      Forage.space = 2; Forage.taken = []; Forage.at = 2;
      Forage.choose();
      Forage.toggle(0); Forage.toggle(1);
      out.packed = Forage.worth();
      Forage.leave();
      const go = document.getElementById('forageGo');
      if (go) go.click();
      out.reported = got && got.forage.herbs;
      out.status = got && got.status;
      out.calls = calls;
      out.inPouch = Game.s.mats.herb;

      // and walking past pays nothing and still reports once
      let got2 = null, calls2 = 0;
      Game.s.mats.herb = 0;
      Forage.begin(spec, { depth: 4, run: Dungeon.run }, o => { calls2++; got2 = o; });
      Forage.walkAway();
      const go2 = document.getElementById('forageGo');
      if (go2) go2.click();
      out.walkedPast = got2 && got2.forage.herbs;
      out.walkStatus = got2 && got2.status;
      out.walkCalls = calls2;
      out.pouchAfterWalk = Game.s.mats.herb;

      // a basket that never opened is the same: nothing, once
      let got3 = null, calls3 = 0;
      Forage.begin(spec, { depth: 4, run: Dungeon.run }, o => { calls3++; got3 = o; });
      Forage.space = 0; Forage.choose();
      const go3 = document.getElementById('forageGo');
      if (go3) go3.click();
      out.emptyBasket = got3 && got3.forage.herbs;
      out.emptyCalls = calls3;
      return out;
    });
    t.eq('what was packed is what is reported', carry.reported, carry.packed);
    t.eq('twelve of them', carry.packed, 12);
    t.eq('and it lands in the pouch', carry.inPouch, 12);
    t.eq('the room reports exactly once', carry.calls, 1);
    t.eq('a thicket can never end a walk', carry.status, 'cleared');
    t.eq('walking past pays nothing', carry.walkedPast, 0);
    t.eq('and still reports, once', carry.walkCalls, 1);
    t.eq('and cannot end a walk either', carry.walkStatus, 'cleared');
    t.eq('nor does it quietly add to the pouch', carry.pouchAfterWalk, 0);
    t.eq('a basket that never opened carries nothing', carry.emptyBasket, 0);
    t.eq('and reports once all the same', carry.emptyCalls, 1);

    // --- the Apothecary spends what the thicket gathers ---
    const bench = await t.ev(() => {
      const out = {};
      out.entries = APOTHECARY.length;
      out.everyOneComplete = APOTHECARY.every(e =>
        e.id && e.nm && e.ic && e.ds && e.herb > 0 && typeof e.each === 'function');
      out.repeatables = APOTHECARY.filter(e => !e.keep).length;
      out.permanents = APOTHECARY.filter(e => e.keep).length;
      out.everyPermanentKnowsItself = APOTHECARY.filter(e => e.keep)
        .every(e => typeof e.owned === 'function');

      Game.s.mats.herb = 0;
      Game.s.items.potion = 0;
      Game.s.brewed = {};
      // nothing is made on an empty pouch
      Apothecary.brew('a_draught');
      out.brokeNothing = Game.s.items.potion;
      out.pouchUntouched = Game.s.mats.herb;

      Game.s.mats.herb = 40;
      Apothecary.brew('a_draught');
      out.afterOne = Game.s.items.potion;
      out.spent = 40 - Game.s.mats.herb;
      // and again, because most of the bench is repeatable
      Apothecary.brew('a_draught');
      out.afterTwo = Game.s.items.potion;

      // the satchel is made once and only once
      Game.s.mats.herb = 200;
      out.mulBefore = Apothecary.draughtMul();
      Apothecary.brew('a_satchel');
      out.mulAfter = Apothecary.draughtMul();
      const left = Game.s.mats.herb;
      Apothecary.brew('a_satchel');
      out.noSecondSatchel = Game.s.mats.herb === left;
      out.satchelKnown = Apothecary.has('a_satchel');

      // and it is the only thing herbs buy that gold cannot
      out.notInShop = !Object.keys(ITEMS).some(k => k === 'satchel');
      return out;
    });
    t.ok('the Apothecary has entries', bench.entries >= 3, String(bench.entries));
    t.ok('each fully described', bench.everyOneComplete);
    t.ok('most of it can be made again', bench.repeatables >= 3, String(bench.repeatables));
    t.eq('and exactly one thing is kept', bench.permanents, 1);
    t.ok('which knows whether it has been made', bench.everyPermanentKnowsItself);
    t.eq('an empty pouch buys nothing', bench.brokeNothing, 0);
    t.eq('and is not quietly emptied further', bench.pouchUntouched, 0);
    t.eq('a course of draughts is three', bench.afterOne, 3);
    t.ok('paid for in herbs', bench.spent > 0, String(bench.spent));
    t.eq('and it can be made again', bench.afterTwo, 6);
    t.eq('the satchel starts unmade', bench.mulBefore, 1);
    t.eq('and once made a draught goes half again as far', bench.mulAfter, 1.5);
    t.ok('it cannot be made twice', bench.noSecondSatchel);
    t.ok('and the bench knows it is made', bench.satchelKnown);
    t.ok('gold cannot buy it at all', bench.notInShop);

    // --- the satchel actually reaches the draught ---
    const drink = await t.ev(() => {
      const out = {};
      Game.s.lvl = 10; Game.s.maxHp = Game.maxHp();
      const sip = () => {
        Game.s.hp = 1;
        Game.s.items.potion = 1;
        Battle.usePotion();
        return Game.s.hp - 1;
      };
      Game.s.brewed = {};
      out.plain = sip();
      Game.s.brewed = { satchel: 1 };
      out.withSatchel = sip();
      out.max = Game.s.maxHp;
      return out;
    });
    t.ok('a plain draught restores about 45% of health',
      Math.abs(drink.plain / drink.max - 0.45) < 0.02,
      `${drink.plain} of ${drink.max}`);
    t.ok('and the satchel makes it half again as much',
      Math.abs(drink.withSatchel / drink.plain - 1.5) < 0.02,
      `${drink.plain} → ${drink.withSatchel}`);

    // --- herbs ride in the code, and the format bump was deliberate ---
    const codec = await t.ev(() => {
      const out = {};
      out.ver = Codec.VER;
      out.tag = Codec.TAG;
      Game.s.mats.herb = 137;
      Game.s.brewed = { satchel: 1 };
      Game.s.bests = { deep: 9, wilds: 21 };
      const code = Codec.encode(Profiles.active(), Game.s, Date.now());
      const back = Codec.decode(code);
      out.ok = back.ok;
      out.herb = back.ok ? back.g.mats.herb : null;
      out.satchel = back.ok ? !!back.g.brewed.satchel : null;
      out.bests = back.ok ? back.g.bests : null;

      // and a knight who never went out there carries none of it
      Game.s.mats.herb = 0;
      Game.s.brewed = {};
      const bare = Codec.decode(Codec.encode(Profiles.active(), Game.s, Date.now()));
      out.bareHerb = bare.ok ? bare.g.mats.herb : null;
      out.bareSatchel = bare.ok ? !!bare.g.brewed.satchel : null;
      return out;
    });
    t.eq('the format has moved on since', codec.ver, 6);
    t.eq('and the tag with it', codec.tag, 'KE6-');
    t.ok('a knight code carries the pouch', codec.ok);
    t.eq('exactly', codec.herb, 137);
    t.ok('and the satchel with it', codec.satchel);
    t.eq('without disturbing what was already in there', codec.bests, { deep: 9, wilds: 21 });
    t.eq('a knight who never gathered carries no herbs', codec.bareHerb, 0);
    t.ok('and no satchel', codec.bareSatchel === false);

    /* The version gate around the v5 fields is defensive rather than
       load-bearing today, and it is worth saying which. Mutating `ver>=5` to
       `ver>=4` changes nothing observable, because the bit reader returns
       ZEROES past the end of a body and zero is the right default for both new
       fields — so an older code cannot come back carrying rubbish either way.
       That is the property the gate leans on, so it is the property pinned
       here. The gate stays because the next field appended may not have a safe
       zero, and by then there would be nothing to notice it. */
    const past = await t.ev(() => {
      const b = BitIn([0xff, 0xff]);
      const out = { first: b.bits(16) };
      out.varintPastEnd = b.varint();
      out.bitsPastEnd = b.bits(8);
      return out;
    });
    t.eq('the reader consumes the body it was given', past.first, 0xffff);
    t.eq('and reads zero past the end of it, not rubbish', past.varintPastEnd, 0);
    t.eq('however it is asked', past.bitsPastEnd, 0);

    // --- and one thicket, actually walked through ---
    await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, i) => Game.s.cleared[ri + ':' + i] = 1));
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1, sigil: 1, forage: 1 };
      Game.s.mats.herb = 0;
      Dungeon.descend('wilds');
      for (let s = 1; s <= 400; s++) {
        Dungeon.run.seed = s * 4441;
        if (Dungeon.peek(2).name === 'forage') break;
      }
      Dungeon.run.depth = 1;
      Dungeon.nextRoom();
    });
    t.eq('a thicket found in a real walk draws its own screen', await t.screen(), 's-lock');
    t.ok('and says what it is', /thicket/i.test(await t.text()));

    await t.tapText(/Start gathering/);
    t.ok('the first riddle is on the screen',
      await t.ev(() => {
        const box = document.getElementById('forageChoices');
        return !!box && box.children.length >= 2;
      }));

    await t.ev(() => {
      const b = document.querySelector('#forageChoices .choice[data-correct="1"]');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 900));
    t.eq('a right answer clears a square', await t.ev(() => Forage.space), 1);

    // answer the remaining two wrong, to reach the choosing with one square
    await t.ev(() => {
      const q = Forage.spec.qs[Forage.at];
      const wrong = [...document.querySelectorAll('#forageChoices .choice')]
        .find(b => b.dataset.correct !== '1');
      if (wrong) wrong.click();
    });
    await new Promise(r => setTimeout(r, 1800));
    const choosing = await t.ev(() => ({
      text: document.getElementById('lockBody').innerText,
      space: Forage.space
    }));
    t.eq('a miss stops the gathering with the square already earned', choosing.space, 1);
    t.ok('and the choosing begins', /What will you carry/.test(choosing.text),
      choosing.text.slice(0, 160));

    const packed = await t.ev(() => {
      // take the best thing that fits in one square
      const fits = Forage.spec.plants
        .map((p, i) => ({ i, p }))
        .filter(x => x.p.bulk <= Forage.space)
        .sort((a, b) => b.p.worth - a.p.worth);
      if (fits.length) Forage.toggle(fits[0].i);
      return { worth: Forage.worth(), text: document.getElementById('lockBody').innerText };
    });
    t.ok('a plant can be packed', packed.worth > 0, String(packed.worth));
    t.ok('and the basket says what is in it',
      new RegExp(packed.worth + ' herbs packed').test(packed.text));

    await t.tapText(/Carry it out/);
    await t.tapText(/Onward/);
    const after = await t.ev(() => ({
      screen: document.querySelector('.screen.on').id,
      herbs: Game.s.mats.herb,
      fork: document.getElementById('resultBody').innerText
    }));
    t.eq('carrying it out lands on the fork', after.screen, 's-result');
    t.eq('with the herbs in the pouch', after.herbs, packed.worth);
    t.ok('and the fork says what came out of the thicket',
      new RegExp(packed.worth + ' herbs out of the thicket').test(after.fork),
      after.fork.slice(0, 200));
  }
};
