// 雲端同步：登入後把設定與錯題本存到 Firestore users/{uid}
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup,
         signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBlySg2L_zefDMWYW-GVcVG_oTyL9htRws",
  authDomain: "tailo-practice-e007c.firebaseapp.com",
  projectId: "tailo-practice-e007c",
  storageBucket: "tailo-practice-e007c.firebasestorage.app",
  messagingSenderId: "460838380520",
  appId: "1:460838380520:web:90447843ee9bf24dd9fa5d"
};

const SETTINGS_KEY = 'lian-tailo:settings';
const MISTAKES_KEY = 'lian-tailo:mistakes';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// 錯題本逐題合併：同一題保留 lastAt 較新的那份
function mergeMistakes(a, b) {
  const items = Object.assign({}, a?.items);
  for (const [key, it] of Object.entries(b?.items || {})) {
    const mine = items[key];
    if (!mine || (it.lastAt || 0) > (mine.lastAt || 0)) items[key] = it;
  }
  return { version: 1, items };
}

let user = null;
let timer = null;

async function pull() {
  const snap = await getDoc(doc(db, 'users', user.uid));
  const cloud = snap.exists() ? snap.data() : {};
  const before = localStorage.getItem(MISTAKES_KEY) + '\n' + localStorage.getItem(SETTINGS_KEY);
  writeLS(MISTAKES_KEY, mergeMistakes(readLS(MISTAKES_KEY), cloud.mistakes));
  if (cloud.settings && (cloud.settingsAt || 0) > (readLS(SETTINGS_KEY + ':at') || 0)) {
    writeLS(SETTINGS_KEY, cloud.settings);
    writeLS(SETTINGS_KEY + ':at', cloud.settingsAt);
  }
  const after = localStorage.getItem(MISTAKES_KEY) + '\n' + localStorage.getItem(SETTINGS_KEY);
  await push();
  return before !== after;
}

async function push() {
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid), {
    settings: readLS(SETTINGS_KEY) || {},
    settingsAt: readLS(SETTINGS_KEY + ':at') || 0,
    mistakes: readLS(MISTAKES_KEY) || { version: 1, items: {} },
    updatedAt: Date.now(),
  });
}

function flush() {
  clearTimeout(timer);
  timer = null;
  push().catch(console.error);
}

// 離開頁面（換頁、切到背景）前，把還沒上傳的變更送出
addEventListener('pagehide', () => { if (timer) flush(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) flush();
});

// 給 common.js 呼叫：存檔後 2 秒內合併成一次上傳
window.LianSync = {
  changed(key) {
    if (key === SETTINGS_KEY) writeLS(SETTINGS_KEY + ':at', Date.now());
    clearTimeout(timer);
    timer = setTimeout(flush, 2000);
  },
  login() {
    const p = new GoogleAuthProvider();
    // 加到主畫面的 PWA 用 popup 容易失敗，改用 redirect
    const standalone = matchMedia('(display-mode: standalone)').matches;
    return standalone ? signInWithRedirect(auth, p) : signInWithPopup(auth, p);
  },
  logout: () => signOut(auth),
  get user() { return user; },
};

onAuthStateChanged(auth, async (u) => {
  user = u;
  document.dispatchEvent(new CustomEvent('lian-sync:auth', { detail: u }));
  if (u) {
    const changed = await pull().catch((e) => { console.error(e); return false; });
    // changed 為 true 表示雲端資料改到本機資料，頁面可據此重新整理畫面
    document.dispatchEvent(new CustomEvent('lian-sync:pulled', { detail: { changed } }));
  }
});
