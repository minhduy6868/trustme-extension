// popup.js - TrustCheck end-to-end trigger from extension

const checkBtn = document.getElementById('checkBtn');
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
    } else {
      logDebug(`Config not found, using default ${API_BASE}`);
    }
  } catch (err) {
    logDebug(`Failed to read config.json, using default ${API_BASE}`, err);
  }
}

runNowBtn.addEventListener('click', () => handleExtraction(true));
checkBtn.addEventListener('click', () => handleExtraction(autoCheckToggle.checked));

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
  checkBtn.disabled = disabled;
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
    renderError('Không có nội dung để gửi TrustCheck.');
    return;
  }

  trustSummary.hidden = false;
  setVerdictBadge('processing');
  summaryLine.textContent = 'Đang gửi tới TrustCheck...';
  setStatus('progress', 'Đang gửi dữ liệu tới TrustCheck...');

  const payload = {
    text: data.article,
    url: data.url,
    language: 'vi',
    deep_analysis: true,
  };

  try {
    logDebug('Sending to model', { endpoint: `${API_BASE}/verify`, payload });
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
  scoreLine.textContent = `Trust score: ${result.trust_score ?? '--'}`;
  summaryLine.textContent = result.summary || '';
  flagsList.innerHTML = '';
  setStatus('success', 'Đã nhận kết quả từ TrustCheck.');
  (result.flags || []).forEach((flag) => {
    const li = document.createElement('li');
    li.textContent = flag;
    flagsList.appendChild(li);
  });
}

function setVerdictBadge(verdict) {
  verdictBadge.className = 'pill processing';
  switch (verdict) {
    case 'verified':
      verdictBadge.classList.add('verified');
      verdictBadge.textContent = 'Tin cậy';
      break;
    case 'likely-false':
      verdictBadge.classList.add('likely-false');
      verdictBadge.textContent = 'Có thể giả';
      break;
    case 'processing':
      verdictBadge.classList.add('processing');
      verdictBadge.textContent = 'Đang xử lý...';
      break;
    default:
      verdictBadge.classList.add('needs-review');
      verdictBadge.textContent = 'Cần xem lại';
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
