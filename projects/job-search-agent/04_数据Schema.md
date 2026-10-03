## 数据 Schema

以下为逻辑关系模型。配套 model-contracts.schema.json 给出模型和连接器事件的 JSON Schema；数据库实现仍须加入这里的外键、唯一约束、权限策略、状态转换和事务检查。JSON Schema 校验通过不等于允许投递。结构层验证类型、必填、格式、枚举、证据等级、状态组合及 ID 列表防重；服务端语义层仍须验证事实归属和真实性、原文哈希与引用范围、唯一 section/claim ID、完整 claim 覆盖、保留 section_id、薪资 min≤max、审批时间顺序与跨对象归属、六维唯一及权重求和、分数重算、路由、问题版本和状态转换。解析结果为空或关键证据缺失时进入 NEEDS_INFO，不让模型为了满足 Schema 伪造要求。

所有实体主键为 UUID，时间为 UTC timestamptz；用户时区用于显示和日配额边界。金额为整数 minor unit，并含币种和周期；字段未知用 null 与 reason 表达，不能用 0、空字符串或猜测值。除公开源模板外，所有记录携带 user_id，跨租户外键使用复合键防止串库。version 为正整数；内容哈希为 SHA-256；凭证仅保存 secret_ref。source_span 以 Unicode code point 表示文本位置，end 不含边界；原始文件哈希 raw_sha256 与规范原文文本哈希 source_text_sha256 分开保存。

| 实体 | 关键字段 | 关系与约束 |
| --- | --- | --- |
| users | id、timezone、region、account_state、created_at | 一位求职者一个安全边界 |
| preference_versions | id、user_id、version、hard_constraints、dimension_weights、thresholds、budget | 用户配置版本不可变；权重合计 100 |
| grants | id、user_id、resource、purpose、read_scope、write_scope、recipient、legal_basis、notice_version、expires_at、revoked_at | 每个用途和资源单独授权，secret_ref 不记录明文 |
| sources | id、user_id、type、allowlist、grant_id、collect_allowed、prefill_allowed、upload_allowed、submit_allowed、tos_url、tos_digest、reviewed_at、review_due_at、rate_policy、cursor、status | 四种有效能力默认 false；非 enabled 全为 false，配置历史由版本保留；过期审查暂停；URL 重定向亦校验 |
| job_occurrences | id、source_id、external_id、source_url、canonical_job_id、first_seen、last_seen | UNIQUE(source_id,external_id)，保留多来源 |
| canonical_jobs | id、user_id、employer_identity、requisition_id、canonical_apply_target、status、current_version_id | 同雇主明确 requisition 才可确定合并；canonical_apply_target 保留必要职位参数 |
| job_versions | id、job_id、version、raw_blob_ref、raw_sha256、parsed_jd、source_text_sha256、text_mapping_ref、parse_version、published_at、source_updated_at、fetched_at、closed_at | UNIQUE(job_id,version)，不可变，原文证据坐标对应 source_text_sha256；保留文本与 raw_sha256 原始文件的坐标映射 |
| dedup_decisions | id、user_id、occurrence_ids、candidate_job_ids、features、confidence、decision、actor、created_at | 合并与拆分均留历史；投递后拆分不能解除历史防重约束 |
| resume_versions | id、user_id、version、language、blob_ref、sha256、parsed_text_ref、confirmed_at | 文件加密存储；原版本不改写 |
| candidate_facts | id、user_id、kind、value_encrypted、source_resume_id、evidence_span、valid_from、valid_to、confirmed_by、confirmed_at、supersedes_id、conflict_group | 仅 confirmed 且无冲突事实可写入材料，来源缺失需用户声明记录 |
| match_results | id、user_id、job_version_id、fact_snapshot_hash、preference_version_id、scoring_version、hard_checks、dimensions、score_low、score_high、coverage、route | 0≤low≤high≤100；coverage∈[0,1]；路由由代码计算 |
| artifacts | id、user_id、job_version_id、type、blob_ref、sha256、template_version、model_run_id、review_state | type=resume 或 cover_letter；不可变，不能跨用户复用 |
| artifact_claims | id、artifact_id、output_span、claim_text_hash、fact_ids、jd_requirement_ids、transformation | 每个事实性表达须有事实来源；句子 hash 防止修改后引用错位 |
| applications | id、user_id、canonical_job_id、application_cycle、job_version_id、match_id、channel、target_ref、payload_hash、execution_state、recruitment_state、row_version、not_before、priority | UNIQUE(user_id,canonical_job_id,application_cycle)，所有渠道共用 |
| application_payloads | id、application_id、version、artifact_ids、questionnaire_schema_ref、questionnaire_schema_hash、questionnaire_version、answers_encrypted、answers_sha256、privacy_notice_version、privacy_choices、operation_scopes、recipient、policy_version、payload_hash | UNIQUE(application_id,version)，审批后冻结，不把临时 URL 纳入 hash |
| approvals | id、user_id、application_id、payload_id、payload_hash、decision、actor、approved_at、expires_at、revoked_at、consumed_at、policy_version、exception_reason、operation_scopes、questionnaire_schema_hash | approve 必须来自本人会话；只绑定一个冻结 payload；用于同一申请，不跨申请重用 |
| submission_operations | id、user_id、application_id、payload_id、channel、target_ref、idempotency_key、state、permit_epoch、send_admitted_at、closed_at | 同申请最多一个未关闭 operation；同冻结操作重试复用 key，结果未知不创建新操作 |
| submission_attempts | id、application_id、operation_id、attempt_no、dispatch_token、payload_hash、started_at、finished_at、transport_status、external_receipt_id、receipt_blob_ref、error_code、reconciled_at | UNIQUE(operation_id,attempt_no)，每操作仅一个 active attempt；凭证参数不进日志 |
| outbox | id、user_id、application_id、payload_id、operation_id、event_type、event_version、state、dispatch_token、lease_until、created_at | UNIQUE(application_id,event_type,event_version)，过期租约须对账 |
| quota_reservations | id、user_id、application_id、operation_id、bucket_key、window_start、reserved_at、settled_at、outcome | 原子保留用户、雇主和源限额；unknown 不退额度 |
| status_events | id、user_id、application_id、event_type、stage、round、evidence_type、source_namespace、source_event_id、evidence_ref、evidence_sha256、confidence、occurred_at、observed_at、supersedes_id、confirmed_by | UNIQUE(user_id,source_namespace,evidence_type,source_event_id)，事件可修正且不可静默删除 |
| model_runs | id、user_id、task、model_id、prompt_version、input_digest、output_digest、token_usage、cost、validator_result、created_at | 避免默认落原始提示全文；需诊断的正文加密且短期存储 |
| audit_events | id、user_id、sequence、actor、action、resource_ref、before_digest、after_digest、reason_code、trace_id、previous_hash、event_hash、created_at、retention_until | 按用户链或分区链追加；签名检查点异地保存，哈希链本身不能防整链重写 |
| privacy_requests | id、user_id、type、requested_at、state、due_at、processors、legal_hold_reason、completion_receipt | type=export、correct、delete、revoke；分跟踪在线、备份及第三方副本 |

