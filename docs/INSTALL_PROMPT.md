# 複製到具有 Sites 權限的 ChatGPT

請先讀取安裝契約：
https://raw.githubusercontent.com/smallgreen-cloud/petmcp-sites/7a5f09461f308528d98322a33a041faca331fe2d/.smallgreen/install.yaml

請依契約，把公開來源 https://github.com/smallgreen-cloud/petmcp-sites 的 commit ed20ee8fbda440a7f1b44007528394b726ae4f62 部署成我自己的私人 PetMCP ChatGPT Site。

只使用 ChatGPT Work / Sites 原生託管、登入、D1、R2 與個人 MCP。先核對我的帳號有 Sites 權限、來源與 MIT 授權；無權限就停止並說明，不可改用獨立 Cloudflare、BYOC、外部 API Key、Groq、OTP 或共享後端。公開模板沒有 project_id；新 Site 保存平台實際回傳的 ID；既有 Site 先核對身分再重用，不重複建立。

請依 Sites skill 保存精確來源、建置、原生部署並等 terminal 結果。完成後給我自己的 Site URL 與個人插件連線步驟。用合成資料逐項驗證：建寵物、原始血檢 1.20 mg/dL 與日期、MCP 讀回、PWA 顯示、修正為 1.30、原值稽核、照片授權、匯出與空白帳號還原。照片先辨識草稿給我核對，再寫入；食品標籤不能當成已餵食。

另列 ChatGPT 原生 Voice、Android Chrome 安裝到主畫面／返回／更新／照片權限／登入保持、第二真實帳號隔離及 teardown 的 pass / fail / blocked / not tested。不能把部署成功說成全部驗收成功。PWA 不嵌入 ChatGPT Live，也不把健康資料放進聊天網址。不得自行升級 SmallGreen Ready；刪除整個 Site 前先驗備份並取得明確移除同意。

需要本人操作的項目請集中使用這份清單，不逐項另開零碎任務：
https://github.com/smallgreen-cloud/petmcp-sites/blob/7a5f09461f308528d98322a33a041faca331fe2d/docs/USER_ACCEPTANCE_CHECKLIST.md

SAP-1／SAP-2／CON-3 使用 CI 鎖定的 Sites-compatible Spec 與 conformance；不要要求我加入獨立 Wrangler 設定或把靜態通過當成平台實測通過。
