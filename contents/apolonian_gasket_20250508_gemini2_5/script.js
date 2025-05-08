document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('apollonianGasketCanvas');
    const ctx = canvas.getContext('2d');
    const speedSlider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValue');

    const WIDTH = 800;
    const HEIGHT = 800;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const MIN_RADIUS_NORMALIZED = 0.002;
    const MAX_DEPTH = 7;

    const allCircles = [];
    const processedCirclesKeys = new Set();

    let yonnnanaImage = null;
    let yonnnanaImageLoaded = false;
    let currentGasketRotationAngle = 0;
    let rotationSpeed = 0.005; // 初期回転速度
    let animationFrameId = null;

    // スライダーの初期値を設定し、表示を更新
    // スライダーの値は0-100、実際の速度は0-0.01の範囲と仮定
    const mapSliderValueToSpeed = (sliderValue) => {
        return (parseFloat(sliderValue) / 100) * 0.01; // 0-100 を 0-0.01 にマッピング
    };

    const updateSpeedFromSlider = () => {
        rotationSpeed = mapSliderValueToSpeed(speedSlider.value);
        speedValueDisplay.textContent = rotationSpeed.toFixed(4);
    };

    speedSlider.addEventListener('input', updateSpeedFromSlider);
    updateSpeedFromSlider(); // 初期値を設定・表示

    yonnnanaImage = new Image();
    yonnnanaImage.onload = () => {
        yonnnanaImageLoaded = true;
        console.log("yonnnana.png loaded successfully.");
        initGasketData();
        startAnimation();
    };
    yonnnanaImage.onerror = () => {
        console.error("Failed to load yonnnana.png. Drawing without image.");
        initGasketData();
        startAnimation();
    };
    yonnnanaImage.src = 'yonnnana.png';

    const Complex = { // ... (変更なし)
        create: (re, im) => ({ re, im }),
        add: (z1, z2) => ({ re: z1.re + z2.re, im: z1.im + z2.im }),
        sub: (z1, z2) => ({ re: z1.re - z2.re, im: z1.im - z2.im }),
        mulScalar: (s, z) => ({ re: s * z.re, im: s * z.im }),
        divScalar: (z, s) => ({ re: z.re / s, im: z.im / s }),
        sqrt: (z) => {
            const mag = Math.hypot(z.re, z.im);
            const phi = Math.atan2(z.im, z.re);
            const sqrtMag = Math.sqrt(mag);
            return { re: sqrtMag * Math.cos(phi / 2), im: sqrtMag * Math.sin(phi / 2) };
        }
    };

    function createCircle(k, z) { // ... (変更なし)
        const r = Math.abs(1 / k);
        return { k, z, r };
    }

    function drawCircleWithImage(circle, scale, currentGasketAngle) { // ... (変更なし)
        const circleCenterX_relative = circle.z.re * scale;
        const circleCenterY_relative = circle.z.im * scale;
        const canvasR = circle.r * scale;

        ctx.beginPath();
        ctx.arc(circleCenterX_relative, circleCenterY_relative, canvasR, 0, 2 * Math.PI);
        const hue = (Math.abs(circle.k) * 10) % 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = Math.max(0.5, 2 - Math.log10(canvasR + 1));
        ctx.stroke();

        if (yonnnanaImageLoaded && canvasR > 10) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(circleCenterX_relative, circleCenterY_relative, canvasR, 0, 2 * Math.PI);
            ctx.clip();
            ctx.translate(circleCenterX_relative, circleCenterY_relative);
            ctx.rotate(-currentGasketAngle);

            const img = yonnnanaImage;
            const imgAspectRatio = img.width / img.height;
            let drawWidth, drawHeight;
            const diameter = canvasR * 2;
            const marginFactor = 1;

            if (imgAspectRatio >= 1) {
                drawWidth = diameter * marginFactor;
                drawHeight = drawWidth / imgAspectRatio;
                if (drawHeight > diameter * marginFactor) {
                    drawHeight = diameter * marginFactor;
                    drawWidth = drawHeight * imgAspectRatio;
                }
            } else {
                drawHeight = diameter * marginFactor;
                drawWidth = drawHeight * imgAspectRatio;
                if (drawWidth > diameter * marginFactor) {
                    drawWidth = diameter * marginFactor;
                    drawHeight = drawWidth / imgAspectRatio;
                }
            }
            const drawImgX = -drawWidth / 2;
            const drawImgY = -drawHeight / 2;
            try {
                ctx.drawImage(img, drawImgX, drawImgY, drawWidth, drawHeight);
            } catch (e) {
                console.error("Error drawing image in circle:", e);
            }
            ctx.restore();
        }
    }

    function solve(c1, c2, c3, c_known, depth) { // ... (変更なし)
        if (depth > MAX_DEPTH) return;
        const k_new_val = 2 * (c1.k + c2.k + c3.k) - c_known.k;
        const r_new = Math.abs(1 / k_new_val);
        if (r_new < MIN_RADIUS_NORMALIZED) return;
        let sum_kz = Complex.mulScalar(c1.k, c1.z);
        sum_kz = Complex.add(sum_kz, Complex.mulScalar(c2.k, c2.z));
        sum_kz = Complex.add(sum_kz, Complex.mulScalar(c3.k, c3.z));
        const term_2_sum_kz = Complex.mulScalar(2, sum_kz);
        const term_known_kz = Complex.mulScalar(c_known.k, c_known.z);
        const k_new_z_new = Complex.sub(term_2_sum_kz, term_known_kz);
        const z_new = Complex.divScalar(k_new_z_new, k_new_val);
        const new_circle = createCircle(k_new_val, z_new);
        const circleKey = `${new_circle.k.toFixed(6)}_${new_circle.z.re.toFixed(6)}_${new_circle.z.im.toFixed(6)}`;
        if (processedCirclesKeys.has(circleKey)) return;
        processedCirclesKeys.add(circleKey);
        allCircles.push(new_circle);
        solve(c1, c2, new_circle, c3, depth + 1);
        solve(c1, c3, new_circle, c2, depth + 1);
        solve(c2, c3, new_circle, c1, depth + 1);
    }

    function initGasketData() { // ... (変更なし)
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
        console.log(`Generated ${allCircles.length} circles for gasket.`);
    }

    function animate() {
        currentGasketRotationAngle += rotationSpeed; // ★ スライダーで変更された速度を使用

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        const scale = Math.min(WIDTH, HEIGHT) / 2 * 0.95;
        const canvasCenterX = WIDTH / 2;
        const canvasCenterY = HEIGHT / 2;

        ctx.save();
        ctx.translate(canvasCenterX, canvasCenterY);
        ctx.rotate(currentGasketRotationAngle);

        allCircles.forEach(circle => {
            if (circle.k < 0 && circle.r > 10000) return;
            if (circle.k === -1 && circle.z.re === 0 && circle.z.im === 0) {
                 const tempyonnnanaLoaded = yonnnanaImageLoaded;
                 yonnnanaImageLoaded = false;
                 drawCircleWithImage(circle, scale, currentGasketRotationAngle);
                 yonnnanaImageLoaded = tempyonnnanaLoaded;
            } else {
                drawCircleWithImage(circle, scale, currentGasketRotationAngle);
            }
        });
        ctx.restore();
        animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimation() { // ... (変更なし)
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animate();
    }
});