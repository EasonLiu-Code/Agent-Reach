# 社交媒体 & 社区

小红书、Twitter/X、B站、V2EX、Reddit、Facebook、Instagram。

## 小红书 / XiaoHongShu（多后端）

小红书有三个后端，**先跑 `agent-reach doctor --json` 看 xiaohongshu 的 `active_backend` 是哪个**，再用对应命令组。

### 后端 A：OpenCLI（桌面首选，复用浏览器登录态）

```bash
# 搜索笔记
opencli xiaohongshu search "query" -f yaml

# 读笔记正文+互动数据（用搜索结果里的完整 URL，含 xsec_token）
opencli xiaohongshu note "NOTE_URL" -f yaml

# 评论（支持楼中楼）
opencli xiaohongshu comments NOTE_ID -f yaml

# 首页推荐 feed
opencli xiaohongshu feed -f yaml

# 用户主页公开笔记
opencli xiaohongshu user USER_ID -f yaml
```

> 要求 Chrome 打开且装了 OpenCLI 扩展。报 AUTH_REQUIRED 说明浏览器里没登录小红书，让用户在 Chrome 里登录一次即可。

### 后端 B：xiaohongshu-mcp（服务器场景）

```bash
# 未登录时：先查状态，再取二维码给用户扫
mcporter call 'xiaohongshu.check_login_status()' --timeout 120000
mcporter call 'xiaohongshu.get_login_qrcode()' --timeout 120000

# 搜索
mcporter call 'xiaohongshu.search_feeds(keyword: "query")' --timeout 120000

# 笔记详情+评论（feed_id 和 xsec_token 从搜索结果取）
mcporter call 'xiaohongshu.get_feed_detail(feed_id: "...", xsec_token: "...")' --timeout 120000
```

> 首次调用会自动下载约 150MB 无头浏览器，务必带 `--timeout 120000`。未登录时 search 会挂死，先 check_login_status。

### 后端 C：xhs-cli（存量备选，上游 2026-03 起停更）

```bash
xhs search "query"          # 搜索
xhs read NOTE_ID_OR_URL     # 读笔记（必须用搜索结果中的 URL/ID，不能裸 note_id）
xhs comments NOTE_ID_OR_URL # 评论
xhs hot                     # 热门
xhs feed                    # 推荐
```

> 已知不稳定：`xhs user` / `xhs user-posts` / `xhs favorites` 可能返回 API error（上游停更无人修）。新装用户建议直接走后端 A/B。

### 通用注意事项

> **xsec_token 限制**: 小红书强制 xsec_token 机制，**不能直接用裸 note_id 去读**。正确流程：先搜索/feed 拿结果，再用结果中的完整 URL/ID 去读。三个后端都一样。
>
> **频率控制**: 高频请求（批量搜索、深翻评论）会触发验证码，平台限制无法绕过。每次操作间隔 2-3 秒。
>
> **写操作（发帖/评论/点赞）**: 建议只读。xhs-cli v0.6.x 写操作可能因签名问题返回 406。

## Twitter/X（多后端）

Twitter/X 有多个后端，**先跑 `agent-reach doctor --json` 看 twitter 的
`active_backend` 是哪个**，再用对应命令组。

### 后端 A：X MCP（mcporter，优先）

如果用户已把 X/Twitter MCP 接到 mcporter，doctor 会显示
`active_backend: "X MCP (mcporter)"`。MCP server 名通常配置为 `twitter`
或 `x`，工具名以实际 server 暴露的 schema 为准。

```bash
# 查看已配置的 MCP server 名
mcporter config list

# 调用示例：把 <tool> / 参数替换成该 X MCP server 暴露的真实工具
mcporter call 'twitter.<tool>(...)'
mcporter call 'x.<tool>(...)'
```

> 不要硬猜工具名。先看 `mcporter config list` 和 MCP server 文档/工具列表；
> 一旦确认 schema，再用 `mcporter call 'server.tool(...)'` 调用。

#### 配置 XActions 作为 X MCP server（推荐方案）

