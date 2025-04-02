//右クリックメニューファンクション
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "rakuten_data_downloader",
            title: "Rakuten Data Downloader",
            contexts: ["all"]
        });
        chrome.contextMenus.create({
            id: "download_yesterday_data",
            title: "昨日のデータをダウンロード",
            parentId: "rakuten_data_downloader",
            contexts: ["all"]
        });
        chrome.contextMenus.create({
            id: "download_day_before_yesterday_data",
            title: "一昨日のデータをダウンロード",
            parentId: "rakuten_data_downloader",
            contexts: ["all"]
        });
        chrome.contextMenus.create({
            id: "download_3days_data",
            title: "3日分のデータをダウンロード",
            parentId: "rakuten_data_downloader",
            contexts: ["all"]
        });
        chrome.contextMenus.create({
            id: "download_4days_data",
            title: "4日分のデータをダウンロード",
            parentId: "rakuten_data_downloader",
            contexts: ["all"]
        });
        chrome.contextMenus.create({
            id: "download_week_data",
            title: "一週間分のデータをダウンロード",
            parentId: "rakuten_data_downloader",
            contexts: ["all"]
        });
    });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const calculateDateRange = (days) => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // 昨日を終了日とする
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days); // 指定日数分前を開始日とする
        const formatDate = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };
        return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
    };

    if (info.menuItemId === "download_yesterday_data") {

        const { startDate, endDate } = calculateDateRange(1);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: downloadJSON,
            args: [startDate, endDate]
        });
    } else if (info.menuItemId === "download_day_before_yesterday_data") {

        const { startDate, endDate } = calculateDateRange(2);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: downloadJSON,
            args: [startDate, endDate]
        });
    } else if (info.menuItemId === "download_3days_data") {

        const { startDate, endDate } = calculateDateRange(3);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: downloadJSON,
            args: [startDate, endDate]
        });

    } else if (info.menuItemId === "download_4days_data") {

        const { startDate, endDate } = calculateDateRange(4);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: downloadJSON,
            args: [startDate, endDate]
        });

    } else if (info.menuItemId === "download_week_data") {

        const { startDate, endDate } = calculateDateRange(7);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: downloadJSON,
            args: [startDate, endDate]
        });
    }
});

//popupファンクション
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "download_csv") {
        const { startDate, endDate } = request;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: downloadJSON,
                args: [startDate, endDate]
            });
        });
    }
});

