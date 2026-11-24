/* Topics.
 *
 * Each realm's heading on the map named every one of its topics, up to
 * twenty-six, so the closed realms below the one being worked through were a
 * wall of small print. A closed realm now names its first three and says how
 * many more; opened, it names them all. These checks read the map on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => [...document.querySelectorAll('#mapList details.realm')].map(d => {
  const s = d.querySelector('summary'), line = s.querySelector('.rtopics');
  const ri = +d.id.split('-')[1];
  return { id: d.id, open: d.open, text: line.innerText, h: s.getBoundingClientRect().height, lh: line.getBoundingClientRect().height,
    labels: REALMS[ri].pool.map(k => TOPIC_LABEL[k]), wide: line.scrollWidth <= line.clientWidth + 1 };
}));

module.exports = {
  name: 'topics',
  title: 'Topics · a closed realm on the map names its first three topics and counts the rest; opened, it names them all',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { UI.go('s-map'); UI.renderMap(); });
    await sleep(300);
    let rs = await read(t);
    const shut = rs.filter(r => !r.open && r.labels.length > 3);
    t.ok('the map still has every realm, the first one open', rs.length >= 8 && rs[0].open && shut.length >= 5, JSON.stringify(rs.map(r => [r.id, r.open, r.labels.length])));
    t.ok('a closed realm names its first three topics and says how many more', shut.every(r => r.text === r.labels.slice(0, 3).join(' · ') + ' · and ' + (r.labels.length - 3) + ' more'),
      JSON.stringify(shut.map(r => r.text)));
    t.ok('so its heading takes two short lines at most, however many topics it has', shut.every(r => r.lh <= 40 && r.wide), JSON.stringify(shut.map(r => [r.id, r.labels.length, r.lh])));
    const open0 = rs[0];
    t.ok('the realm being worked through names every topic', open0.text === open0.labels.join(' · '), open0.text);

    // open the longest closed realm: every topic, in order, and no count
    const big = shut.reduce((a, b) => (b.labels.length > a.labels.length ? b : a));
    await t.ev(id => { document.getElementById(id).open = true; }, big.id);
    await sleep(200);
    rs = await read(t);
    const o = rs.find(r => r.id === big.id);
    t.ok('opened, a realm names all its topics in order, and the count goes', o.open && o.text === o.labels.join(' · ') && !/more$/.test(o.text) && o.lh > big.lh, JSON.stringify([o.text, big.lh, o.lh]));
    await t.ev(id => { document.getElementById(id).open = false; }, big.id);
    await sleep(200);
    rs = await read(t);
    t.ok('closed again, it counts them again', rs.find(r => r.id === big.id).text === big.text, rs.find(r => r.id === big.id).text);

    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
