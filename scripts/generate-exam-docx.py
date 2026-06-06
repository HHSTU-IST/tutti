#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

import defusedxml.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
NS = {"w": W_NS}

EXPORT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "docs" / "export.json"
DEFAULT_INPUT_MD = Path(__file__).resolve().parents[1] / "docs" / "xm-2025-2-A.md"
LATEX_REPLACEMENTS_PATH = (
    Path(__file__).resolve().parents[1] / "docs" / "latex-replace.json"
)
EXPORT_CONFIG = {}
LATEX_REPLACEMENTS = {}
REQUIRED_EXPORT_SCHEMA = {
    "document": {
        "pageSize": {"width": None, "height": None},
        "margins": {
            "top": None,
            "right": None,
            "bottom": None,
            "left": None,
            "header": None,
            "footer": None,
            "gutter": None,
        },
    },
    "styles": {
        "firstTitle": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
        },
        "secondTitle": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
        },
        "paperCode": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
            "indent": {"left": None, "firstLine": None, "hanging": None},
        },
        "targetMajor": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
            "indent": {"left": None, "firstLine": None, "hanging": None},
        },
        "sectionTitle": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
            "indent": {"left": None, "firstLine": None, "hanging": None},
        },
        "sectionNote": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            }
        },
        "body": {
            "font": {
                "eastAsia": None,
                "latin": None,
                "sizeHalfPoints": None,
                "bold": None,
            },
            "spacing": {"before": None, "after": None, "line": None},
            "alignment": None,
            "indent": {"left": None, "firstLine": None, "hanging": None},
        },
        "table": {"alignment": None, "borderStyle": None},
    },
    "rules": {
        "titleLevel": None,
        "sectionLevel": None,
        "questionNumbering": None,
        "sectionBeforeBlankLine": None,
        "questionGap": None,
        "questionIndent": None,
        "tableCentered": None,
    },
    "trim": {"marker": None},
}

ET.register_namespace("w", W_NS)
ET.register_namespace("r", R_NS)

OPTION_MARKER_PATTERN = re.compile(r"\(([A-D])\)\s*")
QUESTION_SECTION_PATTERN = re.compile(r"^[一二三四五六七八九十]+、")
INLINE_MATH_PUNCT_PATTERN = re.compile(r"\$([^$\n]+)\$([，。；：,.!?）)])")
INLINE_MATH_PATTERN = re.compile(r"\$([^$\n]+)\$")
SCRIPT_TOKEN_PATTERN = re.compile(
    r"([A-Za-z]+)_([A-Za-z0-9]+)|([A-Za-z0-9()]+)\^([A-Za-z0-9]+)"
)


def load_export_config() -> dict:
    if not EXPORT_CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing export config: {EXPORT_CONFIG_PATH}")

    with EXPORT_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    def validate(node: object, schema: object, path: str = "") -> None:
        if not isinstance(schema, dict):
            if node is None:
                raise KeyError(f"Missing export config key: {path}")
            return

        if not isinstance(node, dict):
            raise KeyError(f"Missing export config key: {path}")

        for key, child_schema in schema.items():
            child_path = f"{path}.{key}" if path else key
            if key not in node:
                raise KeyError(f"Missing export config key: {child_path}")
            validate(node[key], child_schema, child_path)

    validate(config, REQUIRED_EXPORT_SCHEMA)

    return config


def load_latex_replacements() -> dict:
    if not LATEX_REPLACEMENTS_PATH.exists():
        raise FileNotFoundError(
            f"Missing LaTeX replacements config: {LATEX_REPLACEMENTS_PATH}"
        )

    with LATEX_REPLACEMENTS_PATH.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    if not isinstance(config, dict):
        raise ValueError("LaTeX replacements config must be a JSON object")

    for key in ("normalizeMathMarkdown", "latexInlineReadable"):
        value = config.get(key)
        if not isinstance(value, dict):
            raise KeyError(f"Missing LaTeX replacements config key: {key}")

    return config


def heading_style_id(level: int) -> str:
    return f"Heading{level}"


def heading_level_from_style(style_id: str) -> int | None:
    if not style_id.startswith("Heading"):
        return None

    suffix = style_id.removeprefix("Heading")
    return int(suffix) if suffix.isdigit() else None


