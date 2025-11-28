// popup.js - Enhanced TrustCheck with Gemini AI integration

const runNowBtn = document.getElementById('runNowBtn');
const statusEl = document.getElementById('status');
const autoCheckToggle = document.getElementById('autoCheckToggle');
const trustSummary = document.getElementById('trustSummary');
const verdictBadge = document.getElementById('verdictBadge');
const scoreLine = document.getElementById('scoreLine');
const summaryLine = document.getElementById('summaryLine');
const flagsList = document.getElementById('flagsList');
const statusCard = document.getElementById('statusCard');
const infoTitle = document.getElementById('infoTitle');
const infoAuthor = document.getElementById('infoAuthor');
const infoDate = document.getElementById('infoDate');
const infoPlatform = document.getElementById('infoPlatform');
const infoUrl = document.getElementById('infoUrl');

let API_BASE = 'http://localhost:8001';
let GEMINI_API_KEY = 'AIzaSyDQpzhKGz1wBYS2T-jh5F4XG5xHl5MncpU';
let GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
let USE_GEMINI_PRIMARY = true;
let FALLBACK_TO_LOCAL = true;

init();

function init() {
  resetArticleInfo();
  loadConfig();
}

async function loadConfig() {
  try {
    const resp = await fetch(chrome.runtime.getURL('config.json'));
    if (resp.ok) {
      const cfg = await resp.json();
      if (cfg.ENDPOINT_MODEL) {
        API_BASE = cfg.ENDPOINT_MODEL.replace(/\/+$/, '');
        logDebug(`Loaded model endpoint from config: ${API_BASE}`);
      }
      if (cfg.GEMINI_API_KEY) {
        GEMINI_API_KEY = cfg.GEMINI_API_KEY;
      }
      if (cfg.GEMINI_API_URL) {
        GEMINI_API_URL = cfg.GEMINI_API_URL;
      }
      if (cfg.USE_GEMINI_PRIMARY !== undefined) {
        USE_GEMINI_PRIMARY = cfg.USE_GEMINI_PRIMARY;
      }
      if (cfg.FALLBACK_TO_LOCAL !== undefined) {
        FALLBACK_TO_LOCAL = cfg.FALLBACK_TO_LOCAL;
      }
      logDebug('Loaded full config:', cfg);
    } else {
      logDebug(`Config not found, using defaults`);
    }
  } catch (err) {
    logDebug(`Failed to read config.json, using defaults`, err);
  }
}

runNowBtn.addEventListener('click', () => handleExtraction(true));

async function handleExtraction(runTrustCheck) {
  resetUI();
  setButtonsDisabled(true);
  setStatus('progress', 'Đang thu thập dữ liệu...');

  try {
    const extraction = await extractFromActiveTab();
    renderData(extraction.data);

    if (runTrustCheck) {
      await submitToTrustCheck(extraction.data);
    }
  } catch (error) {
    renderError(error.message || String(error));
  } finally {
    setButtonsDisabled(false);
  }
}

function extractFromActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];

      if (!currentTab || !currentTab.id) {
        reject(new Error('Không xác định được tab hiện tại.'));
        return;
      }

      chrome.runtime.sendMessage(
        { action: 'extractPageData', tabId: currentTab.id },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.success) {
            const message =
              response && response.error ? response.error : 'Content script không phản hồi.';
            reject(new Error(message));
            return;
          }

          logDebug('Extracted payload', response.data);
          resolve(response);
        }
      );
    });
  });
}

function setButtonsDisabled(disabled) {
  runNowBtn.disabled = disabled;
}

function resetUI() {
  setStatus('neutral', '');
  resetArticleInfo();
  trustSummary.hidden = true;
  flagsList.innerHTML = '';
  verdictBadge.textContent = '';
  verdictBadge.className = 'pill processing';
  scoreLine.textContent = '';
  summaryLine.textContent = '';
}

