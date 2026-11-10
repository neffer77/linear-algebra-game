/* S15 — the Keep's rooms, and the cauldron that asks for a linear combination.
 *
 * Two changes, and they are checked for different things.
 *
 * The benches moved: five panels at the bottom of the Smithy are five rooms
 * off a hub. That must change WHERE they are and nothing about WHAT they sell,
 * so the claims are about doors, statuses and redraws — the arithmetic stays
 * with the suites that already own it (chain, thicket, library, crucible).
 *
 * The Apothecary changed: a recipe is mixed before it is made. The claims worth
 * protecting are that the puzzle can always be done, in exactly one way; that
 * it costs and gives precisely what brewing always did; that walking away
 * spends nothing; and that it tells the mastery model nothing at all — because
 * a puzzle with a live total can be solved by nudging, and a bench that moved
 * mastery would be herbs buying what no currency here may buy.
 */
'use strict';

module.exports = {
  name: 'keep',
  title: 'S15 · a room for every craft',
  async run(t) {
    await t.newKnight('Steward');

    // Every way a mix can be made within the bench's reach, by trying them all.
    await t.ev(() => {
      window.__solve = () => {
        const s = Brew.s, n = s.dim, was = s.herbs.map(h => h.n), sols = [];
        const rec = (i, acc) => {
          if (i === n) { s.herbs.forEach((h, k) => h.n = acc[k]); if (Brew.ready()) sols.push(acc.slice()); return; }
          for (let c = 0; c <= Brew.CAP; c++) { acc[i] = c; rec(i + 1, acc); }
        };
        rec(0, []);
        s.herbs.forEach((h, k) => h.n = was[k]);
        return sols;
      };
    });

    // ------------------------------------------------------------------
    // The hub.
    // ------------------------------------------------------------------
    const hub = await t.ev(() => {
      const out = {};
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 0 };
      Game.s.runes = {}; Game.s.topicStats = {}; Game.s.alch = 0;
      UI.go('s-map');
      out.mapHasKeep = !!document.querySelector('#s-map #btnKeep');
      document.querySelector('#s-map #btnKeep').click();
      out.screen = document.querySelector('.screen.on').id;
      const read = () => Object.fromEntries([...document.querySelectorAll('#keepBody .door')]
        .map(d => [d.dataset.room, { lit: d.classList.contains('lit'), txt: d.querySelector('.dstat').innerText.trim() }]));
      out.doors = Object.keys(read());
      out.empty = read();
      out.mats0 = [...document.querySelectorAll('#keepBody .mat b')].map(b => b.innerText);

      Game.s.mats = { ore: 9, essence: 18, herb: 38, page: 26 };
      Game.s.topicStats.limPoly = { c: 4, w: 0, m: 0.8, seen: 4, last: 0, t: Date.now() - 20 * 864e5 };
      Rooms.renderKeep();
      out.stocked = read();
      out.mats1 = [...document.querySelectorAll('#keepBody .mat b')].map(b => b.innerText);

      // something has gone cold, and there are no pages to bind it with
      Game.s.mats.page = 0;
      Rooms.renderKeep();
      out.coldNoPages = read().script;
      Game.s.mats.page = 26;

      Game.s.alch = 1; Game.s.runes = { r_edge: 1, r_hide: 1, r_depth: 1 };
      Rooms.renderKeep();
      out.spent = read();
      Game.s.alch = 0; Game.s.runes = {};
      return out;
    });
    t.ok('the map has a door to the Keep', hub.mapHasKeep);
    t.eq('and it opens the Keep', hub.screen, 's-keep');
    t.eq('five rooms, one for each craft', hub.doors, ['forge', 'runes', 'apoth', 'script', 'crucible']);
    t.eq('what the knight holds is counted at the top', hub.mats1, ['9', '18', '38', '26']);
    t.ok('an empty-handed knight is told how far the nearest thing is',
      /4 more ore for A batch of lockpicks/.test(hub.empty.forge.txt) && !hub.empty.forge.lit
      && /6 more essence for Rune of the Edge/.test(hub.empty.runes.txt)
      && /12 more herbs for Clarity of sight/.test(hub.empty.apoth.txt), JSON.stringify(hub.empty));
    t.ok('a stocked one is told what can be made, and the door is lit',
      hub.stocked.forge.lit && /1 can be forged/.test(hub.stocked.forge.txt)
      && /3 can be carved/.test(hub.stocked.runes.txt) && /2 can be brewed/.test(hub.stocked.apoth.txt),
      JSON.stringify(hub.stocked));
    t.ok('the scriptorium counts what has gone cold', /1 topic has gone cold/.test(hub.stocked.script.txt) && hub.stocked.script.lit,
      hub.stocked.script.txt);
    t.ok('a cold topic with no pages to bind it is a door that is not lit',
      !hub.coldNoPages.lit && /1 gone cold · 18 more pages/.test(hub.coldNoPages.txt), JSON.stringify(hub.coldNoPages));
    t.ok('and says so when nothing has', /Nothing has gone cold/.test(hub.empty.script.txt) && !hub.empty.script.lit);
    t.ok('the crucible\'s door says whether it is lit',
      hub.stocked.crucible.lit && /Lit/.test(hub.stocked.crucible.txt)
      && !hub.spent.crucible.lit && /Cold/.test(hub.spent.crucible.txt), JSON.stringify(hub.spent.crucible));
    t.ok('a bench with nothing left to sell says that instead', /Every rune is worn/.test(hub.spent.runes.txt) && !hub.spent.runes.lit);

    // ------------------------------------------------------------------
    // The rooms: the same benches, somewhere else.
    // ------------------------------------------------------------------
    const rooms = await t.ev(() => {
      const out = { each: {} };
      Game.s.mats = { ore: 9, essence: 18, herb: 38, page: 26 };
      for (const r of ROOMS) {
        UI.go('s-keep');
        document.querySelector(`#keepBody .door[data-room="${r.id}"]`).click();
        out.each[r.id] = {
          screen: document.querySelector('.screen.on').id,
          art: !!document.querySelector('#roomBody svg.roomart'),
          named: document.querySelector('#roomBody .roomname').innerText.includes(r.nm),
          text: document.getElementById('roomBody').innerText
        };
      }
      // every entry of every bench is in its room
      out.entries = {
        forge: FORGE.every(f => out.each.forge.text.includes(f.nm)),
        runes: RUNES.every(r => out.each.runes.text.includes(r.nm)),
        apoth: APOTHECARY.every(e => out.each.apoth.text.includes(e.nm)),
        script: SCRIPTORIUM.every(e => out.each.script.text.includes(e.nm)),
        crucible: Crucible.SHARES.every(s => out.each.crucible.text.includes(s.nm))
      };
      // and none of them is still in the Smithy
      UI.go('s-shop');
      const shop = document.getElementById('shopList').innerText;
      out.shopClean = !FORGE.concat(RUNES, APOTHECARY, SCRIPTORIUM).some(x => shop.includes(x.nm)) && !/Crucible[^·]/.test(shop.replace(/Forge · Rune Bench · Apothecary · Scriptorium · Crucible/, ''));
      out.shopSellsGold = WEAPONS.filter(w => !w.forge).every(w => shop.includes(w.nm)) && shop.includes(ITEMS.potion.nm);
      document.getElementById('shopToKeep').click();
      out.shopLeadsToKeep = document.querySelector('.screen.on').id;

      // a bench redraws the room it is in
      Rooms.open('forge');
      const picks0 = Game.s.items.pick;
      document.querySelector('#roomBody [data-forge="f_picks"]').click();
      out.anvil = { work: !!document.getElementById('forgeWork'), ore: Game.s.mats.ore,
        listGone: !document.querySelector('#roomBody [data-forge]') };
      document.getElementById('forgeStrike').click();
      document.getElementById('forgeStrike').click();
      out.twoStrikes = { ore: Game.s.mats.ore, picks: Game.s.items.pick - picks0,
        pips: document.querySelectorAll('#roomBody .anvilpips i.on').length,
        label: document.getElementById('forgeStrike').innerText };
      // put down before the last blow: nothing spent, nothing made
      document.getElementById('forgeDown').click();
      out.putDown = { ore: Game.s.mats.ore, picks: Game.s.items.pick - picks0, work: !!Forge.work,
        listBack: !!document.querySelector('#roomBody [data-forge="f_picks"]') };
      // and the whole of it
      document.querySelector('#roomBody [data-forge="f_picks"]').click();
      for (let i = 0; i < 3; i++) document.getElementById('forgeStrike').click();
      out.forged = { ore: Game.s.mats.ore, picks: Game.s.items.pick - picks0, work: !!Forge.work,
        shown: /You hold\s+🪨\s*5/.test(document.getElementById('roomBody').innerText) };
      // too little ore: the anvil is not even set
      Game.s.mats.ore = 3;
      Rooms.open('forge'); document.querySelector('#roomBody [data-forge="f_picks"]').click();
      out.noOre = !!Forge.work;
      // a blade left half beaten is not waiting when you come back
      Game.s.mats.ore = 9; Forge.start('f_picks'); Forge.strike();
      UI.go('s-keep'); Rooms.open('forge');
      out.leftHalf = { work: !!Forge.work, ore: Game.s.mats.ore };
      Game.s.mats.ore = 5;
      Rooms.open('runes');
      document.querySelector('#roomBody button[onclick*="r_edge"]').click();
      out.carved = { worn: !!Game.s.runes.r_edge, pill: /worn/.test(document.getElementById('roomBody').innerText),
        slotLit: document.querySelector('#roomBody svg.roomart').innerHTML.includes('#cdeaff') };
      Rooms.open('crucible');
      document.querySelector('#roomBody button[onclick*="Crucible.point(\'from\',\'herb\')"]').click();
      out.pointed = { from: Crucible.from, shown: /herbs/.test(document.querySelector('#roomBody .item .nm').innerText) };
      Crucible.point('from', 'page'); Crucible.point('to', 'ore');
      // the back door goes back to the Keep
      document.querySelector('#s-room > button.ghost').click();
      out.back = document.querySelector('.screen.on').id;
      return out;
    });
    for (const id of ['forge', 'runes', 'apoth', 'script', 'crucible']) {
      const r = rooms.each[id];
      t.ok(`${id}: its door opens a room with its name, its picture and its whole bench`,
        r.screen === 's-room' && r.art && r.named && rooms.entries[id], JSON.stringify({ ...r, text: undefined, e: rooms.entries[id] }));
    }
    t.ok('nothing the rooms sell is left in the Smithy', rooms.shopClean);
    t.ok('which still sells everything gold buys', rooms.shopSellsGold);
    t.eq('and points to the Keep for the rest', rooms.shopLeadsToKeep, 's-keep');
    t.ok('choosing a thing to forge sets it on the anvil, and spends nothing yet',
      rooms.anvil.work && rooms.anvil.listGone && rooms.anvil.ore === 9, JSON.stringify(rooms.anvil));
    t.ok('two strikes are two strikes: still nothing spent, nothing made',
      rooms.twoStrikes.ore === 9 && rooms.twoStrikes.picks === 0 && rooms.twoStrikes.pips === 2
      && /last strike/i.test(rooms.twoStrikes.label), JSON.stringify(rooms.twoStrikes));
    t.ok('putting the work down costs nothing',
      rooms.putDown.ore === 9 && rooms.putDown.picks === 0 && !rooms.putDown.work && rooms.putDown.listBack);
    t.ok('the third strike makes it: ore spent once, three picks, and the room redrawn',
      rooms.forged.ore === 5 && rooms.forged.picks === 3 && !rooms.forged.work && rooms.forged.shown, JSON.stringify(rooms.forged));
    t.ok('without the ore the anvil is never set', !rooms.noOre);
    t.ok('and work left half done is not kept', !rooms.leftHalf.work && rooms.leftHalf.ore === 9);
    t.ok('carving a rune lights its place on the table', rooms.carved.worn && rooms.carved.pill && rooms.carved.slotLit);
    t.ok('the crucible repoints in place', rooms.pointed.from === 'herb' && rooms.pointed.shown, JSON.stringify(rooms.pointed));
    t.eq('the way out of a room is back to the Keep', rooms.back, 's-keep');

    // ------------------------------------------------------------------
    // The quarters: the one room that sells nothing.
    // ------------------------------------------------------------------
    const home = await t.ev(() => {
      const out = {};
      const k = Profiles.active();
      const snap = () => JSON.stringify([Game.s.gold, Game.s.mats, Game.s.topicStats, Game.s.stats]);
      Game.s.cleared = {}; Game.s.bests = {};
      UI.go('s-keep');
      out.door = /0 of 8 trophies/.test(document.getElementById('doorQuarters').innerText);
      document.getElementById('doorQuarters').click();
      out.screen = document.querySelector('.screen.on').id;
      const art = () => document.querySelector('#quartersBody svg.roomart');
      out.none = { trophies: art().querySelectorAll('[data-trophy]').length, next: (art().querySelector('[data-next]') || { dataset: {} }).dataset.next,
        text: document.getElementById('qTrophies').innerText };

      // two champions down
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      REALMS[1].foes.forEach((f, i) => Game.s.cleared['1:' + i] = 1);
      Quarters.render();
      out.two = { trophies: art().querySelectorAll('[data-trophy]').length, next: art().querySelector('[data-next]').dataset.next,
        text: document.getElementById('qTrophies').innerText,
        names: [REALMS[0], REALMS[1]].map(r => r.foes[r.foes.length - 1].nm), nextName: REALMS[2].foes[REALMS[2].foes.length - 1].nm };
      // a realm half cleared is not a trophy
      Game.s.cleared['2:0'] = 1; Quarters.render();
      out.halfRealm = art().querySelectorAll('[data-trophy]').length;

      // colours and crest: through the buttons
      const before = snap();
      document.querySelector('#qCols .sw[data-col="#57cc7a"]').click();
      document.querySelector('#qCrests .cr[data-crest="🐺"]').click();
      out.look = { col: Profiles.active().col, crest: Profiles.active().crest,
        banner: art().innerHTML.includes('#57cc7a') && art().querySelector('[data-crest]').textContent === '🐺',
        pressed: document.querySelector('#qCols .sw.on').dataset.col,
        stored: JSON.parse(localStorage.getItem(ROSTER_KEY)).knights.find(x => x.id === k.id).col,
        free: snap() === before };
      // only what a knight code can carry
      Quarters.set('col', '#123456'); Quarters.set('crest', '🦄');
      out.onlyListed = Profiles.active().col === '#57cc7a' && Profiles.active().crest === '🐺';
      // and it does carry them
      const res = Codec.decode(Profiles.export(k.id));
      out.travels = res.ok && res.k.col === '#57cc7a' && res.k.crest === '🐺';

      // worn into the fight
      Battle.begin(0, 0);
      out.worn = { plume: Battle.plumeCol, cape: Battle.capeCol, capeDarker: Battle.capeCol !== Battle.plumeCol };
      Battle.flee();

      // rooms are opened by where you have been
      Quarters.open();
      const row = id => document.querySelector(`#qRooms [data-style="${id}"]`);
      out.rooms = { studyOpen: !!row('study').querySelector('button'), lodgeShut: !row('lodge').querySelector('button') && /🔒/.test(row('lodge').innerText),
        eyrieShut: !row('eyrie').querySelector('button') };
      Quarters.set('room', 'lodge');
      out.lockedRefused = Profiles.active().room !== 'lodge';
      row('study').querySelector('button').click();
      out.movedIn = { room: Profiles.active().room, wall: art().innerHTML.includes('#14233d'), pill: /home/.test(row('study').innerText) };
      Game.s.bests = { wilds: 3, summit: 9 }; Quarters.render();
      out.afterWilds = { lodge: !!row('lodge').querySelector('button'), eyrie: !!row('eyrie').querySelector('button') };
      Game.s.bests.summit = 10; Quarters.render();
      out.afterSummit = !!row('eyrie').querySelector('button');
      // a room you no longer qualify for falls back to stone, rather than breaking
      Profiles.active().room = 'eyrie'; Game.s.bests = {}; Quarters.render();
      out.fallback = Quarters.style(Profiles.active(), Game.s).id;
      Profiles.active().room = 'keep';
      out.nothingBought = snap() === before;
      document.querySelector('#s-quarters > button.ghost').click();
      out.back = document.querySelector('.screen.on').id;
      return out;
    });
    t.ok('the Keep has a door to the knight\'s own quarters', home.door && home.screen === 's-quarters');
    t.ok('an empty shelf marks the place for the first champion', home.none.trophies === 0 && home.none.next === '0');
    t.ok('each champion put down leaves a trophy, named',
      home.two.trophies === 2 && home.two.names.every(n => home.two.text.includes(n)), home.two.text.slice(0, 120));
    t.ok('and the empty place moves on to the next', home.two.next === '2' && home.two.text.includes(home.two.nextName));
    t.eq('a realm half cleared is not a trophy', home.halfRealm, 2);
    t.ok('colour and crest change at a tap, and the room shows them',
      home.look.col === '#57cc7a' && home.look.crest === '🐺' && home.look.banner && home.look.pressed === '#57cc7a', JSON.stringify(home.look));
    t.eq('they are kept on the roster', home.look.stored, '#57cc7a');
    t.ok('they cost nothing', home.look.free);
    t.ok('only a colour or crest a knight code can carry is accepted', home.onlyListed);
    t.ok('and the code does carry them', home.travels);
    t.ok('the knight wears the colour into the fight: plume as chosen, cape a shade darker',
      home.worn.plume === '#57cc7a' && home.worn.capeDarker && /^#[0-9a-f]{6}$/.test(home.worn.cape), JSON.stringify(home.worn));
    t.ok('a room is opened by somewhere the knight has been',
      home.rooms.studyOpen && home.rooms.lodgeShut && home.rooms.eyrieShut, JSON.stringify(home.rooms));
    t.ok('a locked room cannot be moved into', home.lockedRefused);
    t.ok('an open one can, and the walls change', home.movedIn.room === 'study' && home.movedIn.wall && home.movedIn.pill, JSON.stringify(home.movedIn));
    t.ok('the Wilds open the lodge; nine up the Summit does not open the eyrie', home.afterWilds.lodge && !home.afterWilds.eyrie);
    t.ok('ten does', home.afterSummit);
    t.eq('a room no longer earned falls back to the stone keep', home.fallback, 'keep');
    t.ok('nothing in the quarters touched gold, materials or mastery', home.nothingBought);
    t.eq('the way out is back to the Keep', home.back, 's-keep');

    // ------------------------------------------------------------------
    // Mixing: always possible, in exactly one way.
    // ------------------------------------------------------------------
    const gen = await t.ev(() => {
      const out = { n: 0, noAnswer: 0, manyAnswers: 0, idleHerb: 0, dependent: 0, emptyTarget: 0, wrongDim: 0, takesOnly: 0, fallback: {} };
      for (const id of Object.keys(Brew.TIER)) for (let i = 0; i < 60; i++) {
        Brew.s = Brew.make(id);
        const s = Brew.s, sols = __solve();
        out.n++;
        if (sols.length === 0) out.noAnswer++;
        if (sols.length > 1) out.manyAnswers++;
        if (sols.length === 1 && sols[0].some(c => c < 1)) out.idleHerb++;
        if (Brew.det(s.herbs.map(h => h.v)) === 0) out.dependent++;
        if (s.target.every(x => x === 0)) out.emptyTarget++;
        if (s.dim !== Brew.TIER[id].dim || s.herbs.length !== s.dim || s.target.length !== s.dim) out.wrongDim++;
        if (s.herbs.some(h => h.v.every(x => x <= 0))) out.takesOnly++;
        // named here, not read off the table: the draught and the feather are the plain ones
        if (['a_draught', 'a_feather'].includes(id) && s.herbs.some(h => h.v.some(x => x < 0))) out.takesOnly++;
      }
      // if the dice never give independent herbs, there is still a mix to make
      const realI = R.i; R.i = () => 0;
      for (const id of ['a_draught', 'a_feather']) {
        Brew.s = Brew.make(id);
        out.fallback[id] = { det: Brew.det(Brew.s.herbs.map(h => h.v)) };
      }
      R.i = realI;
      out.dims = Object.fromEntries(Object.entries(Brew.TIER).map(([k, v]) => [k, v.dim]));
      Brew.s = null;
      return out;
    });
    t.eq('two hundred and forty recipes drawn', gen.n, 240);
    t.eq('every one of them can be mixed', gen.noAnswer, 0);
    t.eq('in exactly one way', gen.manyAnswers, 0);
    t.eq('that uses every herb on the bench', gen.idleHerb, 0);
    t.eq('because the herbs are always independent', gen.dependent, 0);
    t.eq('no recipe calls for nothing', gen.emptyTarget, 0);
    t.eq('no herb only takes away, and the plain recipes have none that takes at all', gen.takesOnly, 0);
    t.eq('each recipe has as many herbs as strengths', gen.wrongDim, 0);
    t.ok('the dear recipes are the three-herb ones',
      gen.dims.a_draught === 2 && gen.dims.a_insight === 2 && gen.dims.a_feather === 3 && gen.dims.a_satchel === 3);
    t.ok('and a bench that drew nothing usable still sets out independent herbs',
      gen.fallback.a_draught.det !== 0 && gen.fallback.a_feather.det !== 0, JSON.stringify(gen.fallback));

    // ------------------------------------------------------------------
    // Mixing, through the buttons.
    // ------------------------------------------------------------------
    const mix = await t.ev(() => {
      const out = {};
      const snap = () => JSON.stringify([Game.s.topicStats, Game.s.stats, Game.s.qCount]);
      Game.s.topicStats = {}; Game.s.items.potion = 2;

      // too few herbs: no bench is set out
      Game.s.mats.herb = 13;
      Rooms.open('apoth');
      document.querySelector('#roomBody [data-brew="a_draught"]').click();
      out.poor = { open: !!Brew.s, panel: !!document.getElementById('brewPanel') };

      Game.s.mats.herb = 40;
      const before = snap();
      Rooms.open('apoth');
      document.querySelector('#roomBody [data-brew="a_draught"]').click();
      out.opened = { panel: !!document.getElementById('brewPanel'), herbs: Game.s.mats.herb,
        target: document.getElementById('brewTarget').innerText, want: vecR(Brew.s.target),
        goShut: document.getElementById('brewGo').disabled,
        listGone: !document.querySelector('#roomBody [data-brew]') };
      const sol = __solve()[0];

      // one part of the first herb: the total on screen is that herb
      document.querySelector('#roomBody .bstep[data-herb="0"][data-d="1"]').click();
      out.onePart = { sum: document.getElementById('brewSum').innerText, v: vecR(Brew.s.herbs[0].v),
        parts: document.querySelector('#roomBody [data-parts="0"]').innerText,
        meters: [...document.querySelectorAll('#roomBody .bm')].map(m => m.className.replace('bm ', '')) };
      // the steppers stop at nothing and at the bench's reach
      document.querySelector('#roomBody .bstep[data-herb="0"][data-d="-1"]').click();
      out.minusShutAtZero = document.querySelector('#roomBody .bstep[data-herb="0"][data-d="-1"]').disabled;
      Brew.step(0, -1); out.neverNegative = Brew.s.herbs[0].n;
      for (let i = 0; i < 9; i++) Brew.step(0, 1);
      out.capped = { n: Brew.s.herbs[0].n, plusShut: document.querySelector('#roomBody .bstep[data-herb="0"][data-d="1"]').disabled };
      for (let i = 0; i < 9; i++) Brew.step(0, -1);

      // walk to the answer, one part short, then exact
      const click = (h, d) => document.querySelector(`#roomBody .bstep[data-herb="${h}"][data-d="${d}"]`).click();
      sol.forEach((c, h) => { for (let i = 0; i < c - (h === 0 ? 1 : 0); i++) click(h, 1); });
      out.oneShort = { goShut: document.getElementById('brewGo').disabled, ready: Brew.ready() };
      Brew.commit();
      out.commitRefused = { herbs: Game.s.mats.herb, potion: Game.s.items.potion, stillOpen: !!Brew.s };
      click(0, 1);
      out.exact = { goOpen: !document.getElementById('brewGo').disabled,
        meters: [...document.querySelectorAll('#roomBody .bm')].map(m => m.className.replace('bm ', '')),
        sum: document.getElementById('brewSum').innerText };
      out.untouchedWhileMixing = snap() === before;
      document.getElementById('brewGo').click();
      out.brewed = { herbs: Game.s.mats.herb, potion: Game.s.items.potion, closed: !Brew.s,
        listBack: !!document.querySelector('#roomBody [data-brew="a_draught"]'),
        held: /You hold\s+🌿\s*26/.test(document.getElementById('roomBody').innerText) };
      out.untouchedAfter = snap() === before;

      // walking away spends nothing
      document.querySelector('#roomBody [data-brew="a_insight"]').click();
      Brew.step(0, 1);
      document.getElementById('brewBack').click();
      out.walked = { herbs: Game.s.mats.herb, insight: Game.s.items.insight, closed: !Brew.s,
        listBack: !!document.querySelector('#roomBody [data-brew]') };
      // nor does leaving the room with a mix on the bench
      document.querySelector('#roomBody [data-brew="a_insight"]').click();
      UI.go('s-keep'); Rooms.open('apoth');
      out.left = { closed: !Brew.s, herbs: Game.s.mats.herb };

      // the satchel: made once, through the same bench, and then not offered
      Game.s.mats.herb = 60;
      document.querySelector('#roomBody [data-brew="a_satchel"]').click();
      out.satchelDim = Brew.s.dim;
      __solve()[0].forEach((c, h) => { Brew.s.herbs[h].n = c; });
      Rooms.refresh();
      document.getElementById('brewGo').click();
      out.satchel = { owned: Apothecary.has('a_satchel'), herbs: Game.s.mats.herb, mul: Apothecary.draughtMul(),
        button: !!document.querySelector('#roomBody [data-brew="a_satchel"]') };
      Game.s.mats.herb = 60; Brew.open('a_satchel');
      out.satchelAgain = !!Brew.s;
      out.untouchedAtEnd = snap() === before;
      return out;
    });
    t.ok('without the herbs, no bench is set out', !mix.poor.open && !mix.poor.panel);
    t.ok('with them, choosing a recipe sets out the mix instead of making it',
      mix.opened.panel && mix.opened.listGone && mix.opened.herbs === 40);
    t.eq('the recipe says what it calls for', mix.opened.target, mix.opened.want);
    t.ok('and cannot be brewed from an empty cauldron', mix.opened.goShut);
    t.ok('one part of a herb puts that herb\'s strengths in the total',
      mix.onePart.sum.includes('1·' + mix.onePart.v) && mix.onePart.parts === '1', mix.onePart.sum);
    t.ok('with each strength marked short, exact or over', mix.onePart.meters.every(m => ['ok', 'under', 'over'].includes(m)));
    t.ok('parts cannot go below nothing', mix.minusShutAtZero && mix.neverNegative === 0);
    t.ok('or past what the bench will take', mix.capped.n === 6 && mix.capped.plusShut);
    t.ok('one part short is not a brew', mix.oneShort.goShut && !mix.oneShort.ready);
    t.ok('and cannot be forced through', mix.commitRefused.herbs === 40 && mix.commitRefused.potion === 2 && mix.commitRefused.stillOpen,
      JSON.stringify(mix.commitRefused));
    t.ok('the exact mix opens the cauldron', mix.exact.goOpen && mix.exact.meters.every(m => m === 'ok'), JSON.stringify(mix.exact));
    t.ok('brewing spends what the recipe always cost and makes what it always made',
      mix.brewed.herbs === 26 && mix.brewed.potion === 5 && mix.brewed.closed, JSON.stringify(mix.brewed));
    t.ok('and the room goes back to its list, with the herbs counted down', mix.brewed.listBack && mix.brewed.held);
    t.ok('walking away from a mix spends nothing',
      mix.walked.herbs === 26 && mix.walked.closed && mix.walked.listBack, JSON.stringify(mix.walked));
    t.ok('nor does leaving the room with one on the bench', mix.left.closed && mix.left.herbs === 26);
    t.eq('the satchel is a three-herb mix', mix.satchelDim, 3);
    t.ok('mixed once, it is made and kept', mix.satchel.owned && mix.satchel.herbs === 0 && mix.satchel.mul === 1.5 && !mix.satchel.button,
      JSON.stringify(mix.satchel));
    t.ok('and is never set out again', !mix.satchelAgain);
    t.ok('none of it — mixing, brewing, walking away — touched a single topic\'s record',
      mix.untouchedWhileMixing && mix.untouchedAfter && mix.untouchedAtEnd);
  }
};
