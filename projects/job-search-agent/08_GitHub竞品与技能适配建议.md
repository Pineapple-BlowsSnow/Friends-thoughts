# 求职 Agent 的 GitHub 竞品与技能适配建议

现已保留授权、证据评分和逐岗确认规则，将设计升级至 v0.3：先交付中文求职准备 Skill，独立投递管理后台按后续阶段实现。优先参考 JobOK 的经历证据组织、JobSync 的公开职位源与工作台、Reactive Resume 的简历编辑；JobOps 和 jobApplier 适合参考局部产品机制。

这里的“你的技能”按已安装的 Agent Skills 和此前确定的工具分工理解。它们可以帮助开发和使用产品；求职者本人掌握的职业技能仍应来自其确认的简历事实。核验日期为 2026 年 10 月 3 日。本轮查阅了公开 README、许可、默认分支提交和部分源码，没有安装或运行竞品。

## 你的现有工具如何接入

| 现有能力 | 适合承担的工作 | 接入方式与验收重点 |
| --- | --- | --- |
| Kimi Code 与 Grok CLI | 实现与独立审查 | 本机实测 Kimi 2.1.1、Grok 1.0.46；按既有分工由一个工具编辑，另一个审查同一份源文件 |
| arkcli resources、chat、understand | 可选模型供应商接入、文本及图片理解 | Skills 文件已存在；先核验实际 endpoint、模态、结构化输出和数据处理设置，再封装网关。未验证账户额度或当前模型权限 |
| documents、pdf | 中文简历导入、DOCX 与 PDF 生成 | 利用现有文档 Skills 做开发及验收；生产中封装解析和渲染服务，检查中文字体、分页、可提取文本与附件哈希 |
| Playwright | 表单 fixture 回归和允许的辅助填写 | 限定来源、域名、字段和动作。上传与填写都可能披露个人信息，必须满足独立授权；验证码转人工 |
| Pages 与既有 Obsidian 工作习惯 | 经历证据、岗位分析、复盘材料 | 作为用户可审阅的知识材料；投递状态、审批和幂等由后台数据库保存 |
| spreadsheets | 漏斗、成本和效果导出 | 导出脱敏聚合；表格修改不直接改变申请状态或批准提交 |

工具分工沿用此前记录，本轮只重新验证了两个 CLI 版本，没有复核订阅权益。Gemini 适合集中研究、DeepSeek 或 Ark API 适合批量提取的分工是既有偏好；实际供应商仍需通过隐私和合同测试。不能把终端会员权限当作可直接嵌入生产服务的 API 权限。

## 最值得参考的项目

