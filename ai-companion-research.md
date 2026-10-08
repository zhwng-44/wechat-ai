# 情感陪伴类 AI 开源项目调研：人设 / 长期记忆 / 情绪建模

> 调研时间：本次会话。调研方式：`web_search` + `web_fetch`。
>
> **重要环境限制（影响结论可信度，请务必先读）**
> 本次调研所在沙箱**无法访问 github.com / raw.githubusercontent.com / gitee.com / pypi.org**（`web_fetch` 对 GitHub 一律返回 `fetch failed`，shell 也无出网）。因此：
> - **所有 star 数、fork 数、最近提交时间、维护状态我都没有验证，故本报告一律不给出这些数字**（按你的要求，不编造 star 数）。
> - 本报告的**技术论断全部来自我能成功抓取的一手来源**：arXiv 全文（`arxiv.org/abs`、`arxiv.org/html`、`ar5iv.labs.arxiv.org`）、ACL Anthology、AAAI。这些来源的**质量和细节远高于 README**，因为 MM-1/MM-2 类项目的设计细节本来就写在论文里。
> - 搜索索引中出现了一批 **arXiv ID 形如 `2607.*` / `2609.*` 的"2026 年论文"**，以及一个名为 *ZifaMem* 的"AI companion 结构化记忆"论文。其中被列为 `arxiv.org`/`export.arxiv.org` 链接的条目行为异常（`fetch failed`、或返回 `application/pdf` 不支持），**我无法验证其真实存在，故本报告完全不引用它们**。请把它们当作噪音。
> - 每个论断后面标注了 **[事实]**（来源里明确写了）或 **[推断]**（我的工程判断）。

---

## 0. 结论速览（TL;DR）

1. **没有人用"微调"来解决长期记忆**。所有能长期陪伴的系统都是**外挂记忆 + 提示词组装**：向量检索（MemoryBank / ChatHaruhi）、带时间戳的知识图谱（Zep/Graphiti）、事实抽取+去重合并（Mem0 / PLATO-LTM）、记忆流打分检索（Generative Agents）。微调只用来解决**风格与共情**，不解决记忆。**[事实]**
2. **"会话摘要"（session summary）是所有方案里最差的一档**。Zep 论文实测：递归摘要只有 **35.3%**，会话摘要 **78.6%**，而全上下文 **94.4%**、Zep **94.8%**（DMR 基准，gpt-4-turbo）。摘要不是"便宜一点点的次优解"，而是**大幅掉点**的方案。**[事实]**
3. **最反直觉、也最有价值的一条**：LongMemEval 论文实测，"**按轮（round）存储**"优于"按会话（session）存储"，而"**继续压成用户事实**"反而**降低整体性能**（信息损失），只在多会话聚合类问题上变好。**[事实]**
4. **检索不该只用向量**。可复用的最佳组合是：**向量 + BM25 全文 + 图谱 BFS 邻域**，再重排（Zep）；或**多键索引**（用抽取出的事实/关键词扩充索引键），LongMemEval 实测 **recall@k +9.4%、QA 准确率 +5.4%**。**[事实]**
5. **"记忆会随时间衰减"有可落地的公式**。MemoryBank 用艾宾浩斯遗忘曲线 `R = e^(-t/S)`，被召回则 `S += 1, t = 0`；Generative Agents 用 `score = α_recency·recency + α_importance·importance + α_relevance·relevance`，α 全为 1，recency 是衰减因子 **0.995** 的指数衰减，importance 用 LLM 打 1–10 分。**[事实]**
6. **人设不跑偏靠"提示词工程 + 位置重复 + 定期自检"，不靠微调**。ChatHaruhi 明确发现：把人设补充说明**放在系统提示词的末尾**效果更好，且加口头禅会直接体现在输出里。**[事实]**
7. **中文场景的真正风险不是"忘事"，是"记错"和"时间错乱"**。商业系统（ChatGPT / Coze）在 LongMemEval 上比"直接把全文喂给同一个模型"掉 **37% / 64%**；论文归因于 **ChatGPT 会覆盖关键信息、Coze 常常漏记间接给出的信息**。**[事实]**（注意：这是英文基准，中文无同规模公开对照，属外推 —— 见 §6）

---

## 1. 值得看的开源项目清单

### 1.1 记忆机制"源头"项目

| 项目 | 仓库 | 技术栈（来源所述） | 备注 |
|---|---|---|---|
| **MemoryBank + SiliconFriend** | `github.com/zhongwanjun/MemoryBank-SiliconFriend`（论文中给出的官方地址）<br>`github.com/FKGSOFTWARE/MemoryBank`（另一份同名仓库，出现在搜索结果中） | Python；ChatGPT / ChatGLM / BELLE；LangChain 做检索；FAISS 索引；MiniLM（英）/ text2vec（中）做 embedding | AAAI 2024 论文；硅基朋友。**[事实]** 论文原文："The materials are released in https://github.com/zhongwanjun/MemoryBank-SiliconFriend" |
| **Generative Agents（Smallville）** | `github.com/joonspk-research/generative_agents` | Python；GPT-3.5-turbo | 记忆流/反思/规划三件套的经典实现，是后面几乎所有项目的思想来源。**[事实]** 仓库地址来自论文正文 |
| **Zep + Graphiti** | `github.com/getzep/graphiti`（Graphiti 为 Zep 的图谱引擎） | Neo4j + Lucene；BGE-m3 做 embedding 与 rerank；gpt-4o-mini 做图谱构建 | 时序知识图谱方案。**[事实]** 论文中指明 Graphiti 是 Zep 的核心组件 |
| **Mem0** | 论文为 arXiv:2504.19413 | 事实抽取 + 合并 + 检索；另有图记忆变体 | 生产向 memory layer。**[事实]** |
| **LoCoMo 基准** | `snap-research.github.io/locomo/` | 数据集：平均 300 轮 / 9K token / 最多 35 个会话 | 评测超长期对话记忆。**[事实]** |

### 1.2 中文语境 / 角色扮演相关

| 项目 | 仓库 | 技术栈 | 备注 |
|---|---|---|---|
| **PLATO-LTM + DuLeMon** | `github.com/PaddlePaddle/Research/tree/master/NLP/ACL2022-DuLeMon` | 百度 PLATO-2 / ERNIE；ERNIE-CNN 做人设抽取分类器 | **中文**，ACL 2022，"用户人设 + Bot 人设双记忆"。DuLeMon 是**当时最大的中文多轮互人设对话数据集**（27,501 段对话）。**[事实]** |
| **ChatHaruhi（Chat-哈鲁希）** | `github.com/LC1332/Chat-Haruhi-Suzumiya` | ChatGLM2-6B 微调 / ChatGPT / Claude；OpenAI text-embedding-ada-002（中英），中文另用 Luotuo-Bert-Medium | **中英双语 32 个角色 / 54,726 段对话**。论文明确说**没有做角色长期记忆**。**[事实]** |
| **CharacterGLM** | 论文 arXiv:2311.16832；基于 ChatGLM，6B–66B，开源 6B 版本 | 角色扮演**微调** + 属性/行为配置 | **中文**超拟人。属性 = 身份/兴趣/观点/经历/成就/社会关系；行为 = 语言特征/情感表达/互动模式。**[事实]** |

