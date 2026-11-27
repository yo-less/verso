# Scriptorium – based on Calibre-Web Automated, a fork of Calibre-Web
# Copyright (C) 2026 Mrcoloo
# SPDX-License-Identifier: GPL-3.0-or-later
# See NOTICE and CONTRIBUTORS for the upstream projects and their authors.

"""Personal styles: stored values are always validated, presets are complete, CSS covers every option."""

import importlib.util
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
_SPEC = importlib.util.spec_from_file_location("cwa_appearance_styles", REPO / "cps" / "appearance_styles.py")
styles = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(styles)


@pytest.mark.parametrize("raw", [None, {}, [], "aurora", 42])
def test_empty_or_wrong_type_means_stock(raw):
    assert styles.sanitize(raw) == {}
    assert styles.html_attrs(styles.sanitize(raw)) == {}


def test_unknown_values_fall_back_to_defaults():
    clean = styles.sanitize({"header": "<script>", "radius": "round", "hue": "999", "hue2": "abc", "evil": "x"})
    assert clean["header"] == styles.OPTIONS["header"][0]
    assert clean["radius"] == "round"
    assert clean["hue"] == 999 % 360
    assert clean["hue2"] == 190
    assert "evil" not in clean
    assert set(clean) == set(styles.OPTIONS) | set(styles.NUMERIC_KEYS)


def test_attributes_only_contain_whitelisted_values():
    attrs = styles.html_attrs(styles.sanitize({"header": "mesh", "hue": "12;background:url(x)"}))
    assert attrs["style"] == "--ap-h:230;--ap-h2:190;--ap-paper-depth:0%"
    for key, value in attrs.items():
        if key.startswith("data-ap-"):
            assert value in styles.OPTIONS[key[len("data-ap-"):]]


@pytest.mark.parametrize("name", [n for n in styles.PRESETS if n != "stock"])
def test_presets_are_complete_and_valid(name):
    preset = styles.PRESETS[name]
    assert styles.sanitize(preset) == preset


def test_every_option_value_is_styled():
    """Each non-default value needs a rule in themes.css, or choosing it would do nothing."""
    css = (REPO / "cps" / "static" / "css" / "themes.css").read_text(encoding="utf-8")
    for key, values in styles.OPTIONS.items():
        for value in values[1:]:
            assert re.search(r'data-ap-{}="{}"'.format(key, value), css), (key, value)


def test_classic_is_a_valid_editable_verso_palette():
    assert styles.sanitize(styles.CLASSIC) == styles.CLASSIC
    attrs = styles.html_attrs(styles.CLASSIC)
    assert attrs["data-ap-surface"] == "verso"
    assert attrs["style"] == "--ap-h:155;--ap-h2:35;--ap-paper-depth:0%"


@pytest.mark.parametrize("raw,expected", [(-1,0),(0,0),(80,80),(120,100),("invalid",0)])
def test_paper_tone_is_bounded(raw,expected):
    clean = styles.sanitize(dict(styles.CLASSIC, paper_depth=raw))
    assert clean["paper_depth"] == expected
    assert styles.html_attrs(clean)["style"].endswith("--ap-paper-depth:{}%".format(expected))
