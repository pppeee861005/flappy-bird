// 获取Canvas和Context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// 获取DOM元素
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// 游戏常量
const GRAVITY = 0.05;  // 再次减小重力
const JUMP_FORCE = -3.5; // 减小跳跃力度
const PIPE_SPEED = 1.5; // 减慢管道速度
const PIPE_WIDTH = 50;
const PIPE_GAP = 180; // 增加管道间隙
const PIPE_SPACING = 300; // 增加管道之间的距离
const INITIAL_PIPE_DELAY = 120; // 初始延迟，让玩家有时间适应
const GROUND_HEIGHT = 80;
const FLAP_SPEED = 10; // 翅膀扇动速度

// 游戏状态
const GAME_STATE = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

// 游戏变量
let gameState;
let bird;
let pipes;
let score;
let frameCount;
let flapFrame = 0; // 翅膀动画帧

// 鸟类
class Bird {
    constructor() {
        this.x = canvas.width / 3;
        this.y = canvas.height / 4; // 初始位置更高
        this.width = 34;
        this.height = 24;
        this.velocity = -1; // 开始时有一个小的向上速度
        this.rotation = 0;
        this.wingUp = false; // 翅膀状态
        this.flapCounter = 0; // 翅膀动画计数器
    }

    update() {
        // 应用重力
        this.velocity += GRAVITY;
        this.y += this.velocity;

        // 计算旋转角度（基于速度）
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));

        // 防止鸟飞出屏幕顶部
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }

        // 检测地面碰撞
        if (this.y + this.height > canvas.height - GROUND_HEIGHT) {
            this.y = canvas.height - GROUND_HEIGHT - this.height;
            gameOver();
        }

        // 更新翅膀动画
        this.flapCounter++;
        if (this.flapCounter >= FLAP_SPEED) {
            this.wingUp = !this.wingUp;
            this.flapCounter = 0;
        }
    }

    jump() {
        this.velocity = JUMP_FORCE;
        this.wingUp = true; // 跳跃时翅膀向上
        this.flapCounter = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // 绘制鸟身体（黄色圆形）
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制鸟眼睛（黑色圆形）
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.width / 4, -this.height / 6, this.width / 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制鸟嘴（橙色三角形）
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2 + 10, -5);
        ctx.lineTo(this.width / 2 + 10, 5);
        ctx.closePath();
        ctx.fill();
        
        // 绘制翅膀（根据状态上下移动）
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        if (this.wingUp) {
            // 翅膀向上
            ctx.ellipse(-this.width / 4, -this.height / 3, this.width / 3, this.height / 4, 0, 0, Math.PI * 2);
        } else {
            // 翅膀向下
            ctx.ellipse(-this.width / 4, this.height / 4, this.width / 3, this.height / 4, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        
        ctx.restore();
    }
}

// 管道类
class Pipe {
    constructor(x) {
        this.x = x;
        // 确保管道高度在合理范围内，不会太高或太低
        this.topHeight = Math.random() * (canvas.height - PIPE_GAP - GROUND_HEIGHT - 150) + 80;
        this.bottomY = this.topHeight + PIPE_GAP;
        this.counted = false;
    }

    update() {
        this.x -= PIPE_SPEED;

        // 检测是否通过管道（得分）
        if (!this.counted && this.x + PIPE_WIDTH < bird.x) {
            score++;
            scoreDisplay.textContent = score;
            this.counted = true;
        }
    }

    draw() {
        // 绘制上管道
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, 0, PIPE_WIDTH, this.topHeight);
        
        // 绘制管道顶部边缘
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x - 5, this.topHeight - 20, PIPE_WIDTH + 10, 20);
        
        // 绘制下管道
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.bottomY, PIPE_WIDTH, canvas.height - this.bottomY - GROUND_HEIGHT);
        
        // 绘制管道底部边缘
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x - 5, this.bottomY, PIPE_WIDTH + 10, 20);
    }

    isColliding() {
        // 更宽松的碰撞检测，给玩家一点余地
        const hitboxShrink = 4; // 缩小碰撞箱的像素数
        if (
            bird.x + bird.width - hitboxShrink > this.x && 
            bird.x + hitboxShrink < this.x + PIPE_WIDTH
        ) {
            // 检测上管道碰撞
            if (bird.y + hitboxShrink < this.topHeight) {
                return true;
            }
            
            // 检测下管道碰撞
            if (bird.y + bird.height - hitboxShrink > this.bottomY) {
                return true;
            }
        }
        return false;
    }
}

