// ============================================================
// 千禧迷音 - game.js
// 架構：單一狀態機 (GameState) + 模組化 Manager 系統
// 狀態流：LOADING → START → PROLOGUE → PLAYING
// ============================================================

// 全域 JavaScript 錯誤監聽，便於擴充功能偵錯與回報
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[Global Error]', message, 'at', source, 'line:', lineno, 'col:', colno, error);
};

// ============================================================
// 【第 1 區塊】畫布、常數、世界設定與 DOM 引用
// ============================================================

// 畫布初始化
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // 像素風：關閉模糊化

// 鏡頭縮放倍數
const zoom = 3.0;

// 遊戲世界與相機虛擬尺寸（依 zoom 計算）
const world = {
  width: 2400,                     // 預設值，bgImage.onload 後動態更新
  height: canvas.height / zoom,
  groundY: (canvas.height / zoom) - 20
};

const camera = {
  x: 0, y: 0,
  width: canvas.width / zoom,
  height: canvas.height / zoom
};

// 地圖狀態（取代舊的 window.currentMapName / window.isTransitioningMap）
const mapState = {
  current: 'map1.png',
  isTransitioning: false
};

// 所有 DOM 元素一次性取得，避免重複查詢
const DOM = {
  // 畫布包裝
  gameCanvas: document.getElementById('gameCanvas'),
  startScreen: document.getElementById('startScreen'),
  startGameBtn: document.getElementById('startGameBtn'),
  startAigcToolsBtn: document.getElementById('startAigcToolsBtn'),
  startAigcNotebookBtn: document.getElementById('startAigcNotebookBtn'),
  startMusicBtn: document.getElementById('startMusicBtn'),
  // 序章
  prologueScreen: document.getElementById('prologueScreen'),
  prologueBg: document.getElementById('prologueBg'),
  prologueText: document.getElementById('prologueText'),
  prologueSceneTag: document.getElementById('prologueSceneTag'),
  prologueNextHint: document.getElementById('prologueNextHint'),
  prologueSkipBtn: document.getElementById('prologueSkipBtn'),
  prologueTextbox: document.querySelector('.prologue-textbox'),
  prologueTechFilter: document.querySelector('.prologue-tech-filter'),
  prologueSpeaker: document.getElementById('prologueSpeaker'),
  // 地圖轉場遮罩
  slideOverlay: document.getElementById('slideTransitionOverlay'),
  // 說明彈窗
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  // 耳機播放清單
  earpodBtn: document.getElementById('earpodBtn'),
  playlistModal: document.getElementById('playlistModal'),
  closePlaylistBtn: document.getElementById('closePlaylistBtn'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  volumeSlider: document.getElementById('volumeSlider'),
  // IEYE 隱形眼鏡
  ieyeBtn: document.getElementById('ieyeBtn'),
  ieyeModal: document.getElementById('ieyeModal'),
  closeIeyeBtn: document.getElementById('closeIeyeBtn'),
  ieyeBackToStartBtn: document.getElementById('ieyeBackToStartBtn'),
  ieyeReadStoryBtn: document.getElementById('ieyeReadStoryBtn'),
  ieyeAigcToolsBtn: document.getElementById('ieyeAigcToolsBtn'),
  // 劇情回顧列表
  storyListModal: document.getElementById('storyListModal'),
  closeStoryListBtn: document.getElementById('closeStoryListBtn'),
  // 筆記本
  notebookBtn: document.getElementById('notebookBtn'),
  notebookModal: document.getElementById('notebookModal'),
  closeNotebookBtn: document.getElementById('closeNotebookBtn'),
  notebookPrevBtn: document.getElementById('notebookPrevBtn'),
  notebookNextBtn: document.getElementById('notebookNextBtn'),
  notebookPageContent: document.getElementById('notebookPageContent'),
  // 互動面板
  interactionModal: document.getElementById('interactionModal'),
  interactionNpcName: document.getElementById('interactionNpcName'),
  interactionDialogue: document.getElementById('interactionDialogue'),
  interactionOptions: document.getElementById('interactionOptions'),
  aigcModal: document.getElementById('aigcModal'),
  aigcGrid: document.getElementById('aigcGrid'),
  closeAigcBtn: document.getElementById('closeAigcBtn'),
  // 圖鑑相關 DOM
  ieyeGuideBtn: document.getElementById('ieyeGuideBtn'),
  guideModal: document.getElementById('guideModal'),
  closeGuideBtn: document.getElementById('closeGuideBtn'),
  tabItems: document.getElementById('tabItems'),
  tabPlaces: document.getElementById('tabPlaces'),
  guideListContainer: document.getElementById('guideListContainer'),
  guideDetailModal: document.getElementById('guideDetailModal'),
  closeGuideDetailBtn: document.getElementById('closeGuideDetailBtn'),
  modalDetailIcon: document.getElementById('modalDetailIcon'),
  modalDetailName: document.getElementById('modalDetailName'),
  modalDetailDesc: document.getElementById('modalDetailDesc'),
  modalDetailStory: document.getElementById('modalDetailStory'),
  // 解鎖通知相關 DOM
  notificationModal: document.getElementById('notificationModal'),
  notificationBody: document.getElementById('notificationBody'),
  closeNotificationBtn: document.getElementById('closeNotificationBtn'),
  // 地點名稱顯示相關 DOM
  locationOverlay: document.getElementById('locationOverlay'),
  locationTitle: document.getElementById('locationTitle'),
};

// 驗證關鍵 DOM 元素是否存在，防範載入順序或 HTML 結構錯誤導致 null 指標
for (const [name, el] of Object.entries(DOM)) {
  if (!el) {
    console.error(`[DOM Error] 未能成功取得 DOM 元素: DOM.${name}`);
  }
}

// ============================================================
// 【第 2 區塊】序章劇情資料 (已抽離至 story_data.js)
// ============================================================
// 【第 3 區塊】音頻管理器 AudioManager
// ============================================================

const AudioManager = {
  bgm: new Audio('bgm/AI 説要 City Walk.mp3'),
  prologueBGM: new Audio('bgm/AI在小櫻花的蝸居播的音樂.mp3'),
  isPlaying: false,

  init() {
    this.bgm.loop = true;
    this.bgm.volume = 0.55;
    this.prologueBGM.loop = true;
    this.prologueBGM.volume = 0.6;
  },

  // 嘗試播放遊戲 BGM；若瀏覽器阻擋，自動在下次互動時重試
  playGameBGM() {
    this.prologueBGM.pause();
    // 已在播放中則不重置，避免歌曲跳回開頭
    if (this.isPlaying) return;
    this.bgm.currentTime = 0;
    this.bgm.play().then(() => {
      this.isPlaying = true;
      if (DOM.playPauseBtn) DOM.playPauseBtn.textContent = '暫停';
    }).catch(() => {
      // 瀏覽器自動播放政策阻擋時，等下次使用者互動再試一次
      const retry = () => {
        if (gameState === 'PLAYING' || gameState === 'START') this.playGameBGM();
      };
      window.addEventListener('click', retry, { once: true });
      window.addEventListener('keydown', retry, { once: true });
    });
  },

  // 播放序章 BGM（開始畫面也使用此 BGM）
  playPrologueBGM() {
    this.bgm.pause();
    this.isPlaying = false;
    // 避免重複播放導致音訊中斷重置
    if (!this.prologueBGM.paused) return;

    this.prologueBGM.currentTime = 0;
    this.prologueBGM.play().then(() => {
      // 成功播放
    }).catch(() => {
      // 瀏覽器阻擋自動播放時，等使用者首次互動後重試
      const retry = () => {
        if (gameState === 'START' || gameState === 'PROLOGUE') {
          this.playPrologueBGM();
        }
      };
      window.addEventListener('click', retry, { once: true });
      window.addEventListener('keydown', retry, { once: true });
    });
  },

  // 暫停 / 恢復遊戲 BGM（播放清單按鈕使用）
  toggleGameBGM() {
    if (this.isPlaying) {
      this.bgm.pause();
      this.isPlaying = false;
      if (DOM.playPauseBtn) DOM.playPauseBtn.textContent = '播放';
    } else {
      this.bgm.play().then(() => {
        this.isPlaying = true;
        if (DOM.playPauseBtn) DOM.playPauseBtn.textContent = '暫停';
      }).catch(err => console.error('無法播放音訊:', err));
    }
  },

  // 切換曲目
  switchTrack(src) {
    this.bgm.src = src;
    this.bgm.load();
    this.bgm.play().then(() => {
      this.isPlaying = true;
      if (DOM.playPauseBtn) DOM.playPauseBtn.textContent = '暫停';
    }).catch(err => console.error('播放失敗:', err));
  },

  // 設定音量（接受 0-100 數值）
  setVolume(val) {
    this.bgm.volume = val / 100;
  }
};

// ============================================================
// 【第 4 區塊】精靈圖載入與玩家物理
// ============================================================

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const characterPath = 'character/小櫻/';

const sprites = {
  stayRight: loadImage(characterPath + 'stay1-1.png'),
  walkRight: [
    loadImage(characterPath + 'stay1-1.png'),
    loadImage(characterPath + 'walk1-2.png'),
    loadImage(characterPath + 'walk1-3.png')
  ],
  jumpRight: [
    loadImage(characterPath + 'stay1-1.png'),
    loadImage(characterPath + 'jump1-1.png'),
    loadImage(characterPath + 'jump1-2.png'),
    loadImage(characterPath + 'jump1-3.png')
  ],
  stayLeft: loadImage(characterPath + 'stay2-1.png'),
  walkLeft: [
    loadImage(characterPath + 'stay2-1.png'),
    loadImage(characterPath + 'walk2-2.png'),
    loadImage(characterPath + 'walk2-3.png')
  ],
  jumpLeft: [
    loadImage(characterPath + 'stay2-1.png'),
    loadImage(characterPath + 'jump2-1.png'),
    loadImage(characterPath + 'jump2-2.png'),
    loadImage(characterPath + 'jump2-3.png')
  ]
};

// 咖啡廳老闆娘 NPC 圖片載入
const cafeNpcPath = 'character/咖啡廳老闆娘/';
const cafeNpcImages = {
  cafe1: loadImage(cafeNpcPath + 'cafe-1.png'),
  cafe2: loadImage(cafeNpcPath + 'cafe-2.png'),
  cafe3: loadImage(cafeNpcPath + 'cafe-3.png'),
  cafe4: loadImage(cafeNpcPath + 'cafe-4.png'),
  cafe5: loadImage(cafeNpcPath + 'cafe-5.png'),
  cafe6: loadImage(cafeNpcPath + 'cafe-6.png'),
  cafe7: loadImage(cafeNpcPath + 'cafe-7.png')
};

// 天才創作家 NPC 圖片載入
const creatorNpcPath = 'character/天才創作家/';
const creatorNpcImages = {
  creator1: loadImage(creatorNpcPath + 'creater-1.png'),
  creator2: loadImage(creatorNpcPath + 'creater-2.png'),
  creator3: loadImage(creatorNpcPath + 'creater-3.png')
};

// 鍵盤輸入狀態（純資料，由 InputManager 更新）
const keys = { w: false, a: false, s: false, d: false, space: false };

const player = {
  x: 50, y: 0,
  width: 38,   // 虛擬寬度（原 48px × 0.8 縮放）
  height: 38,   // 虛擬高度
  vx: 0, vy: 0,
  speed: 1.8,
  gravity: 0.28,
  jumpForce: -5.2,
  isGrounded: false,
  facingRight: false,
  state: 'stay',
  frameIndex: 0,
  ticksPerFrame: 9,  // 動畫切換速率（數字越大越慢）
  tickCount: 0,
  saveTick: 0,       // 存檔計數器

  update() {
    // 非 PLAYING 狀態時凍結所有物理（包含轉場中）
    if (gameState !== 'PLAYING') {
      this.vx = 0; this.vy = 0;
      return;
    }
    // 地圖轉場期間或彈出視窗開啟時，凍結所有移動輸入
    if (mapState.isTransitioning || isAnyModalOpen()) {
      keys.w = keys.a = keys.s = keys.d = keys.space = false;
      this.vx = 0;
      return;
    }

    // 水平移動
    let moveX = 0;
    if (keys.a) { moveX = -this.speed; this.facingRight = false; }
    if (keys.d) { moveX = this.speed; this.facingRight = true; }
    this.vx = moveX;

    // 跳躍（W 或空白鍵）
    if ((keys.w || keys.space) && this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }
    // 快速下墜（S 鍵）
    if (keys.s && !this.isGrounded) this.vy += 1.0;

    // 套用重力並更新位置
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    // X 軸邊界限制
    if (this.x < 0) this.x = 0;
    if (this.x > world.width - this.width) this.x = world.width - this.width;

    // 地圖邊緣觸發切換
    if (!mapState.isTransitioning) {
      if (mapState.current === 'map1.png') {
        if (this.x <= 8 && keys.a) {
          triggerMapTransition('map2.png', 'left');
        } else if (this.x >= world.width - this.width - 8 && keys.d) {
          triggerMapTransition('map3.png', 'right');
        }
      } else if (mapState.current === 'map2.png') {
        if (this.x >= world.width - this.width - 8 && keys.d) {
          triggerMapTransition('map1.png', 'right');
        }
      } else if (mapState.current === 'map3.png') {
        if (this.x <= 8 && keys.a) {
          triggerMapTransition('map1.png', 'left');
        }
      }
    }

    // Y 軸地面碰撞
    const groundLevel = world.groundY - this.height;
    if (this.y >= groundLevel) {
      this.y = groundLevel;
      this.vy = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 更新動作狀態
    if (!this.isGrounded) this.state = 'jump';
    else if (this.vx !== 0) this.state = 'walk';
    else this.state = 'stay';
    this._updateAnimation();

    // 定期存檔（每 60 幀一次，約 1 秒）
    this.saveTick++;
    if (this.saveTick >= 60) {
      this.saveTick = 0;
      saveGameState();
    }
  },

  _updateAnimation() {
    // 跳躍狀態的圖像幀由物理速度 vy 即時決定，不受動畫計數器限制，防範同時按移動與跳躍時出現走路圖幀
    if (this.state === 'jump') {
      if (this.vy < -3) this.frameIndex = 1; // 上升
      else if (this.vy <= 2) this.frameIndex = 2; // 頂點
      else this.frameIndex = 3; // 下落
      this.tickCount = 0; // 重置計數器
      return;
    }

    this.tickCount++;
    if (this.tickCount < this.ticksPerFrame) return;
    this.tickCount = 0;

    if (this.state === 'walk') {
      const frames = this.facingRight ? sprites.walkRight.length : sprites.walkLeft.length;
      this.frameIndex = (this.frameIndex + 1) % frames;
    } else {
      this.frameIndex = 0; // 靜止
    }
  },

  draw() {
    let spr;
    if (this.facingRight) {
      spr = this.state === 'walk' ? sprites.walkRight[this.frameIndex]
        : this.state === 'jump' ? sprites.jumpRight[this.frameIndex]
          : sprites.stayRight;
    } else {
      spr = this.state === 'walk' ? sprites.walkLeft[this.frameIndex]
        : this.state === 'jump' ? sprites.jumpLeft[this.frameIndex]
          : sprites.stayLeft;
    }

    if (spr && spr.complete) {
      ctx.drawImage(spr, this.x - camera.x, this.y - camera.y, this.width, this.height);
    } else {
      // 精靈圖尚未載入時顯示替代色塊
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
    }
  }
};

// 遊戲通用 NPC 類別 (支援自訂圖片資源庫與靜態狀態)
class NPC {
  constructor(rawX, mapName, steps, name = 'NPC', desc = '', imageMap = cafeNpcImages) {
    this.rawX = rawX; // 儲存原始像素 X 座標
    this.x = 0;       // 縮放後的世界座標 X (會在 resetPosition 時更新)
    this.y = 0;
    this.width = 38;
    this.height = 38;
    this.mapName = mapName;
    this.steps = steps;
    this.currentStep = 0;
    this.tickCount = 0;
    this.name = name; // 新增姓名屬性
    this.desc = desc; // 新增描述屬性
    this.imageMap = imageMap; // 新增圖片資源庫參照
  }

  // 根據目前地圖的 scale 來重置世界座標，並重置動作狀態
  resetPosition(scale) {
    this.x = this.rawX * scale;
    this.currentStep = 0;
    this.tickCount = 0;
  }

  update() {
    // 僅在 PLAYING 狀態且玩家身處對應地圖時才更新 NPC
    if (gameState !== 'PLAYING' || mapState.current !== this.mapName) return;

    const step = this.steps[this.currentStep];
    this.x += step.vx;

    // 確保 NPC 貼齊地面
    this.y = world.groundY - this.height;

    // 動作步驟時間狀態轉移，僅當 duration > 0 時才輪替，0 則為手動控制的靜態狀態
    if (step.duration > 0) {
      this.tickCount++;
      const maxTicks = step.duration * 60; // 60 FPS
      if (this.tickCount >= maxTicks) {
        this.tickCount = 0;
        this.currentStep = (this.currentStep + 1) % this.steps.length;
      }
    }
  }

  draw() {
    // 僅在玩家身處對應地圖時才渲染 NPC
    if (mapState.current !== this.mapName) return;

    const step = this.steps[this.currentStep];
    const spr = this.imageMap[step.img]; // 依據各自資源庫抓取圖片

    if (spr && spr.complete) {
      ctx.drawImage(spr, this.x - camera.x, this.y - camera.y, this.width, this.height);
    } else {
      // 載入完成前顯示的粉藍色替代色塊
      ctx.fillStyle = '#00ffcc';
      ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
    }
  }
}

// 咖啡廳老闆娘 NPC 的踱步序列定義
const cafeOwnerSteps = [
  { img: 'cafe1', duration: 4.0, vx: 0 },    // 1. 站著向右停 4s
  { img: 'cafe2', duration: 2.0, vx: 0.3 },  // 2. 向右走一小步慢的 (調整為 0.3，使位移為 +36)
  { img: 'cafe3', duration: 4.0, vx: 0 },    // 3. 站著向右停 4s
  { img: 'cafe4', duration: 2.0, vx: 0 },    // 4. 向左轉身等 2s
  { img: 'cafe5', duration: 2.0, vx: -0.3 }, // 5a. 向左走兩小步慢的 2s (位移為 -36)
  { img: 'cafe7', duration: 2.0, vx: 0 },    // 5b. 向左轉身等 2s
  { img: 'cafe6', duration: 4.0, vx: 0 },    // 6. 站著向左停 4s
  { img: 'cafe1', duration: 1.0, vx: 0 }     // 7. 向右轉身等 1s
];

// 天才創作家靜態狀態序列 (duration: 0 代表手動控制，不自動轉移)
const creatorSteps = [
  { img: 'creator2', duration: 0, vx: 0 }, // 初始形態 (creater-2.png)
  { img: 'creator1', duration: 0, vx: 0 }, // 互動形態1 (主角在左，creater-1.png)
  { img: 'creator3', duration: 0, vx: 0 }  // 互動形態2 (主角在右，creater-3.png)
];

// 全域 NPC 實體陣列
const npcs = [
  new NPC(350, 'map2.png', cafeOwnerSteps, '咖啡廳老闆娘-薇薇安', '黑色的玫瑰刺青紋身，哥德式的侍應服裝，高冷但有自信的女生，個性的穿搭每次都讓人忍不住欣賞她的打扮...', cafeNpcImages),
  new NPC(1275, 'map3.png', creatorSteps, '天才創作家', '看著海的少年？他長著張可愛的娃娃臉，小正太似的，好像在哪裏見過他......', creatorNpcImages)
];

// 將玩家重設到 map1 右側靠邊（面朝左），同時重置地圖狀態
function initPlayerPosition() {
  player.x = world.width - player.width - 60;
  player.y = world.groundY - player.height;
  player.facingRight = false;
  player.vx = 0;
  player.vy = 0;
  mapState.current = 'map1.png';
  bgImage.src = 'map/map1.png';
}

// 儲存遊戲狀態至 localStorage
function saveGameState() {
  if (gameState !== 'PLAYING') return;
  localStorage.setItem('hasSave', 'true');
  localStorage.setItem('lastMap', mapState.current);
  localStorage.setItem('lastPlayerX', Math.round(player.x));
  localStorage.setItem('lastPlayerY', Math.round(player.y));
  localStorage.setItem('lastPlayerFacing', player.facingRight ? 'true' : 'false');
  console.log(`[Save] 位置已儲存: 地圖=${mapState.current}, X=${Math.round(player.x)}, Y=${Math.round(player.y)}`);
}

// 載入存檔並套用
function loadGameState() {
  const hasSave = localStorage.getItem('hasSave') === 'true';
  if (!hasSave) return false;

  const lastMap = localStorage.getItem('lastMap') || 'map1.png';
  const lastX = parseFloat(localStorage.getItem('lastPlayerX'));
  const lastY = parseFloat(localStorage.getItem('lastPlayerY'));
  const facing = localStorage.getItem('lastPlayerFacing') === 'true';

  // 🚀 防禦性安全檢查：防範舊版本 localStorage 快取中含有 NaN 或無效的玩家座標數值
  if (isNaN(lastX) || isNaN(lastY)) {
    console.error('[Save Error] 存檔座標數值無效(NaN)，啟動防禦性重置並取消載入存檔。');
    localStorage.removeItem('hasSave');
    localStorage.removeItem('lastMap');
    localStorage.removeItem('lastPlayerX');
    localStorage.removeItem('lastPlayerY');
    localStorage.removeItem('lastPlayerFacing');
    return false;
  }

  mapState.current = lastMap;
  player.x = lastX;
  player.y = lastY;
  player.facingRight = facing;
  player.vx = 0;
  player.vy = 0;
  console.log(`[Save] 存檔載入成功: 地圖=${lastMap}, X=${lastX}, Y=${lastY}`);
  return true;
}

// ============================================================
// 【第 5 區塊】背景地圖與相機
// ============================================================

// 地圖對應之地點名稱對照表
const mapTitles = {
  'map1.png': '幻城廣場',
  'map2.png': '電氣商街',
  'map3.png': '對白海岸'
};

let locationTimeout = null;

/**
 * 顯示地點名稱 overlay，持續 1.5 秒後套用 CSS 動畫淡出
 * @param {string} mapName - 當前地圖檔名
 */
function showLocationTitle(mapName) {
  const overlay = DOM.locationOverlay || document.getElementById('locationOverlay');
  const titleEl = DOM.locationTitle || document.getElementById('locationTitle');
  if (!overlay || !titleEl) return;

  const title = mapTitles[mapName] || '未知領域';
  titleEl.textContent = title;

  // 清除先前可能存在的定時器與淡出狀態
  if (locationTimeout) clearTimeout(locationTimeout);
  overlay.classList.remove('hidden', 'fade-out');

  // 1.5 秒後套用淡出動畫
  locationTimeout = setTimeout(() => {
    overlay.classList.add('fade-out');
    // 動畫持續 300ms (與 CSS 相同) 後徹底隱藏元件
    locationTimeout = setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('fade-out');
    }, 300);
  }, 1500);
}

