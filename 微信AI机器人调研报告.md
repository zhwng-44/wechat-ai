# 把大模型接入微信做聊天机器人：开源项目调研报告

**调研日期：2026-10-06**（所有 star 数 / 最后提交时间为该日快照）
**调研方式**：GitHub REST API（api.github.com，读取 star / pushed_at / archived / license / topics）+ 腾讯官方文档（developers.weixin.qq.com、work.weixin.qq.com）+ 各项目官方文档站。
**沙箱限制说明**：本机 `github.com` HTML 与 `raw.githubusercontent.com` 直连被拦截，README 原文通过 GitHub API contents（base64）与 `ghproxy.net` 镜像读取；PowerShell 无外网。已尽量交叉验证，凡未验证的一律标注「需自行确认」。

---

## 0. 三个「计划变更级」发现（先看这个）

1. **`zhayujie/chatgpt-on-wechat` 已改名为 `zhayujie/CowAgent`。**
   调用 `/repos/zhayujie/chatgpt-on-wechat` 返回 `full_name = zhayujie/CowAgent`，旧 URL 自动 301。仓库 README 内有明确的 “Project Renaming Notice”。项目定位也从「微信聊天机器人」扩成了通用 Agent Harness。文档站 `docs.cowagent.ai`。

2. **CoW 的「个人微信」通道已经不再用 itchat / wechaty。**
   当前代码是自研客户端（`channel/weixin/weixin_api.py`、`weixin_channel.py`），文档称「基于官方接口」，扫码登录后会话里会出现一个叫 **微信ClawBot** 的机器人助手，要求**微信客户端 ≥ 8.0.69**，凭证存 `~/.weixin_cow_credentials.json`。`requirements.txt` / `requirements-optional.txt` 里**没有** itchat 或 wechaty。任何教你「CoW + itchat 接个人微信」的教程讲的都是旧的 1.x 版本。

3. **第三方个人微信协议生态已经塌了。**
   - `Devo919/Gewechat` README 首行即「**本项目已停止维护**」，Docker 镜像/部署方式/技术支持全部不再提供，并链接了微信的《针对违规获取及利用微信终端用户数据的打击公告》。
   - `danni-cool/wechatbot-webhook`（基于 wechaty）已被 GitHub **archive**，最后提交 2024-12-01。
   - 有社区帖标题直指后果：「继 gewechat 停止维护后，astrbot 陷入无微信可接入的囧境」。

---

## 1. 项目逐一档案

### 1.1 zhayujie/CowAgent（原 chatgpt-on-wechat / CoW）★ 最知名

| 项 | 内容 |
|---|---|
| 仓库 | **https://github.com/zhayujie/CowAgent**（旧地址 https://github.com/zhayujie/chatgpt-on-wechat 自动 301 跳转） |
| Star / Fork | **47,246** / 10,375 |
| 维护状态 | **活跃**，最后 push **2026-10-06**（当天），最新版本 v2.2.0（2026-09-30） |
| 技术栈 | Python，MIT |
| 文档 | https://docs.cowagent.ai/zh/ |

**支持的接入通道**（来自 `docs.cowagent.ai/zh/channels` 能力矩阵 + 各通道页）

| 通道 | 合规性 | 备注 |
|---|---|---|
| Web 控制台 | ✅ 官方/自建 | 默认开启，`http://localhost:9899` |
| **微信公众号（订阅号）** | ✅ **官方合规** | 个人可申请；仅被动回复 |
| **微信公众号（服务号）** | ✅ **官方合规** | 需微信认证 + 客服接口权限，可主动推送 |
| **企业微信自建应用** | ✅ **官方合规** | 端口 9898，路径 `/wxcomapp` |
| **微信客服** | ✅ **官方合规** | 端口 9888，路径 `/wxkf/` |
| 企微智能机器人 | ✅ 官方合规 | 支持群聊、流式 |
| 飞书 / 钉钉 | ✅ 官方合规 | 支持群聊 |
| QQ 机器人 | ✅ 官方开放平台 | |
| Telegram / Slack / Discord | ✅ 官方 | 无需公网 IP（长连接/Socket Mode） |
| **微信（个人微信）** | ⚠️ **「基于官方接口」——需自行确认** | 扫码登录、ClawBot、微信 ≥8.0.69；**仅单聊，无群聊**。项目自称「通过微信官方API进行接入，无安全风险」，但我**没有找到腾讯官方文档对这套机制的背书** → 建议自行核实 |