def qn(tag: str) -> str:
    prefix, local = tag.split(":")
    if prefix != "w":
        raise ValueError(f"Unsupported namespace prefix: {prefix}")
    return f"{{{W_NS}}}{local}"


def qnr(tag: str) -> str:
    prefix, local = tag.split(":")
    if prefix != "r":
        raise ValueError(f"Unsupported namespace prefix: {prefix}")
    return f"{{{R_NS}}}{local}"


def set_font(
    rpr: ET.Element,
    east_asia: str,
    latin: str,
    size_half_points: int,
    bold: bool = False,
) -> None:
    rfonts = rpr.find("w:rFonts", NS)
    if rfonts is None:
        rfonts = ET.SubElement(rpr, qn("w:rFonts"))
    rfonts.set(qn("w:ascii"), latin)
    rfonts.set(qn("w:hAnsi"), latin)
    rfonts.set(qn("w:cs"), latin)
    rfonts.set(qn("w:eastAsia"), east_asia)
    rfonts.set(qn("w:hint"), "eastAsia")

    sz = rpr.find("w:sz", NS)
    if sz is None:
        sz = ET.SubElement(rpr, qn("w:sz"))
    sz.set(qn("w:val"), str(size_half_points))

    szcs = rpr.find("w:szCs", NS)
    if szcs is None:
        szcs = ET.SubElement(rpr, qn("w:szCs"))
    szcs.set(qn("w:val"), str(size_half_points))

    lang = rpr.find("w:lang", NS)
    if lang is None:
        lang = ET.SubElement(rpr, qn("w:lang"))
    lang.set(qn("w:eastAsia"), "zh-CN")

    bold_node = rpr.find("w:b", NS)
    if bold:
        if bold_node is None:
            bold_node = ET.SubElement(rpr, qn("w:b"))
        bold_node.set(qn("w:val"), "1")
    elif bold_node is not None:
        rpr.remove(bold_node)


def set_color(rpr: ET.Element, value: str = "000000") -> None:
    color = rpr.find("w:color", NS)
    if color is None:
        color = ET.SubElement(rpr, qn("w:color"))
    color.set(qn("w:val"), value)
    for theme_attr in ("themeColor", "themeShade", "themeTint"):
        namespaced = qn(f"w:{theme_attr}")
        if namespaced in color.attrib:
            del color.attrib[namespaced]


def ensure_ppr(parent: ET.Element) -> ET.Element:
    ppr = parent.find("w:pPr", NS)
    if ppr is None:
        ppr = ET.SubElement(parent, qn("w:pPr"))
    return ppr


def ensure_rpr(parent: ET.Element) -> ET.Element:
    rpr = parent.find("w:rPr", NS)
    if rpr is None:
        rpr = ET.SubElement(parent, qn("w:rPr"))
    return rpr


def set_spacing(
    ppr: ET.Element, before: int = 0, after: int = 0, line: int = 240
) -> None:
    spacing = ppr.find("w:spacing", NS)
    if spacing is None:
        spacing = ET.SubElement(ppr, qn("w:spacing"))
    spacing.set(qn("w:before"), str(before))
    spacing.set(qn("w:after"), str(after))
    spacing.set(qn("w:line"), str(line))
    spacing.set(qn("w:lineRule"), "auto")


def set_alignment(ppr: ET.Element, value: str) -> None:
    jc = ppr.find("w:jc", NS)
    if jc is None:
        jc = ET.SubElement(ppr, qn("w:jc"))
    jc.set(qn("w:val"), value)


def set_indent(
    ppr: ET.Element, *, left: int = 0, first_line: int = 0, hanging: int = 0
) -> None:
    ind = ppr.find("w:ind", NS)
    if ind is None:
        ind = ET.SubElement(ppr, qn("w:ind"))
    ind.set(qn("w:left"), str(left))
    ind.set(qn("w:firstLine"), str(first_line))
    ind.set(qn("w:hanging"), str(hanging))


def set_table_alignment(table: ET.Element, value: str) -> None:
    tbl_pr = table.find("w:tblPr", NS)
    if tbl_pr is None:
        tbl_pr = ET.SubElement(table, qn("w:tblPr"))
    jc = tbl_pr.find("w:jc", NS)
    if jc is None:
        jc = ET.SubElement(tbl_pr, qn("w:jc"))
    jc.set(qn("w:val"), value)


