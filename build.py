#!/usr/bin/env python3
"""把 App.jsx 包成單檔 index.html。"""
from pathlib import Path

ROOT = Path(__file__).parent
jsx = (ROOT / "App.jsx").read_text(encoding="utf-8")

# index.html 不需要 export default，刪除 import 由 importmap 處理
body = jsx.replace("export default function App()", "function App()")

HTML = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>六年級自然：簡單機械 互動學習網</title>
<meta name="description" content="億載國小六年級自然第一單元（康軒 114 版）互動教材：槓桿 / 輪軸與滑輪 / 齒輪與鏈條 + 總測驗">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ctext y='20' font-size='20'%3E⚙️%3C/text%3E%3C/svg%3E">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif; }
  @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .animate-fade-in { animation: fade-in .3s ease-out; }
</style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1",
    "lucide-react": "https://esm.sh/lucide-react@0.456.0?deps=react@18.3.1&external=react"
  }
}
</script>
</head>
<body class="bg-slate-50">
<div id="root"></div>
<noscript>請啟用 JavaScript 才能使用本互動教材。</noscript>

<script src="https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"></script>
<script type="text/babel" data-type="module" data-presets="react">
import { createRoot } from 'react-dom/client';

__BODY__

createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>
"""

html = HTML.replace("__BODY__", body)
out = ROOT / "index.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({len(html):,} bytes)")
