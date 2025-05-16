// canvas要素を取得
const canvas = document.getElementById('solarSystemCanvas');
const ctx = canvas.getContext('2d');

// UI要素を取得
const speedControl = document.getElementById('speedControl');
const currentSpeedSpan = document.getElementById('currentSpeed');

// canvasのサイズをウィンドウサイズに合わせる
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 描画の中心座標 (canvasの中央)
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// スケーリングファクター：適切な縮尺に調整
const scale = Math.min(canvas.width, canvas.height) / 900;

// === 太陽のデータ ===
const sun = {
    name: "Sun",
    color: "#ffffcc", // 円で描画する場合の色
    radius: 30 * scale, // 円で描画する場合のサイズ（惑星に比べて大きい）
    image: new Image(), // 画像オブジェクト
    imagePath: "images/sun.png" // ★★★ 太陽の画像パスを指定してください (null なら画像を使わない) ★★★ 例: 'images/sun.png'
};

// === 太陽の画像読み込み処理 ===
if (sun.imagePath) {
    sun.image.onload = () => {
        console.log(`${sun.name} image loaded.`);
        // 必要であれば、画像サイズに合わせて radius を調整することも可能
        // sun.radius = sun.image.width / 2 * scale; // 例: 画像幅/2を半径とする場合
    };
    sun.image.onerror = () => {
        console.error(`Failed to load ${sun.name} image from ${sun.imagePath}. Falling back to circle.`);
        sun.image = null; // 画像読み込み失敗時は円で描画するようにする
    };
    sun.image.src = sun.imagePath; // 画像パスを設定して読み込み開始
} else {
    sun.image = null; // imagePath が設定されていない場合は画像を使用しない
}
// =======================


// 惑星のデータ (前回と同じ、画像対応済み)
const planets = [
    {
        name: "Mercury", color: "#a9a9a9", radius: 30 * scale, distance: 50 * scale, angle: 0, baseSpeed: 0.047,
        image: new Image(), 
        imagePath: 'images/mercury.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Venus", color: "#ffcc99", radius: 40 * scale, distance: 80 * scale, angle: 0, baseSpeed: 0.035,
        image: new Image(), 
        imagePath: 'images/venus.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Earth", color: "#66ccff", radius: 50 * scale, distance: 110 * scale, angle: 0, baseSpeed: 0.030,
        image: new Image(), 
        imagePath: 'images/earth.png' // ★★★ 地球の画像パスを指定 ★★★
    },
    {
        name: "Mars", color: "#ff6600", radius: 60 * scale, distance: 150 * scale, angle: 0, baseSpeed: 0.024,
        image: new Image(), 
        imagePath: 'images/mars.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Jupiter", color: "#ff9933", radius: 70 * scale, distance: 250 * scale, angle: 0, baseSpeed: 0.013,
        image: new Image(), 
        imagePath: 'images/jupiter.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Saturn", color: "#ffff99", radius: 80 * scale, distance: 350 * scale, angle: 0, baseSpeed: 0.009,
        image: new Image(), 
        imagePath: 'images/saturn.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Uranus", color: "#add8e6", radius: 90 * scale, distance: 450 * scale, angle: 0, baseSpeed: 0.006,
        image: new Image(), 
        imagePath: 'images/uranus.png' // ★★★ 画像パス ★★★
    },
    {
        name: "Neptune", color: "#4169e1", radius: 100 * scale, distance: 550 * scale, angle: 0, baseSpeed: 0.005,
        image: new Image(), 
        imagePath: 'images/neptune.png' // ★★★ 画像パス ★★★
    }
];

// === 全惑星の画像読み込み処理 (前回と同じロジックを適用) ===
planets.forEach(planet => {
    if (planet.imagePath) {
        planet.image.onload = () => { console.log(`${planet.name} image loaded.`); };
        planet.image.onerror = () => { console.error(`Failed to load ${planet.name} image from ${planet.imagePath}. Falling back to circle.`); planet.image = null; };
        planet.image.src = planet.imagePath;
    } else {
        planet.image = null;
    }
});
// ============================


// === 速度調整機能 (前回と同じ) ===
let currentSpeedMultiplier = parseFloat(speedControl.value) / 100;

