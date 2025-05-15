document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const canvasOutput = document.getElementById('canvasOutput');
    const ctxOutput = canvasOutput.getContext('2d');
    const saveButton = document.getElementById('saveButton');
    const frameContainer = document.querySelector('.frame-container');

    // --- 定数定義 ---
    const FINAL_IMAGE_WIDTH = 1200;
    const FINAL_IMAGE_HEIGHT = 1600;

    // CSSで定義された額縁の各サイズ (px) - これらの値はCSSと一致させる
    const FRAME_BORDER_THICKNESS = 80; // 変更: 新しいボーダーの太さ
    const FRAME_PADDING = 40;          // 変更: 新しいパディング

    // Canvas (写真表示エリア) のサイズ
    const PHOTO_DISPLAY_WIDTH = FINAL_IMAGE_WIDTH - (FRAME_BORDER_THICKNESS * 2) - (FRAME_PADDING * 2);
    // 1200 - (80 * 2) - (40 * 2) = 1200 - 160 - 80 = 960px
    const PHOTO_DISPLAY_HEIGHT = FINAL_IMAGE_HEIGHT - (FRAME_BORDER_THICKNESS * 2) - (FRAME_PADDING * 2);
    // 1600 - (80 * 2) - (40 * 2) = 1600 - 160 - 80 = 1360px

    // プレビュー用Canvasの描画サイズを設定
    canvasOutput.width = PHOTO_DISPLAY_WIDTH;
    canvasOutput.height = PHOTO_DISPLAY_HEIGHT;

    // 初期状態のCanvasを設定
    function initializeCanvas() {
        ctxOutput.fillStyle = getComputedStyle(canvasOutput).backgroundColor || '#cccccc';
        ctxOutput.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
        saveButton.style.display = 'none';
        saveButton.disabled = true;
    }
    initializeCanvas();

    // --- イベントリスナー ---
    imageUpload.addEventListener('change', handleImageUpload);
    saveButton.addEventListener('click', saveFramedImage);

    // --- 関数定義 ---

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    processAndDrawImage(img);
                    saveButton.style.display = 'inline-block';
                    saveButton.disabled = false;
                };
                img.onerror = () => {
                    alert('画像の読み込みに失敗しました。別のファイルをお試しください。');
                    initializeCanvas();
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                alert('ファイルの読み込みに失敗しました。');
                initializeCanvas();
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('画像ファイル（JPEG, PNGなど）を選択してください。');
            initializeCanvas();
            imageUpload.value = '';
        }
    }

    function processAndDrawImage(img) {
        const imgAspectRatio = img.width / img.height;
        const photoDisplayAspectRatio = PHOTO_DISPLAY_WIDTH / PHOTO_DISPLAY_HEIGHT;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspectRatio > photoDisplayAspectRatio) {
            drawWidth = PHOTO_DISPLAY_WIDTH;
            drawHeight = drawWidth / imgAspectRatio;
            offsetX = 0;
            offsetY = (PHOTO_DISPLAY_HEIGHT - drawHeight) / 2;
        } else {
            drawHeight = PHOTO_DISPLAY_HEIGHT;
            drawWidth = drawHeight * imgAspectRatio;
            offsetY = 0;
            offsetX = (PHOTO_DISPLAY_WIDTH - drawWidth) / 2;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawWidth;
        tempCanvas.height = drawHeight;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(img, 0, 0, drawWidth, drawHeight);

        const imageData = tempCtx.getImageData(0, 0, drawWidth, drawHeight);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = grayscale;
            data[i + 1] = grayscale;
            data[i + 2] = grayscale;
        }
        tempCtx.putImageData(imageData, 0, 0);

        ctxOutput.fillStyle = getComputedStyle(canvasOutput).backgroundColor || '#cccccc';
        ctxOutput.fillRect(0, 0, PHOTO_DISPLAY_WIDTH, PHOTO_DISPLAY_HEIGHT);
        ctxOutput.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
    }

    function saveFramedImage() {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = FINAL_IMAGE_WIDTH;
        finalCanvas.height = FINAL_IMAGE_HEIGHT;
        const finalCtx = finalCanvas.getContext('2d');

        // CSSから額縁の色情報を取得 (border-color, background-color)
        const frameStyle = getComputedStyle(frameContainer);
        const frameBorderColor = frameStyle.borderColor; // 'border-color' を取得
        const framePaddingBgColor = frameStyle.backgroundColor; // 'background-color' を取得 (パディング部分の背景)

        // 1. 額縁のボーダー部分を描画 (例: #2d2d2d)
        finalCtx.fillStyle = frameBorderColor;
        finalCtx.fillRect(0, 0, FINAL_IMAGE_WIDTH, FINAL_IMAGE_HEIGHT);

        // 2. 額縁のパディング部分の背景を描画 (例: #707070)
        finalCtx.fillStyle = framePaddingBgColor;
        finalCtx.fillRect(
            FRAME_BORDER_THICKNESS,
            FRAME_BORDER_THICKNESS,
            FINAL_IMAGE_WIDTH - (FRAME_BORDER_THICKNESS * 2),
            FINAL_IMAGE_HEIGHT - (FRAME_BORDER_THICKNESS * 2)
        );

        // 3. 加工済みの写真 (canvasOutputの内容) をパディングの内側に描画
        finalCtx.drawImage(
            canvasOutput,
            FRAME_BORDER_THICKNESS + FRAME_PADDING,
            FRAME_BORDER_THICKNESS + FRAME_PADDING,
            PHOTO_DISPLAY_WIDTH,
            PHOTO_DISPLAY_HEIGHT
        );

        const dataURL = finalCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `iei_photo_${FINAL_IMAGE_WIDTH}x${FINAL_IMAGE_HEIGHT}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});