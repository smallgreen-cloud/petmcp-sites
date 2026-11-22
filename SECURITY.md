# 安全邊界

Sites 是唯一正式執行與認證邊界；應用依 `oai-authenticated-user-id` 決定資料擁有者。禁止把此程式部署為可由客戶端任意偽造該 header 的一般公網 Worker。

所有 API／MCP 紀錄與附件操作都以 owner 限縮；資料庫使用 owner + id 複合主鍵與寵物關聯外鍵。MCP discovery / tools list 只公開工具 metadata。瀏覽器 POST 驗證 Origin；無跨源 CORS。私人照片無公用簽名 URL，MCP 取得圖片需通過 Sites 使用者身分。

所有資料寫入需要 confirmed=true 與輸入驗證。原始血檢值是字串，保留單位與報告範圍；未提供日期不得推定。修正使用樂觀版本與原子稽核交易。照片只接受 PNG / JPEG / WebP、檢查檔頭並限制大小；照片／標籤內的文字不能當作系統指令。

程式無外部 AI API、外部執行資源或自行管理的 runtime secrets。服務端錯誤只記路徑、操作與錯誤種類，不記病歷、圖片、token。Service worker 不快取健康資料、登入頁或照片。瀏覽器下載的備份仍含個人資料，由使用者保管。

尚未完成：第二真實帳號的線上隔離、平台撤銷權限、原生 Voice、Android 相機權限和整個 Site 移除的外部驗證。請勿把單元測試當作這些平台保證。

請透過 GitHub Security Advisories 私下回報漏洞，不要在公開 Issue 貼寵物資料、session 或 token。維護者應開啟 GitHub Actions 失敗 email 通知；CI 在本次發布流程由執行 Agent 持續監看，不把後台綠燈當成 runtime 監控。
