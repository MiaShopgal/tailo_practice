const FIREBASE_VERSION = '11.10.0';
const LAST_ACCOUNT_KEY = 'lian-tailo:mistakes:last-account';
const core = window.LianTailoSyncCore;
const { mistakes, t } = window.LianTailo;
const controls = Array.from(document.querySelectorAll('[data-sync-button]'));
const statuses = Array.from(document.querySelectorAll('[data-sync-status]'));

let currentUser = null;
let currentStatus = 'sync.status.signedOut';
let busy = false;
let authAvailable = false;
let listener = null;
let remoteState = null;
let syncReady = false;
let mergingCloudState = false;
let switchCancelled = false;
const writeQueue = new Map();
const inFlightWrites = new Set();
const acknowledgedWrites = new Map();

function render() {
  statuses.forEach((element) => { element.textContent = t(currentStatus); });
  controls.forEach((button) => {
    const key = currentUser ? 'sync.signOut' : 'sync.signIn';
    button.textContent = t(key);
    button.setAttribute('aria-label', t(key));
    button.disabled = busy || !authAvailable;
  });
}

function setStatus(key) {
  currentStatus = key;
  render();
}

function pathKey(uid, documentId) {
  return `${uid}/${documentId}`;
}

function documentId(key) {
  return encodeURIComponent(key);
}

function setRemoteSnapshot(snapshot, deviceId) {
  remoteState = core.documentsToState(
    snapshot.docs.map((document) => ({ id: document.id, data: document.data() })),
    deviceId
  );
  syncReady = true;
  synchronizeLocalAndRemote();
}

function synchronizeLocalAndRemote() {
  if (!currentUser || !remoteState || mergingCloudState) return;
  let local;
  mergingCloudState = true;
  try {
    local = mistakes.mergeCloudState(remoteState);
  } finally {
    mergingCloudState = false;
  }
  const remoteDocuments = new Map(
    core.stateToDocuments(remoteState, local.deviceId).map((entry) => [entry.key, entry.data])
  );

  core.stateToDocuments(local, local.deviceId).forEach((entry) => {
    const id = documentId(entry.key);
    const known = remoteDocuments.get(entry.key);
    const ackKey = pathKey(currentUser.uid, id);
    if (known && core.documentsEqual(known, entry.data)) return;
    if (core.documentsEqual(acknowledgedWrites.get(ackKey), entry.data)) return;
    writeQueue.set(ackKey, { id, data: entry.data, uid: currentUser.uid });
  });
  processWriteQueue();
}

function processWriteQueue() {
  if (!currentUser || !navigator.onLine) {
    setStatus(currentUser ? 'sync.status.offline' : currentStatus);
    return;
  }
  if (!syncReady) {
    setStatus('sync.status.connecting');
    return;
  }

  writeQueue.forEach((entry, key) => {
    if (inFlightWrites.has(key)) return;
    if (entry.uid !== currentUser.uid) {
      writeQueue.delete(key);
      return;
    }
    writeQueue.delete(key);
    inFlightWrites.add(key);
    const reference = window.tailoFirebaseSync.doc(
      window.tailoFirebaseSync.collection(window.tailoFirebaseSync.db, 'users', entry.uid, 'mistakes'),
      entry.id
    );
    window.tailoFirebaseSync.setDoc(reference, entry.data)
      .then(() => {
        acknowledgedWrites.set(key, entry.data);
        inFlightWrites.delete(key);
        processWriteQueue();
      })
      .catch((error) => {
        inFlightWrites.delete(key);
        if (!writeQueue.has(key)) writeQueue.set(key, entry);
        console.error('Mistake history could not be synchronized.', error);
        setStatus('sync.status.retry');
      });
  });

  if (writeQueue.size || inFlightWrites.size) setStatus('sync.status.connecting');
  else setStatus('sync.status.synced');
}

