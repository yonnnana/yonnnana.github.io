document.addEventListener('DOMContentLoaded', () => {
    const qrDataInput = document.getElementById('qrData');
    // const logoImageInput = document.getElementById('logoImage'); // これを削除
    const errorCorrectionSelect = document.getElementById('errorCorrection');
    const qrSizeInput = document.getElementById('qrSize');
    const generateButton = document.getElementById('generateButton');
    const downloadButton = document.getElementById('downloadButton');
    const qrCanvas = document.getElementById('qrCanvas');
    const messageElement = document.getElementById('message');

    // 初期値として何かQRコードを生成しておく
    qrDataInput.value = "https://www.google.com/";
    generateQRCode();

    generateButton.addEventListener('click', generateQRCode);
    downloadButton.addEventListener('click', downloadQRCode);

    function showMessage(msg, isError = true) {
        messageElement.textContent = msg;
        messageElement.style.color = isError ? '#d9534f' : '#28a745';
        messageElement.classList.remove('hidden');
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000); // 5秒後に非表示
    }

    async function generateQRCode() {
        const qrData = qrDataInput.value;
        const errorCorrectionLevel = errorCorrectionSelect.value;
        const qrSize = parseInt(qrSizeInput.value, 10);
        // const logoFile = logoImageInput.files[0]; // これを削除

        if (!qrData) {
            showMessage('QRコードのデータを入力してください。');
            return;
        }

        if (qrSize < 100 || qrSize > 1000 || isNaN(qrSize)) {
            showMessage('QRコードのサイズは100から1000の間で設定してください。');
            return;
        }

        // Canvasのサイズを設定
        qrCanvas.width = qrSize;
        qrCanvas.height = qrSize;
        const ctx = qrCanvas.getContext('2d');
        
        // 背景を白で塗りつぶし（前回の描画をクリアするため）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);

        // QRコード生成オプション
        const qrOptions = {
            errorCorrectionLevel: errorCorrectionLevel,
            width: qrSize,
            margin: 1 // QRコードの外側の余白
        };

        try {
            // qrcode.jsでQRコードをCanvasに描画
            await new Promise((resolve, reject) => {
                QRCode.toCanvas(qrCanvas, qrData, qrOptions, (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            // ロゴ画像を固定パス 'logo.png' から読み込み、QRコードの中央に描画
            const logoImage = new Image();
            logoImage.src = 'logo.png'; // ここを固定のファイルパスに変更

            logoImage.onload = function() {
                const canvasWidth = qrCanvas.width;
                const canvasHeight = qrCanvas.height;

                // ロゴのサイズをQRコードの約20%〜25%に設定
                const logoMaxWidth = canvasWidth * 0.25; 
                const logoMaxHeight = canvasHeight * 0.25;

                let logoWidth = logoImage.width;
                let logoHeight = logoImage.height;

                // ロゴがQRコードより大きい場合は縮小
                if (logoWidth > logoMaxWidth || logoHeight > logoMaxHeight) {
                    const aspectRatio = logoWidth / logoHeight;
                    if (logoWidth / aspectRatio > logoMaxHeight) { // 高さが上限を超える場合
                        logoHeight = logoMaxHeight;
                        logoWidth = logoHeight * aspectRatio;
                    }
                    if (logoWidth > logoMaxWidth) { // 幅が上限を超える場合
                        logoWidth = logoMaxWidth;
                        logoHeight = logoWidth / aspectRatio;
                    }
                }
                
                // ロゴを中央に配置するための座標計算
                const centerX = (canvasWidth - logoWidth) / 2;
                const centerY = (canvasHeight - logoHeight) / 2;

                // ロゴの背景を白く塗りつぶし（ロゴの視認性向上）
                // ロゴの周りに少し余白を持たせる
                const backgroundPadding = 10; 
                ctx.fillStyle = 'white';
                ctx.fillRect(centerX - backgroundPadding / 2, centerY - backgroundPadding / 2, 
                             logoWidth + backgroundPadding, logoHeight + backgroundPadding);

                // ロゴを描画
                ctx.drawImage(logoImage, centerX, centerY, logoWidth, logoHeight);
                showMessage('QRコードとロゴが生成されました！', false);
            };
            
            logoImage.onerror = function() {
                // logo.png が見つからない、または読み込みに失敗した場合
                showMessage('ロゴ画像 (logo.png) の読み込みに失敗しました。ファイルが同階層にあるか確認してください。', true);
                // ロゴがなくてもQRコード自体は表示されているので、その旨も伝える
                showMessage('QRコードは生成されましたが、ロゴ画像 (logo.png) の読み込みに失敗しました。', false); 
            };

        } catch (error) {
            showMessage('QRコードの生成中にエラーが発生しました: ' + error.message);
        }
    }

    function downloadQRCode() {
        if (qrCanvas.width === 0 || qrCanvas.height === 0) {
            showMessage('まずQRコードを生成してください。');
            return;
        }

        const link = document.createElement('a');
        link.download = 'qrcode_with_logo.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
        link.remove();
    }
});