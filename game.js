// 遊戲常量
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SPEED = 5;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const BULLET_SPEED = 7;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const ENEMY_SPEED = 2;
const ENEMY_BULLET_SPEED = 4;
const ENEMY_FIRE_RATE = 0.005; // 每幀敵人發射子彈的概率

// 遊戲狀態
let gameState = 'menu'; // menu, playing, gameOver, settings
let score = 0;
let lives = 3;
let level = 1;
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let lastTime = 0;
let player = null;
let soundEnabled = true;
let musicEnabled = true;
let gameLoop = null;

// DOM 元素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over');
const settingsScreen = document.getElementById('settings-screen');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const settingsButton = document.getElementById('settings-button');
const replayButton = document.getElementById('replay-button');
const menuButton = document.getElementById('menu-button');
const backButton = document.getElementById('back-button');
const soundToggle = document.getElementById('sound-toggle');
const musicToggle = document.getElementById('music-toggle');

// 音效和音樂
let backgroundMusic = null;
let shootSound = null;
let explosionSound = null;
let gameOverSound = null;

// 資源加載
const images = {};
let assetsLoaded = false;

// 遊戲初始化
function init() {
    // 設置 Canvas 尺寸
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // 加載資源
    loadAssets();
    
    // 事件監聽
    setupEventListeners();
}

// 加載遊戲資源
function loadAssets() {
    // 創建資源文件夾
    createAssetsFolder();
    
    // 加載圖片
    const imageNames = ['player', 'enemy', 'bullet', 'enemyBullet', 'background'];
    let loadedCount = 0;
    
    imageNames.forEach(name => {
        images[name] = new Image();
        images[name].onload = () => {
            loadedCount++;
            if (loadedCount === imageNames.length) {
                assetsLoaded = true;
                // 資源加載完成後，顯示主菜單
                showScreen('menu');
            }
        };
        images[name].src = `assets/${name}.svg`;
    });
    
    // 加載音效並添加錯誤處理
    backgroundMusic = new Audio('assets/background_music.mp3');
    backgroundMusic.loop = true;
    
    // 預加載音效並添加錯誤處理
    backgroundMusic.addEventListener('canplaythrough', () => {
        console.log('背景音樂已加載');
    });
    
    backgroundMusic.addEventListener('error', (e) => {
        console.error('背景音樂加載失敗:', e);
        musicEnabled = false;
        if (musicToggle) musicToggle.checked = false;
    });
    
    // 初始化音效
    shootSound = new Audio('assets/shoot.wav');
    explosionSound = new Audio('assets/explosion.wav');
    gameOverSound = new Audio('assets/game_over.wav');
    
    // 添加音效錯誤處理
    const setupSoundErrorHandling = (sound, name) => {
        sound.addEventListener('error', (e) => {
            console.error(`${name}加載失敗:`, e);
            soundEnabled = false;
            if (soundToggle) soundToggle.checked = false;
        });
    };
    
    setupSoundErrorHandling(shootSound, '射擊音效');
    setupSoundErrorHandling(explosionSound, '爆炸音效');
    setupSoundErrorHandling(gameOverSound, '遊戲結束音效');
}

// 創建資源文件夾（實際開發中，這個函數不需要，因為資源文件夾應該已經存在）
function createAssetsFolder() {
    // 這裡只是為了示意，實際開發中應該提前準備好資源文件
    console.log('資源文件夾應該已經存在，包含所有需要的圖片和音效');
}

