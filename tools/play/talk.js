/* Foes that talk.
 *
 * A fight is a duel, and a duel is better with someone on the other side.
 * Each foe now says a line as the fight opens, gloats now and then when its
 * blow lands, is stung by a crit, worries when the knight's streak reaches
 * five, begs once when nearly beaten, and has last words. The eight realm
 * bosses speak in their own voice, about their own mathematics.
 *
 * These checks pin down the shape of that: every kind of foe in the game has
 * a line for every moment, and every boss its own; each moment is said when
 * it should be and the once-only ones only once; the bubble fits on a phone,
 * is hidden from screen readers and goes away by itself; the daily's straw
 * knight says nothing, and talking never moves the seeded draw that keeps the
 * daily the same for everyone; a new fight starts quiet; nothing is saved.
 */
'use strict';

const { sleep } = require('./harness');

const MOMENTS = ['meet', 'gloat', 'reel', 'worry', 'low', 'fall'];

/* Stand a fight up against one foe, with a knight who cannot fall. */
function fight(t, ri, fi) {
  return t.ev(([ri, fi]) => {
    Battle.flee();
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Talk.ODDS = { gloat: 1, reel: 1 };
    Battle.begin(ri, fi);
    Game.s.maxHp = Game.s.hp = 99999;
    const el = document.getElementById('say');
    return { text: el.textContent, on: el.classList.contains('on'), boss: el.classList.contains('boss'),
             nm: Battle.foe.nm, art: Battle.foe.art };
  }, [ri, fi]);
}
const bubble = t => t.ev(() => {
  const el = document.getElementById('say');
  return { text: el.textContent, on: el.classList.contains('on') };
});
const answer = (t, right, crit) => t.ev(([right, crit]) => {
  const ws = Battle.wStats;
  if (crit !== undefined) Battle.wStats = () => Object.assign(ws.call(Battle), { crit: crit ? 9 : -9 });
  Battle.answered = false;
  const c = Battle.cur;
  Battle.answer(null, right ? c.a : c.choices.find(x => x !== c.a));
  Battle.wStats = ws;
  document.getElementById('say').classList.remove('on');   // so the next check sees only what comes next
  return document.getElementById('say').dataset.last || '';
}, [right, crit]);

