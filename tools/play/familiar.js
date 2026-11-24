/* A familiar.
 *
 * Twenty right answers in campaign fights in a sitting hatch an egg. The
 * streak line counts the egg; the twentieth right answer hatches it, said
 * with a banner, and the streak line shows the familiar. From then on a right
 * answer mends a little health, never past full. The streak line still fits a
 * phone. These checks answer real questions in a real fight on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* One right answer, struck softly so the foe stands: what it left. */
const right = (t, hp) => t.ev(hp => {
  if (hp != null) Game.s.hp = hp;
  const cs = Combat.strike; Combat.strike = () => 1;
  Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
  Battle.ehp = 1e6;
  Battle.answer(null, Battle.cur.a);
  Combat.strike = cs;
  return { hp: Game.s.hp, max: Game.s.maxHp, n: Familiar.n, hatched: Familiar.hatched(),
    line: document.getElementById('comboTxt').textContent };
}, hp);
const next = async (t) => {
  await sleep(500);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(250);
};

module.exports = {
  name: 'familiar',
  title: 'A familiar · twenty right answers in a sitting hatch an egg, and the familiar mends a little health on each right answer',
  viewport: { width: 390, height: 844 },
  familiar: true,
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Celebrate.banner];
      Bounty.bump = () => {}; Bounty.claim = () => {};
      window.__banners = [];
      const banner = Celebrate.banner;
      Celebrate.banner = function (text, sub) { window.__banners.push(text + ' · ' + (sub || '')); return banner.apply(this, arguments); };
      Prefs.d.motion = false; Prefs.d.lessons = false;
      Elite.force = null;
      const odds = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
      Elite.CHANCE = odds;
      Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40;
      Battle.beastLeft = 0; Battle.wardUp = false;
    });

    let s;
    for (let i = 1; i < 20; i++) { s = await right(t, 1000); await next(t); }
    s = await t.ev(() => ({ n: Familiar.n, hatched: Familiar.hatched(), line: document.getElementById('comboTxt').textContent }));
    t.ok('the streak line counts the egg toward twenty', s.n === 19 && !s.hatched && s.line.includes('🥚 19/20'), JSON.stringify(s));
    s = await right(t, 600);
    const told = await t.ev(() => window.__banners.some(b => b.startsWith('THE EGG HATCHES') && !!Familiar.kind && b.includes(Familiar.kind.nm)));
    t.ok('the twentieth right answer hatches it, with a banner', s.hatched && s.n === 20 && told, JSON.stringify(s));
    t.ok('and mends nothing as it hatches', s.hp === 600, JSON.stringify(s));
    await next(t);
    s = await t.ev(() => ({ line: document.getElementById('comboTxt').textContent, ic: Familiar.kind.ic,
      wide: document.getElementById('s-battle').scrollWidth <= innerWidth + 1 }));
    t.ok('the streak line shows the familiar', s.line.includes(s.ic + ' mending') && !s.line.includes('🥚'), JSON.stringify(s));
    t.ok('and still fits a phone', s.wide, JSON.stringify(s));
    s = await right(t, 600);
    t.ok('a right answer after it mends a little health', s.hp === 630, JSON.stringify(s));
    await next(t);
    s = await right(t, 990);
    t.ok('never past full', s.hp === 1000, JSON.stringify(s));
    await next(t);
    s = await t.ev(() => {
      Game.s.hp = 500;
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = 1e6;
      const wrong = Battle.cur.choices.find(c => c !== Battle.cur.a);
      Battle.answer(null, wrong);
      Combat.strike = cs;
      return { hp: Game.s.hp, n: Familiar.n };
    });
    t.ok('a miss mends nothing and is not counted', s.hp <= 500 && s.n === 22, JSON.stringify(s));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Celebrate.banner] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
