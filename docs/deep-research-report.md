# 把多年 Web 项目资产做成知识库并尝试副业变现的研究报告

## 结论摘要

你真正要做的，不是单纯把一堆旧文件“塞进 RAG”，而是把多年项目沉淀拆成三种资产：一类是能被 AI 检索到的**证据型内容**，一类是人可以直接浏览和复用的**知识型内容**，一类是未来可以对外售卖的**产品型内容**。按照这个目标看，你现在的路线方向是对的，尤其是你已经意识到“结构化解析、断点续传、双重审计”比“随便喂 Prompt”更重要；但你的方案也明显有一个问题：你太早把自己推向了“自研文档 ETL 平台”，而现成工具已经覆盖了文档结构化、PII 脱敏、本地向量检索、知识库编排和公开化发布的绝大部分能力。citeturn0search0turn0search1turn1search0turn2search1turn3search2

如果你的首要目标是**先把自己的项目资产真正盘活**，我不建议继续沿着“Pandoc + python-pptx + 大模型全量脱敏 + 自写 RAG 服务”一路越写越深。更简洁、也更稳的路线通常是：用统一解析器先把 Office/PDF/图片类文件转成结构化 Markdown 或 JSON，用本地化的 PII 检测和 deny-list 先做确定性脱敏，只把高风险片段交给 LLM 复核，然后把结果接进一个已经做了知识库、流程编排和问答界面的系统里。对于你这种“项目多、格式杂、隐私重、预算敏感”的场景，这比继续堆自研脚本更合适。citeturn0search0turn1search1turn1search13turn2search1turn2search6turn3search9

关于变现，我的核心判断很明确：**不适合直接卖“脱敏后的旧项目文档全集”**，但**很适合卖从旧项目中提炼出来的案例、模板、脚手架、专栏、社群与顾问服务**。公开案例里，真正跑出来的，几乎都不是“卖原始资料”，而是把经验封装成对外可消费的形态：开发模板、精选项目库、技术专栏、系统设计课程、会员社区或带答疑的付费圈子。citeturn21search10turn21search2turn16search3turn8search3turn8search0turn8search1turn8search2

## 对你当前路线的工程评估

你现有方案里，最值得保留的部分有三块。第一，你把“先结构化解析、再脱敏、再审计”放在前面，这是对的，因为主流文档处理链路都强调要先保留文档结构与元数据，再去做分块、检索和后处理；结构感越强，后续 RAG 的可控性越高。第二，你已经意识到需要断点续传与失败重试，这也是正确的工程思路，Tenacity 的设计目标就是给不稳定调用加重试与指数退避，而 SQLite 天生就是轻量、本地、无独立服务进程的状态存储。第三，你做双重审计而不是迷信一次性 Prompt，这和 Presidio 这类“规则 + 模型 + 自定义识别器”的理念是同方向的。citeturn19search23turn5search0turn5search4turn14search0turn14search8turn14search1turn1search0turn1search12

但你的解析链已经有了明显可以压缩的地方。你现在准备用 Pandoc 处理 Word、再用 `python-pptx` 处理 PPT，这在过去是合理的；但到 2025 年底，Pandoc 3.8.3 已经新增了 **pptx 输入格式**，也就是说，如果你安装的是较新版本，PPTX 很多情况下已经不必再单独走一套解析器。除此之外，Docling 和 MarkItDown 也都在官方文档里明确支持 DOCX、PPTX、XLSX、PDF 等多格式输入，并能直接导出 Markdown；其中 Docling 还强调了对版面、表格、图片与本地敏感数据场景的支持。换句话说，你完全可以把“Pandoc + python-pptx + 若干清洗脚本”收缩成“Docling 为主，Pandoc 为补刀，MarkItDown 为轻量备选”的三选一或二选一策略。citeturn20search2turn20search7turn0search0turn0search8turn0search1turn0search16

你现在最容易做错的一步，其实不是 Word/PPT 的解析，而是**设计文件的元数据获取方式**。单靠“文件名 + 同目录说明 + LLM 自动写摘要”当然能跑，但它很脆弱。更好的办法是优先利用文件本身的原生结构：Figma 官方 REST API 可以直接返回文件 JSON、节点与文件元数据；Sketch 官方文档说明 `.sketch` 本身就是 ZIP 包里的 JSON 数据与预览资产；Axure 官方文档支持把项目导出为本地 HTML，而且原型播放器还能暴露页面结构、说明与反馈入口。也就是说，Figma、Sketch、Axure 这三类资产都可以先做**结构性抽取**，再让 LLM 只负责“补齐摘要”，而不是从几行路径信息“凭空猜内容”。citeturn18search2turn18search5turn4search1turn4search6turn4search21