[XActions](https://github.com/nirholas/XActions) 是 140+ 工具的开源 X/Twitter MCP server，**零 Twitter API Key**，只需浏览器登录态的 `auth_token` cookie。适合所有用户开箱即用。

**Step 1：获取 auth_token cookie**

三种方式任选其一：

| 方式 | 步骤 | 适用 |
|---|---|---|
| **A. Cookie-Editor 扩展**（推荐） | 1. 装 [Cookie-Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) Chrome 扩展<br>2. Chrome 访问 https://x.com 并登录<br>3. 点扩展图标 → 找 `auth_token` 行 → Export → Header String | 桌面用户 |
| **B. DevTools 手动复制** | 1. Chrome 打开 https://x.com（已登录）<br>2. `Cmd+Option+I` 打开 DevTools<br>3. `Application` → `Cookies` → `https://x.com`<br>4. 双击 `auth_token` 的 Value 列，全选复制 | 桌面用户，不想装扩展 |
| **C. xactions CLI 交互登录** | `npx xactions login` 按提示操作 | 任意环境 |

> ⚠️ `auth_token` 等同于账号密码，泄露后他人可完全控制你的 Twitter 账号。建议用小号。

**Step 2：注册到 mcporter**

```bash
mcporter config add twitter \
  --command npx \
  --arg "-y" \
  --arg "xactions-mcp" \
  --env XACTIONS_SESSION_COOKIE=你的auth_token值 \
  --transport stdio
```

**Step 3：验证 agent-reach 识别到 X MCP 后端**

```bash
agent-reach doctor | grep -A1 "Twitter"
# 预期：✅ Twitter/X 推文 — X MCP (mcporter) 可用（当前后端：X MCP (mcporter)）

mcporter config list
# 预期：显示 twitter server
```

**Step 4：调用**

```bash
# 搜推文
mcporter call 'twitter.x_search_tweets(query: "AI agent", count: 5)'

# 看 profile
mcporter call 'twitter.x_get_profile(username: "elonmusk")'

# 拉用户最近推文
mcporter call 'twitter.x_get_tweets(username: "elonmusk", limit: 20)'

# 展开完整推文串
mcporter call 'twitter.x_get_thread(tweet_url: "https://x.com/...")'
```

> **可选：AI 工具**（如 `x_analyze_voice` / `x_generate_tweet` / `x_summarize_thread`）需要额外配 `OPENROUTER_API_KEY`：
> ```bash
> mcporter config remove twitter   # 删旧配置
> mcporter config add twitter \
>   --command npx --arg "-y" --arg "xactions-mcp" \
>   --env XACTIONS_SESSION_COOKIE=你的auth_token \
>   --env OPENROUTER_API_KEY=你的openrouter_key \
>   --transport stdio
> ```
> 免费 OpenRouter Key：https://openrouter.ai

> **故障排查**：
> - `npx xactions-mcp` 404 → 改用 `npx -p xactions xactions-mcp`
> - 工具列表为空 → 确认 Node.js 18+：`node --version`
> - 操作类工具（post/follow/like）失败 → 检查 `XACTIONS_SESSION_COOKIE` 是否正确
> - 想换账号 → `mcporter config remove twitter` 后重新 Step 2

> **完整工具列表**：https://github.com/nirholas/XActions#available-tools

### 后端 B：twitter-cli

### 稳定命令

```bash
# 首页时间线（最稳定）
twitter feed -n 20

# 读取单条推文（含回复）
twitter tweet URL_OR_ID

# 读取长文 / X Article
twitter article URL_OR_ID

# 用户时间线
twitter user-posts @username -n 20

# 用户资料
twitter user @username
```

### 可能不稳定的命令

```bash
# 搜索推文（Twitter 频繁改 GraphQL 端点，可能 404）
twitter search "query" -n 10

# likes（2024 年后只能看自己的，平台限制）
twitter likes
```

### search 失败时的重试链（按序执行，成功即停）

1. 如果 doctor 显示 X MCP 可用，优先改走 X MCP 对应搜索工具
2. 直接重试一次（偶发失败常见）：`twitter search "query" -n 10`
3. 升级后再试：`pipx upgrade twitter-cli && twitter search "query" -n 10`
4. 换 OpenCLI 备选（桌面，复用浏览器登录态）：`opencli twitter search "query" -f yaml`
5. 都不行就改用 `twitter feed` / `twitter user-posts @somebody` 等稳定命令绕路

### 重要注意事项

> **安装**: `pipx install twitter-cli`（确保 v0.8.5+）
>
> **认证**: 推荐用 Cookie-Editor 导出后设置环境变量 `TWITTER_AUTH_TOKEN` + `TWITTER_CT0`。自动提取在 SSH/Docker/无头环境不可用。
>
> **IP 风控**: 不要在 VPS/数据中心 IP 上频繁调用，尤其是 followers/following，有封号风险。使用住宅代理或本地环境。
>
> **OpenCLI 备选**: 桌面装了 OpenCLI 的话，`opencli twitter search/article/user-posts -f yaml` 全套可用（浏览器登录态，无需 cookie 环境变量）。
>
> **输出格式**: 建议用 `--yaml` 或 `--json` 获得结构化输出，对 AI agent 更友好。

## B站 / Bilibili

> ⚠️ **不要用 yt-dlp 读 B站**（风控已全面 412 拦截，实测无解）。用 bili-cli / OpenCLI。

```bash
# 搜索 / 热门 / 视频详情（bili-cli，只读无需登录）
bili search "query" --type video -n 5
bili hot -n 10
bili video BVxxx

# 字幕（OpenCLI，需桌面 Chrome）
opencli bilibili subtitle BVxxx
```

> 详细命令（音频转写、API 直连兜底）见 [references/video.md](video.md)。

## V2EX (公开 API)

无需认证，直接调用公开 API。

### 热门主题

```bash
curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"
```

### 节点主题

```bash
# node_name 如: python, tech, jobs, qna, programmers
curl -s "https://www.v2ex.com/api/topics/show.json?node_name=python&page=1" -H "User-Agent: agent-reach/1.0"
```

### 主题详情

```bash
# topic_id 从 URL 获取，如 https://www.v2ex.com/t/1234567
curl -s "https://www.v2ex.com/api/topics/show.json?id=TOPIC_ID" -H "User-Agent: agent-reach/1.0"
```

### 主题回复

```bash
curl -s "https://www.v2ex.com/api/replies/show.json?topic_id=TOPIC_ID&page=1" -H "User-Agent: agent-reach/1.0"
```

### 用户信息

```bash
curl -s "https://www.v2ex.com/api/members/show.json?username=USERNAME" -H "User-Agent: agent-reach/1.0"
```

### Python 调用示例

```python
from agent_reach.channels.v2ex import V2EXChannel

ch = V2EXChannel()

# 获取热门帖子
topics = ch.get_hot_topics(limit=10)
for t in topics:
    print(f"[{t['node_title']}] {t['title']} ({t['replies']} 回复)")

# 获取节点帖子
node_topics = ch.get_node_topics("python", limit=5)

# 获取帖子详情 + 回复
topic = ch.get_topic(1234567)
print(topic["title"], "—", topic["author"])

# 获取用户信息
user = ch.get_user("Livid")
```

> **节点列表**: https://www.v2ex.com/planes

## Reddit（多后端，必须登录态）

**Reddit 没有零配置路径**：匿名 `.json` 端点已被封（403），官方 API 自 2025-11 起人工审批基本不批。两个后端都靠登录态，先跑 `agent-reach doctor --json` 看 reddit 的 `active_backend`。中国大陆访问需代理。

### 后端 A：OpenCLI（桌面首选，复用浏览器登录态）

```bash
# 搜索帖子
opencli reddit search "query" -f yaml

# 读帖子全文 + 评论
opencli reddit read POST_ID -f yaml

# 浏览 subreddit / 热门 / Popular
opencli reddit subreddit LocalLLaMA -f yaml
opencli reddit hot -f yaml
opencli reddit popular -f yaml

# subreddit 元信息（订阅数、简介）
opencli reddit subreddit-info LocalLLaMA -f yaml
```

> 要求 Chrome 打开且浏览器里登录过 reddit.com。

### 后端 B：rdt-cli（存量/服务器备选，上游 2026-03 起停更）

```bash
rdt search "query" --limit 10   # 搜索帖子
rdt read POST_ID                # 读帖子全文 + 评论
rdt sub python --limit 20       # 浏览 subreddit
rdt popular --limit 10          # 浏览热门
rdt all --limit 10              # 浏览 /r/all
```

> **安装**: `pipx install 'git+https://github.com/public-clis/rdt-cli.git'`（PyPI 版本落后，需从 GitHub 装 v0.4.2+）。先 `rdt login` 才能搜索和阅读（服务器无浏览器时手动写 Cookie，见 doctor 提示）。
> 建议使用 `--yaml` 输出，对 AI agent 更友好。

### 高级选项：官方 API + PRAW（仅限已有凭证的用户）

2025-11 前注册过 Reddit script app（持有 client_id/client_secret）的用户可以用 PRAW 走官方 API（100 QPM 免费）。新申请需人工审批且个人项目基本不批，**不要推荐新用户走这条路**。

## Facebook（OpenCLI，必须登录态）

Facebook 走 OpenCLI，复用用户 Chrome 里的 facebook.com 登录态。先跑 `agent-reach doctor --json` 看 facebook 的 `active_backend`，正常应为 `OpenCLI`。不要推荐 Jina/Exa/Graph API 作为默认路径。

```bash
# 搜索用户 / 主页 / 帖子
opencli facebook search "query" -f yaml

# 用户或主页信息
opencli facebook profile zuck -f yaml

# 当前账号 News Feed
opencli facebook feed --limit 10 -f yaml

# 当前账号可见的群组列表/最近动态
opencli facebook groups --limit 20 -f yaml
```

> 要求 Chrome 打开且装了 OpenCLI 扩展，并已登录 facebook.com。Facebook Groups 当前只承诺读取当前账号可见的群组列表/最近动态，不承诺任意群帖子和评论 API。

## Instagram（OpenCLI，必须登录态）

Instagram 走 OpenCLI，复用用户 Chrome 里的 instagram.com 登录态。先跑 `agent-reach doctor --json` 看 instagram 的 `active_backend`，正常应为 `OpenCLI`。不要默认恢复 instaloader；历史上 cookies/401/429 不稳定。

```bash
# 搜索用户（不是全站帖子关键词搜索）
opencli instagram search "query" -f yaml

# 用户 Profile
opencli instagram profile nasa -f yaml

# 用户最近帖子
opencli instagram user nasa --limit 12 -f yaml

# Explore / Discover
opencli instagram explore --limit 20 -f yaml

# 当前账号收藏
opencli instagram saved --limit 20 -f yaml
```

> 要求 Chrome 打开且装了 OpenCLI 扩展，并已登录 instagram.com。`instagram search` 是用户搜索；读帖子需要先确定 username，再用 `instagram user USERNAME`。若出现 429 / login required，先让用户在 Chrome 里重新登录并降低频率。