**功能**：人设（工作空间「智能体设定」+ 多 Agent 各自角色）、**长期记忆**（三层：上下文→天级→`MEMORY.md`，夜间 Deep Dream 蒸馏）、个人知识库（Markdown wiki + 知识图谱）、多轮上下文（`agent_max_context_turns: 30`、`agent_max_context_tokens: 64000`）、语音/图片/文件（收发，语音识别可走模型厂商 ASR）、插件（Skills 系统 + Skill Hub + **MCP**）、定时任务、浏览器操作、自主进化。

**模型**：**DeepSeek 是默认模型**。`config-template.json` 里 `"model": "deepseek-flash"`，支持 `deepseek-flash`（V4.1 Flash，原生多模态）/ `deepseek-v4-flash` / `deepseek-v4-pro`，支持思考模式 `enable_thinking` 与 `reasoning_effort`。另有 Claude、GPT、Gemini、Qwen、GLM、Kimi、MiniMax、豆包、文心、MiMo、LinkAI，以及任意 OpenAI 兼容自定义接口。

**部署难度**：一行安装脚本（Linux/macOS/Windows PowerShell）、Docker Compose、桌面客户端。
- 本地跑（Web/桌面）：**不需要服务器**。
- **公众号 / 微信客服 / 企微：仅支持服务器或 Docker，不支持本地运行**；需要公网可达 + 开放端口。
- 公众号：监听 **80 端口**，回调 URL 填 `http://{HOST}/wx`，文档说 `{HOST}` **可以是服务器 IP 或域名**（即不强制域名）。
- 微信客服 / 认证企微：文档明确「认证企业微信需要配置与主体一致的**备案域名**」。
- 需额外装扩展依赖：`pip3 install -r requirements-optional.txt`。

**前置条件 / 花钱**：个人主体只能申请订阅号（免费）；企业服务号需微信认证（付费）；微信客服需「注册并**已认证**的企业微信」。

---

### 1.2 nezhafan/wechat-ai ★ 已过时

| 项 | 内容 |
|---|---|
| 仓库 | https://github.com/nezhafan/wechat-ai |
| Star / Fork | **185** / 70 |
| 维护状态 | **基本停更**。最后 push 2025-10-08（仅改 README）；无 LICENSE |
| 技术栈 | Go，单二进制 |

**README 第一行就自我否定**：「微信公众号已经提供了智能回复功能，此项目最开始为 GPT-3.5 刚出的时候写的，**已经过时**。」

**通道**：只有 **微信公众号（被动回复）**。不支持个人微信、不支持企微。

**技术栈 / 部署**：下载 Releases 二进制 + `config.yaml` 同目录直接跑（`nohup`），**无需 Docker、无需数据库**（用 `chat/` 下 JSON 文件存上下文）。需要一台有公网 IP 的服务器，监听 80 端口，回调填 `http://服务器IP/wx`，**明文传输**。

**模型**：阿里百炼、火山方舟、DeepSeek。**支持 DeepSeek 但明确不推荐**——README 原话：「DeepSeek (不推荐，没有小模型，速度比较慢。非要使用可以用阿里或者字节的 deepseek 大模型)」，可用模型 `deepseek-reason (R1)`、`deepseek-chat (V3)`。

**功能**：人物预设（人设）✅、参数调节（滑动记录聊天次数、单次回复长度预估、温度）✅、上下文 ✅（JSON 文件记录，**需自己定期删除**）、**语音 ❌**（README 指出公众号已取消语音消息转文字能力）、图片 未提及、插件 ❌、长期记忆 ❌（只有原始上下文文件）。

**它把公众号的痛点写得很清楚**（很好的佐证材料）：
> 「微信限制，只能一问一答且15秒超时限制，如果15秒内不返回结果则无法主动推送。所以建议使用速度较快的模型。」
> 「优化微信被动回复超时问题。(微信是每次5秒，询问3次，即最大15秒)」

