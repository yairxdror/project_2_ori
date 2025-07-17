const indicator = document.querySelector('.nav-indicator');
const items = document.querySelectorAll('.nav-item');

function handleIndicator(el) {
    items.forEach(item => {
        item.classList.remove('is-active');
        item.removeAttribute('style');
    });

    indicator.style.width = `${el.offsetWidth}px`;
    indicator.style.left = `${el.offsetLeft}px`;
    indicator.style.backgroundColor = el.getAttribute('active-color');

    el.classList.add('is-active');
    el.style.color = el.getAttribute('active-color');
}

items.forEach(item => {
    item.addEventListener('click', () => handleIndicator(item));
    if (item.classList.contains('is-active')) handleIndicator(item);
});

function onHome() {
    document.querySelector('#pageReports').style.display = 'none';
    document.querySelector('#pageAbout').style.display = 'none';
    document.querySelector('#pageHome').style.display = 'block';
}
function onAbout() {
    document.querySelector('#pageHome').style.display = 'none';
    document.querySelector('#pageReports').style.display = 'none';
    document.querySelector('#pageAbout').style.display = 'block';
}

async function onReports() {
    document.querySelector('#pageHome').style.display = 'none';
    document.querySelector('#pageAbout').style.display = 'none';
    document.querySelector('#pageReports').style.display = 'block';

    const selectedIds = [...document.querySelectorAll('#Coins .toggle-input[name="toggle-main"]:checked')].map(cb => cb.id);


    if (selectedIds.length === 0) {
        document.querySelector("#reportsNone").style.display = 'block';
        document.querySelector("#chart").innerHTML = '';
        return;
    }

    document.querySelector("#reportsNone").style.display = 'none';

    try {
        const promises = selectedIds.map(id =>
            fetch(`https://api.coingecko.com/api/v3/coins/${id}`).then(res => res.json())
        );

        const coinsData = await Promise.all(promises);
        const selectedCoins = [];

        coinsData.forEach(coinData => {
            const coinPrice = coinData.market_data.current_price.usd;
            selectedCoins.push({
                type: "line",
                showInLegend: true,
                name: coinData.name,
                markerType: "square",
                xValueFormatString: "DD MMM, YYYY",
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                yValueFormatString: "$#,##0.00",
                dataPoints: [
                    { x: new Date(2024, 11, 1), y: coinPrice },
                    { x: new Date(2024, 11, 2), y: coinPrice * 1.05 },
                    { x: new Date(2024, 11, 3), y: coinPrice * 0.95 },
                    { x: new Date(2024, 11, 4), y: coinPrice * 1.1 },
                    { x: new Date(2024, 11, 5), y: coinPrice }
                ]
            });
        });

        const options = {
            animationEnabled: true,
            theme: "light2",
            title: {
                text: "Live Coin Prices"
            },
            axisX: {
                valueFormatString: "DD MMM"
            },
            axisY: {
                title: "Price in USD",
                prefix: "$"
            },
            toolTip: {
                shared: true
            },
            legend: {
                cursor: "pointer",
                verticalAlign: "bottom",
                horizontalAlign: "left",
                dockInsidePlotArea: true,
                itemclick: function (e) {
                    e.dataSeries.visible = !(e.dataSeries.visible === false);
                    e.chart.render();
                }
            },
            data: selectedCoins
        };

        const chart = new CanvasJS.Chart("chart", options);
        chart.render();

    } catch (error) {
        console.error("Error fetching coin data:", error);
        document.querySelector("#chart").innerHTML = '<p style="color:white;text-align:center;">Error loading chart</p>';
    }
}

async function apiCountries() {
    const url = 'https://api.coingecko.com/api/v3/coins/markets';
    const params = new URLSearchParams({
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '100',
        page: '1'
    });
    try {
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching coins:', error);
        return null;
    }
}

let allCoinsData = [];

