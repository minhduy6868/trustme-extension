// background.js - TrustMe Extension
// Kết nối với Model API

// Model API URL
let MODEL_API_URL = 'http://localhost:8001';

// Load config từ .env (nếu có)
fetch(chrome.runtime.getURL('.env'))
  .then(response => response.text())
  .then(text => {
    text.split('\n').forEach(line => {
      if (line.startsWith('MODEL_API_URL=')) {
        MODEL_API_URL = line.replace('MODEL_API_URL=', '').trim();
      }
    });
  })
  .catch(() => {
    console.log('Using default Model API URL:', MODEL_API_URL);
  });


/**
 * Xác minh tin tức qua Model API
 */
async function verifyNews(text, url = null) {
  try {
    // Bước 1: Gửi request
    const verifyResponse = await fetch(`${MODEL_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        url: url,
        language: 'vi',
        deep_analysis: true
      })
    });

    if (!verifyResponse.ok) {
      throw new Error(`Model API error: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    const jobId = verifyData.job_id;

    console.log('Job created:', jobId);

    // Bước 2: Polling kết quả
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await sleep(2000);

      const resultResponse = await fetch(
        `${MODEL_API_URL}/result/${jobId}`
      );

      if (!resultResponse.ok) {
        throw new Error(`Failed to get result: ${resultResponse.status}`);
      }

      const result = await resultResponse.json();

      if (result.status === 'completed') {
        console.log('Verification completed:', result);
        return {
          success: true,
          score: result.trust_score,
          verdict: result.verdict,
          summary: result.summary,
          evidence_count: result.evidence_count,
          components: result.components,
          alternatives: result.alternatives,
          is_donation_post: result.is_donation_post,
          raw: result
        };
      } else if (result.status === 'failed') {
        throw new Error(result.error || 'Verification failed');
      }

      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts}: Still processing...`);
    }

    throw new Error('Timeout - quá lâu không có kết quả');

  } catch (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      score: 0,
      verdict: 'error',
      summary: `Lỗi: ${error.message}`,
      error: error.message
    };
  }
}


/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Message listener từ popup và content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkNews") {
    // Chạy async verification
    verifyNews(request.text, request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          score: 0,
          verdict: 'error',
          summary: `Lỗi: ${error.message}`,
          error: error.message
        });
      });

    // Return true để keep message channel open cho async response
    return true;
  }
});
