# 🚀 Quick Guide - Logo & Gemini Update

## ✅ Đã Cập Nhật

### 1. Logo Mới
- ✅ Sử dụng `trust_check_logo-removebg-preview.png`
- ✅ Hiển thị trên toolbar, extension page, và AI badge

### 2. Gemini AI Enhancement
- ✅ Làm sạch kết quả từ model cục bộ
- ✅ Phân tích sâu và giải thích chi tiết
- ✅ Đưa ra cảnh báo cụ thể
- ✅ Gợi ý hành động cho user

---

## 🔧 Cách Sử Dụng (3 Bước)

### 1️⃣ Reload Extension
```
1. Mở chrome://extensions/
2. Tìm "TrustMeBro Fact Checker"
3. Click "Reload" (⟳)
4. ✅ Logo mới sẽ hiển thị
```

### 2️⃣ Test Extension
```
1. Mở một trang web (ví dụ: tin tức)
2. Click icon extension trên toolbar
3. Click "Phân tích ngay"
4. Chờ kết quả:
   ⏳ Model phân tích (10-20s)
   ⏳ Gemini làm sạch (2-5s)
   ✅ Hiển thị kết quả beautified
```

### 3️⃣ Kiểm Tra Kết Quả
Kết quả sẽ bao gồm:
- ✅ Trust Score (0-100)
- ✅ Verdict (Đáng tin / Cần thận trọng / Nghi ngờ)
- ✅ Summary (tóm tắt ngắn gọn)
- ✅ Detailed Analysis (phân tích chi tiết)
- ✅ Flags (cảnh báo)
- ✅ **Action Suggestion** (gợi ý hành động - MỚI!)

---

## 📊 Luồng Xử Lý

```
User clicks "Phân tích ngay"
        ↓
Extract content from page
        ↓
Send to Local Model (http://localhost:8001)
        ↓
Get raw result (technical)
        ↓
Send to Gemini AI (làm sạch & phân tích sâu)
        ↓
Get enhanced result (user-friendly)
        ↓
Display with logo & beautiful UI
```

---

## ⚙️ Configuration

**File**: `trustme-extension/config.json`

```json
{
  "USE_GEMINI_FOR_FORMATTING": true  // Bật Gemini post-processing
}
```

**Tắt Gemini** (nếu muốn):
- Set `USE_GEMINI_FOR_FORMATTING`: false
- Kết quả sẽ là raw từ model (kỹ thuật hơn)
- Nhanh hơn ~2-5s

---

## 🎨 Ví Dụ Kết Quả

### Before (No Gemini)
```
Summary: "Source score 0.7, semantic 0.6, language 0.8"
→ Khó hiểu, kỹ thuật
```

### After (With Gemini)
```
Summary: "Bài viết có độ tin cậy trung bình. Nguồn uy tín 
nhưng thiếu bằng chứng cụ thể."

Detailed Analysis:
"Điểm mạnh:
- Nguồn từ báo chính thống
- Ngôn ngữ trung lập

Điểm yếu:
- Thiếu trích dẫn nguồn
- Một số thông tin chưa được kiểm chứng"

💡 Gợi ý hành động:
"Nên kiểm chứng thêm với ít nhất 2-3 nguồn khác trước khi 
tin tưởng hoàn toàn"

→ Dễ hiểu, actionable
```

---

## 🐛 Troubleshooting

### ❌ Logo không hiển thị?
```bash
# Hard reload extension
1. chrome://extensions/
2. Remove extension
3. Load unpacked → chọn thư mục trustme-extension
```

### ❌ Gemini không chạy?
```
1. Kiểm tra config.json: USE_GEMINI_FOR_FORMATTING = true
2. Kiểm tra API key trong config.json
3. Mở Console (F12) xem lỗi
```

### ❌ Extension không phản hồi?
```
1. Check local model đang chạy: http://localhost:8001/health
2. Check console log (F12 → Console)
3. Reload extension
```

---

## 📝 Files Changed

- ✅ `manifest.json` - Logo paths
- ✅ `popup.js` - Gemini enhancement logic
- ✅ `config.json` - Enable Gemini flag
- ✅ `GEMINI_ENHANCEMENT.md` - Full documentation

---

## 🎉 Kết Luận

**Cải tiến chính:**
1. 🎨 Logo chuyên nghiệp hơn
2. 🤖 Gemini AI làm kết quả dễ hiểu hơn
3. 💡 Gợi ý hành động cụ thể
4. ✨ UI/UX tốt hơn

**Thời gian xử lý:**
- Model: 10-20s
- Gemini: 2-5s
- **Tổng: 12-25s** (chấp nhận được)

**Enjoy your enhanced extension! 🚀**