脱敏部分，你现在的思路也偏“LLM 先上”，这会把成本、风险和不确定性一起放大。Presidio 官方文档强调了它可以本地执行 PII 分析和匿名化，并支持自定义识别器、额外语言支持以及 known values / deny-list 机制。这对你尤其关键，因为你要屏蔽的并不只有邮箱、手机号、人名，还包括客户名、内部系统代号、油田名称、局域网网段、项目角色称呼等“组织私有实体”。这类实体最稳定的打法不是 Prompt，而是 **regex + deny-list + 自定义 recognizer** 先做第一轮，再让 LLM 去复核边界模糊的片段。这样既更便宜，也更适合敏感资料。citeturn1search0turn1search1turn1search4turn1search13turn1search16

你计划里按 4000 token 左右切块，这个数对“LLM 脱敏处理”可以接受，但对“RAG 检索切块”通常偏大。Azure AI Search 的官方分块建议是先从 **512 token** 左右和 **25% overlap** 起步，Pinecone 也把“内容感知分块”视为优于纯固定长度切块的通用策略；Docling 官方则直接提供了层级化与混合式 chunker，甚至能在表格切块时重复表头，避免表格上下文在检索中断裂。所以，你可以把“脱敏切块”和“检索切块”彻底分开：前者容许更大块，后者优先结构感和召回质量。citeturn5search1turn5search4turn5search0turn5search12

还有一个细节，我建议你改掉：**不要默认删光图片引用**。如果你的项目文档里有界面草图、架构图、表格截图或流程图，简单删掉 `![](media/...)` 的结果，往往不是“更干净”，而是“把最值钱的上下文删没了”。Dify 的知识流水线文档说明其提取器可以返回图片 URL；RAGFlow 近版本也专门强化了图片与表格和周边文字一起检索的能力。这意味着更好的做法不是“删图”，而是保留图的占位符、标题、说明文字，或者只对关键图做 OCR/VLM 摘要。citeturn13search15turn13search3turn13search10

## 更简洁的实现路线

如果你最在意的是**尽快把内部知识库跑起来**，最省事的不是继续自写一整条流水线，而是直接上一个已经把知识库、解析、检索、工作流和引用都做好的系统。RAGFlow 官方文档明确支持文档、表格、图片和幻灯片等多种数据集类型，强调“基于深度文档理解”的 RAG，并且把引用和解析干预作为默认能力；FastGPT 官方文档则强调复杂 PDF 结构、图片、表格和公式的保留以及输出干净 Markdown；MaxKB 的定位也很清楚，就是“强大易用”的开源企业级智能体平台，支持从知识问答到工作流、Agent 的渐进升级。对于“先自己用、以后可能对外”这种节奏，这一类产品的时间成本通常最低。citeturn13search8turn13search12turn13search0turn2search6turn2search2turn3search9

如果你最在意的是**私有化、可控和长期维护**，我最推荐的是“Docling / Pandoc / MarkItDown 统一解析 + Presidio 本地脱敏 + Qdrant Local + Open WebUI 或 AnythingLLM”。Docling 明确支持本地执行和多格式解析；Presidio 明确支持本地化 PII 识别与匿名化；Qdrant 官方推荐 Python 开发者直接使用 Local Mode；Open WebUI 明确把 Knowledge 作为面向大文档集合的 RAG 组件；AnythingLLM 则支持本地 GGUF，并且官方文档写明默认嵌入是在本地完成的。这个组合的好处是：你只需要维护很薄的一层 glue code，而不是一整套系统。citeturn0search0turn0search1turn1search0turn2search3turn3search2turn3search1turn13search5

如果你已经确定未来会把其中一部分知识**公开化、SEO 化、可分享化**，那就不要把“聊天问答”当成唯一形态。Obsidian Publish 官方把自己的定位写得很直白：发布 wiki、knowledge base、documentation 或 digital garden；Quartz、Material for MkDocs、Docusaurus 也都把 Markdown 驱动、站内搜索、文档与博客共存作为核心能力。对多年项目积累来说，一个带目录、标签、版本、搜索和交叉引用的文档站，往往比只有聊天框的 RAG 更适合作为对外产品和内容母体。citeturn12search4turn12search0turn12search1turn12search2turn12search6turn12search9

综合你的场景，我会这样选：**内部生产力层**用“Docling + Presidio + Qdrant Local + Open WebUI/AnythingLLM”；**外部产品层**只从内部库里挑出可公开内容，导出成 Markdown，再用 Docusaurus / MkDocs / Quartz 或 Obsidian Publish 来做公开站。这样你把“私有资产管理”和“对外知识产品”从一开始就分层了，后面变现时不会被隐私问题反复卡住。citeturn0search0turn1search0turn2search3turn3search2turn12search4turn12search2turn12search6

## 我建议你改造的关键节点

