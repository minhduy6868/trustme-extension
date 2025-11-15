// popup.js - TrustMe Extension

document.getElementById('checkBtn').onclick = function() {
  // Reset UI
  document.getElementById('score').textContent = 'Đang phân tích...';
  document.getElementById('raw').innerHTML = '';
  
  // Disable button
  document.getElementById('checkBtn').disabled = true;
  
  // Get current tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    
    // Get content from page
    chrome.tabs.sendMessage(currentTab.id, {action: "getContent"}, function(response) {
      if (!response || !response.text) {
        document.getElementById('score').textContent = 'Không lấy được nội dung bài viết.';
        document.getElementById('checkBtn').disabled = false;
        return;
      }
      
      // Send to background for verification
      chrome.runtime.sendMessage({
        action: "checkNews", 
        text: response.text,
        url: currentTab.url
      }, function(result) {
        // Re-enable button
        document.getElementById('checkBtn').disabled = false;
        
        if (result && result.success) {
          // Success case
          displayResult(result);
        } else {
          // Error case
          document.getElementById('score').innerHTML = 
            `<span style="color: red;">❌ Lỗi: ${result.summary || 'Không thể xác minh'}</span>`;
          document.getElementById('raw').innerHTML = 
            `<small>Chi tiết lỗi: ${result.error || 'Unknown error'}</small>`;
        }
      });
    });
  });
};


/**
 * Hiển thị kết quả xác minh
 */
function displayResult(result) {
  const score = result.score || 0;
  const verdict = result.verdict || 'unknown';
  const summary = result.summary || '';
  
  // Verdict emoji và màu sắc
  const verdictInfo = {
    'verified': { emoji: '✅', color: '#28a745', text: 'Đã xác minh' },
    'needs-review': { emoji: '⚠️', color: '#ffc107', text: 'Cần xem xét' },
    'likely-false': { emoji: '❌', color: '#dc3545', text: 'Có thể sai' },
    'insufficient-evidence': { emoji: '⚠️', color: '#6c757d', text: 'Thiếu bằng chứng' },
    'donation-scam': { emoji: '🚨', color: '#dc3545', text: 'NGUY CƠ LỪA ĐẢO QUYÊN GÓP!' },
    'error': { emoji: '❌', color: '#dc3545', text: 'Lỗi' }
  };
  
  const info = verdictInfo[verdict] || verdictInfo['needs-review'];
  
  // Hiển thị điểm số
  document.getElementById('score').innerHTML = `
    <div style="font-size: 24px; margin-bottom: 10px;">
      ${info.emoji} <b style="color: ${info.color};">${score.toFixed(1)}/100</b>
    </div>
    <div style="font-size: 14px; color: ${info.color}; font-weight: bold; margin-bottom: 10px;">
      ${info.text}
    </div>
  `;
  
  // Hiển thị summary
  let detailHTML = `<div style="margin-bottom: 15px;">${summary}</div>`;
  
  // Cảnh báo đặc biệt cho donation posts
  if (result.is_donation_post) {
    detailHTML += '<div style="background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; font-size: 13px;">';
    detailHTML += '<strong>⚠️ ĐÂY LÀ BÀI QUYÊN GÓP</strong><br>';
    detailHTML += 'Hãy thận trọng trước khi chuyển tiền!<br>';
    detailHTML += 'Chỉ quyên góp qua tổ chức chính thức có xác nhận từ báo chí hoặc chính quyền.';
    detailHTML += '</div>';
  }
  
  // Hiển thị components (nếu có)
  if (result.components) {
    detailHTML += '<div style="margin-top: 10px; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px;">';
    detailHTML += '<strong>Chi tiết phân tích:</strong><br>';
    for (const [key, value] of Object.entries(result.components)) {
      const label = {
        'sources': '📰 Nguồn tin',
        'semantic': '🧠 Ngữ nghĩa',
        'language': '📝 Ngôn ngữ',
        'image': '🖼️ Hình ảnh'
      }[key] || key;
      
      detailHTML += `${label}: <span style="color: ${getScoreColor(value)};">${value.toFixed(1)}%</span><br>`;
    }
    detailHTML += '</div>';
  }
  
  // Hiển thị số lượng evidence
  if (result.evidence_count) {
    detailHTML += `<div style="margin-top: 10px; font-size: 12px;">`;
    detailHTML += `📊 Đã kiểm tra <b>${result.evidence_count}</b> nguồn tin`;
    detailHTML += `</div>`;
  }
  
  // Hiển thị alternatives (nếu có)
  if (result.alternatives && result.alternatives.length > 0) {
    detailHTML += '<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">';
    detailHTML += '<strong>🔗 Nguồn tham khảo:</strong><br>';
    result.alternatives.forEach(alt => {
      detailHTML += `<a href="${alt.url}" target="_blank" style="display: block; margin-top: 5px; font-size: 12px;">
        ${alt.title || alt.source}
      </a>`;
    });
    detailHTML += '</div>';
  }
  
  document.getElementById('raw').innerHTML = detailHTML;
}


/**
 * Lấy màu sắc theo điểm số
 */
function getScoreColor(score) {
  if (score >= 80) return '#28a745';
  if (score >= 60) return '#ffc107';
  if (score >= 40) return '#fd7e14';
  return '#dc3545';
}
