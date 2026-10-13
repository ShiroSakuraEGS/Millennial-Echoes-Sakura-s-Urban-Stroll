// 監聽擴充功能圖示點擊事件
chrome.action.onClicked.addListener((tab) => {
  // 建立一個獨立的小型浮動視窗 (popup 類型，無網址列與分頁)
  chrome.windows.create({
    url: chrome.runtime.getURL("game.html"),
    type: "popup",
    width: 560,
    height: 700,
    focused: true
  });
});