const bgImage = new Image();

// 預載入 map3 的前景疊加層圖片，遮擋在角色與 NPC 的前面
const map3FgImage = new Image();
map3FgImage.src = 'map/map3-2.png';

function updateCamera() {
  camera.x = player.x - camera.width / 2 + player.width / 2;
  if (camera.x < 0) camera.x = 0;
  if (camera.x > world.width - camera.width) camera.x = world.width - camera.width;
}

function drawBackground() {
  if (bgImage.complete && bgImage.naturalWidth > 0) {
    const scale = world.height / bgImage.height;
    const drawWidth = bgImage.width * scale;
    ctx.drawImage(bgImage, -camera.x, 0, drawWidth, world.height);
  } else {
    // 地圖尚未載入時填色
    ctx.fillStyle = '#07020d';
    ctx.fillRect(0, 0, camera.width, camera.height);
  }
}

// 劃片轉場切換地圖
function triggerMapTransition(targetMap, direction) {
  if (mapState.isTransitioning) return;
  mapState.isTransitioning = true;

  const overlay = DOM.slideOverlay;
  if (!overlay) {
    // 降級處理：無遮罩 DOM 時直接切換
    bgImage.src = 'map/' + targetMap;
    mapState.current = targetMap;
    mapState.isTransitioning = false;
    return;
  }

  // 1. 黑屏滑入
  overlay.className = 'slide-transition-overlay slide-in';

  setTimeout(() => {
    // 2. 切換地圖並調整玩家起始位置
    bgImage.src = 'map/' + targetMap;
    mapState.current = targetMap;
    player.x = direction === 'left'
      ? world.width - player.width - 20  // 進入新地圖的右側
      : 20;                              // 進入新地圖的左側

    // 3. 黑屏滑出
    overlay.className = 'slide-transition-overlay slide-out';

    setTimeout(() => {
      overlay.className = 'slide-transition-overlay';
      mapState.isTransitioning = false;
      saveGameState(); // 轉場完成後立刻存檔
      showLocationTitle(targetMap); // 轉場完成後，顯示新地點名稱
    }, 500);
  }, 500);
}

