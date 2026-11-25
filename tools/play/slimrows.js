/* Beaten fights take one short row.
 *
 * In the realm being worked through, every fight already won kept its full
 * card: health, strike, gold and the reckoning of blows, three lines each,
 * so three of them stood between the realm's heading and the fight still to
 * come. A won fight now takes one short row with its name, its best grade
 * and its gold, still a tap away; the fight still to come keeps its card.
 * These checks read the map on two phones. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  UI.go('s-map'); UI.renderMap();
  const d = document.getElementById('realm-0');
  d.open = true;
  const rows = [...d.querySelectorAll('.node')];
  const sum = d.querySelector('summary').getBoundingClientRect();
  return { rows: rows.map(n => ({ slim: n.classList.contains('slim'), done: n.classList.contains('done'), h: Math.round(n.getBoundingClientRect().height),
    go: n.getAttribute('onclick'), best: (n.querySelector('[data-best]') || {}).dataset ? (n.querySelector('[data-best]') || { dataset: {} }).dataset.best || null : null,
    text: n.innerText.replace(/\s+/g, ' ').trim(), reckon: !!n.querySelector('.reckon') })),
    gap: (() => { const nx = rows.find(n => !n.classList.contains('slim')); return nx ? Math.round(nx.getBoundingClientRect().top - sum.bottom) : null; })(),
    wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'slimrows',
  title: 'Beaten fights take one short row · the fight still to come keeps its card and sits near the realm\'s heading',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const foes = await t.ev(() => { Game.s.firstRun = 1; Game.s.cleared = {}; return REALMS[0].foes.map(f => ({ nm: f.nm, gold: f.gold })); });

    let r = await read(t);
    t.ok('a new knight has no short rows: every fight keeps its card', r.rows.every(x => !x.slim) && r.rows[0].reckon, JSON.stringify(r.rows.map(x => [x.slim, x.h])));
    const full = r.rows[0].h;

    await t.ev(() => { Game.s.cleared = { '0:0': 'S', '0:1': 'B', '0:2': true }; });
    for (const [w, h] of [[390, 844], [320, 640]]) {
      await t.page.setViewportSize({ width: w, height: h });
      await sleep(200);
      r = await read(t);
      t.eq(`${w} wide: the three won fights are short rows, the boss still to come is not`, r.rows.map(x => x.slim), [true, true, true, false]);
      t.ok(`${w} wide: each short row is one line`, r.rows.slice(0, 3).every(x => x.h <= 46), JSON.stringify(r.rows.map(x => x.h)));
      t.ok(`${w} wide: and well under the height of a card`, r.rows.slice(0, 3).every(x => x.h < full * 0.6), JSON.stringify([full, r.rows.map(x => x.h)]));
      t.ok(`${w} wide: nothing runs off the side`, r.wide, 'the page scrolls sideways');
    }
    await t.page.setViewportSize({ width: 390, height: 844 });
    r = await read(t);
    t.eq('each short row keeps its best grade, a won fight with none shows a tick', r.rows.slice(0, 3).map(x => x.best), ['S', 'B', null]);
    t.ok('and names the foe and its gold', r.rows.slice(0, 3).every((x, i) => x.text.startsWith(foes[i].nm) && x.text.includes('🪙 ' + foes[i].gold)) && r.rows[2].text.includes('✓'),
      JSON.stringify(r.rows.map(x => x.text)));
    t.ok('without the health, strike or reckoning of a fight that is over', r.rows.slice(0, 3).every(x => !x.reckon && !/❤️|⚔️|blows fell/.test(x.text)), JSON.stringify(r.rows.map(x => x.text)));
    t.ok('the fight still to come keeps its card and its reckoning', !r.rows[3].slim && r.rows[3].reckon && /❤️/.test(r.rows[3].text), r.rows[3].text);
    t.ok('and sits near the realm\'s heading, under three short rows', r.gap !== null && r.gap < 3 * 50 + 20, String(r.gap));

    // a short row is still a fight
    t.eq('a short row still begins its fight', r.rows[1].go, 'Battle.begin(0,1)');
    await t.ev(() => [...document.querySelectorAll('#realm-0 .node.slim')][1].click());
    await sleep(600);
    const went = { s: await t.screen(), at: await t.ev(() => [Battle.ri, Battle.fi]) };
    t.ok('tapped, it opens that fight', went.s === 's-battle' && went.at.join() === '0,1', JSON.stringify(went));
    await t.ev(() => { Battle.flee(); Game.s.cleared = {}; UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
