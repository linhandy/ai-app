# 手机浏览器"疑似含有风险内容"警告排查手册

**问题：** 部分手机浏览器（Chrome Android / 微信内置 / 夸克 / UC）访问 `https://www.roomai.shop` 时显示"此网站疑似含有风险内容"。

## 诊断步骤（按顺序执行）

### 1. 确认警告来源

不同浏览器警告来源不同，先抓截图确认：

- **Chrome for Android** → Google Safe Browsing
- **微信内置浏览器** → 腾讯安全云
- **夸克/UC/百度浏览器** → 各自的风险库
- **Firefox** → Mozilla Phishing Protection

### 2. 查询 Google Safe Browsing 状态

访问：https://transparencyreport.google.com/safe-browsing/search?url=roomai.shop

- 若显示"Unsafe" → 提交申诉：https://safebrowsing.google.com/safebrowsing/report_error/
- 申诉通常 1-3 天复查

### 3. 查询腾讯安全（微信）

访问：https://guanjia.qq.com/online_server/url_desc.html

- 输入 `roomai.shop` 查询
- 若被拦截 → 提交申诉：https://urlsec.qq.com/complain.html

### 4. SSL/TLS 配置检测

`https://www.ssllabs.com/ssltest/analyze.html?d=roomai.shop`

目标：A 级以上。常见扣分点：
- TLS 1.0/1.1 启用 → Cloudflare 后台关闭
- 证书链不完整 → 检查中间证书
- HSTS 未启用 → 已在 `next.config.mjs` 配置，确认生效

### 5. 域名信誉检查

- `.shop` 顶级域名本身信誉较低（被大量低质电商、钓鱼站使用），新注册域名更容易误报
- 建议：**长期备选 `.com` 主域名**，`.shop` 作为营销短链

### 6. 内容与 SEO 检查

检查页面是否出现以下红旗：
- 外链到不受信任域名（抽样检查 Social Proof 组件的链接）
- 第三方脚本（Google Analytics / Stripe / ZenMux 域名）是否都在 CSP 白名单
- 图片/视频链接是否全走 HTTPS

### 7. CSP 头收紧

当前 `next.config.mjs` 包含 `'unsafe-inline'` 和 `'unsafe-eval'`，这会触发部分安全扫描器的低信誉评分。

**优化方向（独立 PR 做）：**
- Next.js App Router 原生支持 nonce-based CSP
- 移除 `'unsafe-inline'`，改用 `<Script>` 加 nonce
- 评估影响：Stripe / GA 需 nonce，其他第三方脚本需同步升级

## 快速缓解（不改代码）

1. 在 Cloudflare 启用 **Bot Fight Mode**（减少被误标为"异常流量源"概率）
2. 提交 Google Search Console 的 "Request Review"
3. 为 `roomai.shop` 配置 SPF / DKIM / DMARC（邮件信誉影响域名信誉）
4. 在站点主页加 `ads.txt`（空文件即可）和清晰的 `robots.txt`
5. 确保 `privacy` 和 `terms` 页面已存在且内容真实（已有，但确认可访问）

## 中期方案

- 注册 `roomai.com` 或 `roomai.ai` 作为主域名，用 301 从 `.shop` 迁移
- 参考 **Google Search Console + Bing Webmaster Tools** 验证域名，持续曝光提升信誉
- 接入 **Sectigo/DigiCert EV 证书**（Cloudflare 默认是 DV，EV 可提升浏览器地址栏识别）

## 操作 Checklist

- [ ] 抓取警告截图（Chrome Android + 微信 + Safari iOS）
- [ ] 查询 Google Safe Browsing
- [ ] 查询腾讯安全
- [ ] SSL Labs 测试并截图
- [ ] 若 Google 标黑 → 提交申诉（附隐私政策页 URL + 合法运营证明）
- [ ] 若微信标黑 → 提交申诉
- [ ] 评估是否启动 `.com` 主域名迁移
