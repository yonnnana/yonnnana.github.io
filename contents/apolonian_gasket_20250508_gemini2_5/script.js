document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('apollonianGasketCanvas');
    const ctx = canvas.getContext('2d');
    const speedSlider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValue');

    let WIDTH = 800;  // 初期値、リサイズ時に更新
    let HEIGHT = 800; // 初期値、リサイズ時に更新

    const MIN_RADIUS_NORMALIZED = 0.002;
    const MAX_DEPTH = 7; // 負荷を考慮

    const allCircles = []; // ギャスケットのデータは一度計算したら再利用
    const processedCirclesKeys = new Set();
    let gasketDataInitialized = false;

    let yonnnanaImage = null;
    let yonnnanaImageLoaded = false;
    let currentGasketRotationAngle = 0;
    let rotationSpeed = 0.005;
    let animationFrameId = null;

    const mapSliderValueToSpeed = (sliderValue) => {
        // スライダーの値 (0-100) を実際の回転速度 (例: 0-0.01 や 0-0.02) にマッピング
        return (parseFloat(sliderValue) / 100) * 0.02; // 0-100 を 0-0.02 にマッピング
    };

    const updateSpeedFromSlider = () => {
        rotationSpeed = mapSliderValueToSpeed(speedSlider.value);
        speedValueDisplay.textContent = rotationSpeed.toFixed(4);
    };

    speedSlider.addEventListener('input', updateSpeedFromSlider);
    // updateSpeedFromSlider(); // resizeCanvasAndRedraw で初期化後に呼ぶ

    yonnnanaImage = new Image();
    yonnnanaImage.onload = () => {
        yonnnanaImageLoaded = true;
        console.log("yonnnana.png loaded successfully.");
        if (!gasketDataInitialized) { // まだデータが初期化されていなければ
            initGasketData();
        }
        resizeCanvasAndRedraw(); // 画像読み込み後にもリサイズと再描画をトリガー
        startAnimation();
    };
    yonnnanaImage.onerror = () => {
        console.error("Failed to load yonnnana.png. Drawing without image.");
        if (!gasketDataInitialized) {
            initGasketData();
        }
        resizeCanvasAndRedraw();
        startAnimation();
    };
    yonnnanaImage.src = 'yonnnana.png';

    const Complex = {
        create: (re, im) => ({ re, im }),
        add: (z1, z2) => ({ re: z1.re + z2.re, im: z1.im + z2.im }),
        sub: (z1, z2) => ({ re: z1.re - z2.re, im: z1.im - z2.im }),
        mulScalar: (s, z) => ({ re: s * z.re, im: s * z.im }),
        divScalar: (z, s) => ({ re: z.re / s, im: z.im / s }),
        sqrt: (z) => { // 主平方根
            const mag = Math.hypot(z.re, z.im);
            const phi = Math.atan2(z.im, z.re);
            const sqrtMag = Math.sqrt(mag);
            return { re: sqrtMag * Math.cos(phi / 2), im: sqrtMag * Math.sin(phi / 2) };
        }
    };

    function createCircle(k, z) {
        // k: 曲率 (1/半径), z: 中心の複素数座標
        const r = Math.abs(1 / k);
        return { k, z, r };
    }

    function drawCircleWithImage(circle, scale, currentGasketAngle) {
        // canvasX, canvasY はギャスケットの回転が適用される前の、
        // (Canvas中心を0,0としたときの)円の中心の相対座標
        const circleCenterX_relative = circle.z.re * scale;
        const circleCenterY_relative = circle.z.im * scale;
        const canvasR = circle.r * scale;

        // --- 1. 円の枠線を描画 ---
        // 円の枠線はギャスケット全体の回転に従う
        ctx.beginPath();
        ctx.arc(circleCenterX_relative, circleCenterY_relative, canvasR, 0, 2 * Math.PI);
        const hue = (Math.abs(circle.k) * 10) % 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = Math.max(0.5, 2 - Math.log10(canvasR + 1));
        ctx.stroke();


        // --- 2. 画像を描画 ---
        if (yonnnanaImageLoaded && canvasR > 10) {
            ctx.save(); // 現在の変換状態（ギャスケット全体の回転が含まれている）を保存

            // A. クリッピングパスの設定 (円の形状)
            // クリッピングパスは、ギャスケットの回転が適用された後の円の位置に設定
            ctx.beginPath();
            ctx.arc(circleCenterX_relative, circleCenterY_relative, canvasR, 0, 2 * Math.PI);
            ctx.clip();

            // B. 画像のための変換
            // 画像を円の中心に移動
            ctx.translate(circleCenterX_relative, circleCenterY_relative);
            // 画像にギャスケットの逆回転を適用 (これにより画像はグローバル座標で静止する)
            ctx.rotate(-currentGasketAngle);

            const img = yonnnanaImage;
            const imgAspectRatio = img.width / img.height;
            let drawWidth, drawHeight;
            const diameter = canvasR * 2;
            const marginFactor = 1;

            if (imgAspectRatio >= 1) { // 横長または正方形
                drawWidth = diameter * marginFactor;
                drawHeight = drawWidth / imgAspectRatio;
                if (drawHeight > diameter * marginFactor) {
                    drawHeight = diameter * marginFactor;
                    drawWidth = drawHeight * imgAspectRatio;
                }
            } else { // 縦長
                drawHeight = diameter * marginFactor;
                drawWidth = drawHeight * imgAspectRatio;
                if (drawWidth > diameter * marginFactor) {
                    drawWidth = diameter * marginFactor;
                    drawHeight = drawWidth / imgAspectRatio;
                }
            }

            // 画像は(0,0)中心に回転されたので、描画位置は(-width/2, -height/2)
            const drawImgX = -drawWidth / 2;
            const drawImgY = -drawHeight / 2;

            try {
                ctx.drawImage(img, drawImgX, drawImgY, drawWidth, drawHeight);
            } catch (e) {
                console.error("Error drawing image in circle:", e);
            }

            ctx.restore(); // Bの変換とAのクリッピングを元に戻す
        }
    }
    
    function solve(c1, c2, c3, c_known, depth) {
        if (depth > MAX_DEPTH) {
            return;
        }

        const k_new_val = 2 * (c1.k + c2.k + c3.k) - c_known.k;
        
        const r_new = Math.abs(1 / k_new_val);
        if (r_new < MIN_RADIUS_NORMALIZED) {
            return;
        }

        let sum_kz = Complex.mulScalar(c1.k, c1.z);
        sum_kz = Complex.add(sum_kz, Complex.mulScalar(c2.k, c2.z));
        sum_kz = Complex.add(sum_kz, Complex.mulScalar(c3.k, c3.z));
        
        const term_2_sum_kz = Complex.mulScalar(2, sum_kz);
        const term_known_kz = Complex.mulScalar(c_known.k, c_known.z);
        
        const k_new_z_new = Complex.sub(term_2_sum_kz, term_known_kz);
        const z_new = Complex.divScalar(k_new_z_new, k_new_val);

        const new_circle = createCircle(k_new_val, z_new);

        const circleKey = `${new_circle.k.toFixed(6)}_${new_circle.z.re.toFixed(6)}_${new_circle.z.im.toFixed(6)}`;
        if (processedCirclesKeys.has(circleKey)) {
            return;
        }
        processedCirclesKeys.add(circleKey);
        allCircles.push(new_circle);

        solve(c1, c2, new_circle, c3, depth + 1);
        solve(c1, c3, new_circle, c2, depth + 1);
        solve(c2, c3, new_circle, c1, depth + 1);
    }

    function initGasketData() {
        if (gasketDataInitialized) return; // 既に初期化済みなら何もしない

        allCircles.length = 0;
        processedCirclesKeys.clear();

        const C0 = createCircle(-1, Complex.create(0, 0));
        const C1 = createCircle(2, Complex.create(0.5, 0));
        const C2 = createCircle(2, Complex.create(-0.5, 0));

        const k_soddy_val = C0.k + C1.k + C2.k;
        
        const sum_kizi_initial = Complex.add(Complex.mulScalar(C1.k, C1.z), Complex.mulScalar(C2.k, C2.z));
        const term_sqrt_initial_val_sq = Complex.mulScalar(C1.k * C2.k, Complex.create(C1.z.re * C2.z.re - C1.z.im * C2.z.im, C1.z.re * C2.z.im + C1.z.im * C2.z.re));
        
        const two_sqrt_Q = Complex.mulScalar(2, Complex.sqrt(term_sqrt_initial_val_sq));

        const C3_z_num = Complex.add(sum_kizi_initial, two_sqrt_Q);
        const C3 = createCircle(k_soddy_val, Complex.divScalar(C3_z_num, k_soddy_val));
        
        const C4_z_num = Complex.sub(sum_kizi_initial, two_sqrt_Q);
        const C4 = createCircle(k_soddy_val, Complex.divScalar(C4_z_num, k_soddy_val));

        allCircles.push(C0, C1, C2, C3, C4);
        allCircles.forEach(c => {
            const key = `${c.k.toFixed(6)}_${c.z.re.toFixed(6)}_${c.z.im.toFixed(6)}`;
            processedCirclesKeys.add(key);
        });
        
        solve(C0, C1, C3, C2, 0);
        solve(C0, C1, C4, C2, 0);
        solve(C0, C2, C3, C1, 0);
        solve(C0, C2, C4, C1, 0);
        solve(C1, C2, C3, C0, 0);
        solve(C1, C2, C4, C0, 0);

        gasketDataInitialized = true;
        console.log(`Generated ${allCircles.length} circles for gasket.`);
    }

    // Canvasの描画処理のみを行う関数 (アニメーションループから分離)
    function drawFrame() {
        if (!gasketDataInitialized) return; // データがなければ描画しない

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        const scale = Math.min(WIDTH, HEIGHT) / 2 * 0.95; // 新しいWIDTH, HEIGHTに基づくスケール
        const canvasCenterX = WIDTH / 2;
        const canvasCenterY = HEIGHT / 2;

        ctx.save();
        ctx.translate(canvasCenterX, canvasCenterY);
        ctx.rotate(currentGasketRotationAngle);

        allCircles.forEach(circle => {
            if (circle.k < 0 && circle.r > 10000) return; // 外側の巨大な円はスキップ
            // 外側の円(C0)には画像を描画しない場合
            if (circle.k === -1 && circle.z.re === 0 && circle.z.im === 0) {
                 const tempyonnnanaLoaded = yonnnanaImageLoaded; // 一時的にフラグを操作
                 yonnnanaImageLoaded = false;
                 drawCircleWithImage(circle, scale, currentGasketRotationAngle);
                 yonnnanaImageLoaded = tempyonnnanaLoaded;
            } else {
                drawCircleWithImage(circle, scale, currentGasketRotationAngle);
            }
        });
        ctx.restore();
    }

    function animate() {
        currentGasketRotationAngle += rotationSpeed;
        drawFrame(); // 描画処理を呼び出す
        animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (!gasketDataInitialized) {
            console.warn("Gasket data not initialized. Cannot start animation.");
            return;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animate();
    }

    // Canvasのリサイズと再描画を行う関数
    function resizeCanvasAndRedraw() {
        // CSSで max-width, max-height を設定しているので、それに合わせることを試みる
        // getComputedStyleは実際のレンダリング後の値を取得するが、
        // vw/vh単位の場合、ウィンドウリサイズ直後だと古い値の場合があるので注意
        // より単純には、window.innerWidth/Height を直接使うことが多い

        let newWidth = window.innerWidth * 0.95; // ビューポート幅の95%
        let newHeight = window.innerHeight * 0.80; // ビューポート高さの80% (コントロール分を考慮)
        
        // CSSのmax値を取得して適用する場合 (より厳密だが少し複雑)
        // const canvasStyle = getComputedStyle(canvas);
        // const cssMaxWidth = parseFloat(canvasStyle.maxWidth);
        // const cssMaxHeight = parseFloat(canvasStyle.maxHeight);
        // if (!isNaN(cssMaxWidth) && newWidth > cssMaxWidth) newWidth = cssMaxWidth;
        // if (!isNaN(cssMaxHeight) && newHeight > cssMaxHeight) newHeight = cssMaxHeight;
        
        // アスペクト比を1:1に保つ場合 (正方形にする)
        const size = Math.min(newWidth, newHeight);
        WIDTH = size;
        HEIGHT = size;

        // Canvasの実際の描画バッファサイズを設定
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        // CSSでサイズを制御する場合は、以下も設定することがある (今回は不要かもしれない)
        // canvas.style.width = WIDTH + 'px';
        // canvas.style.height = HEIGHT + 'px';


        // ギャスケットデータが初期化されていれば、現在のフレームを描画
        if (gasketDataInitialized) {
            // アニメーションが止まっているかもしれないので、現在の角度で一度描画
            drawFrame();
        }
        // スライダーの初期値をここで設定 (リサイズ後にコントロールが表示されるため)
        updateSpeedFromSlider();
    }

    // ウィンドウリサイズイベントのリスナー
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // リサイズイベントが頻繁に発生するのを抑制（デバウンス）
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvasAndRedraw();
            // アニメーションが止まっている場合もあるので、必要なら再開
            // 今回はアニメーションは常に動いている前提なので、特に何もしない
            // もし停止/再生機能があるなら、ここで考慮する
        }, 100); // 100msの遅延
    });

    // 初期化処理
    if (!gasketDataInitialized) {
        initGasketData();
    }
    resizeCanvasAndRedraw(); // 初回のリサイズと描画（または準備）
    // startAnimation(); // yonnnanaImage.onload / onerror に移動済み
});