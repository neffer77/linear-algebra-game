/* The Bestiary.
 *
 * Every campaign foe on one page off the map, realm by realm. A beaten foe
 * shows its name, numbers, its own tale and the topics its realm tests,
 * drawn in its own colours, with a button to fight it again; one not yet
 * beaten is an unnamed shadow. These checks open it as a new knight, clear
 * a few foes, read the page and its portraits back, and fight from it.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* What the page says, and what each portrait holds: how many lit pixels, and how many colours. */
const page = t => t.ev(() => {
  const rows = [...document.querySelectorAll('#bestList .bestRow')].map(r => {
    const c = r.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0; const cols = new Set();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { lit++; cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); }
    return { id: r.id, text: r.innerText, lit, cols: cols.size, fight: !!r.querySelector('button') };
  });
  return { count: document.getElementById('bestCount').innerText, bar: document.getElementById('bestBar').style.width, rows,
           heads: [...document.querySelectorAll('#bestList h2')].map(h => h.innerText) };
});

module.exports = {
  name: 'bestiary',
  title: 'The Bestiary · every foe on one page, a shadow until it is beaten',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const total = await t.ev(() => REALMS.reduce((n, r) => n + r.foes.length, 0));

    await t.ev(() => { Prefs.d.motion = false; UI.go('s-map'); });
    await t.tap('btnBest');
    t.eq('the map opens it', await t.screen(), 's-bestiary');
    let p = await page(t);
    t.eq('a new knight has beaten none', p.count, `0 of ${total} foes beaten`);
    t.eq('every foe has a row', p.rows.length, total);
    t.ok('each one an unnamed shadow, with no fight button', p.rows.every(r => /\?\?\?/.test(r.text) && !r.fight), JSON.stringify(p.rows[0]));
    t.ok('and no name or tale given away', await t.ev(() => !REALMS.some(r => r.foes.some(f => document.getElementById('bestList').innerText.includes(f.nm)))));
    t.ok('a shadow is a shape in one dark tone', p.rows.every(r => r.lit > 300 && r.cols <= 2), JSON.stringify(p.rows.map(r => [r.lit, r.cols])));

    // beat the first realm, and one foe of the second
    await t.ev(() => { ['0:0', '0:1', '0:2', '0:3', '1:0'].forEach(k => { Game.s.cleared[k] = true; }); UI.go('s-map'); });
    await t.tap('btnBest');
    p = await page(t);
    t.eq('the count follows what is cleared', p.count, `5 of ${total} foes beaten`);
    t.eq('and so does the bar', p.bar, (5 / total * 100) + '%');
    t.ok('each realm heads its own foes with its count', /Vale of Vectors · 4\/4/.test(p.heads[0]) && /· 1\/4/.test(p.heads[1]), p.heads.slice(0, 2).join(' | '));
    const slime = p.rows.find(r => r.id === 'best-0-0'), wyrm = p.rows.find(r => r.id === 'best-0-3');
    const want = await t.ev(() => ({ s: REALMS[0].foes[0], tale: Bestiary.LORE[REALMS[0].foes[0].nm], meet: Talk.BOSS['The Vector Wyrm'].meet }));
    t.ok('a beaten foe shows its name, numbers and tale', slime.text.includes(want.s.nm) && slime.text.includes(`❤️ ${want.s.hp} · ⚔️ ${want.s.atk} · 💰 ${want.s.gold}`) && slime.text.includes(want.tale), slime.text);
    t.ok('and the topics its realm tests', /Tests: .+/.test(slime.text), slime.text);
    t.ok('a boss its opening line too', wyrm.text.includes('👑 The Vector Wyrm') && wyrm.text.includes(want.meet), wyrm.text);
    t.ok('a beaten foe is drawn in colour', slime.lit > 300 && slime.cols > 4 && wyrm.cols > 4, JSON.stringify([slime.lit, slime.cols, wyrm.cols]));
    t.ok('a foe not yet beaten is still a shadow', /\?\?\?/.test(p.rows.find(r => r.id === 'best-1-1').text));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // drawing the portraits borrows the scene canvas, and gives it back at its own size
    const lent = await t.ev(() => ({ w: cv.width, h: cv.height }));
    t.ok('the scene canvas is given back at its own size', lent.w > 0 && Math.abs(lent.h / lent.w - 0.5) < 0.02, JSON.stringify(lent));

    // fighting again from it starts that very foe
    await t.ev(() => { Elite.force = null; Elite._odds = Elite.CHANCE; Elite.CHANCE = 0; });
    await t.ev(() => document.querySelector('#best-0-1 button').click());
    await sleep(300);
    const foe = await t.ev(() => ({ screen: document.querySelector('.screen.on').id, nm: Battle.foe.nm, ri: Battle.ri, fi: Battle.fi }));
    t.eq('fighting again starts that very foe', [foe.screen, foe.nm, foe.ri, foe.fi], ['s-battle', 'Bramble Goblin', 0, 1]);
    const scene = await t.ev(() => ({ w: cv.width, h: cv.height }));
    t.ok('and the battle scene is its own size again', scene.w > 0 && Math.abs(scene.h / scene.w - 0.5) < 0.02, JSON.stringify(scene));
    await t.ev(() => { Elite.CHANCE = Elite._odds; delete Elite._odds; Battle.flee(); });

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
