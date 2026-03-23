# Phase 1: CLI Video Pipeline

## 快速开始

### 1. 安装 FFmpeg（必须）

**Windows:**
```bash
# 推荐用 winget
winget install Gyan.FFmpeg

# 或者 chocolatey
choco install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

验证安装：`ffmpeg -version`

---

### 2. 安装 Node 依赖

```bash
cd phase1
npm install
```

### 3. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 Zenmux API Key：
```
ZENMUX_API_KEY=sk-xxxxxxxx
```

### 4. 添加测试图片

将 5-7 张房源 `.jpg` 或 `.png` 图片放入：
```
phase1/test-images/
```

建议使用高清横向图片（至少 1080x720）。

### 5. 运行

```bash
# 正式运行（会消耗 API 配额）
npm run generate

# 干跑测试（只检查结构，不调用 API）
npm test
```

---

## 输出文件

运行成功后，`output/` 目录会产生：

| 文件 | 说明 |
|------|------|
| `script.txt` | LLM 生成的口播文案 |
| `voiceover.mp3` | TTS 生成的配音 |
| `timestamps.json` | Whisper 提取的词级时间戳 |
| `test_output.mp4` | **最终视频** (9:16, 1080x1920) |

---

## 常见问题

**Q: FFmpeg 报错 `No such file or directory`**
A: 确保 `ffmpeg` 在系统 PATH 中，或在 `.env` 中设置 `FFMPEG_PATH=/path/to/ffmpeg`

**Q: 字体找不到（Windows）**
A: 脚本默认使用 `C:\Windows\Fonts\arialbd.ttf`（Arial Bold），这在 Windows 上通常存在。

**Q: API 返回 401**
A: 检查 `.env` 中的 `ZENMUX_API_KEY` 是否正确，以及 `ZENMUX_BASE_URL` 是否为 `https://zenmux.ai/api/v1`