> 搜索结果还给出了一批**中文开源陪伴项目名**（`acgurl/mori`、`xiyuailove/xiyuai`、`MIKUSCAT/ATRI`、`mengnankkkk/AI-memory`、`1437649480/miku-hermes-chat`、`DasterProkio/awesome-ai-companion` 汇总列表）。**我没有验证它们的仓库内容、star 或维护状态**（受 §0 的 GitHub 限制），仅在 §7 列为"待你人工复核的线索"。

---

## 2. 长期记忆机制：四种流派与具体实现

### 2.1 流派 A：分层摘要 + 用户画像 + 遗忘曲线（MemoryBank）

MemoryBank 论文（AAAI 2024）给出了三根支柱：**memory storage / memory retriever / memory updater**。**[事实]**

**(a) 存储层是"三层结构"，不是单一摘要：**
- **In-Depth Memory Storage**：多轮对话**逐条按时间序（带时间戳）**记录，形成有序叙事。
- **Hierarchical Event Summary**：对话 → 每日事件摘要 → 全局摘要。原文提示词：
  - 日摘要：`"Summarize the events and key information in the content [dialog/events]"`
  - 全局：把日摘要再合成全局摘要
- **Dynamic Personality Understanding**：**每日人格洞察 → 全局人格理解**。原文提示词：
  - `"Based on the following dialogue, please summarize the user's personality traits and emotions. [dialog]"`
  - `"The following are the user's exhibited personality traits and emotions throughout multiple days. Please provide a highly concise and general summary of the user's personality [daily Personalities]"`

> 注意这里**情绪是和人设放在同一个抽取管线里**的（"personality traits **and emotions**"）——这是我要强调的一个可复用点。**[事实]**

**(b) 检索层**：每个对话轮/事件摘要视为一个 memory piece，用 **dual-tower dense retrieval**（类 DPR）预编码，**FAISS** 建索引；当前对话作为 query。原文："During real-time conversation, the user's conversation serves as the query for memory retrieval." 实现上用 **LangChain**，英文用 MiniLM，**中文用 text2vec**。**[事实]**

**(c) 更新层 —— 遗忘曲线（最值得抄的一段）**：
- 理论：`R = e^(-t/S)`，R 为记忆保留率，t 为自学习以来的时间，S 为记忆强度。
- 工程化：**S 离散化，初始化为 1**；当某条记忆在对话中被**召回**时，**S += 1 并把 t 重置为 0**，于是它以更低概率被遗忘。
- 论文自己声明："this is an exploratory and highly simplified memory updating model"。**[事实]**

**组装进 prompt 的内容**：相关记忆 + **全局用户画像** + **全局事件摘要**（三者一起）。**[事实]**

**(d) 效果（论文自报，定量）**：194 道探测题、10 天记忆、15 个虚拟用户。检索准确率：英文 0.763–0.814，中文 **0.711–0.856**；回答正确率 ChatGPT 变体 0.716（英）/0.655（中），ChatGLM 变体仅 0.438/0.418；连贯性 0.912（英，ChatGPT）/0.675（中）。**[事实]**

**(e) 共情来自微调，记忆来自外挂**：SiliconFriend 用 **38k 心理对话**做 **LoRA**（rank=16，3 epochs，A100）微调开源模型；ChatGPT 版本不做这一步。**这是全篇唯一一处"微调"，而且它解决的是情绪支持能力，不是记忆。** **[事实]**

---

### 2.2 流派 B：记忆流 + 打分检索 + 反思树（Generative Agents）

这是**工程上最优雅、也最容易被误读**的一套。原文在 §4。**[事实]**

**(a) 记忆对象的数据结构**：列表，每个对象含
- 自然语言描述
- **创建时间戳**
- **最近一次被访问的时间戳**

**(b) 检索打分公式（原文）**：

```
score = α_recency · recency + α_importance · importance + α_relevance · relevance
```
- 三个分量**各自 min-max 归一化到 [0,1]**；**所有 α 都设为 1**。
- **recency**：对"距上次被检索经过的沙盒游戏小时数"做指数衰减，**衰减因子 0.995**。
- **importance**：直接让 LLM 输出 1–10 整数，在**记忆创建时**生成一次。原文提示词：
  > `On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth, making bed) and 10 is extremely poignant (e.g., a break up, college acceptance), rate the likely poignancy of the following piece of memory.`
  > 论文举例：`cleaning up the room` → 2；`asking your crush out on a date` → 8。
- **relevance**：用 LLM 生成 embedding，与 query memory 做**余弦相似度**。
- 取 top-ranked 且**能塞进上下文窗口**的记忆。

**(c) 反思（Reflection）—— 触发条件与做法**：
- 反思是**第二类记忆**，与观察一起参与检索。
- **触发条件：最近感知事件的 importance 分数之和超过阈值（实现中为 150）**。论文实测：agent **每天大约反思 2–3 次**。
- 流程：取**最近 100 条**记忆 → 问 LLM `"Given only the information above, what are 3 most salient high-level questions we can answer about the subjects in the statements?"` → 用这些问题**作为检索 query** 拉相关记忆 → 让 LLM 产出洞察**并引用证据编号**：`What 5 high-level insights can you infer from the above statements? (example format: insight (because of 1, 5, 3))`。
- 反思**可以建立在其他反思之上**，于是形成**反思树**：叶子是原始观察，越往上越抽象。**[事实]**

**(d) 被论文明确点名的三种典型故障**（非常重要，直接对应"怎么避免记错"）：
> "the most common errors arose when the agent **failed to retrieve relevant memories**, **fabricated embellishments** to the agent's memory, or **inherited overly formal speech or behavior from the language model**."

即：**检索失败 / 记忆被编造润色 / 被基座模型的语言习惯带偏**。**[事实]**

**(e) 为什么"不能只靠摘要"**：论文用"Isabella 你最近热衷于什么？"举例——把所有经历摘要进上下文会得到一个**毫无信息量的泛泛回答**；而检索出相关记忆才能给出具体回答。这与 §2.4 的 Zep 实测互相印证。**[事实]**

---

### 2.3 流派 C：时序知识图谱（Zep / Graphiti）

**这是"关系进展 + 事实变更"处理得最严谨的一套。** **[事实]**

**(a) 三层子图**：
- **Episode 子图**：存**原始输入**（message / text / JSON）+ 引用时间戳 `t_ref`。是**non-lossy（不丢信息）**的存储，语义实体从它抽取。
- **Semantic Entity 子图**：实体节点 + 事实边。
- **Community 子图**：强连通实体的聚类 + 高层摘要（用 **label propagation** 而非 Leiden，为了能增量维护）。

