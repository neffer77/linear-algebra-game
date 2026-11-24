/* The reckoning.
 *
 * Under every open fight on the map, how many plain blows of the knight's
 * weapon fell the foe and how many of the foe's blows would fell the knight
 * as they stand, each worked in its title. A sealed fight shows none, and a
 * better blade or a wound changes the numbers. These checks read the real
 * map on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = (t) => t.ev(() => {
  UI.go('s-map'); UI.renderMap();
  document.querySelectorAll('#mapList details.realm').forEach(d => { d.open = true; });
  const nodes = [...document.querySelectorAll('#mapList details.realm .node[onclick^="Battle.begin("]')];
  return nodes.map(n => {
    const [ri, fi] = n.getAttribute('onclick').match(/\d+/g).map(Number), s = n.querySelector('.reckon');
    const r = s && s.getBoundingClientRect();
    return { ri, fi, locked: n.classList.contains('locked'), blows: s ? +s.dataset.blows : null, falls: s ? +s.dataset.falls : null,
      text: s ? s.innerText : '', tip: s ? s.title : '', red: s ? /ff8f6b/i.test(s.getAttribute('style') || '') : false,
      inside: !s || (r.left >= 0 && r.right <= innerWidth + 1) };
  });
});

module.exports = {
  name: 'reckon',
  title: "The reckoning · under every open fight, the blows that fell it and the blows that would fell you",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Game.s.hp = Game.s.maxHp = Game.maxHp(); Game.s.weapon = 'w0'; Game.s.armor = ARMORS[0].id; });
    const fresh = await read(t);
    const me = await t.ev(() => ({ dmg: Game.weapon().dmg, def: Game.armor().def + Runes.def(), hp: Math.round(Game.s.hp), foe: REALMS[0].foes[0] }));
    const first = fresh.find(n => n.ri === 0 && n.fi === 0), hit = Math.max(4, Math.round(me.foe.atk - me.def));
    t.ok('the first fight is reckoned: its health over the blade\'s blow, and the knight\'s health over its blow, each rounded up',
      first && first.blows === Math.ceil(me.foe.hp / me.dmg) && first.falls === Math.ceil(me.hp / hit), JSON.stringify([first, me]));
    t.ok('the line says it in words and its title shows the sum',
      first && first.text.includes(`🗡️ ${first.blows} plain blows fell it`) && first.text.includes(`💔 ${first.falls} of its blows fell you`)
      && first.tip.startsWith(`${me.foe.hp} ÷ ${me.dmg} = `), JSON.stringify(first));
    t.ok('every open fight is reckoned and no sealed one is', fresh.length === 32 && fresh.every(n => n.locked === (n.blows === null)) && fresh.some(n => !n.locked) && fresh.some(n => n.locked), JSON.stringify(fresh.map(n => [n.ri, n.fi, n.locked, n.blows])));
    t.ok('every line fits the phone', fresh.every(n => n.inside), 'a reckoning runs off the screen');

    await t.ev(() => { Game.s.weapon = WEAPONS[3].id; });
    const sharp = (await read(t)).find(n => n.ri === 0 && n.fi === 0);
    const dmg3 = await t.ev(() => WEAPONS[3].dmg);
    t.ok('a better blade takes fewer blows', sharp.blows === Math.ceil(me.foe.hp / dmg3) && sharp.blows < first.blows, JSON.stringify([sharp, dmg3]));

    await t.ev(() => { Game.s.hp = 5; Game.s.weapon = 'w0'; });
    const hurt = (await read(t)).find(n => n.ri === 0 && n.fi === 0);
    t.ok('a wounded knight falls to one blow and the line turns red', hurt.falls === 1 && hurt.red && hurt.text.includes('💔 1 of its blow fells you'), JSON.stringify(hurt));

    await t.ev(() => { Game.s.hp = Game.s.maxHp; });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