async function renderCoins() {
    const coinsContainer = document.querySelector('#Coins');
    const loading = document.querySelector('#loading');
    const reportEl = document.querySelector("#currencyReport");

    loading.style.display = 'block';

    let hiddenCoins = JSON.parse(localStorage.getItem('hiddenCoins') || '[]');

    let coins = await apiCountries();

    if (!coins) {
        loading.innerText = 'Failed to load coins.';
        return;
    }

    allCoinsData = coins;

    localStorage.setItem('savingCoins', JSON.stringify({ coins }));

    loading.style.display = 'none';
    coinsContainer.innerHTML = '';
    reportEl.innerHTML = '';

    coins.forEach(coin => {
        const coinEl = document.createElement('div');
        coinEl.classList.add('coin');

        coinEl.setAttribute('data-name', coin.name.toLowerCase());
        coinEl.setAttribute('data-id', coin.id.toLowerCase());

        coinEl.innerHTML = `
            <input class="toggle-input" id="${coin.id}" name="toggle-main" type="checkbox" />
            <label class="toggle-label" for="${coin.id}"></label>
            <h2>${coin.name}</h2>
            <h4>${coin.id}</h4>
            <button class="buttonIsMore">More Info</button>
            <div class="more-info" style="display:none;"></div>
        `;

        const btn = coinEl.querySelector('.buttonIsMore');
        const infoBox = coinEl.querySelector('.more-info');
        let infoLoaded = false;
        const titleEl = coinEl.querySelector('h2');
        const idEl = coinEl.querySelector('h4');

        btn.addEventListener('click', () => {
            const isOpen = window.getComputedStyle(infoBox).display === 'block';
            if (isOpen) {
                infoBox.style.display = 'none';
                titleEl.style.display = '';
                idEl.style.display = '';
                btn.textContent = 'More Info';
                return;
            }

            const cacheKey = `moreInfo-${coin.id}`;
            const cached = localStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const cachedData = JSON.parse(cached);
                if (now - cachedData.timestamp < 2 * 60 * 1000) {
                    infoBox.innerHTML = cachedData.html;
                    console.log(`✅ מטבע נטען מהמטמון: ${coin.id}`);
                    infoLoaded = true;
                } else {
                    localStorage.removeItem(cacheKey);
                }
            }

            if (!infoLoaded) {
                const thisCoin = allCoinsData.find(c => c.id === coin.id);
                if (thisCoin) {
                    const html = `
                        <img src="${thisCoin.image}" alt="${thisCoin.name}">
                        <h2>${coin.name}</h2>
                        <h4>${coin.id}</h4>
                        <div class="price">
                        <p>₪ ${(thisCoin.current_price / 3.6).toLocaleString()}</p>
                        <p>$ ${thisCoin.current_price.toLocaleString()}</p>
                        <p>€ ${(thisCoin.current_price * 0.9).toLocaleString()}</p>
                        </div>
                    `;
                    infoBox.innerHTML = html;
                    localStorage.setItem(cacheKey, JSON.stringify({ html, timestamp: now }));
                    console.log(`💾 מידע נשמר במטמון עבור: ${coin.id}`);
                } else {
                    infoBox.textContent = 'פרטים לא נמצאו.';
                }
                infoLoaded = true;
            }

            titleEl.style.display = 'none';
            idEl.style.display = 'none';
            infoBox.style.display = 'block';
            btn.textContent = 'Close';
        });

        coinsContainer.appendChild(coinEl);
    });

    coinsContainer.addEventListener("change", (event) => {
        if (!event.target.classList.contains("toggle-input")) return;

        const checkbox = event.target;
        const coinId = checkbox.id.replace("report-toggle-", "");
        const allMainCheckboxes = document.querySelectorAll('#Coins .toggle-input');
        const checkedMain = [...allMainCheckboxes].filter(cb => cb.checked).map(cb => cb.id);

        if (!checkbox.id.startsWith("report-toggle-")) {
            if (checkbox.checked && checkedMain.length > 5) {
                alert("You can only select up to 5 currencies.");
                checkbox.checked = false;
                return;
            }

            hiddenCoins = hiddenCoins.filter(id => id !== checkbox.id);

              const existingReport = document.querySelector(`#report-${checkbox.id}`);
           if (checkbox.checked) {
            if (!existingReport) {
                const div = document.createElement("div");
                div.classList.add("report");
                div.id = `report-${checkbox.id}`;
                div.innerHTML = `
                    <div class="report-row">
                        <span class="report-name">${checkbox.id}</span>
                        <div class="toggle-container">
                            <input class="toggle-input" id="report-toggle-${checkbox.id}" name="toggle-report" type="checkbox" checked />
                            <label class="toggle-label" for="report-toggle-${checkbox.id}"></label>
                        </div>
                    </div>
                `;
                document.querySelector("#currencyReport").appendChild(div);
            }
        } else {
            const reportEl = document.getElementById(`report-${checkbox.id}`);
            if (reportEl) reportEl.remove();
        }
            if (checkedMain.length === 5) {
                document.querySelector('#listOfReports').style.display = 'block';
            }

        } else {
            const originalCheckbox = document.getElementById(coinId);
            if (originalCheckbox) originalCheckbox.checked = checkbox.checked;

            if (!checkbox.checked) {
                if (!hiddenCoins.includes(coinId)) hiddenCoins.push(coinId);
                const reportEl = document.getElementById(`report-${coinId}`);
                if (reportEl) reportEl.remove();
            } else {
                hiddenCoins = hiddenCoins.filter(id => id !== coinId);
                if (!document.querySelector(`#report-${coinId}`)) {
                    const div = document.createElement("div");
                    div.classList.add("report");
                    div.id = `report-${coinId}`;
                    div.innerHTML = `
                        <div class="report-row">
                            <span class="report-name">${coinId}</span>
                            <div class="toggle-container">
                                <input class="toggle-input" id="report-toggle-${coinId}" name="toggle-report" type="checkbox" checked />
                                <label class="toggle-label" for="report-toggle-${coinId}"></label>
                            </div>
                        </div>
                    `;
                    document.querySelector("#currencyReport").appendChild(div);
                }
            }
        }

        localStorage.setItem('hiddenCoins', JSON.stringify(hiddenCoins));
    });

    const btReports = document.querySelector('#btListOfReports');
    btReports.addEventListener('click', () => {
        document.querySelector('#listOfReports').style.display = 'block';
    });

    const btClose = document.querySelector('#btClose');
    btClose.addEventListener('click', () => {
        document.querySelector('#listOfReports').style.display = 'none';

        const reportCheckboxes = document.querySelectorAll('#currencyReport .toggle-input');
        hiddenCoins = [];

        reportCheckboxes.forEach(checkbox => {
            const coinId = checkbox.id.replace("report-toggle-", "");
            if (!checkbox.checked) {
                hiddenCoins.push(coinId);
                const reportEl = document.getElementById(`report-${coinId}`);
                if (reportEl) reportEl.remove();
                const mainCheckbox = document.getElementById(coinId);
                if (mainCheckbox) mainCheckbox.checked = false;
            }
        });

        localStorage.setItem('hiddenCoins', JSON.stringify(hiddenCoins));
    });
}
function setupSearchFeature() {
    const coinsContainer = document.querySelector('#Coins');
    const searchButton = document.getElementById('butSearch');
    const searchInput = document.getElementById('searchInput');

    if (!coinsContainer || !searchButton || !searchInput) return;

    const returnButton = document.createElement('button');
    returnButton.textContent = 'Back';
    returnButton.id = 'returnButton';
    // returnButton.style.marginLeft = '3px';
    // returnButton.style.display = 'none';
    searchInput.parentNode.appendChild(returnButton);

    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) return;

        const coins = coinsContainer.querySelectorAll('.coin');
        let found = false;

        coins.forEach(coin => {
            const name = coin.getAttribute('data-name');
            const id = coin.getAttribute('data-id');
            const match = name.includes(query) || id.includes(query);
            coin.style.display = match ? '' : 'none';
            if (match) found = true;
        });

        if (found) {
            returnButton.style.display = 'inline-block';
        } else {
            alert('No coin found matching your search.');
        }
    });

    returnButton.addEventListener('click', () => {
        const coins = coinsContainer.querySelectorAll('.coin');
        coins.forEach(el => el.style.display = '');
        returnButton.style.display = 'none';
        searchInput.value = '';
    });
}

renderCoins();
setupSearchFeature();