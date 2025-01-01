const imageUpload = document.getElementById('imageUpload');
const preview = document.getElementById('preview');
const createGifButton = document.getElementById('createGif');
const resultGif = document.getElementById('resultGif');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const delayInput = document.getElementById('delayInput');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const checkRandomMikuji = document.getElementById('random_mikuji');
const checkRenketsu_gif = document.getElementById('renketsu_gif');

const textArray = [
    "大吉", "吉", "中吉", "小吉",
    "末吉", "凶", "大凶"
];

let availableTexts = [...textArray];

let uploadedImages = [];


function getRandomText() {
    if (availableTexts.length === 0) {
        // すべての文字列を使い切ったら、配列を再初期化
        availableTexts = [...textArray];
    }
    const randomIndex = Math.floor(Math.random() * availableTexts.length);
    const selectedText = availableTexts[randomIndex];
    // 選んだ文字列を配列から削除
    availableTexts.splice(randomIndex, 1);
    return selectedText;
}

imageUpload.addEventListener('change', function(e) {
    preview.innerHTML = '';
    uploadedImages = [];
    
    Array.from(e.target.files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.setAttribute('class', 'up-img');
                preview.appendChild(div);

                const img = document.createElement('img');
                img.src = event.target.result;
                div.appendChild(img);
                uploadedImages.push(img);

                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.placeholder = `大吉、吉などを入れてください`;
                div.appendChild(textInput);
            }
            reader.readAsDataURL(file);
        }
    });
});

createGifButton.addEventListener('click', function() {
    if (uploadedImages.length === 0) {
        alert('画像をアップロードしてください');
        return;
    }

    const encoder = new GIFEncoder();
    encoder.setRepeat(0); // 0 = ループ
    const delay = parseInt(delayInput.value);
    encoder.setDelay(delay); // ユーザーが設定した遅延時間を使用
    encoder.start();

    // ユーザーが設定したキャンバスサイズを使用
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    canvas.width = width;
    canvas.height = height;

    const inputElements = preview.querySelectorAll('input');

    uploadedImages.forEach((img, index) => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if(!checkRenketsu_gif.checked){
            const textInput = inputElements[index];
            let text = "";
            if(textInput.value){
                text = textInput.value;
            }
            if(checkRandomMikuji.checked){
                text = getRandomText();
            }
            
            const fontSize = 40;
            ctx.font = `${fontSize}px serif`;
            ctx.textAlign = 'center';
            
            // テキストの背景を描画
            ctx.fillStyle = 'white';
            ctx.fillRect(
                0,
                canvas.height - 150,
                canvas.width,
                100
            );
            
            // テキストを描画
            ctx.fillStyle = 'Red';
            ctx.fillText(text, canvas.width / 2, canvas.height - 88);
        }

        encoder.addFrame(ctx);
    });

    encoder.finish();

    const binaryGif = encoder.stream().getData();
    const dataUrl = 'data:image/gif;base64,' + btoa(binaryGif);
    resultGif.src = dataUrl;
});