// ============================================================
// 【第 6 區塊】狀態機核心
// ============================================================

// 當前遊戲狀態（唯一真相來源）
// 可能的值：'LOADING' | 'START' | 'PROLOGUE' | 'PLAYING'
let gameState = 'LOADING';

/**
 * 唯一的狀態轉換入口。
 * 所有 BGM 切換、UI 顯示/隱藏都集中於此，外部不直接操作 DOM 狀態。
 */
function setState(newState) {
  console.log(`[GameState] ${gameState} → ${newState}`);
  gameState = newState;

  switch (newState) {
    case 'START':
      // 確保序章與其他道具按鈕隱藏，顯示開始畫面及音樂按鈕，播放開始畫面音樂
      UIManager.hide(DOM.prologueScreen);
      UIManager.show(DOM.earpodBtn);
      UIManager.hide(DOM.ieyeBtn);
      UIManager.hide(DOM.notebookBtn);
      UIManager.showStart();
      AudioManager.playGameBGM();
      break;

    case 'PROLOGUE':
      // 隱藏開始畫面與道具按鈕，顯示序章，切換為序章 BGM
      UIManager.hideStart();
      UIManager.hide(DOM.earpodBtn);
      UIManager.hide(DOM.ieyeBtn);
      UIManager.hide(DOM.notebookBtn);
      UIManager.show(DOM.prologueScreen);
      console.log('[Debug PROLOGUE] prologueScreen DOM:', DOM.prologueScreen, 'Classes:', DOM.prologueScreen ? DOM.prologueScreen.className : 'null');
      AudioManager.playPrologueBGM();
      break;

    case 'PLAYING':
      // 隱藏所有 UI 覆蓋層，顯示道具按鈕，切換為遊戲 BGM，開始渲染遊戲畫面
      UIManager.hideStart();
      UIManager.hide(DOM.prologueScreen);
      UIManager.show(DOM.earpodBtn);
      UIManager.show(DOM.ieyeBtn);
      UIManager.show(DOM.notebookBtn);
      UIManager.hide(DOM.aigcModal);

      // 復原 Canvas 與互動 Modal 狀態
      if (DOM.gameCanvas) DOM.gameCanvas.classList.remove('shifted-up');
      if (DOM.interactionModal) DOM.interactionModal.classList.remove('active');

      AudioManager.playGameBGM();
      showLocationTitle(mapState.current); // 進入遊玩狀態時，顯示當前地點名稱
      break;

    case 'INTERACTION':
      // 隱藏所有道具按鈕與 AIGC 工具庫
      UIManager.hide(DOM.earpodBtn);
      UIManager.hide(DOM.ieyeBtn);
      UIManager.hide(DOM.notebookBtn);
      UIManager.hide(DOM.aigcModal);

      // 平移 Canvas 向上，並顯示互動 Modal
      if (DOM.gameCanvas) DOM.gameCanvas.classList.add('shifted-up');
      if (DOM.interactionModal) DOM.interactionModal.classList.add('active');
      break;
  }
}