---

### 1.3 企业微信相关的 AI 机器人项目

#### (a) whyiyhw/chatgpt-wechat —— 「通过企业微信中转到微信，无封号风险」

| 项 | 内容 |
|---|---|
| 仓库 | https://github.com/whyiyhw/chatgpt-wechat |
| Star / Fork | **1,172** / 216 |
| 维护状态 | 活跃偏慢：最后 push **2026-05-20** |
| 技术栈 | Go + Docker Compose（redis / pgsql / milvus），Apache-2.0 |

**通道**：企业微信自建应用、**企业微信客服**（`doc/custom_support_service.md`，README 称「支持了最新的企业微信客服协议」）、web bot（可发布到客服）。全部是**官方合规接口**。它的卖点就是「可在微信**安全使用（通过企业微信中转到微信，无封号风险）**」——即用企微「微信插件」让个人微信用户扫码后与企微应用对话。

**模型**：OpenAI/Azure OpenAI、gpt-4o，支持 one-api 自定义模型名；仓库 topics 含 `deepseek`、`dify`。是否内置原生 DeepSeek 适配**需自行确认**。

**功能**：场景模式/预定义上百种 `prompt` 角色模板（人设）✅、连续对话 + 自适应上下文 ✅、多会话切换 + 导出 ✅、流式分段响应 ✅、多国语音消息 ✅、图片消息 ✅、stable diffusion 1.5 / OpenAI 作图 ✅、milvus 私有向量知识库 ✅、插件机制（shell / search / wikipedia）✅。**长期记忆标注为「规划中」**。

**部署**：Docker Compose 全套，需要服务器 + 公网 IP + 企业可信 IP 配置；国内服务器需自备代理访问 OpenAI。

#### (b) YanHaidao/wecom

https://github.com/YanHaidao/wecom —— **288** star，TypeScript，ISC，最后 push **2026-09-02**。定位「企业微信 AI 机器人、大模型接入、流式响应、智能体网关、企微自建应用」。（README 未细读，功能细节需自行确认。）

#### (c) 小结

企业微信路线是**个人/小团队想「在微信里用 AI 又不想冒封号风险」的正解**：注册一个企业微信（未认证也可），建自建应用，再通过「我的企业 → 微信插件」分享二维码给个人微信扫码关注，个人微信用户即可与 Bot 对话。CowAgent、LangBot、AstrBot、chatgpt-wechat 都支持这条路。

---

### 1.4 langbot-app/LangBot（原 RockChinQ/LangBot）★ 注意仓库已迁移

| 项 | 内容 |
|---|---|
| 仓库 | **https://github.com/langbot-app/LangBot** ⚠️ 旧的 `RockChinQ/LangBot` 现在只是 **fork（56 star）**，网上老文章引用的 star 数对应的是迁移前的仓库 |
| Star / Fork | **18,027** / 1,625 |
| 维护状态 | **活跃**，最后 push **2026-10-03** |
| 技术栈 | Python 3.10–3.13，Apache-2.0，Web 管理面板 |
| 文档 | https://langbot.app/docs/zh/ |

**通道**（https://langbot.app/docs/zh/usage/platforms/readme）

| 通道 | 合规性 |
|---|---|
| 个人微信助手（OpenClaw 适配器） | ✅ 文档称「微信官方个人助手机器人」；扫码，微信 ≥8.0.69，手机端提示「将新的 OpenClaw 连接到微信」，同样落到 ClawBot 会话 |
| 个人微信（WeChatPadPro） | ❌ **第三方 hack**。文档顶部警告：「异地警告，没有 Socks5 代理或者本地服务器慎用！！！！！！」 |
| 企业微信（内部应用） | ✅ 官方合规 |
| 企业微信客服 | ✅ 官方合规，但**文档明确写「部署企业微信客服号需要企业资质」** |
| 企业微信智能机器人 | ✅ 官方合规，支持流式 |
| 微信公众号 | ✅ 官方合规；**「微信公众号需要公网域名和 HTTPS」** |
| QQ 官方 / OneBot v11 / 飞书 / 钉钉 / Discord / Telegram / Slack / LINE / KOOK / Mattermost / Satori / Matrix / Email / 网页机器人 | ✅ |

