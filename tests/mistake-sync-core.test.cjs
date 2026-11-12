const assert = require('node:assert/strict');
const { test } = require('node:test');
const syncCore = require('../website/js/mistake-sync-core.js');

class SyncRobot {
  localHistory(state) {
    this.local = state;
    return this;
  }

  cloudHistory(state) {
    this.cloud = state;
    return this;
  }

  synchronize() {
    this.result = syncCore.mergeStates(this.local, this.cloud, 'device-local');
    return new MistakeHistoryRobot(this.result);
  }
}

class MistakeHistoryRobot {
  constructor(state) {
    this.state = state;
  }

  hasCount(key, count) {
    assert.equal(this.state.items[key] && this.state.items[key].count, count);
    return this;
  }

  isAbsent(key) {
    assert.equal(this.state.items[key], undefined);
    return this;
  }

  hasLatestActivity(key, timestamp) {
    assert.equal(this.state.items[key] && this.state.items[key].activityAt, timestamp);
    return this;
  }

  isFixed(key) {
    assert.ok(this.state.items[key] && this.state.items[key].fixedAt > this.state.items[key].lastAt);
    return this;
  }

  isReopened(key) {
    assert.ok(this.state.items[key] && this.state.items[key].fixedAt === 0);
    return this;
  }
}

function aMistake({ count, deviceId, activityAt, activityType = 'wrong' }) {
  return {
    unit: 'type-1',
    a: '22106(1)',
    s: 'í',
    h: '已',
    answer: 'i',
    answerPitch: null,
    expectPitch: null,
    count,
    countsByDevice: { [deviceId]: count },
    firstAt: 10,
    lastAt: activityType === 'wrong' ? activityAt : 10,
    fixedAt: activityType === 'correct' ? activityAt : 0,
    activityAt,
    activityId: `${deviceId}:${activityAt}`,
    activityType,
  };
}

test('a new mistake after deletion does not regain attempts from a stale cloud copy', () => {
  const key = 'type-1|22106(1)';

  new SyncRobot()
    .localHistory({
      deviceId: 'device-local',
      items: { [key]: aMistake({ count: 1, deviceId: 'device-local', activityAt: 400 }) },
      tombstones: { [key]: { unit: 'type-1', a: '22106(1)', deletedAt: 300, activityId: 'delete:300' } },
    })
    .cloudHistory({
      deviceId: 'device-cloud',
      items: { [key]: aMistake({ count: 5, deviceId: 'device-cloud', activityAt: 250 }) },
      tombstones: {},
    })
    .synchronize()
    .hasCount(key, 1)
    .hasLatestActivity(key, 400);
});

test('mistake counts merge once per device and the latest activity controls fixed status', () => {
  const key = 'type-1|22106(1)';
  const local = {
    deviceId: 'device-local',
    items: { [key]: aMistake({ count: 2, deviceId: 'device-local', activityAt: 100 }) },
    tombstones: {},
  };
  const fixedInCloud = {
    deviceId: 'device-cloud',
    items: { [key]: aMistake({ count: 3, deviceId: 'device-cloud', activityAt: 150, activityType: 'correct' }) },
    tombstones: {},
  };

  const fixed = new SyncRobot()
    .localHistory(local)
    .cloudHistory(fixedInCloud)
    .synchronize();
  fixed.hasCount(key, 5).hasLatestActivity(key, 150).isFixed(key);

  const reopenedInCloud = {
    deviceId: 'device-cloud',
    items: { [key]: aMistake({ count: 4, deviceId: 'device-cloud', activityAt: 200 }) },
    tombstones: {},
  };
  const reopened = new SyncRobot()
    .localHistory(syncCore.mergeStates(local, fixedInCloud, 'device-local'))
    .cloudHistory(reopenedInCloud)
    .synchronize();
  reopened.hasCount(key, 6).hasLatestActivity(key, 200).isReopened(key);
});

test('a learner keeps the existing local count when that same history is synchronized again', () => {
  const key = 'spell-1|22106(1)';
  const legacyRecord = { ...aMistake({ count: 3, deviceId: 'device-local', activityAt: 250 }), unit: 'spell-1' };
  delete legacyRecord.countsByDevice;
  const localHistory = {
    items: { [key]: legacyRecord },
    tombstones: {},
  };
  const alreadySynced = {
    deviceId: 'device-local',
    items: { [key]: { ...aMistake({ count: 3, deviceId: 'device-local', activityAt: 250 }), unit: 'spell-1' } },
    tombstones: {},
  };

  const firstSync = syncCore.mergeStates(localHistory, alreadySynced, 'device-local');
  const repeatedSync = syncCore.mergeStates(firstSync, alreadySynced, 'device-local');

  new MistakeHistoryRobot(repeatedSync).hasCount(key, 3);
});

test('a deleted mistake stays deleted after its history is sent to and read from the cloud', () => {
  const key = 'tone-1|22106(1)';
  const deletedHistory = {
    deviceId: 'device-local',
    items: {},
    tombstones: {
      [key]: { unit: 'tone-1', a: '22106(1)', deletedAt: 300, activityId: 'delete:300' },
    },
  };
  const cloudDocuments = syncCore.stateToDocuments(deletedHistory, 'device-local');
  const restoredCloudHistory = syncCore.documentsToState(cloudDocuments, 'device-local');
  const staleDeviceHistory = {
    deviceId: 'device-cloud',
    items: { [key]: { ...aMistake({ count: 4, deviceId: 'device-cloud', activityAt: 250 }), unit: 'tone-1' } },
    tombstones: {},
  };

  const afterSync = new SyncRobot()
    .localHistory(restoredCloudHistory)
    .cloudHistory(staleDeviceHistory)
    .synchronize();
  afterSync.isAbsent(key);
});
