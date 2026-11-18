# lilXii — AI · XR · UX Portfolio

以 React、TypeScript、Vite 與 Three.js 製作的靜態作品集。3D 車庫包含雙 FSAE 車、街機、VR 展示架與工作台相機；作品與經歷也能透過 HTML 導覽閱讀。支援中英切換、作品直接連結與圖片放大。

車輛 GLB 為風格化占位模型，可透過相同資源接口替換。

## 安裝與本機預覽

需要 Node.js 22.12 以上；CI 使用 Node.js 24。以 npm 與 package-lock.json 安裝依賴。

```powershell
npm ci
npm run dev
```

開啟終端顯示的網址，預設為 `http://127.0.0.1:5173/`。Ctrl+C 停止服務。

```powershell
npm run check
npm run build
npm run preview
```

正式產物位於 `dist/`。請透過 HTTP 伺服器預覽，勿直接雙擊 HTML。一般開發、建置與部署不需要 Python 或 Blender。

## 操作

- 拖曳環繞，滾輪／雙指縮放；俯仰與距離設有邊界，可回到全景。
- 點選場景物件或導覽開啟內容面板；桌機滑鼠移入時顯示物件提示。
- 入場動畫每次文件載入一次，可略過；直接連結與減少動態偏好會略過入場。
- 作品圖片可放大、切換、查看原尺寸及另開圖片；Escape 先關閉圖片，再關閉案例。
- EN／中切換會記住偏好並維持目前作品；首次預設英文。
- 音效預設靜音，提供品質設定與 WebGL 載入失敗的 HTML 內容入口。

分享連結範例：`/#/work/foxrag`、`/#/work/little-spirit`、`/#/photography`、`/#/education`。教育背景有獨立導覽，經歷頁只呈現實務經歷。專案子路徑形式為 `/repo/#/work/foxrag`，重新整理不需伺服器 rewrite。

## 內容與資源維護

| 位置 | 用途 |
| --- | --- |
| `src/data/content.ts` | 品牌名稱與副標、個人介紹、聯絡連結、場景入口與模型配置 |
| `src/data/portfolio.ts` | 案例內容、職責、經歷、教育、技能與獎項 |
| `src/data/video.ts` | 影音作品、轉播分類與活動紀錄 |
| `src/data/media.ts` | 圖片對應、替代文字、圖說與來源註記 |
| `src/data/media-assets.json` | 圖片路徑、縮圖與尺寸 |
| `src/MediaGallery.tsx` | 圖片展示、放大與鍵盤操作 |
| `public/images/portfolio/` | 網頁圖片與縮圖 |
| `public/models/` | 已準備的 GLB 模型 |
| `src/scene/Garage.ts` | 3D 場景、相機與互動 |

缺少對外連結時維持 `null` 或空陣列。已提供的履歷放在 `public/documents/chenshi-liu-resume.pdf`，由 `profile.resume` 指向，下載名稱為 `ChenShi Liu.pdf`。模型以公尺為單位、Y 向上；既有車輛車頭朝 -X。模型配置由 `placement` 統一設定。

圖片重建工具為 `scripts/prepare_portfolio_images.py`，需 Pillow 及本機原始素材。論文圖 22 僅接受已移除 Email 的版本；圖 38 為兩張介面內嵌組成的單一 SVG。一般建置直接使用公開資產，不依賴原始素材。相機模型可由 `python scripts/generate_camera.py` 重建。

`references/`、`local-only/`、`AGENTS.md`、`website-spec/` 與其他內部 Markdown 不納入 Git；根目錄 README 為對外技術說明。環境檔、憑證、快取、測試輸出與原始素材封存檔亦由 `.gitignore` 排除。

## GitHub Pages 部署

`.github/workflows/pages.yml` 僅接受手動 `workflow_dispatch`。推送程式不會自動部署，也不會改變倉庫可見性。

1. 在已可使用 Pages 的倉庫中，設定 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
2. 開啟 **Actions → Deploy garage to GitHub Pages → Run workflow**，選擇要部署的分支。
3. Workflow 執行 `npm ci`、型別檢查與建置，從 Pages 的 `base_path` 設定資源路徑，只上傳 `dist/`。
4. 完成後使用部署結果提供的網址。後續更新需再次手動執行 workflow。

預設 `base: './'` 支援相對資源。可自行驗證專案子路徑：

```powershell
$env:VITE_BASE_PATH = '/garage-test/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

## 驗證

```powershell
npm test
npm run test:production
```

Playwright 預設使用本機 Chrome，測試伺服器為 `127.0.0.1:4173`。可用 `PLAYWRIGHT_CHANNEL=msedge` 切換 Edge；使用套件版 Chromium 時，先執行 `npx playwright install chromium`，再設定 `PLAYWRIGHT_CHANNEL=chromium`。

測試涵蓋 GLB 載入、場景互動、轉場、作品連結、語言持久化、鍵盤、手機模擬、圖片與錯誤復原。正式產物檢查涵蓋根路徑、`/garage-test/`、重新整理與資產清單。`?debug=1` 提供唯讀 `window.__garage()` 診斷。

手機模擬不等同實體手機或 Safari 驗證。發布前應在目標裝置檢查觸控、閱讀及效能。
