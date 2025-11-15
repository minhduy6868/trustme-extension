# TrustMe Chrome Extension

Browser extension for real-time fake news detection.

## Purpose

Allows users to verify news articles and social media posts directly in their browser with one click.

## Features

- One-click verification
- Real-time fact-checking
- Trust score display (0-100)
- Detailed analysis breakdown
- Special warning for donation scam posts
- Support for multiple platforms:
  - Facebook posts
  - News articles
  - Twitter/X
  - Any website

## Installation

### Load into Chrome:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `trustme-extension/` folder
5. Extension icon appears in toolbar

### Configuration (optional):

Create `.env` file:
```
MODEL_API_URL=http://localhost:8001
```

Default: `http://localhost:8001`

## Usage

1. Open any news article or social media post
2. Click TrustMe extension icon in toolbar
3. Click "Kiểm tra tin tức" (Check News)
4. Wait 10-30 seconds for results
5. View trust score and detailed analysis

## How It Works

```
User clicks "Check" button
    ↓
Extension extracts page content (content.js)
    ↓
Sends to Model API via background.js
    ↓
Model API crawls related articles
    ↓
AI analysis (7 detection methods)
    ↓
Results polled every 2s
    ↓
Display in popup.js:
  - Trust score with color coding
  - Verdict (Verified / Needs Review / Likely False / Donation Scam)
  - Detailed explanation
  - Warning box for donation posts
```

## Files

- `manifest.json` - Extension configuration
- `content.js` - Extract content from web pages
- `background.js` - Communication with Model API
- `popup.html` - UI layout
- `popup.js` - UI logic and display
- `icons/` - Extension icons

## Content Extraction

The extension extracts content from:

**Facebook:**
```javascript
document.querySelectorAll('[role="article"]')
```

**News sites:**
```javascript
document.querySelector('article, main, [id*="content"]')
```

**Fallback:**
```javascript
document.body.innerText
```

## Display

### Verdict Types:

- **Verified** (green) - Confirmed by trusted sources
- **Needs Review** (yellow) - Mixed signals
- **Likely False** (red) - Suspicious indicators
- **Donation Scam** (red alert) - Fake charity post

### Special Features:

**Donation Post Warning:**
```
⚠️ ĐÂY LÀ BÀI QUYÊN GÓP
Hãy thận trọng trước khi chuyển tiền!
Chỉ quyên góp qua tổ chức chính thức...
```

**Component Breakdown:**
- Spam detection score
- Authority verification score
- Duplication check score
- Fact check score

**Alternative Sources:**
Links to trusted sources for reference

## Requirements

Model API must be running on `http://localhost:8001`

Start Model API:
```bash
cd trustme-model
uvicorn src.main:app --port 8001 --reload
```

## Permissions

Extension requires:
- `activeTab` - Read current page content
- `http://localhost:8001/*` - Communicate with API

No data collection. No external tracking.

## Development

### Test locally:

1. Make code changes
2. Go to `chrome://extensions/`
3. Click "Reload" on TrustMe extension
4. Test on a website

### Debug:

- Right-click extension icon → "Inspect popup"
- Check Console for logs
- View `background.js` logs in extension service worker

## Troubleshooting

### Extension not working:

1. Check Model API is running: `curl http://localhost:8001/health`
2. Check console for errors (inspect popup)
3. Reload extension

### No results:

1. Ensure page has sufficient text content
2. Check network tab for API call failures
3. Check if Model API is processing (may take 10-30s)

### Rate limit error:

Model API limits to 60 requests/min per IP. Wait 60s and try again.

## Future Features

- [ ] Support more languages
- [ ] Inline highlighting of suspicious text
- [ ] Browser notifications
- [ ] Quick share verified/debunked posts
- [ ] User feedback mechanism

## License

Apache 2.0
