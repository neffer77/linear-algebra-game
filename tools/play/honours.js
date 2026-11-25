/* Honours.
 *
 * The knight wears what they have done, worked out from the foes already
 * beaten. A realm's boss beaten for the first time sets a star on the shield,
 * said on the victory card; the third boss makes the blade shine as well. A
 * plain foe, or a boss beaten again, adds nothing and says nothing. These
 * checks win real fights with real answers on a phone, and look at the
 * knight drawn on the scene. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* A foe, with a knight who cannot fall. */
const fight = (t, ri, fi, fresh) => t.ev(([ri, fi, fresh]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  if (fresh) delete Game.s.cleared[ri + ':' + fi];
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(ri, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 99999;
  Battle.beastLeft = 0; Battle.wardUp = false;
  return Object.assign({}, Battle.honours);
}, [ri, fi, fresh]);
/* The killing blow, with a right answer; then what the victory card says.
   The answer is the step's own, since a fight can open on a step or a rite
   whose answer is not the problem's, and it is struck until the foe falls. */
const finish = async t => {
  for (let i = 0; i < 6; i++) {
    const won = await t.ev(() => {
      if (Battle.over || Battle.ehp <= 0) return true;
      const st = Battle.step && Battle.step(); if (!st) return false;
      const cs = Combat.strike; Combat.strike = () => 5;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
      Battle.answer(null, st.a);
      Combat.strike = cs;
      return Battle.ehp <= 0;
    });
    if (won) break;
    await sleep(900);
    await t.ev(() => { const b = document.querySelector('#explain button'); if (b && !Battle.over) b.click(); });
    await sleep(300);
  }
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(300);
  const c = await t.ev(() => {
    const el = document.getElementById('honours');
    return { line: el ? el.innerText : null, kinds: el ? [...el.querySelectorAll('[data-k]')].map(d => d.dataset.k) : [],
      worn: Object.assign({}, Battle.honours), wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return c;
};

module.exports = {
  name: 'honours',
  title: 'Honours · a star on the shield for every boss beaten, and a shining blade from the third',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
    });

    let w = await fight(t, 0, 0, true);
    t.ok('a new knight wears none', w.stars === 0 && w.crowns === 0 && w.glow === false, JSON.stringify(w));
    let c = await finish(t);
    t.ok('a plain foe beaten adds none, and says nothing', c.line === null && c.worn.stars === 0, JSON.stringify(c));

    await fight(t, 0, 3, true);
    c = await finish(t);
    t.ok("the first boss beaten sets a star on the shield, said on the card", c.kinds.join() === 'star'
      && /⭐ A new star on your shield: 1 of 8 realms' bosses beaten\./.test(c.line) && c.worn.stars === 1, JSON.stringify(c));
    t.ok('on a phone', c.wide);

    w = await fight(t, 0, 3, false);
    t.ok('the next fight wears it', w.stars === 1 && !w.glow, JSON.stringify(w));
    c = await finish(t);
    t.ok('a boss beaten again adds nothing', c.line === null && c.worn.stars === 1, JSON.stringify(c));

    await t.ev(() => { Game.s.cleared['1:3'] = 'B'; });
    await fight(t, 2, 3, true);
    c = await finish(t);
    t.ok('the third boss sets a star and makes the blade shine', c.kinds.join() === 'star,glow'
      && c.line.includes('3 of 8') && c.line.includes('✨ Your blade shines now: 3 bosses beaten.') && c.worn.glow === true, JSON.stringify(c));

    // the knight drawn on the scene wears it: gold in the ring around the lambda
    w = await fight(t, 0, 0, false);
    await sleep(600);
    const gold = () => t.ev(() => {
      const cv = document.getElementById('scene');
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 200 && d[i + 1] < 235 && d[i + 2] > 110 && d[i + 2] < 165) n++;
      return n;
    });
    // the stars are a few pixels each, too small to count apart from the glow, so the frame's own call is read
    await t.ev(() => { window.__stars = []; const s = Honours.stars; window.__starsFn = s; Honours.stars = n => { window.__stars.push(n); s.call(Honours, n); }; });
    await sleep(600);
    const drawn = await t.ev(() => { Honours.stars = window.__starsFn; return Math.max(-1, ...window.__stars); });
    const worn = await gold();
    await t.ev(() => { Battle.honours = { stars: 0, crowns: 0, glow: true }; });
    await sleep(600);
    const shine = await gold();
    await t.ev(() => { Battle.honours = { stars: 0, crowns: 0, glow: false }; });
    await sleep(600);
    const bare = await gold();
    t.ok('and the knight on the scene is drawn wearing it: stars on the shield and a shining blade', w.stars === 3 && w.glow && drawn === 3 && worn >= shine && shine - bare > 40, JSON.stringify([w, drawn, worn, shine, bare]));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