// ============================================================
// 【第 7 區塊】序章管理器 PrologueManager
// ============================================================

const PrologueManager = {
  sceneIdx: 0,
  lineIdx: -1,  // -1 表示正在展示插畫，等待按鍵後才開始對話
  isTyping: false,
  typeTimer: null,
  charIdx: 0,
  segments: [],
  _fromReview: false, // 是否為劇情回顧模式（不重置玩家位置）
  transitionLock: false, // 🚀 防連點冷卻鎖，確保插畫能停留一段時間

  /**
   * 唯一入口：開始播放指定場景的序章。
   * @param {number} startSceneIdx - 起始場景索引（預設 0）
   * @param {boolean} fromReview   - true = 劇情回顧，結束後不重設玩家位置
   */
  start(startSceneIdx = 0, fromReview = false) {
    this._fromReview = fromReview;
    this.sceneIdx = startSceneIdx;
    this.lineIdx = -1; // -1 表示正在展示插畫，等待按鍵後才開始對話
    clearTimeout(this.typeTimer);
    this.isTyping = false;

    // 切換至 PROLOGUE 狀態（由 setState 統一處理 UI 與 BGM）
    setState('PROLOGUE');

    // 重置跳過按鈕（複製節點避免重複綁定舊事件）
    if (DOM.prologueSkipBtn) {
      const newBtn = DOM.prologueSkipBtn.cloneNode(true);
      DOM.prologueSkipBtn.parentNode.replaceChild(newBtn, DOM.prologueSkipBtn);
      DOM.prologueSkipBtn = newBtn;
      DOM.prologueSkipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._end();
      });
    }

    this._loadSceneOnly();
  },

  // 只顯示插畫與場景標籤，隱藏對話框，等待玩家按鍵觸發對話
  _loadSceneOnly() {
    // 設置 1000 毫秒冷卻鎖，防範玩家因過度連點而意外跳過插圖展示
    this.transitionLock = true;
    setTimeout(() => {
      this.transitionLock = false;
    }, 1000);

    const scene = prologueData[this.sceneIdx];
    console.log(`[Prologue] 展示場景插圖 index=${this.sceneIdx}, 圖片路徑=${scene.bg}`);

    // 更新玩家經歷過的最大劇情場景進度
    const currentMax = parseInt(localStorage.getItem('maxStoryScene') || 3, 10);
    if (this.sceneIdx > currentMax) {
      localStorage.setItem('maxStoryScene', this.sceneIdx);
      console.log(`[Story Progress] 已解鎖劇情回顧 Scene 索引: ${this.sceneIdx} (${scene.id})`);
    }

    if (DOM.prologueBg) {
      // 強制重播 CSS 淡入動畫（透過 reflow 重置）
      DOM.prologueBg.style.animation = 'none';
      void DOM.prologueBg.offsetWidth;
      DOM.prologueBg.style.animation = '';
      DOM.prologueBg.style.backgroundImage = `url('${scene.bg}')`;

      // 判斷並設定背景暗色濾鏡
      if (scene.darkFilter) {
        DOM.prologueBg.classList.add('dark-bg');
      } else {
        DOM.prologueBg.classList.remove('dark-bg');
      }

      // 建立輔助圖片物件進行預載入檢測與錯誤攔截，便於開發除錯
      const imgTest = new Image();
      imgTest.onload = () => console.log(`[Prologue] 圖片載入成功: ${scene.bg}`);
      imgTest.onerror = (err) => console.error(`[Prologue] 圖片載入失敗，請檢查路徑與 CSP 限制: ${scene.bg}`, err);
      imgTest.src = scene.bg;
    }
    if (DOM.prologueSceneTag) DOM.prologueSceneTag.textContent = scene.id;

    // 隱藏對話框與 CRT 濾鏡
    if (DOM.prologueTextbox) DOM.prologueTextbox.classList.add('hidden-box');
    if (DOM.prologueTechFilter) DOM.prologueTechFilter.classList.add('hidden-filter');
    if (DOM.prologueText) DOM.prologueText.innerHTML = '';
    if (DOM.prologueNextHint) DOM.prologueNextHint.style.opacity = '0';
    this.isTyping = false;
  },

  // 顯示對話框並開始逐字打印當前行
  _showLine() {
    if (DOM.prologueTextbox) DOM.prologueTextbox.classList.remove('hidden-box');
    if (DOM.prologueTechFilter) DOM.prologueTechFilter.classList.remove('hidden-filter');

    const line = prologueData[this.sceneIdx].lines[this.lineIdx];

    // 1. 偵測說話者與字串預處理
    let speaker = '';
    let processedLine = line;
    let speakerRole = ''; // 'sakura' | 'vivian'

    if (line.startsWith('薇薇安：「')) {
      speaker = '薇薇安';
      speakerRole = 'vivian';
      processedLine = '「' + line.slice(5); // 替換 '薇薇安：「' 為 '「'
    } else if (line.startsWith('小櫻：「')) {
      speaker = '小櫻';
      speakerRole = 'sakura';
      processedLine = '「' + line.slice(4); // 替換 '小櫻：「' 為 '「'
    }

    // 2. 更新 Speaker UI 標籤
    if (DOM.prologueSpeaker) {
      if (speaker) {
        DOM.prologueSpeaker.textContent = speaker;
        DOM.prologueSpeaker.className = `prologue-speaker ${speakerRole}`;
      } else {
        DOM.prologueSpeaker.textContent = '';
        DOM.prologueSpeaker.className = 'prologue-speaker hidden';
      }
    }

    this.segments = _parseSegments(processedLine, speakerRole || 'normal');
    this.charIdx = 0;
    this.isTyping = true;
    if (DOM.prologueNextHint) DOM.prologueNextHint.style.opacity = '0';
    this._typeNext();
  },

  // 逐字打印動畫
  _typeNext() {
    const total = this.segments.reduce((s, x) => s + x.t.length, 0);
    if (this.charIdx >= total) {
      this.isTyping = false;
      if (DOM.prologueNextHint) DOM.prologueNextHint.style.opacity = '1';
      return;
    }
    this.charIdx++;
    if (DOM.prologueText) DOM.prologueText.innerHTML = _buildHTML(this.segments, this.charIdx);
    this.typeTimer = setTimeout(() => this._typeNext(), 38);
  },

  // 立即顯示整行文字（跳過打印動畫）
  _complete() {
    clearTimeout(this.typeTimer);
    const total = this.segments.reduce((s, x) => s + x.t.length, 0);
    if (DOM.prologueText) DOM.prologueText.innerHTML = _buildHTML(this.segments, total);
    this.isTyping = false;
    if (DOM.prologueNextHint) DOM.prologueNextHint.style.opacity = '1';
  },

  // 推進序章（由空白鍵或點擊觸發）
  advance() {
    if (gameState !== 'PROLOGUE') return;
    if (this.transitionLock) return; // 冷卻鎖定期間，忽略玩家推進劇情的按鍵/點擊

    // 若正在打字，立即完成當前行
    if (this.isTyping) { this._complete(); return; }

    // 若處於插畫等待狀態，載入第一行對話
    if (this.lineIdx === -1) {
      this.lineIdx = 0;
      this._showLine();
      return;
    }

    // 前往下一行
    this.lineIdx++;
    const scene = prologueData[this.sceneIdx];

    if (this.lineIdx >= scene.lines.length) {
      // 當前場景文字播完，切換到下一場景

      // 若剛播完的是序章最後一個場景 (Scene 0-4，即 index 3)，則結束序章，不自動切換到第一章
      if (this.sceneIdx === 3) {
        this._end();
        return;
      }

      const nextIdx = this.sceneIdx + 1;
      if (nextIdx >= prologueData.length) {
        // 所有場景播完，結束序章
        this._end();
        return;
      }
      this.sceneIdx = nextIdx; // 🚀 更新場景索引為下一個場景
      this.lineIdx = -1; // 切換場景時，重置為 -1 以展示圖片並等待按鍵
      this._loadSceneOnly();
    } else {
      this._showLine();
    }
  },

  // 結束序章（完整播完或 SKIP）
  _end() {
    localStorage.setItem('hasPlayed', 'true');
    clearTimeout(this.typeTimer);

    if (!DOM.prologueScreen) { setState('PLAYING'); return; }

    // 播放淡出動畫後切換狀態
    DOM.prologueScreen.classList.add('ending');
    setTimeout(() => {
      DOM.prologueScreen.classList.remove('ending');

      // 如果剛播完的是第一章結局 (sceneIdx 為 10，即 Scene 1-5)
      if (this.sceneIdx === 10) {
        // 解鎖秘籍
        const rtfTip = notebookTips.find(t => t.id === '001');
        if (rtfTip) rtfTip.unlocked = true;

        const designTip = notebookTips.find(t => t.id === '002');
        if (designTip) designTip.unlocked = true;

        // 解鎖 AIGC 工具：ChatGPT (1), Midjourney (2), Canva (3), Nano banana (7)
        const toolsToUnlock = ['1', '2', '3', '7'];
        toolsToUnlock.forEach(id => {
          const tool = aigcToolsData.find(t => t.id === id);
          if (tool) tool.unlocked = true;
        });

        // 寫入第一章通關存檔標記，配合主線與回顧分離機制
        localStorage.setItem('hasPlayedChapter1', 'true');
        console.log('[System] 第一章通關成功，已寫入 hasPlayedChapter1 = true');

        console.log('[System] 已成功解鎖秘籍 #001 (RTF 溝通框架)、秘籍 #002 (Nano banana x Canva) 與 AIGC 工具：ChatGPT、Midjourney、Canva、Nano banana！');
        showUnlockNotification('🎉 恭喜！已解鎖新秘籍「RTF 溝通框架」、「Nano banana x Canva」與 AIGC 工具：ChatGPT、Midjourney、Canva、Nano banana！<br><br><b>感謝遊玩，後續將儘快更新遊戲內容，讓你跟上科技hyper化的千禧世代！</b>');
        saveUnlockState();
      }

      // 根據使用者要求，通關後玩家位置保留在原位，不執行重置回 map1
      setState('PLAYING');
    }, 300); // 🚀 縮短為 300 毫秒淡出時間，加速跳過體驗
  }
};