function renderError(message) {
  setStatus('error', `⚠️ ${escapeHtml(message)}`);
  resetArticleInfo();
  trustSummary.hidden = true;
  setButtonsDisabled(false);
  logDebug('Error', message);
}

function renderData(data) {
  if (!data) {
    renderError('Không có dữ liệu trả về.');
    return;
  }
  setStatus(
    'success',
    `✅ Đã thu thập dữ liệu<br><small>URL: ${escapeHtml(data.url || '')}</small>`
  );
  fillArticleInfo(data);
}

async function submitToTrustCheck(data) {
  if (!data.article || data.article.length < 10) {
    renderError('Không có nội dung để phân tích.');
    return;
  }

  trustSummary.hidden = false;
  setVerdictBadge('processing');
  summaryLine.textContent = 'Đang phân tích với AI...';
  setStatus('progress', 'Đang phân tích nội dung bằng trí tuệ nhân tạo...');

  try {
    if (USE_GEMINI_PRIMARY) {
      // Try Gemini API first
      const geminiResult = await analyzeWithGemini(data);
      
      if (geminiResult) {
        renderGeminiResult(geminiResult);
        setStatus('success', 'Phân tích hoàn tất bằng AI');
        return;
      }
      
      if (FALLBACK_TO_LOCAL) {
        logDebug('Gemini failed, falling back to local model');
        await submitToLocalModel(data);
      } else {
        renderError('Không thể kết nối với Gemini AI');
      }
    } else {
      // Use local model directly
      await submitToLocalModel(data);
    }
    
  } catch (err) {
    logDebug('Analysis failed:', err);
    if (FALLBACK_TO_LOCAL && USE_GEMINI_PRIMARY) {
      await submitToLocalModel(data);
    } else {
      renderError('Không thể phân tích nội dung: ' + err.message);
    }
  }
}

async function analyzeWithGemini(data) {
  const prompt = `Bạn là một chuyên gia phân tích tin tức và thông tin. Hãy đánh giá độ tin cậy của nội dung sau bằng tiếng Việt:

📰 THÔNG TIN BÀI VIẾT:
- Tiêu đề: ${data.title || 'Không có tiêu đề'}
- Tác giả: ${data.author || 'Không rõ tác giả'}  
- Nguồn: ${data.url || 'Không có nguồn'}
- Nội dung: ${data.article}

🎯 YÊU CẦU PHÂN TÍCH:
Hãy đánh giá dựa trên các tiêu chí sau:
1. Tính chính xác của thông tin
2. Nguồn gốc và độ uy tín
3. Ngôn ngữ và cách trình bày
4. Tính khách quan
5. Bằng chứng hỗ trợ

Trả về kết quả bằng tiếng Việt dưới dạng JSON, KHÔNG dùng emoji, với format chính xác này:
{
  "trust_score": (số từ 0-100),
  "verdict": "verified" hoặc "needs-review" hoặc "likely-false",
  "summary": "Tóm tắt 1-2 câu ngắn gọn bằng tiếng Việt",
  "detailed_analysis": "Phân tích chi tiết 3-4 đoạn, bao gồm điểm mạnh và điểm yếu",
  "flags": ["Danh sách cảnh báo bằng tiếng Việt nếu có"],
  "confidence": "high" hoặc "medium" hoặc "low"
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, create structured response
    return {
      trust_score: 50,
      verdict: 'needs-review',
      summary: text.slice(0, 200) + '...',
      detailed_analysis: text,
      flags: [],
      confidence: 'medium'
    };
    
  } catch (error) {
    logDebug('Gemini API failed:', error);
    return null;
  }
}

async function submitToLocalModel(data) {
  summaryLine.textContent = 'Đang gửi tới mô hình cục bộ...';
  
  const payload = {
    text: data.article,
    url: data.url,
    language: 'vi',
    deep_analysis: true,
  };

  try {
    logDebug('Sending to local model', { endpoint: `${API_BASE}/verify`, payload });
    const resp = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resp.status !== 202) {
      const txt = await resp.text();
      renderError(`Gửi TrustCheck thất bại (${resp.status}): ${txt}`);
      return;
    }

    const json = await resp.json();
    logDebug('Job created', json);
    pollResult(json.job_id, 0);
  } catch (err) {
    renderError(`Không thể kết nối TrustCheck: ${err}`);
  }
}

async function pollResult(jobId, attempt) {
  if (attempt > 300) {
    renderError(
      'Hết thời gian chờ kết quả (đã đợi ~600s). Thử lại hoặc kiểm tra log model/crawler.'
    );
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/result/${jobId}`);
    if (!resp.ok) {
      renderError(`Không lấy được kết quả (${resp.status})`);
      return;
    }
    const result = await resp.json();
    if (result.status === 'completed') {
      renderTrustResult(result);
      logDebug('Pipeline completed', result);
    } else if (result.status === 'failed') {
      renderError(result.error || 'Phân tích thất bại');
      logDebug('Pipeline failed', result);
    } else {
      summaryLine.textContent = '';
      setTimeout(() => pollResult(jobId, attempt + 1), 2000);
    }
  } catch (err) {
    renderError(`Lỗi khi poll kết quả: ${err}`);
  }
}

