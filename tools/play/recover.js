/* Win it back.
 *
 * A miss lets the foe's blow land, and the question after it is one like it.
 * Land that one and half the blow, rounded up, comes back. These checks play
 * a real fight with real answers and fixed blows: a miss offers the blow
 * back under its explanation, the second go wins it back and says so, a
 * second miss or being shown the working lets it go, it never heals past full
 * health, and nothing is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The first realm's first foe, with a knight who cannot fall or level up. */
const fight = (t, hp = 500) => t.ev(hp => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = 1000; Game.s.hp = hp; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.steadyUp = false;
  window.__said = [];
  if (!window.__wrapped) {
    window.__wrapped = true;
    const f = Anim.float;
    Anim.float = function (x, y, text) { (window.__said || []).push(text); return f.apply(this, arguments); };
  }
  return { owed: Battle.recover, recovered: Battle.recovered };
}, hp);
/* Answer the standing question right, wrong, or by being shown the working;
   the knight's blow chips 1 and the foe's lands for the size given. */
const answer = (t, kind, hit = 40) => t.ev(([kind, hit]) => {
  const cs = Combat.strike, fh = Combat.foeHit, wb = Weak.bonus;
  Combat.strike = () => 1; Combat.foeHit = () => hit; Weak.bonus = () => 1;
  Battle.answered = false; Battle.slamNext = false; Battle.charge = 0;
  Battle.shownWork = kind === 'shown';
  window.__said = [];
  const hp0 = Game.s.hp, redo = !!Battle.cur.redo;
  Battle.answer(null, kind === 'right' ? Battle.cur.a : '✗');
  Combat.strike = cs; Combat.foeHit = fh; Weak.bonus = wb;
  const ex = document.getElementById('explain'), line = document.getElementById('recoverLine'), back = document.getElementById('recovered');
  return { hp0, hp: Game.s.hp, redo, owed: Battle.recover, recovered: Battle.recovered,
    line: line ? line.innerText.trim() : null, back: back ? back.innerText.trim() : null,
    ex: ex ? ex.innerText : '', said: window.__said.slice() };
}, [kind, hit]);
/* Continue to the next question. */
const next = async t => {
  await t.ev(() => { window.__q = Battle.cur; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 60 && !(await t.ev(() => Battle.cur !== window.__q && !Battle.answered)); i++) await sleep(150);
  await sleep(200);
};

module.exports = {
  name: 'recover',
  title: 'Win it back · land the question like the one you missed for half the blow back',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());

    let f = await fight(t);
    t.ok('a fight starts owing nothing', f.owed === 0 && f.recovered === 0, JSON.stringify(f));
    let a = await answer(t, 'wrong', 40);
    const blow = a.hp0 - a.hp;
    t.ok('a miss lets the blow land', blow > 0, JSON.stringify(a));
    t.eq('and owes half of it back, rounded up', a.owed, Math.ceil(blow / 2));
    t.ok('the explanation says the next one is like it', /The next one is like it/.test(a.ex), a.ex);
    t.eq('and what landing it wins back', a.line, `❤️ Land it to win back ${Math.ceil(blow / 2)} of that blow.`);
    await next(t);
    t.ok('the next question is the one like it', await t.ev(() => !!Battle.cur.redo));
    a = await answer(t, 'right');
    t.ok('landing it wins the blow back', a.redo && a.hp === a.hp0 + Math.ceil(blow / 2) && a.recovered === Math.ceil(blow / 2), JSON.stringify(a));
    t.ok('the field says so', a.said.includes(`+${Math.ceil(blow / 2)} WON BACK`), a.said.join(' | '));
    t.ok('and so does the explanation', /Got it this time\. The second go landed, and won back ❤️ \d+ of the blow\./.test(a.ex) && a.back === `❤️ ${Math.ceil(blow / 2)}`, a.ex);
    t.eq('and nothing more is owed', a.owed, 0);
    await next(t);
    a = await answer(t, 'right');
    t.ok('a right answer that follows no miss wins nothing back', a.hp === a.hp0 && a.recovered === 0 && !a.said.some(s => /WON BACK/.test(s)) && a.back === null, JSON.stringify(a));

    // an odd blow rounds up
    await next(t);
    a = await answer(t, 'wrong', 7);
    const odd = a.hp0 - a.hp;
    t.eq('an odd blow is owed back rounded up', a.owed, Math.ceil(odd / 2));
    await next(t);
    a = await answer(t, 'right');
    t.eq('and wins back that much', a.hp - a.hp0, Math.ceil(odd / 2));

    // missing the second go too lets it go
    await next(t);
    a = await answer(t, 'wrong', 40);
    await next(t);
    a = await answer(t, 'wrong', 40);
    t.ok('missing the second go owes nothing more and offers nothing', a.redo && a.owed === 0 && a.line === null, JSON.stringify(a));
    await next(t);
    a = await answer(t, 'right');
    t.ok('and the right answer after it wins nothing back', !a.redo && a.hp === a.hp0 && a.recovered === 0, JSON.stringify(a));

    // being shown the working on the second go lets it go
    await next(t);
    a = await answer(t, 'wrong', 40);
    t.ok('a miss owes again', a.owed > 0, JSON.stringify(a));
    await next(t);
    a = await answer(t, 'shown');
    t.ok('being shown the working heals nothing and owes nothing', a.hp === a.hp0 && a.owed === 0, JSON.stringify(a));
    await next(t);
    a = await answer(t, 'right');
    t.ok('so the next right answer wins nothing back', a.hp === a.hp0 && a.recovered === 0, JSON.stringify(a));

    // never past full health
    f = await fight(t, 1000);
    a = await answer(t, 'wrong', 40);
    const owed = a.owed;
    await next(t);
    await t.ev(() => { Game.s.hp = Game.s.maxHp - 3; });
    a = await answer(t, 'right');
    t.ok('winning it back stops at full health', owed > 3 && a.hp === 1000 && a.recovered === 3 && a.back === '❤️ 3', JSON.stringify(a));

    // a new fight forgets a debt
    await fight(t);
    a = await answer(t, 'wrong', 40);
    f = await fight(t);
    t.ok('a new fight owes nothing from the last', f.owed === 0 && f.recovered === 0, JSON.stringify(f));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.ev(() => Battle.flee());
  }
};