def set_table_borders(table: ET.Element, style: str) -> None:
    tbl_pr = table.find("w:tblPr", NS)
    if tbl_pr is None:
        tbl_pr = ET.SubElement(table, qn("w:tblPr"))

    tbl_borders = tbl_pr.find("w:tblBorders", NS)
    if tbl_borders is None:
        tbl_borders = ET.SubElement(tbl_pr, qn("w:tblBorders"))

    for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = tbl_borders.find(f"w:{side}", NS)
        if border is None:
            border = ET.SubElement(tbl_borders, qn(f"w:{side}"))
        border.set(qn("w:val"), style)
        border.set(qn("w:sz"), "8")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "000000")


def apply_text_format(parent: ET.Element, font_cfg: dict) -> None:
    rpr = ensure_rpr(parent)
    set_font(
        rpr,
        east_asia=font_cfg["eastAsia"],
        latin=font_cfg["latin"],
        size_half_points=font_cfg["sizeHalfPoints"],
        bold=font_cfg.get("bold", False),
    )
    set_color(rpr)


def apply_paragraph_format(
    parent: ET.Element,
    font_cfg: dict,
    spacing_cfg: dict,
    *,
    alignment: str | None = None,
    indent_cfg: dict | None = None,
    before: int | None = None,
    after: int | None = None,
) -> None:
    ppr = ensure_ppr(parent)
    set_spacing(
        ppr,
        before=spacing_cfg["before"] if before is None else before,
        after=spacing_cfg["after"] if after is None else after,
        line=spacing_cfg["line"],
    )
    if alignment is not None:
        set_alignment(ppr, alignment)
    if indent_cfg is not None:
        set_indent(
            ppr,
            left=indent_cfg.get("left", 0),
            first_line=indent_cfg.get("firstLine", 0),
            hanging=indent_cfg.get("hanging", 0),
        )
    apply_text_format(parent, font_cfg)


def strip_runs(paragraph: ET.Element) -> None:
    for child in list(paragraph):
        if child.tag == qn("w:r"):
            paragraph.remove(child)


def append_text_run(paragraph: ET.Element, text: str, font_cfg: dict) -> None:
    if not text:
        return
    run = ET.SubElement(paragraph, qn("w:r"))
    apply_run_format(run, font_cfg)
    text_node = ET.SubElement(run, qn("w:t"))
    if text[:1].isspace() or text[-1:].isspace():
        text_node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    text_node.text = text


def set_vertical_align(run: ET.Element, value: str) -> None:
    rpr = ensure_rpr(run)
    vert_align = rpr.find("w:vertAlign", NS)
    if vert_align is None:
        vert_align = ET.SubElement(rpr, qn("w:vertAlign"))
    vert_align.set(qn("w:val"), value)


def append_scripted_text_runs(paragraph: ET.Element, text: str, font_cfg: dict) -> bool:
    matches = list(SCRIPT_TOKEN_PATTERN.finditer(text))
    if not matches:
        return False

    cursor = 0
    for match in matches:
        start, end = match.span()
        if start > cursor:
            append_text_run(paragraph, text[cursor:start], font_cfg)

        if match.group(1) is not None:
            base = match.group(1)
            script = match.group(2)
            append_text_run(paragraph, base, font_cfg)
            run = ET.SubElement(paragraph, qn("w:r"))
            apply_run_format(run, font_cfg)
            set_vertical_align(run, "subscript")
            text_node = ET.SubElement(run, qn("w:t"))
            text_node.text = script
        else:
            base = match.group(3)
            script = match.group(4)
            append_text_run(paragraph, base, font_cfg)
            run = ET.SubElement(paragraph, qn("w:r"))
            apply_run_format(run, font_cfg)
            set_vertical_align(run, "superscript")
            text_node = ET.SubElement(run, qn("w:t"))
            text_node.text = script

        cursor = end

    if cursor < len(text):
        append_text_run(paragraph, text[cursor:], font_cfg)
    return True


def append_tab_run(paragraph: ET.Element, font_cfg: dict) -> None:
    run = ET.SubElement(paragraph, qn("w:r"))
    apply_run_format(run, font_cfg)
    ET.SubElement(run, qn("w:tab"))


