# -*- coding: utf-8 -*-
# Scriptorium – based on Calibre-Web Automated, a fork of Calibre-Web
# Copyright (C) 2026 Mrcoloo
# SPDX-License-Identifier: GPL-3.0-or-later
# See NOTICE and CONTRIBUTORS for the upstream projects and their authors.

"""Personal style definitions: options, ready-made presets and validation.

Kept free of app imports so it can be unit-tested on its own; the blueprint and
storage live in cps/appearance.py.
"""

SETTINGS_KEY = "appearance"

# Every option and its allowed values; the first value is the default.
OPTIONS = {
    "header": ("plain", "tint", "gradient", "mesh", "aurora", "dots", "grid", "waves", "stripes", "topo", "glass"),
    "sidebar": ("plain", "tinted", "art"),
    "backdrop": ("none", "glow", "dots"),
    "surface": ("neutral", "tinted", "paper", "verso"),
    "buttons": ("mono", "accent", "gradient"),
    "radius": ("default", "sharp", "round"),
    "headings": ("sans", "serif"),
    "vibrancy": ("soft", "vivid"),
}
HUE_KEYS = ("hue", "hue2")
NUMERIC_KEYS = HUE_KEYS + ("paper_depth", "palette_mix", "saturation")
DEFAULT_SATURATION = 100
MAX_SATURATION = 150

# Starting point for editing Classic: the same Verso typography, layout and palette.
CLASSIC = {"hue": 155, "hue2": 35, "paper_depth": 0, "palette_mix": 0, "saturation": DEFAULT_SATURATION, "header": "plain", "sidebar": "plain",
           "backdrop": "none", "surface": "verso", "buttons": "mono",
           "radius": "default", "headings": "serif", "vibrancy": "soft"}

# Ready-made styles. "stock" is the default design and stores nothing.
PRESETS = {
    "stock": {},
    "aurora": {"hue": 275, "hue2": 175, "header": "aurora", "sidebar": "tinted", "backdrop": "glow",
               "surface": "tinted", "buttons": "gradient", "radius": "round", "headings": "sans", "vibrancy": "vivid"},
    "sunset": {"hue": 25, "hue2": 330, "header": "mesh", "sidebar": "plain", "backdrop": "glow",
               "surface": "paper", "buttons": "gradient", "radius": "round", "headings": "serif", "vibrancy": "vivid"},
    "ocean": {"hue": 215, "hue2": 185, "header": "waves", "sidebar": "tinted", "backdrop": "none",
              "surface": "tinted", "buttons": "accent", "radius": "default", "headings": "sans", "vibrancy": "soft"},
    "forest": {"hue": 150, "hue2": 95, "header": "topo", "sidebar": "tinted", "backdrop": "none",
               "surface": "tinted", "buttons": "accent", "radius": "default", "headings": "serif", "vibrancy": "soft"},
    "paper": {"hue": 40, "hue2": 15, "header": "dots", "sidebar": "plain", "backdrop": "none",
              "surface": "paper", "buttons": "accent", "radius": "sharp", "headings": "serif", "vibrancy": "soft"},
    "neon": {"hue": 305, "hue2": 195, "header": "grid", "sidebar": "art", "backdrop": "glow",
             "surface": "neutral", "buttons": "gradient", "radius": "round", "headings": "sans", "vibrancy": "vivid"},
    "lavender": {"hue": 285, "hue2": 330, "header": "gradient", "sidebar": "tinted", "backdrop": "dots",
                 "surface": "tinted", "buttons": "accent", "radius": "round", "headings": "serif", "vibrancy": "soft"},
    "coral": {"hue": 15, "hue2": 45, "header": "stripes", "sidebar": "plain", "backdrop": "none",
              "surface": "neutral", "buttons": "accent", "radius": "round", "headings": "sans", "vibrancy": "vivid"},
    "midnight": {"hue": 255, "hue2": 290, "header": "glass", "sidebar": "art", "backdrop": "dots",
                 "surface": "tinted", "buttons": "accent", "radius": "default", "headings": "serif", "vibrancy": "vivid"},
    "citrus": {"hue": 95, "hue2": 55, "header": "gradient", "sidebar": "plain", "backdrop": "glow",
               "surface": "neutral", "buttons": "gradient", "radius": "round", "headings": "sans", "vibrancy": "vivid"},
}


# Existing presets retain their previous appearance.
for _preset in PRESETS.values():
    if _preset:
        _preset["paper_depth"] = 0
        _preset["palette_mix"] = 0
        _preset["saturation"] = DEFAULT_SATURATION

PRESETS["smoky-aubergine"] = dict(CLASSIC, palette_mix=100)


def sanitize(raw):
    """Return a complete, valid appearance dict, or {} for the stock look."""
    if not isinstance(raw, dict) or not raw:
        return {}
    clean = {}
    for key, allowed in OPTIONS.items():
        value = raw.get(key)
        clean[key] = value if value in allowed else allowed[0]
    for key in HUE_KEYS:
        try:
            clean[key] = int(raw.get(key)) % 360
        except (TypeError, ValueError):
            clean[key] = 230 if key == "hue" else 190
    try:
        clean["paper_depth"] = max(0, min(100, int(raw.get("paper_depth", 0))))
    except (TypeError, ValueError, OverflowError):
        clean["paper_depth"] = 0
    try:
        clean["palette_mix"] = max(0, min(100, int(raw.get("palette_mix", 0))))
    except (TypeError, ValueError, OverflowError):
        clean["palette_mix"] = 0
    try:
        clean["saturation"] = max(0, min(MAX_SATURATION, int(raw.get("saturation", DEFAULT_SATURATION))))
    except (TypeError, ValueError, OverflowError):
        clean["saturation"] = DEFAULT_SATURATION
    return clean


def html_attrs(ap):
    """Attributes that switch an element (the page or a preview) to this appearance."""
    if not ap:
        return {}
    attrs = {"data-ap": ""}
    for key in OPTIONS:
        attrs["data-ap-" + key] = ap[key]
    attrs["style"] = "--ap-h:{};--ap-h2:{};--ap-palette-mix:{}%;--ap-saturation:{:g};--ap-paper-depth:{}%".format(int(ap["hue"]), int(ap["hue2"]), ap.get("palette_mix", 0), ap.get("saturation", DEFAULT_SATURATION) / 100, ap.get("paper_depth", 0))
    return attrs