首先，把你现在分散在 `/04_meta_json` 里的元数据，尽量并回到 Markdown 文件顶部的 **YAML front matter**。Pandoc 官方文档明确支持 YAML metadata block，而 Dify、Qdrant、Pinecone、Unstructured 这些现代知识库或检索系统，也都把 metadata 当作过滤、路由、溯源和管理的核心能力。对你来说，统一的 front matter 至少应该包括 `project_id`、`artifact_type`、`project_stage`、`stack`、`year`、`confidentiality`、`source_path`、`public_url` 和 `client_redacted` 这类字段。这样做的好处不是“格式整齐”，而是后面你无论接 Dify、RAGFlow、Qdrant 还是静态站，都更容易迁移。citeturn0search15turn20search8turn19search1turn19search17turn19search0turn19search10

其次，我建议你做**双层索引**，而不是所有文件都一视同仁地切块进库。第一层是“项目卡片”，描述项目目标、行业、关键模块、技术栈、上线形态、你承担的职责、可公开的结果；第二层才是“证据分片”，包括需求文档、部署说明、架构选型、复盘记录、设计说明等。这样做的原因是，Unstructured 和 Docling 这类工具都强调元素级元数据和文档结构，而 Qdrant、Dify、Pinecone 也都强调 metadata filter；你的真实检索需求也明显是“两步走”——先找到合适的项目，再回到具体证据。双层索引比“一锅粥式全文向量化”更符合你的语料形态。citeturn19search23turn19search3turn19search1turn19search0turn19search4turn19search10

再说成本。按 OpenAI 当前官方价格，`text-embedding-3-small` 是 **$0.02 / 百万 token**，`text-embedding-3-large` 是 **$0.13 / 百万 token**，而且官方文档还允许你下调向量维度来减少存储和检索开销。换句话说，就算你的私有语料整理后有 1000 万 token，`3-small` 的 embedding 成本也只有大约 **$0.20**；即便是 5000 万 token，也只是大约 **$1**。对你这种规模来说，embedding 通常不是成本瓶颈，真正贵的是人工整理、错误脱敏和不必要的 LLM 全量重写。如果你非常在意私有化和中英混合检索，BGE-M3 也是很强的本地选项，因为它官方模型卡明确支持 dense、sparse、multi-vector 三种检索功能和 100+ 语言，而 Qdrant 又原生支持 hybrid queries。citeturn1search2turn1search21turn1search14turn1search3turn1search15turn6search3turn6search11

如果你打算再往效果上抠一层，我会建议加**重排器**，而不是继续把 chunk 放大。FastGPT 的升级文档直接指出，Cohere 的 rerank 对中文不如 BGE；而 Cohere 官方文档则说明其 rerank 是面向 100+ 语言的多语种模型。这意味着，对中文占比高、同时又夹杂技术词和项目代号的语料，BGE 系 reranker 往往是更稳妥的默认值；只有在你之后要面向更多跨语种公开内容时，再考虑云端多语种 rerank 服务。citeturn2search14turn6search1turn6search5turn6search16

## 类似人群如何把知识资产做成产品

和你想法最接近的中国案例，不是那种泛泛的“知识管理教程”，而是**行业资料库 / 方案库**。知识星球上的“无忧智库·数字化行业方案库”公开页写得很直接：它面向方案经理、售前工程师、咨询顾问、架构师、项目经理等人群，沉淀了 21 万+ 资料、总量 1T+，核心卖点不是某篇单独文章，而是“历史资料打包索引 + 专题合集 + 模板 + 规范 + 原型 + 开发资源”的组合。知识星球官方帮助文档同时支持预览、分享主题、课程玩法和专栏玩法，这说明中国市场里，“资料库 + 付费社群 + 持续更新”的产品形态已经是成熟路径。citeturn21search10turn15search1turn15search4turn15search7

更偏开发者的案例也很集中。知识星球公开页显示，“芋道源码”这类技术社群已经有 3 万+ 成员，售卖的不只是文章，而是“项目实战、源码解析、视频讲解、文档、答疑、内推与求职支持”的组合；类似的“JavaGuide & 面试交流圈”“码农会锁”等公开页，也都把**项目资料、独家 PDF、源码、1v1 答疑与职业结果**绑在一起卖。这个信号非常重要：开发者知识变现最强的形态，通常不是“卖信息”，而是“卖能落地的结果”。citeturn21search2turn21search3turn21search1

全球市场里，最典型的是**把长期经验压缩成持续更新的专栏、课程和档案**。ByteByteGo 官方站和官方 Newsletter 页面显示，它已经把系统设计知识做成了 100 万+ 订阅读者的 newsletter、付费订阅和课程门户；The Pragmatic Engineer 则公开写到自己已经超过 100 万订阅者，并且有“数以万计的付费订阅者”，付费内容是长期、深度、可操作的工程文章。这类产品本质上不是“把笔记公开”，而是持续把经验压缩成读者愿意反复付费的结构化输出。citeturn16search3turn16search4turn16search1turn8search3turn8search6turn8search12

