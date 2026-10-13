# 🚀 GitHub Pages 部署指引（一步一步操作手冊）

本手冊協助您將《千禧迷音》專案發布至 GitHub Pages，讓任何人都能透過網址直接在線上遊玩！

---

## 📋 準備工作

1. 一個 [GitHub](https://github.com/) 帳號。
2. 電腦已安裝 Git（您目前的系統已安裝 Git `2.54.0`）。

---

## 步驟 1：在 GitHub 建立新儲存庫 (Repository)

1. 登入您的 GitHub 帳號，點擊右上角 **「+」** ➔ **「New repository」**。
2. 設定儲存庫資訊：
   - **Repository name**：輸入名稱，例如 `millennium-echoes` 或 `pixel-game`。
   - **Description**（可選）：《千禧迷音》像素探索網頁遊戲。
   - **Public / Private**：請選擇 **Public**（公開，免費版 GitHub 帳號需為 Public 才能啟用 GitHub Pages）。
   - **Initialize this repository with**：**全部不要勾選**（不要勾選 README、.gitignore、license），保持完全空白。
3. 點擊綠色的 **「Create repository」** 按鈕。
4. 建立後，GitHub 會顯示您的遠端庫網址，例如：
   `https://github.com/<您的GitHub帳號>/millennium-echoes.git`

---

## 步驟 2：將本地專案推送到 GitHub

本專案資料夾已預先執行了 `git init` 並完成初始 Commit，您只需將遠端庫連結並推送：

開啟終端機（PowerShell 或 CMD），進入本專案資料夾：
```powershell
cd "c:\Users\Anubis.Chan\Downloads\desgin pixel game\desgin pixel game"
```

依序執行以下 3 條指令（**請將網址替換為步驟 1 取得的網址**）：

```bash
# 1. 綁定遠端儲存庫
git remote add origin https://github.com/<您的GitHub帳號>/millennium-echoes.git

# 2. 確認分支名稱為 main
git branch -M main

# 3. 推送所有程式碼與素材至 GitHub
git push -u origin main
```

*(提示：第一次推送時，系統可能會彈出 GitHub 登入驗證視窗，按照指示登入即可。)*

---

## 步驟 3：在 GitHub 開啟 GitHub Pages

程式碼推送完成後：

1. 打開您的 GitHub 儲存庫頁面。
2. 點擊上方導覽列的 **⚙️ Settings**（設定）。
3. 在左側選單找到 **Pages**（位於 Code and automation 區塊）。
4. 在 **Build and deployment** 下方的 **Source**，請選擇：
   - **Deploy from a branch**
5. 在下方出現的 **Branch** 選單中：
   - 分支選擇：`main`
   - 資料夾選擇：**`/ (root)`**
6. 點擊右側的 **Save** 儲存按鈕。

---

## 步驟 4：享受您的線上遊戲！

1. 儲存後稍候 1 至 2 分鐘（GitHub 後台正在發布靜態檔案）。
2. 重新整理 Pages 頁面，頂部會顯示綠色提示：
   > **Your site is live at `https://<您的GitHub帳號>.github.io/<儲存庫名稱>/`**
3. 點擊該網址，即可在電腦或行動裝置瀏覽器上暢玩《千禧迷音》！

---

## 💡 常見問題與技術細節

### Q1：為什麼不需要設定 Jekyll？
> 專案根目錄已包含 `.nojekyll` 檔案，GitHub Pages 會略過 Jekyll 引擎，直接以最快速度發布純靜態資源，避免中文路徑或特殊字元解析錯誤。

### Q2：為什麼有 `404.html`？
> 當使用者不小心輸錯網址時，GitHub Pages 會自動呼叫 `404.html`，並在 5 秒後自動導引玩家返回遊戲首頁。

### Q3：如果我修改了程式碼或地圖，如何更新線上版本？
> 在本地修改後，於終端機執行：
> ```bash
> git add .
> git commit -m "更新遊戲內容"
> git push
> ```
> GitHub Pages 會在 1 分鐘內自動更新線上版本！
