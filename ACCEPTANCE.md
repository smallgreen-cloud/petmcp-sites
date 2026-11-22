# 分段驗收

狀態只能使用 pass / fail / blocked / not tested。每次保存實際 commit、時間、執行環境與非敏感結果到 evidence；未執行的步驟不得勾選成功。

| 階段 | 操作與可核對結果 | 本機證據的範圍 |
|---|---|---|
| deployment | native Sites deploy terminal success；登入後首頁及 /health 200；DB/R2/mcp 正確宣告 | build 只證明可產生 artifact |
| runtime-setup | Sites 個人 plugin 可安裝、discover/list、真正以帳號身分呼叫 | 本機 JSON-RPC 不證明插件已連線 |
| operational | 合成寵物 → CREA 原始值 1.20 mg/dL／2026-11-22 → MCP 讀回 → PWA → 修正 1.30 → 再讀回及原值稽核 | SQLite adapter 交易與數值語意測試 |
| privacy | 未登入拒絕；第二真實帳號讀寫與照片存取遭拒 | 合成 owner A/B 只證明應用查詢隔離 |
| photo | PWA 上傳 → 私人 MCP 取得 image block → ChatGPT 辨識 → 人確認 → 寫入 → PWA 讀回 | 檔頭／大小／授權測試不等於 Vision E2E |
| voice | ChatGPT 原生 Voice 能呼叫此個人 MCP；另外測 PWA 啟動入口 | not tested，不能模擬為通過 |
| mobile | Android Chrome 安裝、返回、更新、重開、照片權限、登入保持 | 桌面 RWD 不等於手機驗收 |
| portability | 匯出紀錄／原圖／稽核 → 空白個人帳號還原 → 內容逐筆比對 | 本機可驗還原格式及位元組 |
| deletion | 確認後刪除資料並讀回為空；正式移除 Site 前先驗備份 | 資料清除不等於平台資源 zero-diff |
| teardown | 原生 Sites 移除指定測試專案與個人 plugin，前後受管資源差異歸零 | 須有平台清單證據與刪除授權 |

`npm test` 的 coverage gate：line / branch / function 均至少 80%。
SmallGreen 舊 conformance 部分程式以 wrangler 資源為前提；不為了通過它新增獨立 Cloudflare 設定。契約 schema 與 Sites manifest 的本案閘門另存結果，legacy profile / secret scanner 如不支援 Sites，記錄 blocked，不降級規則或宣稱整套 conformance 通過。
