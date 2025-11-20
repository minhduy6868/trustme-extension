// background.js - TrustMe Extension
// Phối hợp thu thập dữ liệu bài viết thay vì đánh giá độ tin cậy

/**
 * Lắng nghe yêu cầu trích xuất dữ liệu có cấu trúc từ popup hoặc content script.
 * Backgound script forward yêu cầu xuống content script vì service worker không truy cập DOM trực tiếp.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractPageData") {
    const tabId = request.tabId || (sender?.tab && sender.tab.id);

    if (!tabId) {
      sendResponse({
        success: false,
        error: "Không xác định được tab hiện tại.",
      });
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      { action: "getStructuredData" },
      (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }

        sendResponse(
          response || {
            success: false,
            error: "Không nhận được phản hồi từ content script.",
          }
        );
      }
    );

    // Giữ kênh message mở cho đến khi nhận được phản hồi async từ content script
    return true;
  }
});
