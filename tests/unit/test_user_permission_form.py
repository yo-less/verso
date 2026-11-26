"""Regression: the permissions card is outside the main user form."""
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from jinja2 import Environment, FileSystemLoader
import pytest
from cps import constants

pytestmark = pytest.mark.unit
TEMPLATES = Path(__file__).resolve().parents[2] / "cps" / "templates"


class Inputs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inputs = []

    def handle_starttag(self, tag, attrs):
        if tag == "input":
            self.inputs.append(dict(attrs))


@pytest.mark.parametrize("checked", [
    set(),
    {"download_role", "viewer_role"},
    set(constants.ALL_ROLES),
])
def test_permission_switches_submit_to_main_form(checked):
    source = (TEMPLATES / "user_edit.html").read_text(encoding="utf-8")
    section = source.split('{#- Permissions (admin) -#}', 1)[1].split('<div class="form-actions', 1)[0]
    env = Environment(loader=FileSystemLoader(TEMPLATES))
    env.filters.update(get_cover_srcset=lambda _: "", last_modified=lambda _: "",
                       music=lambda _: False, formatfloat=lambda value, *args: str(value),
                       url_for_other_page=lambda _: "")
    env.globals["_"] = lambda value: value
    methods = {"role_admin": "admin_role", "role_download": "download_role",
               "role_viewer": "viewer_role", "role_upload": "upload_role",
               "role_edit": "edit_role", "role_delete_books": "delete_role",
               "role_passwd": "passwd_role", "role_edit_shelfs": "edit_shelf_role"}
    content = SimpleNamespace(**{method: (lambda key=key: key in checked)
                                 for method, key in methods.items()})
    html = env.from_string('{% import "_macros.html" as ui with context %}' + section).render(
        is_admin_view=True, is_anon=False, config=SimpleNamespace(config_uploading=True),
        content=content)
    parser = Inputs()
    parser.feed(html)
    assert {entry["name"] for entry in parser.inputs} == set(constants.ALL_ROLES)
    assert all(entry.get("form") == "user-form" for entry in parser.inputs)
    submitted = {entry["name"]: entry["value"] for entry in parser.inputs
                 if "checked" in entry and entry["form"] == "user-form"}
    assert constants.selected_roles(submitted) == sum(constants.ALL_ROLES[key] for key in checked)


def test_shared_switch_still_works_inside_normal_form():
    env = Environment(loader=FileSystemLoader(TEMPLATES))
    env.filters.update(get_cover_srcset=lambda _: "", last_modified=lambda _: "",
                       music=lambda _: False, formatfloat=lambda value, *args: str(value),
                       url_for_other_page=lambda _: "")
    html = env.from_string('{% import "_macros.html" as ui %}{{ ui.switch("test", "Test", true) }}').render()
    parser = Inputs()
    parser.feed(html)
    assert parser.inputs[0]["name"] == "test"
    assert "form" not in parser.inputs[0]
    assert "checked" in parser.inputs[0]