// 設置事件監聽
function setupEventListeners() {
    // 按鈕點擊事件
    startButton.addEventListener('click', startGame);
    settingsButton.addEventListener('click', () => showScreen('settings'));
    replayButton.addEventListener('click', startGame);
    menuButton.addEventListener('click', () => showScreen('menu'));
    backButton.addEventListener('click', () => showScreen('menu'));
    
    // 設置切換
    soundToggle.addEventListener('change', () => {
        soundEnabled = soundToggle.checked;
    });
    
    musicToggle.addEventListener('change', () => {
        musicEnabled = musicToggle.checked;
        if (musicEnabled && backgroundMusic) {
            try {
                const playPromise = backgroundMusic.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('播放背景音樂失敗:', error);
                        // 如果是自動播放政策導致的錯誤，提示用戶互動
                        if (error.name === 'NotAllowedError') {
                            console.log('瀏覽器阻止了自動播放，請點擊畫面以啟用音訊');
                        }
                    });
                }
            } catch (error) {
                console.error('播放背景音樂時發生錯誤:', error);
            }
        } else if (backgroundMusic) {
            backgroundMusic.pause();
        }
    });
    
    // 鍵盤控制
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

// 顯示指定的畫面
function showScreen(screen) {
    mainMenu.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    
    gameState = screen;
    
    switch (screen) {
        case 'menu':
            mainMenu.classList.remove('hidden');
            if (gameLoop) {
                cancelAnimationFrame(gameLoop);
                gameLoop = null;
            }
            break;
        case 'playing':
            gameScreen.classList.remove('hidden');
            break;
        case 'gameOver':
            gameOverScreen.classList.remove('hidden');
            finalScoreDisplay.textContent = `最終分數: ${score}`;
            break;
        case 'settings':
            settingsScreen.classList.remove('hidden');
            break;
    }
}

// 開始遊戲
function startGame() {
    // 重置遊戲狀態
    score = 0;
    lives = 3;
    level = 1;
    enemies = [];
    playerBullets = [];
    enemyBullets = [];
    
    // 創建玩家
    player = new Player();
    
    // 生成第一波敵人
    generateEnemies();
    
    // 更新顯示
    updateScoreDisplay();
    updateLivesDisplay();
    
    // 顯示遊戲畫面
    showScreen('playing');
    
    // 播放背景音樂
    if (musicEnabled && backgroundMusic) {
        try {
            backgroundMusic.currentTime = 0;
            const playPromise = backgroundMusic.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('播放背景音樂失敗:', error);
                    // 如果是自動播放政策導致的錯誤，提示用戶互動
                    if (error.name === 'NotAllowedError') {
                        console.log('瀏覽器阻止了自動播放，請點擊畫面以啟用音訊');
                        // 添加一次性點擊事件來啟用音訊
                        const enableAudio = () => {
                            backgroundMusic.play().catch(e => console.error('播放失敗:', e));
                            document.removeEventListener('click', enableAudio);
                        };
                        document.addEventListener('click', enableAudio);
                    }
                });
            }
        } catch (error) {
            console.error('播放背景音樂時發生錯誤:', error);
        }
    }
    
    // 開始遊戲循環
    lastTime = performance.now();
    gameLoop = requestAnimationFrame(update);
}

// 遊戲主循環
function update(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // 清空畫布
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 繪製背景
    drawBackground();
    
    // 更新和繪製玩家
    player.update(deltaTime);
    player.draw();
    
    // 更新和繪製玩家子彈
    updateBullets(playerBullets, deltaTime);
    
    // 更新和繪製敵人
    updateEnemies(deltaTime);
    
    // 更新和繪製敵人子彈
    updateBullets(enemyBullets, deltaTime);
    
    // 檢測碰撞
    detectCollisions();
    
    // 檢查是否需要生成新的敵人
    if (enemies.length === 0) {
        level++;
        generateEnemies();
    }
    
    // 繼續遊戲循環
    if (gameState === 'playing') {
        gameLoop = requestAnimationFrame(update);
    }
}

// 繪製背景
function drawBackground() {
    if (images.background && assetsLoaded) {
        ctx.drawImage(images.background, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // 繪製星星
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * GAME_WIDTH;
            const y = Math.random() * GAME_HEIGHT;
            const size = Math.random() * 2 + 1;
            ctx.fillRect(x, y, size, size);
        }
    }
}

