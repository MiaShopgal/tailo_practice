// 介面語系。
//
// 每個條目有 zh（華文）和 tai（台文）。請只改 tai 的字串。
// tai 留空（''）時，畫面顯示同一條的 zh，所以可以逐句補，沒寫到的不會變成空白。
// {name} 這類大括號是程式代入的數字或詞，請原樣留著。
// 句子裡的 HTML 標籤（例如 <span class="roman">）也請留著，只改標籤外面的文字。
// 語言名稱「華文」「台文」兩條已填好，按鈕才不會是空的；要改寫法可以直接改。
(function () {
  'use strict';

  const SETTINGS_KEY = 'lian-tailo:settings';

  const STRINGS = {
    'brand.short': { zh: '練台羅', tai: '練台羅' },
    'brand.title': { zh: '練台羅 Liān Tâi-lô', tai: '練台羅 Liān Tâi-lô' },
    'lang.zh': { zh: '華文', tai: '華文' },
    'lang.tai': { zh: '台文', tai: '台文' },

    'home.subtitle': { zh: '一起練習基本功', tai: '共基本工夫練予在' },
    'home.mistakes': { zh: '錯題本', tai: '簿仔紙' },
    'home.mistakes.count': { zh: '錯題本，{n} 題', tai: '寫毋著的題目，{n} 條' },
    'home.settings': { zh: '練習設定', tai: '練習設定' },
    'home.start': { zh: '開始{name}，{level}', tai: '開始{name}，{level}' },
    'sync.signIn': { zh: 'Google 同步', tai: 'Google 同步' },
    'sync.signOut': { zh: '登出', tai: '登出' },
    'sync.status.setup': { zh: '雲端同步尚未設定', tai: '雲端同步猶未設定' },
    'sync.status.signedOut': { zh: '登入即可同步錯題本', tai: '登入就會當同步寫毋著的題目' },
    'sync.status.connecting': { zh: '正在同步錯題本', tai: '咧同步寫毋著的題目' },
    'sync.status.synced': { zh: '已連結 Google 帳戶', tai: '已經連結 Google 帳戶' },
    'sync.status.offline': { zh: '離線中，重新連線後同步', tai: '離線中，連紲了後會同步' },
    'sync.status.retry': { zh: '同步暫時失敗，重新連線後重試', tai: '同步暫時失敗，連紲了後閣試' },
    'sync.status.error': { zh: '無法啟動雲端同步', tai: '無法度啟動雲端同步' },
    'sync.switch.confirm': { zh: '這台裝置已有錯題歷史。要將它合併到這個 Google 帳戶嗎？', tai: '這台裝置有寫毋著的題目歷史，敢愛共伊合併到這个 Google 帳戶？' },
    'sync.switch.cancelled': { zh: '已取消切換帳戶；裝置上的錯題仍保留', tai: '已取消切換帳戶；裝置內底的題目猶原佇咧' },

    'group.spell': { zh: '練拼寫', tai: '練拼寫' },
    'group.tone': { zh: '標聲調', tai: '標聲調' },
    'group.pitch': { zh: '選音值', tai: '選音值' },
    'group.type': { zh: '練打字', tai: '練拍字' },

    'desc.spell': { zh: '聽音檔，選出聲母、韻母和聲調', tai: '聽音檔，揀對應的聲母、韻母和聲調' },
    'desc.tone': { zh: '聽音檔，在正確的字母上方畫出調符', tai: '聽音檔，佇正確的字母頂頭畫調符' },
    'desc.pitch': { zh: '看常用詞，選出正確的音值圖', tai: '看常用詞，揀對正確的音值圖' },
    'desc.type': { zh: '聽音檔，打出對應的台羅', tai: '聽音檔，拍出對應的台羅' },

    'level.spell.part': { zh: '聲母／韻母', tai: '聲母／韻母' },
    'level.spell.iv': { zh: '聲母＋韻母', tai: '聲母＋韻母' },
    'level.spell.ivt': { zh: '聲＋韻＋聲調', tai: '聲＋韻＋聲調' },
    'level.spell.part.short': { zh: '補缺', tai: '塌空' },
    'level.spell.iv.short': { zh: '聲韻', tai: '聲韻' },
    'level.spell.ivt.short': { zh: '聲韻調', tai: '聲韻調' },
    'level.base': { zh: '本調（單音節）', tai: '本調（單音節）' },
    'level.sandhi': { zh: '本調＋變調（雙音節）', tai: '本調＋變調（雙音節）' },
    'aria.level.spell': { zh: '拼寫難度', tai: '拼寫難度' },
    'aria.level.tone': { zh: '畫聲調難度', tai: '畫聲調難度' },
    'aria.level.pitch': { zh: '選音值難度', tai: '選音值難度' },
    'aria.level.type': { zh: '打字難度', tai: '拍字難度' },

    'page.spell.part': { zh: '選聲母／韻母', tai: '揀聲母／韻母' },
    'page.spell.iv': { zh: '聲韻拼寫', tai: '聲韻拼寫' },
    'page.spell.ivt': { zh: '聲韻調拼寫', tai: '聲韻調拼寫' },
    'page.tone.1': { zh: '畫出單音節聲調', tai: '畫出單音節聲調' },
    'page.tone.2': { zh: '畫出雙音節聲調', tai: '畫出雙音節聲調' },
    'page.pitch.1': { zh: '選單音節音值', tai: '選單音節音值' },
    'page.pitch.2': { zh: '選雙音節音值', tai: '選雙音節音值' },
    'page.type.1': { zh: '練打字・單音節', tai: '練拍字・單音節' },
    'page.type.2': { zh: '練打字・雙音節', tai: '練拍字・雙音節' },
    'page.doc': { zh: '{title}｜{brand}', tai: '{title}｜{brand}' },
    'page.mistakes.doc': { zh: '錯題本｜練台羅', tai: '寫毋著的題目｜練台羅' },

    'settings.lang': { zh: '介面語言', tai: '介面語言' },
    'settings.theme': { zh: '外觀', tai: '外觀' },
    'settings.theme.system': { zh: '系統', tai: '系統' },
    'settings.theme.light': { zh: '淺色', tai: '淺色' },
    'settings.theme.dark': { zh: '深色', tai: '深色' },
    'settings.count': { zh: '每次練習題數', tai: '逐改練習題目數' },
    'settings.hanji': { zh: '題目顯示漢字', tai: '題目顯示漢字' },
    'settings.hanji.desc': { zh: '題目是否顯示對應漢字', tai: '題目敢愛顯示對應漢字' },
    'settings.install': { zh: '安裝到主畫面', tai: '安裝去主畫面' },
    'settings.install.desc': { zh: '加到手機主畫面，像 App 一樣打開', tai: '共網頁加起去主畫面，會得通像 App 咧操作' },
    'settings.install.ready': { zh: '加到主畫面，像 App 一樣打開', tai: '加入主畫面，親像 App 咧操作' },
    'credit.author': { zh: '網頁作者：', tai: '網頁作者：' },
    'credit.source': { zh: '專案原始碼：', tai: '專案原始碼：' },

    'install.title': { zh: '安裝到主畫面', tai: '安裝去主畫面' },
    'install.lead': { zh: '加到主畫面後，不用再開瀏覽器就能練習。', tai: '加起去主畫面了後，毋免閣開瀏覽器就通練習。' },
    'install.lead.prompt': { zh: '可以把它加到主畫面，之後不用再開瀏覽器。', tai: '會當共網頁加入去主畫面，以後毋免閣開瀏覽器。' },
    'install.lead.ios': { zh: '用 Safari 打開這個網頁，照下面三步加到主畫面。', tai: '用 Safari 拍開這个網頁，照下跤三步加起去主畫面。' },
    'install.lead.other': { zh: '用 Chrome 或系統瀏覽器打開，照下面步驟加到主畫面。', tai: '用 Chrome 抑是系統瀏覽器拍開，照下跤指示加起去主畫面。' },
    'install.ios.1': { zh: '點畫面底部的分享按鈕', tai: '揤畫面下跤的分享揤鈕' },
    'install.ios.2': { zh: '選「加入主畫面」', tai: '點「加入主畫面」' },
    'install.ios.3': { zh: '按右上角的「加入」', tai: '揤正手爿頂面的「加入」' },
    'install.other.1': { zh: '點瀏覽器右上角的選單', tai: '揤瀏覽器正手爿頂面的選單' },
    'install.other.2': { zh: '選「加到主畫面」或「安裝應用程式」', tai: '揤「加到主畫面」抑是「安裝應用程式」' },
    'install.other.3': { zh: '確認名稱後按「安裝」或「新增」', tai: '確認名稱了後揤「安裝」抑是「新增」' },
    'install.action': { zh: '安裝', tai: '安裝' },
    'install.done': { zh: '知道了', tai: '知影矣' },

    'nav.home': { zh: '回首頁', tai: '轉去頭頁' },
    'nav.back': { zh: '返回', tai: '轉去' },
    'nav.help': { zh: '聲調說明', tai: '聲調說明' },
    'action.play': { zh: '播放音檔', tai: '放送音檔' },
    'action.play.this': { zh: '播放這個音', tai: '放這个音' },
    'action.play.short': { zh: '播放', tai: '放送' },
    'action.next': { zh: '下一題', tai: '後一條' },
    'action.again': { zh: '再練一輪', tai: '閣練一回' },
    'action.clear': { zh: '重畫', tai: '重畫' },
    'action.submit': { zh: '確定', tai: '確定' },
    'aria.stage': { zh: '作答區', tai: '作答區' },
    'aria.type': { zh: '台羅拼音', tai: '台羅拼音' },
    'aria.help.tabs': { zh: '聲調說明分頁', tai: '聲調說明分頁' },

    'quiz.progress': { zh: '第 {i} / {n} 題', tai: '第 {i} / {n} 條' },
    'quiz.score': { zh: '答對 {n}', tai: '正確 {n}' },
    'quiz.correct': { zh: '答對了', tai: '正確' },
    'quiz.tap': { zh: '點一下喇叭播放音檔', tai: '揤喇叭放送音檔' },
    'quiz.audio.fail': { zh: '音檔載入失敗，請確認網路連線', tai: '音檔載入失敗，請閣確認你的網路' },
    'quiz.review.title': { zh: '這輪答錯的題目（已加入錯題本）', tai: '這回寫毋著的題目（已經記錄佇簿仔紙）' },
    'quiz.yours': { zh: '你的答案：{answer}', tai: '你的答案：{answer}' },
    'quiz.result.perfect': { zh: '全部答對，真厲害！', tai: '全部攏正確，gâu呢！' },
    'quiz.result.great': { zh: '表現很好，繼續保持', tai: '表現真好，愛繼續保持' },
    'quiz.result.ok': { zh: '不錯，再練幾輪會更熟', tai: '袂䆀，繼續練會愈熟手' },
    'quiz.result.more': { zh: '多練幾次，慢慢就會抓到聲調', tai: '加練習加進步' },

    'part.i': { zh: '聲母', tai: '聲母' },
    'part.r': { zh: '韻母', tai: '韻母' },
    'part.t': { zh: '聲調', tai: '聲調' },
    'tone.nth': { zh: '第 {n} 調', tai: '第 {n} 調' },
    'toneName.1': { zh: '陰平', tai: '陰平' },
    'toneName.2': { zh: '陰上', tai: '陰上' },
    'toneName.3': { zh: '陰去', tai: '陰去' },
    'toneName.4': { zh: '陰入', tai: '陰入' },
    'toneName.5': { zh: '陽平', tai: '陽平' },
    'toneName.7': { zh: '陽去', tai: '陽去' },
    'toneName.8': { zh: '陽入', tai: '陽入' },
    'pitch.high': { zh: '高促', tai: '高促' },
    'pitch.low': { zh: '低促', tai: '低促' },
    'pitch.correct': { zh: '正解', tai: '答案' },
    'pitch.yours': { zh: '你選', tai: '你揀' },
    'note.tone8': { zh: '第八調各地腔調不同，音檔以高降調為範例', tai: '第八調無仝所在腔口無仝，音檔以高降調做例' },
    'note.sandhi5': { zh: '第五調變調漳腔 5→7、泉腔 5→3，音檔以漳腔為範例', tai: '第五調變調漳腔 5→7、泉腔 5→3，音檔以漳腔做例' },

    'spell.noInitial': { zh: '無聲母', tai: '無聲母' },
    'spell.none': { zh: '（無）', tai: '（無）' },
    'spell.meta': { zh: '聲母 {i}・韻母 {r}', tai: '聲母 {i}・韻母 {r}' },
    'spell.meta.tone': { zh: '聲母 {i}・韻母 {r}・第 {n} 調', tai: '聲母 {i}・韻母 {r}・第 {n} 調' },
    'spell.yours': { zh: '你的拼法：{answer}', tai: '你的拼寫：{answer}' },
    'spell.wrong': { zh: '{parts}不正確', tai: '{parts}毋著' },
    'spell.status.part': { zh: '聽音檔，選出缺少的{name}', tai: '聽音檔，揀出欠缺的{name}' },
    'spell.status.step': { zh: '第 {n} 步：選出{name}', tai: '第 {n} 步：揀{name}' },
    'spell.status.review': { zh: '確認拼法後按「確定」。點聲母或韻母可以回去改', tai: '確認拼寫了後揤「確定」。揤聲母抑是韻母會當閣修改' },

    'type.hint': { zh: '可以輸入正式調號（hóo）或數字調號（hoo2）。\n連字符、空白可以省略', tai: '會當拍正式調號（hóo）抑是數字調號（hoo2）。\n連字符佮空白會當省略' },
    'type.placeholder': { zh: '輸入答案', tai: '輸入答案' },
    'type.wrong': { zh: '拼寫不正確', tai: '拼寫毋著' },

    'pitch.status.one': { zh: '選出這個音節的音值', tai: '揀這个音節的音值' },
    'pitch.status.word': { zh: '選出這個詞實際唸的音值', tai: '揀這个詞實際唸的音值' },
    'pitch.wrong': { zh: '音值不正確', tai: '音值毋著' },
    'pitch.wrong.second': { zh: '前字變調正確，後字不正確', tai: '頭前變調正確，後壁毋著' },
    'pitch.wrong.need': { zh: '前字要變調', tai: '頭前愛變調' },
    'pitch.wrong.first': { zh: '前字變調不正確', tai: '頭前變調毋著' },
    'pitch.wrong.both': { zh: '前字和後字都不正確', tai: '頭前後壁攏毋著' },
    'pitch.meta.sandhi': { zh: '前字變調 {rule}・後字第 {n} 調', tai: '頭前變調 {rule}・後字是第 {n} 調' },
    'pitch.choice': { zh: '選項 {n}', tai: '選項 {n}' },

    'mark.hint': { zh: '在韻母上方畫出調符。不用調符就留白，按「確定」送出。', tai: '咧韻母頂懸畫調符。毋免調符就留空白，揤「確定」送出。' },
    'mark.unknown': { zh: '認不出這個符號，請再畫一次', tai: '這个符號認袂出來，請重畫一改' },
    'mark.ready.one': { zh: '按「確定」送出，或直接重畫', tai: '揤「確定」送出，抑是直接重畫' },
    'mark.ready.two': { zh: '畫好了就按「確定」，可以再修改', tai: '畫好了後揤「確定」，會當閣修改' },
    'mark.none': { zh: '無調符', tai: '無調符' },
    'mark.meta': { zh: '第 {tones} 調', tai: '第 {tones} 調' },
    'mark.meta.yours': { zh: '第 {tones} 調　你的答案：{answer}', tai: '第 {tones} 調　你的答案：{answer}' },
    'mark.both': { zh: '兩個音節都不正確', tai: '兩个音節攏毋著' },
    'mark.syl': { zh: '這個音節', tai: '這个音節' },
    'mark.syl.n': { zh: '第 {n} 個音節', tai: '第 {n} 个音節' },
    'mark.noNeed': { zh: '{subject}不用標調符', tai: '{subject}毋免標調符' },
    'mark.need': { zh: '{subject}需要標調符', tai: '{subject}愛標調符' },
    'mark.bad.place': { zh: '調符正確，位置不正確', tai: '調符著，位置毋著' },
    'mark.bad.mark': { zh: '位置正確，調符不正確', tai: '位置著，調符毋著' },
    'mark.bad.both': { zh: '調符和位置都不正確', tai: '調符佮位置攏毋著' },
    'mark.bad.place.s': { zh: '{subject}：調符正確，位置不正確', tai: '{subject}：調符著，位置毋著' },
    'mark.bad.mark.s': { zh: '{subject}：位置正確，調符不正確', tai: '{subject}：位置著，調符毋著' },
    'mark.bad.both.s': { zh: '{subject}：調符和位置都不正確', tai: '{subject}：調符佮位置攏毋著' },

    'help.tab.tone': { zh: '聲調', tai: '聲調' },
    'help.tab.mark': { zh: '調符的位置', tai: '調符的位置' },
    'help.tab.sandhi': { zh: '變調規則', tai: '變調規則' },
    'help.tone.lead': { zh: '點例字可以聽本調。音值圖由上到下是音高由高到低（五度標音的 5 到 1），線尾的圓圈表示入聲短促收尾。{note}。', tai: '揤例字會當聽本調。音值圖愈頂面音愈懸，愈下跤音愈低（五度標音的 5 - 1），線尾圓箍仔表示入聲的促音韻尾。{note}。' },
    'help.listen': { zh: '聽第 {n} 調，{hanji}，{s}', tai: '聽第 {n} 調，{hanji}，{s}' },
    'help.mark.h1': { zh: 'oo、ng 標在前面的字母', tai: 'oo、ng 標佇頭前的字母' },
    'help.mark.p1': { zh: '<span class="roman">oo</span> 標在第一個 <span class="roman">o</span>，<span class="roman">ng</span> 標在 <span class="roman">n</span>。成音節的 <span class="roman">m</span> 調符標在 <span class="roman">m</span>。', tai: '<span class="roman">oo</span> 標佇第一个 <span class="roman">o</span>，<span class="roman">ng</span> 標佇 <span class="roman">n</span>。做韻母的 <span class="roman">m</span> 調符標佇 <span class="roman">m</span>。' },
    'help.mark.h2': { zh: '複元音標在主要元音', tai: '複元音標佇主要元音' },
    'help.mark.p2': { zh: '主要元音是響度較大、嘴型較開的那個。有 <span class="roman">a</span> 就標 <span class="roman">a</span>；沒有就標 <span class="roman">o</span> 或 <span class="roman">e</span>；再沒有才標 <span class="roman">i</span> 或 <span class="roman">u</span>。',
       tai: '主要元音是響度較大、嘴型較開的彼个。有 <span class="roman">a</span> 就標 <span class="roman">a</span>；無就標佇 <span class="roman">o</span> 抑是 <span class="roman">e</span>；閣來是 <span class="roman">i</span> 抑是 <span class="roman">u</span>。' },
    'help.mark.h3': { zh: 'iu、ui 標在後面的字母', tai: 'iu、ui 標佇後壁的字母' },
    'help.mark.p3': { zh: '<span class="roman">iu</span> 和 <span class="roman">ui</span> ，調符標在後面那個字母。', tai: '<span class="roman">iu</span> 佮 <span class="roman">ui</span> ，調符標佇後壁的字母。' },
    'help.mark.plain': { zh: '第 1 調以及第 4 調（<span class="roman">-p、-t、-k、-h</span> 結尾）不標調符。例如 <span class="roman">ka</span>、<span class="roman">kah</span>、<span class="roman">kak</span>。',
       tai: '第 1 調閣有第 4 調（<span class="roman">-p、-t、-k、-h</span> 結尾）毋免標調符。像 <span class="roman">ka</span>、<span class="roman">kah</span>、<span class="roman">kak</span>。' },
    'help.sandhi.lead': { zh: '箭頭指向變調後的調。例詞的前字是變調後的音值，後面是這個字單獨唸的本調音。', 
      tai: '箭頭代表變調後的調值。例詞的前字是變調後的音值，後壁是這字單獨唸的本調音。' },
    'help.sandhi.tail': { zh: '第五調變調漳腔 5→7、泉腔 5→3。第 4、8 調收 <span class="roman">-h</span> 會拉長變舒聲；收 <span class="roman">-p、-t、-k</span> 仍是促音，第 4 調變高促音，第 8 調變低促音。', 
      tai: '第五調變調漳腔 5→7、泉腔 5→3。第 4、8 調收 <span class="roman">-h</span> 會搝長變舒聲；收 <span class="roman">-p、-t、-k</span> 猶是促音，第 4 調變高促音，第 8 調變低促音。' },
    'sandhi.changed': { zh: '變調 {name}', tai: '變調 {name}' },
    'sandhi.base': { zh: '本調 {name}', tai: '本調 {name}' },
    'sandhi.missing': { zh: '無音檔', tai: '無音檔' },
    'sandhi.note.h': { zh: '-h', tai: '-h' },
    'sandhi.note.notH': { zh: '非 -h', tai: '非 -h' },
    'sandhi.note.chiang': { zh: '漳', tai: '漳' },
    'sandhi.note.chuan': { zh: '泉', tai: '泉 ' },
    'sandhi.chart.aria': { zh: '變調記憶圖。循環是 1 → 7 → 3 → 2 → 1。第 5 調漳腔變 7、泉腔變 3。第 4 調收 -h 變 2，否則變高促。第 8 調收 -h 變 3，否則變低促。', 
      tai: '變調記憶圖。循環是 1 → 7 → 3 → 2 → 1。第 5 調漳腔變 7、泉腔變 3。第 4 調收 -h 變 2，其他變高促音。第 8 調收 -h 變 3，其他變低促音。' },

    'mistakes.title': { zh: '錯題本', tai: '簿仔紙' },
    'mistakes.empty.title': { zh: '目前沒有錯題', tai: '目前無寫毋著的題目' },
    'mistakes.empty.text': { zh: '練習時答錯的題目會自動收進這裡', tai: '寫毋著的題目會自動收入來遮' },
    'mistakes.go': { zh: '去練習', tai: '去練習' },
    'mistakes.fixed.hint': { zh: '「已複習」表示這題答錯後，有再次寫正確了', tai: '「有複習矣」代表這條寫毋著了後，有閣再寫正確矣' },
    'mistakes.clear': { zh: '清空錯題', tai: '共簿仔紙拭予白' },
    'mistakes.clear.all': { zh: '清空錯題本', tai: '共簿仔紙拭予白' },
    'mistakes.clear.scope': { zh: '清空{scope}', tai: '共{scope}攏挕捒' },
    'mistakes.clear.confirm': { zh: '確定要清空{scope}嗎？', tai: '欲共{scope}攏挕捒？' },
    'mistakes.all': { zh: '全部', tai: '全部' },
    'mistakes.all.scope': { zh: '所有錯題', tai: '全部寫毋著的題目' },
    'mistakes.scope.named': { zh: '「{name}」的錯題', tai: '「{name}」的簿仔紙' },
    'mistakes.filters': { zh: '練習', tai: '練習' },
    'mistakes.levels': { zh: '{name}的分類', tai: '{name}的分類' },
    'mistakes.remove': { zh: '移出錯題本', tai: '攏挕捒簿仔紙' },
    'mistakes.times': { zh: '錯 {n} 次・{date}', tai: '寫毋著 {n} 改・{date}' },
    'mistakes.fixed': { zh: '已複習', tai: '有複習矣' },
    'date.today': { zh: '今天', tai: '今仔日' },
  };

  function lang() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      return saved.lang === 'tai' ? 'tai' : 'zh';
    } catch (e) {
      return 'zh';
    }
  }

  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? ((entry[lang()] || '').trim() ? entry[lang()] : entry.zh) : key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.split('{' + name + '}').join(String(vars[name]));
      });
    }
    return text;
  }

  function apply(root) {
    const scope = root || document;
    if (scope === document || scope === document.documentElement) {
      document.documentElement.lang = lang() === 'tai' ? 'nan-Latn' : 'zh-Hant';
    }
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  function pitchLabel(pitch) {
    const map = (window.LianTailo && window.LianTailo.PITCH_NAME) || {};
    const n = map[pitch];
    if (n === '高促') return t('pitch.high');
    if (n === '低促') return t('pitch.low');
    if (n) return t('tone.nth', { n });
    return String(pitch);
  }

  function sandhiNote(note) {
    if (note === '-h') return t('sandhi.note.h');
    if (note === '非 -h') return t('sandhi.note.notH');
    if (note === '漳') return t('sandhi.note.chiang');
    if (note === '泉') return t('sandhi.note.chuan');
    if (note === '高促') return t('pitch.high');
    if (note === '低促') return t('pitch.low');
    return note || '';
  }

  window.LianTailo = Object.assign(window.LianTailo || {}, {
    t, i18n: { lang, apply, STRINGS }, pitchLabel, sandhiNote,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
  else apply();
})();
