# 分段驗收

狀態只能使用 pass / fail / blocked / not tested。每次保存實際 commit、時間、執行環境與非敏感結果到 evidence；未執行的步驟不得勾選成功。

本人手機、原生 Voice、第二帳號與 teardown 的操作、通過條件與統一回報表集中在 [USER_ACCEPTANCE_CHECKLIST.md](docs/USER_ACCEPTANCE_CHECKLIST.md)。表內未操作項目保持未驗收；不重做已有證據的桌面流程。

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
CI 釘選含 Sites-only 支援的 SmallGreen Spec 與 conformance，執行正式 SAP-1／SAP-2／CON-3。它們驗證原生 manifest 與安裝契約、空外部基礎設施、無獨立 Wrangler，以及 runtime bindings／secrets；本案額外的 Sites-only guard 仍保留。通過這三項不等於其他動態 requirements、手機、Voice 或 teardown 通過；舊版失敗報告保留當時狀態，新結果另存 evidence。不得新增獨立 Cloudflare 或 BYOC 來取得綠燈。

最新靜態結果：[2026-11-23-sites-conformance.json](evidence/2026-11-23-sites-conformance.json)。
