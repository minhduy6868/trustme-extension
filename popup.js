// popup.js
document.getElementById('checkBtn').onclick = function() {
  document.getElementById('score').textContent = 'Đang phân tích...';
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getContent"}, function(response) {
      if (!response || !response.text) {
        document.getElementById('score').textContent = 'Không lấy được nội dung bài viết.';
        return;
      }
      chrome.runtime.sendMessage({action: "checkNews", text: response.text}, function(result) {
        if (result && result.raw && result.raw.candidates) {
          // Lấy điểm số từ text trả về
          let score = result.score || 0;
          let detail = '';
          try {
            const text = result.raw.candidates[0].content.parts[0].text;
            // Hiển thị chi tiết phân tích nếu có
            detail = text.replace(/\n/g, '<br>');
          } catch(e) {}
          document.getElementById('score').innerHTML = `<b>Điểm tin cậy: ${score}/100</b> <span style='font-size:0.8em'>(cao là đáng tin)</span>`;
          document.getElementById('raw').innerHTML = detail;
        } else {
          document.getElementById('score').textContent = 'Lỗi khi đánh giá bài viết.';
        }
      });
    });
  });
};
