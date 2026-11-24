/* The gauntlet.
 *
 * A realm whose every foe is beaten offers its gauntlet on the map: every
 * foe again, first to last, health carried on. These checks run one on a
 * phone with real answers: the map offers it with its purse, the victory
 * card says how far the run has come and leads on to the next foe ahead of
 * every other button, the map keeps its place, a flight from a live fight
 * breaks it off, and a run to the last foe pays every first-clear purse of
 * the realm, with a banner, after which the map offers it no more this
 * sitting. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* The fight already begun, won with three right answers. */
const play = async (t) => {
  await t.ev(() => {
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
    Battle.beastLeft = 0; Battle.wardUp = false; Satchel.n = 0; Boon.open = false; Boon.held = null;
  });
  for (const last of [false, false, true]) {
    await t.ev(last => {
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = last ? 1 : 1e6;
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs;
    }, last).catch(() => null);
    await sleep(1200);
    await t.ev(() => { Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
    await sleep(400);
  }
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return t.ev(() => {
    const $ = id => document.getElementById(id), btns = [...document.querySelectorAll('#resultBody > button')];
    return { step: $('gauntletStep') ? $('gauntletStep').innerText : null, won: $('gauntletWon') ? $('gauntletWon').innerText : null,
      go: $('gauntletGo') ? $('gauntletGo').innerText : null, first: btns.length ? btns[0].id : null,
      run: Gauntlet.run ? Gauntlet.run.i : null, gold: Game.s.gold, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
  });
};
const node = (t) => t.ev(() => {
  UI.go('s-map');
  const d = document.getElementById('gauntletNode-0');
  if (d && d.closest('details')) d.closest('details').open = true;   // a folded realm's text has no breaks to read
  return d ? d.innerText.replace(/\s+/g, ' ') : null;
});
const tap = (t, sel) => t.ev(sel => { document.querySelector(sel).click(); return { fi: Battle.fi, screen: document.querySelector('.screen.on') ? document.querySelector('.screen.on').id : null }; }, sel);

module.exports = {
  name: 'gauntlet',
  title: 'The gauntlet · a realm all beaten runs again back to back for every first-clear purse',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, Elite.CHANCE];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null; Elite.force = null; Elite.CHANCE = 0;
      Treasure.n = 0; Treasure.at = null; Campfire.slips = []; Gauntlet.run = null; Gauntlet.paid = {};
    });
    t.eq('a realm not all beaten offers no gauntlet', await node(t), null);
    await t.ev(() => { for (const k of ['0:0', '0:1', '0:2', '0:3']) Game.s.cleared[k] = 'A'; });
    t.ok('a realm all beaten offers one, with its purse', /Run the gauntlet All 4 foes back to back, health carried on, for 🪙 212/.test(await node(t) || ''), await node(t));

    let s = await tap(t, '#gauntletNode-0');
    t.ok('tapping it starts at the realm\'s first foe', s.fi === 0 && await t.ev(() => !!Gauntlet.run && Gauntlet.run.i === 0), JSON.stringify(s));
    let w = await play(t);
    t.ok('the card says how far the run has come and who is next', /⚔️ Gauntlet: 1 of 4 beaten\. Next, Bramble Goblin\./.test(w.step || ''), JSON.stringify(w));
    t.ok('and leads on to that foe ahead of every other button', w.first === 'gauntletGo' && /On to Bramble Goblin · 2 of 4/.test(w.go || ''), JSON.stringify(w));
    t.ok('on a phone', w.wide);
    s = await tap(t, '#gauntletGo');
    t.eq('which begins it', s.fi, 1);
    w = await play(t);
    t.ok('the second', /2 of 4 beaten\. Next, Thicket Brute/.test(w.step || '') && w.run === 2, JSON.stringify(w));
    t.ok('the map keeps its place', /The gauntlet: 2 of 4 beaten Next, Thicket Brute/.test(await node(t) || ''), await node(t));
    s = await tap(t, '#gauntletNode-0');
    t.eq('and goes on from there', s.fi, 2);
    await t.ev(() => Battle.flee());
    t.ok('a flight from a live fight breaks it off, and the map offers it from the start', await t.ev(() => Gauntlet.run === null) && /Run the gauntlet/.test(await node(t) || ''));

    await tap(t, '#gauntletNode-0');
    for (let i = 0; i < 3; i++) { await play(t); await tap(t, '#gauntletGo'); }
    await t.ev(() => {
      window.__banners = [];
      const b = Celebrate.banner; window.__keepBanner = b;
      Celebrate.banner = function (text) { window.__banners.push(text); return b.apply(this, arguments); };
    });
    w = await play(t);
    const banners = await t.ev(() => { Celebrate.banner = window.__keepBanner; return window.__banners; });
    t.ok('the last foe beaten runs the gauntlet, says so and pays the purse', /⚔️ The gauntlet of Vale of Vectors is run: all 4 foes back to back, \+212 gold\./.test(w.won || '') && w.run === null && !w.go, JSON.stringify(w));
    t.ok('with a banner', banners.includes('GAUNTLET RUN'), JSON.stringify(banners));
    t.eq('and the map offers it no more this sitting', await node(t), null);

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of, Elite.CHANCE] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
