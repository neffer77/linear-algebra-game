/* Scars.
 *
 * A foe wears its wounds: a crack opens across it for each quarter of its
 * health lost, and a fight that is over draws none. These checks open a
 * real fight on a phone, set the foe's health to each quarter, read what
 * the frame cut, and count the pixels the cracks change against an
 * unhurt foe drawn still. Nothing new is saved.
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
    return { cuts: [...new Set(window.__sc)], screen: document.querySelector('.screen.on').id };
  });
};
// the foe drawn still, as the Bestiary draws it, unhurt and with one crack and with three:
// how many of its pixels each set of cracks changes
const still = t => t.ev(() => {
  const S = 2, w0 = cv.width, h0 = cv.height, at = Anim.t, f = Battle.foe, shots = [];
  try {
    cv.width = Math.max(w0, 240 * S); cv.height = Math.max(h0, 240 * S);
    Anim.t = 0;
    for (const n of [0, 1, 3]) {
      cx.setTransform(S, 0, 0, S, 0, 0); cx.clearRect(0, 0, 240, 240);
      drawFoe(120, 205, 1.05, f.art, f.col, 0, 0, false, n);
      shots.push(cx.getImageData(0, 0, 240 * S, 240 * S).data);
    }
  } finally { Anim.t = at; cv.width = w0; cv.height = h0; fitCanvas(); }
  const diff = (a, b) => { let k = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 60) k++; return k; };
  return [diff(shots[0], shots[0]), diff(shots[0], shots[1]), diff(shots[0], shots[2])];
});

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
    t.ok('an unhurt foe wears no crack', whole.screen === 's-battle' && (whole.cuts.length === 0 || whole.cuts.join() === '0'), JSON.stringify(whole));
    t.ok('past each quarter lost, one crack more: one, then two, then three', one.cuts.join() === '1' && two.cuts.join() === '2' && three.cuts.join() === '3', JSON.stringify([one.cuts, two.cuts, three.cuts]));
    const seen = await still(t);
    t.ok('and they show: one crack changes the foe as drawn, three change it more', seen[0] === 0 && seen[1] > 100 && seen[2] > seen[1] + 100, JSON.stringify(seen));
    const won = await at(t, 0.1, 'win');
    t.ok('a fight that is over draws none', won.cuts.length === 0 || won.cuts.join() === '0', JSON.stringify(won));
    await t.ev(() => { Battle.over = false; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys);
  }
};