论文明确说这种"原始情节 + 派生语义"的双存储**对应心理学上的情景记忆 vs 语义记忆**。**[事实]**

**(b) 双时间轴 bi-temporal（我认为最值得抄的单点）**：
- T 轴：事件**实际发生**的时序 → `t_valid` / `t_invalid`
- T' 轴：数据**被写入系统**的事务时序 → `t'_created` / `t'_expired`
- 时间抽取用 `t_ref` 把相对时间（"下周四"、"两周前"、"去年夏天"）**解析成绝对时间**。原文提示词明确要求：ISO 8601、用参考时间戳换算相对时间、只提年份则用该年 1 月 1 日 00:00:00、无时区用 Z。

**(c) 冲突与更新：边失效（edge invalidation）**：
- 新事实入库时，LLM 把它与**语义相关的既有边**比较，识别**时间上重叠的矛盾**。
- 一旦判定矛盾，**把旧边的 `t_invalid` 设为新边的 `t_valid`**（即"这件事在那时就不再成立了"）。
- 沿 T' 轴，**新信息优先**。
- 结果："maintaining both current relationship states and **historical records of relationship evolution over time**"。**这一句几乎是"关系进展建模"的标准答案。** **[事实]**

**(d) 稳健性设计**：图写入用**预定义 Cypher 查询**而非让 LLM 生成数据库查询，理由是"ensure consistent schema formats and **reduce the potential for hallucinations**"；抽取前会带上**最近 n 条消息**（n=4，即两轮）作上下文；实体抽取后用 **reflexion 式反思**降低幻觉、提高覆盖率。**[事实]**

**(e) 检索 = 三路召回 + 重排 + 组装**：
- 搜索：**余弦语义相似** + **Okapi BM25 全文** + **图谱 BFS**（后两者跑在 Neo4j 的 Lucene 上）。论文对 BFS 的解释很关键：**"nodes and edges closer in the graph appear in more similar conversational contexts"**，并且**可以用最近的 episode 作为 BFS 的种子**，从而把"刚提到的人和关系"拉进来。
- 重排：RRF、MMR、**episode-mentions 重排**（在对话里被提到越频繁越靠前）、node-distance 重排、cross-encoder。
- 组装：输出 fact + `t_valid`/`t_invalid`，entity 输出 name + summary，community 输出 summary。上下文模板：
  > `FACTS and ENTITIES represent relevant context to the current conversation. These are the most relevant facts and their valid date ranges. If the fact is about an event, the event takes place during this time. format: FACT (Date range: from - to)`

**(f) 效果（实测表）**：
| 方案 | 模型 | DMR 准确率 |
|---|---|---|
| 递归摘要 | gpt-4-turbo | **35.3%** |
| 会话摘要 | gpt-4-turbo | 78.6% |
| MemGPT | gpt-4-turbo | 93.4% |
| **全上下文** | gpt-4-turbo | **94.4%** |
| Zep | gpt-4-turbo | 94.8% |
| 会话摘要 | gpt-4o-mini | 88.0% |
| **全上下文** | gpt-4o-mini | **98.0%** |
| Zep | gpt-4o-mini | 98.2% |

LongMemEval-S（平均 **115k token**）：
| 方案 | 模型 | 准确率 | 延迟 | 平均上下文 token |
|---|---|---|---|---|
| 全上下文 | gpt-4o-mini | 55.4% | 31.3 s | **115k** |
| Zep | gpt-4o-mini | **63.8%** | 3.20 s | **1.6k** |
| 全上下文 | gpt-4o | 60.2% | 28.9 s | 115k |
| Zep | gpt-4o | **71.2%** | 2.58 s | 1.6k |

**这张表是整个调研里最值钱的一张**：上下文从 115k 压到 **1.6k**（约 **1/72**），准确率反而 **+15.2 ~ +18.5 个点**，延迟降约 **90%**。**[事实]**
> 必须注意一个限定：DMR 只有 60 条消息、**本来就塞得进上下文**，论文自己也说"these results must be contextualized"。所以 **DMR 上 Zep 只是"不比全上下文差"，真正拉开差距的是 LongMemEval**。**[事实]**

---

### 2.4 流派 D：事实抽取 + 合并（Mem0）与"按轮存储"（LongMemEval）

**Mem0**（arXiv:2504.19413）：动态**抽取、合并（consolidate）、检索**对话中的显著信息；图记忆变体用图结构捕捉关系。LOCOMO 上相对 OpenAI 的 LLM-as-a-Judge 指标**相对提升 26%**；图变体再高约 2%；相比全上下文 **p95 延迟降 91%、token 成本省 >90%**。**[事实]**

**LongMemEval**（arXiv:2410.10813，Tencent AI Lab 实习工作）把长期记忆拆成**三段（indexing / retrieval / reading）+ 四个控制点（value / key / query / reading）**，实测结论极其实用：

| 控制点 | 实测结论（原文数字） |
|---|---|
| **CP1 value（粒度）** | **"round 比 session 更优"**；但**"进一步压缩成用户事实会因信息损失损害整体性能"**，只在 multi-session reasoning 上变好 |
| **CP2 key（索引）** | 用 value 自身做 key 是很强的 baseline；**用抽取出的用户事实扩充 key** → **recall@k +9.4%，下游 QA +5.4%** |
| **CP3 query（时间）** | 时间无关的朴素设计在 temporal reasoning 上很差；**把时间戳与事实关联、并用时间范围收窄检索** → temporal reasoning 记忆召回 **+6.8% ~ +11.3%**（用强 LLM 做 query expansion 时） |
| **CP4 reading（阅读）** | **即使召回完美，用好它也不平凡**；**Chain-of-Note + 结构化格式**在三个 LLM 上带来**最多 +10 个绝对点** |

**[事实]**（以上四项均来自该论文的 Contributions 与 §4.2）

**它同时给出了"长期记忆系统的统一抽象"**：把长期记忆看作一个巨大的 key-value 存储 `[(k1,v1),(k2,v2),…]`，key 可离散（句子/段落/事实/实体）也可连续（模型内部表示）；三个阶段是 **indexing → retrieval → reading**。**[事实]**

**基准的规模与难度**：500 道人工题，覆盖 5 种能力（信息抽取 IE / 多会话推理 MR / 知识更新 KU / 时间推理 TR / 弃答 ABS）、7 种题型；LongMemEval-S ≈ **115k token/题**，LongMemEval-M = 500 sessions ≈ **1.5M token**。**[事实]**

**商业系统的实测（这条最关键）**：
| 系统 | 模型 | 准确率 |
|---|---|---|
| Offline Reading（把全文给模型） | GPT-4o | **0.9184** |
| ChatGPT | GPT-4o | 0.5773 |
| ChatGPT | GPT-4o-mini | 0.7113 |
| Coze | GPT-4o | 0.3299 |
| Coze | GPT-3.5-turbo | 0.2474 |

即 ChatGPT / Coze（GPT-4o）相对"直接读全文"**分别掉 37% 和 64%**。论文归因：**"ChatGPT tended to overwrite crucial information as the chat continues, while Coze often failed to record indirectly provided user information"**。**[事实]**

