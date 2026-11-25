/* Nameplate.
 *
 * A foe's nameplate carries more than its name: a crown, an elite's title, a
 * greedy or heroic mark, its charge pips, its phase and a new-page mark. On a
 * phone a long one pushed the foe's health off the right of the screen. It
 * now wraps within its own half of the bars, and the health stays in view.
 * These checks start real fights on a narrow phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const look = t => t.ev(() => {
  const r = id => document.getElementById(id).getBoundingClientRect();
  const n = r('foeName'), h = r('eHpTxt'), p = r('pHpTxt'), s = document.getElementById('s-battle');
  return { name: document.getElementById('foeName').innerText, hp: document.getElementById('eHpTxt').innerText,
    nameRight: n.right, nameOver: document.getElementById('foeName').scrollWidth > document.getElementById('foeName').clientWidth + 1, hpLeft: h.left, hpRight: h.right, hpLines: Math.round(h.height / 14), pRight: p.right,
    vw: innerWidth, wide: s.scrollWidth <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'nameplate',
  title: "Nameplate · a long foe nameplate wraps in its own half of the bars and never pushes the foe's health off a phone's screen",
  viewport: { width: 320, height: 700 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Prefs.d.motion = false; Prefs.d.lessons = false; });

    // a plain first foe
    await t.ev(() => { Elite.force = null; const o = Elite.CHANCE; Elite.CHANCE = 0; Battle.begin(0, 0); Elite.CHANCE = o; });
    await sleep(400);
    let c = await look(t);
    t.ok('a short nameplate sits beside the foe\'s health, all on the screen', c.hpRight <= c.vw && c.nameRight <= c.hpLeft + 1 && c.pRight <= c.vw && c.wide, JSON.stringify(c));

    // the longest a nameplate gets: a crowned, elite, greedy, heroic boss in its second phase, not yet in the Bestiary
    await t.ev(() => {
      Battle.flee();
      for (let fi = 0; fi < 4; fi++) Game.s.cleared['0:' + fi] = true;
      for (let fi = 0; fi < 3; fi++) Game.s.cleared['1:' + fi] = true;
      Elite.force = null; const o = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(1, 3);
      Elite.CHANCE = o;
      Battle.foe = Object.assign({}, Battle.foe, { elite: Object.keys(Elite.KINDS)[0], greedy: true, heroic: true });
      Battle.phase = 2; Battle.armour = 1;
      Battle.updateBars();
    });
    await sleep(300);
    c = await look(t);
    t.ok('the long nameplate is all there', /Greedy/.test(c.name) && /Heroic/.test(c.name) && /Phase II/.test(c.name) && /Determinant Golem/.test(c.name), c.name);
    t.ok('it wraps in its own half, and the health stays whole and on the screen', c.hpRight <= c.vw && c.nameRight <= c.hpLeft + 1 && c.hp === c.hp.trim() && /^\d+\/\d+$/.test(c.hp) && c.hpLines <= 1 && c.wide, JSON.stringify(c));

    // a name with no place to break in it, as a long word or a long run of marks has:
    // it breaks anywhere within its own half rather than pushing the health away
    await t.ev(() => { Battle.foe = Object.assign({}, Battle.foe, { nm: 'The ' + 'Determinant'.repeat(4) + ' Golem' }); Battle.updateBars(); });
    await sleep(300);
    c = await look(t);
    t.ok('an unbroken name breaks within its own half, and the health stays whole and on the screen', /DeterminantDeterminant/.test(c.name.replace(/\s/g, '')) && c.hpRight <= c.vw && c.nameRight <= c.hpLeft + 1 && /^\d+\/\d+$/.test(c.hp) && c.hpLines <= 1 && !c.nameOver && c.wide, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); for (const k of Object.keys(Game.s.cleared)) delete Game.s.cleared[k]; UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
