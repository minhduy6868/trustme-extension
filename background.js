// background.js
// background.js
// Đọc biến môi trường từ file .env
let GEMINI_API_KEY = '';
let GEMINI_API_URL = '';

fetch(chrome.runtime.getURL('.env'))
  .then(response => response.text())
  .then(text => {
    text.split('\n').forEach(line => {
      if (line.startsWith('GEMINI_API_KEY=')) {
        GEMINI_API_KEY = line.replace('GEMINI_API_KEY=', '').trim();
      }
      if (line.startsWith('GEMINI_API_URL=')) {
        GEMINI_API_URL = line.replace('GEMINI_API_URL=', '').trim();
      }
    });
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkNews") {
    fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: request.text }
            ]
          }
        ]
      })
    })
      .then(res => res.json())
      .then(data => {
        let score = 0;
        try {
          const resultText = data.candidates[0].content.parts[0].text;
          const match = resultText.match(/(\d{1,3})\s*\/\s*100/);
          if (match) score = parseInt(match[1]);
        } catch (e) {}
        sendResponse({ score, raw: data });
      })
      .catch(err => {
        sendResponse({ score: 0, error: err });
      });
    return true;
  }
});
