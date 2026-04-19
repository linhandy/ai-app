# Vercel 部署故障排查指南

## 问题场景：部署显示成功，但网站返回 404

当 Vercel 部署显示 "Ready"，但访问网站返回 404 "The page could not be found"。

## 根本原因诊断

### 症状检查清单
- [ ] 部署日志显示构建成功（页面生成、构建完成）
- [ ] Vercel API 显示 `"output": []`（输出为空）
- [ ] 所有地址都返回 404（别名、deployment URL、vercel.app URL）
- [ ] 构建时间显示 0ms（表示构建被跳过）

### 真实根本原因
**Vercel 项目配置（settings）与 vercel.json 文件不同步**

Vercel 项目的配置存储在 Vercel 服务器上，不是从 vercel.json 动态读取。即使 vercel.json 有正确的配置，如果 Vercel 项目的 settings 没有对应的值，部署会失败。

验证方法：
```bash
npx vercel inspect <deployment-id> --json | grep -A 10 '"config"'
```

查看是否包含：
```json
"buildCommand": null,
"outputDirectory": null,
"framework": null
```

## 修复步骤

### 第 1 步：确保 vercel.json 存在且配置正确

**对于 Next.js 子目录项目**（在 `ai-room-designer/vercel.json`）：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**关键点**：
- `buildCommand` 和 `outputDirectory` 使用相对路径（相对于项目目录）
- **必须包含 `"framework": "nextjs"`**（这是关键！）
- 不要使用 `--prefix` 标志（除非在根目录 monorepo 配置中）

### 第 2 步：重置 Vercel 项目链接

Vercel 项目可能缓存了旧的 null 配置。强制重新初始化：

```bash
rm -rf .vercel
npx vercel link --yes
```

**注意**：这可能会链接到错误的项目。检查并修正：
```bash
cat .vercel/project.json
# 编辑以确保 projectId 正确
```

### 第 3 步：重新部署

```bash
npx vercel deploy --prod
```

### 第 4 步：验证配置被读取

部署完成后，检查 Vercel 是否读取了 buildCommand：

```bash
npx vercel inspect <deployment-id> --json | grep -B 2 -A 2 '"buildCommand"'
```

应该显示：
```json
"buildCommand": "npm run build",
"outputDirectory": ".next",
"framework": "nextjs"
```

## 常见错误和修复

| 问题 | 症状 | 修复 |
|------|------|------|
| 缺少 `framework` 配置 | output 为空，404 | 添加 `"framework": "nextjs"` |
| 使用错误的 --prefix 标志 | npm install 失败 | 移除 --prefix，使用相对路径 |
| buildCommand 为 null | 构建时间 0ms | 删除 .vercel，重新 link |
| outputDirectory 不正确 | output 为空 | 确保路径相对于项目根目录 |
| Vercel 项目链接错误 | 链接到国内版本 | 编辑 .vercel/project.json 的 projectId |

## Monorepo 配置示例

**根目录 vercel.json**（用于整个 monorepo）：
```json
{
  "buildCommand": "npm install --prefix ai-room-designer && npm run build --prefix ai-room-designer",
  "outputDirectory": "ai-room-designer/.next",
  "installCommand": "npm install --prefix ai-room-designer"
}
```

**子目录 ai-room-designer/vercel.json**（直接部署该目录）：
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## 调试日志收集

如果问题仍未解决，收集以下信息：

```bash
# 1. 检查部署配置
npx vercel inspect <deployment-id> --json > deploy_config.json

# 2. 检查项目配置
npx vercel link --yes
cat .vercel/project.json > project_config.json

# 3. 检查 vercel.json
cat vercel.json

# 4. 检查构建日志（如果可用）
npx vercel logs <deployment-url>
```

## 预防措施

1. **提交 vercel.json 到 Git**
   - 将 vercel.json 加入版本控制
   - 避免本地配置漂移

2. **定期验证部署**
   - 每次部署后检查配置被读取
   - 不要假设部署"Ready"意味着成功

3. **保持 .vercel 目录更新**
   - 定期运行 `npx vercel pull` 同步配置
   - 不要手动编辑 .vercel/project.json（除非链接错误）

## 相关资源

- [Vercel Build Configuration](https://vercel.com/docs/projects/project-configuration)
- [Next.js Deployment](https://nextjs.org/docs/deployment/vercel)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
