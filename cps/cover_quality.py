"""Per-user cover quality, independent of the theme and device settings."""
COVER_QUALITY_MODES = ("optimized", "high", "original")
DEFAULT_COVER_QUALITY = "high"


def cover_quality_for(user):
    settings = getattr(user, "view_settings", None)
    value = settings.get("cover_quality") if isinstance(settings, dict) else None
    return value if value in COVER_QUALITY_MODES else DEFAULT_COVER_QUALITY


def with_cover_quality(settings, mode):
    if mode not in COVER_QUALITY_MODES:
        raise ValueError("Invalid cover quality")
    result = dict(settings or {})
    result["cover_quality"] = mode
    return result