**长上下文模型本身的衰减**（LongMemEval-S，对比 oracle 只给证据会话）：
- GPT-4o：0.870 → 0.606（**-30.3%**）；加 Chain-of-Note 后 0.924 → 0.640（-30.7%）
- Llama 3.1 70B：0.744 → 0.334（**-55.1%**）
- Phi-3 128k 14B：0.702 → 0.380（-45.9%）

**结论（论文原话意旨）：即使最强的长上下文模型，在没有有效记忆机制的情况下也无法管理不断增长的交互历史。** **[事实]**

> ⚠️ **诚实标注**：LongMemEval 论文 §5 里有若干优化后的具体数值（尤其 knowledge-update 一类）在我抓取的正文中被截断，**我没有读到，故不引用**，只引用上面确认读到的数字。

---

### 2.5 流派 E：中文的"双向人设记忆"（PLATO-LTM，最贴合中文陪伴场景）

这套是**目前我看到的最直接可搬到中文陪伴产品的架构**。**[事实]**

**任务设定**：LeMon（Long-term Memory Conversation）。用户人设 `ρ^u = {ρ^u_1…ρ^u_m}`，Bot 人设 `ρ^s = {ρ^s_1…ρ^s_n}`。目标是**同时**保持自己人设一致 **且**主动记忆并使用用户人设。数据集 **DuLeMon**：27,501 段对话（SELF 24,500 + BOTH 3,001），平均 16.3 轮，平均句长 19.7–21.2 字。**[事实]**

**三个模块**：

1. **Persona Extractor（PE）**：ERNIE-CNN 二分类，判断一个**子句**是否含人设信息。
   - 训练法：先人工标 6k 句 → 训 5 个 ERNIE-CNN（pc-stage1）→ 用这 5 个模型自动标 **140 万句**，**≥2 个模型判正例才标正**（多数投票降噪）→ 训 pc-stage2。
   - 结果：**F1 = 0.91**（ACC 0.92 / P 0.95 / R 0.87）。
   - 推理：按标点切子句 → 逐句分类 → 取正例子句作为人设句。**[事实]**

2. **Long-Term Memory（双记忆，读写机制）**：
   - **写（Write）**：算出候选人设 `ρ_i` 与记忆中最相近的 `ρ_j` 的余弦相似度；**超过重复阈值 `s_dup` 就替换 `ρ_j`，否则直接写入**。写入时保存 `{ρ_i, E_ρ(ρ_i)}` 对以便后续读取。**这就是"去重 + 更新"的最小实现，比"再让 LLM 判断是否重复"便宜得多。** **[事实]**
   - **读（Read）**：先用稠密向量相似检索取候选，再用 **CPM（Context Persona Matching）**模型打分。上下文与 persona 用**不同编码器** `E_c(·)`、`E_ρ(·)`（都用 ERNIE 初始化），用 **triplet loss** 训练，**margin α = 0.2**。
   - 取**用户记忆 top-k** 和 **Bot 记忆 top-k**，并**过滤掉相似度低于阈值 `s_c` 的 persona**（论文明确说是为了"model persona sparsity"）。
   - 检索效果：**AUC 0.76，recall@5 = 0.83**。**[事实]**

3. **Generation**：PLATO-2（12L/32L）。两个防串角色的技巧：
   - **Role Embedding**：不同角色用不同 embedding，区分双方人设。
   - **Role Token**：在 Bot 人设前拼 `"system persona"`，在用户人设前拼 `"user persona"`。
   - 作者原话目的是"**prevent the confusing use of persona information**"（防止人设信息被用串）。**[事实]**

**效果（人工评测，0/1/2 分制）**：
| 模型 | Coherence | **Consistency** | Engagingness |
|---|---|---|---|
| PLATO-2 | 1.70 | 0.13 | 1.46 |
| PLATO-FT | 1.59 | 0.40 | 1.40 |
| **PLATO-LTM** | 1.67 | **0.87** | **1.54** |
| PLATO-LTM **w/o PE** | 1.57 | **0.49** | 1.43 |

- 加长期记忆：一致性相对提升 **118%**（0.40 → 0.87）。
- **PE（人设抽取器）贡献巨大**：去掉后一致性 0.87 → 0.49，engagingness 1.54 → 1.43。**"什么都往记忆里塞"远不如"先抽取人设句再存"。** **[事实]**
- 一个反例警告：**在小数据集上微调会轻微损害预训练对话模型的连贯性**（PLATO-FT 1.59 < PLATO-2 1.70）。**[事实]**

---

### 2.6 中文角色扮演的"记忆"做法与它的坦率自白（ChatHaruhi）

ChatHaruhi（arXiv:2308.09597）把虚拟角色定义为三个核心成分：**知识背景 / 性格 / 语言习惯**。**[事实]**

**架构**：`system prompt s_R` + **从剧本抽取的角色"经典对话记忆库"检索结果 `D(q,R)`** + **对话历史 H** + 当前 query `q`。**[事实]**

**检索**：对 query 用句向量模型算 embedding，取**余弦相似度最高的 M 个剧本片段**；**动态按 token 数调整 M**——"如果使用 OpenAI turbo-3.5，我们把 D 的总 token 限制在 **1500** 以内"。embedding 用 text-embedding-ada-002；**中文用 Luotuo-Bert-Medium**（因为它蒸馏自前者、分布相同，可无缝跨语言）。**[事实]**

**对话历史预算**：从最近一轮往前数 token，**把 H 限制在 1200 token 以内**。**[事实]**

**它自己的坦率声明（值得单独引用）**：
> "Therefore, in this work, **we do not care about the character's long-term memory. 1200 tokens can accommodate about 6-10 rounds of dialogue.**"
> "when building the dialogue memory bank, we suggest that **the length of each story should not be too long, so as not to occupy the space of other stories during search**."

**这两句给出了一个非常有用的经验值：1200 token ≈ 中文 6–10 轮对话。** **[事实]** 并且给出了"记忆单元不要切太长，否则检索时会挤掉其他单元"的设计约束。**[事实]**

---

## 3. 人设与人格：怎么保证不跑偏

### 3.1 提示词模板（ChatHaruhi，可直接抄）

ChatHaruhi 做了明确对照实验，发现两个问题并给出修正：
1. **模型倾向于不复述原文**——因为 RLHF 之后模型被训练成"给我 m 个不同选项""生成 m 个标题"，所以它会避免重复上下文内容。→ **必须在提示词里显式强调"你在 cosplay 这个角色，可以复用原作台词"**。
2. **角色特征不够突出**——即使给了 `D(q,R)` 让它模仿，输出仍被基座模型自身的语言偏好带偏。→ **在 `s_R` 的末尾补充角色性格说明，效果更好**。

