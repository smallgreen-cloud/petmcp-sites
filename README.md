# PetMCP Sites

把血檢原始數值、日常照護、寵物頭像和食品標籤，保存在**你自己的 ChatGPT Site**。MIT 開源候選專案；尚未取得 SmallGreen Ready。

- 一人一個私人 Site，使用 Sites 原生 ChatGPT 登入、持久資料與附件、個人 MCP。
- ChatGPT 負責圖片理解、語音與推理；寫入前由人核對原始資料。
- 食品標籤是產品參考，不推定任何寵物已食用。
- 支援修正稽核、原始照片、JSON 備份、空白帳號還原與完整資料刪除。
- 不需要自行申請 Cloudflare 帳號、外部 AI API Key、Groq、Gmail OTP 或共享後端。

## 建立我的 PetMCP

在具備 Sites 權限的 ChatGPT 帳號內，開啟 [部署引導](docs/DEPLOY.md)，將版本鎖定的安裝提示交給 ChatGPT。建站資格與建置／AI 額度依目前方案與平台顯示為準；不能因能看公開 Site，就假設免費帳號能建立私人 Site。

來源鎖定、資源邊界與驗收步驟見 [安裝契約](.smallgreen/install.yaml)。只用 ChatGPT Sites 原生工具。平台能力不足時停止，不改走獨立 Cloudflare 或 BYOC。

## 使用

先建立寵物，再手動記錄或上傳照片。在 ChatGPT 安裝這個 Site 發布時建立的個人插件，請它讀取附件、提出草稿，核對後再寫入；回到 PWA 重新讀取。

[手機首次設定](docs/MOBILE.md) · [驗收矩陣](ACCEPTANCE.md) · [備份與移除](docs/MAINTENANCE.md) · [安全邊界](SECURITY.md)

PWA 不內嵌 ChatGPT Live，不把照片或健康資料塞進聊天網址。不同寵物、不同原始單位不合併趨勢。紀錄整理不能替代獸醫診斷。

## 開發與驗證

Agent 使用 `npm ci`、`npm test`、`npm run build`；Node 24 以上。Tests 使用本機 SQLite 與記憶體物件儲存驗證 D1/R2 的應用邏輯，不等同線上 Sites 驗收。Sites skill 的 Vinext 建置工具使用本機 Cloudflare runtime 相容工具；它們不是另行部署到 Cloudflare 的指令。

資源唯一來源是 `.openai/hosting.json`。公開模板故意不含 `project_id`；首次建立由 Sites 回傳實際 ID，寫入使用者私人來源 checkout。不可把自己的 Site 身分或私人資料推回公開模板。

對外發布的程式 commit 與契約 commit 分開：契約鎖定已存在的可執行 source commit，避免自我參照 SHA。最終 release 的文件與安裝提示指向該真實 commit。

## 現行限制

- 真實跨帳號隔離、ChatGPT 圖片工具交接、原生 Voice、Android 安裝及 teardown 證據仍須逐項驗收。
- 每張圖片上限 5 MB；完整備份上限 20 MB，附件原始總量 10 MB，至多 1000 筆紀錄、100 張附件及 5000 筆稽核。超限時明確拒絕，不截斷資料。請在達到上限前備份。
- 還原只接受空白帳號，操作期間請關閉其他分頁，避免同時寫入。資料刪除與平台 Site 刪除是不同步驟。
- 單筆刪除保留稽核中的舊內容；要完全抹除需使用「清除我的全部資料」。
- 不做定時背景任務或靜默同步；每次寫入失敗立即回報。

## 來源與授權

產品資料語意參考 2026-11-22 Sites-only 交接及既有 PetMCP v1.3 規格，程式重新實作 Sites 身分邊界，不攜入舊 OAuth／OTP／共用服務。Vinext scaffold 與 Sites Vite plugin 來自 OpenAI Sites skill；保留其授權。應用程式 MIT，見 [LICENSE](LICENSE)。