另一条和你尤其接近的路，是**把反复做过的项目能力做成模板或脚手架**。ShipFast 官方首页写得很清楚，它卖的是“支付、数据库、登录、UI 组件等一套完整 startup boilerplate”；Marc Lou 公开说过它是把自己过去两年反复用过的代码收拢成一个产品，Indie Hackers 还把它列为“60 天收入 6.3 万美元”的公开案例。Supastarter 的官方站点和文档也把“认证、支付、多租户和 SaaS 基础设施”作为主要卖点，Indie Hackers 对它的报道则给出过“约 1.2 万美元 / 月”的量级。Refactoring UI 则是另一种形态：它把开发者和设计经验做成面向工程师的书和视觉知识产品。你过去多年 Web 项目积累里最容易卖的，往往也不是历史文档本身，而是“你反复做对了哪些模块，能不能打包给别人直接复用”。citeturn8search0turn7search1turn7search9turn8search1turn8search5turn7search28turn8search2

把这些案例放在一起看，会得到一个很稳定的规律：**成功变现的，不是原始档案，而是经过筛选、重写、可直接使用的“判断力产品”**。判断力可以被包装成资料库、教程、专栏、模板、脚手架、答疑或顾问服务，但很少以“脱敏文档原件”原样售卖。对你来说，这个规律既是机会，也是边界。citeturn21search10turn16search3turn8search0turn8search2

## 是否适合做成副业

我的判断是：**适合，但适合的是“案例化、模板化、社群化、顾问化的副业”，不适合的是“大而全的原始知识库订阅”**。原因很简单。第一，你的资料天然有隐私和行业上下文门槛，直接卖原件会严重受限；第二，真正能打动用户付费的，通常不是“我资料很多”，而是“我帮你节省了多少试错时间、给了你哪些现成成果”。公开案例里，无论是知识星球资料库、ByteByteGo、The Pragmatic Engineer，还是 ShipFast / Supastarter，都是围绕这个逻辑在卖。citeturn21search10turn21search2turn16search3turn8search3turn8search0turn8search1

如果你走中文市场、并且愿意做持续答疑和更新，知识星球是很合适的容器，因为它原生支持付费预览、主题分享、课程玩法和专栏玩法，已经有大量技术类与资料库类产品在跑。若你更适合卖一次性交付，比如“项目复盘合集”“中后台模板”“权限系统/地图系统/工作流模块脚手架”“行业方案包”，Gumroad 更像是一个轻量的售卖工具，但它对直链成交收 **10% + $0.50**，通过平台发现成交则会到 **30%**，所以它更适合你有自己的流量来源时使用。citeturn15search1turn15search4turn15search7turn17search0turn11search2

如果你更偏向持续写作和英文或双语传播，Substack 是更成熟的“内容即产品”平台。它官方写明创作者可保留 **90%** 收入；官方功能页强调推荐、Notes、referrals 等站内增长机制；官方“going paid guide”还给出了一个很关键的参考：免费用户到付费用户的转化，通常以 **5%–10%** 作为区间和努力目标。换句话说，内容订阅模式并不是不能做，但它极度依赖**稳定输出和持续获客**，更适合你愿意长期写作，而不是只想一次性整理资料。citeturn17search5turn17search17turn15search6turn15search3turn17search13

如果你愿意把其中一部分能力开源，比如抽象出来的组件库、项目模板、解析工具链或部分公开案例库，GitHub Sponsors 是非常好的补充层。官方文档写明，个人账户获得的赞助没有平台手续费，而且你可以设置月度与一次性 tiers，并把“提前访问、周报、README 露出”等作为回报。对你来说，它不一定是主渠道，但很适合作为“公开样板 + 社群支持”的配套收入。citeturn17search3turn17search11turn11search0turn15search5

因此，如果你问“是否适合做成副业”，我的答案是：**适合度中高，但前提是先把产品定义从‘知识库’改成‘可直接使用的经验产品’**。更务实的顺序应该是：先做只给自己用的私有知识库；再从查询日志和高频问题里筛出一个最窄的公开主题；接着用一个低价、边界清晰的单品去验证，比如专题案例包、模板、脚手架或带目录的方案库；只有当这个单品有人买、有人问、有人续费时，再往上叠社群、专栏或顾问服务。你最值得卖的，不是你“存了多少文档”，而是你“能把哪些混乱项目经验压缩成别人立刻能用的结果”。citeturn21search10turn21search2turn16search3turn8search0turn17search13turn17search0turn17search3