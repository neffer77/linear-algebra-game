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
  }
};