**模型**：DeepSeek ✅，后端用 **LiteLLM**，因此任何 OpenAI / Anthropic 兼容接口都能接；另有 Ollama、LM Studio、Dify、Coze、n8n、Langflow、百炼、火山方舟、SiliconFlow、OpenRouter 等一大堆。

**功能**：人设（对话流水线 / prompt）、多轮对话 + 流式输出、工具调用（Function Calling）、多模态（图片/语音/文件）、**内置 RAG 知识库**（Chroma + Rerank）、**MCP**、Skills + **代码沙箱**（Docker/nsjail/E2B）、数百插件、访问控制/限速/敏感词、Web 面板。

**部署**：`uvx langbot`（http://localhost:5300）、Docker Compose、K8s、宝塔、1Panel、Zeabur/Railway 一键、**LangBot Cloud 托管版（自带域名 + HTTPS）**。
**前置条件**：公众号需公网域名 + HTTPS（比 CoW 要求高）；企微客服需企业资质。

---

### 1.5 AstrBotDevs/AstrBot（发现的大项目，微信侧最弱）

| 项 | 内容 |
|---|---|
| 仓库 | https://github.com/AstrBotDevs/AstrBot |
| Star / Fork | **41,478** / 3,023（open issues 1,614） |
| 维护状态 | **非常活跃**，最后 push **2026-10-06** |
| 技术栈 | Python 3.12+，**AGPL-3.0** |

**通道**（README 表格）：QQ、OneBot v11、Telegram、**Wecom & Wecom AI Bot**、**WeChat Official Accounts（公众号）**、飞书、钉钉、Slack、Discord、LINE、Satori、KOOK、Misskey、Mattermost、Matrix（社区）、WhatsApp（开发中）。
→ **README 里没有「个人微信」通道**。历史上靠 gewechat（已停维护），后来有社区 PR **#1569「适配一个个人微信适配器——wechatpadpro」**，即走第三方协议。

**模型**：DeepSeek ✅、OpenAI 兼容、Anthropic、Gemini、Ollama、LM Studio、Dify/Coze/百炼；语音侧有 OpenAI Whisper、SenseVoice、MiMo Omni（STT）与 OpenAI TTS、GPT-SoVITS、FishAudio、Edge TTS、MiniMax、火山等（TTS）。

**功能**：**人设（Persona Settings）** ✅、多轮对话 + 自动上下文压缩、Agent / MCP / Skills / 知识库 / Agent 沙箱、**1000+ 插件**一键安装、WebUI + ChatUI、i18n。

**部署**：`uv tool install astrbot`、Docker、桌面版、宝塔/1Panel/CasaOS、RainYun 一键云部署。

---

### 1.6 个人微信「hack 生态」体检（风险区）

| 项目 | 仓库 | Star | 最后 push | 状态与风险 |
|---|---|---|---|---|
| ItChat | https://github.com/littlecodersh/ItChat | 26,464 | **2023-09-28** | 事实死亡。依赖的**网页版微信**对新账号基本关闭 |
| ItChat-UOS | https://github.com/why2lyj/ItChat-UOS | 742 | **2023-02-10** | README 原文：「2017年后，新注册的微信基本登录不了网页版」；2023-02-10 更新：「目前使用 `1.5.0.dev0` **大多数使用者可能出现微信被官方封禁提醒**，从已知收集的封禁情况，**暂未有可解决方案**」 |
| Wechaty | https://github.com/wechaty/wechaty | 23,349 | 2025-12-21 | 框架仍在。官方 puppet 服务里 **Donut（WeChat Windows）= Deprecated**、**WXWork = Deprecated**；**PadLocal / Paimon（Pad 协议）= Beta**。PadLocal 只给 **7 天免费试用**，之后付费，**价格未在文档页公开 → 需自行确认** |
| Gewechat | https://github.com/Devo919/Gewechat | 3,498 | 2026-08-06 | **「本项目已停止维护」**，只留技术归档；引用微信《针对违规获取及利用微信终端用户数据行为的打击公告》 |
| wechatbot-webhook | https://github.com/danni-cool/wechatbot-webhook | 2,164 | 2024-12-01 | **archived = true**（基于 wechaty），已死 |
| OpenClaw-Wechat | https://github.com/dingxiang-me/OpenClaw-Wechat | 532 | 2026-03-15 | LangBot「个人微信（OpenClaw）」所依赖的适配器 |
| WeChatPadPro | 第三方（`WeChatPadPro/WeChatPadPro`） | — | — | LangBot / AstrBot 的个人微信适配器；属非官方协议 |

