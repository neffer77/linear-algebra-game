/* S1 — the loadout frame.
 *
 * The claim the whole game rests on is that learning the mathematics makes you
 * stronger. Until now that was true only indirectly, through gold. A skill
 * ability makes it literal: how many times you can use one is read off how well
 * you know the branch of mathematics behind it, and it refills every fight.
 *
 * The rule that keeps it from being a shortcut — no ability may reduce the
 * number of questions in a fight — is asserted here too, because it is the one
 * that a future ability is most likely to break.
 */
'use strict';

module.exports = {
  name: 'skills',
  title: 'S1 · knowing the maths is the power',
  async run(t) {
    await t.newKnight('Adept');

    const r = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      const ward = Loadout.byId('ward');

      out.slots = Loadout.SLOTS;
      out.abilityCount = SKILL_ABILITIES.length;
      out.startsCarrying = (Game.s.loadout || []).length;

      // --- charges are the mastery bands, and nothing else ---
      Game.s.topicStats = {};
      out.unknown = { n: Loadout.charges(ward), band: Loadout.band(ward) };
      setStrand('Vectors', 0.45); out.shaky = { n: Loadout.charges(ward), band: Loadout.band(ward) };
      setStrand('Vectors', 0.70); out.steady = { n: Loadout.charges(ward), band: Loadout.band(ward) };
      setStrand('Vectors', 0.95); out.solid = { n: Loadout.charges(ward), band: Loadout.band(ward) };

      // a skill fades with the mathematics it is made of
      const s = STRANDS.find(x => x[0] === 'Vectors');
      s[1].forEach(k => Game.s.topicStats[k].t = Date.now() - 90 * 864e5);
      out.faded = { n: Loadout.charges(ward), band: Loadout.band(ward) };

      // every ability names a strand that actually exists
      out.strandsResolve = SKILL_ABILITIES.every(a => Loadout.topicsOf(a).length > 0);

      // --- the slots ---
      Game.s.loadout = [];
      Loadout.toggle('ward'); Loadout.toggle('sight'); Loadout.toggle('steady');
      out.three = Game.s.loadout.slice();
      Loadout.toggle('ward');
      out.afterDrop = Game.s.loadout.slice();
      Loadout.toggle('ward');
      Loadout.toggle('sight');                 // a fourth evicts the oldest
      out.neverOverfilled = Game.s.loadout.length <= Loadout.SLOTS;
      return out;
    });

    t.eq('three slots', r.slots, 3);
    t.ok('a new knight starts carrying a full set', r.startsCarrying === 3, String(r.startsCarrying));
    t.ok('every ability draws on a real strand', r.strandsResolve);

    t.ok('an unknown skill grants nothing', r.unknown.n === 0 && r.unknown.band === 'weak',
      JSON.stringify(r.unknown));
    t.ok('shaky grants one', r.shaky.n === 1, JSON.stringify(r.shaky));
    t.ok('steady grants two', r.steady.n === 2, JSON.stringify(r.steady));
    t.ok('solid grants three', r.solid.n === 3, JSON.stringify(r.solid));
    t.ok('and a skill left to go cold grants fewer again',
      r.faded.n < r.solid.n, JSON.stringify(r.faded));

    t.eq('carrying three fills the loadout', r.three.length, 3);
    t.eq('tapping a carried ability drops it', r.afterDrop.length, 2);
    t.ok('and the loadout never overfills', r.neverOverfilled);

    // --- in a fight: charges are per fight, and spend correctly ---
    const fight = await t.ev(() => {
      const out = {};
      const setStrand = (name, m) => {
        const s = STRANDS.find(x => x[0] === name);
        s[1].forEach(k => Game.s.topicStats[k] = {
          c: 20, w: 2, m, seen: 12, last: Game.s.qCount, t: Date.now() });
      };
      Game.s.topicStats = {};
      setStrand('Vectors', 0.95);              // solid: three Wards
      Game.s.loadout = ['ward'];
      Game.s.metRoom = { monster: 1, lock: 1 };
      Dungeon.descend('cellar');
      out.atStart = Battle.skillLeft.ward;

      Battle.useSkill('ward');
      out.afterUse = Battle.skillLeft.ward;
      out.wardRaised = Battle.wardUp;

      // a raised ward halves the next blow and is spent doing it
      const full = Combat.foeHit(40, 0, 1);
      const warded = Battle.spendWard(full);
      out.full = full; out.warded = warded; out.wardSpent = !Battle.wardUp;
      // and does nothing when not raised
      out.unwarded = Battle.spendWard(full);

      // A fresh fight restores them — knowledge cannot be used up. The cellar's
      // second room is the chest, so step to the third, which is a fight again.
      Dungeon.nextRoom();
      out.roomTwoIsNotAFight = document.querySelector('.screen.on').id !== 's-battle';
      Dungeon.resolve({ status: 'cleared', quality: 1, topics: [], yield: {} });
      Dungeon.nextRoom();
      out.roomThreeIsAFight = document.querySelector('.screen.on').id === 's-battle';
      out.nextFight = Battle.skillLeft.ward;

      // an ability with no charges cannot be spent
      Battle.skillLeft.ward = 0;
      Battle.useSkill('ward');
      out.emptyStaysEmpty = Battle.skillLeft.ward === 0 && !Battle.wardUp;
      return out;
    });

    t.eq('a solid skill enters a fight with three uses', fight.atStart, 3);
    t.eq('spending one leaves two', fight.afterUse, 2);
    t.ok('spending raises the ward', fight.wardRaised);
    t.ok('a warded blow lands for about half', fight.warded === Math.max(1, Math.round(fight.full / 2)),
      `${fight.full} → ${fight.warded}`);
    t.ok('and the ward is spent doing it', fight.wardSpent);
    t.eq('an unraised ward changes nothing', fight.unwarded, fight.full);
    t.ok('the cellar puts a chest in the middle, so no fight there', fight.roomTwoIsNotAFight);
    t.ok('and a fight in the third room', fight.roomThreeIsAFight);
    t.eq('that next fight restores every use', fight.nextFight, 3);
    t.ok('an ability at zero cannot be spent', fight.emptyStaysEmpty);

    /* --- the rule that matters most ---
       Faces and Loadouts is explicit: abilities make the same practice more
       survivable, never shorter. An ability that dealt damage would let a
       player skip questions, which in a game about practice is the whole thing
       going wrong. Nothing in the table may touch the foe's health. */
    const safe = await t.ev(() => {
      const out = { offenders: [] };
      Game.s.metRoom = { monster: 1, lock: 1 };
      Dungeon.descend('cellar');
      for (const a of SKILL_ABILITIES) {
        const before = Battle.ehp;
        Battle.wardUp = false; Battle.steadyUp = false;
        try { a.go(); } catch (e) { /* a UI-only ability is fine */ }
        if (Battle.ehp !== before) out.offenders.push(a.id);
      }
      out.ehp = Battle.ehp;
      return out;
    });
    t.ok('no ability damages the foe — none of them shortens a fight',
      safe.offenders.length === 0, 'offenders: ' + safe.offenders.join(', '));

    // --- the gear screen explains where the uses come from ---
    const panel = await t.ev(() => {
      Game.s.loadout = ['ward', 'sight', 'steady'];
      UI.go('s-gear');
      const txt = document.getElementById('gearList').innerText;
      return { hasSkills: /Skills/.test(txt),
               namesStrand: /Vectors/.test(txt),
               namesBand: /(weak|shaky|steady|solid)/.test(txt),
               saysUses: /use/.test(txt),
               carried: (txt.match(/carried/g) || []).length };
    });
    t.ok('the Gear screen has a skills panel', panel.hasSkills);
    t.ok('it names the strand each ability draws on', panel.namesStrand);
    t.ok('and the band, so the count is explained rather than asserted', panel.namesBand && panel.saysUses);
    t.ok('it marks what is carried', panel.carried >= 3, String(panel.carried));
  }
};