// 更新子彈
function updateBullets(bullets, deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(deltaTime);
        bullets[i].draw();
        
        // 移除超出畫面的子彈
        if (bullets[i].y < 0 || bullets[i].y > GAME_HEIGHT) {
            bullets.splice(i, 1);
        }
    }
}

// 更新敵人
function updateEnemies(deltaTime) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(deltaTime);
        enemies[i].draw();
        
        // 敵人發射子彈
        if (Math.random() < ENEMY_FIRE_RATE * (1 + level * 0.1)) {
            fireEnemyBullet(enemies[i]);
        }
        
        // 檢查敵人是否到達底部
        if (enemies[i].y + enemies[i].height > GAME_HEIGHT) {
            enemies.splice(i, 1);
            loseLife();
        }
    }
}

// 敵人發射子彈
function fireEnemyBullet(enemy) {
    const bullet = new Bullet(
        enemy.x + enemy.width / 2 - BULLET_WIDTH / 2,
        enemy.y + enemy.height,
        BULLET_WIDTH,
        BULLET_HEIGHT,
        ENEMY_BULLET_SPEED,
        'enemyBullet'
    );
    enemyBullets.push(bullet);
}

// 生成敵人
function generateEnemies() {
    const rows = Math.min(3 + Math.floor(level / 2), 5);
    const cols = Math.min(5 + Math.floor(level / 3), 10);
    const spacing = 60;
    const startX = (GAME_WIDTH - (cols * ENEMY_WIDTH + (cols - 1) * spacing)) / 2;
    const startY = 50;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const enemy = new Enemy(
                startX + col * (ENEMY_WIDTH + spacing),
                startY + row * (ENEMY_HEIGHT + spacing / 2),
                ENEMY_WIDTH,
                ENEMY_HEIGHT,
                ENEMY_SPEED * (1 + level * 0.1)
            );
            enemies.push(enemy);
        }
    }
}

// 碰撞檢測
function detectCollisions() {
    // 玩家子彈與敵人碰撞
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (isColliding(bullet, enemy)) {
                // 移除子彈和敵人
                playerBullets.splice(i, 1);
                enemies.splice(j, 1);
                
                // 增加分數
                score += 10 * level;
                updateScoreDisplay();
                
                // 播放爆炸音效
                if (soundEnabled && explosionSound) {
                    try {
                        explosionSound.currentTime = 0;
                        const playPromise = explosionSound.play();
                        
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.error('播放爆炸音效失敗:', error);
                            });
                        }
                    } catch (error) {
                        console.error('播放爆炸音效時發生錯誤:', error);
                    }
                }
                
                break;
            }
        }
    }
    
    // 敵人子彈與玩家碰撞
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        if (isColliding(bullet, player)) {
            // 移除子彈
            enemyBullets.splice(i, 1);
            
            // 減少生命值
            loseLife();
            break;
        }
    }
    
    // 敵人與玩家碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (isColliding(enemy, player)) {
            // 移除敵人
            enemies.splice(i, 1);
            
            // 減少生命值
            loseLife();
        }
    }
}

// 碰撞檢測函數
function isColliding(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

// 失去生命
function loseLife() {
    lives--;
    updateLivesDisplay();
    
    if (lives <= 0) {
        endGame();
    }
}

// 結束遊戲
function endGame() {
    if (soundEnabled && gameOverSound) {
        try {
            gameOverSound.currentTime = 0;
            const playPromise = gameOverSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('播放遊戲結束音效失敗:', error);
                });
            }
        } catch (error) {
            console.error('播放遊戲結束音效時發生錯誤:', error);
        }
    }
    
    if (musicEnabled && backgroundMusic) {
        backgroundMusic.pause();
    }
    
    showScreen('gameOver');
}

// 更新分數顯示
function updateScoreDisplay() {
    scoreDisplay.textContent = `分數: ${score}`;
}

// 更新生命值顯示
function updateLivesDisplay() {
    livesDisplay.textContent = `生命: ${lives}`;
}

