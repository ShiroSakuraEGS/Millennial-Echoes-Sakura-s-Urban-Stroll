# 《千禧迷音》(Millennium Echoes) - 2D 像素探索遊戲

> **復古像素風 Cyberpunk x Dreamcore 沉浸式網頁探索遊戲**  
> 伴隨失意作家小櫻在千禧霓虹街頭漫步，探索回憶幻城，學習 AIGC 創作秘笈。

---

## 🌐 線上遊玩 (GitHub Pages)

本專案支援 **GitHub Pages** 直接發布為公開靜態網頁，玩家無需安裝任何環境，打開瀏覽器即可即時暢玩！

🔗 **線上展示網址範例**：`https://<你的 GitHub 帳號>.github.io/<儲存庫名稱>/`

---

## 🚀 快速發布至 GitHub Pages 教學

只需以下 3 個步驟，即可將本專案部署至你專屬的 GitHub Pages：

### 步驟 1：建立 GitHub 儲存庫 (Repository)
1. 前往 [GitHub 建立新儲存庫](https://github.com/new)。
2. 輸入 Repository 名稱（例如：`millennium-echoes` 或 `pixel-game`）。
3. 設為 **Public**（公開）。
4. **不要**勾選 "Add a README file"、"Add .gitignore"，保持儲存庫空白。
5. 點擊 **Create repository**。

### 步驟 2：推送到 GitHub
在當前專案資料夾（`desgin pixel game`）開啟終端機（PowerShell 或 Git Bash），執行以下指令：

```bash
# 1. 關聯至遠端 GitHub 儲存庫 (請將 URL 換成你的儲存庫網址)
git remote add origin https://github.com/<你的 GitHub 帳號>/<儲存庫名稱>.git

# 2. 將主要分支設定為 main
git branch -M main

# 3. 推送程式碼至 GitHub
git push -u origin main
```

### 步驟 3：開啟 GitHub Pages 服務
1. 進入你的 GitHub 儲存庫頁面。
2. 點擊頂部的 **Settings**（設定）標籤頁。
3. 在左側選單點選 **Pages**（位於 Code and automation 區塊）。
4. 在 **Build and deployment** > **Source** 下拉選單中，有兩種推薦方式（擇一即可）：
   - **方式 A（最直覺）：Deploy from a branch**
     - Branch 選擇：`main`
     - 資料夾選擇：`/ (root)`
     - 點擊 **Save**。
   - **方式 B（自動化）：GitHub Actions**
     - 專案已內建 `.github/workflows/deploy.yml`，選擇後每次推送到 `main` 分支都會全自動建置部署！
5. 等待 1~2 分鐘，頁面頂部將會顯示綠色勾勾與你的專屬網址：
   `Your site is live at https://<你的 GitHub 帳號>.github.io/<儲存庫名稱>/`

---

## 💻 本地端預覽與執行方式

由於現代瀏覽器對於本機音訊與 Canvas 畫布的安全性跨域限制（CORS），建議透過本地伺服器開啟以獲得最流暢體驗：

### 方法 1：使用 VS Code Live Server 擴充功能（最推薦）
1. 在 VS Code 中開啟本資料夾。
2. 在 `index.html` 上按右鍵，點選 **「Open with Live Server」**。
3. 瀏覽器將自動開啟 `http://127.0.0.1:5500/index.html`。

### 方法 2：使用 Python 內建伺服器
在資料夾終端機中執行：
```bash
python -m http.server 8000
```
接著在瀏覽器打開 `http://localhost:8000` 即可遊玩。

### 方法 3：使用 Node.js npx serve
```bash
npx serve .
```

---

## 🧩 Chrome 擴充功能版本使用方式 (可選)

本專案同時保留完整的 Chrome Extension Manifest V3 相容設定：

1. 開啟 Google Chrome 瀏覽器，進入 `chrome://extensions/`。
2. 開啟右上角 **「開發者模式」(Developer mode)**。
3. 點選 **「載入未封裝項目」(Load unpacked)**。
4. 選擇本專案資料夾即可完成安裝。

---

## 🕹️ 遊戲操作指南 (Controls)

| 按鍵 / 動作 | 功能說明 |
| :--- | :--- |
| **A** | 向左移動 |
| **D** | 向右移動 |
| **W** / **Space** | 跳躍（空中可變更移動方向） |
| **S** | 蹲下 / 空中加速下墜 |
| **E** | 與 NPC 互動 / 對話（接近 NPC 時顯示提示） |
| **Space** / **滑鼠點擊** | 推進劇情對話 |
| **SKIP ➔** | 跳過序章劇情，直接進入漫遊模式 |
| **🎧 左下角耳機** | 打開 IEarPod 音樂播放清單（支援曲目切換與音量調整） |
| **📒 底部手帳** | 打開魔法筆記本（查閱已解鎖的 AIGC 溝通秘笈） |
| **🕶️ 右下角眼鏡** | 打開 IEYE 科技面板（包含圖鑑、AIGC 工具庫、劇情回顧） |

---

## 📁 專案檔案架構

```text
desgin pixel game/
├── index.html           # GitHub Pages 預設入口頁面（整合 SEO/OG 社群標籤）
├── game.html            # 遊戲主要結構檔（相容性備份入口）
├── game.js              # 遊戲核心引擎（狀態機、物理、NPC、渲染管理）
├── story_data.js        # 劇情資料（序章對話與各章節腳本）
├── privacy.html         # 隱私權政策頁面
├── 404.html             # Cyberpunk 風格自訂 404 錯誤導回頁面
├── .nojekyll            # 繞過 Jekyll 引擎以完整支援純靜態檔案與中文檔名
├── .gitignore           # Git 忽略設定檔
├── manifest.json        # Chrome Extension MV3 設定
├── background.js        # Chrome Extension 背景服務腳本
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions 自動部署工作流程
├── css/                 # 遊戲樣式表
│   ├── variables.css    # 霓虹色票與共用常數
│   ├── start-screen.css # 開始畫面樣式
│   ├── story-system.css # 劇情對話與字幕樣式
│   ├── hud-menu.css     # 操作提示與頂部 HUD
│   ├── ieye-notebook.css# 筆記本與 IEYE 面板樣式
│   └── components.css   # 按鈕與彈窗組件
├── bgm/                 # 背景音樂檔案（MP3）
├── character/           # 玩家與 NPC 動作精靈圖片
├── icon/                # 遊戲標誌與標題圖像
├── item/                # 道具圖示與動態圖檔
├── map/                 # 大地圖場景與前景圖層
└── Story/               # 各劇情章節背景 CG 插圖
```

---

## 🛡️ GitHub Pages 發布注意事項

1. **`.nojekyll` 檔案的重要性**：
   專案根目錄必須保有 `.nojekyll` 檔案。由於本專案包含中文素材路徑（例如 `character/小櫻/`、`item/建築地標/`、`bgm/AI 説要 City Walk.mp3`），Jekyll 預設會過濾或無法正確解析這些路徑。`.nojekyll` 可確保 GitHub Pages 以純靜態伺服器模式直接分發所有資源。
2. **所有資源皆採相對路徑**：
   專案內所有圖片、CSS、JS、音訊連結皆採用相對路徑（如 `css/...`、`bgm/...`），無論部署在自訂頂級域名或子路徑（如 `https://<user>.github.io/<repo>/`）皆能完美相容。

---

## 📜 授權與說明

- 本專案僅供學習、展示與個人創作使用。
- 專案素材版權歸原作者所有。