function renderTrustResult(result) {
  trustSummary.hidden = false;
  const verdict = result.verdict || 'needs-review';
  setVerdictBadge(verdict);
  scoreLine.textContent = `Điểm tin cậy: ${result.trust_score ?? '--'}/100`;
  summaryLine.innerHTML = formatSummaryText(result.summary || '');
  
  // Add warning effect for low trust scores
  const score = result.trust_score || 50;
  if (score < 40) {
    trustSummary.classList.add('warning');
  } else {
    trustSummary.classList.remove('warning');
  }
  
  // Handle detailed analysis
  const analysisContent = document.getElementById('analysisContent');
  const trustDetails = document.getElementById('trustDetails');
  
  if (result.detailed_analysis) {
    analysisContent.innerHTML = formatSummaryText(result.detailed_analysis);
    trustDetails.style.display = 'block';
  } else {
    trustDetails.style.display = 'none';
  }
  
  // Handle flags
  const flagsWrap = document.getElementById('flagsWrap');
  flagsList.innerHTML = '';
  
  if (result.flags && result.flags.length > 0) {
    flagsWrap.style.display = 'block';
    result.flags.forEach((flag) => {
      const li = document.createElement('li');
      li.textContent = flag;
      flagsList.appendChild(li);
    });
  } else {
    flagsWrap.style.display = 'none';
  }
  
  setStatus('success', 'Đã nhận kết quả từ TrustCheck.');
}

function renderGeminiResult(result) {
  trustSummary.hidden = false;
  const verdict = result.verdict || 'needs-review';
  setVerdictBadge(verdict);
  
  // Score display with confidence
  let scoreText = `Điểm tin cậy: ${result.trust_score ?? '--'}/100`;
  if (result.confidence) {
    const confidenceText = getConfidenceText(result.confidence);
    scoreText += ` • ${confidenceText}`;
  }
  scoreLine.textContent = scoreText;
  
  // Add warning effect for low trust scores
  const score = result.trust_score || 50;
  if (score < 40) {
    trustSummary.classList.add('warning');
  } else {
    trustSummary.classList.remove('warning');
  }
  
  // Summary display
  summaryLine.innerHTML = formatSummaryText(result.summary || 'Đã hoàn thành phân tích');
  
  // Detailed analysis in collapsible section
  const analysisContent = document.getElementById('analysisContent');
  const trustDetails = document.getElementById('trustDetails');
  
  if (result.detailed_analysis && result.detailed_analysis !== result.summary) {
    analysisContent.innerHTML = formatSummaryText(result.detailed_analysis);
    trustDetails.style.display = 'block';
  } else {
    trustDetails.style.display = 'none';
  }
  
  // Flags display
  const flagsWrap = document.getElementById('flagsWrap');
  flagsList.innerHTML = '';
  
  if (result.flags && result.flags.length > 0) {
    flagsWrap.style.display = 'block';
    result.flags.forEach((flag) => {
      const li = document.createElement('li');
      li.textContent = flag;
      flagsList.appendChild(li);
    });
  } else {
    flagsWrap.style.display = 'none';
  }
  
  // Add AI badge if not exists
  if (!document.querySelector('.ai-badge')) {
    const aiBadge = document.createElement('div');
    aiBadge.className = 'pill ai-badge';
    aiBadge.innerHTML = '<img src="icons/trust_check_logo-removebg-preview.png" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; filter: brightness(0) invert(1);" alt=""> Phân tích bởi AI';
    trustSummary.appendChild(aiBadge);
  }
}

