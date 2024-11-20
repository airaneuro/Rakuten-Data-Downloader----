document.getElementById("download-btn").addEventListener("click", () => {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;

    if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
    }

    chrome.runtime.sendMessage({ action: "download_csv", startDate, endDate });
});