---

## 2. 三个特别问题的明确回答

### Q1：个人主体的微信公众号订阅号，能不能开启开发者模式接自己的服务器？有什么限制？

**能。** 依据：腾讯官方《被动回复用户消息》文档，以及 CowAgent 公众号文档明确写「个人订阅号：个人可申请」并给出完整配置步骤（后台菜单：设置与开发 → 基本配置 → 服务器配置）。nezhafan/wechat-ai 的 README 也是纯个人订阅号方案。

限制（**这部分是重点**）：

1. **5 秒超时 + 重试 3 次** —— 官方原文：「微信服务器在五秒内收不到响应会断掉连接，并且重新发起请求，**总共重试三次**」。所以单条消息实际最多约 **15 秒**窗口（nezhafan README 亦是此口径）。排重建议用 `msgid`，事件消息用 `FromUserName + CreateTime`。
2. **必须回复，否则报错给用户** —— 官方原文：一旦「5秒内未回复任何内容」或「回复了异常数据，比如 JSON 数据等」，微信都会在会话中向用户下发系统提示「**该公众号暂时无法提供服务，请稍后再试**」。
3. **不能在 5 秒内回复时的正确做法** —— 官方要求：直接回复 `success`（推荐）或回复空串（字节长度为 0），这样微信不再重试；然后**改用客服消息接口异步回复**。
4. **但个人订阅号拿不到客服接口** —— 接口权限矩阵显示：`发送消息-客服接口` 在**未认证订阅号 = 无**，只有「微信认证订阅号 / 微信认证服务号」才有；`发送消息-群发接口`、`自定义菜单` 同样是未认证订阅号没有。而个人主体无法完成微信认证（微信认证要企业/组织资质）。
   → **所以个人订阅号只能「被动回复」，无法主动推送**。CowAgent 文档正好印证这个现象：个人订阅号「收到消息时会回复一条提示，回复生成后**需用户主动发消息获取**」；企业服务号才能「回复生成后可主动推送给用户」。LangBot 也提供两种模式绕：`drop`（15 秒内）与 `passive`（先回「AI 正在思考中…」，用户再发任意内容取答案）。
5. **群发次数** —— 官方《群发消息》文档：「在公众平台网站上，为公众号提供了**每天 1 条**的群发权限，为服务号提供**每月（自然月）4 条**」（注意这是**网页后台**的群发；**API 高级群发接口**对未认证订阅号无权限）。认证号用 API 群发每天 1 次；服务号每用户每月最多收 4 条；群发接口**每分钟限 60 次**。
6. 其他前置：需要服务器 + 公网可达；CowAgent 用 **80 端口**、回调 `http://{HOST}/wx`，`{HOST}` 可以是 IP 或域名（**不强制域名**）；LangBot 则要求**公网域名 + HTTPS**。需 AppID / AppSecret / Token，服务器 IP 要进白名单；公众号**仅支持服务器/Docker 部署，不支持本地跑**。
7. **语音**：CowAgent 文档说可利用微信自带语音识别，但要在后台「设置与开发 → 接口权限」开启「接收语音识别结果」。nezhafan 的 README 则说公众号**已取消**语音消息转文字能力（两条信息有冲突，**建议以你自己后台的实际开关为准**）。

> ⚠️ 上面第 4 点的「接口权限矩阵」我读的是官方文档的镜像快照（w3cschool 转载版，含 2016 年的配图），属于经典权限表，但**可能已过期**。请务必在 `mp.weixin.qq.com` 后台「设置与开发 → 接口权限」页面**亲自核对当前账号的真实权限**。

