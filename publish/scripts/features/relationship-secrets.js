(function initRelationshipSecrets(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.relationshipSecretsCore;
  const Life = Game.relationshipSecretsLife;

  function brothelEncounter(state, player, woman) {
    const record = Core.addRecord(state, {
      kind: '青楼寻欢',
      participants: [player.id, woman.id],
      known: false,
      note: `你在红灯区与${woman.name}有了一段露水情缘`,
    });
    Core.schedulePregnancy(state, player, woman, record);
    return record;
  }

  function addHookRecord(state, sponsor, kind) {
    return Core.addRecord(state, {
      kind,
      participants: [Core.playerId, sponsor.id],
      known: true,
      note: `你与金主${sponsor.name}保持着未公开的关系`,
    });
  }

  function addEncounterRecord(state, partner, mode, spermAmount) {
    const kind = mode === 'brothel'
      ? '青楼寻欢' : (mode === 'hookup' ? '私密约会' : '奇遇交欢');
    return Core.addRecord(state, {
      kind,
      participants: [Core.playerId, partner.id],
      known: mode === 'hookup',
      note: `一次${kind}留下了${spermAmount}%的精液量`,
    });
  }

  function addPlayerSecret(state, kind, note) {
    return Core.addRecord(state, {
      kind,
      participants: [Core.playerId],
      known: true,
      note,
    });
  }

  function archivePlayer(state, replacementId) {
    const data = Core.ensure(state);
    data.records.forEach((record) => {
      record.participants = record.participants.map((id) => (
        id === Core.playerId ? replacementId : id
      ));
    });
    data.pregnancies.forEach((item) => {
      if (item.motherId === Core.playerId) item.motherId = replacementId;
      if (item.fatherId === Core.playerId) item.fatherId = replacementId;
    });
  }

  Game.relationshipSecrets = Object.freeze({
    ensure: Core.ensure,
    available: Core.available,
    start: Core.start,
    monthly: Life.monthly,
    addPlayerSecret,
    archivePlayer,
    brothelEncounter,
    addHookRecord,
    addEncounterRecord,
    schedulePregnancy: Core.schedulePregnancy,
  });
}(window));
