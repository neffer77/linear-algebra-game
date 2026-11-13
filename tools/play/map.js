/* M1 — the order of the map.
 *
 * The settings were appended to the bottom of the map as they were built, so by
 * the fifth one the loop the design calls the core of the game sat below eight
 * campaign realms and thirty-two fights. Nothing tested the order, which is why
 * it could drift that far without anything going red.
 *
 * So this measures the thing that actually went wrong: how far down the page a
 * player has to travel to reach the place they are going. Not "is the Deep on
 * the map" — it always was — but "how much is in front of it".
 */
'use strict';

module.exports = {
  name: 'map',
  title: 'M1 · what a player sees first',
  async run(t) {
    await t.newKnight('Wanderer');

    /* The measurement that matters. Every destination node carries an onclick
       that names how you get there, so counting the nodes in front of one is
       counting the scroll a player does to reach it. */
    const reach = await t.ev(() => {
      const out = {};
      const nodesBefore = (match) => {
        const nodes = [...document.querySelectorAll('#mapList .node')];
        const i = nodes.findIndex(n => (n.getAttribute('onclick') || '').indexOf(match) >= 0);
        return i < 0 ? null : i;
      };
      Game.s.cleared = {};
      Game.s.firstRun = 1;
      REALMS[0].foes.forEach((f, fi) => Game.s.cleared['0:' + fi] = 1);   // the Deep opens
      UI.renderMap();
      out.deep = nodesBefore("Dungeon.descend()");
      out.totalNodes = document.querySelectorAll('#mapList .node').length;

      // and with everything open, the last destination is still near the top
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => Game.s.cleared[ri + ':' + fi] = 1));
      UI.renderMap();
      out.arena = nodesBefore("Arena.start()");
      out.allOpenTotal = document.querySelectorAll('#mapList .node').length;
      return out;
    });
    t.ok('the Deep is within a couple of taps of the top, not thirty',
      reach.deep !== null && reach.deep <= 2, `${reach.deep} nodes in front of it`);
    t.ok('and with every place open, even the last of them is above the campaign',
      reach.arena !== null && reach.arena <= 8,
      `${reach.arena} in front of the Arena, of ${reach.allOpenTotal} nodes`);
    t.ok('the campaign is still all there', reach.allOpenTotal > 30,
      String(reach.allOpenTotal));

    // --- destinations come before realms, in the order they open ---
    const order = await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => Game.s.cleared[ri + ':' + fi] = 1));
      UI.renderMap();
      const heads = [...document.querySelectorAll('#mapList .realmhdr h2')].map(h => h.textContent.trim());
      const dests = DESTINATIONS.map(d => d.nm);
      const firstRealm = heads.findIndex(h => h === REALMS[0].nm);
      return {
        heads, dests, firstRealm,
        destsInOrder: heads.slice(0, dests.length),
        // the campaign's own headings, to compare against what was rendered
        realmNames: REALMS.map(r => r.nm),
        headsAfterDests: heads.slice(dests.length)
      };
    });
    t.eq('every destination is listed before the first realm',
      order.destsInOrder, order.dests);
    t.eq('and the whole campaign follows, in its own order',
      order.headsAfterDests, order.realmNames);
    t.ok('so the first realm sits directly after the last destination',
      order.firstRealm === order.dests.length,
      `first realm at ${order.firstRealm}, ${order.dests.length} destinations`);

    // --- a cold knight sees the campaign, because there is nowhere else ---
    const cold = await t.ev(() => {
      Game.s.cleared = {};
      Game.s.firstRun = 1;
      UI.renderMap();
      const txt = document.getElementById('mapList').innerText;
      const heads = [...document.querySelectorAll('#mapList .realmhdr h2')].map(h => h.textContent.trim());
      return {
        firstHead: heads[0],
        namesEverySealed: DESTINATIONS.every(d => txt.indexOf(d.nm) >= 0),
        sealedPanels: (txt.match(/Still sealed:/g) || []).length,
        // not one dead button for a place you cannot go
        lockedDestNodes: [...document.querySelectorAll('#mapList .node')]
          .filter(n => /Dungeon\.descend|Arena\.start/.test(n.getAttribute('onclick') || ''))
          .length,
        saysWhatToDo: /Next: Clear the first realm/.test(txt)
      };
    });
    t.eq('with nothing open the campaign is first', cold.firstHead, 'Vale of Vectors');
    t.ok('every sealed place is still named', cold.namesEverySealed);
    t.eq('in a single line rather than five dead nodes', cold.sealedPanels, 1);
    t.eq('and there are no locked destination buttons at all', cold.lockedDestNodes, 0);
    t.ok('the line says what to go and do about it', cold.saysWhatToDo);

    // --- as places open they move out of the sealed line ---
    const opening = await t.ev(() => {
      const out = { steps: [] };
      Game.s.cleared = {};
      for (let ri = 0; ri <= REALMS.length; ri++) {
        if (ri > 0) REALMS[ri - 1].foes.forEach((f, fi) => Game.s.cleared[(ri - 1) + ':' + fi] = 1);
        UI.renderMap();
        const txt = document.getElementById('mapList').innerText;
        const live = [...document.querySelectorAll('#mapList .node')]
          .filter(n => /Dungeon\.descend|Arena\.start/.test(n.getAttribute('onclick') || '')).length;
        const shut = DESTINATIONS.filter(d => !d.open()).length;
        out.steps.push({ realmsCleared: ri, live, shut,
                         hasSealedLine: /Still sealed:/.test(txt) });
      }
      out.total = DESTINATIONS.length;
      return out;
    });
    t.ok('the count of open places only ever rises as realms fall',
      opening.steps.every((s, i) => i === 0 || s.live >= opening.steps[i - 1].live),
      JSON.stringify(opening.steps.map(s => s.live)));
    t.ok('every place is either a button or in the sealed line, never both and never neither',
      opening.steps.every(s => s.live + s.shut === opening.total),
      JSON.stringify(opening.steps));
    t.ok('and the sealed line disappears once nothing is sealed',
      opening.steps[opening.steps.length - 1].hasSealedLine === false,
      JSON.stringify(opening.steps[opening.steps.length - 1]));

    // --- a descent in progress outranks everything, including the daily ---
    const resume = await t.ev(() => {
      Game.s.cleared = {};
      REALMS[0].foes.forEach((f, fi) => Game.s.cleared['0:' + fi] = 1);
      Game.s.metRoom = { monster: 1, lock: 1, seam: 1, wager: 1, rumour: 1 };
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 140, xp: 30 } });
      Dungeon.active = false;                       // as if the tab had been closed
      UI.renderMap();
      const nodes = [...document.querySelectorAll('#mapList .node')];
      const first = nodes[0].getAttribute('onclick') || '';
      return {
        firstIsResume: first.indexOf('Dungeon.resume') >= 0,
        first,
        offersAbandon: /Abandon it/.test(document.getElementById('mapList').innerText),
        namesTheStake: /140 gold still at risk/.test(document.getElementById('mapList').innerText)
      };
    });
    t.ok('a descent left in progress is the very first thing on the map',
      resume.firstIsResume, resume.first);
    t.ok('with the way out of it beside it', resume.offersAbandon);
    t.ok('and it names what is riding on it', resume.namesTheStake);

    // --- the quartermaster still catches a knight who walked out early ---
    const quarter = await t.ev(() => {
      Game.s.run = null;
      Game.s.firstRun = 0;
      UI.renderMap();
      const nodes = [...document.querySelectorAll('#mapList .node')];
      return { first: nodes[0].getAttribute('onclick') || '' };
    });
    t.ok('a knight who never finished the cellar is offered it back, first',
      quarter.first.indexOf('Quartermaster.open') >= 0, quarter.first);

    // --- the table is the single source of truth for all of it ---
    const table = await t.ev(() => {
      Game.s.cleared = {};
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => Game.s.cleared[ri + ':' + fi] = 1));
      Game.s.bests = { summit: 9 };
      Game.s.arenaBest = 17;
      Game.s.gold = 400;
      return {
        count: DESTINATIONS.length,
        ids: DESTINATIONS.map(d => d.id),
        everyOneComplete: DESTINATIONS.every(d =>
          d.nm && d.col && d.ic && d.blurb && d.sealed &&
          typeof d.open === 'function' && typeof d.label === 'function' &&
          typeof d.detail === 'function' && typeof d.act === 'string'),
        // every label and detail renders without throwing, with real state behind it
        labels: DESTINATIONS.map(d => d.label()),
        byId: Object.fromEntries(DESTINATIONS.map(d =>
          [d.id, { label: d.label(), detail: d.detail() }])),
        details: DESTINATIONS.map(d => d.detail()),
        // and every setting a knight can descend into has a node
        settingsCovered: Object.keys(SETTINGS)
          .filter(k => k !== 'cellar')
          .every(k => DESTINATIONS.some(d => d.id === k))
      };
    });
    t.eq('eight destinations', table.count, 8);
    t.eq('in the order they open', table.ids,
      ['deep', 'sanctum', 'tavern', 'summit', 'wilds', 'sea', 'library', 'arena']);

    t.ok('each is fully described by the table', table.everyOneComplete);
    t.ok('every label renders', table.labels.every(l => typeof l === 'string' && l.length),
      JSON.stringify(table.labels));
    /* Looked up by id rather than by position: the table grows with every
       setting, and an index here would quietly start reading the wrong row the
       next time one is appended. */
    t.ok('and shows the record where there is one',
      /height 9/.test(table.byId.summit.label) && /wave 17/.test(table.byId.arena.label),
      JSON.stringify(table.labels));
    t.ok('every detail renders', table.details.every(d => typeof d === 'string' && d.length),
      JSON.stringify(table.details));
    t.ok('and the Tavern quotes the buy-in it will actually charge',
      /100 gold/.test(table.byId.tavern.detail), table.byId.tavern.detail);
    t.ok('every setting you can descend into has a way in from the map',
      table.settingsCovered);

    // ------------------------------------------------------------------
    // One card at the top says what to do next.
    // ------------------------------------------------------------------
    const hero = await t.ev(() => {
      const out = {};
      const card = () => { UI.go('s-map'); const c = document.getElementById('heroCard');
        return { text: c.innerText, go: c.querySelector('#heroGo').dataset.hero,
          chips: [...c.querySelectorAll('[data-chip]')].map(x => x.dataset.chip),
          pips: [...c.querySelectorAll('.hpips i')].map(i => i.className.trim()) }; };
      Game.s.cleared = {}; Game.s.topicStats = {}; Game.s.streak = { days: 0, last: null };
      Game.s.mats = { ore: 0, essence: 0, herb: 0, page: 0 }; Game.s.runes = {};
      delete Game.s.dungeon;

      // a knight who has not been down to the cellar is sent there
      Game.s.firstRun = 0;
      out.cellar = card();
      // one who walked out of the cellar and has beaten a foe since keeps the campaign
      Game.s.cleared['0:0'] = 1;
      out.walkedOut = card();
      out.walkedOutNext = REALMS[0].foes[1].nm;
      const firstNode = document.querySelector('#mapList .node');
      out.walkedOutFirstNode = firstNode ? firstNode.getAttribute('onclick') || '' : '';
      Game.s.cleared = {};
      Game.s.firstRun = 1;

      // a new campaign: the first foe of the first realm
      out.start = card();
      out.startNames = { realm: REALMS[0].nm, foe: REALMS[0].foes[0].nm };
      out.notANode = !document.querySelector('#mapList #heroCard') && !document.getElementById('heroCard').classList.contains('node');
      out.quiet = out.start.chips;
      document.getElementById('heroGo').click();
      out.fights = { screen: document.querySelector('.screen.on').id, foe: Battle.foe.nm, ri: Battle.ri, fi: Battle.fi };
      Battle.flee();

      // two down in the first realm: the third is next, and the pips say so
      Game.s.cleared['0:0'] = 1; Game.s.cleared['0:1'] = 1;
      out.third = card(); out.thirdFoe = REALMS[0].foes[2].nm;
      document.getElementById('heroGo').click();
      out.thirdFights = { ri: Battle.ri, fi: Battle.fi, foe: Battle.foe.nm };
      Battle.flee();
      // a realm finished: on to the next one
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      out.nextRealm = card(); out.nextRealmName = REALMS[1].nm;
      const boss = REALMS[1].foes.length - 1;
      REALMS[1].foes.forEach((f, i) => { if (i < boss) Game.s.cleared['1:' + i] = 1; });
      out.boss = card(); out.bossName = REALMS[1].foes[boss].nm;

      // the smaller things, each only when it is true
      Game.s.streak = { days: 5, last: null };
      Game.s.topicStats.matVec = { c: 1, w: 3, m: 0.22, seen: 4, last: 0, t: Date.now() };
      Game.s.mats.herb = 38;
      out.busy = card();
      document.querySelector('#heroCard [data-chip="weak"]').click();
      out.weakGoes = { screen: document.querySelector('.screen.on').id, topic: Train.cur && Train.cur.key };
      UI.go('s-map');
      document.querySelector('#heroCard [data-chip="keep"]').click();
      out.keepGoes = { screen: document.querySelector('.screen.on').id, room: Rooms.cur };
      // a solid knight with empty pockets is not nagged
      Game.s.topicStats.matVec.m = 0.95; Game.s.mats.herb = 0; Game.s.streak.days = 1;
      out.calm = card().chips;

      // a descent in flight outranks the campaign
      Dungeon.descend('deep');
      Dungeon.run.gold = 77; Dungeon.checkpoint && Dungeon.checkpoint();
      UI.go('s-title');
      out.pending = !!Dungeon.pending();
      out.resume = card();
      Dungeon.abandon ? (window.confirm = () => true, Dungeon.abandon()) : 0;

      // the whole campaign won
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => Game.s.cleared[ri + ':' + fi] = 1));
      out.won = card();
      return out;
    });
    t.eq('a knight who has not seen the cellar is sent there first', hero.cellar.go, 'cellar');
    t.ok('but one who has beaten a foe since walking out is pointed at the next foe',
      hero.walkedOut.go === 'fight' && hero.walkedOut.text.includes(hero.walkedOutNext), hero.walkedOut.text.slice(0, 100));
    t.ok('and the cellar is still offered first among the nodes',
      hero.walkedOutFirstNode.indexOf('Quartermaster.open') >= 0, hero.walkedOutFirstNode);
    t.ok('a new campaign is pointed at its first foe',
      hero.start.go === 'fight' && hero.start.text.includes(hero.startNames.realm) && hero.start.text.includes(hero.startNames.foe),
      hero.start.text.slice(0, 100));
    t.ok('the card is not one of the map\'s nodes, so their order is untouched', hero.notANode);
    t.eq('with nothing else pressing, it says nothing else', hero.quiet, []);
    t.ok('its button starts that fight',
      hero.fights.screen === 's-battle' && hero.fights.foe === hero.startNames.foe && hero.fights.ri === 0 && hero.fights.fi === 0,
      JSON.stringify(hero.fights));
    t.ok('two foes down, it names the third',
      hero.third.text.includes(hero.thirdFoe) && hero.third.pips.filter(c => c.includes('on')).length === 2
      && hero.third.pips[2].includes('now'), JSON.stringify(hero.third.pips));
    t.ok('and its button fights the third, not the first',
      hero.thirdFights.fi === 2 && hero.thirdFights.foe === hero.thirdFoe, JSON.stringify(hero.thirdFights));
    t.ok('a realm finished, it moves to the next', hero.nextRealm.text.includes(hero.nextRealmName) && /realm 2 of/i.test(hero.nextRealm.text));
    t.ok('and it says when the next foe is the champion', hero.boss.text.includes('👑') && hero.boss.text.includes(hero.bossName));
    t.eq('a streak, a weak topic and a lit bench each get a line', hero.busy.chips, ['streak', 'weak', 'keep']);
    t.ok('the weak topic\'s line starts a drill on that topic',
      hero.weakGoes.screen === 's-train' && hero.weakGoes.topic === 'matVec', JSON.stringify(hero.weakGoes));
    t.ok('the bench\'s line opens that room', hero.keepGoes.screen === 's-room' && hero.keepGoes.room === 'apoth', JSON.stringify(hero.keepGoes));
    t.eq('a knight with nothing pressing is not nagged', hero.calm, []);
    t.ok('a descent in flight outranks the campaign', hero.pending && hero.resume.go === 'resume' && /at risk/.test(hero.resume.text),
      hero.resume.text.slice(0, 100));
    t.ok('and when every champion is down it points at what is left', hero.won.go === 'deep' && /Every champion is down/.test(hero.won.text));

    // ------------------------------------------------------------------
    // Health carries between fights, so the card says when to rest first.
    // ------------------------------------------------------------------
    const low = await t.ev(async () => {
      const out = {};
      Game.s.cleared = { '0:0': 1 }; Game.s.firstRun = 1; delete Game.s.dungeon;
      const armor0 = Game.s.armor; Game.s.armor = 'a2';   // armour that turns some of a blow
      const foe = REALMS[0].foes[1];
      const read = () => { UI.go('s-map'); const c = document.getElementById('heroCard');
        const lo = c.querySelector('#heroLow'), rest = c.querySelector('#heroRest');
        return { low: lo ? lo.innerText : null, rest: rest ? rest.innerText : null,
          fightGold: c.querySelector('#heroGo').classList.contains('gold') }; };
      Game.s.maxHp = Game.maxHp();
      out.max = Game.s.maxHp; out.cost = 25 + Game.s.lvl * 5;
      out.hit = Math.max(4, Math.round(foe.atk - Game.armor().def - Runes.def()));
      Game.s.hp = Math.ceil(out.max / 2); Game.s.gold = 500;
      out.half = read();
      Game.s.hp = Math.floor(out.max / 2) - 1; out.lowHp = Game.s.hp;
      out.hurt = read();
      document.getElementById('heroRest').click();
      out.rested = { hp: Game.s.hp, gold: Game.s.gold, card: read() };
      Game.s.hp = 20; Game.s.gold = out.cost - 1;
      out.poor = read();

      // a fall: the retry offers the camp first when the purse can pay for it
      const fall = async gold => {
        Game.s.gold = gold; Game.s.hp = 5;
        Battle.begin(0, 1); Battle.lose();
        await new Promise(r => setTimeout(r, 1100));
        const ra = document.getElementById('restAgain'), ta = document.getElementById('tryAgain');
        return { screen: document.querySelector('.screen.on').id, hp: Game.s.hp, gold: Game.s.gold,
          restAgain: ra ? ra.innerText : null, tryAgain: ta ? ta.innerText : null,
          tryGold: ta ? ta.classList.contains('gold') : null };
      };
      out.fallRich = await fall(500);
      document.getElementById('restAgain').click();
      out.restedIn = { screen: document.querySelector('.screen.on').id, hp: Game.s.hp, max: Game.s.maxHp, foe: Battle.foe.nm };
      Battle.flee();
      out.fallPoor = await fall(0);
      Game.s.armor = armor0; UI.go('s-map');
      return out;
    });
    t.eq('at half health or more, the card says nothing about it', [low.half.low, low.half.rest], [null, null]);
    t.ok('below half, it gives your health and what a miss costs, worked out for you',
      low.hurt.low && low.hurt.low.includes(low.lowHp + ' of ' + low.max) && low.hurt.low.includes('about ' + low.hit), low.hurt.low);
    t.ok('and offers a night\'s camp first, priced, ahead of the fight',
      low.hurt.rest && low.hurt.rest.includes(String(low.cost)) && !low.hurt.fightGold, JSON.stringify(low.hurt));
    t.ok('resting there heals to full for that price, and the card is back to the fight',
      low.rested.hp === low.max && low.rested.gold === 500 - low.cost && low.rested.card.low === null && low.rested.card.fightGold,
      JSON.stringify(low.rested));
    t.ok('a knight who cannot pay is still told, and the fight stays the way forward',
      low.poor.low && low.poor.rest === null && low.poor.fightGold, JSON.stringify(low.poor));
    t.ok('after a fall, resting and trying again is offered first, priced, beside a retry that says what it starts at',
      low.fallRich.screen === 's-result' && low.fallRich.restAgain && low.fallRich.restAgain.includes(String(low.cost))
      && low.fallRich.tryAgain.includes('❤️ ' + low.fallRich.hp) && !low.fallRich.tryGold, JSON.stringify(low.fallRich));
    t.ok('and it walks back in at full health against the same foe',
      low.restedIn.screen === 's-battle' && low.restedIn.hp === low.restedIn.max && low.restedIn.foe === REALMS[0].foes[1].nm,
      JSON.stringify(low.restedIn));
    t.ok('a purse too light for the camp keeps the plain retry first',
      low.fallPoor.restAgain === null && low.fallPoor.tryGold, JSON.stringify(low.fallPoor));

    // ------------------------------------------------------------------
    // The campaign is a road, and each realm folds away beneath it.
    // ------------------------------------------------------------------
    const road = await t.ev(() => {
      const out = {};
      Game.s.cleared = {}; Game.s.firstRun = 1; delete Game.s.dungeon;
      const read = () => {
        UI.go('s-map');
        return {
          states: [...document.querySelectorAll('#realmPath .stone')].map(b => b.dataset.state),
          open: [...document.querySelectorAll('#mapList details.realm')].filter(d => d.open).map(d => d.id),
          walked: !!document.querySelector('#realmPath path[stroke="#f2c14e"]'),
          nodes: document.querySelectorAll('#mapList details.realm .node').length
        };
      };
      out.fresh = read();
      REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      REALMS[1].foes.forEach((f, i) => Game.s.cleared['1:' + i] = 1);
      Game.s.cleared['2:0'] = 1;
      out.two = read();
      out.hereSays = document.querySelector('#realmPath .stone[data-realm="2"]').textContent.replace(/\s+/g, ' ');
      out.foes = REALMS.reduce((n, r) => n + r.foes.length, 0);
      // the road is a way to a realm: tapping a stone opens it
      document.querySelector('#realmPath .stone[data-realm="0"]').click();
      out.tapped = document.getElementById('realm-0').open;
      // every fight is still on the page, open or folded, and still fights
      out.foldedStillFights = (() => {
        const n = document.querySelector('#realm-1 .node');
        return !!n && /Battle\.begin\(1,0\)/.test(n.getAttribute('onclick'));
      })();
      REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => Game.s.cleared[ri + ':' + fi] = 1));
      out.all = read();
      return out;
    });
    t.eq('a new knight\'s road: the first realm is where they are, the rest sealed',
      road.fresh.states, ['here', 'sealed', 'sealed', 'sealed', 'sealed', 'sealed', 'sealed', 'sealed']);
    t.eq('and only that realm\'s fights are open', road.fresh.open, ['realm-0']);
    t.ok('with nothing walked yet', !road.fresh.walked);
    t.eq('two champions down: two stones won, the third is where they are',
      road.two.states.slice(0, 4), ['won', 'won', 'here', 'sealed']);
    t.eq('and that third realm is the one left open', road.two.open, ['realm-2']);
    t.ok('the road behind is drawn in gold', road.two.walked);
    t.ok('the stone they stand on counts their progress', /1 of 4/.test(road.hereSays), road.hereSays);
    t.ok('tapping a stone opens its realm', road.tapped);
    t.ok('a folded realm\'s fights are still there, and still begin a fight', road.foldedStillFights);
    t.eq('every fight is on the page whether folded or not', road.two.nodes, road.foes);
    t.ok('with everything won, every stone is won', road.all.states.every(x => x === 'won'), road.all.states.join());

    // ------------------------------------------------------------------
    // The title knows the knight, and the hall has a door for each.
    // ------------------------------------------------------------------
    const front = await t.ev(() => {
      const out = {};
      const k = Profiles.active();
      Game.s.cleared = {}; REALMS[0].foes.forEach((f, i) => Game.s.cleared['0:' + i] = 1);
      Game.s.firstRun = 1;
      UI.go('s-title'); UI.refreshTitle();
      const card = document.getElementById('knightCard');
      out.card = { shown: !!card, text: card ? card.innerText : '', name: k.nm,
        how: document.getElementById('howItWorks').style.display, switchBtn: document.getElementById('btnSwitch').style.display };
      Game.s.firstRun = 0; UI.refreshTitle();
      out.howWalkedOut = document.getElementById('howItWorks').style.display;
      const beaten = Game.s.cleared; Game.s.cleared = {}; UI.refreshTitle();
      out.howForNew = document.getElementById('howItWorks').style.display;
      Game.s.cleared = beaten;
      Game.s.firstRun = 1;
      document.getElementById('kcardSwitch').click();
      out.toHall = document.querySelector('.screen.on').id;

      Profiles.make('Second', CRESTS[3], CREST_COLS[3]); Profiles.save(); Knights.render();
      const doors = [...document.querySelectorAll('#knightList .doorwrap[data-knight]')];
      out.doors = doors.length;
      out.lit = doors.filter(d => d.classList.contains('on')).map(d => d.dataset.knight);
      out.activeId = k.id;
      out.everyDoorActs = doors.every(d => d.querySelectorAll('.kdacts .kbd').length === 3);
      out.banner = getComputedStyle(doors[1].querySelector('.kdoor')).getPropertyValue('--kc').trim();
      out.newDoor = !!document.querySelector('#knightList .kdoor.new');
      // the other door plays as the other knight
      const second = doors.find(d => d.dataset.knight !== k.id);
      second.querySelector('.kdoor').click();
      out.switched = Profiles.r.active === second.dataset.knight;
      // and back
      Knights.open();
      document.querySelector(`#knightList .doorwrap[data-knight="${k.id}"] .kdoor`).click();
      out.back = Profiles.r.active === k.id;
      Profiles.remove(second.dataset.knight);
      return out;
    });
    t.ok('the title shows the knight by name, with their champions', front.card.shown
      && front.card.text.includes(front.card.name) && /1 of 8 champions/.test(front.card.text), front.card.text);
    t.eq('a returning knight is not told how to play', front.card.how, 'none');
    t.eq('one who has not been down to the cellar and has beaten nothing still is', front.howForNew, '');
    t.eq('but one who walked out of the cellar and has beaten a realm since is not', front.howWalkedOut, 'none');
    t.eq('the card carries the way to the hall, so the list does not repeat it', front.card.switchBtn, 'none');
    t.eq('and it goes there', front.toHall, 's-knights');
    t.eq('a door for every knight', front.doors, 2);
    t.ok('the one being played is lit, and only that one', front.lit.length === 1 && front.lit[0] === front.activeId);
    t.ok('each door keeps rename, move and erase beneath it', front.everyDoorActs);
    t.eq('each hangs its knight\'s own colour', front.banner, '#e5484d');
    t.ok('and there is a door for a new knight', front.newDoor);
    t.ok('opening another door plays as that knight', front.switched);
    t.ok('and opening the first goes back', front.back);

    /* What to save for. The pointer under the bounties named the cheapest
       blade or plate not yet owned, even once it was affordable (a knight with
       420 gold read "420/60" and nothing to tap), and even when it was weaker
       than what the knight already wore. */
    const unlock = await t.ev(() => {
      const g = Game.s, out = {};
      const keep = { gold: g.gold, owned: Object.assign({}, g.owned), weapon: g.weapon, armor: g.armor };
      const read = () => {
        UI.renderMap();
        const ready = document.getElementById('unlockReady');
        const list = document.getElementById('mapList').innerText;
        return { ready: ready ? ready.innerText : '', go: ready ? ready.getAttribute('onclick') : '',
                 bar: (list.match(/Next unlock:[^\n]*/) || [''])[0], next: (Bounty.nextUnlock() || {}).nm };
      };
      g.owned = {}; g.weapon = 'w0'; g.armor = 'a0';
      g.gold = 10; out.poor = read();
      g.gold = 420; out.rich = read();
      g.owned = { wD: 1 }; g.weapon = 'wD'; out.forged = read();
      WEAPONS.concat(ARMORS).forEach(x => g.owned[x.id] = 1); out.all = read();
      out.allText = document.getElementById('mapList').innerText.includes('Nothing at the Smithy beats what you wear');
      Object.assign(g, keep); UI.renderMap();
      return out;
    });
    t.ok('short of the price, the next unlock is a bar towards it', /Iron Shortsword/.test(unlock.poor.bar) && !unlock.poor.ready, unlock.poor.bar);
    t.ok('once it can be paid for, it says so and is a way to the Smithy',
      /Iron Shortsword is ready at the Smithy/.test(unlock.rich.ready) && /s-shop/.test(unlock.rich.go) && !unlock.rich.bar,
      unlock.rich.ready);
    t.ok('and says what it does against what is worn', /hits for 14 against your Rusted Trainer's 9/.test(unlock.rich.ready), unlock.rich.ready);
    t.eq('a blade weaker than one already forged is never the thing to save for', unlock.forged.next, 'Leather Jerkin');
    t.ok('with nothing better on sale it says so', !unlock.all.next && unlock.allText);

    /* What a bounty may ask for. A topic bounty was drawn from all seventy
       topics, so a knight in the second realm was asked for Inflection Points,
       three sealed realms away and never taught. */
    const bounty = await t.ev(() => {
      const g = Game.s, out = {};
      const keep = { cleared: g.cleared, topicStats: g.topicStats, bounties: g.bounties };
      const roll = () => { const ks = new Set();
        for (let i = 0; i < 400; i++) ks.add(Bounty.kind('topic').mk().k);
        return [...ks]; };
      g.cleared = {}; g.topicStats = {};
      out.fresh = roll(); out.vale = REALMS[0].pool.slice();
      REALMS[0].foes.forEach((f, i) => g.cleared['0:' + i] = 1);
      out.second = roll(); out.marches = REALMS[0].pool.concat(REALMS[1].pool);
      g.topicStats = { taylor: { c: 2, w: 0, m: 0.5, seen: 2, last: 0, t: Date.now() } };
      out.met = roll();
      // an untouched bounty out of reach is rolled again; one already started stays
      g.topicStats = {};
      g.bounties = [{ id: 'topic', n: 5, k: 'inflection', p: 0, gold: 90 },
                    { id: 'topic', n: 5, k: 'taylor', p: 2, gold: 90 }];
      UI.renderMap();
      out.after = g.bounties.map(b => b.id + ':' + (b.k || '') + ':' + b.p);
      out.count = g.bounties.length;
      out.inflectLabel = TOPIC_LABEL.inflection;
      out.listText = document.getElementById('mapList').innerText;
      Object.assign(g, keep); UI.renderMap();
      return out;
    });
    t.ok('a new knight\'s topic bounties come only from the first realm',
      bounty.fresh.length > 1 && bounty.fresh.every(k => bounty.vale.includes(k)), JSON.stringify(bounty.fresh));
    t.ok('a realm on, they come from the realms reached so far, the new one included',
      bounty.second.every(k => bounty.marches.includes(k)) && bounty.second.some(k => !bounty.vale.includes(k)),
      JSON.stringify(bounty.second));
    t.ok('and a topic already met elsewhere can be asked for too', bounty.met.includes('taylor'), JSON.stringify(bounty.met));
    t.ok('an untouched bounty for a topic out of reach is rolled again',
      !bounty.after.some(x => x.startsWith('topic:inflection')) && !bounty.listText.includes('× ' + bounty.inflectLabel)
      && bounty.count === 3, JSON.stringify(bounty.after));
    t.ok('but one with progress on it is kept', bounty.after.includes('topic:taylor:2'), JSON.stringify(bounty.after));
  }
};