### Q2：个人主体能不能开通微信客服？企业微信个人能不能注册？

**微信客服：基本不行。**
- 官方开通页 https://work.weixin.qq.com/kf/register/intro 明确写：「**使用微信客服需同时开通企业微信**」，且开通按钮是「使用企业微信扫码登录」。
- LangBot 官方文档更直接：「**部署企业微信客服号需要企业资质**，具体查看企业微信客服号接入指南，并且根据此文档提供对应的**企业资质证明**」。
- CowAgent 微信客服文档的「一、准备」列出三项必需资源：服务器（公网 IP）、**注册并已认证的企业微信**、已开通「微信客服」能力；并提到「认证企业微信需要配置与主体一致的**备案域名**」。
- → **结论：个人主体走不通微信客服**（卡在企业认证）。**这是确定的。**

**企业微信：个人可以注册，但不能认证。**
- CowAgent 企微自建应用文档「一、准备」原文：「注册一个企业微信（**个人也可注册，但无法认证**）」。
- 二级来源（太平洋科技问答，UGC，**可信度较低，需自行确认**）：企业微信注册本身**不需要营业执照**（只要企业名称、所在地、法人及管理员信息即可创建初始后台，能建成员、发内部消息），但要用**客户联系、微信客服、API 接口**等核心能力必须走「企业认证」，认证需上传营业执照 + 统一社会信用代码 + 法人身份证，并支付 **300 元/次**第三方实名认证费（政府及公益组织豁免）。
- → **实际含义**：个人可以注册一个**未认证**企业微信，能建自建应用、能跑 CowAgent / LangBot 的「企微自建应用」通道、能让外部个人微信通过「微信插件」扫码对话；**但微信客服、客服类对外接口大概率不可用**。
- **不确定**：未认证企业微信究竟能否调用微信客服 API，官方开发者社区里有争议性提问（标题如「未认证的企业有微信客服的API吗？」），但社区页面是 JS 渲染，我**未能读到正文** → 标为**待确认**。

**费用**：微信公众号微信认证 / 企业微信认证普遍为 **300 元/年**量级（多个来源一致，含中国互联网协会转载的《微信公众号认证今日正式收费 300元一年有效》）；请以官方页面为准。

### Q3：chatgpt-on-wechat 用 itchat / wechaty 接个人微信，现在还能用吗？风险是什么？

**itchat：不能用，且已被官方封过号。**
- ItChat 本体最后提交 **2023-09-28**，事实上已停止维护。
- 它依赖的**网页版微信**协议：ItChat-UOS（`why2lyj/ItChat-UOS`）README 原文——「**2017年后，新注册的微信基本登录不了网页版**，itchat-uos 版本利用统信 UOS 的网页版微信，可以让你绕过网页微信的登录限制」。
- 同一个 README 的 2023-02-10 更新是**第一方承认封号**：「目前使用 `1.5.0.dev0` **大多数使用者可能出现微信被官方封禁提醒，从已知收集的封禁情况，暂未有可解决方案**。猜测可能与近期 ChatGPT 结合本仓库实现个性化机器人导致相关封禁，请合理，谨慎使用本仓库。」

**wechaty：框架还活着，但个人微信的协议端要么已废弃、要么收费。**
- wechaty/wechaty **23,349** star，最后提交 **2025-12-21**（节奏明显放缓）。
- 官方 puppet 服务状态页：**Donut（WeChat Windows）Deprecated**、**WXWork（WeCom Windows）Deprecated**；仍标 Beta 的是 **PadLocal**（WeChat Pad）和 **Paimon**（WeChat Pad，注意 PadLocal 页面的测试日期还停留在 2021 年）。
- PadLocal 只提供 **7 天免费试用**（`pad-local.com`），之后付费；**具体价格文档页没有公布 → 需自行确认**。
- 基于 wechaty 的 `wechatbot-webhook` 已被 **archive**。

**历史铁证：CoW 自己的 changelog 就记录了这条路的坑**（保留在旧版 README / 早期 fork 里）：
- **2022.12.19**：引入 **itchat-uos** 替换 itchat，解决「由于**不能登录网页微信**而无法使用的问题」
- **2023.02.09**：「**扫码登录存在封号风险，请谨慎使用**」
- **2023.02.20**：增加 **python-wechaty** 支持，「**Pad协议相对稳定，不易封号，但 Token 收费**，可申请七天体验 Token」