def split_section_text(text: str) -> tuple[str, str]:
    match = re.match(r"^(.*?)([（(][^）)]*[）)])$", text)
    if not match:
        return text, ""
    return match.group(1).rstrip(), match.group(2)


def parse_option_segments(text: str) -> list[tuple[str, str]] | None:
    matches = list(OPTION_MARKER_PATTERN.finditer(text))
    if not matches or matches[0].start() != 0:
        return None

    segments: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        next_start = (
            matches[index + 1].start() if index + 1 < len(matches) else len(text)
        )
        option_text = text[match.end() : next_start].strip()
        if not option_text:
            return None
        segments.append((match.group(1), option_text))
    return segments if len(segments) > 1 else None


def is_option_table(table: ET.Element) -> bool:
    caption = table.find("w:tblPr/w:tblCaption", NS)
    return caption is not None and caption.get(qn("w:val")) == "option-layout"


def is_question_section_title(text: str) -> bool:
    return bool(QUESTION_SECTION_PATTERN.match(text))


def style_cfg(role: str) -> dict:
    return EXPORT_CONFIG["styles"][role]


def is_section_heading(style_id: str, text: str, section_level: int) -> bool:
    heading_level = heading_level_from_style(style_id)
    return (
        style_id == heading_style_id(section_level)
        or bool(re.match(r"^(注意事项|[一二三四五六七八九十]+、)", text))
        or (heading_level is not None and heading_level > section_level)
    )


def resolve_paragraph_role(style_id: str, text: str, heading1_index: int) -> str:
    rules_cfg = EXPORT_CONFIG["rules"]
    title_style_id = heading_style_id(int(rules_cfg["titleLevel"]))
    section_level = int(rules_cfg["sectionLevel"])

    if style_id == title_style_id:
        return "firstTitle" if heading1_index == 1 else "secondTitle"
    if text.startswith("试卷代码："):
        return "paperCode"
    if text.startswith("适用对象："):
        return "targetMajor"
    if is_section_heading(style_id, text, section_level):
        return "sectionTitle"
    return "body"


def rebuild_section_heading(paragraph: ET.Element, text: str) -> None:
    strip_runs(paragraph)
    title_text, note_text = split_section_text(text)
    if not append_scripted_text_runs(
        paragraph, title_text, style_cfg("sectionTitle")["font"]
    ):
        append_text_run(paragraph, title_text, style_cfg("sectionTitle")["font"])
    if not append_scripted_text_runs(
        paragraph, note_text, style_cfg("sectionNote")["font"]
    ):
        append_text_run(paragraph, note_text, style_cfg("sectionNote")["font"])


def rebuild_option_paragraph(paragraph: ET.Element, text: str, font_cfg: dict) -> bool:
    segments = parse_option_segments(text)
    if segments is None:
        return False

    strip_runs(paragraph)
    for index, (label, option_text) in enumerate(segments):
        merged = f"{label}.{option_text}"
        if not append_scripted_text_runs(paragraph, merged, font_cfg):
            append_text_run(paragraph, merged, font_cfg)
        if index < len(segments) - 1:
            append_tab_run(paragraph, font_cfg)
            append_tab_run(paragraph, font_cfg)
    return True