最终模板（原文）：
```
I want you to act like {character} from {series}.
You are now cosplay {character}If others' questions are related with the novel,
please try to reuse the original lines from the novel.
I want you to respond and answer like {character} using the tone, manner and
vocabulary {character} would use.
You must know all of the knowledge of {character}.
{Supplementary explanation of the character's personality}
```
论文补充："**We find the final output of the language model is quite sensitive to the effects of the supplementary explanation. Including adding certain verbal tics in the supplementary explanation will also be reflected in the final output.**" **[事实]**

同时论文批评了社区里更简陋的通用模板，指出三个缺陷：依赖模型自身记忆（模糊就无法扮演）、`know all of the knowledge of {character}` 定义含糊**无法防幻觉**、**对话风格仍被基座模型主导**。**[事实]**

### 3.2 人设不跑偏的四条可复用手段（均有来源）

| 手段 | 来源 | 具体做法 |
|---|---|---|
| **人设写进系统提示，且关键属性放末尾** | ChatHaruhi | 利用位置效应，在 `s_R` 结尾重复性格/口癖 **[事实]** |
| **人设单独建"记忆库"并按 query 检索注入** | ChatHaruhi | 把剧本切成**短**片段（太长会挤掉其他片段）存入，检索 top-M **[事实]** |
| **双方人设分离存储 + 角色标记防串** | PLATO-LTM | 用户记忆/Bot 记忆**两个独立记忆**；`role_embed` + `role_token`（`system persona` / `user persona`） **[事实]** |
| **人设抽取器过滤噪声再入库** | PLATO-LTM | PE 分类 F1 0.91；去掉它一致性 0.87 → 0.49 **[事实]** |

### 3.3 微调在什么时候才值得

- **CharacterGLM**：确实用了**角色扮演微调**（基于 ChatGLM，6B–66B），并把可配置项形式化为**属性**（身份、兴趣、观点、经历、成就、社会关系…）与**行为**（语言特征、情感表达、互动模式…）。评测维度是 **consistency / human-likeness / engagement**。**[事实]**（注意：我只读到摘要级的属性/行为分类，**没有读到它的具体配置字段名或 schema**，不做臆测。）
- **ChatHaruhi 的反面证据**：作者在哈利波特角色上做过初步实验，发现 **"fine-tuned ChatBots produced more hallucinations"**（微调后的模型幻觉更多），且**小角色数据量不够无法微调**。**[事实]**
- **PLATO-LTM 的反面证据**：小数据集微调**损害连贯性**。**[事实]**
- **MemoryBank 的折中**：只有开源基座才做 LoRA（38k 心理对话），目的是**共情能力**，**记忆完全靠外挂**。**[事实]**

> **[推断]** 综合来看：**微调应该只用于"稳定的表达风格 + 共情语气"，绝不用于承载事实记忆**。事实记忆一旦进权重就无法删除/更新，而陪伴场景恰恰需要"用户改了偏好就要立刻改口"。

---

## 4. 情绪与关系建模：哪些是真做了的

**这一节我必须先做一个诚实的可用性声明。**

### 4.1 我确认到的（有来源）

| 能力 | 项目 | 实现方式 |
|---|---|---|
| **情绪与人设一起每日抽取** | MemoryBank | 提示词直接是 `summarize the user's personality traits **and emotions**`，日粒度 → 全局聚合。**[事实]** |
| **情绪的"重要性"权重（隐式情绪建模）** | Generative Agents | LLM 给每条记忆打 1–10 的 **poignancy（辛酸/触动程度）**，例子：`cleaning up the room`→2，`asking your crush out on a date`→8。这个分数进入检索打分。**[事实]** |
| **关系进展的历史记录** | Zep / Graphiti | 边失效机制保留 `t_valid`/`t_invalid`，论文原话是维护"**historical records of relationship evolution over time**"。**[事实]** |
| **关系相关记忆的检索偏好** | Zep | **episode-mentions reranker**：在对话中被提到越频繁的实体/事实越靠前。**[事实]** |
| **共情式回复** | MemoryBank / SiliconFriend | 38k 心理对话 LoRA 微调。**[事实]** |
| **主动发起对话（多智能体之间）** | Generative Agents | agent 之间会**自发发起对话、扩散信息、协调活动**（情人节派对案例：从一条种子意图出发，自发邀请、装饰、约会、到场）。**注意：这是 agent-to-agent，不是 agent 主动找用户。** **[事实]** |
| **按时问候 / 定时主动触达** | — | **我没有找到任何一手来源实现或评测"按时间问候用户"。** |

### 4.2 好感度 / 亲密度机制：**我没有找到可信的一手实现**

- 我检索到的所谓"亲密度/好感度"材料，落在**无法验证的 2026 年论文**或**非技术来源**里（见 §0 噪音声明），因此**不予采信**。
- **明确结论：在本次可核实的一手来源范围内，没有项目公开描述过"好感度数值 + 每轮增减规则"这种机制。** 商业产品（Character.AI、Glow 等）的做法没有进入学术文献。
- **[推断]** 这类"数值好感度"很可能是产品层自造，且存在明显风险（用户会做数值优化、数值与叙事冲突、难以解释为什么掉分）。见 §5.5 我给的替代设计。

### 4.3 可用的替代理论（有来源，但非陪伴项目实现）

- **Appraisal theory（评价理论）**：情绪来自对情境的主观解释，被用于多智能体情感交互（如 Affect Control Processes / POMDP 方向的工作，`ar5iv.labs.arxiv.org/html/1306.5279`）。**[事实：该文献存在]**
- **Zep 的情景记忆 vs 语义记忆二分**：直接对应"具体事件（我们一起做了什么）"与"关于这个人的稳定认知（他是什么样的人）"。**[事实]**

> **[推断]** 这两条足以支撑一套不需要"好感度数字"的情绪/关系建模：**情景记忆承载"共同经历"，语义记忆承载"关系定性"，情绪用事件级 importance 加权。** 这与 Generative Agents + Zep 的既有机制完全兼容，不需要发明新东西。

---

## 5. 具体可复用的做法（可操作清单）

以下每条都给出**触发时机、数据结构、阈值**。标 **[事实]** 的是有来源的做法，标 **[推断]** 的是我基于来源给出的工程方案。

### 5.1 记忆写入时机与粒度

1. **[事实]** **按"轮（round）"存，不按"会话（session）"存。** LongMemEval 实测 round 粒度优于 session 粒度。
2. **[事实]** **但不要只存抽取后的"用户事实"。** 论文实测进一步压缩成事实会**损害整体性能**（信息损失），只对 multi-session 聚合类问题有帮助。
3. **[推断]** 落地建议：**原始对话轮（原文，non-lossy）+ 每日摘要 + 用户画像**三层都存。Zep 的做法正是"原始 episode 不丢 + 派生语义"双存 **[事实]**，MemoryBank 也是"逐条时序记录 + 日摘要 + 全局摘要 + 人格"四层 **[事实]**。**原始文本必须留，它是你唯一能回溯纠错的依据。**
4. **[事实]** **写入前先抽取/过滤。** PLATO-LTM 的 PE 模块（只存"人设句"）使一致性从 0.87 掉到 0.49（去掉它时）——即 PE 是必需的，不是优化项。
5. **[推断]** **切片要短。** ChatHaruhi 明确建议每个 story 不要太长，否则检索时会挤占其他 story 的位置 **[事实]**。中文建议按**单个事件/单句话**切，不要按整场对话切。

