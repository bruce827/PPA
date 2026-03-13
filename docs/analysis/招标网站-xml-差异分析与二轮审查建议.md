# 招标网站 XML 差异分析与二轮审查建议

- 数据源：`docs/招标网站.xml`
- 底稿：`docs/csv/招标网站-xml-结构化清单.csv`
- 差异清单：`docs/csv/招标网站-xml-差异清单.csv`
- 直接补充候选：`docs/csv/招标网站-xml-直接补充候选.csv`
- 疑似归并清单：`docs/csv/招标网站-xml-疑似归并清单.csv`
- review 二轮分组：`docs/csv/招标网站-xml-review-二轮分组.csv`
- 生成时间：2026-03-12T07:57:07.680Z
- 说明：本轮仅做只读分析，不执行任何数据库写入

## 1. 总体结论

- XML 结构化记录总数：`331`
- 可直接补充候选：`35`
- 疑似归并项：`51`
- review 二轮审查项：`218`

## 2. 与现有库匹配情况

| matchType | count |
| --- | --- |
| soft_match | 51 |
| no_match | 279 |
| strict_match | 1 |

说明：

- `strict_match`：按当前模块的正式 `normalized_url` 命中现有库
- `soft_match`：忽略 `http/https` 与根路径尾斜杠差异后命中现有库
- `no_match`：现有库未覆盖

## 3. 建议批次

| batch | count |
| --- | --- |
| B-现有库归并 | 51 |
| E-排除 | 27 |
| A-直接补充主站 | 35 |
| C-企业招投标与云平台审查 | 62 |
| D-企业采购与第三方待定 | 156 |

## 4. review 二轮分组

| reviewBucket | count |
| --- | --- |
| cloud_platform_variant | 15 |
| enterprise_procurement_platform | 49 |
| enterprise_bidding_platform | 47 |
| enterprise_other_platform | 4 |
| third_party_trading_platform | 102 |
| third_party_regulatory_noise | 1 |

## 5. 可直接补充候选（前 20）

| site_name | province | source_section | platform_type | recommended_batch |
| --- | --- | --- | --- | --- |
| 中共中央直属机关采购中心 |  | 央采军队采购平台 | 政府采购 | A-直接补充主站 |
| 中国海关政府采购网 |  | 央采军队采购平台 | 政府采购 | A-直接补充主站 |
| 中国人民银行集中采购中心 |  | 央采军队采购平台 | 政府采购 | A-直接补充主站 |
| 全国人大机关采购中心 |  | 央采军队采购平台 | 政府采购 | A-直接补充主站 |
| 税务采购网 |  | 央采军队采购平台 | 政府采购 | A-直接补充主站 |
| 军队采购网 |  | 央采军队采购平台 | 军采 | A-直接补充主站 |
| 军网自采平台 |  | 央采军队采购平台 | 待判定 | A-直接补充主站 |
| 天津市政府采购中心 | 天津市 | 省市自治区政采、公共资源平台 | 政府采购 | A-直接补充主站 |
| 河北省公共资源交易服务平台 | 河北省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 山西公共资源交易平台 | 山西省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 辽宁公共资源交易服务平台 | 辽宁省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 辽宁政府采购网 | 辽宁省 | 省市自治区政采、公共资源平台 | 政府采购 | A-直接补充主站 |
| 吉林公共资源交易服务平台 | 吉林省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 江苏公共资源交易服务平台 | 江苏省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 浙江公共资源交易服务平台 | 浙江省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 浙江政府采购网 | 浙江省 | 省市自治区政采、公共资源平台 | 政府采购 | A-直接补充主站 |
| 福建省政府采购网 | 福建省 | 省市自治区政采、公共资源平台 | 政府采购 | A-直接补充主站 |
| 江西省公共资源交易服务平台 | 江西省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |
| 山东政府采购网 | 山东省 | 省市自治区政采、公共资源平台 | 政府采购 | A-直接补充主站 |
| 河南省公共资源交易中心 | 河南省 | 省市自治区政采、公共资源平台 | 公共资源交易 | A-直接补充主站 |

## 6. 疑似归并清单（前 20）