// 序章與劇情文字解析輔助函式（支援雙角色分色與高亮解析）
function _parseSegments(rawText, roleType = 'normal') {
  const segs = [];
  const contentText = rawText;

  // 接著解析內容中的 ** 粗體
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(contentText)) !== null) {
    if (m.index > last) {
      segs.push({ t: contentText.slice(last, m.index), role: roleType + '-text' });
    }
    segs.push({ t: m[1], role: roleType + '-highlight' });
    last = m.index + m[0].length;
  }
  if (last < contentText.length) {
    segs.push({ t: contentText.slice(last), role: roleType + '-text' });
  }
  return segs;
}

// 依已顯示字數建立帶有角色發光色彩的 HTML 結構
function _buildHTML(segs, charCount) {
  let html = '', rem = charCount;
  for (const s of segs) {
    if (rem <= 0) break;
    const vis = s.t.slice(0, rem);

    if (s.role === 'vivian-name') {
      html += `<span class="dialogue-vivian-name">${vis}</span>`;
    } else if (s.role === 'vivian-text') {
      html += `<span class="dialogue-vivian-text">${vis}</span>`;
    } else if (s.role === 'vivian-highlight') {
      html += `<span class="dialogue-vivian-highlight">${vis}</span>`;
    } else if (s.role === 'sakura-name') {
      html += `<span class="dialogue-sakura-name">${vis}</span>`;
    } else if (s.role === 'sakura-text') {
      html += `<span class="dialogue-sakura-text">${vis}</span>`;
    } else if (s.role === 'sakura-highlight') {
      html += `<span class="dialogue-sakura-highlight">${vis}</span>`;
    } else if (s.role === 'normal-highlight') {
      html += `<span class="prologue-highlight">${vis}</span>`;
    } else {
      // normal-text 或普通旁白
      html += vis;
    }

    rem -= s.t.length;
  }
  return html;
}

// ============================================================
// 劇情回顧動態渲染邏輯
// ============================================================
function renderStoryList() {
  const grid = DOM.storyListModal ? DOM.storyListModal.querySelector('.story-list-grid') : null;
  if (!grid) return;
  grid.innerHTML = '';

  const maxStoryScene = parseInt(localStorage.getItem('maxStoryScene') || 3, 10);

  prologueData.forEach((scene, index) => {
    const isUnlocked = index <= maxStoryScene;
    const btn = document.createElement('button');

    if (isUnlocked) {
      btn.className = 'story-list-item';
      btn.setAttribute('data-scene', index);
      btn.innerHTML = `
        <span class="story-item-tag">${scene.id}</span>
        <span class="story-item-title">${scene.title}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        UIManager.hide(DOM.storyListModal);
        localStorage.setItem('hasPlayed', 'true');
        PrologueManager.start(index, true); // fromReview = true
      });
    } else {
      btn.className = 'story-list-item locked';
      btn.disabled = true;
      btn.innerHTML = `
        <span class="story-item-tag" style="color: #666; text-shadow: none;">${scene.id}</span>
        <span class="story-item-title" style="color: #444;">🔒 尚未經歷此劇情</span>
      `;
    }
    grid.appendChild(btn);
  });
}

// ============================================================
// 筆記本秘籍資料與渲染邏輯
// ============================================================

const notebookTips = [
  { id: '001', label: '秘籍 #001', text: '「RTF 溝通框架」：Role 角色設定、Task 任務目標、Format 輸出格式。', unlocked: false },
  { id: '002', label: '秘籍 #002', text: '「Nano banana x Canva」：用 Nano banana 生成圖像，再用 Canva 的 Magic Layer 把 AI 生成圖像當中的物件分割出來。', unlocked: false }
];

let currentNotebookPage = 0;
const TIPS_PER_PAGE = 4; // 每頁顯示 4 條

function renderNotebookPage() {
  if (!DOM.notebookPageContent) return;

  const totalPages = Math.ceil(notebookTips.length / TIPS_PER_PAGE);
  if (currentNotebookPage < 0) currentNotebookPage = 0;
  if (currentNotebookPage >= totalPages) currentNotebookPage = totalPages - 1;

  const startIndex = currentNotebookPage * TIPS_PER_PAGE;
  const endIndex = Math.min(startIndex + TIPS_PER_PAGE, notebookTips.length);
  const pageTips = notebookTips.slice(startIndex, endIndex);

  let html = '';
  pageTips.forEach(tip => {
    if (tip.unlocked) {
      html += `
        <div class="notebook-tip-card">
          <div class="tip-card-icon">💡</div>
          <div class="tip-card-content">
            <span class="tip-card-label">${tip.label}</span>
            <span class="tip-card-text">${tip.text}</span>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="notebook-tip-card locked">
          <div class="tip-card-icon">🔒</div>
          <div class="tip-card-content">
            <span class="tip-card-label">${tip.label}</span>
            <span class="tip-card-text">尚未解鎖</span>
          </div>
        </div>
      `;
    }
  });

  DOM.notebookPageContent.innerHTML = html;

  if (DOM.notebookPrevBtn) {
    DOM.notebookPrevBtn.disabled = (currentNotebookPage === 0);
  }
  if (DOM.notebookNextBtn) {
    DOM.notebookNextBtn.disabled = (currentNotebookPage === totalPages - 1);
  }
}

// ============================================================
// AIGC 工具庫資料與渲染邏輯
// ============================================================

const aigcToolsData = [
  { id: '1', name: 'ChatGPT(多模態)', url: 'https://chatgpt.com', icon: 'https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com', unlocked: false },
  { id: '2', name: 'Midjourney(平面設計)', url: 'https://www.midjourney.com', icon: 'https://www.google.com/s2/favicons?sz=64&domain=midjourney.com', unlocked: false },
  { id: '3', name: 'Canva(平面設計)', url: 'https://www.canva.com', icon: 'https://www.google.com/s2/favicons?sz=64&domain=canva.com', unlocked: false },
  { id: '7', name: 'Nano banana(圖像生成)', url: 'https://labs.google/fx/tools/flow', icon: 'https://www.google.com/s2/favicons?sz=64&domain=google.com', unlocked: false },
  { id: '4', name: 'Claude', url: 'https://claude.ai', icon: 'https://www.google.com/s2/favicons?sz=64&domain=claude.ai', unlocked: false },
  { id: '5', name: 'Suno', url: 'https://suno.com', icon: 'https://www.google.com/s2/favicons?sz=64&domain=suno.com', unlocked: false },
  { id: '6', name: 'Runway', url: 'https://runwayml.com', icon: 'https://www.google.com/s2/favicons?sz=64&domain=runwayml.com', unlocked: false }
];

// 載入解鎖狀態（從 localStorage 載入已收集的秘笈與工具）
function loadUnlockState() {
  try {
    const unlockedTools = JSON.parse(localStorage.getItem('unlockedTools') || '[]');
    const unlockedTips = JSON.parse(localStorage.getItem('unlockedTips') || '[]');
    
    unlockedTools.forEach(id => {
      const tool = aigcToolsData.find(t => t.id === id);
      if (tool) tool.unlocked = true;
    });
    
    unlockedTips.forEach(id => {
      const tip = notebookTips.find(t => t.id === id);
      if (tip) tip.unlocked = true;
    });
    console.log('[Init] 成功載入已收集的 AIGC 工具與秘笈進度。');
  } catch (e) {
    console.error('[Init Error] 載入解鎖狀態失敗:', e);
  }
}

// 儲存解鎖狀態到 localStorage
function saveUnlockState() {
  try {
    const unlockedTools = aigcToolsData.filter(t => t.unlocked).map(t => t.id);
    const unlockedTips = notebookTips.filter(t => t.unlocked).map(t => t.id);
    
    localStorage.setItem('unlockedTools', JSON.stringify(unlockedTools));
    localStorage.setItem('unlockedTips', JSON.stringify(unlockedTips));
    console.log('[Save] 已收集的 AIGC 工具與秘笈進度已儲存。');
  } catch (e) {
    console.error('[Save Error] 儲存解鎖狀態失敗:', e);
  }
}

// 載入持久化解鎖狀態
loadUnlockState();

function renderAigcGrid() {
  const grid = DOM.aigcGrid;
  if (!grid) return;
  grid.innerHTML = '';

  aigcToolsData.forEach(tool => {
    if (tool.unlocked) {
      const a = document.createElement('a');
      a.className = 'aigc-item';
      a.href = tool.url;
      a.target = '_blank';

      // 防止超連結冒泡點擊事件干擾 Canvas
      a.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      a.innerHTML = `
        <img src="${tool.icon}" alt="${tool.name}" class="aigc-icon">
        <span class="aigc-label">${tool.name}</span>
      `;
      grid.appendChild(a);
    } else {
      const div = document.createElement('div');
      div.className = 'aigc-item locked';
      div.innerHTML = `
        <span style="font-size: 1.2rem; margin-bottom: 4px;">🔒</span>
        <span class="aigc-label">未解鎖</span>
      `;
      grid.appendChild(div);
    }
  });
}

// ============================================================
// 圖鑑資料與渲染邏輯
// ============================================================

const guideData = {
  items: [
    {
      name: 'IEYE',
      icon: 'item/IEYE.png',
      desc: '智慧隱形眼鏡，支援 HUD 抬頭顯示器、劇情回顧、AIGC 工具庫與圖鑑功能。',
      detail: '「IEYE 智慧隱形眼鏡」是千禧幻城的頂尖穿戴式裝備，擁有精緻的眼球虹膜開啟動畫與科技感十足的 HUD 抬頭顯示面板。\n\n【核心功能】\n1. 回到開始頁面：隨時保存目前進度並返回起點。\n2. 劇情回顧：查看與重溫已經解鎖的所有故事場景。\n3. AIGC 工具庫：收納解鎖後的 ChatGPT、Midjourney、Canva 與 Nano banana 等實用 AI 工具。\n4. 圖鑑：查閱城市中的物件與地標故事。'
    },
    {
      name: 'IEarPod',
      icon: 'item/earpod.png',
      desc: '高科技藍牙耳機，點擊左下角耳機，可以切換城市漫步音樂！',
      detail: '小櫻佩戴的無線藍牙耳機，具備「通透模式」與「陪伴降噪」功能，能將外界的城市喧囂轉化為治癒的音樂背景。\n\n【核心功能】\n點擊遊戲畫面左下角的耳機圖示，即可展開精緻的音樂播放面板。支持播放、暫停、曲目切換（如招牌曲目《AI 說要 City Walk》、《AI 說要 play game!》），並配備無段式音量滑桿。在漫步時提供滿滿的節奏律動感與情感支持。'
    },
    {
      name: '筆記本',
      icon: 'item/Note.png',
      desc: '記錄了各種冒險過程解鎖的秘籍。可以隨時點擊正下方的筆記本按鈕進行查閱。',
      detail: '小櫻隨身攜帶的粉紅色像素風格手帳。原本是空無一頁的全新筆記本，在踏出防盜門的外出之旅中，逐漸填滿了小櫻的創作靈感。\n\n【核心功能】\n點擊畫面底部的筆記本按鈕即可翻開手帳。手帳記錄了小櫻向薇薇安等 NPC 學習到的 AIGC 工具秘笈。第一章通關後將解鎖「秘籍 #001：RTF 溝通框架」與「秘籍 #002：Nano banana x Canva」。支持精緻的像素風翻頁與雙頁檢視。'
    }
  ],
  places: [
    {
      name: '金字塔式噴水池',
      icon: 'item/建築地標/建築1.png',
      desc: '傾瀉而下的水像數據流一樣流光溢彩，搭配一層又一層的玻璃，映射出幾何美學下的折射與色彩變幻。',
      detail: '這是位於小櫻公寓樓下標誌性的超現實地標。噴水池採用前衛的幾何玻璃塔身，傾瀉而下的水流五彩斑斕，如同流動的光陰與繽紛的數據流（Data Stream），隨時間流逝折射出夢幻般的色彩。\n\n【劇情背景】\n當小櫻遭遇連續 100 次落選、感到前途暗淡而決定出門散步時，這座噴水池是她見到的第一個地標。雖然因為從小看到大而有些視覺疲勞，但在她最失落的這一天，水流的變幻和光彩依舊在無聲地陪伴著她。'
    },
    {
      name: 'NEON BEAN CAFE',
      icon: 'item/建築地標/建築2.png',
      desc: '薇薇安經營的個性咖啡廳，也是玩家經常光顧的放鬆場所。',
      detail: '位於商店街街尾，是一間充滿 Hyperpop 與 Dreamcore 霓虹美學的溫馨咖啡廳。店內設有靠窗露台的木桌，提供小櫻最愛的草莓蛋糕，是她寫作與思考時不可或缺的據點。\n\n【劇情背景】\n這裡是「第 101 次委託的起點」。在小櫻因接連落選而陷入重度自我懷疑時，薇薇安在這裡委託她幫新推出的夏日特調（如「芒星火山」、「雲朵大炮」）起名，以打破失意死循環，並提供豐盛晚餐與粉紅糖漿雕花咖啡作為報酬。薇薇安也在這裡向小櫻傳授了使用 Nano banana 生成插畫與 Canva 摳圖的技術，並分享了 ChatGPT 的「RTF 溝通框架」技巧，點亮了小櫻未來的創作方向。'
    }
  ]
};

function renderGuideContent(tab) {
  if (!DOM.guideListContainer) return;
  const list = guideData[tab] || [];
  
  DOM.guideListContainer.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'guide-card';
    card.innerHTML = `
      <img class="guide-card-icon" src="${item.icon}" alt="${item.name}">
      <div class="guide-card-info">
        <div class="guide-card-name">${item.name}</div>
        <div class="guide-card-desc">${item.desc}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      openGuideDetailModal(item);
    });
    DOM.guideListContainer.appendChild(card);
  });
}