### 5.2 记忆去重与更新（防"记错"的核心）

6. **[事实]** **余弦相似度 + 阈值判定重复，超阈值就替换，否则新增**（PLATO-LTM 的 write 流程）。这比"每次都让 LLM 判断是否重复"便宜一到两个数量级，且可解释。**[推断：后半句]**
7. **[事实]** **每对"实体对"之间限定检索范围再做去重**。Zep 的边去重"constrained to edges existing between the same entity pairs"，既防止把不同实体对的相似边错误合并，**又大幅降低计算复杂度**（把搜索空间限制在特定实体对的子集）。
8. **[事实]** **时间重叠才判矛盾，且新信息优先。** Zep 用 LLM 比较新边与语义相关旧边，只在 **temporally overlapping contradictions** 时才把旧边 `t_invalid` 设为新边 `t_valid`。
9. **[事实]** **所有时间都要绝对化。** 用消息的 `t_ref` 把"下周四""两周前""去年夏天"解析为 ISO 8601 绝对时间；无时区用 Z；只给年份用该年 1 月 1 日。
10. **[推断]** **保留双时间戳。** 至少存两个时间：**事件实际发生时间** 与 **系统记录该信息的时间**。用户说"我上周分手了"，事件时间是上周，记录时间是今天——只存一个必然出错。这是 Zep bi-temporal 设计 **[事实]** 的直接推论。

### 5.3 检索时机与召回策略

11. **[事实]** **每次生成前都用"当前用户消息"作为 query 检索**。MemoryBank 原文："During real-time conversation, the user's conversation serves as the query for memory retrieval."
12. **[事实]** **不要只用向量召回。** Zep 用**余弦 + BM25 + 图谱 BFS** 三路。其中 BFS 的独到之处：可以用**最近的 episode 作为种子**，把"刚刚提到的人和关系"捞回来。**[推断]** 对中文尤其重要——中文长尾实体（人名、地名、小众爱好）向量召回不稳，BM25 兜底。
13. **[事实]** **多键索引（multi-key indexing）**：用抽取出的**摘要、关键词、用户事实、带时间戳的事件**来**扩充索引键**，而不是拿 value 本身当 key。实测 **recall@k +9.4%、QA +5.4%**。
14. **[事实]** **时间类问题必须走时间过滤。** 把事实与时间戳关联 + 时间感知 query expansion 收窄检索范围，temporal reasoning 召回 **+6.8%~+11.3%**。
15. **[事实]** **打分融合而非纯相似度。** Generative Agents：`α_recency·recency + α_importance·importance + α_relevance·relevance`，各分量 min-max 归一化，**α 全取 1**，recency 是 **0.995** 衰减因子的指数衰减。**[推断]** 陪伴场景里这个"重要性"分量恰好就是"这句话有多戳心"，天然适合承载情绪权重。
16. **[事实]** **检索结果的质量要单独监控。** LongMemEval 明确把 memory recall（Recall@k / NDCG@k）作为**独立于 QA 准确率的中间指标**，且数据带有**人工标注的答案位置标签**。**[推断]** 你应该自己攒一套 100–200 题的"记忆探测集"（MemoryBank 论文就是这么干的：194 题 / 10 天 / 15 个虚拟用户 **[事实]**），每次改检索都回归。

### 5.4 上下文压缩与读取策略

17. **[事实]** **摘要很贵，但摘要本身很弱。** 递归摘要 35.3% vs 全上下文 94.4%（DMR）；会话摘要 78.6%。**不要把"摘要"当作唯一的压缩手段**，它必须与"原始轮检索"并存。
18. **[事实]** **读取阶段要做二次加工。** **Chain-of-Note + 结构化格式** 在三个 LLM 上带来最多 **+10 绝对点**。原文强调"**even with perfect memory recall, accurately utilizing retrieved items is non-trivial**"。
19. **[推断]** 落地：检索出 N 条记忆后，**不要直接拼接**，先让模型输出结构化中间态（例如 `{相关事实, 时间范围, 与当前话题的关系, 无法确定的部分}`），再基于它生成回复。这直接对应 LongMemEval 的 CP4。
20. **[事实]** **反思/总结的触发用"重要性累积"而非固定时间。** Generative Agents：当**最近事件的 importance 之和 > 150** 触发反思；实测每天约 2–3 次。**[推断]** 这比"每 N 轮总结一次"好得多——它天然在高情绪密度时总结，在平淡期省钱。
21. **[事实]** **反思要引用证据。** Generative Agents 的输出格式是 `insight (because of 1, 5, 3)`，并把被引用的记忆对象的**指针一并存下**。**[推断]** 这是"防记错"最直接的机制：任何时候都能顺着指针回到原始对话验证。**强烈建议照抄。**
22. **[事实]** **对不确定的问题要能弃答。** LongMemEval 专门设了 abstention（ABS）能力，用 30 道"false premise"题测模型能否回答"我不知道"。**[推断]** 中文陪伴里等价的做法：记忆里没有的事，**允许角色说"你还没跟我讲过呢"**，而不是编一个。

### 5.5 情绪与关系：可操作设计

23. **[事实]** **情绪抽取和人设抽取共用一条管线。** MemoryBank 的提示词就是 `summarize the user's personality traits and emotions`。**[推断]** 一次 LLM 调用同时产出"用户画像"和"最近情绪"，成本几乎为零。
24. **[事实]** **用事件级 importance 承载情绪权重。** Generative Agents 的 1–10 poignancy 打分（`asking your crush out on a date` = 8）。
25. **[推断]** **不要做单一"好感度数字"。** 理由：(a) 本次调研**没找到任何可信的公开实现**（§4.2）；(b) 数字会诱导用户做数值优化，破坏叙事；(c) 难以向用户解释"为什么掉分"。**替代方案**：用**关系档案**（relationship profile）——一组结构化字段，例如 `关系阶段`、`称呼方式`、`共同经历（带时间戳的事件列表）`、`未解决的伏笔/承诺`、`边界与雷区`。全部走"新增/失效"的边语义（即 Zep 的 edge invalidation **[事实]** 思路），而不是"上下调数字"。
26. **[事实]** **共同经历要能被检索到并被主动使用。** Generative Agents 的 relationship memory 案例：Sam 在公园遇到 Latoya 并记住她在做摄影项目，后来主动问 "Hi, Latoya. How is your project going?" **[事实]** —— **这就是"关系进展"的可观测定义：记得住对方上次提到的事，并在下次主动提起。** **[推断]**
27. **[推断]** **主动发起话题的三个可操作要点**：
    - **触发**：用调度器（如 cron/心跳）在**用户历史活跃时段**触发，而不是固定间隔。用户活跃时段可以从消息时间戳统计得到（你的记忆库本来就有时间戳 **[事实：Zep/MemoryBank 都带时间戳]**）。
    - **内容**：用"关系档案 + 未解决的伏笔/承诺"作为 query 去检索记忆，生成话题候选。**优先捡"用户自己提过但没下文的线头"**，这是最不像机器人的主动搭话方式。
    - **抑制**：必须设置**发送频率上限**和**用户沉默即降频**的规则。Generative Agents 论文本身就有伦理警告，主张要"tuned to mitigate the risk of users forming parasocial relationships" **[事实]**；主动推送是加重该风险的主要手段。