// 鍵盤按下事件處理
function handleKeyDown(e) {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            player.moveLeft();
            break;
        case 'ArrowRight':
            player.moveRight();
            break;
        case ' ': // 空格鍵
            player.shoot();
            break;
    }
}

// 鍵盤釋放事件處理
function handleKeyUp(e) {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            if (player.speedX < 0) player.stopMoving();
            break;
        case 'ArrowRight':
            if (player.speedX > 0) player.stopMoving();
            break;
    }
}

// 玩家類
class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = GAME_HEIGHT - this.height - 20;
        this.speedX = 0;
        this.lastShot = 0;
        this.shootCooldown = 300; // 射擊冷卻時間（毫秒）
    }
    
    update(deltaTime) {
        this.x += this.speedX;
        
        // 邊界檢查
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_WIDTH) this.x = GAME_WIDTH - this.width;
    }
    
    draw() {
        if (images.player && assetsLoaded) {
            ctx.drawImage(images.player, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#5ff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    
    moveLeft() {
        this.speedX = -PLAYER_SPEED;
    }
    
    moveRight() {
        this.speedX = PLAYER_SPEED;
    }
    
    stopMoving() {
        this.speedX = 0;
    }
    
    shoot() {
        const now = performance.now();
        if (now - this.lastShot < this.shootCooldown) return;
        
        this.lastShot = now;
        
        const bullet = new Bullet(
            this.x + this.width / 2 - BULLET_WIDTH / 2,
            this.y,
            BULLET_WIDTH,
            BULLET_HEIGHT,
            -BULLET_SPEED,
            'bullet'
        );
        playerBullets.push(bullet);
        
        // 播放射擊音效
        if (soundEnabled && shootSound) {
            try {
                shootSound.currentTime = 0;
                const playPromise = shootSound.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('播放射擊音效失敗:', error);
                    });
                }
            } catch (error) {
                console.error('播放射擊音效時發生錯誤:', error);
            }
        }
    }
}

// 子彈類
class Bullet {
    constructor(x, y, width, height, speed, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.type = type;
    }
    
    update(deltaTime) {
        this.y += this.speed;
    }
    
    draw() {
        if (images[this.type] && assetsLoaded) {
            ctx.drawImage(images[this.type], this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'bullet' ? '#5ff' : '#f55';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// 敵人類
class Enemy {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.direction = 1; // 1 表示向右，-1 表示向左
    }
    
    update(deltaTime) {
        this.x += this.speed * this.direction;
        
        // 邊界檢查，到達邊界時改變方向並下降
        if (this.x <= 0 || this.x + this.width >= GAME_WIDTH) {
            this.direction *= -1;
            this.y += this.height / 2;
        }
    }
    
    draw() {
        if (images.enemy && assetsLoaded) {
            ctx.drawImage(images.enemy, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#f55';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// 初始化音訊系統，解決自動播放問題
function initAudio() {
    // 創建一個用戶互動事件監聽器，用於啟用音訊
    const enableAudio = () => {
        // 嘗試播放所有音訊以解除瀏覽器的自動播放限制
        if (backgroundMusic && musicEnabled) {
            backgroundMusic.play().then(() => {
                backgroundMusic.pause();
                console.log('背景音樂已啟用');
            }).catch(error => {
                console.error('背景音樂啟用失敗:', error);
            });
        }
        
        // 嘗試播放其他音效
        [shootSound, explosionSound, gameOverSound].forEach(sound => {
            if (sound && soundEnabled) {
                sound.volume = 0.01; // 設置極低音量
                sound.play().then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                    sound.volume = 1.0; // 恢復正常音量
                    console.log('音效已啟用');
                }).catch(error => {
                    console.error('音效啟用失敗:', error);
                });
            }
        });
        
        // 移除事件監聽器，避免重複觸發
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        startButton.removeEventListener('click', enableAudio);
    };
    
    // 添加多種互動事件監聽器
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    startButton.addEventListener('click', enableAudio);
}

// 當頁面加載完成後初始化遊戲
window.addEventListener('load', () => {
    init();
    initAudio();
});