module.exports = {
  name: 'talk',
  title: 'Foes that talk · an opening line, gloats, worries and last words',
  viewport: { width: 320, height: 640 },
  async run(t) {
    await t.newKnight('Ada');
    await t.ev(() => {
      // Record each line as it is said, since the bubble is cleared between checks.
      const say = Talk.say.bind(Talk);
      Talk.say = (m, once) => { const r = say(m, once); if (r) document.getElementById('say').dataset.last = m + ':' + r; return r; };
    });

    // --- every foe has something to say at every moment ---
    const cover = await t.ev(MOMENTS => {
      const arts = new Set(), bosses = [];
      for (const r of REALMS) for (const f of r.foes) { arts.add(f.art); if (f.boss) bosses.push(f.nm); }
      const gaps = [];
      for (const a of arts) for (const m of MOMENTS)
        if (!(Talk.ART[a] && Talk.ART[a][m] && Talk.ART[a][m].length)) gaps.push(a + ':' + m);
      for (const b of bosses) for (const m of ['meet', 'low', 'fall'])
        if (!(Talk.BOSS[b] && Talk.BOSS[b][m])) gaps.push(b + ':' + m);
      const all = [...Object.values(Talk.ART).flatMap(o => Object.values(o).flat()),
                   ...Object.values(Talk.BOSS).flatMap(o => Object.values(o))];
      return { gaps, arts: arts.size, bosses: bosses.length, long: all.filter(s => s.length > 44) };
    }, MOMENTS);
    t.eq('every kind of foe has a line for every moment', cover.gaps, []);
    t.eq('and all eight bosses have their own', cover.bosses, 8);
    t.eq('no line is too long for the bubble', cover.long, []);

    // --- the fight opens with a word from the foe ---
    const slime = await fight(t, 0, 0);
    t.ok('a foe speaks as the fight opens', slime.on && slime.text.length > 0, JSON.stringify(slime));
    t.ok('in its own kind of voice', (await t.ev(() => Talk.ART.slime.meet)).includes(slime.text), slime.text);
    t.ok('and an ordinary foe is not dressed as a boss', !slime.boss);
    const a11y = await t.ev(() => document.getElementById('say').getAttribute('aria-hidden'));
    t.eq('the bubble is hidden from screen readers, who have the verdict', a11y, 'true');
    const fits = await t.ev(() => {
      // Measured with the longest line any foe says, not the one it happened to pick.
      const el = document.getElementById('say'), was = el.textContent;
      const all = [...Object.values(Talk.ART).flatMap(o => Object.values(o).flat()),
                   ...Object.values(Talk.BOSS).flatMap(o => Object.values(o))];
      el.textContent = all.reduce((a, b) => b.length > a.length ? b : a);
      const b = el.getBoundingClientRect(), w = document.getElementById('sceneWrap').getBoundingClientRect();
      el.textContent = was;
      return b.left >= w.left - 1 && b.right <= w.right + 1 && b.top >= w.top - 1 && b.bottom <= w.bottom + 1;
    });
    t.ok('and fits inside the scene on a 320px phone, even at its longest', fits);
    await sleep(2900);
    t.ok('and goes away by itself', !(await bubble(t)).on);

    const wyrm = await fight(t, 0, 3);
    t.ok('a boss opens with its own line', wyrm.boss && wyrm.text === 'I have magnitude AND direction.', JSON.stringify(wyrm));

    // --- a blow lands: the foe gloats about the blow ---
    await fight(t, 0, 1);
    t.ok('when its blow lands, the foe gloats', /^gloat:/.test(await answer(t, false)));
    const echo = await t.ev(() => {
      const f = document.querySelector('#explain .foesay');
      return f ? { text: f.innerText, hidden: f.getAttribute('aria-hidden'), said: Talk.turn && Talk.turn.text } : null;
    });
    t.ok('and the verdict, where a phone scrolls to, repeats what it said',
      echo && echo.text.includes(echo.said) && echo.text.includes('Bramble Goblin'), JSON.stringify(echo));
    t.eq('again hidden from screen readers', echo && echo.hidden, 'true');
    await fight(t, 0, 2);
    const first = await t.ev(() => {
      Talk.ODDS.gloat = 0;
      Battle.answered = false;
      Battle.answer(null, Battle.cur.choices.find(x => x !== Battle.cur.a));
      Talk.ODDS.gloat = 1;
      return !!document.querySelector('#explain .foesay');
    });
    t.ok('the opening line is not carried into the first verdict', !first);

    // --- a crit stings ---
    await fight(t, 0, 1);
    await t.ev(() => { Battle.ehp = Battle.emax = 1e6; });
    t.ok('a crit draws a cry', /^reel:/.test(await answer(t, true, true)));
    t.eq('an ordinary hit draws none', await (async () => {
      await t.ev(() => { document.getElementById('say').dataset.last = ''; });
      return answer(t, true, false);
    })(), '');
    t.ok("and its verdict carries no line left over from the last turn",
      !(await t.ev(() => !!document.querySelector('#explain .foesay'))));

    // --- a streak of five worries it, once ---
    const worry = await t.ev(() => {
      Battle.ehp = Battle.emax = 1e6; Battle.combo = 3;
      const said = [];
      const ws = Battle.wStats;
      Battle.wStats = () => Object.assign(ws.call(Battle), { crit: -9 });
      for (let i = 0; i < 4; i++) {
        document.getElementById('say').dataset.last = '';
        Battle.answered = false;
        Battle.answer(null, Battle.cur.a);
        said.push(document.getElementById('say').dataset.last || '');
      }
      Battle.wStats = ws;
      return { said, combo: Battle.combo };
    });
    t.ok('a streak of five makes the foe worry', worry.said[1].startsWith('worry:'), JSON.stringify(worry));
    t.ok('and only the once', worry.said.filter(s => s.startsWith('worry:')).length === 1, JSON.stringify(worry));

    // --- nearly beaten: it begs, once ---
    const low = await t.ev(() => {
      Battle.emax = 1000; Battle.ehp = 300; Battle.combo = 0; Talk.said = {};
      const said = [];
      for (let i = 0; i < 3; i++) {
        document.getElementById('say').dataset.last = '';
        Battle.answered = false;
        const ws = Battle.wStats; Battle.wStats = () => ({ dmg: 1, crit: -9 });
        Battle.answer(null, Battle.cur.a);
        Battle.wStats = ws;
        said.push(document.getElementById('say').dataset.last || '');
      }
      return said;
    });
    t.ok('nearly beaten, the foe begs', low[0].startsWith('low:'), JSON.stringify(low));
    t.ok('and does not beg twice', low.filter(s => s.startsWith('low:')).length === 1, JSON.stringify(low));

    // --- and has last words ---
    const fall = await t.ev(() => {
      document.getElementById('say').dataset.last = '';
      Battle.ehp = 1; Battle.answered = false;
      Battle.answer(null, Battle.cur.a);
      return { last: document.getElementById('say').dataset.last, ehp: Battle.ehp };
    });
    t.ok('the killing blow draws last words', fall.ehp === 0 && /^fall:/.test(fall.last), JSON.stringify(fall));

    // --- a new fight starts quiet ---
    const fresh = await t.ev(() => { Battle.flee(); Battle.begin(0, 1); return { said: Talk.said }; });
    t.eq('a new fight forgets what the last one said', fresh.said, {});

    // --- the daily's straw knight says nothing, and talk never moves the draw ---
    const daily = await t.ev(() => {
      Battle.flee();
      Daily.start();
      const quiet = !document.getElementById('say').classList.contains('on') && Talk.say('gloat') === null;
      Battle.flee(); R.unseed();
      R.seed(12345); const a = [R.pick([...Array(1000).keys()]), R.chance(0.5)];
      R.seed(12345); Battle.foe = REALMS[0].foes[0];
      for (const m of ['meet', 'gloat', 'reel', 'low', 'fall']) Talk.say(m);
      const b = [R.pick([...Array(1000).keys()]), R.chance(0.5)];
      R.unseed();
      return { quiet, same: JSON.stringify(a) === JSON.stringify(b) };
    });
    t.ok("the daily's straw knight keeps silent", daily.quiet);
    t.ok('and talking never touches the seeded draw the daily is built on', daily.same);

    // --- nothing is saved ---
    t.ok('none of it is written into the save', await t.ev(() => {
      const save = JSON.stringify(Game.s);
      const all = [...Object.values(Talk.ART).flatMap(o => Object.values(o).flat()),
                   ...Object.values(Talk.BOSS).flatMap(o => Object.values(o))];
      return all.every(line => !save.includes(line));
    }));

    await t.ev(() => { Talk.ODDS = { gloat: 0.5, reel: 0.7 }; Prefs.d.lessons = true; Battle.flee(); UI.go('s-title'); });
  }
};