28. **[事实]** **角色区分必须显式做。** PLATO-LTM 用 `role_embed` + `role_token`（`system persona` / `user persona`）防止双方信息串味。**[推断]** 在单 prompt 场景下等价做法：用户记忆块和角色人设块用**不同的 XML 标签**包裹，并在标签名里写清归属。

---

## 6. 中文语境下的长期陪伴：记忆与上下文怎么设计才"便宜又不崩"

### 6.1 先说结论（成本与稳定性）

**核心判断 [推断]**：**"全上下文"在中文陪伴里是最贵的方案，而且是唯一确定会随轮数增长而崩溃的方案**。应该采用 **"短窗口原文 + 分层记忆 + 多路召回 + 读取二次加工"**。

**为什么不能靠长上下文硬扛 [事实]**：
- LongMemEval-S 只有 ~115k token（约 50 个会话），GPT-4o 就掉 **30.3%**，Llama 3.1 70B 掉 **55.1%**；论文判断**历史继续增长还会进一步退化**。
- LoCoMo 实测（平均 300 轮 / 9K token / 最多 35 会话）：**"Employing strategies like long-context LLMs or RAG can offer improvements but these models still substantially lag behind human performance."** **[事实]**
- 论文明确把"lost-in-the-middle"列为长上下文直读的固有弱点。**[事实]**

**为什么"摘要"也不便宜 [事实]**：递归摘要 35.3%（DMR）。**摘要质量会随层级衰减**，而你为每层摘要都要付一次 LLM 调用。

**成本量级（有来源的硬数字）**：
- **Zep 方案**：上下文 **115k → 1.6k token**（约 **1/72**），准确率 +15.2~+18.5 点，延迟降约 **90%**。**[事实]**
- **Mem0**：相对全上下文 **p95 延迟 -91%、token 成本 -90%+**。**[事实]**
- **ChatHaruhi 的实测预算**：检索到的剧本记忆 **≤1500 token**，对话历史 **≤1200 token**，并注明 **1200 token ≈ 中文 6–10 轮对话**。**[事实]** ← **这个数字对你直接有用：中文一轮陪伴对话大致 120–200 token。** **[推断：由该换算推出]**
- **中文 token 效率 [事实，含限定]**：Chinese 的 BPE 分词存在系统性表示问题（`aclanthology.org/2025.cl-3.3/`：token 与语义偏旁不对齐会**系统性腐蚀**汉字表示，且实验发现**单 token 汉字反而更不准**，说明"把词切成长 token"并不能解决问题）。该文**没有给出"每个汉字多少 token"的通用换算**。

> ⚠️ 我**没有找到可信来源**给出"中文每字 X token"或"GPT-4o / Claude 的 prompt caching 折扣比例"的官方数字。搜索命中的相关页面多为 2026 年的第三方博客（`edenai.co`、`ofox.ai`、`morphllm.com`），**来源可疑、无法验证，我不引用**。请你自己按实际供应商的最新定价核算。

### 6.2 推荐架构（分层 + 预算）

**[推断] 我建议的四层结构**（每一层都有来源支撑其必要性）：

| 层 | 内容 | 预算（建议起点） | 依据 |
|---|---|---|---|
| **L0 当前窗口** | 最近 N 轮**原文**，逐字 | **1200–2000 token**（中文约 6–12 轮） | ChatHaruhi 实测 1200 token ≈ 6–10 轮 **[事实]** |
| **L1 今日/本轮摘要** | 当日事件摘要 + 情绪轨迹 | 300–500 token | MemoryBank 的 daily event summary **[事实]** |
| **L2 检索记忆** | 按当前消息召回的记忆单元（原文片段，非摘要） | **≤1500 token** | ChatHaruhi 的 D ≤1500 **[事实]**；LongMemEval 证明**原文粒度优于事实粒度** **[事实]** |
| **L3 全局画像** | 全局事件摘要 + 全局用户画像 | 200–400 token | MemoryBank 组装 prompt 时三者都放 **[事实]** |

**总量约 3–4.5k token / 轮**，与 Zep 的 1.6k 同量级（Zep 只取 top-20 边与实体，更激进）。**[推断]**

**关键点：L0 的原文窗必须保留，不要全量摘要化。** 因为 (a) LongMemEval 证明压成事实会掉点 **[事实]**；(b) 摘要层出错时，原文是唯一能纠错/回溯的依据。**[推断]**

### 6.3 多久总结一次

**[推断] 我给出的方案（融合两个来源的机制）**：

1. **不用固定轮数，用"重要性累积"触发**——照抄 Generative Agents：`Σ importance(最近未总结事件) > 阈值` 才总结，实测约**每天 2–3 次** **[事实]**。中文陪伴的阈值建议按你的对话量重新标定，别直接搬 150。
2. **同时设"兜底时间窗"**：即使重要性不够，**每 24 小时**也要落一次日摘要（MemoryBank 是"日"粒度 **[事实]**），防止低强度但长期的对话彻底丢失。
3. **分层聚合**：日摘要 → 周/全局摘要（MemoryBank 的 hierarchical event summary **[事实]**）。
4. **触发点放在"会话结束/用户长时间未回复"时**做，而不是每轮都做——省调用。

### 6.4 怎么避免"忘事"

**[事实] 有来源的机制**：
- 多路召回（向量 + BM25 + 图邻域）而不是纯向量 **[事实]**
- 多键索引（事实/关键词扩充 key）：recall@k +9.4% **[事实]**
- 被召回的记忆要**强化**（MemoryBank：召回则 S+=1、t 归零，降低遗忘概率）**[事实]**
- 对时间类问题做时间过滤 + query expansion：+6.8~11.3% **[事实]**
- 允许**弃答**（LongMemEval 的 ABS 能力）**[事实]**

**[推断] 我的补充**：
- **"被召回就强化"这条要小心**：它会让高频话题的记忆越来越强、低频但重要的话题（比如用户三个月前提过一次的亲人病史）沉底。建议**在 S 里额外加一个"用户显式标记为重要"的通道**，或者把 importance 也纳入衰减公式的分母（Generative Agents 的 `α_importance·importance` 正是这个作用 **[事实]**）。
- **建立"记忆健康度"看板**：定期统计 召回命中率、记忆条目增长速率、重复条目比例、时间戳缺失比例。这些指标一旦恶化，用户体感就是"她开始忘事了"。