**当前状态**：CoW/CowAgent **已彻底移除 itchat/wechaty**——依赖文件里没有它们，`channel/weixin/` 是自研客户端对接所谓「官方接口」（ClawBot，微信 ≥8.0.69）。

**风险结论**：
- itchat 路线 = **协议已死 + 有明确封号记录**，不要碰。
- wechaty Pad / PadLocal 路线 = 技术上可能仍可用，但 **Beta + 收费 + 非官方协议**，仍有封号风险，且服务方随时可能像 Gewechat 一样停摆。
- **如果微信号重要（有客户、有钱、有社交关系），不要用任何第三方协议接个人微信。** 用「企业微信自建应用 + 微信插件」或「公众号」这两条官方合规路线。

---

## 3. 选型建议（用户目标：用 DeepSeek 接微信）

| 你的情况 | 建议 | 理由 |
|---|---|---|
| 只要能在微信里聊、账号无所谓、想最快跑起来 | **CowAgent** + `channel_type: weixin`（个人微信，扫码，微信 ≥8.0.69） | DeepSeek 是默认模型；一行安装；不需服务器。但这是**较新的官方接口机制**，我未找到腾讯官方文档背书，**请自行评估** |
| 要合规、账号重要、能接受「一问一答」 | **CowAgent** + 个人订阅号（`channel_type: wechatmp`） | 完全官方合规、免费、无需域名（IP+80 端口即可）。代价：只能被动回复、约 15 秒窗口、长回答要用户再发一条消息去取 |
| 要合规 + 微信里体验好 | **企业微信（未认证可注册）+ 企微自建应用 + 微信插件扫码** | CowAgent / LangBot / AstrBot / chatgpt-wechat 都支持；外部个人微信用户可对话；走官方接口 |
| 要多平台、要 RAG/Agent、生产级 | **LangBot** | 18k star、活跃、Web 面板、内置知识库/MCP/沙箱。注意企微客服**需企业资质**，公众号**需公网域名 + HTTPS** |
| 已有企业资质，要做对外客服 | **LangBot 或 CowAgent 的微信客服通道**，或 **whyiyhw/chatgpt-wechat** | 微信客服必须认证企业微信 |
| ⚠️ 不要选 | **nezhafan/wechat-ai**（自己声明过时）、任何 itchat 方案、Gewechat（已停维护）、wechatbot-webhook（已 archive） | — |

---

## 4. 明确区分：确定的事实 vs. 需用户自行确认

**确定（有一手来源）**
- CoW 已改名 CowAgent，47,246 star，2026-10-06 仍在提交；旧 URL 自动跳转。
- CoW 现已不含 itchat/wechaty；个人微信走自研客户端 + ClawBot + 微信 ≥8.0.69。
- 公众号 5 秒超时、重试 3 次、必须回复 `success`/空串、否则用户看到「该公众号暂时无法提供服务」——**腾讯官方原文**。
- 群发：网页后台每天 1 条（订阅号）/ 每月 4 条（服务号）；API 群发每分钟 60 次——**腾讯官方原文**。
- 微信客服需要企业微信——**腾讯官方开通页原文**；微信客服需要企业资质——**LangBot 官方文档原文**；CowAgent 要求「已认证的企业微信」。
- 「个人也可注册企业微信，但无法认证」——CowAgent 官方文档原文。
- itchat 依赖的网页版微信对新号关闭、ItChat-UOS 承认封号——**其 README 原文**。
- 各仓库 star 数 / 最后 push / archived 状态——**GitHub API，2026-10-06 快照**。

