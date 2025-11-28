// floating_widget.js - Enhanced with AI analysis display
(function () {
  if (window.__trustme_widget) return;
  window.__trustme_widget = true;

  const widget = document.createElement("div");
  widget.id = "trustme-floating-widget";
  widget.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%);
    border: 1px solid rgba(14, 165, 233, 0.2);
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15), 0 8px 32px rgba(14, 165, 233, 0.1);
    padding: 20px 24px;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #0f172a;
    max-width: 420px;
    min-width: 320px;
    backdrop-filter: blur(16px);
    transition: all 0.4s ease;
    transform: translateY(0);
  `;
  
  // Add hover effect
  widget.addEventListener('mouseenter', () => {
    widget.style.transform = 'translateY(-2px)';
    widget.style.boxShadow = '0 25px 60px rgba(15, 23, 42, 0.2), 0 12px 40px rgba(14, 165, 233, 0.15)';
  });
  
  widget.addEventListener('mouseleave', () => {
    widget.style.transform = 'translateY(0)';
    widget.style.boxShadow = '0 20px 50px rgba(15, 23, 42, 0.15), 0 8px 32px rgba(14, 165, 233, 0.1)';
  });
  
  widget.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 4px;">
        <img src="chrome-extension://${chrome.runtime.id}/icons/trust_check_logo-removebg-preview.png" alt="TrustCheck" style="width: 16px; height: 16px; object-fit: contain; filter: brightness(0) invert(1);">
      </div>
      <span style="font-weight: 600; color: #0ea5e9;">TrustCheck AI</span>
    </div>
    <div id="widget-content">Đang phân tích nội dung...</div>
  `;
  
  document.body.appendChild(widget);

  function renderError(message) {
    const content = document.getElementById('widget-content');
    content.innerHTML = `
      <div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">Không thể phân tích</div>
      <div style="font-size: 12px; color: #64748b;">${escapeHtml(message)}</div>
    `;
  }

  function renderData(data) {
    const content = document.getElementById('widget-content');
    content.innerHTML = `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${escapeHtml(data.title || 'Nội dung đã được phân tích')}</div>
        <div style="font-size: 12px; color: #64748b;">Tác giả: ${escapeHtml(data.author || 'Không rõ')}</div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <button id="trustme-analyze-ai" style="
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          width: 100%;
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          <img src="chrome-extension://${chrome.runtime.id}/icons/trust_check_logo.png" style="width: 14px; height: 14px; filter: brightness(0) invert(1); object-fit: contain;">
          Phân tích bằng AI
        </button>
      </div>
      
      <details style="margin-top: 8px;">
        <summary style="cursor: pointer; font-size: 12px; color: #64748b; list-style: none;">Xem dữ liệu gốc</summary>
        <pre style="
          max-height: 120px;
          overflow: auto;
          background: #f8fafc;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 11px;
          white-space: pre-wrap;
          margin: 8px 0 0 0;
          color: #475569;
        ">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      </details>
    `;

    const analyzeBtn = document.getElementById("trustme-analyze-ai");
    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", () => analyzeWithWidget(data, analyzeBtn));
    }
  }

  async function analyzeWithWidget(data, button) {
    const originalText = button.textContent;
    button.textContent = '🔄 Đang phân tích...';
    button.disabled = true;

    try {
      const result = await analyzeContentWithGemini(data);
      if (result) {
        renderAnalysisResult(result);
      } else {
        renderError('Không thể kết nối với AI để phân tích');
      }
    } catch (error) {
      renderError('Lỗi phân tích: ' + error.message);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  function renderAnalysisResult(result) {
    const content = document.getElementById('widget-content');
    
    const verdictColor = result.verdict === 'verified' ? '#10b981' : 
                        result.verdict === 'likely-false' ? '#ef4444' : '#f59e0b';
    const verdictText = result.verdict === 'verified' ? 'Đáng tin cậy' : 
                       result.verdict === 'likely-false' ? 'Nghi ngờ' : 'Cần thận trọng';
    
    content.innerHTML = `
      <div style="margin-bottom: 12px; padding: 12px; background: rgba(14, 165, 233, 0.05); border-radius: 8px; border: 1px solid rgba(14, 165, 233, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; color: ${verdictColor}; font-size: 13px;">${verdictText}</span>
          <span style="font-weight: 700; color: #0ea5e9; font-size: 13px;">${result.trust_score || '--'}/100</span>
        </div>
        <div style="font-size: 12px; line-height: 1.4; color: #0f172a;">${escapeHtml(result.summary || 'Đã hoàn thành phân tích')}</div>
        ${result.flags && result.flags.length > 0 ? 
          `<div style="margin-top: 8px;">
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Cảnh báo:</div>
            <div style="font-size: 11px; color: #ef4444;">${result.flags.join(', ')}</div>
          </div>` : ''
        }
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button onclick="this.parentElement.parentElement.style.display='none'" style="
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        ">Đóng</button>
        <button onclick="location.reload()" style="
          background: #0ea5e9;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        ">Phân tích lại</button>
      </div>
      
      <div style="text-align: center; margin-top: 8px;">
        <span style="font-size: 10px; color: #94a3b8;">Powered by TrustCheck AI</span>
      </div>
    `;
  }

  async function analyzeContentWithGemini(data) {
    const GEMINI_API_KEY = 'AIzaSyAflaTpn2I9zfgspyWF_aNGBZwM8Oin5Pc';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    const prompt = `Phân tích độ tin cậy của nội dung này và trả về JSON:

Tiêu đề: ${data.title || 'Không có'}
Tác giả: ${data.author || 'Không rõ'}
Nội dung: ${data.article}

Trả về JSON format:
{
  "trust_score": (0-100),
  "verdict": "verified"|"needs-review"|"likely-false", 
  "summary": "Tóm tắt ngắn gọn bằng tiếng Việt",
  "flags": ["cảnh báo nếu có"]
}`;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) return null;

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) return null;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        trust_score: 50,
        verdict: 'needs-review',
        summary: text.slice(0, 150) + '...',
        flags: []
      };
      
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  }

  function copyToClipboard(text, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          button.textContent = "Đã sao chép!";
          setTimeout(() => {
            button.textContent = "Sao chép JSON";
          }, 2000);
        })
        .catch(() => fallbackCopy(text, button));
    } else {
      fallbackCopy(text, button);
    }
  }

  function fallbackCopy(text, button) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      button.textContent = "Đã sao chép!";
      setTimeout(() => {
        button.textContent = "Sao chép JSON";
      }, 2000);
    } catch (_) {
      button.textContent = "Sao chép thủ công";
    }
    document.body.removeChild(textarea);
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

  chrome.runtime.sendMessage({ action: "extractPageData" }, (response) => {
    if (!response || !response.success) {
      const message =
        response && response.error
          ? response.error
          : "Content script không phản hồi.";
      renderError(message);
      return;
    }

    renderData(response.data);
  });
})();