| site_name | province | db_match_type | existing_name | existing_url | recommended_action |
| --- | --- | --- | --- | --- | --- |
| 中国政府采购网 |  | soft_match | 中国政府采购网 | https://www.ccgp.gov.cn | merge_soft_match |
| 全国公共资源交易平台 |  | soft_match | 全国公共资源交易平台 | https://www.ggzy.gov.cn | merge_soft_match |
| 中国招标投标公共服务平台 |  | soft_match | 中国招标投标公共服务平台 | https://www.cebpubservice.com | merge_soft_match |
| 中央政府采购网 |  | soft_match | 中央政府采购网 | https://www.zycg.gov.cn | merge_soft_match |
| 北京市公共资源交易服务平台 | 北京市 | soft_match | 北京市公共资源交易服务平台 | https://ggzyfw.beijing.gov.cn | merge_soft_match |
| 北京市政府采购网 | 北京市 | soft_match | 北京市政府采购网 | http://www.ccgp-beijing.gov.cn | merge_soft_match |
| 上海公共资源交易中心 | 上海市 | strict_match | 上海市公共资源交易中心 | https://www.shggzy.com | merge_strict_match |
| 上海政府采购网 | 上海市 | soft_match | 上海市政府采购网 | http://www.zfcg.sh.gov.cn | merge_soft_match |
| 天津市公共资源交易服务平台 | 天津市 | soft_match | 天津市公共资源交易平台 | http://ggzy.zwfwb.tj.gov.cn | merge_soft_match |
| 天津市政府采购网 | 天津市 | soft_match | 天津市政府采购网 | http://www.ccgp-tianjin.gov.cn | merge_soft_match |
| 河北省政府采购网 | 河北省 | soft_match | 中国河北政府采购网 | https://www.ccgp-hebei.gov.cn/province | merge_soft_match |
| 山西省政府采购网 | 山西省 | soft_match | 山西政府采购网 | http://www.ccgp-shanxi.gov.cn | merge_soft_match |
| 吉林省政府采购网 | 吉林省 | soft_match | 吉林省政府采购网 | http://www.ccgp-jilin.gov.cn | merge_soft_match |
| 黑龙江公共资源交易服务平台 | 黑龙江省 | soft_match | 黑龙江省公共资源交易网 | https://ggzyjyw.hlj.gov.cn | merge_soft_match |
| 黑龙江政府采购网 | 黑龙江省 | soft_match | 黑龙江省政府采购网 | https://hljcg.hlj.gov.cn | merge_soft_match |
| 江苏政府采购网 | 江苏省 | soft_match | 江苏政府采购网 | http://www.ccgp-jiangsu.gov.cn | merge_soft_match |
| 苏采云 | 江苏省 | soft_match | 江苏政府采购网 | http://www.ccgp-jiangsu.gov.cn | merge_soft_match |
| 安徽省公共资源交易服务平台 | 安徽省 | soft_match | 安徽省公共资源交易监管网 | http://ggzy.ah.gov.cn | merge_soft_match |
| 安徽政府采购网 | 安徽省 | soft_match | 安徽省政府采购网 | http://www.ccgp-anhui.gov.cn | merge_soft_match |
| 福建公共资源交易服务平台 | 福建省 | soft_match | 福建省公共资源交易电子公共服务平台 | https://ggzyfw.fujian.gov.cn | merge_soft_match |

## 7. 二轮优先审查项（前 20）

| site_name | source_section | review_bucket | recommended_action | action_reason |
| --- | --- | --- | --- | --- |
| 政采云军采版 | 央采军队采购平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 吉林省政府采购云平台 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 云平台类入口需判断是否为主站、聚合页或交易入口 |
| 政采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 徽采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 河南省政府采购云平台 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 云平台类入口需判断是否为主站、聚合页或交易入口 |
| 云南政府采购云平台 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 云平台类入口需判断是否为主站、聚合页或交易入口 |
| 青海政采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 广西政采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 新疆政采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 兵团政采云 | 省市自治区政采、公共资源平台 | cloud_platform_variant | manual_review_high | 符合公共资源/政府采购/央采主站点特征，可作为补充候选 |
| 中核集团电子采购平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 航天电子采购平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 航空工业电子采购平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 中国船舶采购管理电子商务平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 兵器工业集团公司采购电子商务平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 中国兵器装备集团招标投标交易平台 | 企业招标采购平台 | enterprise_bidding_platform | manual_review_high | 企业招投标平台相关，但需确认是否纳入当前主库口径 |
| 中国电子科技集团有限公司电子采购平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 中国融通电子商务平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |
| 中国石油招标投标网 | 企业招标采购平台 | enterprise_bidding_platform | manual_review_high | 企业招投标平台相关，但需确认是否纳入当前主库口径 |
| 中国石化物资采购电子商务平台 | 企业招标采购平台 | enterprise_procurement_platform | manual_review_medium | 企业采购/电子商务平台需进一步判断是否属于有效招标信息源 |

## 8. 执行建议

1. 先只处理 `A-直接补充主站`，这批风险最低。
2. 再处理 `B-现有库归并`，主要修正同站不同写法、名称别名和现有库覆盖关系。
3. `C-企业招投标与云平台审查` 单独复核，不和第三方平台混做。
4. `D-企业采购与第三方待定` 暂不直接导入，除非你明确放宽主库口径。
5. `E-排除` 继续保持排除，不进入当前招标网站主库。
