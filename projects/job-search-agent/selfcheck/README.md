# 求职 Agent 离线自检

运行测试需 Python 3.9 或更高及 requirements.txt 中的 jsonschema。此目录测试仅验证设计合同、文件同步及离线参考规则。实际本地原型测试另见 prototype-tests/run.mjs，没有外发功能。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r selfcheck/requirements.txt
.venv/bin/python selfcheck/run_checks.py --output selfcheck/final-results.json
```

需重现同一依赖组合时安装 dependency-lock.txt。schema-before.json 为修复前快照；baseline-results.json 保存当时结果。仅用旧 Schema 重跑会使用当前文档，因此不能替代当时的文档自检快照。

final-results.json 带 Schema 哈希、校验器版本和逐项结果。参考规则与静态关键词检查不能证明实际派发、并发、密钥、平台权限或招聘效果。