function updateSpeedDisplay(multiplier) {
    currentSpeedSpan.textContent = `${Math.round(multiplier * 100)}%`;
}

speedControl.addEventListener('input', (event) => {
    currentSpeedMultiplier = parseFloat(event.target.value) / 100;
    updateSpeedDisplay(currentSpeedMultiplier);
});

updateSpeedDisplay(currentSpeedMultiplier);
// ============================


// アニメーションループ
function draw() {
    // 画面をクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // canvasの原点を中央に移動
    ctx.save();
    ctx.translate(centerX, centerY);

    // === 太陽を描画 (画像または円) ===
    // 太陽の画像があり、かつ読み込みが完了していれば画像を描画
    if (sun.image && sun.image.complete) {
        ctx.save(); // ★★★ クリッピングパス用の状態を保存 ★★★
        // 円形のクリッピングパスを設定 (中心: 0,0, 半径: sun.radius)
        ctx.beginPath();
        ctx.arc(0, 0, sun.radius, 0, Math.PI * 2);
        ctx.closePath(); // パスを閉じる
        ctx.clip(); // ★★★ このパスをクリッピング領域として設定 ★★★

        // 画像を描画。この描画はクリッピング領域(円)の内側のみ表示される。
        // 位置は画像の中心がキャンバス中央(0,0)に来るように調整。
        ctx.drawImage(sun.image, -sun.radius, -sun.radius, sun.radius * 2, sun.radius * 2);

        ctx.restore(); // ★★★ クリッピングパスを解除し、保存した状態に戻す ★★★
        // 画像なのでシャドウ効果は適用しない（必要であればここで別途描画）
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    } else {
        // それ以外（画像がない、または読み込み中/失敗）は円で描画
        ctx.beginPath();
        ctx.arc(0, 0, sun.radius, 0, Math.PI * 2);
        ctx.fillStyle = sun.color;
        // 円の場合は光彩効果を適用
        ctx.shadowColor = sun.color; // 太陽の色をシャドウ色に
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowColor = 'transparent'; // シャドウをリセット
        ctx.shadowBlur = 0; // シャドウをリセット
    }
    // ============================


    // 各惑星と軌道線を描画 (前回と同じ)
    planets.forEach(planet => {
        // 軌道線を描画
        ctx.beginPath();
        ctx.arc(0, 0, planet.distance, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // 惑星の現在の位置を計算 (円軌道)
        const planetX = planet.distance * Math.cos(planet.angle);
        const planetY = planet.distance * Math.sin(planet.angle);

        // === 惑星を描画 (画像または円) ===
        // 画像があり、かつ読み込みが完了していれば画像を描画（円形クリッピング）
        if (planet.image && planet.image.complete) {
             ctx.save(); // ★★★ クリッピングパス用の状態を保存 ★★★
             // 円形のクリッピングパスを設定 (中心: planetX, planetY, 半径: planet.radius)
             ctx.beginPath();
             ctx.arc(planetX, planetY, planet.radius, 0, Math.PI * 2);
             ctx.closePath(); // パスを閉じる
             ctx.clip(); // ★★★ このパスをクリッピング領域として設定 ★★★

             // 画像を描画。この描画はクリッピング領域(円)の内側のみ表示される。
             // 位置は画像の中心が惑星の位置に来るように調整。
            ctx.drawImage(planet.image, planetX - planet.radius, planetY - planet.radius, planet.radius * 2, planet.radius * 2);

             ctx.restore(); // ★★★ クリッピングパスを解除し、保存した状態に戻す ★★★

        } else {
            // それ以外（画像がない、または読み込み中/失敗）は円で描画
            ctx.beginPath();
            ctx.arc(planetX, planetY, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();
        }
        // ============================

        // 惑星の角度を更新して、次のフレームでの位置を計算できるようにする
        planet.angle += planet.baseSpeed * currentSpeedMultiplier / 100;
    });

    ctx.restore(); // 全体の描画状態を元に戻す (translateなどを解除)

    // 次のフレームをリクエスト
    requestAnimationFrame(draw);
}

// ウィンドウサイズ変更時のリサイズ処理 (前回と同じ)
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 注: リサイズ時の再スケーリングは含まれていません。
});


// アニメーションを開始
draw();