# 招标网站 XML 同名归并建议说明

- 输入清单：`docs/csv/招标网站-xml-直接补充-同名待确认.csv`
- 输出清单：`docs/csv/招标网站-xml-同名归并建议.csv`
- 生成时间：2026-03-12T08:08:11.311Z
- 说明：本轮只做归并建议，不执行任何数据库写入

## 1. 总体结论

- 同名待确认总数：`7`

## 2. 建议分布

| suggested_resolution | count |
| --- | --- |
| candidate_update_primary_url_after_validation | 1 |
| manual_verify_then_update_primary_url | 5 |
| candidate_update_primary_url | 1 |

## 3. 置信度分布

| confidence | count |
| --- | --- |
| high | 2 |
| medium | 5 |

## 4. 逐条建议

| name | existing_url | proposed_url | suggested_resolution | preferred_url_candidate | confidence |
| --- | --- | --- | --- | --- | --- |
| 军队采购网 | https://www.plap.cn | https://www.plap.mil.cn/ | candidate_update_primary_url_after_validation | proposed | high |
| 河北省公共资源交易服务平台 | https://szj.hebei.gov.cn/hbggfwpt | http://ggzy.hebei.gov.cn/hbggfwpt/ | manual_verify_then_update_primary_url | proposed | medium |
| 辽宁政府采购网 | http://www.ccgp-liaoning.gov.cn/portalindex | http://www.ccgp-liaoning.gov.cn/ | candidate_update_primary_url | proposed | high |
| 浙江政府采购网 | http://www.ccgp-zhejiang.gov.cn | https://zfcg.czt.zj.gov.cn/ | manual_verify_then_update_primary_url | proposed | medium |
| 福建省政府采购网 | http://www.ccgp-fujian.gov.cn | https://zfcg.czt.fujian.gov.cn/ | manual_verify_then_update_primary_url | proposed | medium |
| 河南省公共资源交易中心 | http://hnsggzyjy.henan.gov.cn | https://hnsggzyfwpt.hndrc.gov.cn/ | manual_verify_then_update_primary_url | proposed | medium |
| 广西政府采购网 | http://www.ccgp-guangxi.gov.cn | http://zfcg.gxzf.gov.cn/ | manual_verify_then_update_primary_url | proposed | medium |

## 5. 执行建议

1. `candidate_update_primary_url` 可以优先纳入最终 dry-run 变更表。
2. `candidate_update_primary_url_after_validation` 和 `manual_verify_then_update_primary_url` 先做人工点验或在线校验，再决定是否改主 URL。
3. 这 7 条不建议作为“新增站点”处理，应统一并入归并阶段。
