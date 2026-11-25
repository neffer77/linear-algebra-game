/* A shorter road.
 *
 * The campaign's road set its stones 74 pixels apart, which made it most of a
 * phone's screen on its own. Neighbouring stones sit on opposite sides, so
 * only a label's lines and the glowing stone need the room; they now sit 54
 * apart. These checks lay the road out on two phones, for a new knight, one
 * halfway and one with every champion down, and look for any label or stone
 * that touches another or runs out of the panel. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  UI.go('s-map');
  const p = document.getElementById('realmPath'), road = p.querySelector('.road'), pr = p.getBoundingClientRect();
  const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const parts = [];
  p.querySelectorAll('.stone').forEach(s => {
    parts.push({ k: 'disc ' + s.dataset.realm, ...box(s.querySelector('.sdisc')) });
    parts.push({ k: 'label ' + s.dataset.realm, ...box(s.querySelector('.slab')) });
  });
  const hit = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j];
    if (a.k.split(' ')[1] === b.k.split(' ')[1]) continue;   // a stone and its own label
    if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) hit.push(a.k + ' × ' + b.k);
  }
  const out = parts.filter(x => x.l < pr.left - 1 || x.r > pr.right + 1).map(x => x.k);
  return { hit, out, h: road.offsetHeight, screen: Math.round(pr.height / innerHeight * 100) / 100,
    states: [...p.querySelectorAll('.stone')].map(s => s.dataset.state).join(), wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'roadstep',
  title: 'A shorter road · the campaign\'s stones sit closer, and no label or stone touches another',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const step = await t.ev(() => UI.ROADSTEP);
    t.eq('the stones sit 54 apart', step, 54);
    const stages = [
      ['a new knight', () => { Game.s.cleared = {}; }],
      ['halfway', () => { Game.s.cleared = {}; for (const ri of [0, 1, 2]) REALMS[ri].foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = 'A'; }); Game.s.cleared['3:0'] = 'B'; }],
      ['every champion down', () => { Game.s.cleared = {}; REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = 'A'; })); }]
    ];
    for (const [w, h] of [[390, 844], [320, 640]]) {
      await t.page.setViewportSize({ width: w, height: h });
      await sleep(200);
      for (const [nm, set] of stages) {
        await t.ev(set);
        await sleep(150);
        const r = await read(t);
        t.ok(`${w} wide, ${nm}: no label or stone touches another`, r.hit.length === 0, JSON.stringify([r.states, r.hit]));
        t.ok(`${w} wide, ${nm}: every stone and label stays inside the panel`, r.out.length === 0 && r.wide, JSON.stringify(r.out));
        t.eq(`${w} wide, ${nm}: the road is 54 a stone, plus its ends`, r.h, 54 * 7 + 60);
      }
    }
    await t.page.setViewportSize({ width: 390, height: 844 });
    await t.ev(() => { Game.s.cleared = {}; });
    const r = await read(t);
    t.ok('the whole campaign panel is well under a phone\'s screen', r.screen < 0.62, String(r.screen));
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
