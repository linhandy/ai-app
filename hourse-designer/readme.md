項目指令：開發「自建房設計大師」Web MVP
任務目標：
開發一個面向農村/城鎮用戶的自建房設計平台。用戶輸入土地參數與需求，系統自動生成帶有尺寸標註、連通性合理且具備造價估算的 UCD 風格平面圖。
1. 技術棧要求 (Tech Stack)
Framework: Next.js (App Router) + TypeScript
Auth: Clerk (用戶註冊與登錄)
Database: Supabase (存儲用戶設計方案、地塊參數)
Deployment: Vercel
Email: Resend (用於發送設計清單或 PDF 下載鏈接)
Graphics: HTML5 Canvas API (用於交互式 2D 平面圖渲染)
2. 核心功能與邏輯
參數輸入面板：
地塊：長度、寬度、朝向。
限制：層數（默認 ≤3 層，超出則觸發合規警告）、層高（默認 3.0-3.6m）。
需求：房間類型（客廳、臥室、廚房、農村特有的堂屋、神位位置）。
自動排布演算法 (Layout Solver)：
核心： 結合 矩形裝箱演算法 (Bin Packing) 與 連接圖 (Connectivity Graph)。
連接性約束： 廚房必須鄰近餐廳；主臥優先放置於南向；樓梯必須位於中心區域；衛生間避免正對大門（風水避雷）。
網格吸附 (Snap to Grid)： 牆體移動與房間調整需自動吸附至 0.1m 網格，確保尺寸精確。
視覺美學 (UI/UX)：
參考對象： Rayon.design。
配色方案： 背景色 #F3F4F6，牆體線條 #374151，尺寸標註使用細緻的深灰色線條與無襯線字體。
輸出細節： 標註每個房間的淨面積（㎡）與開間、進深尺寸。
3. 業務附加值 (Business Logic)
造價估算 (Cost Estimation)： 根據總建築面積與層數，實時計算「預計毛坯造價」與「預計裝修造價」（可配置單價，如 1800/㎡）。
合規性檢查 (Compliance Checker)：
層數警告：若用戶設定 >3 層，顯示「部分農村宅基地政策限制層數」。
採光警告：若房間無窗（位於內部），標記為紅框。
4. 第一階段開發任務 (Action Plan)
初始化項目： 設置 Next.js、Clerk 與 Tailwind 基礎。
開發 HouseLayoutEngine： 實現基於 Connectivity Graph 的佈局演算法。
Canvas 繪製層： 實現 UCD 風格渲染、尺寸標註與 Drag-and-Drop 交互（帶 Snap to Grid）。
數據流轉： 將生成的 Layout 數據序列化存儲至 Supabase。
請先從「佈局演算法與 Canvas 基礎渲染」開始，並展示一個能根據長寬生成 3 個基本房間（客廳、廚房、臥室）的 Demo 頁面。

CREATE TABLE house_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  design_data JSONB NOT NULL,
  land_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE design_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, title TEXT,
  input_params JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_floor INT DEFAULT 0, total_floors INT DEFAULT 1,
  progress INT DEFAULT 0, progress_msg TEXT,
  design_data JSONB, error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON design_jobs (status, created_at);


Claude Code 開發指令：從 2D 平面圖到 3D 實時預覽
任務目標：
在現有的自建房設計工具中，新增一個「3D 預覽」模式。當用戶點擊切換按鈕時，系統需將 2D Canvas 的座標數據轉換為 3D 模型，並在瀏覽器中實現類似貝殼 (Beike) 的三維展示效果。
新增技術棧：
3D 引擎: @react-three/fiber (R3F) + @react-three/drei (輔助工具庫)
物理渲染: Three.js 標準 PBR 材質 (MeshStandardMaterial)
核心開發邏輯 (Prompt)：
數據轉換層 (2D to 3D Parser)：
編寫一個轉換函數，將 2D 狀態中的牆體座標（JSON）轉換為 3D 空間中的長方體（BoxGeometry）。
牆體高度預設為 3.0m，厚度預設為 0.24m。
地面根據所有房間的外圍邊界自動生成一個大型平面（PlaneGeometry）。
3D 視圖組件 (Three.js Scene)：
相機控制： 使用 OrbitControls 實現旋轉、縮放與平移。初始視角設為 45 度鳥瞰（Isometric View）。
燈光設定： 添加 Environment（環境光）與一個隨相機移動的 DirectionalLight（平行光），以產生清晰的陰影與立體感。
配色與材質：
牆體：使用 #FFFFFF 或淺灰色，具有微弱的粗糙感。
地板：使用 #E5E7EB 淺灰色。
背景：延續 Rayon 視覺，背景設為 #F3F4F6。
交互切換 (Mode Switching)：
實現一個全局狀態（如 Zustand 或 React Context），控制 viewMode 在 2D 與 3D 之間切換。
當切換到 3D 時，自動計算所有模型的中心點，並將相機對焦（LookAt）至該中心。
UCD 風格細節：
在 3D 模式下，依然保留房間名稱標籤（可以使用 Html 組件從 @react-three/drei 實現），讓標籤懸浮在房間中央。
牆體邊緣加入細微的黑色輪廓線（Outline），增強建築圖紙的專業感。
請開始執行：
安裝必要的 3D 依賴包。
創建 ThreeScene.tsx 組件。
實現從 2D JSON 數據生成 3D 牆體網格（Mesh）的邏輯。
在主頁面添加一個切換按鈕，展示從平面佈局到 3D 空間的轉換效果。
