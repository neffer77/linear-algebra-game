/* The Saga.
 *
 * The story of the Eigenrealm, a chapter for each realm. A realm's boss,
 * beaten for the first time, tells its chapter on the victory screen, drawn
 * beside the boss in its own colours; a rematch or a plain foe tells none.
 * The page off the map keeps the opening and every chapter read, and holds
 * the rest back with only where to read them. These checks open it as a new
 * knight, beat the first boss with real answers, read the chapter on the
 * spot and on the page, and check nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe of the first realm, with a knight who cannot fall. */
const fight = (t, fi, fresh) => t.ev(([fi, fresh]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  if (fresh) delete Game.s.cleared['0:' + fi];
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 99999;
  Battle.beastLeft = 0; Battle.wardUp = false;
  return Battle.foe.nm;
}, [fi, fresh]);
/* The killing blow, with a right answer, then on to the victory screen. */
const finish = async t => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 5;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(300);
};
/* A chapter on the page: its text, and how many lit pixels and colours its portrait holds. */
const chapter = (t, id) => t.ev(id => {
  const el = document.getElementById(id); if (!el) return null;
  const c = el.querySelector('canvas'); let lit = 0; const cols = new Set();
  if (c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { lit++; cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); } }
  return { text: el.innerText, lit, cols: cols.size };
}, id);

module.exports = {
  name: 'saga',
  title: 'The Saga · a chapter of the story told as each realm\'s boss falls',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const CH = await t.ev(() => Saga.CH);

    await t.ev(() => { Prefs.d.motion = false; UI.go('s-map'); });
    await t.tap('btnSaga');
    t.eq('the map opens it', await t.screen(), 's-saga');
    let p = await t.ev(() => ({ count: document.getElementById('sagaCount').innerText, list: document.getElementById('sagaList').innerText,
      rows: document.querySelectorAll('#sagaList .sagaCh').length }));
    t.eq('a new knight has read none', p.count, '0 of 8 chapters read');
    t.ok('the opening comes first', p.list.startsWith('📜 THE OPENING') && p.list.includes('A knight’s blade does not cut.'), p.list.slice(0, 120));
    t.eq('every chapter has its place', p.rows, 8);
    t.ok('and none is given away', CH.every(c => !p.list.includes(c.t) && !p.list.includes(c.b.slice(0, 40))), p.list.slice(0, 300));
    t.ok('each one says where to read it', /CHAPTER 1 OF 8 · \?\?\?\nBeat the boss of Vale of Vectors to read it\./.test(p.list), p.list.slice(0, 400));

    // a plain foe, beaten for the first time, tells nothing
    await fight(t, 0, true); await finish(t);
    t.ok('a plain foe tells no chapter', await t.ev(() => document.getElementById('resultBody').innerText.includes('Victory!') && !document.getElementById('sagaNew')));

    // the first boss, beaten for the first time, tells chapter 1
    const bi = await t.ev(() => REALMS[0].foes.length - 1);
    t.eq('the first boss is met', await fight(t, bi, true), 'The Vector Wyrm');
    await finish(t);
    const told = await chapter(t, 'sagaNew');
    t.ok('its fall tells chapter 1 on the victory screen', !!told && told.text.includes('📜 CHAPTER 1 OF 8 · VALE OF VECTORS') && told.text.includes(CH[0].t) && told.text.includes(CH[0].b), JSON.stringify(told));
    t.ok('beside the boss in its own colours', told && told.lit > 300 && told.cols > 4, JSON.stringify(told && [told.lit, told.cols]));
    t.ok('below the rewards and above the way on', await t.ev(() => {
      const b = document.getElementById('resultBody'), kids = [...b.children], i = kids.findIndex(k => k.id === 'sagaNew');
      return i > 0 && kids[i - 1].innerText.includes('Victory!') && /Onward/.test(kids[i + 1].innerText); }));
    t.ok('and it says the next realm lies open', await t.ev(() => document.getElementById('resultBody').innerText.includes('Matrix Marches now lies open.')));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // a rematch tells it no more
    await fight(t, bi, false); await finish(t);
    t.ok('a rematch tells no chapter', await t.ev(() => document.getElementById('resultBody').innerText.includes('Victory!') && !document.getElementById('sagaNew')));

    // the page keeps it
    await t.ev(() => UI.go('s-map'));
    await t.tap('btnSaga');
    p = await t.ev(() => ({ count: document.getElementById('sagaCount').innerText, bar: document.getElementById('sagaBar').style.width }));
    t.eq('the page counts it', [p.count, p.bar], ['1 of 8 chapters read', '12.5%']);
    const kept = await chapter(t, 'saga-0');
    t.ok('and keeps it to read again, drawn the same', !!kept && kept.text.includes(CH[0].b) && kept.text.includes('The fall of The Vector Wyrm.') && kept.cols > 4, JSON.stringify(kept));
    const next = await chapter(t, 'saga-1');
    t.ok('the next is still held back', !!next && !next.text.includes(CH[1].t) && next.text.includes('Beat the boss of Matrix Marches to read it.'), JSON.stringify(next));
    await t.ev(() => { Battle.flee(); UI.go('s-tome'); });
    await t.ev(() => [...document.querySelectorAll('#tomeList button')].find(b => /The saga so far/.test(b.innerText)).click());
    t.eq('the Tome opens it too', await t.screen(), 's-saga');

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