### 关系与运行不变量

user → grants、sources、preferences、resumes；source → occurrences → canonical_job → versions；resume → facts；job_version + fact_snapshot + preference_version → match；match → artifacts 与 claims；application → payload → approval；application → submission_operations → attempts；application → status_events。审计以 resource_ref 关联以上对象，正文不冗余复制。

每次外部披露须按实际动作核验权限：prefill、独立 upload、submit 分别对应连接器能力及审批 operation_scopes；最终 API/邮件提交中的附件包含在 submit 载荷内。还须账户启用、相关 grant 有效、连接器 state=enabled 且审查未到期、岗位未关闭、无禁止条件、质量审查通过、本人 approve 与同一 application/payload 绑定、审批未过期或撤销、唯一 active operation 和当前配额有效。共享 Schema oneOf 校验通过不授予这些权限。评分更新不自动改冻结申请；影响申请的变化必须生成新 payload 并重新确认。

ApprovalBinding 是审批创建合同，consumed_at 属于持久化实体；同 operation 的安全重试可引用原审批，但每次新披露仍须完整复验有效期。审批记录不可由模型创建；数据库状态写入采用条件更新，服务端检查 row_version、授权 epoch 和唯一 active operation。提交器和审批服务使用分离角色；审计写入角色无更新删除权，隐私处理角色按期限进行受控清理。

job_occurrence 的跨源合并和拆分需同步检查所有相关申请历史；发现身份冲突暂停，不以重建 canonical_job_id 绕过防重。候选人的并行任职时间按相关天数并集计算年限，不能累加得到虚假资历。

### 保留与删除建议