// 日付範囲のデータを個別に取得しダウンロードする関数
function downloadJSON(startDate, endDate) {
    // 開始日から終了日までの日付リストを生成
    function generateDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];

        while (start <= end) {
            const yyyy = start.getFullYear();
            const mm = String(start.getMonth() + 1).padStart(2, "0");
            const dd = String(start.getDate()).padStart(2, "0");
            dates.push(`${yyyy}-${mm}-${dd}`);
            start.setDate(start.getDate() + 1);
        }

        return dates;
    }

    const dates = generateDates(startDate, endDate);
    // 自治体名を取得する関数
    function getMunicipalityName() {
        const element = document.querySelector(".rms-header-group-shop-name");
        return element ? element.textContent.trim() : "不明な自治体";
    }
    const municipalityName = getMunicipalityName();

    // バッチ処理で一度に5件ずつリクエストを送信
    function processBatch(batchDates) {
        const requests = batchDates.map((date) => {
            const baseUrl = "https://datatool.rms.rakuten.co.jp/access/item/get-item-list/";
            const url = `${baseUrl}?period=daily&device=deviceAll&startDate=${date.replace(
                /-/g,
                ""
            )}&endDate=${date.replace(/-/g, "")}&recordsNumber=40000&startDateDaily=${encodeURIComponent(
                date
            )}&endDateDaily=${encodeURIComponent(date)}&itemId=null&cycleNumber=0`;

            return fetch(url, {
                method: "GET",
                credentials: "include", // セッションを維持
                headers: {
                    Accept: "application/json",
                    Referer: "https://datatool.rms.rakuten.co.jp/access/item",
                    Origin: "https://datatool.rms.rakuten.co.jp",
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTPエラー: ${response.status}`);
                    }
                    return response.json(); // JSONレスポンスを取得
                })
                .then((data) => {
                    console.log(`サーバーからのレスポンス (${date}):`, data);

                    // JSONデータをCSV形式に変換してダウンロード
                    const csvHeaders = [
                        "自治体", "日付", "ジャンル", "カタログID", "商品ID", "商品名", "商品管理番号", "商品番号", "売上", "売上件数", "売上個数", "アクセス人数", "ユニークユーザー数", "転換率", "客単価", "総購入件数", "新規購入件数", "リピート購入件数", "未購入アクセス人数", "レビュー投稿数", "レビュー総合評価（点）", "総レビュー数", "滞在時間（秒）", "直帰数", "離脱数", "離脱率", "お気に入り登録ユーザ数", "お気に入り総ユーザ数", "在庫数", "在庫0日日数"
                    ];

                    const csvRows = data.data.map(item => {
                        const itemData = item.item;
                        const salesData = item.salesFormula;
                        const attractionData = item.attraction;
                        const excursionData = item.excursion;
                        const inventoryData = item.inventory;
                        const bookmarkData = item.bookmark;

                        function escapeCsv(value) {
                            if (typeof value === 'string') {
                                // すべての文字列フィールドをダブルクオートで囲む
                                return `"${value.replace(/"/g, '""')}"`;
                            }
                            return `"${value}"`; // すべてのフィールドをダブルクオートで囲む
                        }

                        return [
                            municipalityName, // 自治体（空欄）
                            date, // #（日付）
                            escapeCsv(itemData.genre || ""), // ジャンル
                            escapeCsv(itemData.catalogId || ""), // カタログID
                            escapeCsv(itemData.itemId || "0"), // 商品ID
                            escapeCsv(itemData.itemName || ""), // 商品名
                            escapeCsv(itemData.mngNumber || ""), // 商品管理番号
                            escapeCsv(itemData.itemNumber || ""), // 商品番号
                            escapeCsv(salesData.salesAll != null ? parseInt(salesData.salesAll) : 0), // 売上
                            escapeCsv(salesData.orderCountAll != null ? parseInt(salesData.orderCountAll) : 0), // 売上件数
                            escapeCsv(salesData.unitsAll != null ? parseInt(salesData.unitsAll) : 0), // 売上個数
                            escapeCsv(salesData.visitAll != null ? parseInt(salesData.visitAll) : 0), // アクセス人数
                            escapeCsv(salesData.uuAll != null ? parseInt(salesData.uuAll) : 0), // ユニークユーザー数
                            escapeCsv(salesData.cvrAll != null ? parseFloat(salesData.cvrAll) : 0.0), // 転換率
                            escapeCsv(salesData.aovAll != null ? parseFloat(salesData.aovAll) : 0.0), // 客単価
                            escapeCsv(attractionData.allPurchaserAll != null ? parseInt(attractionData.allPurchaserAll) : 0), // 総購入件数
                            escapeCsv(attractionData.newPurchaserAll != null ? parseInt(attractionData.newPurchaserAll) : 0), // 新規購入件数
                            escapeCsv(attractionData.repeaterPurchaserAll != null ? parseInt(attractionData.repeaterPurchaserAll) : 0), // リピート購入件数
                            escapeCsv(attractionData.visitUnpurchaserAll != null ? parseInt(attractionData.visitUnpurchaserAll) : 0), // 未購入アクセス人数
                            escapeCsv(attractionData.reviewCount != null ? parseInt(attractionData.reviewCount) : 0), // レビュー投稿数
                            escapeCsv(attractionData.reviewPoint != null ? parseFloat(attractionData.reviewPoint) : 0.0), // レビュー総合評価（点）
                            escapeCsv(attractionData.reviewAll != null ? parseInt(attractionData.reviewAll) : 0), // 総レビュー数
                            escapeCsv(excursionData.durationAll != null ? parseInt(excursionData.durationAll) : 0), // 滞在時間（秒）
                            escapeCsv(excursionData.bounceCountAll != null ? parseInt(excursionData.bounceCountAll) : 0), // 直帰数
                            escapeCsv(excursionData.exitCountAll != null ? parseInt(excursionData.exitCountAll) : 0), // 離脱数
                            escapeCsv(excursionData.exitRateAll != null ? parseFloat(excursionData.exitRateAll) : 0.0), // 離脱率
                            escapeCsv(bookmarkData.bookmarkAdd != null ? parseInt(bookmarkData.bookmarkAdd) : 0), // お気に入り登録ユーザ数
                            escapeCsv(bookmarkData.bookmarkTotal != null ? parseInt(bookmarkData.bookmarkTotal) : 0), // お気に入り総ユーザ数
                            escapeCsv(inventoryData.inventory != null ? parseInt(inventoryData.inventory) : 0), // 在庫数
                            escapeCsv(inventoryData.zeroInventoryDays != null ? parseInt(inventoryData.zeroInventoryDays) : 0)  // 在庫0日日数
                        ].join(",");
                    });

                    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
                    const csvBlob = new Blob([`﻿${csvContent}`], { type: "text/csv;charset=utf-8;" }); // UTF-8 with BOM to avoid文字化け
                    const downloadUrl = URL.createObjectURL(csvBlob);
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = `rakuten_data_${date}.csv`; // 日付ごとに異なるファイル名
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                })
                .catch((error) => {
                    console.error(`CSVダウンロードに失敗 (${date}):`, error);
                });
        });

        return Promise.all(requests);
    }

    // 5件ずつ処理する関数
    async function processAllDates() {
        for (let i = 0; i < dates.length; i += 5) {
            const batch = dates.slice(i, i + 5);
            await processBatch(batch); // バッチが完了するまで待機
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒待機
        }
    }

    processAllDates().then(() => {
        console.log("全てのリクエストが完了しました。");
    });
}