def build_option_table(segments: list[tuple[str, str]]) -> ET.Element:
    margins = EXPORT_CONFIG["document"]["margins"]
    page_width = EXPORT_CONFIG["document"]["pageSize"]["width"]
    content_width = page_width - margins["left"] - margins["right"]
    table_width = int(content_width * 0.82)
    column_width = table_width // 2

    table = ET.Element(qn("w:tbl"))
    tbl_pr = ET.SubElement(table, qn("w:tblPr"))
    tbl_caption = ET.SubElement(tbl_pr, qn("w:tblCaption"))
    tbl_caption.set(qn("w:val"), "option-layout")

    tbl_w = ET.SubElement(tbl_pr, qn("w:tblW"))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(table_width))

    tbl_layout = ET.SubElement(tbl_pr, qn("w:tblLayout"))
    tbl_layout.set(qn("w:type"), "fixed")

    tbl_jc = ET.SubElement(tbl_pr, qn("w:jc"))
    tbl_jc.set(qn("w:val"), "center")

    tbl_borders = ET.SubElement(tbl_pr, qn("w:tblBorders"))
    for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = ET.SubElement(tbl_borders, qn(f"w:{side}"))
        border.set(qn("w:val"), "nil")

    tbl_grid = ET.SubElement(table, qn("w:tblGrid"))
    for _ in range(2):
        grid_col = ET.SubElement(tbl_grid, qn("w:gridCol"))
        grid_col.set(qn("w:w"), str(column_width))

    body_font = style_cfg("body")["font"]
    for row_start in range(0, len(segments), 2):
        row = ET.SubElement(table, qn("w:tr"))
        row_segments = segments[row_start : row_start + 2]
        for column_index in range(2):
            cell = ET.SubElement(row, qn("w:tc"))
            tc_pr = ET.SubElement(cell, qn("w:tcPr"))
            tc_w = ET.SubElement(tc_pr, qn("w:tcW"))
            tc_w.set(qn("w:type"), "dxa")
            tc_w.set(qn("w:w"), str(column_width))

            paragraph = ET.SubElement(cell, qn("w:p"))
            ppr = ET.SubElement(paragraph, qn("w:pPr"))
            set_alignment(ppr, "left")
            set_spacing(ppr, **style_cfg("body")["spacing"])
            set_indent(ppr, left=0, first_line=0, hanging=0)

            if column_index < len(row_segments):
                label, option_text = row_segments[column_index]
                append_text_run(paragraph, f"{label}.{option_text}", body_font)

    return table


def next_relationship_id(rels_root: ET.Element) -> str:
    max_id = 0
    for rel in rels_root.findall(f"{{{PKG_REL_NS}}}Relationship"):
        rel_id = rel.get("Id", "")
        if rel_id.startswith("rId") and rel_id[3:].isdigit():
            max_id = max(max_id, int(rel_id[3:]))
    return f"rId{max_id + 1}"


def append_field_run(parent: ET.Element, instr: str, font_cfg: dict) -> None:
    field = ET.SubElement(parent, qn("w:fldSimple"))
    field.set(qn("w:instr"), instr)
    run = ET.SubElement(field, qn("w:r"))
    apply_run_format(run, font_cfg)
    text_node = ET.SubElement(run, qn("w:t"))
    text_node.text = "1"


def create_footer_xml(footer_path: Path) -> None:
    body_font = style_cfg("body")["font"]
    body_spacing = style_cfg("body")["spacing"]

    root = ET.Element(qn("w:ftr"))
    paragraph = ET.SubElement(root, qn("w:p"))
    ppr = ET.SubElement(paragraph, qn("w:pPr"))
    set_alignment(ppr, "center")
    set_spacing(ppr, **body_spacing)
    set_indent(ppr, left=0, first_line=0, hanging=0)

    append_text_run(paragraph, "（第", body_font)
    append_field_run(paragraph, " PAGE ", body_font)
    append_text_run(paragraph, "页 共", body_font)
    append_field_run(paragraph, " NUMPAGES ", body_font)
    append_text_run(paragraph, "页）", body_font)

    tree = ET.ElementTree(root)
    tree.write(footer_path, encoding="utf-8", xml_declaration=True)


def patch_content_types(content_types_path: Path) -> None:
    tree = ET.parse(content_types_path)
    root = tree.getroot()
    footer_part = "/word/footer1.xml"

    for override in root.findall(f"{{{CT_NS}}}Override"):
        if override.get("PartName") == footer_part:
            tree.write(content_types_path, encoding="utf-8", xml_declaration=True)
            return

    override = ET.SubElement(root, f"{{{CT_NS}}}Override")
    override.set("PartName", footer_part)
    override.set(
        "ContentType",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
    )
    tree.write(content_types_path, encoding="utf-8", xml_declaration=True)


def patch_document_relationships(rels_path: Path) -> str:
    tree = ET.parse(rels_path)
    root = tree.getroot()
    footer_target = "footer1.xml"
    footer_type = (
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"
    )

    for rel in root.findall(f"{{{PKG_REL_NS}}}Relationship"):
        if rel.get("Type") == footer_type and rel.get("Target") == footer_target:
            rel_id = rel.get("Id")
            tree.write(rels_path, encoding="utf-8", xml_declaration=True)
            return rel_id

    rel_id = next_relationship_id(root)
    rel = ET.SubElement(root, f"{{{PKG_REL_NS}}}Relationship")
    rel.set("Id", rel_id)
    rel.set("Type", footer_type)
    rel.set("Target", footer_target)
    tree.write(rels_path, encoding="utf-8", xml_declaration=True)
    return rel_id


