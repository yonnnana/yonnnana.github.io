// HTML要素を取得
const investButton = document.getElementById('invest-button');
// ▼▼▼ IDからクラス名での複数取得に変更 ▼▼▼
const daibutsuElements = document.querySelectorAll('.daibutsu');
// ▲▲▲ ここまで変更 ▲▲▲
const effectContainer = document.getElementById('effect-container');

// 大仏の現在の拡大率を保存する変数
// 左右と中央で初期スケールが違うため、加算方式に変更
let daibutsuScaleFactor = 0.1;

// ボタンがクリックされたときの処理
investButton.addEventListener('click', () => {
    // 1. 大仏を大きくする
    // ▼▼▼ 複数要素をループで処理するように変更 ▼▼▼
    daibutsuElements.forEach(daibutsu => {
        // 現在のtransformを取得して、スケール値を更新する
        const currentTransform = window.getComputedStyle(daibutsu).transform;
        let currentScale = 1.0;

        if (currentTransform !== 'none') {
            const matrix = new DOMMatrix(currentTransform);
            currentScale = matrix.a; // scaleXの値を取得
        }

        const newScale = currentScale + daibutsuScaleFactor;
        daibutsu.style.transform = `scale(${newScale})`;
    });
    // ▲▲▲ ここまで変更 ▲▲▲

    // 2. 派手な効果音を再生（任意）
    playCoinSound();

    // 3. コインをばらまく (変更なし)
    const rect = investButton.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    const numberOfCoins = 30; 
    for (let i = 0; i < numberOfCoins; i++) {
        createCoin(startX, startY);
    }
});

// (後略) createCoin, playCoinSound関数は変更なし
function createCoin(x, y) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.left = `${x}px`;
    coin.style.top = `${y}px`;
    const fallY = window.innerHeight;
    const spreadX = (Math.random() - 0.5) * window.innerWidth;
    const rotation = (Math.random() - 0.5) * 4 * 360;
    const duration = Math.random() * 1.5 + 1.5;
    const delay = Math.random() * 0.2;
    coin.style.setProperty('--fall-y', `${fallY}px`);
    coin.style.setProperty('--rotate-z', `${rotation}deg`);
    coin.style.transition = `left ${duration}s cubic-bezier(0.1, 0.5, 0.4, 1)`;
    setTimeout(() => {
        coin.style.left = `${x + spreadX}px`;
    }, 10);
    coin.style.animationDuration = `${duration}s`;
    coin.style.animationDelay = `${delay}s`;
    effectContainer.appendChild(coin);
    setTimeout(() => {
        coin.remove();
    }, (duration + delay) * 1000);
}
function playCoinSound() {
    // new Audio('path/to/coin-sound.mp3').play();
}