建议默认：调试原始输入 7 天，采集原始邮件或 JD 快照 30 天，职位元数据 180 天，申请材料与状态证据 365 天，必要的脱敏审计 365 天；用户可选择更短期限。确认包依赖的证据在申请存续期可按告知用途继续保存，其他无必要的快照删除。上述期限不是法定统一要求，须按用途、地区、条款和用户选择调整。

撤权立即停止签发新的读取与披露许可，取消未获许可任务；已获许可的在途调用单独记录并对账，不承诺从本地撤权瞬间撤回外部请求。删除请求目标为 7 天内清除在线副本、向受托方发起删除、备份在 30 天轮换内清除或销毁相应加密密钥，并防止恢复备份重新带回已删除记录。法律保留例外必须记录依据、范围、期限及访问限制。审计仅保留必要的去标识元数据；哈希和假名也可能仍是个人数据，不能宣称“有哈希就可永久保存”。对已经送达雇主的副本，协助提出请求并展示结果，不保证系统能直接删除。

### 评估 草稿 补证与复盘实体

| 实体 | 字段与状态 | 约束 |
| --- | --- | --- |
| evaluation_runs | user_id、job_version_id、fact_snapshot_hash、preference_version_id、screening_version、scoring_version、state、selection_reason、scheduling_rank、score_result_id、model_ref、actual_cost、created_at、started_at、finished_at、failure_code | UNASSESSED/DEFERRED/RUNNING/COMPLETED/FAILED/CANCELLED；仅 COMPLETED 有评分引用；未调用才可记费用0，未知费用为null |
| document_patches | user_id、document_id、base_version、base_digest、fact_snapshot_hash、operations、state、created_at、decided_by、decided_at、result_document_digest | PROPOSED/ACCEPTED/REJECTED/STALE/VALIDATION_FAILED；按稳定 section_id 修改正文，operations 含 before_digest、after_text、claims；接受只新建草稿 |
| evidence_requests | user_id、job_version_id、requirement_id、reason_code、question、related_fact_ids、state、response_ref、response_digest、resolution_fact_ids、created_at、answered_at、confirmed_by、confirmed_at、dismiss_reason | OPEN/ANSWERED/CONFIRMED/DISMISSED；答复与确认分开，CONFIRMED 须本人核实且解析为可归属事实 |
| mail_review_items | user_id、source_namespace、source_event_id、evidence_ref、evidence_sha256、received_at、classification、state、selected_application_id、decision_reason、decided_by、decided_at、status_event_id、row_version | UNRESOLVED/LINKED/IGNORED；同用户同来源事件唯一；LINKED 的申请须属于本人；事件 hash 变化不能静默覆盖 |
| interview_stories | user_id、job_version_id、fact_snapshot_hash、title、competency_tags、situation、task、action、result、claims、missing_information、review_state、created_at、reviewed_by、reviewed_at | DRAFT/NEEDS_INFO/VERIFIED；STAR 主张逐段绑定事实；缺结果允许null并补证，不能编成果 |
| readability_checks | user_id、artifact_id、artifact_sha256、extract_digest、renderer_version、check_state、issues、visual_reviewed_by、visual_reviewed_at | CHECK_PENDING/PASS/FAIL；PASS 需文本与视觉审查证据；附件变动重新检查 |

新增实体均有 UUID 主键、row_version 或不可变版本、用户归属与复合外键。EvaluationRun 的结果必须绑定同一 JD、事实和偏好版本；patch 基线与每个 before_digest 必须等于当前版本，不允许任意 JSON Pointer 修改事实、权限或密钥。

配套 Schema 新增 EvaluationRun、DocumentPatch、EvidenceRequest、MailReviewItem、InterviewStory。模型只可定向 DocumentPatchProposal、EvidenceRequestDraft、InterviewStoryDraft；它们把状态限制为提案、未确认或草稿，决定者、确认者、结果 hash 保持空。持久化合同包含状态不意味着模型获准写这些状态。

邮件复核决定与 correction 使用独立事件 namespace 和 UUID，保留 original_evidence_ref；supersedes_id 同用户同申请且不得指向未来或形成循环。重新归属作为受控事务同时修正旧、新申请，不能移用另一用户事件。历史聚合先按 as_of 筛 observed_at，再解更正链；观察窗口按 occurred_at 计算。

本地原型是独立的包装输入，不是完整数据库实现：导入候选事实、JD及规则，确认证据映射后重算。draft 可审查简历与求职信的逐条主张；patch 只替换已有简历 section 正文。当前只保留最新草稿及审计摘要，未实现不可变正文版本库；求职信 patch 与跨申请邮件重归属仍是正式服务设计。