def replace_option_paragraphs(body: ET.Element) -> None:
    for child in list(body):
        if child.tag != qn("w:p"):
            continue
        segments = parse_option_segments(paragraph_text(child))
        if segments is None:
            continue
        insert_at = list(body).index(child)
        body.insert(insert_at, build_option_table(segments))
        body.remove(child)


def materialize_question_numbers(body: ET.Element) -> None:
    question_index = 0
    in_question_section = False

    for child in list(body):
        if child.tag != qn("w:p"):
            continue

        text = paragraph_text(child)
        if text == "注意事项":
            in_question_section = False
            continue
        if is_question_section_title(text):
            in_question_section = True
            continue

        ppr = ensure_ppr(child)
        num_pr = ppr.find("w:numPr", NS)
        if num_pr is None or not in_question_section:
            continue

        question_index += 1
        ppr.remove(num_pr)
        strip_runs(child)
        append_text_run(child, f"{question_index}. {text}", style_cfg("body")["font"])


def patch_footer_package(work_dir: Path) -> str:
    footer_path = work_dir / "word" / "footer1.xml"
    create_footer_xml(footer_path)
    patch_content_types(work_dir / "[Content_Types].xml")
    return patch_document_relationships(
        work_dir / "word" / "_rels" / "document.xml.rels"
    )


def patch_styles(styles_path: Path) -> None:
    tree = ET.parse(styles_path)
    root = tree.getroot()
    rules_cfg = EXPORT_CONFIG["rules"]
    title_cfg = style_cfg("firstTitle")
    section_cfg = style_cfg("sectionTitle")
    body_cfg = style_cfg("body")
    title_style_id = heading_style_id(int(rules_cfg["titleLevel"]))
    section_style_id = heading_style_id(int(rules_cfg["sectionLevel"]))

    doc_defaults = root.find("w:docDefaults", NS)
    if doc_defaults is not None:
        rpr_default = doc_defaults.find("w:rPrDefault", NS)
        if rpr_default is None:
            rpr_default = ET.SubElement(doc_defaults, qn("w:rPrDefault"))
        apply_text_format(rpr_default, body_cfg["font"])

        ppr_default = doc_defaults.find("w:pPrDefault", NS)
        if ppr_default is None:
            ppr_default = ET.SubElement(doc_defaults, qn("w:pPrDefault"))
        default_ppr = ensure_ppr(ppr_default)
        set_spacing(default_ppr, **body_cfg["spacing"])

    for style in root.findall("w:style", NS):
        style_id = style.get(qn("w:styleId"))
        if style_id == "Normal":
            apply_paragraph_format(
                style,
                body_cfg["font"],
                body_cfg["spacing"],
                alignment=body_cfg.get("alignment"),
                indent_cfg=body_cfg.get("indent"),
            )
        elif style_id == title_style_id:
            apply_paragraph_format(
                style,
                title_cfg["font"],
                title_cfg["spacing"],
                alignment=title_cfg.get("alignment", "left"),
            )
        elif style_id == section_style_id:
            apply_paragraph_format(
                style,
                section_cfg["font"],
                section_cfg["spacing"],
                alignment=section_cfg.get("alignment"),
                indent_cfg=section_cfg.get("indent"),
            )

    tree.write(styles_path, encoding="utf-8", xml_declaration=True)


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()


def remove_empty_paragraphs(body: ET.Element) -> None:
    for paragraph in list(body.findall("w:p", NS)):
        text = paragraph_text(paragraph)
        has_non_text_content = (
            paragraph.find(".//w:drawing", NS) is not None
            or paragraph.find(".//w:object", NS) is not None
            or paragraph.find(".//w:tbl", NS) is not None
        )
        if not text and not has_non_text_content:
            body.remove(paragraph)


def apply_run_format(run: ET.Element, font_cfg: dict) -> None:
    apply_text_format(run, font_cfg)


