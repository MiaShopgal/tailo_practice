# 練台羅

台語台羅練習網頁。聽音檔練習拼寫、標聲調、選音值、打字。

網頁作者：[Tân Kiàn-tiong](https://kiantiong.com/)  
專案：https://github.com/luke871016/tailo_practice

## 錯題同步

可選擇以 Google 帳戶同步錯題本；Firebase 設定步驟與 Firestore 規則見 [`docs/firebase-sync.md`](docs/firebase-sync.md)。

## 授權

本專案的**程式**（`website/` 的網頁與腳本、`scripts/` 的建置程式）以 [創用 CC 姓名標示 4.0（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/deed.zh-hant) 授權。

轉載或改作程式時，請標示作者 Tân Kiàn-tiong，並附上本專案連結。

聲音檔與詞頻資料不是這份授權的範圍，使用時請另依各來源的規定。

## 聲音檔

練習讀音取自教育部《臺灣台語常用詞辭典》的羅馬字音檔（檔名如 `22106(1)`）。網頁從 `https://static.kiantiong.com/sutiau/` 載入對應的 mp3。

變調說明裡泉腔「紅茶」的例字，使用陳建中自行錄製的音檔 `website/audio/ang-te-tshuan.wav`。

## 詞頻

出題順序依台語歌詞詞頻，
資料來源為[台語歌真正正字歌詞網](https://taigilyrics.kiantiong.com/)。建置時讀取 `data/hanji_tailo_word_freq.csv`，再對上教育部辭典詞目 `data/kautian.ods`（工作表「詞目」），取得羅馬字、漢字與音檔檔名。

題庫由 `scripts/build_tone_data.py` 產生，輸出在 `website/data/`。雙音節變調可再套用 `data/sandhi_overrides.csv` 的人工檢查結果。
