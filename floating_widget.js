// floating_widget.js
(function () {
  if (window.__trustme_widget) return;
  window.__trustme_widget = true;

  const widget = document.createElement("div");
  widget.id = "trustme-floating-widget";
  widget.style.position = "fixed";
  widget.style.bottom = "24px";
  widget.style.right = "24px";
  widget.style.zIndex = "99999";
  widget.style.background = "rgba(255,255,255,0.97)";
  widget.style.border = "2px solid #007bff";
  widget.style.borderRadius = "12px";
  widget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  widget.style.padding = "16px 20px 20px";
  widget.style.fontFamily = "Arial, Helvetica, sans-serif";
  widget.style.fontSize = "14px";
  widget.style.color = "#1f1f1f";
  widget.style.maxWidth = "360px";
  widget.innerHTML = "<b>Đang quét dữ liệu bài viết...</b>";
  document.body.appendChild(widget);

  function renderError(message) {
    widget.innerHTML = `<b style="color:#dc3545;">Không thể lấy dữ liệu</b><div style="margin-top:8px;font-size:12px;">${message}</div>`;
  }

  function renderData(data) {
    const json = JSON.stringify(data, null, 2);

    widget.innerHTML = `
      <div style="font-weight:bold;margin-bottom:8px;">Dữ liệu bài viết</div>
      <pre style="max-height:180px;overflow:auto;background:#f8f9fa;padding:8px;border-radius:6px;border:1px solid #e1e1e1;font-size:12px;white-space:pre-wrap;">${escapeHtml(
        json
      )}</pre>
      <button id="trustme-copy-json" style="margin-top:10px;background:#007bff;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;">
        Sao chép JSON
      </button>
    `;

    const copyBtn = document.getElementById("trustme-copy-json");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copyToClipboard(json, copyBtn));
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
