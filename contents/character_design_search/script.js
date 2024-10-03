let searchData = [];

// JSONデータを読み込む関数
async function loadSearchData() {
    try {
        const response = await fetch('search_data.json');
        searchData = await response.json();
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
    }
}

// 検索を実行する関数
function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerms = searchInput.value.toLowerCase().split(' ').filter(term => term.trim() !== '');
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    const filteredResults = searchData.filter(item => 
        searchTerms.every(term =>
            item.content.toLowerCase().includes(term) ||
            item.tags.some(tag => tag.toLowerCase().includes(term))
        )
    );

    if (filteredResults.length === 0) {
        resultsContainer.innerHTML = '<p>検索結果が見つかりませんでした。</p>';
        return;
    }

    filteredResults.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <h2>${item.title}</h2>
            <p>${highlightTerms(item.content, searchTerms)}</p>
            <a href="${item.url}" target="_blank" class='item-time'>${item.date_time}</a>
            <div class="tags">
                ${item.tags.map(tag => `<span class="tag">${highlightTerms(tag, searchTerms)}</span>`).join('')}
            </div>
        `;
        resultsContainer.appendChild(resultItem);
    });
}

// 検索語をハイライトする関数
function highlightTerms(text, terms) {
    let highlightedText = text;
    terms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        highlightedText = highlightedText.replace(regex, match => `<mark>${match}</mark>`);
    });
    return highlightedText;
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', async () => {
    await loadSearchData();
    const searchButton = document.getElementById('search-button');
    searchButton.addEventListener('click', performSearch);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});
