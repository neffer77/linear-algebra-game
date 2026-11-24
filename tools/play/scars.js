/* Scars and dents.
 *
 * A foe wears its wounds: a crack opens across it for each quarter of its
 * health lost, and a fight that is over draws none. The knight wears theirs
 * too, a dent in the plate for each quarter of their health lost. These checks open a
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
  title: 'Scars and dents · the foe cracks and the knight\'s plate dents for each quarter of health lost',
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
    // in its last quarter the foe reels from its feet, both ways; before it, it stands still
    const reel = async (share) => {
      await t.ev((share) => { Battle.over = false; Battle.ehp = Math.max(1, Math.round(Battle.emax * share));
        window.__rl = []; const f = Scars.reel; window.__rlFn = f;
        Scars.reel = (n, tt) => { const r = f.call(Scars, n, tt); window.__rl.push(r); return r; }; }, share);
      await sleep(700);
      return t.ev(() => { Scars.reel = window.__rlFn; return window.__rl; });
    };
    const near = await reel(0.1), half = await reel(0.45);
    t.ok('a foe in its last quarter reels on its feet, both ways, and one with more left stands', near.length > 3 && near.some(r => r > 0.01) && near.some(r => r < -0.01) && half.length === 0,
      JSON.stringify([near.length, Math.min(...near), Math.max(...near), half.length]));
    const won = await at(t, 0.1, 'win');
    t.ok('a fight that is over draws none', won.cuts.length === 0 || won.cuts.join() === '0', JSON.stringify(won));
    // a beaten foe lies dazed, three stars circling its head; a fight still on has none
    const daze = async (over) => {
      await t.ev((over) => { Battle.over = over; window.__dz = []; const f = Daze.draw; window.__dzFn = f;
        Daze.draw = (x, y, s, tt) => { const r = f.call(Daze, x, y, s, tt); window.__dz.push(r); return r; }; }, over);
      await sleep(500);
      return t.ev(() => { Daze.draw = window.__dzFn; return window.__dz; });
    };
    const dazed = await daze('win'), awake = await daze(false);
    t.ok('a beaten foe lies with three stars circling its head, and a foe still fighting has none', dazed.length > 3 && dazed.every(n => n === 3) && awake.length === 0, JSON.stringify([dazed.length, awake.length]));
    // the knight's plate: a dent for each quarter lost, gone as health comes back
    const dent = async (share) => {
      await t.ev((share) => { Battle.over = false; Game.s.maxHp = 400; Game.s.hp = Math.round(400 * share);
        window.__dn = []; const f = Dents.beat; window.__dnFn = f;
        Dents.beat = (n, dark) => { const r = f.call(Dents, n, dark); window.__dn.push(r); return r; }; }, share);
      await sleep(500);
      return t.ev(() => { Dents.beat = window.__dnFn; return [...new Set(window.__dn)]; });
    };
    const dents = [await dent(1), await dent(0.6), await dent(0.4), await dent(0.2), await dent(1)];
    t.ok("the knight's plate dents once a quarter is lost, then twice, then three times, and mends as health comes back",
      dents.map(d => d.join()).join(' ') === '0 1 2 3 0', JSON.stringify(dents));
    await t.ev(() => { Battle.over = false; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys);
  }
};