| 项目与定位 | 借鉴价值 | 对你的选择建议 |
| --- | --- | --- |
| [JobOK](https://github.com/GresonKwan/JobOK)，中文本地求职 Skill | Intake、经历资产、证据到岗位信号、简历版本、面试故事、复盘 | 最适合参考 Skill 入口。MIT；评分脚本只做关键词初筛，必须接入我们自己的硬条件与证据评分 |
| [JobSync](https://github.com/Gsync/jobsync)，自托管求职工作台 | Greenhouse、Lever、Ashby 职位发现，先初排后模型分析，简历管理、确认卡和 MCP | 最适合评估工作台及只读连接器组件。MIT；不能据此认定整套产品已满足我们的外发、加密和分布式频控要求 |
| [Reactive Resume](https://github.com/reactive-resume/reactive-resume)，简历编辑与求职管理 | 简历模板、申请看板及日历、求职信库、AI 修改逐条审查 | 最适合评估简历编辑组件。MIT；简历保存审批与向招聘方提交是两种独立批准 |
| [JobOps](https://github.com/DaKheera47/job-ops)，职位发现到申请跟踪的完整工作台 | JD 事实审查、评分异常、材料生成、邮件归属复核 | 借鉴产品流程并独立实现。许可为 AGPLv3 加 Commons Clause，收费服务复用有明确限制；默认抓取及遥测需要重新选型 |
| [jobApplier](https://github.com/17nbist/jobApplier)，浏览器辅助填表 | 改写真实性检查、前后对照、敏感字段隔离、脱敏故障回归 | 借鉴检查思路。未发现 LICENSE，不能把公开源码当成已取得复用许可；浏览器权限也需收窄 |

JobOK 的默认分支 HEAD 为 [c5da0c6](https://github.com/GresonKwan/JobOK/commit/c5da0c6a6c9936b640a202c78cdd6e64b2981ba6)，提交日期 6 月 18 日；JobSync 为 [ef3d7ee](https://github.com/Gsync/jobsync/commit/ef3d7eec5c9aebaa1c6e03fc3ddd62d7dca8e37f)，9 月 27 日，属于发布提交。JobOps 默认分支 HEAD 为 [c28b90a](https://github.com/DaKheera47/job-ops/commit/c28b90a5fba75f298cb1d6a49460ddf009808715)，9 月 17 日；最近实质代码提交是同日的 [b8412b1](https://github.com/DaKheera47/job-ops/commit/b8412b14789ead6347fc3d82fdeb29096227a159)。这里采用默认分支提交日期，未将 stars、仓库更新时间或 pushed_at 当作质量与运行效果证据。

Reactive Resume 默认分支 HEAD 为 [b53c43c](https://github.com/reactive-resume/reactive-resume/commit/b53c43c3722741946603ac46beda173931aeb646)，9 月 30 日；9 月 28 日的 [1b78e54](https://github.com/reactive-resume/reactive-resume/commit/1b78e546e22d835fead10552e81bc259a1eeaf45) 增加面试排期和日历。MIT 以其 [LICENSE](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/LICENSE) 为据。

## 源码核查改变了哪些判断

### JobOK 的证据组织值得借鉴 评分器需要替换

JobOK 将真实经历、优势、岗位假设、JD、简历版本和面试故事分别存放，适合你已经习惯的本地材料工作流。其 [Skill 工作流](https://github.com/GresonKwan/JobOK/blob/c5da0c6a6c9936b640a202c78cdd6e64b2981ba6/SKILL.md) 明确不编造、不自动投递，缺证据内容进入待补状态。

但 [score_job_matches.py](https://github.com/GresonKwan/JobOK/blob/c5da0c6a6c9936b640a202c78cdd6e64b2981ba6/scripts/score_job_matches.py) 以词项交集计分，硬条件也主要按词重合处理；现实约束缺信息时仍有默认分。这不能证明满足工作许可、必需资质或薪资底线。建议借其目录和访谈结构，保留我们 v0.2 的硬条件三态、分数上下界、覆盖率和事实引用，不合并两套分数。

### JobSync 的采集分层最贴近当前边界

[ATS 处理流程](https://github.com/Gsync/jobsync/blob/ef3d7eec5c9aebaa1c6e03fc3ddd62d7dca8e37f/src/lib/scraper/automation-run/atsRun.ts) 先去重及廉价排序，再对 top K 做模型分析；[职位持久化](https://github.com/Gsync/jobsync/blob/ef3d7eec5c9aebaa1c6e03fc3ddd62d7dca8e37f/src/lib/scraper/automation-run/persist.ts) 有数据库唯一约束兜底并发重复。这些机制可以降低模型成本和采集重复。

建议将廉价排序只用作计算调度。没有完成完整评估的职位标记为未评估或延后评估，展示被跳过数量和重新评估入口；不能记为低匹配。职位去重也不等于提交幂等，后者仍须按本设计的申请周期、冻结 operation 和外部接收证据处理。

[加密工具](https://github.com/Gsync/jobsync/blob/ef3d7eec5c9aebaa1c6e03fc3ddd62d7dca8e37f/src/lib/encryption.ts) 使用 AES 256 GCM，其 README 将用途描述为设置中的 API Key 加密；这不能证明简历、备份、向量及日志全都已加密。[MCP 频控](https://github.com/Gsync/jobsync/blob/ef3d7eec5c9aebaa1c6e03fc3ddd62d7dca8e37f/src/lib/mcp/rate-limit.ts) 使用进程内 Map，多实例部署时还需共享限流与失败时关闭外发的规则。

### JobOps 的工作台值得看 队列和许可不能误判

[scorer.ts](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/src/server/services/scorer.ts) 将 JD 事实修正与个人适配评估拆开，评分失败可保留 null；[评分步骤](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/src/server/pipeline/steps/score-jobs.ts) 区分单项失败和系统故障；[邮件复核](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/src/server/services/post-application/review/service.ts) 保留人工关联。这些可以转成我们的步骤状态、供应商熔断和邮件复核箱。

源码里的 [job-queue.ts](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/src/server/infra/job-queue.ts) 当前只有 PDF 重生成任务，[内存实现](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/src/server/infra/job-queue-memory.ts) 使用 Map，不能当作持久投递队列移植。[JobSpy 采集器](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/extractors/jobspy/scrape_jobs.py) 默认包含 Indeed 和 LinkedIn；[页面入口](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/orchestrator/index.html) 加载外部 Umami。[LICENSE](https://github.com/DaKheera47/job-ops/blob/c28b90a5fba75f298cb1d6a49460ddf009808715/LICENSE) 的 Commons Clause 限制软件价值构成实质部分的收费 hosting、咨询与支持服务。建议将其作为流程参考，不选作收费产品的直接 fork 底座。

### Reactive Resume 可借编辑审批 可读性检查和工作台

[agent tools](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/packages/api/src/features/agent/tools.ts) 的简历 patch 带基础版本校验，审批开关开启时才要求批准；[审批卡](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/apps/web/src/routes/agent/-components/patch-approval-card.tsx) 显示修改摘要、操作和拒绝理由。建议采用相似预览体验，固定要求审阅涉及事实的修改。JSON Patch 的 from 是对象路径，不能把它当成事实出处；我们仍需 fact_ids 和原始材料引用。

[申请详情面板](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/apps/web/src/features/applications/components/application-detail-sheet.tsx) 可以参考为左侧队列、右侧证据与材料的工作台；拖动结果列只记录人工声明，平台确认仍须回执。[客户端 PDF 解析](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/apps/web/src/features/ats-checker/extract-client.ts) 适合投前检查文件类型、密码和文本可提取性。这类检查不能预测雇主 ATS 排名。[insights.ts](https://github.com/reactive-resume/reactive-resume/blob/b53c43c3722741946603ac46beda173931aeb646/apps/web/src/features/applications/insights.ts) 按当前阶段推算漏斗；建议改用固定申请批次、实际事件和观察窗口，避免漏掉面试后被拒等历史。

### jobApplier 的真实性检查可转为中文回归样例

[tailor-core.js](https://github.com/17nbist/jobApplier/blob/d025a1c6bc09a7cfbbe3580ad4a3638b110366bb/tailor-core.js) 检查新增技能、数字、日期、来源关联和跨经历借用，说明“存在来源标签”并不等于改写主张得到支持。建议独立实现中文检查：每条经历绑定原事实，不能把参与改成主导，不能把 A 项目成果移给 B 项目，不能拿电话号码里碰巧相同的数字证明业绩。

[config-engine.js](https://github.com/17nbist/jobApplier/blob/d025a1c6bc09a7cfbbe3580ad4a3638b110366bb/config-engine.js) 和 [tracker.js](https://github.com/17nbist/jobApplier/blob/d025a1c6bc09a7cfbbe3580ad4a3638b110366bb/tracker.js) 提供脱敏填表故障记录思路。我们应优先将失败页面做成本地 fixture 验证；清空表单值仍可能留下正文中的个人信息，快照需二次脱敏。该项目 [manifest](https://github.com/17nbist/jobApplier/blob/d025a1c6bc09a7cfbbe3580ad4a3638b110366bb/manifest.json) 的宽域名和 nativeMessaging 权限也不宜照搬。

## 建议加入下一版的具体改动

| 优先级与改动 | 对现有交付的影响 | 新增验收 |
| --- | --- | --- |
| P0 中文求职 Skill 入口 | 将 Intake、事实确认、JD、材料预览分为明确任务，复用现有 JSON 合同；模型不持有提交凭证 | 未确认经历不能参与生成；贴入 JD 保留“用户提供”标签，职位真实性另行核验 |
| P0 两阶段筛选和预算 | 工作流增加成本较低的调度排序及 top K 配额；多维完整评分规则不变 | 未评估不能变成 LOW_MATCH；用户能看到跳过原因、数量和重评入口；离线检查高匹配召回损失 |
| P0 独立真实性审查 | 在材料确认前检查事实、数字、责任级别和跨项目引用 | 真来源假推论、电话数字当业绩、项目成果串用、未证实新技能全部阻断 |
| P0 草稿修改与外发审批分开 | 可逐条接受或拒绝简历 patch；新增主张回到事实确认；外发仍绑定完整冻结载荷 | 接受草稿 patch 不产生提交许可；改动冻结材料使原批准失效 |
| P0 投前简历可读性检查 | DOCX 与 PDF 渲染后提取文本，对照姓名、关键经历、数字和中文字符；预览分页 | 字体缺字、扫描件无可提取文字、乱码、裁切、密码文件及空页均提示修复；不宣称预测 ATS 排名 |
| P1 未明确归属邮件的复核箱 | 状态跟踪增加关联或忽略入口；记录决定者、时间和修订事件 | 同公司多个岗位不凭公司名自动归属；并发复核不能重复改变状态 |
| P1 面试故事与补证据任务 | 将已确认经历用于 STAR 故事和缺口清单 | 每个故事引用事实 ID；补证据任务不能自动生成新经历 |
| P1 来源及运行成本看板 | 增加每来源去重率、失效职位率、解析失败、待评估、模型成本和人工接管率 | 正文与密钥默认不入日志；评分失败与低匹配分别统计 |
| P1 按历史事件计算效果 | 面试率及回复率采用已确认提交批次与固定观察窗口；事件迟到和更正可重算 | 面试后被拒仍计曾面试；UNKNOWN 与用户自报分别展示，不用当前列人数倒推转化 |

这些建议已纳入 v0.3 的 PRD、工作流、Schema、提示词和验收指标；本地准备原型及其已验证范围见09交付记录，正式来源和外发仍按阶段验收。新增的未评估、延后和失败状态应属于评估任务，不能直接混入现有申请状态机。对面试故事、低匹配补强及人工操作时间的统计，也不应将不确定推断展示为事实。

建议的数据扩展为 `evaluation_run`、`document_patch`、`evidence_request`、`mail_review_item`、`interview_story`。它们分别保留用户归属、关联职位及版本、状态、依据事实 ID、决定者与时间；`evaluation_run` 另存筛选版本、入选或延后原因、模型版本和实际成本。模型出错记失败或未知，不以 0 分代替。待 Schema 变更时再补约束及迁移，不在本报告里声称已实现。

## 适合你的实施顺序

第一阶段做本地中文 Skill 的真实材料闭环：用户提供 JD 和简历，确认事实，解释匹配，产出可预览 DOCX 与 PDF，并手工记录结果。先用一组获授权的材料检验中文表达、事实真实性和人工节省时间。此时产品明确标为准备与手工跟踪。

第二阶段接公开职位读取、去重、预算排序及复核工作台。优先选择用户关注公司的官方 board，不从“大平台全部覆盖”起步。后台保留持久状态、加密、日志及最小权限；长任务编排是否上 Temporal 可待实际规模决定。

第三阶段只接具有正式提交权限的渠道。接入外发前必须实现持久队列、事务 outbox、最终派发闸门、固定 operation 幂等、撤权、UNKNOWN 对账，并执行真实沙箱与并发验收。用户确认不会补足平台提交权限。

公开职位读取与提交权限的差别已有官方证据：Greenhouse 的 GET 无需认证，提交 POST 需要 Job Board Key；Lever 提交需要账户管理员生成的 Key；Ashby 公开职位 API 提供申请页 URL，不能据此推导已获提交许可。未知权限下使用正式申请页，并按许可辅助或人工操作。[Greenhouse 文档](https://docs.greenhouse.io/job-board.html)、[Lever 文档](https://github.com/lever/postings-api/blob/master/README.md)、[Ashby 文档](https://developers.ashbyhq.com/docs/public-job-posting-api)

## 本轮没有选为底座的项目

| 项目 | 原因 |
| --- | --- |
| [原 AIHawk](https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk) | 当前重定向为 [invisible_playwright_mcp](https://github.com/feder-cr/invisible_playwright_mcp)，已转为反检测浏览器 MCP；旧求职教程不能代表现状。当前 MIT 与此前 AGPL 分发历史也需分别处理 |
| [auto-applier](https://github.com/jhomer192/auto-applier) | 候选人专用自动投递和 standing approval 与本项目逐岗批准不符；未发现明确 LICENSE。仅参考错误分类与官方职位读取思路 |
| [OpenResume](https://github.com/xitanggg/open-resume) | 可参考解析；[源码](https://github.com/xitanggg/open-resume/blob/4f8255a2c763479837f69f1dccf2a3338730cd79/src/app/lib/parse-resume-from-pdf/index.ts) 明确针对英文单栏简历，不能当作中文解析已验收。AGPL 3.0，默认分支最近提交为 2024 年 10 月 29 日 |
| [JobSpy](https://github.com/speedyapply/JobSpy) | MIT；[统一字段](https://github.com/speedyapply/JobSpy/blob/83efd3d2ee7fce72d2b4cc4adb670f7e2b0e0e6b/jobspy/model.py) 和薪酬来源可参考，但多平台抓取与代理处理路线不能替代逐源授权。MIT 代码许可不赋予职位平台访问许可 |

## 研究自检与未验证项

已核对推荐方向与 v0.2 的核心边界：硬条件优先、低匹配默认不投、逐岗批准、上传与填写的披露范围、来源权限分离、冻结材料哈希、未知接收状态、外部回执证据。独立流程复审确认上述建议在这些澄清下兼容现设计。

v0.2 的 205 项离线自检在前一轮通过；v0.3 增量合同及本地独立原型测试见09交付记录。本轮未运行竞品。README 只能说明作者声明，部分源码只能证明所读路径；竞品安装、运行、中文排版、实际连接器、隐私设置、密钥轮换、故障恢复和 ToS 适用性仍未验收。建议下一步先做小规模 Skill 原型，再依据实际失败决定是否移植 MIT 组件。页面和报告保存也不代表产品已接通或能够自动投递。
