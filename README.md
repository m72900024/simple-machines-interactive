# 簡單機械 互動學習網

億載國小六年級自然第一單元（康軒 114 版）互動教材。

## 內容

- 📚 電子課本：上傳 PDF 即時閱讀
- 槓桿（含三類型比較表 + 力臂平衡實驗室）
- 輪軸與滑輪（剖面圖解析 + 兩個虛擬實驗室）
- 齒輪與鏈條（互相咬合 vs 鏈條傳動）
- 單元總測驗

## 對應教學

- 推動中小學數位學習精進方案 115 年 2-5 月重點學校
- 適用班級：603 自然
- 教案：4 節（槓桿 / 輪軸 / 滑輪 / 齒輪鏈條 + 綜合）

## 技術

單檔 `index.html`，CDN 載入 React 18 + lucide-react + Tailwind Play + Babel standalone。

修改後執行：

```bash
python3 build.py
```

把 `App.jsx` 重新打包為 `index.html`。

## 本地預覽

```bash
python3 -m http.server 8787
open http://127.0.0.1:8787/
```
