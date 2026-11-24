/* A waymark.
 *
 * The first fights in a realm where nothing has been beaten yet open with
 * the realm's name across the screen in its own colour and a line of its
 * land under it, until a foe of the realm falls. A realm already won in, and
 * a boss, open with none. These checks open real fights on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* Open a campaign fight and catch the waymarks said as it opens. */
const open = async (t, ri, fi) => {
  await t.ev(() => { Battle.flee(); Elite.force = null; window.__e = Elite.CHANCE; Elite.CHANCE = 0; window.__said = [];
    const b = Celebrate.banner; window.__b = b;
    Celebrate.banner = function (text, sub, colour, sound) { window.__said.push({ text, sub, colour }); return b.call(Celebrate, text, sub, colour, sound); }; });
  await t.ev(([ri, fi]) => { Battle.begin(ri, fi); }, [ri, fi]);
  await sleep(250);
  return t.ev(() => {
    Celebrate.banner = window.__b; Elite.CHANCE = window.__e;
    const el = document.getElementById('bigBanner'), r = el.getBoundingClientRect();
    return { said: window.__said.filter(s => /🗺️/.test(s.text)), on: el.classList.contains('on'), seen: el.innerText,
      inside: r.left >= -1 && r.right <= innerWidth + 1, foe: Battle.foe && Battle.foe.nm, screen: document.querySelector('.screen.on').id };
  });
};

module.exports = {
  name: 'waymark',
  title: "A waymark · a realm not yet won in is arrived in, its name across the screen and a line of its land",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Prefs.d.motion = true; Prefs.d.lessons = false; });

    const first = await open(t, 0, 0);
    t.ok('a new knight\'s first fight arrives in the Vale of Vectors by name, in its own colour',
      first.said.length === 1 && first.said[0].text === '🗺️ VALE OF VECTORS' && first.said[0].colour === '#57cc7a' && first.screen === 's-battle', JSON.stringify(first));
    t.ok('with a line of its land under the name, on a banner that fits the phone',
      first.said[0] && /length and a way it points/.test(first.said[0].sub) && first.on && first.inside && /VALE OF VECTORS/.test(first.seen), JSON.stringify(first));
    await sleep(1500);

    await t.ev(() => { Game.s.cleared['0:0'] = true; });
    const again = await open(t, 0, 1);
    t.ok('once a foe of the realm has fallen, its fights open with no waymark', again.said.length === 0, JSON.stringify(again));
    await sleep(1500);

    const far = await open(t, 4, 0);
    t.ok('a realm not yet won in is arrived in with its own line', far.said.length === 1 && far.said[0].text === '🗺️ EIGEN CITADEL' && /walls unturned/.test(far.said[0].sub), JSON.stringify(far));
    await sleep(1500);

    const boss = await open(t, 5, 3);
    t.ok('a boss has its herald, not a waymark', boss.said.length === 0, JSON.stringify(boss));
    await sleep(1500);

    await t.ev(() => { delete Game.s.cleared['0:0']; Battle.flee(); UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