**需用户自行确认（我无法证实或来源较弱）**
1. w3cschool 镜像的「公众号接口权限矩阵」（未认证订阅号无客服接口/群发接口/自定义菜单）——是官方文档的旧快照，**请在公众号后台「接口权限」页核对**。
2. CoW / LangBot 的个人微信通道（ClawBot / OpenClaw）所谓「官方接口」的法律与稳定性地位——**未见腾讯官方文档背书**。
3. wechaty PadLocal 的实际收费价格（文档页未公开）。
4. 未认证企业微信能否调用微信客服 API（官方社区有争议提问，页面 JS 渲染读不到正文）。
5. 企业微信 / 公众号认证费 300 元/年、认证需营业执照——来源为二级网站，非官方页面原文。
6. AstrBot 当前是否仍有可用的个人微信通道（README 未列；仅有 wechatpadpro 社区 PR）。
7. whyiyhw/chatgpt-wechat 是否内置原生 DeepSeek 适配（README 只提 one-api 自定义模型名 + topics 含 deepseek）。
8. 公众号「接收语音识别结果」能力是否仍对新账号开放（CowAgent 文档说需在后台开启；nezhafan 说已取消，两者冲突）。

---

## 5. 引用来源

**代码仓库 / API**
- https://github.com/zhayujie/CowAgent ・ https://github.com/zhayujie/chatgpt-on-wechat（跳转）
- https://github.com/nezhafan/wechat-ai
- https://github.com/whyiyhw/chatgpt-wechat
- https://github.com/YanHaidao/wecom
- https://github.com/langbot-app/LangBot ・ https://github.com/RockChinQ/LangBot（现为 fork）
- https://github.com/AstrBotDevs/AstrBot
- https://github.com/littlecodersh/ItChat ・ https://github.com/why2lyj/ItChat-UOS
- https://github.com/wechaty/wechaty ・ https://github.com/Devo919/Gewechat
- https://github.com/danni-cool/wechatbot-webhook ・ https://github.com/dingxiang-me/OpenClaw-Wechat

**官方文档（腾讯）**
- 被动回复用户消息：https://developers.weixin.qq.com/doc/subscription/guide/product/message/Passive_user_reply_message.html
- 客服消息介绍：https://developers.weixin.qq.com/doc/subscription/guide/product/kf/intro.html
- 群发消息：https://developers.weixin.qq.com/doc/subscription/guide/product/message/Batch_Sends.html
- 接口调用额度说明：https://developers.weixin.qq.com/doc/subscription/guide/dev/api/limit.html
- 微信客服开通页：https://work.weixin.qq.com/kf/register/intro ・ https://work.weixin.qq.com/kf/

**项目文档**
- CowAgent 通道总览：https://docs.cowagent.ai/zh/channels
- CowAgent 微信公众号：https://docs.cowagent.ai/zh/channels/wechatmp
- CowAgent 微信（个人）：https://docs.cowagent.ai/zh/channels/weixin
- CowAgent 企微自建应用：https://docs.cowagent.ai/zh/channels/wecom
- CowAgent 微信客服：https://docs.cowagent.ai/zh/channels/wechat-kf
- CowAgent DeepSeek：https://docs.cowagent.ai/zh/models/deepseek ・ 模型总览：https://docs.cowagent.ai/zh/models
- CowAgent 长期记忆：https://docs.cowagent.ai/zh/intro/features
- LangBot 平台列表：https://langbot.app/docs/zh/usage/platforms/readme
- LangBot 微信公众号：https://langbot.app/docs/zh/usage/platforms/wxoa
- LangBot 企业微信客服：https://langbot.app/docs/zh/usage/platforms/wecom/wecomcs
- LangBot 个人微信（OpenClaw / WeChatPadPro）：https://langbot.app/docs/zh/usage/platforms/wechat/weixin ・ https://langbot.app/docs/zh/usage/platforms/wechat/wechatpad
- Wechaty Puppet Services：https://wechaty.js.org/docs/puppet-services/ ・ PadLocal：https://wechaty.js.org/docs/puppet-services/padlocal

**权限矩阵镜像（次级来源，需核对）**
- https://m.w3cschool.cn/weixinkaifawendang/qbtf1q8d.html

**其他**
- 企业微信注册/认证相关（UGC，低可信）：https://www.pconline.com.cn/ask/60144.html
- 微信公众号认证 300 元/年：https://www.isc.org.cn/article/28523.html
- 社区讨论（gewechat 停维护影响）：https://linux.do/t/topic/651429
