# 任务合同与判定

正式合同见随包提供的 [model-contracts.schema.json](model-contracts.schema.json)，数据库约束见项目的 04_数据Schema.md。当前脚本只接受明确包装的本地输入，并额外执行下列语义检查；它不加载外部 Schema，也不接受模型选择任务或合同。

`jd_parse → JDParsed`，`match_evidence → MatchEvidence`，`application_draft → ApplicationDraft`，`draft_review → DraftReview`，`status_classify → StatusClassification`，`document_patch → DocumentPatchProposal`，`evidence_request → EvidenceRequestDraft`，`interview_story → InterviewStoryDraft`。按任务验证受限的 `$defs`，不能只验证允许完整服务状态的根合同。模型只生成 proposal/draft，不能产生 ACCEPTED、CONFIRMED 或 VERIFIED。EvaluationRun、审批、复核决定及持久状态只由可信代码创建。

六维为 skills 30、responsibilities 25、seniority 15、domain 10、conditions 10、goals 10，总分母固定100。rules 中每个子项都对应真实 JD requirement_id，按维求和不得超过该维权重；JD 未提供的维度或剩余权重保持 unknown，不能为填满权重捏造岗位要求。证据每个要求最多一项，supported 为 1，partial 为 .25/.5/.75，unsupported 为 0 且引用 negative 事实，unknown/conflict 为 null。只有已确认无冲突事实和本人核实的映射才能成为已知项。缺失、冲突、未核实或失败都不默认赋 0。

low 为已知权重乘匹配值之和；high 为 low 加未知权重；coverage 为已知权重除 100。明确硬 fail 优先 BLOCKED；关键 unknown 或冲突为 NEEDS_INFO；全部硬 pass、low≥80、coverage≥.85 为 HIGH_MATCH；high<60 为 LOW_MATCH；其余 REVIEW。规则的硬条件也须由明确 JD 或本人设置确认。HIGH_MATCH 只表示待审推荐，没有外发许可。

材料 claim 的坐标使用 Unicode code point。每个非空白事实性正文字符必须受 claim 覆盖，每个 claim 引用当前用户的确认事实；原句模式须等于所引事实的完整文本，不能通过截掉否定词获得支持。截取、改写、翻译或缩写继续人工核实，规则检查不能证明语义蕴含。规范文本哈希与原文件哈希分开；本地 SHA 256 摘要不是个人数据匿名化证明。

JD 的每个 explicit must_have 都必须进入 hard_checks，不能靠删规则消除阻断。supported/partial 仅用正向支持事实；negative 是本人明确确认不满足要求的证据类型，不是按句子中是否有否定词判断。简历项目经历段必须有明确的 section_projects 归属；带雇主、职位或其他事实的非通用标题继续人工审查，原句正文不能替标题背书。

事实快照哈希随确认与冲突变化。旧评分与旧材料不能在快照变化后直接使用。脚本拒绝陈旧 draft 的审查和 patch；用户应基于最新已确认事实重新生成候选。手工输入或拖动申请列只代表本人声明，不能创建 API 接收证据。
