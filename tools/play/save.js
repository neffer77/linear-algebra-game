/* P0 — the save is hard to lose.
 *
 * Every save carries a revision counter, and the backup in IndexedDB is
 * reconciled against localStorage a knight at a time, newest wins. The failure
 * this guards against is silent: a stale backup quietly overwriting a newer
 * save, which nobody notices until a week of play is gone.
 */
'use strict';

module.exports = {
  name: 'save',
  title: 'P0 · the save survives',
  async run(t) {
    await t.newKnight('Referee');

    // --- the revision counter ---
    const rev = await t.ev(() => {
      const before = Game.s.rev;
      Game.save(); const one = Game.s.rev;
      Game.save(); const two = Game.s.rev;
      return { before, one, two };
    });
    t.ok('a save bumps the revision', rev.one === rev.before + 1, JSON.stringify(rev));
    t.ok('every save bumps it again', rev.two === rev.one + 1, JSON.stringify(rev));

    // --- the code format ---
    const codec = await t.ev(() => {
      const k = Profiles.active();
      Game.s.lvl = 9; Game.s.gold = 4321; Game.save();
      const code = Codec.encode({ nm: k.nm, crest: k.crest, col: k.col }, Game.s, Date.now());
      const back = Codec.decode(code);
      return { ver: Codec.VER, tag: Codec.TAG, head: code.slice(0, 4), ok: back.ok,
               lvl: back.ok && back.g.lvl, gold: back.ok && back.g.gold,
               rev: back.ok && back.g.rev, savedRev: Game.s.rev };
    });
    /* The format version. Bump it here ON PURPOSE when the save gains a field,
       and add a case below proving the previous version still reads — those
       two together are the whole backward-compatibility contract. */
    t.eq('the codec is at version 3', codec.ver, 3);
    t.eq('codes are tagged KE3-', codec.head, 'KE3-');
    t.ok('a knight round-trips through a code', codec.ok && codec.lvl === 9 && codec.gold === 4321,
      JSON.stringify(codec));
    t.eq('the revision rides along in the code', codec.rev, codec.savedRev);

    // A code from the previous format must still read, or an old QR in
    // somebody's photo roll stops working the day the format moves.
    // The same golden code tools/verify.js pins, checked here in a real
    // browser rather than against the extracted codec.
    const V1 = 'KE1-AFICVDNUDVRJWS4RAKRSXG5DXMVWGYNAPDABMCWANLQDQQBA4AQWWUASOCIKBGACAAAAA'
             + 'CAGAIAAIEAJQCIAQAEABAAIACAAQANYAACA6DQAAAENESJESJESJESJESJAAGNKAAJEBSBJIA'
             + 'BEQENDVAAESAIVEUAASIAFD2QACJAM6MKAAJEBB25IABEQCMKFAAESAAR4UAASIDEXCQACJAI'
             + '4ZKAAJEARUNIABEQALQVAAESAYOWUAASICEKCQACJAE3GKAAJEABOBIABEQGKWVAAESAR6WUA'
             + 'ASIBD5KQACJAAZSKAAJEBRHVIABEQEJ5FAAESAJ3OUAAQNCF';
    const v1 = await t.ev(code => {
      const d = Codec.decode(code);
      return { ok: d.ok, why: d.why, rev: d.ok ? d.g.rev : null, lvl: d.ok ? d.g.lvl : null,
               mats: d.ok ? d.g.mats : null, runes: d.ok ? d.g.runes : null };
    }, V1);
    t.ok('a version 1 code still decodes — an old QR must not stop working', v1.ok, v1.why);
    t.eq('it reads as revision zero, from before the counter existed', v1.rev, 0);
    t.eq('and its knight comes back intact', v1.lvl, 7);
    /* Everything added since v1 has to read as empty rather than as garbage.
       This is what proves the version gate around the newer fields works: the
       decoder must not try to read materials off the end of an older code. */
    t.ok('a knight from before materials arrives with empty pockets, not garbage',
      v1.mats && v1.mats.ore === 0 && v1.mats.essence === 0, JSON.stringify(v1.mats));
    t.ok('and wearing no runes', v1.runes && Object.keys(v1.runes).length === 0,
      JSON.stringify(v1.runes));

    /* --- the referee: newest wins, per knight ---
       The vault mirrors localStorage wholesale, so a doctored backup is planted
       by writing the state we want backed up, flushing, and then editing
       localStorage underneath it. That is exactly the shape of the real hazard:
       a device whose backup and live save have drifted apart. */
    const ref = await t.ev(async () => {
      const slot = Profiles.activeKey(), out = {};
      const put = (gold, rev) => {
        const g = JSON.parse(localStorage.getItem(slot));
        g.gold = gold; g.rev = rev;
        localStorage.setItem(slot, JSON.stringify(g));
      };

      // back up a NEWER state, then wind the live save back
      put(999, 90); await Vault.writeNow();
      put(100, 40);
      await Vault.recover(); Game.load();
      out.newerBackupWins = Game.s.gold;

      // back up an OLDER state, then move the live save on past it
      put(7, 1); await Vault.writeNow();
      put(250, 80);
      await Vault.recover(); Game.load();
      out.olderBackupIgnored = Game.s.gold;

      // equal revisions are a tie the live save keeps — a backup has to be
      // strictly newer to win, or a re-mirror could flap between two copies
      put(11, 55); await Vault.writeNow();
      put(22, 55);
      await Vault.recover(); Game.load();
      out.tieKeepsLive = Game.s.gold;
      return out;
    });
    t.eq('a newer backup is restored over the live save', ref.newerBackupWins, 999);
    t.eq('an older backup never clobbers a newer save', ref.olderBackupIgnored, 250);
    t.eq('an equal revision leaves the live save alone', ref.tieKeepsLive, 22);

    // --- a wiped browser is recovered from the backup ---
    const wiped = await t.ev(async () => {
      Game.s.gold = 5150; Game.save();
      await Vault.writeNow();
      localStorage.removeItem(Profiles.activeKey());
      localStorage.removeItem('eigenrealm.knights');
      const back = await Vault.recover();
      Profiles.load();
      const loaded = Game.load();
      return { back, loaded, gold: Game.s && Game.s.gold, knights: Profiles.list().length };
    });
    t.ok('a cleared browser is restored from the backup', wiped.back === true, JSON.stringify(wiped));
    t.ok('the knight comes back with their gold', wiped.loaded && wiped.gold === 5150,
      JSON.stringify(wiped));
    t.ok('and is on the roster again', wiped.knights >= 1, JSON.stringify(wiped));
  }
};
