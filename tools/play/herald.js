/* The herald.
 *
 * A realm's boss is announced as its fight opens: its name across the screen
 * in its own colour and a line of its own mathematics under it. A foe that is
 * not a boss opens with no herald. These checks open real fights on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* Open a campaign fight and catch what is announced as it opens. */
const open = async (t, ri, fi) => {
  await t.ev(() => { Battle.flee(); Elite.force = null; window.__e = Elite.CHANCE; Elite.CHANCE = 0; window.__said = [];
    const b = Celebrate.banner; window.__b = b;
    Celebrate.banner = function (text, sub, colour, sound) { window.__said.push({ text, sub, colour }); return b.call(Celebrate, text, sub, colour, sound); }; }).catch(() => null);
  await t.ev(([ri, fi]) => { Battle.begin(ri, fi); }, [ri, fi]);
  await sleep(250);
  return t.ev(() => {
    Celebrate.banner = window.__b; Elite.CHANCE = window.__e;
    const el = document.getElementById('bigBanner'), r = el.getBoundingClientRect();
    return { said: window.__said.filter(s => /👑/.test(s.text)), on: el.classList.contains('on'), seen: el.innerText,
      inside: r.left >= -1 && r.right <= innerWidth + 1, colour: el.querySelector('.bnr') ? el.querySelector('.bnr').style.getPropertyValue('--bc') : '',
      foe: Battle.foe && Battle.foe.nm, screen: document.querySelector('.screen.on') && document.querySelector('.screen.on').id };
  });
};

module.exports = {
  name: 'herald',
  title: "The herald · a realm's boss arrives announced, its name across the screen and a line of its own mathematics",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Prefs.d.motion = true; Prefs.d.lessons = false; });

    const foe = await open(t, 0, 0);
    t.ok('a realm\'s first foe opens with no herald', foe.said.length === 0 && foe.foe === 'Meadow Slime' && !/👑/.test(foe.seen), JSON.stringify(foe));
    await sleep(1500);

    const boss = await open(t, 0, 3);
    t.ok('the Vector Wyrm is announced by name in its own colour as its fight opens',
      boss.said.length === 1 && boss.said[0].text === '👑 THE VECTOR WYRM' && boss.said[0].colour === '#39c47a' && boss.foe === 'The Vector Wyrm', JSON.stringify(boss));
    t.ok('the line under its name says what it is', boss.said[0] && boss.said[0].sub === 'its coils point every way and add up to nowhere', JSON.stringify(boss.said));
    t.ok('the banner is up, fits the phone and shows the name and the line', boss.on && boss.inside && /THE VECTOR WYRM/.test(boss.seen) && /add up to nowhere/.test(boss.seen) && /39c47a/i.test(boss.colour), JSON.stringify(boss));
    await sleep(1500);

    const far = await open(t, 4, 3);
    t.ok('a later realm\'s boss is announced with its own line', far.said.length === 1 && far.said[0].text === '👑 THE EIGEN DRAGON' && /its own lines/.test(far.said[0].sub), JSON.stringify(far));

    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
