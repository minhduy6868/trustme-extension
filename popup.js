// popup.js - TrustMeBro extension with OpenRouter AI enhancement

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

// API Configuration
let API_BASE = 'http://localhost:8001';
let OPENROUTER_API_KEY = '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';
let OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
let USE_AI_ENHANCEMENT = true;

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
      if (cfg.OPENROUTER_API_KEY) {
        OPENROUTER_API_KEY = cfg.OPENROUTER_API_KEY;
      }
      if (cfg.OPENROUTER_API_URL) {
        OPENROUTER_API_URL = cfg.OPENROUTER_API_URL;
      }
      if (cfg.USE_AI_ENHANCEMENT !== undefined) {
        USE_AI_ENHANCEMENT = cfg.USE_AI_ENHANCEMENT;
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
  summaryLine.textContent = 'Đang phân tích với mô hình cục bộ...';
  setStatus('progress', 'Đang phân tích nội dung bằng mô hình AI cục bộ...');

  try {
    await submitToLocalModel(data);
  } catch (err) {
    logDebug('Analysis failed:', err);
    renderError('Không thể phân tích nội dung: ' + err.message);
  }
}

async function enhanceResultWithAI(localResult) {
  if (!USE_AI_ENHANCEMENT) {
    logDebug('AI enhancement disabled');
    return localResult;
  }

  logDebug('Starting AI enhancement...', localResult);

  // Convert technical flags to readable Vietnamese
  const flagsExplanation = (localResult.flags || []).map(flag => {
    const flagMap = {
      'ai': 'Có dấu hiệu nội dung AI tạo ra',
      'authority': 'Độ uy tín của nguồn chưa cao',
      'content': 'Nội dung có vấn đề',
      'donation': 'Có yêu cầu quyên góp đáng ngờ',
      'event': 'Sự kiện chưa được xác minh',
      'fact-check': 'Cần kiểm chứng thông tin',
      'media': 'Hình ảnh/video có vấn đề',
      'official': 'Không phải nguồn chính thức',
      'safety': 'Có nguy cơ an toàn',
      'semantic-medium': 'Độ tương đồng ngữ nghĩa trung bình',
      'semantic-low': 'Độ tương đồng ngữ nghĩa thấp',
      'signals': 'Có nhiều dấu hiệu đáng ngờ',
      'single-source': 'Chỉ có một nguồn duy nhất',
      'spam-behavior': 'Có hành vi spam',
      'temporal': 'Thông tin lỗi thời hoặc không chính xác về thời gian',
      'translation': 'Bản dịch có vấn đề',
      'typosquatting': 'Domain giả mạo',
      'uniqueness': 'Nội dung thiếu tính độc đáo'
    };
    return flagMap[flag] || flag;
  });

  const prompt = `Bạn là chuyên gia phân tích tin tức. Hãy VIẾT LẠI kết quả phân tích dưới đây thành ngôn ngữ TỰ NHIÊN, DỄ HIỂU cho người đọc thông thường.

� DỮ LIỆU PHÂN TÍCH:
Điểm tin cậy: ${localResult.trust_score}/100
Kết luận: ${localResult.verdict === 'verified' ? 'Đáng tin cậy' : localResult.verdict === 'likely-false' ? 'Nghi ngờ' : 'Cần thận trọng'}

Thông tin kỹ thuật:
${localResult.summary || ''}

Các vấn đề phát hiện:
${flagsExplanation.join('\n')}

Thành phần đánh giá:
${JSON.stringify(localResult.components || {}, null, 2)}

🎯 YÊU CẦU VIẾT LẠI:
1. SUMMARY: Viết 2-3 câu TỰ NHIÊN giải thích điểm tin cậy và kết luận
2. DETAILED_ANALYSIS: Viết 4-5 đoạn PHÂN TÍCH CHI TIẾT:
   - Đoạn 1: Tổng quan về nguồn tin
   - Đoạn 2: Điểm mạnh (nếu có)
   - Đoạn 3: Điểm yếu và vấn đề phát hiện
   - Đoạn 4: Giải thích tại sao đạt điểm này
   - Đoạn 5: Đánh giá tổng thể
3. FLAGS: Chuyển các cảnh báo kỹ thuật thành NGÔN NGỮ Dễ HIỂU
4. ACTION_SUGGESTION: Đưa ra lời khuyên CỤ THỂ cho người đọc

Trả về JSON (KHÔNG dùng markdown, chỉ JSON thuần):
{
  "summary": "Viết tóm tắt tự nhiên ở đây",
  "detailed_analysis": "Viết phân tích chi tiết ở đây, dùng \\n\\n để ngắt đoạn",
  "flags": ["Cảnh báo 1", "Cảnh báo 2"],
  "action_suggestion": "Lời khuyên cụ thể cho người đọc"
}`;

  try {
    summaryLine.textContent = '🤖 Đang làm đẹp kết quả với AI...';
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4.1-fast:free',
        messages: [
          {role: 'system', content: 'Bạn là chuyên gia kiểm chứng tin tức, trả lời bằng tiếng Việt.'},
          {role: 'user', content: prompt}
        ],
        stream: false,
        temperature: 0.3,
        extra_body: {
          reasoning: {
            enabled: true
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logDebug('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    logDebug('OpenRouter raw response:', result);
    
    const text = result.choices?.[0]?.message?.content;
    
    if (!text) {
      logDebug('No text in OpenRouter response');
      return localResult;
    }

    logDebug('OpenRouter response text:', text);

    // Try to extract JSON from response
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    
    // If no JSON found, try to extract from markdown code block
    if (!jsonMatch) {
      const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (jsonMatch) {
      try {
        const beautified = JSON.parse(jsonMatch[0]);
        logDebug('AI enhanced result:', beautified);
        
        summaryLine.textContent = '';
        
        return {
          ...localResult,
          summary: beautified.summary || localResult.summary,
          detailed_analysis: beautified.detailed_analysis || localResult.detailed_analysis,
          flags: beautified.flags && beautified.flags.length > 0 ? beautified.flags : localResult.flags,
          action_suggestion: beautified.action_suggestion || null,
          _ai_enhanced: true
        };
      } catch (parseError) {
        logDebug('JSON parse error:', parseError, 'Raw:', jsonMatch[0]);
      }
    } else {
      logDebug('No JSON found in AI response');
    }
    
    return localResult;
  } catch (error) {
    logDebug('AI enhancement failed:', error);
    summaryLine.textContent = '';
    return localResult;
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
      // Show status for AI enhancement
      if (USE_AI_ENHANCEMENT) {
        summaryLine.textContent = '🤖 Đang cải thiện kết quả với AI...';
        setStatus('progress', 'Đang phân tích và làm đẹp kết quả...');
      }

      // Enhance result with AI if enabled
      const beautifiedResult = await enhanceResultWithAI(result);
      renderTrustResult(beautifiedResult);
      logDebug('Pipeline completed', beautifiedResult);
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
  
  // Display AI enhancement status
  if (result._ai_enhanced) {
    scoreLine.textContent = `Điểm tin cậy: ${result.trust_score ?? '--'}/100 ✨`;
    scoreLine.title = 'Kết quả đã được cải thiện bởi AI';
  } else {
    scoreLine.textContent = `Điểm tin cậy: ${result.trust_score ?? '--'}/100`;
  }
  
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
  
  // Display action suggestion from AI if available
  if (result.action_suggestion) {
    displayActionSuggestion(result.action_suggestion);
  }
  
  // Update status based on AI enhancement
  if (result._ai_enhanced) {
    setStatus('success', '✅ Hoàn tất phân tích với AI ✨');
  } else {
    setStatus('success', 'Đã nhận kết quả từ TrustCheck.');
  }
}

function displayActionSuggestion(suggestion) {
  // Create or update action suggestion element
  let actionDiv = document.getElementById('actionSuggestion');
  
  if (!actionDiv) {
    actionDiv = document.createElement('div');
    actionDiv.id = 'actionSuggestion';
    actionDiv.className = 'action-suggestion';
    actionDiv.style.cssText = `
      margin-top: 12px;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    `;
    trustSummary.appendChild(actionDiv);
  }
  
  actionDiv.innerHTML = `
    <strong style="display: block; margin-bottom: 6px; font-size: 14px;">💡 Gợi ý hành động:</strong>
    ${escapeHtml(suggestion)}
  `;
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
