/* Scars.
 *
 * A foe wears its wounds: a crack opens across it for each quarter of its
 * health lost, and a fight that is over draws none. These checks open a
 * real fight on a phone, set the foe's health to each quarter, read what
 * the frame cut, and count the dark of the cracks on the scene against an
 * unhurt foe. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

// the foe at a share of its health: the cracks each frame cut, and the dark on the scene
const at = async (t, share, over) => {
  await t.ev(([share, over]) => {
    Battle.over = over; Battle.ehp = Math.max(1, Math.round(Battle.emax * share));
    window.__sc = []; const f = Scars.cut; window.__scFn = f;
    Scars.cut = (n, art) => { const r = f.call(Scars, n, art); window.__sc.push(r); return r; };
  }, [share, over]);
  await sleep(600);
  return t.ev(() => {
    Scars.cut = window.__scFn;
    const cv = document.getElementById('scene'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let dark = 0;
    for (let y = 0; y < cv.height; y++) for (let x = Math.floor(cv.width * 0.55); x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (Math.abs(d[i] - 26) < 10 && Math.abs(d[i + 1] - 22) < 10 && Math.abs(d[i + 2] - 34) < 10) dark++;
    }
    return { cuts: [...new Set(window.__sc)], dark, screen: document.querySelector('.screen.on').id };
  });
};

module.exports = {
  name: 'scars',
  title: 'Scars · a crack opens across the foe for each quarter of its health lost',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      Battle.flee(); Prefs.d.motion = false; Prefs.d.lessons = false;
      Elite.force = null; window.__e = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 1); Elite.CHANCE = window.__e;
      Game.s.hp = Game.s.maxHp = 99999;
    });
    const whole = await at(t, 1, false), one = await at(t, 0.7, false), two = await at(t, 0.45, false), three = await at(t, 0.1, false);
    t.ok('an unhurt foe wears no crack', whole.screen === 's-battle' && whole.cuts.join() === '0', JSON.stringify(whole));
    t.ok('past each quarter lost, one crack more: one, then two, then three', one.cuts.join() === '1' && two.cuts.join() === '2' && three.cuts.join() === '3', JSON.stringify([one.cuts, two.cuts, three.cuts]));
    t.ok('and they show: a foe near its end is crossed with dark cracks an unhurt one lacks', three.dark > whole.dark + 150 && two.dark > whole.dark, JSON.stringify([whole.dark, one.dark, two.dark, three.dark]));
    const won = await at(t, 0.1, 'win');
    t.ok('a fight that is over draws none', won.cuts.length === 0 || won.cuts.join() === '0', JSON.stringify(won));
    await t.ev(() => { Battle.over = false; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys);
  }
};
