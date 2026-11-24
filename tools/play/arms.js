/* Arms on show.
 *
 * The knight in the fight wears what they bought: each blade is drawn its
 * own length and steel and each armour its own plate. These checks open a
 * real fight on a phone, read the frame's own calls, and count the gold of
 * the best blade and plate on the scene against the starting gear's.
 * A streak of five or more sets the blade burning. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

// a fight in the first realm in the given gear, then what the frame drew
const look = async (t, weapon, armor) => {
  await t.ev(([weapon, armor]) => {
    Battle.flee(); Prefs.d.motion = true; Prefs.d.lessons = false;
    Game.s.weapon = weapon; Game.s.armor = armor; Game.s.hp = Game.s.maxHp = Game.maxHp();
    Battle.honours = { stars: 0, crowns: 0, glow: false };
    Elite.force = null; window.__e = Elite.CHANCE; Elite.CHANCE = 0;
    Battle.begin(0, 0); Elite.CHANCE = window.__e;
    Battle.honours = { stars: 0, crowns: 0, glow: false };
    window.__arms = [];
    const b = Arms.blade, p = Arms.plate; window.__armsFn = [b, p];
    Arms.blade = g => { const r = b.call(Arms, g); window.__arms.push(['blade', r.len]); return r; };
    Arms.plate = g => { const r = p.call(Arms, g); window.__arms.push(['plate', r.skin]); return r; };
  }, [weapon, armor]);
  await sleep(700);
  return t.ev(([weapon, armor]) => {
    [Arms.blade, Arms.plate] = window.__armsFn;
    const cv = document.getElementById('scene'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let gold = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 200 && d[i + 1] < 235 && d[i + 2] > 110 && d[i + 2] < 165) gold++;
    const a = window.__arms;
    return { gold, blades: [...new Set(a.filter(x => x[0] === 'blade').map(x => x[1]))], plates: [...new Set(a.filter(x => x[0] === 'plate').map(x => x[1]))],
      want: [Arms.BLADES[weapon].len, Arms.PLATES[armor].skin], screen: document.querySelector('.screen.on').id };
  }, [weapon, armor]);
};

module.exports = {
  name: 'arms',
  title: 'Arms on show · the knight in the fight is drawn in the blade and armour they wear',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const start = await look(t, 'w0', 'a0');
    t.ok('a new knight is drawn with the rusted trainer and the tunic', start.screen === 's-battle' && start.blades.join() === String(start.want[0]) && start.plates.join() === start.want[1], JSON.stringify(start));
    const best = await look(t, 'w9', 'a8');
    t.ok('the best blade and the regalia are what the frame draws', best.blades.join() === String(best.want[0]) && best.plates.join() === best.want[1] && best.want[0] > start.want[0], JSON.stringify(best));
    t.ok('and they show: the long gold blade and the gold plate cover far more of the scene in gold', best.gold > start.gold + 300, JSON.stringify([start.gold, best.gold]));
    const plate = await look(t, 'w0', 'a8');
    t.ok('the regalia alone shows in gold too', plate.gold > start.gold + 150 && plate.gold < best.gold, JSON.stringify([start.gold, plate.gold, best.gold]));
    // a streak of seven sets the blade burning, and a miss puts it out
    const burn = async (combo) => {
      await t.ev((combo) => { Battle.combo = combo; window.__fl = []; const f = Flame.of; window.__flFn = f;
        Flame.of = B => { const r = f.call(Flame, B); window.__fl.push(r ? r.blur : 0); return r; }; }, combo);
      await sleep(500);
      return t.ev(() => { Flame.of = window.__flFn; return [...new Set(window.__fl)]; });
    };
    const hot = await burn(7), cold = await burn(0);
    t.ok('a streak of seven sets the drawn blade burning, and none leaves it cold', hot.length === 1 && hot[0] === 20 && cold.join() === '0', JSON.stringify([hot, cold]));
    await t.ev(() => { Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