### 6.5 怎么避免"记错"（比忘事更致命）

**[事实] 故障模式与来源**：
1. **覆盖关键信息**：LongMemEval 实测 **"ChatGPT tended to overwrite crucial information as the chat continues"**（ChatGPT 在 GPT-4o 下比读全文掉 37%）。
2. **漏记间接给出的信息**：**"Coze often failed to record indirectly provided user information"**（掉 64%）。LongMemEval 的数据构建**故意**让用户"间接"透露信息（例如不说"我上个月买了新车"，而是问车险，顺带暴露）——**这恰恰是陪伴对话的常态**。**[事实]**
3. **记忆被编造润色**：Generative Agents 实测最常见的错误之一是 **"fabricated embellishments to the agent's memory"**。**[事实]**
4. **检索失败**："failed to retrieve relevant memories" 同为主要错误源。**[事实]**

**[事实] 对抗手段**：
- **边失效而不是覆盖**：新信息不删旧信息，而是给旧信息设 `t_invalid`，保留完整变更史（Zep）。这直接对抗故障模式 1。
- **稀疏检索兜底**：BM25 对抗"间接信息"的漏召回（故障模式 2）。
- **反思必须引用证据指针**：`insight (because of 1, 5, 3)`（Generative Agents）——对抗故障模式 3，因为每条高层结论都可回溯到原始句。
- **检索结果用 Chain-of-Note 二次加工**：+10 绝对点（LongMemEval CP4）——对抗故障模式 4。

**[推断] 我的补充（最实用的一条）**：
> **让角色"复述确认"而不是"假装记得"。** 当检索到的记忆相似度处于中等区间（既不是明显命中也不是明显无关）时，让角色用**提问式复述**（"你上次说的那个……是 XX 对吧？"），而不是直接把记忆当事实陈述。这样：
> - 记对了 → 体验极佳，像真人回忆；
> - 记错了 → 用户会纠正，**而这个纠正本身就是一条高质量的记忆更新信号**，可以写回（走 §5.2 的去重替换流程）。
>
> 这是一条把"记错"从故障转化为数据采集机会的设计。谨慎起见标注为 **[推断]**，我没有找到公开文献直接验证该策略。

---

## 7. 待你人工复核的线索（我无法验证）

以下项**我未能验证**，仅作为线索列出，请你在能访问 GitHub 的环境里自行核对仓库真实性、star 量级、license、最近提交时间：

**记忆/陪伴类框架**
- `github.com/FKGSOFTWARE/MemoryBank`（搜索结果中出现，含提交 `ebd6293` "update readme"；**与论文给出的 `zhongwanjun/MemoryBank-SiliconFriend` 不是同一个仓库**，需确认哪份是官方实现）
- `github.com/getzep/graphiti`、`github.com/mem0ai/mem0`、`github.com/letta-ai/letta`、`github.com/xiaowu0162/LongMemEval`

**中文陪伴/角色扮演**
- `github.com/LC1332/Chat-Haruhi-Suzumiya`
- `github.com/PaddlePaddle/Research` → `NLP/ACL2022-DuLeMon`
- `github.com/THU-KEG/CharacterGLM`（系列）
- `github.com/acgurl/mori`（AgentScope 构建，描述为"用心陪伴"）
- `github.com/xiyuailove/xiyuai`（"溪语 AI"，微信 + Node + SQLite + LLM）
- `github.com/MIKUSCAT/ATRI`
- `github.com/mengnankkkk/AI-memory`
- `github.com/1437649480/miku-hermes-chat`
- `github.com/DasterProkio/awesome-ai-companion` ← **建议优先看这个汇总列表**

**其他**
- `github.com/ArdurAI/agent-memory-almanac`、`github.com/NirDiamant/Agent_Memory_Techniques`（记忆技术汇总，我未验证内容）

---

## 8. 参考来源（全部为本次成功抓取的一手来源）

**记忆机制**
1. MemoryBank / SiliconFriend — AAAI 2024 / arXiv:2305.10250 — https://ar5iv.labs.arxiv.org/html/2305.10250
2. Generative Agents — arXiv:2304.03442 (UIST '23) — https://ar5iv.labs.arxiv.org/html/2304.03442
3. Zep / Graphiti — arXiv:2501.13956 — https://ar5iv.labs.arxiv.org/html/2501.13956
4. Mem0 — arXiv:2504.19413 — https://arxiv.org/abs/2504.19413
5. LongMemEval — arXiv:2410.10813 — https://ar5iv.labs.arxiv.org/html/2410.10813
6. LoCoMo — arXiv:2402.17753 — https://arxiv.org/abs/2402.17753
7. PLATO-LTM / DuLeMon — arXiv:2203.05797 (ACL 2022) — https://ar5iv.labs.arxiv.org/html/2203.05797

**人设 / 角色扮演**
8. ChatHaruhi — arXiv:2308.09597 — https://ar5iv.labs.arxiv.org/html/2308.09597
9. CharacterGLM — arXiv:2311.16832 — https://arxiv.org/abs/2311.16832
10. CharacterGLM (EMNLP 2024 Industry Track) — https://aclanthology.org/2024.emnlp-industry.107.pdf

**中文 / 多语言检索与分词**
11. BGE M3-Embedding（8192 token，100+ 语言，dense/sparse/multi-vector 混合检索）— arXiv:2402.03216 — https://ar5iv.labs.arxiv.org/html/2402.03216
12. Tokenization Changes Meaning in LLMs: Evidence from Chinese — *Computational Linguistics* 51(3):785–814 — https://aclanthology.org/2025.cl-3.3/

---

## 9. 明确"无法验证"清单

| 项目 | 状态 |
|---|---|
| 任何仓库的 **star / fork / 维护状态 / license** | **未验证**（GitHub 不可达），本报告不含任何此类数字 |
| `FKGSOFTWARE/MemoryBank` 与 `zhongwanjun/MemoryBank-SiliconFriend` 哪个是官方 | **未验证** |
| 搜索结果中的中文项目（mori / xiyuai / ATRI / miku-hermes-chat / AI-memory 等）的技术实现细节 | **未验证**，仅列为线索 |
| `ZifaMem`（arXiv `2607.17564`）以及所有 `2607.*` / `2609.*` / `2026.*` 的"论文" | **疑似搜索索引噪音，无法验证，全部未采信** |
| "好感度/亲密度数值"的公开实现 | **在可信来源中未找到** |
| "按时间问候用户"的实现或评测 | **在可信来源中未找到** |
| 中文每字 token 数、各家 prompt caching 折扣比例 | **未找到可信来源**（命中的均为 2026 年第三方博客，来源可疑） |
| LongMemEval §5 中部分具体数值（尤其 knowledge-update 一类） | 抓取正文被截断，**未读取，故未引用** |
| 商业中文陪伴产品（Glow / 星野 / 猫箱等）的内部机制 | **完全未涉及**（无公开技术文献） |