// 顯示獨立的圖鑑詳細資訊大彈窗
function openGuideDetailModal(item) {
  if (!DOM.guideDetailModal) return;
  
  // 填入詳細資料
  if (DOM.modalDetailIcon) DOM.modalDetailIcon.src = item.icon;
  if (DOM.modalDetailName) DOM.modalDetailName.textContent = item.name;
  if (DOM.modalDetailDesc) DOM.modalDetailDesc.textContent = item.desc;
  if (DOM.modalDetailStory) {
    // 處理換行字元 \n 為 HTML <br>
    DOM.modalDetailStory.innerHTML = item.detail ? item.detail.replace(/\n/g, '<br>') : '';
  }
  
  // 顯示 Modal
  UIManager.show(DOM.guideDetailModal);
}

// 關閉獨立的圖鑑詳細資訊大彈窗
function closeGuideDetailModal() {
  if (!DOM.guideDetailModal) return;
  UIManager.hide(DOM.guideDetailModal);
}

// 顯示自訂解鎖通知，若 DOM 不存在則降級使用原生 alert
function showUnlockNotification(message) {
  if (!DOM.notificationModal || !DOM.notificationBody) {
    alert(message);
    return;
  }
  DOM.notificationBody.innerHTML = message;
  UIManager.show(DOM.notificationModal);
}

// ============================================================
// NPC 接近偵測與互動對話系統
// ============================================================

let activeNpc = null;

// 偵測玩家與相同地圖 NPC 的距離
function checkNpcProximity() {
  activeNpc = null;
  if (gameState !== 'PLAYING') return;

  const proxLimit = 60; // 60 像素的接近範圍
  for (const npc of npcs) {
    if (npc.mapName === mapState.current) {
      const dist = Math.abs((player.x + player.width / 2) - (npc.x + npc.width / 2));
      if (dist < proxLimit) {
        activeNpc = npc;
        break; // 每次只與一位 NPC 互動
      }
    }
  }
}

// 在 NPC 頭頂上方 15 像素處繪製半透明提示框
function drawInteractionPrompt() {
  if (!activeNpc) return;

  const text = '按E開始互動';
  ctx.font = '6px "zpix", monospace'; // 配合像素風格使用 zpix 字體，調小至 6px
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const textWidth = ctx.measureText(text).width;
  const paddingX = 3; // 4 改為 3
  const paddingY = 2; // 3 改為 2
  const rectW = textWidth + paddingX * 2;
  const rectH = 9; // 12 改為 9

  // 計算提示框在世界座標中的位置（稍微更貼近 NPC 頭頂）
  const rectX = activeNpc.x + activeNpc.width / 2 - rectW / 2;
  const rectY = activeNpc.y - rectH - 4;

  // 繪製背景與邊框
  ctx.fillStyle = 'rgba(7, 2, 13, 0.7)'; // 深色半透明
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // 霓虹青邊框
  ctx.lineWidth = 0.8; // 框線變細為 0.8

  drawRoundRect(ctx, rectX - camera.x, rectY - camera.y, rectW, rectH, 1.5); // 圓角半徑縮小為 1.5

  // 繪製文字
  ctx.fillStyle = '#00ffff'; // 霓虹青文字
  ctx.fillText(text, rectX - camera.x + rectW / 2, rectY - camera.y + rectH / 2);
}