def patch_paragraph(paragraph: ET.Element, heading1_index: int) -> int:
    text = paragraph_text(paragraph)
    ppr = ensure_ppr(paragraph)
    pstyle = ppr.find("w:pStyle", NS)
    style_id = pstyle.get(qn("w:val")) if pstyle is not None else "Normal"
    rules_cfg = EXPORT_CONFIG["rules"]
    if style_id == heading_style_id(int(rules_cfg["titleLevel"])):
        heading1_index += 1

    role = resolve_paragraph_role(style_id, text, heading1_index)
    cfg = style_cfg(role)
    spacing_cfg = cfg.get("spacing", style_cfg("body")["spacing"])
    indent_cfg = cfg.get("indent")

    if role == "body" and not rules_cfg.get("questionGap"):
        after = 0
    else:
        after = spacing_cfg["after"]

    if role == "body" and not rules_cfg.get("questionIndent"):
        indent_cfg = {"left": 0, "firstLine": 0, "hanging": 0}

    before = spacing_cfg["before"]
    if role == "sectionTitle" and not rules_cfg.get("sectionBeforeBlankLine"):
        before = 0

    apply_paragraph_format(
        paragraph,
        cfg["font"],
        spacing_cfg,
        alignment=cfg.get("alignment"),
        indent_cfg=indent_cfg,
        before=before,
        after=after,
    )

    if role == "sectionTitle":
        rebuild_section_heading(paragraph, text)
    else:
        if not rebuild_option_paragraph(paragraph, text, cfg["font"]):
            strip_runs(paragraph)
            if not append_scripted_text_runs(paragraph, text, cfg["font"]):
                append_text_run(paragraph, text, cfg["font"])

    return heading1_index


def patch_tables(body: ET.Element) -> None:
    rules_cfg = EXPORT_CONFIG["rules"]
    table_cfg = EXPORT_CONFIG["styles"].get("table", {})
    table_border_style = table_cfg.get("borderStyle", "single")
    for table in body.findall(".//w:tbl", NS):
        if is_option_table(table):
            continue
        if rules_cfg.get("tableCentered", False):
            set_table_alignment(table, table_cfg.get("alignment", "center"))
        set_table_borders(table, table_border_style)


def normalize_question_numbering(text: str) -> str:
    if EXPORT_CONFIG["rules"].get("questionNumbering") != "global":
        return text

    lines = text.splitlines()
    question_zone = False
    question_index = 0
    normalized = []

    for line in lines:
        if re.match(r"^##\s+[一二三四五六七八九十]+、", line):
            question_zone = True
            normalized.append(line)
            continue

        if question_zone:
            match = re.match(r"^(\d+)\.\s+(.*)$", line)
            if match:
                question_index += 1
                normalized.append(f"{question_index}. {match.group(2)}")
                continue

        normalized.append(line)

    return "\n".join(normalized)


def patch_document(document_path: Path, footer_rel_id: str) -> None:
    tree = ET.parse(document_path)
    root = tree.getroot()

    body = root.find("w:body", NS)
    if body is None:
        raise RuntimeError("DOCX document body not found")

    sect_pr = body.find("w:sectPr", NS)
    if sect_pr is None:
        sect_pr = ET.SubElement(body, qn("w:sectPr"))

    pg_sz = sect_pr.find("w:pgSz", NS)
    if pg_sz is None:
        pg_sz = ET.SubElement(sect_pr, qn("w:pgSz"))
    page_size = EXPORT_CONFIG["document"]["pageSize"]
    pg_sz.set(qn("w:w"), str(page_size["width"]))
    pg_sz.set(qn("w:h"), str(page_size["height"]))

    pg_mar = sect_pr.find("w:pgMar", NS)
    if pg_mar is None:
        pg_mar = ET.SubElement(sect_pr, qn("w:pgMar"))
    for attr, value in EXPORT_CONFIG["document"]["margins"].items():
        pg_mar.set(qn(f"w:{attr}"), str(value))

    footer_ref = None
    for ref in sect_pr.findall("w:footerReference", NS):
        if ref.get(qn("w:type")) == "default":
            footer_ref = ref
            break
    if footer_ref is None:
        footer_ref = ET.SubElement(sect_pr, qn("w:footerReference"))
    footer_ref.set(qn("w:type"), "default")
    footer_ref.set(qnr("r:id"), footer_rel_id)

    remove_empty_paragraphs(body)
    materialize_question_numbers(body)
    replace_option_paragraphs(body)

    heading1_index = 0
    for paragraph in body.findall(".//w:p", NS):
        heading1_index = patch_paragraph(paragraph, heading1_index)

    patch_tables(body)

    tree.write(document_path, encoding="utf-8", xml_declaration=True)


