参考https://www.listing2video.com/，首页给出一个样例。

房源链接一键抓取 (Zillow 等)
**目标**：替代手动上传，用户只需粘贴 Zillow、Realtor.com 等平台链接，自动提取高清图片、价格、户型和描述。
*   **难点**：Zillow 有极强的防爬虫机制（如 Cloudflare 验证），自己写爬虫极易被封。
*   **推荐方案**：使用第三方现成 API（如 [RapidAPI](https://rapidapi.com/) 上的 `Zillow.com API`
*   **开发任务**：
    1.  前端新增 URL 输入框和 "Fetch Listing" 按钮。
    2.  后端实现 `/api/scrape` 接口，调用第三方服务获取图片数组和文本。
    3.  前端展示抓取结果，允许用户在生成前进行二次编辑/剔除不想要的图片。
	
Stripe 支付接入
**目标**：实现“先支付，后生成”的交易闭环。
*   **推荐方案**：**Stripe Checkout**（无需在自己网站处理信用卡信息，转化率高）。
*   **开发任务**：
    1.  后端实现 `/api/create-checkout-session`：创建订单，将会话金额设为 $9.9，并将抓取的房源数据或订单 ID 存入 session 的 `metadata` 中，返回支付链接。 测试阶段价格设置为$0.01
    2.  前端点击 "Generate Reel" 时调用该接口，并跳转到 Stripe 支付页。
    3.  后端实现 `/api/webhook`：监听 Stripe 的 `checkout.session.completed` 事件，确认收到钱款。

视频质量跃升 (AI Voiceover & 运镜)
**目标**：让视频看起来像专业剪辑，而不是简单的 PPT 轮播。
*   **开发任务**：
    1.  **脚本与配音**：利用 LLM 将长篇房源描述改写成 30-45 秒的吸睛短文案，然后调用 TTS 服务（如 OpenAI TTS 或 ElevenLabs）生成解说音频。
    2.  **动态效果**：利用 FFmpeg 或云端视频合成 API（如 Remotion、Creatomate），给静态图片加上缓慢放大/平移（Ken Burns Effect），并配上背景音乐。
	

构建 Next.js + Supabase 异步视频渲染闭环
我的项目基于 Next.js (App Router, 部署在 Vercel) 和 Supabase。
由于视频渲染时间超过 Vercel 的 Serverless 限制，我们需要实现一套基于数据库驱动的异步渲染架构。

请帮我编写以下三个核心部分的代码：

1. 前端与后端入口 (Next.js):
   - 编写一个 Server Action 或 API Route (/api/create-task)，接收用户的图片 URL 和文本，在 Supabase 的 `videos` 表中插入一条数据，状态设为 `pending`，并返回这条记录的 ID。
   - 编写一个 React 客户端组件：调用上述 API 后，获取到视频 ID。然后使用 `@supabase/supabase-js` 的 Realtime 功能（`supabase.channel`）订阅 `videos` 表中对应 ID 的这一行。当 `status` 变为 `completed` 时，展示视频的下载链接 `video_url`。

2. 数据库设计 (Supabase SQL):
   - 提供创建 `videos` 表的 SQL 语句，字段至少包含：id, user_id (可选), source_urls (jsonb), prompt, status (枚举: pending, processing, completed, failed), video_url, created_at。
   - 并给出开启 Supabase Realtime 的必要 SQL 语句。

3. 独立的后台 Worker 脚本 (Node.js):
   - 这个脚本将被部署在一台独立的 VPS 上，用 pm2 运行，不部署在 Vercel。
   - 请写一个 Node.js 脚本 (worker.js)。它启动后，使用 supabase-js 监听 `videos` 表的 INSERT 事件。
   - 监听到 `pending` 的任务后，先把该条状态改为 `processing`。
   - 然后编写一个 mock 的 async 渲染函数（例如等待 10 秒钟，模拟调用 OpenAI 和 FFmpeg）。
   - 渲染完成后，将生成的 mock 结果上传到 Supabase Storage (假设 bucket 名为 'reels')，拿到 public URL。
   - 最后更新该条 `videos` 记录，将状态改为 `completed`，并写入 `video_url`。

要求代码简洁现代，使用 TypeScript，并且包含完整的错误处理机制。

在让 AI 开始写代码前，你需要去注册并获取以下平台的 API Keys：
1.  **Stripe**：注册账号，获取测试环境的 `Publishable key`、`Secret key` 以及本地测试用的 `Webhook secret`。
2.  **抓取服务**：去 RapidAPI 注册并订阅一个 Zillow API（通常有免费测试额度）。
3.  **邮件服务**：注册 [Resend](https://resend.com/) 账号并获取 API Key（极客首选，每月免费 3000 封）。

基于以上信息，请引导我完成开发

问题：
1、首页的样例没有声音，
需要参考https://www.listing2video.com/ 从图片到视频的格式，拉取https://www.zillow.com/homedetails/2104-University-Club-Dr-Austin-TX-78732/70352429_zpid/ 作为样，优化一下左边是房屋原始图片，右边是视频，中间加一个箭头。2、首次还是走了付费逻辑，逻辑不对，首次需要免费，请修改实现 3、帮我补充一个服務條款 (ToS) 和 隱私政策 (Privacy Policy) 頁面

针对你的房产 AI 视频出海项目，最丝滑的支付基建配置如下：
认证系统：Clerk（直接搞定 Google 登录）。
收款系统：Lemon Squeezy（以中国个人身份注册，他们处理全球税务，老外刷信用卡）。
资金中转：Payoneer (派安盈) （用他们提供的虚拟美国账户收 Lemon Squeezy 的钱）。
支付算力：申请 Payoneer 万事达卡 或注册 WildCard 虚拟卡，用里面的美元余额直接购买国外的高昂 AI API。
这套体系全是在国内用身份证/护照就能搞定的，合规、安全、而且闭环完整！