// 繪製圓角矩形輔助函式
function drawRoundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// 開始互動 POV 模式
function startInteraction(npc) {
  // 強制玩家與 NPC 朝向彼此面對面
  if (player.x < npc.x) {
    player.facingRight = true;
  } else {
    player.facingRight = false;
  }

  // 停止玩家物理速度並重置按鍵
  player.vx = 0;
  player.vy = 0;
  keys.w = keys.a = keys.s = keys.d = keys.space = false;

  // 強制 NPC 面對玩家
  if (npc.name === '咖啡廳老闆娘-薇薇安') {
    if (player.x < npc.x) {
      // 玩家在 left，老闆娘在 right，老闆娘要朝 left (cafe6 為朝 left 站立幀)
      const leftStepIdx = cafeOwnerSteps.findIndex(s => s.img === 'cafe6');
      if (leftStepIdx !== -1) npc.currentStep = leftStepIdx;
    } else {
      // 玩家在 right，老闆娘在 left，老闆娘要朝 right (cafe1 為朝 right 站立幀)
      const rightStepIdx = cafeOwnerSteps.findIndex(s => s.img === 'cafe1');
      if (rightStepIdx !== -1) npc.currentStep = rightStepIdx;
    }
  } else if (npc.name === '天才創作家') {
    if (player.x <= npc.x) {
      // 主角在天才創作家同一位置或左邊：切換為 creator1 (creater-1.png)
      const stepIdx = creatorSteps.findIndex(s => s.img === 'creator1');
      if (stepIdx !== -1) npc.currentStep = stepIdx;
    } else {
      // 主角在天才創作家右邊：切換為 creator3 (creater-3.png)
      const stepIdx = creatorSteps.findIndex(s => s.img === 'creator3');
      if (stepIdx !== -1) npc.currentStep = stepIdx;
    }
  }

  setState('INTERACTION');

  // 設定對話面板名稱與初始對話
  if (DOM.interactionNpcName) {
    if (npc.name === '天才創作家' && !localStorage.getItem('hasCreatorStory')) {
      DOM.interactionNpcName.textContent = '？？？';
    } else {
      DOM.interactionNpcName.textContent = npc.name;
    }
  }
  showDialogue(npc, 'init');
}

// 依據狀態渲染對話內容與多個選項
function showDialogue(npc, stateName) {
  if (!DOM.interactionDialogue || !DOM.interactionOptions) return;

  DOM.interactionOptions.innerHTML = '';

  if (npc.name === '咖啡廳老闆娘-薇薇安') {
    if (stateName === 'init') {
      DOM.interactionDialogue.textContent = '黑色的玫瑰刺青紋身，哥德式的侍應服裝，高冷但有自信的女生，個性的穿搭每次都讓人忍不住欣賞她的打扮...';

      const options = [];
      // 只有在未通關第一章時，才顯示主線劇情選項；通關後永久隱藏此主線選項（主線與回顧分離機制）
      if (localStorage.getItem('hasPlayedChapter1') !== 'true') {
        options.push({
          text: '(那是我經常去的咖啡廳...)',
          next: 'cafe_option'
        });
      }
      options.push({
        text: '只是隨便走走。',
        next: 'just_walking'
      });

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'interaction-option-btn';
        btn.textContent = opt.text;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opt.next === 'cafe_option') {
            endInteraction();
            PrologueManager.start(4, false); // fromReview = false，通關第一章結局後正確重置玩家到 map1 右側，避免卡死在 map2
          } else {
            showDialogue(npc, opt.next);
          }
        });
        DOM.interactionOptions.appendChild(btn);
      });
    } else if (stateName === 'just_walking') {
      DOM.interactionDialogue.textContent = '記得要多補充水分及糖分！這邊會永遠為你保留你最喜歡的草莓蛋糕喲~';

      const btn = document.createElement('button');
      btn.className = 'interaction-option-btn';
      btn.textContent = '[結束對話]';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        endInteraction();
      });
      DOM.interactionOptions.appendChild(btn);
    }
  } else if (npc.name === '天才創作家') {
    if (stateName === 'init') {
      DOM.interactionDialogue.textContent = '「看著海的少年？他長著張可愛的娃娃臉，小正太似的，好像在哪裏見過他......」';

      const btn = document.createElement('button');
      btn.className = 'interaction-option-btn';
      btn.textContent = '[結束對話]';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        endInteraction();
      });
      DOM.interactionOptions.appendChild(btn);
    }
  }
}

// 結束互動並恢復漫步模式
function endInteraction() {
  if (activeNpc && activeNpc.name === '天才創作家') {
    // 恢復為 creator2 (creater-2.png) 初始靜止形態
    const stepIdx = activeNpc.steps.findIndex(s => s.img === 'creator2');
    if (stepIdx !== -1) activeNpc.currentStep = stepIdx;
  }
  setState('PLAYING');
}

// ============================================================
// 【第 8 區塊】UI 管理器 UIManager
// ============================================================

const UIManager = {
  // 通用顯示/隱藏（統一使用 classList，不混用 style.display）
  show(el) { if (el) el.classList.remove('hidden'); },
  hide(el) { if (el) el.classList.add('hidden'); },

  showStart() { this.show(DOM.startScreen); },
  hideStart() { this.hide(DOM.startScreen); },

  // 開啟 IEYE（重啟開眼動畫）
  openIeye() {
    if (!DOM.ieyeModal) return;
    DOM.ieyeModal.classList.remove('hidden', 'closing');
    const iris = DOM.ieyeModal.querySelector('.ieye-iris');
    const hud = DOM.ieyeModal.querySelector('.ieye-hud');
    if (iris) { iris.style.animation = 'none'; void iris.offsetWidth; iris.style.animation = ''; }
    if (hud) { hud.style.animation = 'none'; void hud.offsetWidth; hud.style.animation = ''; }
  },

  // 關閉 IEYE（播放閉眼動畫後再隱藏）
  closeIeye() {
    if (!DOM.ieyeModal) return;
    DOM.ieyeModal.classList.add('closing');
    setTimeout(() => {
      DOM.ieyeModal.classList.add('hidden');
      DOM.ieyeModal.classList.remove('closing');
    }, 450);
  }
};

// 檢查是否有任何彈出視窗（說明、耳機播放清單、IEYE、序章回顾、筆記本、AIGC工具庫）開啟中
function isAnyModalOpen() {
  return (DOM.helpModal && !DOM.helpModal.classList.contains('hidden')) ||
    (DOM.playlistModal && !DOM.playlistModal.classList.contains('hidden')) ||
    (DOM.ieyeModal && !DOM.ieyeModal.classList.contains('hidden')) ||
    (DOM.storyListModal && !DOM.storyListModal.classList.contains('hidden')) ||
    (DOM.notebookModal && !DOM.notebookModal.classList.contains('hidden')) ||
    (DOM.aigcModal && !DOM.aigcModal.classList.contains('hidden')) ||
    (DOM.guideModal && !DOM.guideModal.classList.contains('hidden')) ||
    (DOM.notificationModal && !DOM.notificationModal.classList.contains('hidden'));
}

// ============================================================
// 【第 9 區塊】輸入管理 InputManager（統一事件監聽）
// ============================================================

