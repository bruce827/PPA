# 招标网站 XML 直接补充 Dry Run 说明

- 输入清单：`docs/csv/招标网站-xml-直接补充候选.csv`
- 输出清单：`docs/csv/招标网站-xml-直接补充-dry-run.csv`
- 同名待确认：`docs/csv/招标网站-xml-直接补充-同名待确认.csv`
- 生成时间：2026-03-12T08:03:35.944Z
- 说明：本轮仅做 dry-run 规划，不执行任何数据库写入

## 1. 总体结论

- 直接补充候选总数：`35`
- 拟新增候选：`28`
- 同名待确认：`7`

## 2. 决策分布

| dry_run_decision | count |
| --- | --- |
| create_candidate | 28 |
| same_name_review | 7 |

## 3. 拟新增候选置信度

| import_confidence | count |
| --- | --- |
| high | 23 |
| medium | 5 |

## 4. 拟新增候选按轨道分布

| track | count |
| --- | --- |
| 政府采购 | 12 |
| 军采 | 1 |
| 公共资源交易 | 15 |

## 5. 拟新增候选（前 20）

| site_name | province | track | import_confidence | manual_check_reason |
| --- | --- | --- | --- | --- |
| 中共中央直属机关采购中心 | 全国 | 政府采购 | high | - |
| 中国海关政府采购网 | 全国 | 政府采购 | high | - |
| 中国人民银行集中采购中心 | 全国 | 政府采购 | high | - |
| 全国人大机关采购中心 | 全国 | 政府采购 | high | - |
| 税务采购网 | 全国 | 政府采购 | high | - |
| 军网自采平台 | 全国 | 军采 | medium | platform_type_pending / self_procurement_entry |
| 天津市政府采购中心 | 天津 | 政府采购 | high | - |
| 山西公共资源交易平台 | 山西 | 公共资源交易 | high | - |
| 辽宁公共资源交易服务平台 | 辽宁 | 公共资源交易 | high | - |
| 吉林公共资源交易服务平台 | 吉林 | 公共资源交易 | high | - |
| 江苏公共资源交易服务平台 | 江苏 | 公共资源交易 | high | - |
| 浙江公共资源交易服务平台 | 浙江 | 公共资源交易 | high | - |
| 江西省公共资源交易服务平台 | 江西 | 公共资源交易 | high | - |
| 山东政府采购网 | 山东 | 政府采购 | medium | deep_path / entry_file |
| 湖北公共资源交易中心 | 湖北 | 公共资源交易 | high | - |
| 广东公共资源交易服务平台 | 广东 | 公共资源交易 | high | - |
| 海南政府采购网 | 海南 | 政府采购 | high | - |
| 四川公共资源交易服务平台 | 四川 | 公共资源交易 | high | - |
| 贵州政府采购网 | 贵州 | 政府采购 | high | - |
| 云南公共资源交易服务平台 | 云南 | 公共资源交易 | medium | entry_file |

## 6. 同名待确认（前 20）

| site_name | existing_name | existing_url | proposed_url | dry_run_decision |
| --- | --- | --- | --- | --- |
| 军队采购网 | 军队采购网 | https://www.plap.cn | https://www.plap.mil.cn/ | same_name_review |
| 河北省公共资源交易服务平台 | 河北省公共资源交易服务平台 | https://szj.hebei.gov.cn/hbggfwpt | http://ggzy.hebei.gov.cn/hbggfwpt/ | same_name_review |
| 辽宁政府采购网 | 辽宁政府采购网 | http://www.ccgp-liaoning.gov.cn/portalindex | http://www.ccgp-liaoning.gov.cn/ | same_name_review |
| 浙江政府采购网 | 浙江政府采购网 | http://www.ccgp-zhejiang.gov.cn | https://zfcg.czt.zj.gov.cn/ | same_name_review |
| 福建省政府采购网 | 福建省政府采购网 | http://www.ccgp-fujian.gov.cn | https://zfcg.czt.fujian.gov.cn/ | same_name_review |
| 河南省公共资源交易中心 | 河南省公共资源交易中心 | http://hnsggzyjy.henan.gov.cn | https://hnsggzyfwpt.hndrc.gov.cn/ | same_name_review |
| 广西政府采购网 | 广西政府采购网 | http://www.ccgp-guangxi.gov.cn | http://zfcg.gxzf.gov.cn/ | same_name_review |

## 7. 执行建议

1. `same_name_review` 这批不要直接新增，先确认是 URL 更新、别名补充，还是并行新源。
2. `create_candidate` 才能进入下一步 dry-run 导入表。
3. `import_confidence = medium` 的拟新增项，在真正入库前建议至少做一次人工点验。
4. 省级主站虽然是拟新增，但多数属于“同省同轨补充源”，不代表当前省份完全缺站。
