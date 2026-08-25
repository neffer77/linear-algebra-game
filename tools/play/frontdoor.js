/* P5 — a cold player can finish a first run.
 *
 * Driven through the buttons a real player touches, at 320px, from a blank
 * browser: no knight, no save, nothing seeded. This is the one suite that must
 * not shortcut through internals, because what it is testing IS the path.
 */
'use strict';

const { sleep } = require('./harness');

module.exports = {
  name: 'frontdoor',
  title: 'P5 · a stranger can play',
  viewport: { width: 320, height: 720 },
  async run(t) {
    // --- the cold title ---
    t.eq('a cold start lands on the title', await t.screen(), 's-title');
    const cold = await t.ev(() => ({
      begin: document.getElementById('btnBegin').textContent.trim(),
      beginIsPrimary: document.getElementById('btnBegin').className.includes('gold'),
      continueShown: document.getElementById('btnContinue').style.display !== 'none'
    }));
    t.ok('it offers Begin as the primary action', /Begin the Quest/.test(cold.begin) && cold.beginIsPrimary,
      JSON.stringify(cold));
    t.ok('and hides Continue, since there is nothing to continue', !cold.continueShown);

    // --- Begin opens the tale, not the map ---
    await t.tap('btnBegin');
    t.eq('Begin opens the tale', await t.screen(), 's-opening');

    let cards = 0;
    for (let i = 0; i < 6 && await t.showing('openNext'); i++) {
      cards++;
      const last = /Take up the blade/.test(await t.text());
      await t.tap('openNext');
      await sleep(120);
      if (last) break;
    }
    t.eq('the tale is three cards', cards, 3);
    t.eq('and is remembered as read', await t.ev(() => Game.s.seenOpening), 1);

    // --- the quartermaster ---
    t.eq('the quartermaster is waiting', await t.screen(), 's-opening');
    t.ok('she is who sends you down', /quartermaster/i.test(await t.text()));
    t.ok('there is a way down', await t.showing('qmGo'));
    await t.tap('qmGo');
    await sleep(300);

    // --- the fight verb is taught before the first fight ---
    t.ok('the fight verb introduces itself', /Something is in the way/.test(await t.text()));
    await t.passIntro();
    await sleep(300);

    t.eq('room one is a fight', await t.screen(), 's-battle');
    const cellar = await t.ev(() => ({ setting: Dungeon.run.setting,
      hp: Battle.emax, atk: Battle.foe.atk, canDie: SETTINGS[Dungeon.run.setting].canDie }));
    t.eq('and it is in the cellar', cellar.setting, 'cellar');
    t.ok('whose foes are gentle', cellar.hp <= 40 && cellar.atk <= 7, JSON.stringify(cellar));
    t.ok('and which cannot kill you', cellar.canDie === false);

    await t.winFight();
    await sleep(600);
    t.eq('clearing room one reaches a fork', await t.screen(), 's-result');

    // --- room two: the guaranteed chest ---
    await t.tapText(/Press on/);
    await sleep(300);
    const lockIntro = await t.showing('introGo');
    t.ok('the lock verb introduces itself before the first chest',
      lockIntro && /A locked chest/.test(await t.text()));
    await t.passIntro();
    t.eq('room two is the chest', await t.screen(), 's-lock');
    if (await t.showing('lockStudied')) await t.tap('lockStudied');
    await t.ev(() => {
      const b = document.querySelector('#lockChoices .choice[data-correct="1"]'); if (b) b.click();
    });
    await sleep(300);
    await t.tap('lockGo');
    await sleep(400);

    // --- room three, and the run ends itself ---
    await t.tapText(/Press on/);
    await sleep(400);
    await t.passIntro();
    await t.winFight();
    await sleep(800);

    t.eq('the run ends on its own after three rooms', await t.screen(), 's-result');
    t.ok('and walks you back up the stairs', /Back up the stairs/.test(await t.text()));
    const done = await t.ev(() => ({ firstRun: Game.s.firstRun, run: Game.s.run,
      gold: Game.s.gold, active: Dungeon.active, met: Game.s.metRoom }));
    t.ok('the haul is banked and the run closed',
      done.run === null && done.active === false && done.gold > 0, JSON.stringify(done));
    t.eq('the cellar is recorded as finished', done.firstRun, 1);
    t.ok('and both verbs are marked met', !!done.met.monster && !!done.met.lock, JSON.stringify(done.met));

    // --- the title now knows this knight ---
    await t.ev(() => { UI.go('s-title'); UI.refreshTitle(); });
    const keep = await t.ev(() => ({
      cont: document.getElementById('btnContinue').innerText.trim(),
      shown: document.getElementById('btnContinue').style.display !== 'none',
      state: document.getElementById('titleState').innerText.trim() }));
    t.ok('the title shows the Keep state',
      keep.shown && /Continue as/.test(keep.cont) && /Level/.test(keep.state), JSON.stringify(keep));

    // --- and the mid-descent state, which has to say what is at stake ---
    const mid = await t.ev(() => {
      Dungeon.descend('deep');
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: { gold: 77, xp: 10 } });
      UI.go('s-title'); UI.refreshTitle();
      Knights.carry(Profiles.r.active);                  // must refuse, mid-run
      return { cont: document.getElementById('btnContinue').innerText.trim(),
               state: document.getElementById('titleState').innerText.trim(),
               codeBoxOpen: document.getElementById('codeBox').classList.contains('on') };
    });
    t.ok('the title leads with the room you are parked in',
      /Return to/.test(mid.cont) && /room 2/.test(mid.cont), JSON.stringify(mid));
    t.ok('and names the gold riding on it', /77 gold/.test(mid.state), mid.state);
    t.ok('carrying a knight refuses mid-descent — a code cannot take the run with it',
      mid.codeBoxOpen === false);
  }
};