function setupInputListeners() {

  // --- 全域鍵盤控制 ---
  window.addEventListener('keydown', (e) => {
    if (gameState === 'PROLOGUE') {
      // 序章中：空白鍵推進劇情
      if (e.code === 'Space') { e.preventDefault(); PrologueManager.advance(); }
      return; // 序章中不傳遞其他按鍵給遊戲
    }
    if (gameState === 'PLAYING') {
      if (isAnyModalOpen()) return; // 彈出視窗開啟時忽略按鍵

      // 攔截 E 鍵觸發與 NPC 的互動
      if (e.key.toLowerCase() === 'e') {
        if (activeNpc) {
          e.preventDefault();
          startInteraction(activeNpc);
          return;
        }
      }

      _setKey(e.key, true);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (gameState === 'PLAYING') {
      if (isAnyModalOpen()) {
        keys.w = keys.a = keys.s = keys.d = keys.space = false;
        return;
      }
      _setKey(e.key, false);
    }
  });

  // --- 序章點擊推進 ---
  if (DOM.prologueScreen) {
    DOM.prologueScreen.addEventListener('click', () => PrologueManager.advance());
  }

  // --- 開始畫面按鈕 ---
  if (DOM.startGameBtn) {
    DOM.startGameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (localStorage.getItem('hasPlayed') === 'true') {
        // 已看過序章，直接進入遊戲
        setState('PLAYING');
      } else {
        // 首次進入，播放完整序章
        PrologueManager.start(0, false);
      }
    });
  }

  // --- 開始畫面快捷功能按鈕 ---
  if (DOM.startAigcToolsBtn) {
    DOM.startAigcToolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderAigcGrid();
      UIManager.show(DOM.aigcModal);
    });
  }

  if (DOM.startAigcNotebookBtn) {
    DOM.startAigcNotebookBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentNotebookPage = 0;
      renderNotebookPage();
      UIManager.show(DOM.notebookModal);
    });
  }

  // --- 開始畫面音樂按鈕（左下角）---
  if (DOM.startMusicBtn) {
    DOM.startMusicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.show(DOM.playlistModal);
    });
  }

  // --- 說明彈窗（♥ 按鈕）---
  if (DOM.helpBtn) DOM.helpBtn.addEventListener('click', () => UIManager.show(DOM.helpModal));
  if (DOM.closeHelpBtn) DOM.closeHelpBtn.addEventListener('click', () => UIManager.hide(DOM.helpModal));

  // --- 耳機播放清單 ---
  if (DOM.earpodBtn) DOM.earpodBtn.addEventListener('click', () => UIManager.show(DOM.playlistModal));
  if (DOM.closePlaylistBtn) DOM.closePlaylistBtn.addEventListener('click', () => UIManager.hide(DOM.playlistModal));
  if (DOM.playPauseBtn) DOM.playPauseBtn.addEventListener('click', () => AudioManager.toggleGameBGM());
  if (DOM.volumeSlider) DOM.volumeSlider.addEventListener('input', (e) => AudioManager.setVolume(e.target.value));

  // 切換播放曲目
  document.querySelectorAll('.song-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.song-item').forEach(s => {
        s.classList.remove('active');
        const sp = s.querySelector('.play-status');
        if (sp) sp.textContent = '';
      });
      item.classList.add('active');
      const sp = item.querySelector('.play-status');
      if (sp) sp.textContent = '▶';
      AudioManager.switchTrack(item.getAttribute('data-src'));
    });
  });

  // --- IEYE 隱形眼鏡 ---
  if (DOM.ieyeBtn) {
    DOM.ieyeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.openIeye();
    });
  }
  if (DOM.closeIeyeBtn) {
    DOM.closeIeyeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.closeIeye();
    });
  }

  // 回到開始頁面（不清除 hasPlayed）
  if (DOM.ieyeBackToStartBtn) {
    DOM.ieyeBackToStartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.closeIeye();
      // 等待閉眼動畫結束後才顯示開始畫面
      setTimeout(() => setState('START'), 480);
    });
  }

  // 劇情回顧按鈕：打開場景列表
  if (DOM.ieyeReadStoryBtn && DOM.storyListModal) {
    DOM.ieyeReadStoryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderStoryList(); // 動態更新解鎖狀態與項目
      UIManager.show(DOM.storyListModal);
      UIManager.closeIeye();
    });
  }

  // AIGC工具庫按鈕：開啟 AIGC 工具庫智能面板
  if (DOM.ieyeAigcToolsBtn && DOM.aigcModal) {
    DOM.ieyeAigcToolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderAigcGrid();
      UIManager.show(DOM.aigcModal);
      UIManager.closeIeye();
    });
  }

  // 關閉 AIGC 工具庫按鈕
  if (DOM.closeAigcBtn) {
    DOM.closeAigcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.hide(DOM.aigcModal);
    });
  }

  // --- 圖鑑按鈕與彈窗切換 ---
  let activeGuideTab = 'items'; // 預設為物件分頁

  if (DOM.ieyeGuideBtn && DOM.guideModal) {
    DOM.ieyeGuideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeGuideTab = 'items';
      // 更新 Tab 高亮樣式
      if (DOM.tabItems) DOM.tabItems.classList.add('active');
      if (DOM.tabPlaces) DOM.tabPlaces.classList.remove('active');
      renderGuideContent(activeGuideTab);
      UIManager.show(DOM.guideModal);
      UIManager.closeIeye();
    });
  }

  if (DOM.closeGuideBtn) {
    DOM.closeGuideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.hide(DOM.guideModal);
    });
  }

  // --- 關閉圖鑑詳細資訊大彈窗按鈕 ---
  if (DOM.closeGuideDetailBtn) {
    DOM.closeGuideDetailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeGuideDetailModal();
      window.focus(); // 🚀 強制將焦點還給 window，避免鍵盤控制失效
    });
  }

  // 關閉解鎖通知按鈕
  if (DOM.closeNotificationBtn) {
    DOM.closeNotificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.hide(DOM.notificationModal);
      window.focus(); // 🚀 強制將焦點還給 window，避免鍵盤控制失效
    });
  }

  if (DOM.tabItems) {
    DOM.tabItems.addEventListener('click', (e) => {
      e.stopPropagation();
      activeGuideTab = 'items';
      DOM.tabItems.classList.add('active');
      if (DOM.tabPlaces) DOM.tabPlaces.classList.remove('active');
      renderGuideContent(activeGuideTab);
    });
  }

  if (DOM.tabPlaces) {
    DOM.tabPlaces.addEventListener('click', (e) => {
      e.stopPropagation();
      activeGuideTab = 'places';
      DOM.tabPlaces.classList.add('active');
      if (DOM.tabItems) DOM.tabItems.classList.remove('active');
      renderGuideContent(activeGuideTab);
    });
  }

  // 關閉劇情列表
  if (DOM.closeStoryListBtn) {
    DOM.closeStoryListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.hide(DOM.storyListModal);
    });
  }

  // 劇情列表項目點擊事件已移至 renderStoryList 動態綁定中以防狀態不一致

  // --- 筆記本按鈕 ---
  if (DOM.notebookBtn) {
    DOM.notebookBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentNotebookPage = 0;
      renderNotebookPage();
      UIManager.show(DOM.notebookModal);
    });
  }
  if (DOM.closeNotebookBtn) {
    DOM.closeNotebookBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UIManager.hide(DOM.notebookModal);
    });
  }
  if (DOM.notebookPrevBtn) {
    DOM.notebookPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentNotebookPage > 0) {
        currentNotebookPage--;
        renderNotebookPage();
      }
    });
  }
  if (DOM.notebookNextBtn) {
    DOM.notebookNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const totalPages = Math.ceil(notebookTips.length / TIPS_PER_PAGE);
      if (currentNotebookPage < totalPages - 1) {
        currentNotebookPage++;
        renderNotebookPage();
      }
    });
  }
}

// 更新單一按鍵狀態（私有輔助函式）
function _setKey(key, isPressed) {
  switch (key.toLowerCase()) {
    case 'w': keys.w = isPressed; break;
    case 'a': keys.a = isPressed; break;
    case 's': keys.s = isPressed; break;
    case 'd': keys.d = isPressed; break;
    case ' ': keys.space = isPressed; break;
  }
}

// ============================================================
// 【第 10 區塊】遊戲主循環
// ============================================================

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'PLAYING' || gameState === 'INTERACTION') {
    // 僅在 PLAYING 狀態下更新物理、動作與距離偵測
    if (gameState === 'PLAYING') {
      player.update();
      npcs.forEach(npc => npc.update()); // 🚀 更新所有 NPC 動作
      checkNpcProximity();               // 偵測 NPC 與玩家的距離
    }
    updateCamera();

    ctx.save();
    ctx.scale(zoom, zoom);
    drawBackground();
    npcs.forEach(npc => npc.draw());   // 🚀 繪製所有 NPC (先畫 NPC，再畫 player，確保遮擋關係)
    player.draw();

    // 繪製 map3 的前景疊加層 (map3-2.png)，使其遮蓋在角色與 NPC 的前面
    if (mapState.current === 'map3.png' && map3FgImage.complete && map3FgImage.naturalWidth > 0) {
      const scale = world.height / map3FgImage.height;
      const drawWidth = map3FgImage.width * scale;
      ctx.drawImage(map3FgImage, -camera.x, 0, drawWidth, world.height);
    }

    // 僅在遊玩模式且接近 NPC 時，繪製「按 E 互動」提示框
    if (gameState === 'PLAYING') {
      drawInteractionPrompt();
    }
    ctx.restore();
  } else {
    // LOADING / START / PROLOGUE：Canvas 保持純黑，由 HTML 元素負責渲染畫面
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// 【第 11 區塊】啟動流程（唯一初始化入口）
// ============================================================

// 初始化音頻模組
AudioManager.init();

// 統一綁定所有事件監聽（只執行一次）
setupInputListeners();

// 啟動渲染循環（LOADING 狀態下畫布為黑色，等待資源載入）
gameLoop();

// 🚀 遊戲初始加載狀態旗標，確保 setState 只在首次載入時執行一次，防止切換地圖或重置位置非同步打亂狀態
let isGameInitialized = false;

// 地圖資源預載：onload 完成後才進入遊戲狀態（這是遊戲的唯一啟動點）
bgImage.onload = () => {
  console.log(`[Load] 地圖圖片預加載成功: ${bgImage.src}`);
  // 依地圖原始比例動態計算世界寬度
  const scale = world.height / bgImage.height;
  world.width = bgImage.width * scale;
  world.groundY = world.height - 20;

  if (!isGameInitialized) {
    isGameInitialized = true;

    // 重新從 localStorage 中取得最新狀況，防範常數時序競爭
    const currentHasSave = localStorage.getItem('hasSave') === 'true';
    if (currentHasSave && loadGameState()) {
      // 🚀 有存檔：直接進入遊戲，跳過開始畫面與序章，並確保加載了正確的音效與狀態
      setState('PLAYING');
    } else {
      // 🚀 無存檔：預設玩家起始位置並進入開始畫面
      player.x = world.width - player.width - 60;
      player.y = world.groundY - player.height;
      setState('START');
    }
  }

  // 🚀 在狀態與存檔載入完成後，依據地圖縮放比例 scale 動態重置對應地圖的 NPC 座標
  npcs.forEach(npc => {
    if (npc.mapName === mapState.current) {
      npc.resetPosition(scale);
    }
  });
};

bgImage.onerror = (err) => {
  console.error(`[Load Error] 地圖圖片預加載失敗，可能是檔案路徑錯誤或受到 CSP 阻擋: ${bgImage.src}`, err);
  if (!isGameInitialized) {
    isGameInitialized = true;
    // 🚀 防禦性降級邏輯：即使大張地圖圖片載入失敗，也要強制進入開始畫面，防範遊戲永遠黑屏卡死！
    console.warn('[Load Warning] 啟動防禦性降級邏輯，強制進入開始畫面以保證玩家體驗。');
    world.width = 2400; // 使用預設世界寬度
    world.groundY = world.height - 20;
    player.x = world.width - player.width - 60;
    player.y = world.groundY - player.height;
    setState('START');
  }
};

// 取得初始載入的地圖名稱：優先使用 localStorage 存檔中的地圖，否則預設為 map1.png
const initialMap = (localStorage.getItem('hasSave') === 'true' && localStorage.getItem('lastMap')) || 'map1.png';
console.log(`[Init] 開始加載地圖圖片: map/${initialMap}`);
bgImage.src = 'map/' + initialMap;
