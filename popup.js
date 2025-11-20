// popup.js - TrustMe Extension (data extraction mode)

const checkBtn = document.getElementById("checkBtn");
const statusEl = document.getElementById("status");
const jsonOutput = document.getElementById("jsonOutput");

checkBtn.addEventListener("click", () => {
  resetUI();
  checkBtn.disabled = true;
  statusEl.textContent = "Đang thu thập dữ liệu...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    if (!currentTab || !currentTab.id) {
      renderError("Không xác định được tab hiện tại.");
      return;
    }

    chrome.runtime.sendMessage(
      { action: "extractPageData", tabId: currentTab.id },
      (response) => {
        checkBtn.disabled = false;

        if (chrome.runtime.lastError) {
          renderError(chrome.runtime.lastError.message);
          return;
        }

        if (!response || !response.success) {
          const message =
            response && response.error
              ? response.error
              : "Content script không phản hồi.";
          renderError(message);
          return;
        }

        renderData(response.data);
      }
    );
  });
});

function resetUI() {
  statusEl.style.color = "#555";
  statusEl.textContent = "";
  jsonOutput.textContent = "";
}

function renderError(message) {
  statusEl.style.color = "#dc3545";
  statusEl.textContent = `❌ ${message}`;
  jsonOutput.textContent = "";
  checkBtn.disabled = false;
}

function renderData(data) {
  if (!data) {
    renderError("Không có dữ liệu trả về.");
    return;
  }
  statusEl.style.color = "#1f1f1f";
  statusEl.innerHTML = `✅ Đã thu thập dữ liệu<br><small>URL: ${escapeHtml(
    data.url || ""
  )}</small>`;
  jsonOutput.textContent = JSON.stringify(data, null, 2);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
