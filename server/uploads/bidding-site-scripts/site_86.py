#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：国家电网新一代电子商务平台
列表页：https://ecp.sgcc.com.cn/ecp2.0/portal/#/list/list-spe/2018032600289606_1_2018032700291334
抓取方式：公开接口（列表 + 详情 + 公告附件）
输出文件：sgcc_ecp_YYYYMMDD_HHMMSS/output.json / output.csv
运行方式：python spiders/spider_sgcc_ecp.py --max-pages 2
默认行为：抓取“招标公告及投标邀请书”菜单
"""

from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

import spider_utils


ENTRY_URL = "https://ecp.sgcc.com.cn/ecp2.0/portal/#/"
BASE_URL = "https://ecp.sgcc.com.cn"
PORTAL_URL = BASE_URL + "/ecp2.0/portal/#/"
CORE_BASE = BASE_URL + "/ecp2.0/ecpwcmcore"
LIST_API = CORE_BASE + "//index/noteList"
DETAIL_API_MAP = {
    "doci-bid": CORE_BASE + "//index/getNoticeBid",
    "doci-change": CORE_BASE + "//index/getChangeBid",
    "doci-delay": CORE_BASE + "//index/getDelayNoticeBid",
}
DOWNLOAD_API = CORE_BASE + "/index/downLoadBid"

DEFAULT_FIRST_PAGE_MENU_ID = "2018032700291334"
PAGE_SIZE = 20
DELAY_RANGE = (0.2, 0.6)
RETRY_TIMES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/146.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": BASE_URL + "/ecp2.0/portal/",
}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _project_status_label(value: Any) -> str:
    mapping = {
        "0": "已经截止",
        "1": "正在招标",
    }
    key = _safe_text(value)
    return mapping.get(key, key)


def _notice_type_label(value: Any) -> str:
    mapping = {
        "100063001": "招标公告",
        "100063002": "投标邀请书",
    }
    key = _safe_text(value)
    return mapping.get(key, key)


def _extract_rows(payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("resultValue") or {}
    return {
        "count": int(result.get("count") or 0),
        "rows": result.get("noteList") or [],
        "org_list": ((result.get("orglist") or {}).get("items") or []),
        "pur_types": ((result.get("purTypes") or {}).get("items") or []),
    }


def _ensure_success(payload: dict[str, Any], api_name: str) -> dict[str, Any]:
    if not payload.get("successful"):
        raise ValueError(f"{api_name} 接口异常: {payload.get('resultHint') or payload}")
    return payload.get("resultValue") or {}


def _download_url(notice_id: Any, notice_det_id: Any) -> str:
    nid = _safe_text(notice_id)
    ndid = _safe_text(notice_det_id)
    return f"{DOWNLOAD_API}?noticeId={nid}&noticeDetId={ndid}"


def _build_detail_url(doctype: str, notice_id: str, menu_id: str) -> str:
    return f"{BASE_URL}/ecp2.0/portal/#/doc/{doctype}/{notice_id}_{menu_id}"


class SgccEcpSpider:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _bootstrap(self) -> None:
        self.session.get(PORTAL_URL, timeout=30)

    def _post_json(self, url: str, payload: Any) -> dict[str, Any]:
        last_error: Exception | None = None
        for _ in range(RETRY_TIMES):
            try:
                resp = self.session.post(url, json=payload, timeout=40)
                if resp.status_code in (429, 500, 502, 503, 504):
                    time.sleep(random.uniform(0.7, 1.4))
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_error = exc
                time.sleep(random.uniform(0.7, 1.4))
        raise RuntimeError(f"请求失败: {url} -> {last_error}")

    def fetch_list_page(
        self,
        page_no: int,
        first_page_menu_id: str,
        key: str = "",
        org_id: str = "",
        org_name: str = "",
        pur_type: str = "",
        pur_org_status: str = "",
        notice_type: str = "",
    ) -> dict[str, Any]:
        payload = {
            "index": page_no,
            "size": PAGE_SIZE,
            "firstPageMenuId": first_page_menu_id,
            "purOrgStatus": pur_org_status,
            "purOrgCode": "",
            "purType": pur_type,
            "noticeType": notice_type,
            "orgId": org_id,
            "key": key,
            "orgName": org_name,
        }
        return _extract_rows(self._post_json(LIST_API, payload))

    def fetch_detail(self, doctype: str, notice_id: str) -> dict[str, Any]:
        api = DETAIL_API_MAP.get(doctype)
        if not api:
            return {"detail_type": "unsupported", "raw_payload": {}, "attachments": []}

        result_value = _ensure_success(self._post_json(api, notice_id), doctype)
        return self._normalize_detail(doctype=doctype, notice_id=notice_id, result_value=result_value)

    def _normalize_detail(self, doctype: str, notice_id: str, result_value: dict[str, Any]) -> dict[str, Any]:
        if doctype == "doci-bid":
            notice = result_value.get("notice") or {}
            attachments = []
            if _safe_text(result_value.get("fileFlag")) == "1":
                attachments.append(
                    {
                        "url": _download_url(notice.get("ONLINE_BID_NOTICE_ID"), notice.get("PURPRJ_NOTICE_DET_ID")),
                        "name": "公告文件.pdf",
                        "ext": ".pdf",
                    }
                )
            return {
                "detail_type": "bid_notice",
                "primary_notice": notice,
                "content_text": _safe_text(notice.get("PRJ_INTRODUCE")),
                "attachments": attachments,
                "raw_payload": result_value,
            }

        if doctype == "doci-change":
            orig_notice = result_value.get("origNotice") or {}
            chg_notice = result_value.get("chgNotice") or {}
            attachments = []
            if _safe_text(result_value.get("oriFileFlag")) == "1":
                attachments.append(
                    {
                        "url": _download_url(orig_notice.get("ONLINE_BID_NOTICE_ID"), orig_notice.get("PURPRJ_NOTICE_DET_ID")),
                        "name": "原公告文件.pdf",
                        "ext": ".pdf",
                    }
                )
            if _safe_text(result_value.get("fileFlag")) == "1":
                attachments.append(
                    {
                        "url": _download_url(chg_notice.get("ONLINE_BID_NOTICE_ID"), chg_notice.get("PURPRJ_NOTICE_DET_ID")),
                        "name": "变更公告文件.pdf",
                        "ext": ".pdf",
                    }
                )
            return {
                "detail_type": "change_notice",
                "primary_notice": chg_notice,
                "orig_notice": orig_notice,
                "content_text": _safe_text(chg_notice.get("CHG_NOTICE_CONT")) or _safe_text(orig_notice.get("PRJ_INTRODUCE")),
                "attachments": attachments,
                "raw_payload": result_value,
            }

        if doctype == "doci-delay":
            notice = result_value.get("notice") or {}
            delay_notice = result_value.get("delaynotice") or {}
            attachments = []
            if _safe_text(result_value.get("fileFlag")) == "1":
                attachments.append(
                    {
                        "url": _download_url(notice.get("ONLINE_BID_NOTICE_ID"), notice.get("PURPRJ_NOTICE_DET_ID")),
                        "name": "原公告文件.pdf",
                        "ext": ".pdf",
                    }
                )
            if _safe_text(result_value.get("delayFileFlag")) == "1":
                attachments.append(
                    {
                        "url": _download_url(delay_notice.get("ONLINE_BID_NOTICE_ID"), delay_notice.get("PURPRJ_NOTICE_DET_ID")),
                        "name": "延期公告文件.pdf",
                        "ext": ".pdf",
                    }
                )
            return {
                "detail_type": "delay_notice",
                "primary_notice": delay_notice,
                "orig_notice": notice,
                "content_text": _safe_text(delay_notice.get("CHG_NOTICE_CONT")) or _safe_text(notice.get("PRJ_INTRODUCE")),
                "attachments": attachments,
                "raw_payload": result_value,
            }

        return {"detail_type": "unsupported", "raw_payload": result_value, "attachments": []}

    def crawl(
        self,
        max_pages: int,
        first_page_menu_id: str,
        key: str = "",
        org_id: str = "",
        org_name: str = "",
        pur_type: str = "",
        pur_org_status: str = "",
        notice_type: str = "",
    ) -> list[dict[str, Any]]:
        self._bootstrap()

        records: list[dict[str, Any]] = []
        seen_notice_ids: set[str] = set()

        for page_no in range(1, max_pages + 1):
            print(f"[SGCC_ECP] 抓取列表页 {page_no} ...")
            page = self.fetch_list_page(
                page_no=page_no,
                first_page_menu_id=first_page_menu_id,
                key=key,
                org_id=org_id,
                org_name=org_name,
                pur_type=pur_type,
                pur_org_status=pur_org_status,
                notice_type=notice_type,
            )
            rows = page.get("rows") or []
            if not rows:
                print("[SGCC_ECP] 无更多列表数据，停止")
                break

            for row in rows:
                notice_id = _safe_text(row.get("noticeId"))
                if not notice_id or notice_id in seen_notice_ids:
                    continue
                seen_notice_ids.add(notice_id)

                doctype = _safe_text(row.get("doctype")) or "doci-bid"
                detail = self.fetch_detail(doctype=doctype, notice_id=notice_id)
                primary_notice = detail.get("primary_notice") or {}
                orig_notice = detail.get("orig_notice") or {}
                attachments = detail.get("attachments") or []

                detail_url = _build_detail_url(
                    doctype=doctype,
                    notice_id=notice_id,
                    menu_id=_safe_text(row.get("firstPageMenuId")) or first_page_menu_id,
                )

                records.append(
                    {
                        "site_name": "国家电网新一代电子商务平台",
                        "entry_url": ENTRY_URL,
                        "source_id": notice_id,
                        "title": _safe_text(row.get("title")) or _safe_text(primary_notice.get("PURPRJ_NAME")),
                        "publish_time": _safe_text(row.get("noticePublishTime")) or _safe_text(primary_notice.get("PUB_TIME")),
                        "publish_org_name": _safe_text(row.get("publishOrgName")) or _safe_text(primary_notice.get("PUBLISH_ORG_NAME")),
                        "project_code": _safe_text(row.get("code")) or _safe_text(primary_notice.get("PURPRJ_CODE")),
                        "project_status": _project_status_label(row.get("prjStatus")),
                        "notice_type": _safe_text(primary_notice.get("NOTICE_TYPE_NAME")) or _notice_type_label(row.get("noticeType")),
                        "pur_type_name": _safe_text(primary_notice.get("PUR_TYPE_NAME")),
                        "doctype": doctype,
                        "first_page_menu_id": _safe_text(row.get("firstPageMenuId")) or first_page_menu_id,
                        "first_page_doc_id": _safe_text(row.get("firstPageDocId")),
                        "list_notice_id": notice_id,
                        "detail_online_bid_notice_id": _safe_text(primary_notice.get("ONLINE_BID_NOTICE_ID")),
                        "detail_url": detail_url,
                        "openbid_time": _safe_text(primary_notice.get("OPENBID_TIME")),
                        "bidbook_buy_end_time": _safe_text(primary_notice.get("BIDBOOK_BUY_END_TIME")),
                        "bidbook_sell_begin_time": _safe_text(primary_notice.get("BIDBOOK_SELL_BEGIN_TIME")),
                        "openbid_addr": _safe_text(primary_notice.get("OPENBID_ADDR")),
                        "bid_org": _safe_text(primary_notice.get("BID_ORG")),
                        "bid_agt": _safe_text(primary_notice.get("BID_AGT")),
                        "contact": _safe_text(primary_notice.get("CONTACT")),
                        "tel": _safe_text(primary_notice.get("TEL")),
                        "email": _safe_text(primary_notice.get("E_MAIL")),
                        "content_text": _safe_text(detail.get("content_text")),
                        "detail_type": _safe_text(detail.get("detail_type")),
                        "orig_notice_id": _safe_text(orig_notice.get("ONLINE_BID_NOTICE_ID")),
                        "orig_notice_title": _safe_text(orig_notice.get("PURPRJ_NAME")),
                        "attachments": attachments,
                        "attachment_urls": ";".join([x.get("url", "") for x in attachments if x.get("url")]),
                        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                print(f"[SGCC_ECP] 已处理 {len(records)} 条: noticeId={notice_id} doctype={doctype}")
                time.sleep(random.uniform(*DELAY_RANGE))

            total_count = int(page.get("count") or 0)
            total_pages = (total_count + PAGE_SIZE - 1) // PAGE_SIZE if total_count else 0
            if total_pages and page_no >= total_pages:
                break

        return records


def main() -> None:
    parser = argparse.ArgumentParser(description="国家电网电子商务平台爬虫（列表+详情+公告附件）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument(
        "--first-page-menu-id",
        type=str,
        default=DEFAULT_FIRST_PAGE_MENU_ID,
        help="栏目菜单ID，默认2018032700291334（招标公告及投标邀请书）",
    )
    parser.add_argument("--key", type=str, default="", help="关键字")
    parser.add_argument("--org-id", type=str, default="", help="招标单位ID")
    parser.add_argument("--org-name", type=str, default="", help="招标单位名称")
    parser.add_argument("--pur-type", type=str, default="", help="采购类型")
    parser.add_argument("--pur-org-status", type=str, default="", help="项目状态：1=正在招标，0=已经截止")
    parser.add_argument("--notice-type", type=str, default="", help="公告类型：100063001=招标公告，100063002=投标邀请书")
    args = parser.parse_args()

    spider = SgccEcpSpider()
    records = spider.crawl(
        max_pages=max(1, args.max_pages),
        first_page_menu_id=args.first_page_menu_id.strip() or DEFAULT_FIRST_PAGE_MENU_ID,
        key=args.key.strip(),
        org_id=args.org_id.strip(),
        org_name=args.org_name.strip(),
        pur_type=args.pur_type.strip(),
        pur_org_status=args.pur_org_status.strip(),
        notice_type=args.notice_type.strip(),
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_name = f"sgcc_ecp_{timestamp}"
    Path(folder_name).mkdir(parents=True, exist_ok=True)

    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder_name,
        attachments_field="attachments",
        record_id_field="source_id",
        record_name_field="title",
        referer_field="detail_url",
    )
    print(f"[SGCC_ECP] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