// 初始化游戏
function init() {
    gameState = GAME_STATE.WAITING;
    bird = new Bird();
    pipes = [];
    score = 0;
    frameCount = 0;
    
    // 更新分数显示
    scoreDisplay.textContent = score;
    
    // 显示开始屏幕
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    
    console.log("游戏初始化完成，等待开始...");
}

// 开始游戏
function startGame() {
    gameState = GAME_STATE.PLAYING;
    startScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    // 确保鸟在开始时有一个小的向上速度
    bird.velocity = -1;
    console.log("游戏开始！");
}

// 游戏结束
function gameOver() {
    gameState = GAME_STATE.GAME_OVER;
    finalScore.textContent = score;
    gameOverScreen.classList.remove('hidden');
    console.log("游戏结束，分数：" + score);
    
    // 确保重新开始按钮可见
    restartButton.style.display = 'block';
    restartButton.style.zIndex = '100';
}

// 绘制背景
function drawBackground() {
    // 天空
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);
    
    // 地面
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // 地面纹理
    ctx.fillStyle = '#e9c891';
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.fillRect(i, canvas.height - GROUND_HEIGHT + 10, 15, 10);
    }
}

// 更新游戏状态
function update() {
    if (gameState !== GAME_STATE.PLAYING) return;
    
    frameCount++;
    
    // 更新鸟的位置
    bird.update();
    
    // 创建新管道（添加初始延迟）
    if (frameCount > INITIAL_PIPE_DELAY && (frameCount - INITIAL_PIPE_DELAY) % PIPE_SPACING === 0) {
        pipes.push(new Pipe(canvas.width));
    }
    
    // 更新管道位置并检测碰撞
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].update();
        
        // 检测碰撞
        if (pipes[i].isColliding()) {
            gameOver();
        }
        
        // 移除屏幕外的管道
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
}

// 绘制游戏
function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    drawBackground();
    
    // 绘制管道
    pipes.forEach(pipe => pipe.draw());
    
    // 绘制鸟
    bird.draw();

    // 如果是等待状态，显示提示
    if (gameState === GAME_STATE.WAITING) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('点击或按空格键让鸟飞翔', canvas.width / 2, canvas.height - 15);
    }
}

// 游戏循环
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 事件监听 - 键盘
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === GAME_STATE.WAITING) {
            startGame();
            console.log("游戏开始 - 空格键");
        } else if (gameState === GAME_STATE.PLAYING) {
            bird.jump();
        } else if (gameState === GAME_STATE.GAME_OVER) {
            init();
            startGame();
        }
    }
});

// 事件监听 - 文档点击
document.addEventListener('click', (e) => {
    console.log("文档点击事件触发");
    if (gameState === GAME_STATE.WAITING) {
        startGame();
        console.log("游戏开始 - 文档点击");
    } else if (gameState === GAME_STATE.PLAYING) {
        bird.jump();
    }
});

// 事件监听 - Canvas点击
canvas.addEventListener('click', (e) => {
    console.log("Canvas点击事件触发");
    if (gameState === GAME_STATE.WAITING) {
        startGame();
        console.log("游戏开始 - Canvas点击");
    } else if (gameState === GAME_STATE.PLAYING) {
        bird.jump();
    }
    e.stopPropagation(); // 阻止事件冒泡
});

// 事件监听 - 重新开始按钮
restartButton.addEventListener('click', (e) => {
    console.log("重新开始按钮点击");
    init();
    startGame(); // 自动开始新游戏
    e.stopPropagation(); // 阻止事件冒泡
});

// 初始化游戏并开始游戏循环
init();
gameLoop();

// 添加CSS类检查
console.log("开始屏幕类名:", startScreen.className);
console.log("游戏结束屏幕类名:", gameOverScreen.className);
console.log("分数显示类名:", scoreDisplay.className);