function formatSummaryText(text) {
  if (!text) return '';
  
  // Convert newlines and format for better readability
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>')  // Wrap in paragraphs
    .replace(/<p><p>/g, '<p>')  // Clean up double paragraphs
    .replace(/Điểm mạnh:/g, '<strong style="color: #10b981;">Điểm mạnh:</strong>')
    .replace(/Điểm yếu:/g, '<strong style="color: #f59e0b;">Điểm yếu:</strong>')
    .replace(/Cảnh báo:/g, '<strong style="color: #ef4444;">Cảnh báo:</strong>');
}

function getConfidenceText(confidence) {
  switch (confidence) {
    case 'high': return 'Độ tin cậy cao';
    case 'medium': return 'Độ tin cậy trung bình'; 
    case 'low': return 'Độ tin cậy thấp';
    default: return '';
  }
}

function setVerdictBadge(verdict) {
  verdictBadge.className = 'pill processing';
  switch (verdict) {
    case 'verified':
      verdictBadge.classList.add('verified');
      verdictBadge.textContent = 'Đáng tin cậy';
      break;
    case 'likely-false':
      verdictBadge.classList.add('likely-false');
      verdictBadge.textContent = 'Nghi ngờ';
      break;
    case 'processing':
      verdictBadge.classList.add('processing');
      verdictBadge.textContent = 'Đang phân tích...';
      break;
    default:
      verdictBadge.classList.add('needs-review');
      verdictBadge.textContent = 'Cần thận trọng';
      break;
  }
}

function setStatus(state, message) {
  if (!statusEl || !statusCard) return;
  const nextState = state ? `status--${state}` : 'status--neutral';
  statusEl.className = `status ${nextState}`;
  statusEl.innerHTML = message || '';
  const shouldShow = Boolean(message);
  statusCard.style.display = shouldShow ? 'block' : 'none';
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logDebug(message, ...args) {
  console.log('[TrustCheck]', message, ...args);
}

function resetArticleInfo() {
  setInfoValue(infoTitle, 'Chưa có dữ liệu');
  setInfoValue(infoAuthor, '—');
  setInfoValue(infoDate, '—');
  setInfoValue(infoPlatform, '—');
  setInfoValue(infoUrl, '—');
  if (infoUrl instanceof HTMLAnchorElement) {
    infoUrl.removeAttribute('href');
  }
}

function fillArticleInfo(data) {
  setInfoValue(infoTitle, data.title || 'Không có tiêu đề');
  setInfoValue(infoAuthor, data.author || 'Không rõ');
  setInfoValue(infoDate, data.created_at || 'Không rõ');
  setInfoValue(infoPlatform, data.platform || 'web');
  const url = data.url || '';
  if (infoUrl) {
    if (infoUrl instanceof HTMLAnchorElement) {
      infoUrl.textContent = url || '—';
      if (url) {
        infoUrl.href = url;
        infoUrl.target = '_blank';
        infoUrl.rel = 'noopener noreferrer';
      } else {
        infoUrl.removeAttribute('href');
      }
    } else {
      setInfoValue(infoUrl, url || '—');
    }
  }
}

function setInfoValue(el, value) {
  if (!el) return;
  el.textContent = value || '—';
}