def trim_exam_markdown(text: str) -> str:
    marker = EXPORT_CONFIG.get("trim", {}).get("marker", "## 制卷提示")
    if marker in text:
        text = text.split(marker, 1)[0].rstrip() + "\n"
    return text


def normalize_math_markdown(text: str) -> str:
    # Keep inline math adjacent to punctuation stable for pandoc -> docx conversion.
    text = INLINE_MATH_PUNCT_PATTERN.sub(r"$\1$ \2", text)
    # Normalize a few common LaTeX commands to avoid malformed plain-text fallback runs.
    for source, target in LATEX_REPLACEMENTS["normalizeMathMarkdown"].items():
        text = text.replace(source, target)
    return text


def latex_inline_to_readable_text(expr: str) -> str:
    expr = expr.strip()
    for source, target in LATEX_REPLACEMENTS["latexInlineReadable"].items():
        expr = expr.replace(source, target)

    frac_pattern = re.compile(r"\\frac\{([^{}]+)\}\{([^{}]+)\}")
    while frac_pattern.search(expr):
        expr = frac_pattern.sub(r"(\1)/(\2)", expr)

    sub_pattern = re.compile(r"([A-Za-z])_\{?([A-Za-z0-9]+)\}?")
    return sub_pattern.sub(r"\1_\2", expr)


def replace_inline_math_with_readable_text(text: str) -> str:
    return INLINE_MATH_PATTERN.sub(
        lambda match: latex_inline_to_readable_text(match.group(1)), text
    )


def rebuild_docx(docx_path: Path, work_dir: Path) -> None:
    tmp_out = work_dir / "patched.docx"
    with zipfile.ZipFile(tmp_out, "w", compression=zipfile.ZIP_DEFLATED) as out_zip:
        for item in sorted(work_dir.rglob("*")):
            if item == tmp_out or item.is_dir():
                continue
            out_zip.write(item, item.relative_to(work_dir))
    shutil.move(tmp_out, docx_path)


def generate_docx(input_md: Path, output_docx: Path) -> None:
    source_text = input_md.read_text(encoding="utf-8")
    cleaned_text = normalize_math_markdown(
        normalize_question_numbering(trim_exam_markdown(source_text))
    )
    cleaned_text = replace_inline_math_with_readable_text(cleaned_text)

    with tempfile.TemporaryDirectory() as tmp_dir_name:
        tmp_dir = Path(tmp_dir_name)
        cleaned_md = tmp_dir / input_md.name
        cleaned_md.write_text(cleaned_text, encoding="utf-8")

        subprocess.run(
            [
                "pandoc",
                "-f",
                "gfm+tex_math_dollars",
                str(cleaned_md),
                "-o",
                str(output_docx),
            ],
            check=True,
        )

        unpack_dir = tmp_dir / "docx"
        unpack_dir.mkdir()
        with zipfile.ZipFile(output_docx, "r") as in_zip:
            in_zip.extractall(unpack_dir)

        footer_rel_id = patch_footer_package(unpack_dir)
        patch_styles(unpack_dir / "word" / "styles.xml")
        patch_document(unpack_dir / "word" / "document.xml", footer_rel_id)
        rebuild_docx(output_docx, unpack_dir)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate exam DOCX from markdown with fixed paper and typography."
    )
    parser.add_argument("input_md", type=Path, nargs="?", default=DEFAULT_INPUT_MD)
    parser.add_argument("-o", "--output", dest="output_docx", type=Path)
    args = parser.parse_args()

    input_md = args.input_md.resolve()
    output_docx = (
        args.output_docx.resolve()
        if args.output_docx
        else input_md.with_suffix(".docx")
    )

    global EXPORT_CONFIG
    global LATEX_REPLACEMENTS
    EXPORT_CONFIG = load_export_config()
    LATEX_REPLACEMENTS = load_latex_replacements()
    generate_docx(input_md, output_docx)
    print(output_docx)


if __name__ == "__main__":
    main()