async function handleAuthentication(authSdk, firestoreSdk, auth, user) {
  if (listener) {
    listener();
    listener = null;
  }
  writeQueue.clear();
  currentUser = user;
  remoteState = null;
  syncReady = false;

  if (!user) {
    setStatus(switchCancelled ? 'sync.switch.cancelled' : 'sync.status.signedOut');
    switchCancelled = false;
    return;
  }

  let previousUid = null;
  try { previousUid = localStorage.getItem(LAST_ACCOUNT_KEY); } catch (error) {
    console.error('Could not read the last synchronized account.', error);
  }

  if (previousUid && previousUid !== user.uid && mistakes.hasSyncHistory()) {
    if (!window.confirm(t('sync.switch.confirm'))) {
      switchCancelled = true;
      await authSdk.signOut(auth);
      return;
    }
  }

  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, user.uid);
  } catch (error) {
    console.error('Could not remember the synchronized account.', error);
  }

  setStatus(navigator.onLine ? 'sync.status.connecting' : 'sync.status.offline');
  const collection = firestoreSdk.collection(firestoreSdk.db, 'users', user.uid, 'mistakes');
  const listenerUid = user.uid;
  listener = firestoreSdk.onSnapshot(collection, (snapshot) => {
    if (!currentUser || currentUser.uid !== listenerUid) return;
    const deviceId = mistakes.syncSnapshot().deviceId;
    setRemoteSnapshot(snapshot, deviceId);
  }, (error) => {
    if (!currentUser || currentUser.uid !== listenerUid) return;
    console.error('Could not read synchronized mistake history.', error);
    setStatus('sync.status.retry');
  });
}

async function start() {
  const { default: config } = await import('./firebase-config.js');
  if (!config) {
    setStatus('sync.status.setup');
    controls.forEach((button) => { button.disabled = true; });
    return;
  }
  ['apiKey', 'authDomain', 'projectId', 'appId'].forEach((key) => {
    if (typeof config[key] !== 'string' || !config[key]) throw new Error(`Missing Firebase configuration field: ${key}`);
  });

  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = appSdk.initializeApp(config);
  const auth = authSdk.getAuth(app);
  let db;
  try {
    db = firestoreSdk.initializeFirestore(app, {
      localCache: firestoreSdk.persistentLocalCache({
        tabManager: firestoreSdk.persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    if (!['failed-precondition', 'unimplemented'].includes(error.code)) throw error;
    console.warn('Persistent Firestore cache is unavailable; local mistake history will queue synchronization.');
    db = firestoreSdk.getFirestore(app);
  }

  window.tailoFirebaseSync = Object.assign({ db }, firestoreSdk);
  authAvailable = true;
  render();
  controls.forEach((button) => {
    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      render();
      try {
        if (currentUser) await authSdk.signOut(auth);
        else {
          const provider = new authSdk.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await authSdk.signInWithPopup(auth, provider);
        }
      } catch (error) {
        console.error('Google sign-in or sign-out failed.', error);
        setStatus('sync.status.error');
      } finally {
        busy = false;
        render();
      }
    });
  });

  authSdk.onAuthStateChanged(auth, (user) => {
    handleAuthentication(authSdk, window.tailoFirebaseSync, auth, user)
      .catch((error) => {
        console.error('Could not start account synchronization.', error);
        setStatus('sync.status.error');
      });
  });

  window.addEventListener('lian-tailo:mistakes-change', synchronizeLocalAndRemote);
  window.addEventListener('storage', (event) => {
    if (event.key === 'lian-tailo:mistakes') synchronizeLocalAndRemote();
  });
  window.addEventListener('online', processWriteQueue);
  window.addEventListener('offline', () => {
    if (currentUser) setStatus('sync.status.offline');
  });
  if (!navigator.onLine) setStatus('sync.status.offline');
}

render();
start().catch((error) => {
  console.error('Firebase mistake-history synchronization is unavailable.', error);
  setStatus('sync.status.error');
});
