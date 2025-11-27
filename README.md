# TrustMeBro Chrome Extension

Browser extension for quickly extracting structured article/post data.

## Purpose

Allows users to capture metadata and main content from news articles and social media posts with one click.

## Features

- One-click data extraction
- Structured JSON output (URL, title, contents, article, created_at)
- Floating widget with quick copy-to-clipboard
- Heuristics for news sites and social platforms (Facebook, X/Twitter, Instagram)
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
5. TrustMeBro icon appears in toolbar

## Usage

1. Open any news article or social media post
2. Click TrustMeBro extension icon in toolbar
3. Click "Thu thập dữ liệu"
4. View JSON payload (copy or export as needed)

## How It Works

```
User clicks "Thu thập dữ liệu" button
    ↓
Extension asks content.js for structured data
    ↓
content.js collects title, body text, social post content, published date
    ↓
background.js forwards message responses
    ↓
popup.js renders JSON with copy-friendly formatting
```

## Files

- `manifest.json` - Extension configuration
- `content.js` - Extract structured data from pages
- `background.js` - Route extraction requests between popup and content script
- `popup.html` - UI layout
- `popup.js` - UI logic and JSON display
- `icons/` - Extension icons

## Content Extraction

The extension extracts content from:

**Facebook:**

```javascript
document.querySelectorAll('[role="article"]');
```

**News sites:**

```javascript
document.querySelector('article, main, [id*="content"]');
```

**Fallback:**

```javascript
document.body.innerText;
```

## Output Format

Kết quả JSON gồm các trường chính:

- `url`: đường dẫn của trang đang mở hoặc là đường dẫn của bài viết (đối với facebook)
- `title`: tiêu đề bài viết hoặc heading chính
- `article`: văn bản bài viết
- `created_at`: ngày tạo/đăng bài (ISO string nếu parse được, ngược lại trả chuỗi gốc)
- `author`: người viết bài hoặc chủ bài đăng (nếu xác định được)
- `platform`: nền tảng nhận diện (facebook, instagram, twitter, tiktok, youtube, web)
- `image_urls`: danh sách URL hình ảnh tìm thấy trong trang (nếu có)

## Permissions

Extension requires:

- `activeTab` - Read current page content

No data collection. No external tracking.

## Development

### Test locally:

1. Make code changes
2. Go to `chrome://extensions/`
3. Click "Reload" on TrustMeBro extension
4. Test on a website

### Debug:

- Right-click extension icon → "Inspect popup"
- Check Console for logs
- View `background.js` logs in extension service worker

## Troubleshooting

### Extension not working:

1. Reload trang và đảm bảo nội dung đã render đầy đủ
2. Inspect popup hoặc content script console để xem lỗi selector
3. Tắt/bật lại extension hoặc reload tại `chrome://extensions/`

### Không thấy dữ liệu:

1. Đảm bảo trang đã tải nội dung (đối với Facebook/X nên cuộn để load)
2. Kiểm tra Console trong popup hoặc content script để xem log selector
3. Với trang render động, thử reload và chạy lại

## Future Features

- [ ] Bổ sung thêm selector cho các trang báo Việt Nam phổ biến
- [ ] Xuất dữ liệu sang CSV/Google Sheets
- [ ] Cho phép cấu hình trường JSON mong muốn
- [ ] Đồng bộ với backend thu thập dữ liệu

## License

Apache 2.0
