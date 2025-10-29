// content.js - lấy nội dung chính của trang web hoặc bài post
function extractContent() {
  // Facebook: lấy nội dung các post
  if (window.location.hostname.includes('facebook.com')) {
    const posts = document.querySelectorAll('[role="article"]');
    let text = '';
    posts.forEach(post => {
      text += post.innerText + '\n---\n';
    });
    if (text.trim().length > 0) return text;
  }
  // Báo điện tử: lấy nội dung chính
  const main = document.querySelector('article, main, [id*="content"], [class*="content"]');
  if (main && main.innerText.trim().length > 100) {
    return main.innerText;
  }
  // Mặc định: lấy toàn bộ body
  return document.body.innerText;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContent") {
    sendResponse({ text: extractContent() });
  }
});
