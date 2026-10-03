# 本地原型使用

脚本以 `node <skill-directory>/scripts/job-agent.mjs <command>` 运行。Node.js 20 或更新版；本轮在 24.21.0 验证。所有输入是本地 JSON，无模型 API 和平台调用。

## 案例与密钥

`keygen --out <key-file>` 创建 32 字节密钥，文件权限 0600；不能覆盖已有文件。将其置于案例目录之外的私有目录。`init --case <case-directory> --key-file <key-file> --user <uuid>` 创建加密案例。目录权限 0700；`case.enc.json` 是认证加密后的状态。密钥不能进入命令参数值、日志、版本库或云端；丢失密钥无法恢复。正式服务应改为系统钥匙串或 KMS。

修改操作通过排他文件锁、原子替换和落盘处理。锁存在时停止，不能盲目删锁重试。审计记录在加密状态内，仅存动作、ID 和摘要；这不是防止持钥人重写整条历史的独立审计系统。原型依赖本地用户权限，没有生产身份认证、RLS 或远程服务。

## 命令

| 命令 | 用途 |
| --- | --- |
| `import --input <bundle.json>` | 导入候选 facts 和 jobs；拒绝带 confirmed 事实和已核实证据的输入 |
| `confirm-fact --id <fact-id>` | 当前用户明确确认后记录事实；冲突项先修正，不直接确认 |
| `confirm-evidence --job <job-id> --item <evidence-item-id>` | 本人核实映射、等级与引用后记录确认；不能把模型评分当作确认 |
| `score --job <job-id>` | 重算六维分数上下界和路由；缺项、候选映射保持 unknown |
| `draft --job <job-id> --input <draft.json>` | 保存基于当前事实快照的新材料候选；严重引用错误拒绝入库，改写保留人工待审 |
| `review --job <job-id>` | 审查当前 draft 的引用、主张覆盖、项目、数字及改写待审情况 |
| `patch --job <job-id> --input <patch.json>` | 用户接受后创建新草稿；基础版本或事实快照变更则拒绝；事实库不变 |
| `record --input <event.json>` | 记录本人自报的提交或招聘事件；不记录为平台回执 |
| `metrics --as-of <UTC-time> --days 30` | 按有效历史事件统计本人的自报 cohort，UNKNOWN 单列 |
| `inspect` | 输出记录数量和当前阶段，不输出事实正文或密钥 |

除 keygen 外每个命令需 `--case`、`--key-file`；init 另需 `--user`。命令执行者代表当前本地用户，不能冒充生产的认证本人会话。

导入 bundle 格式：`{user_id, facts: [...], jobs: [...]}`。facts 包含 UUID id、同用户 user_id、text、project_id、source_ref、kind、polarity（positive 或 negative）、status（unconfirmed 或 conflict）。jobs 包含 id、user_id、source_kind（user_provided）、jd（JDParsed）、evidence（MatchEvidence）、rules（每项 requirement_id、dimension、weight 及 hard_checks）、draft（ApplicationDraft 或 null）、section_projects（section_id 到 project_id 映射）。各 JSON 合同见 contracts.md；此包装数据只用于原型，不提供生产身份或提交权限。

record 输入 `{id,user_id,application_id,stage,occurred_at,supersedes_id}`；stage 仅接受 SELF_REPORTED_SUBMITTED、SUBMISSION_UNKNOWN、REPLIED、INTERVIEW、OFFER、REJECTED、WITHDRAWN、NO_UPDATE。代码补上 user_entry 和 confirmed_by。本原型不能写 ACCEPTED/SENT，不能以浏览器操作冒充平台证据。REPLIED 须由本人明确报告人工回复，不能从自动拒信推断。更正使用新 id 指向旧事件；不覆盖旧记录。

`occurred_at` 与 `--as-of` 只接受已知的 UTC 日期时间，例如 `2026-10-03T04:00:00Z`。只有日期时不得默认补时刻；保留日期精度的文本待补记录，待获得真实时间再录入。正式系统的日期精度、时区和时间未知字段尚待实现。

所有 JD 明确的 must_have 项都必须有对应 hard_check；不可删掉规则消除缺资格阻断。未知维度保留权重，不能补造 JD 内容。supported/partial 只接受经本人核实的正向支持事实；缺项事实用于 unsupported，不能改成支持证据。

patch 输入 `{user_id,base_artifact_hash,fact_snapshot_hash,changes:[{section_id,new_body,new_claims}]}`。只可替换已有简历 section 的正文与其 claims；不能更改事实、审批、密钥、目的地或执行状态。新正文必须重新通过审查；可接受的非原句改写仍保留 NEEDS_HUMAN 状态。

stdout 默认仅含摘要和 ID；score/review/metrics 输出也可能含敏感关联 ID，应仅保留在私有工作环境。错误只显示错误代码。原型不实现自动删除、备份轮换、模型预算或源频控；这些能力仍是 M2/M3 的设计要求。
