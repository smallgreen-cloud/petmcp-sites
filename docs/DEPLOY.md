# 在 ChatGPT 建立我的 PetMCP

請使用具有 Sites 權限的 ChatGPT 帳號。方案、建置配額、ChatGPT AI／語音功能與費用以帳號當時顯示及官方方案為準；本專案不保證免費帳號可部署，也不另收 AI API key。

公開版本的鎖定 Prompt 位於 [INSTALL_PROMPT.md](INSTALL_PROMPT.md)。在 ChatGPT 啟用 Sites 後貼上它。Agent 應讀取完整安裝契約，核對 commit 與授權，以 Sites 原生工具建立 owner-private Site，使用 manifest 宣告的 D1 / R2 與 MCP。

給部署 Agent：runtime 與安裝 metadata 分別鎖定。來源快照若未包含 `.smallgreen/install.yaml`，在私人工作目錄保存 Prompt 指定的鎖定契約原文後才跑 SAP-1／SAP-2／CON-3；不得因缺契約改加 Wrangler。核對原始 runtime commit，並保留最終原生 Sites source commit 與公開來源的差異證據。

1. 確認你要建立自己的私人 PetMCP。已有同專案時先核對並重用。
2. 等 Agent 回報真實部署狀態與自己的 Site URL。只有 terminal success 才算發布；expected URL 不代表已上線。
3. 在 ChatGPT 的個人插件（由你建立）安裝／連線這個 Site 的 PetMCP。若工具未出現，開新對話後試 `list_records`。
4. 開啟自己的 Site，建立合成寵物、寫入合成血檢 1.20 mg/dL、讀回、修正為 1.30，再核對原值稽核。不要直接拿真實健康資料驗收。
5. 測試上傳照片與 MCP 授權讀取，再請 ChatGPT 辨識。逐項人工確認後才儲存。
6. 按 [手機指引](MOBILE.md) 安裝自己的 PWA。逐項記錄 ACCEPTANCE.md；Voice、手機或隔離未測時維持 Candidate。

遇到 Sites 權限或平台限制就停止該階段並留下訊息；不能切換成自己的 Cloudflare、BYOC、Groq 或共享寵物 API。
