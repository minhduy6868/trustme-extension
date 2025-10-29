// floating_widget.js
(function() {
  if (window.__trustme_widget) return;
  window.__trustme_widget = true;
  const widget = document.createElement('div');
  widget.id = 'trustme-floating-widget';
  widget.style.position = 'fixed';
  widget.style.bottom = '24px';
  widget.style.right = '24px';
  widget.style.zIndex = '99999';
  widget.style.background = 'rgba(255,255,255,0.95)';
  widget.style.border = '2px solid #007bff';
  widget.style.borderRadius = '12px';
  widget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  widget.style.padding = '16px 24px';
  widget.style.fontFamily = 'Arial';
  widget.style.fontSize = '1.2em';
  widget.style.color = '#222';
  widget.innerHTML = '<b>Đang kiểm tra độ tin cậy...</b>';
  document.body.appendChild(widget);

  function updateWidget(score, detail) {
    widget.innerHTML = `<b>Điểm tin cậy: ${score}/100</b> <span style='font-size:0.8em'>(cao là đáng tin)</span><br><div style='font-size:0.95em;margin-top:8px;'>${detail}</div>`;
  }

  function showError() {
    widget.innerHTML = '<b>Lỗi khi đánh giá bài viết!</b>';
  }

  // Lấy nội dung như content.js
  function getMainContent() {
    if (window.location.hostname.includes('facebook.com')) {
      let posts = document.querySelectorAll('[role="article"]');
      let text = '';
      posts.forEach(post => {
        text += post.innerText + '\n---\n';
      });
      if (text.trim().length > 0) return text;
    }
    let main = document.querySelector('article, main, [id*="content"], [class*="content"]');
    if (main && main.innerText.trim().length > 100) {
      return main.innerText;
    }
    return document.body.innerText;
  }

  // Gọi background để đánh giá
  chrome.runtime.sendMessage({action: "checkNews", text: getMainContent()}, function(result) {
    if (result && result.raw && result.raw.candidates) {
      let score = result.score || 0;
      let detail = '';
      try {
        const text = result.raw.candidates[0].content.parts[0].text;
        detail = text.replace(/\n/g, '<br>');
      } catch(e) {}
      updateWidget(score, detail);
    } else {
      showError();
    }
  });
})();
