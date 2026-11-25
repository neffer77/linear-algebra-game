/* Battle grade.
 *
 * A victory over a realm's foe is graded on three marks the fight holds: no
 * answer missed, a streak of five, and over half your health left as the
 * foe falls. Three marks is an S, two an A, one a B, none a C. These checks
 * win real fights with real answers four ways (clean, with a miss, with a
 * miss and low health, and with every mark open), read the letter, the
 * marks and the line that names the next one, and check that the streak line
 * counts that battle alone and that nothing is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The first realm's first foe, with a knight who cannot fall or level up. */
const fight = t => t.ev(() => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  // a full satchel's chest may hold armour, which sets the knight's health anew mid-check
  Satchel.n = 0;
  // and so may a boon's lucky find, or a fat purse change the gold
  Boon.open = false; Boon.held = null;
  // and a familiar hatched by this sitting's twentieth right answer mends a little
  // on each right one, which lifts the knight over half health as the foe falls
  if (typeof Familiar !== 'undefined') { Familiar.n = 0; Familiar.kind = null; }
  window.__banners = [];
  return Battle.foe.nm;
});
/* One answer, right or wrong, that leaves the foe standing; then on to the next question. */
const answer = async (t, right) => {
  await t.ev(right => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    // the step on screen, which a ladder can make other than the question itself
    const st = Battle.step();
    const wrong = (st.choices || []).find(c => c !== st.a);
    Battle.answer(null, right ? st.a : wrong);
    Combat.strike = cs;
  }, right);
  await sleep(900);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
/* The killing blow, with a right answer, then the victory screen and its grade. */
const finish = async (t, hp) => {
  await t.ev(hp => {
    const cb = Celebrate.banner; Celebrate.banner = function (txt) { window.__banners.push(txt); return cb.apply(this, arguments); };
    const cs = Combat.strike; Combat.strike = () => 5;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1;
    Game.s.hp = hp;
    Battle.answer(null, Battle.step().a);
    Combat.strike = cs;
    window.__restore = () => { Celebrate.banner = cb; };
  }, hp);
  await sleep(1400);
  // the map recomputes the knight's health bar from their level, so the health is set again as the foe falls
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(500);
  return t.ev(() => {
    window.__restore();
    const c = document.getElementById('gradeCard');
    return c && { grade: document.getElementById('gradeLet').dataset.grade, letter: document.getElementById('gradeLet').innerText,
      marks: [...c.querySelectorAll('[data-mark]')].map(m => m.dataset.mark + ':' + m.dataset.ok).join(' '),
      next: document.getElementById('gradeNext').innerText,
      streak: (document.getElementById('resultBody').innerText.match(/Longest streak this battle: (\d+)/) || [])[1],
      banners: window.__banners.join('|'), text: document.getElementById('resultBody').innerText };
  });
};

module.exports = {
  name: 'grade',
  title: 'Battle grade · S to C on every victory, from three marks the fight holds',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Game.s.stats.best = 22; });

    // clean, hale, and a streak of five: an S
    await fight(t);
    for (let i = 0; i < 4; i++) await answer(t, true);
    let g = await finish(t, 1000);
    t.ok('a victory shows its grade', !!g && /BATTLE GRADE\nS/.test(g.text), g && g.text.slice(0, 400));
    t.eq('no miss, a streak of five and full health is an S', g && [g.grade, g.letter], ['S', 'S']);
    t.eq('with all three marks ticked', g && g.marks, 'clean:1 streak:1 hale:1');
    t.eq('and the line says so', g && g.next, 'All three marks: the top grade.');
    t.ok('an S gets its banner', g && g.banners.includes('S GRADE'), g && g.banners);
    t.eq('the streak line counts this battle, not the best of the save', g && g.streak, '5');
    t.ok('the grade sits in the victory panel, above the way on', await t.ev(() => {
      const p = document.getElementById('gradeCard'); return !!p && !!p.closest('.panel') && p.closest('.panel').innerText.includes('Victory!'); }));
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));

    // one miss: an A that names the open mark
    await fight(t);
    await answer(t, false);
    for (let i = 0; i < 4; i++) await answer(t, true);
    g = await finish(t, 1000);
    t.eq('a miss drops it to an A', g && g.grade, 'A');
    t.eq('with the miss left open', g && g.marks, 'clean:0 streak:1 hale:1');
    t.eq('and the open mark named', g && g.next, 'Win with no answer missed as well for an S.');
    t.ok('an A gets no banner', g && !g.banners.includes('S GRADE'), g && g.banners);

    // a miss and low health: a B
    await fight(t);
    await answer(t, false);
    for (let i = 0; i < 4; i++) await answer(t, true);
    g = await finish(t, 400);
    t.eq('a miss and under half health is a B', g && [g.grade, g.marks], ['B', 'clean:0 streak:1 hale:0']);
    t.eq('the first open mark is named', g && g.next, 'Win with no answer missed as well for an A.');

    // a miss, no streak, and half health exactly: a C
    await fight(t);
    await answer(t, true); await answer(t, false); await answer(t, true);
    g = await finish(t, 500);
    t.eq('every mark open is a C', g && [g.grade, g.marks], ['C', 'clean:0 streak:0 hale:0']);
    t.eq('and the streak line counts two', g && g.streak, '2');

    t.eq('the save keeps its own best streak', await t.ev(() => Game.s.stats.best), 22);
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => UI.go('s-title'));
  }
};
