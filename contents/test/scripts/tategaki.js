const tategaki = (function() {
    const trimming = function(pixels) {
        const data = pixels.data;
        let targetLeftX = -1;
        let targetRightX = -1;
        let targetTopY = -1;
        let targetBottomY = -1;
    
        // left-xを求める
        for (let col = 0; col < pixels.width; col++) {
            for (let row = 0; row < pixels.height; row++) {
                const i = row * pixels.width * 4 + col * 4;
                if (data[i + 3] !== 0) {
                    targetLeftX = col;
                    break;
                }
            }
            if (targetLeftX !== -1) {
                break;
            }
        }
    
        if (targetLeftX === -1) {
            throw new Error("文字がない！！真っ白！！");
        }
    
        // right-xを求める
        for (let col = pixels.width - 1; col >= 0; col--) {
            for (let row = 0; row < pixels.height; row++) {
                const i = row * pixels.width * 4 + col * 4;
                if (data[i + 3] !== 0) {
                    targetRightX = col;
                    break;
                }
            }
            if (targetRightX !== -1) {
                break;
            }
        }
    
        // top-yを求める
        for (let row = 0; row < pixels.height; row++) {
            for (let col = targetLeftX; col <= targetRightX; col++) {
                const i = row * pixels.width * 4 + col * 4;
                if (data[i + 3] !== 0) {
                    targetTopY = row;
                    break;
                }
            }
            if (targetTopY !== -1) {
                break;
            }
        }
    
        // bottom-yを求める
        for (let row = pixels.height - 1; row >= 0; row--) {
            for (let col = targetLeftX; col <= targetRightX; col++) {
                const i = row * pixels.width * 4 + col * 4;
                if (data[i + 3] !== 0) {
                    targetBottomY = row;
                    break;
                }
            }
            if (targetBottomY !== -1) {
                break;
            }
        }
    
        return {
            x: targetLeftX, y: targetTopY,
            width: targetRightX - targetLeftX + 1,
            height: targetBottomY - targetTopY + 1
        };
    }

    return function(font, text, tateMargin = 4, letterSpacing = 4) {
        const tmpCanvas = document.createElement("canvas");
        const tmpContext = tmpCanvas.getContext("2d", { willReadFrequently: true });
        
        // 小さい文字 デフォルトで右寄せ 半角スペースもここに属する
        const smallCharList = "、。.,っゃゅょぁぃぅぇぉッャュョァィゥェォ 「」『』()（）【】";
        // 時計回りに90度回転させる文字
        const rotateCharList = "「」『』()（）【】ー ～…-";
        // 反転させる文字
        const reverseCharList = "ー～";
        // 中央寄せする文字
        const centerJustifiedCharList = "()（）【】…";
        // 左寄せする文字
        const leftJustifiedCharList = "」』";
        // 上寄せする文字
        const topJustifiedCharList = "、。」』";
        // 下寄せする文字
        const bottomJustifiedCharList = "「『";
        // 基準の文字 寄せの基準とか足りない余白の計算に使ったりする
        const standardChar = "あ";
    
        let minCanvasHeight = 0;
        const {
            width: standardCharWidth,
            height: standardCharHeight
        } = (() => {
            tmpContext.font = font;
            tmpContext.textBaseline = "top";
            tmpContext.textAlign = "center";
            const measure = tmpContext.measureText(standardChar)
            tmpCanvas.width = Math.ceil(measure.width);
            minCanvasHeight = Math.ceil(Math.abs(measure.actualBoundingBoxAscent) + measure.actualBoundingBoxDescent);
            tmpCanvas.height = minCanvasHeight;
    
            tmpContext.font = font;
            tmpContext.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
            tmpContext.fillStyle = "#000";
            tmpContext.textBaseline = "top";
            tmpContext.textAlign = "center";
            tmpContext.fillText(standardChar, tmpCanvas.width / 2, 0);
            return trimming(tmpContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height));
        })();
    
        // 各文字の幅、高さの抽出とか
        let tmpCanvasWidth = 0;
        let tmpCanvasHeight = 0;
        const charList = [];
        for (const char of text) {
            tmpContext.font = font;
            tmpContext.textBaseline = "top";
            tmpContext.textAlign = "center";
            const measure = tmpContext.measureText(char);
            const width = measure.width;
            const height = Math.abs(measure.actualBoundingBoxAscent) + measure.actualBoundingBoxDescent;
            let canvasWidth = width;
            let canvasHeight = height;
    
            if (rotateCharList.includes(char)) {
                canvasWidth = height;
                canvasHeight = width;
            }
    
            charList.push({
                value: char,
                width: width,
                height: height,
                canvasWidth: canvasWidth,
                canvasHeight: canvasHeight,
            });
            if (tmpCanvasWidth < canvasWidth) {
                tmpCanvasWidth = canvasWidth;
            }
            tmpCanvasHeight += Math.max(canvasHeight, standardCharHeight);
        }
    
        tmpCanvas.width = Math.ceil(tmpCanvasWidth);
        tmpCanvas.height = Math.ceil(tmpCanvasHeight) + letterSpacing * (charList.length - 1);
        tmpContext.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    
        const tmpCanvas2 = document.createElement("canvas");
        const tmpContext2 = tmpCanvas2.getContext("2d", { willReadFrequently: true });
        let dstY = 0;
        let maxWidth = standardCharWidth;
        let totalHeight = letterSpacing * (charList.length - 1);
        for (const char of charList) {
            const isSmallChar = smallCharList.includes(char.value);
            const isRotateCar = rotateCharList.includes(char.value);
            const isReverseChar = reverseCharList.includes(char.value);
            const isCenterJustifiedChar = centerJustifiedCharList.includes(char.value); 
            const isLeftJustifiedChar = leftJustifiedCharList.includes(char.value);
            const isTopJustifiedChar = topJustifiedCharList.includes(char.value);
            const isBottomJustifiedChar = bottomJustifiedCharList.includes(char.value);
    
            tmpCanvas2.width = Math.ceil(char.canvasWidth);
            tmpCanvas2.height = Math.max(Math.ceil(char.canvasHeight), minCanvasHeight);
    
            if (isRotateCar) {
                tmpCanvas2.width = tmpCanvas2.height = Math.max(tmpCanvas2.width, tmpCanvas2.height);
            }
    
            // テキスト反映
            tmpContext2.font = font;
            tmpContext2.clearRect(0, 0, tmpCanvas2.width, tmpCanvas2.height);
            tmpContext2.fillStyle = "#000";
            tmpContext2.textBaseline = "middle";
            tmpContext2.textAlign = "center";
    
            if (isRotateCar) {
                tmpContext2.translate(tmpCanvas2.width / 2, tmpCanvas2.height / 2);
                tmpContext2.rotate(Math.PI / 2);
                tmpContext2.translate(-tmpCanvas2.width / 2, -tmpCanvas2.height / 2);
            }
            if (isReverseChar) {
                tmpContext2.scale(1, -1);
                tmpContext2.translate(0, -tmpCanvas2.height);
            }
    
            tmpContext2.fillText(char.value, tmpCanvas2.width / 2, tmpCanvas2.height / 2);
            // トリミング
            let trimmed = null;
            try {
                trimmed = trimming(tmpContext2.getImageData(0, 0, tmpCanvas2.width, tmpCanvas2.height));
            }
            catch (e) {
                trimmed = {
                    x: 0, y: 0,
                    width: standardCharWidth,
                    height: standardCharHeight
                };
                if (char.value === " ") {
                    trimmed.height /= 2;
                }
            }
    
            // 転写
            let dstX = (tmpCanvas.width - trimmed.width) / 2;
    
            if (isSmallChar && !isCenterJustifiedChar) {
                // 右寄せ
                dstX = (tmpCanvas.width - standardCharWidth) / 2 + standardCharWidth - trimmed.width;
            }
            if (isLeftJustifiedChar) {
                // 左寄せ
                dstX = (tmpCanvas.width - standardCharWidth) / 2;
            }
            
            // 漢数字の「一」みたいな文字は必要な余白すら切り取られてしまうので対策
            let isLargeMarginChar = !isSmallChar && trimmed.height < standardCharHeight;
            // ただし、これらは除外する
            if (isLargeMarginChar) {
                // ASCII ひらかな 全角カタカナ 半角カタカナ 半角数字 全角数字 全角英字大文字 全角英字小文字
                if (/[\x00-\x7F\u3040-\u309F\u30A0-\u30FF\uFF61-\uFF9F0-9０-９Ａ-Ｚａ-ｚ]/.test(char.value)) {
                    isLargeMarginChar = false;
                }
            }

            // 小さい文字も最低限の高さを与える
            const standardCharHalfHeight = standardCharHeight / 2;
            const isSmallMarginChar = isSmallChar && trimmed.height < standardCharHalfHeight;

            const prevDestY = dstY;
            if (isLargeMarginChar) {
                dstY += (standardCharHeight - trimmed.height) / 2;
            }
            else if (isSmallMarginChar) {
                if (isTopJustifiedChar) {
                    // 何もしない
                }
                else if (isBottomJustifiedChar) {
                    dstY += standardCharHalfHeight - trimmed.height;
                }
                else {
                    dstY += (standardCharHalfHeight - trimmed.height) / 2;
                }
            }
    
            tmpContext.putImageData(tmpContext2.getImageData(trimmed.x, trimmed.y, trimmed.width, trimmed.height), dstX, dstY);
    
            if (isLargeMarginChar) {
                dstY = prevDestY;
                dstY += standardCharHeight + letterSpacing;
                totalHeight += standardCharHeight;
            }
            else if (isSmallMarginChar) {
                dstY = prevDestY;
                dstY += standardCharHalfHeight + letterSpacing;
                totalHeight += standardCharHalfHeight;
            }
            else {
                dstY += trimmed.height + letterSpacing;
                totalHeight += trimmed.height;
            }
    
            if (maxWidth < trimmed.width) {
                maxWidth = trimmed.width;
            }
        }
    
        let yokoMargin = 0;
        tmpCanvas2.width = maxWidth + yokoMargin * 2;
        tmpCanvas2.height = totalHeight + tateMargin * 2;
        tmpContext2.clearRect(0, 0, tmpCanvas2.width, tmpCanvas2.height);
        const dstX = (tmpCanvas2.width - tmpCanvas.width) / 2;
        tmpContext2.drawImage(tmpCanvas, dstX, tateMargin);
    
        return tmpCanvas2;
    }
})();
