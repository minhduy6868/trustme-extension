# TrustMe News Checker Extension

## Mô tả
Extension kiểm tra độ tin cậy của bài viết, bài báo, post Facebook bằng API Gemini. Hiển thị điểm tin cậy và phân tích chi tiết bằng tiếng Việt.

## Cài đặt & sử dụng
1. Clone hoặc copy thư mục `trustme_extension` vào máy tính.
2. Thêm icon vào thư mục `icons` (icon16.png, icon48.png, icon128.png).
3. Mở Chrome/Edge, truy cập `chrome://extensions/` hoặc `edge://extensions/`.
4. Bật "Developer mode" (Chế độ nhà phát triển).
5. Nhấn "Load unpacked" và chọn thư mục extension.
6. Extension sẽ xuất hiện trên thanh công cụ. Truy cập trang báo hoặc Facebook, nhấn vào icon để kiểm tra bài viết.

## Cấu trúc thư mục
```
trustme_extension/
├── manifest.json
├── background.js
├── content.js
├── floating_widget.js
├── popup.html
├── popup.js
├── .env
├── README.md
└── icons/
```

## Thiết lập biến môi trường
- File `.env` chứa thông tin API:
```
GEMINI_API_KEY=your_api_key_here
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

## Tuỳ chỉnh
- Có thể chỉnh sửa giao diện popup, widget nổi trong các file `popup.html`, `floating_widget.js`.
- Để thay đổi API key, sửa file `.env`.

## Lưu ý
- Extension chỉ hoạt động khi có kết nối internet.
- API key cần bảo mật, không chia sẻ công khai.
