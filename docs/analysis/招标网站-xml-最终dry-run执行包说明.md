# 招标网站 XML 最终 Dry Run 执行包说明

- 输入 1：`docs/csv/招标网站-xml-直接补充-dry-run.csv`
- 输入 2：`docs/csv/招标网站-xml-同名归并建议.csv`
- 输出 1：`docs/csv/招标网站-xml-最终dry-run变更表.csv`
- 输出 2：`docs/csv/招标网站-xml-待在线校验后再变更.csv`
- 生成时间：2026-03-12T08:09:43.726Z
- 说明：本轮只生成最终 dry-run 执行包，不执行任何数据库写入

## 1. 总体结论

- 可直接进入最终 dry-run 变更表：`29`
- 需在线校验后再变更：`6`

## 2. 最终 dry-run 动作分布

| operation_type | count |
| --- | --- |
| create | 28 |
| update_primary_url | 1 |

## 3. 最终 dry-run 置信度分布

| confidence | count |
| --- | --- |
| high | 24 |
| medium | 5 |

## 4. 最终 dry-run 变更表（前 20）

| execution_order | operation_type | name | province | final_target_url | confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | create | 中共中央直属机关采购中心 | 全国 | http://www.zzcg.gov.cn/ | high |
| 2 | create | 中国海关政府采购网 | 全国 | http://hgcg.customs.gov.cn/ | high |
| 3 | create | 中国人民银行集中采购中心 | 全国 | https://jzcg.pbc.gov.cn/ | high |
| 4 | create | 全国人大机关采购中心 | 全国 | https://ww.ccgp.gov.cn/qgrd/ | high |
| 5 | create | 税务采购网 | 全国 | https://swcg.chinatax.gov.cn/ | high |
| 6 | create | 军网自采平台 | 全国 | https://zc.plap.mil.cn/ | medium |
| 7 | create | 天津市政府采购中心 | 天津 | http://tjgpc.zwfwb.tj.gov.cn/ | high |
| 8 | create | 山西公共资源交易平台 | 山西 | https://prec.sxzwfw.gov.cn/ | high |
| 9 | create | 辽宁公共资源交易服务平台 | 辽宁 | http://www.lnggzy.gov.cn/lnggzy/ | high |
| 10 | create | 吉林公共资源交易服务平台 | 吉林 | http://www.ggzyzx.jl.gov.cn/ | high |
| 11 | create | 江苏公共资源交易服务平台 | 江苏 | http://jsggzy.jszwfw.gov.cn/ | high |
| 12 | create | 浙江公共资源交易服务平台 | 浙江 | https://ggzy.zj.gov.cn/ | high |
| 13 | create | 江西省公共资源交易服务平台 | 江西 | https://www.jxsggzy.cn/ | high |
| 14 | create | 山东政府采购网 | 山东 | http://www.ccgp-shandong.gov.cn/sdgp2017/site/index.jsp | medium |
| 15 | create | 湖北公共资源交易中心 | 湖北 | https://www.hbggzyfwpt.cn/ | high |
| 16 | create | 广东公共资源交易服务平台 | 广东 | https://ygp.gdzwfw.gov.cn/ | high |
| 17 | create | 海南政府采购网 | 海南 | https://ccgp-hainan.gov.cn/ | high |
| 18 | create | 四川公共资源交易服务平台 | 四川 | https://ggzyjy.sc.gov.cn/ | high |
| 19 | create | 贵州政府采购网 | 贵州 | http://www.ccgp-guizhou.gov.cn/ | high |
| 20 | create | 云南公共资源交易服务平台 | 云南 | https://ggzy.yn.gov.cn/homePage | medium |

## 5. 待在线校验后再变更（前 20）

| name | existing_url | proposed_url | suggested_resolution | confidence |
| --- | --- | --- | --- | --- |
| 军队采购网 | https://www.plap.cn | https://www.plap.mil.cn/ | candidate_update_primary_url_after_validation | high |
| 河北省公共资源交易服务平台 | https://szj.hebei.gov.cn/hbggfwpt | http://ggzy.hebei.gov.cn/hbggfwpt/ | manual_verify_then_update_primary_url | medium |
| 浙江政府采购网 | http://www.ccgp-zhejiang.gov.cn | https://zfcg.czt.zj.gov.cn/ | manual_verify_then_update_primary_url | medium |
| 福建省政府采购网 | http://www.ccgp-fujian.gov.cn | https://zfcg.czt.fujian.gov.cn/ | manual_verify_then_update_primary_url | medium |
| 河南省公共资源交易中心 | http://hnsggzyjy.henan.gov.cn | https://hnsggzyfwpt.hndrc.gov.cn/ | manual_verify_then_update_primary_url | medium |
| 广西政府采购网 | http://www.ccgp-guangxi.gov.cn | http://zfcg.gxzf.gov.cn/ | manual_verify_then_update_primary_url | medium |

## 6. 执行建议

1. 先执行 `create`，再执行 `update_primary_url`。
2. `待在线校验后再变更` 这 6 条不要直接入最终变更表。
3. 最终写库前，再加一版真实校验结果回填即可进入实施。
