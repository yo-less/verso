// Preview selected SVG branding assets without modifying saved settings.
(function () {
  "use strict";
  var form = document.getElementById("branding-form");
  if (!form) return;
  var fields = {};
  var csrf = form.querySelector('input[name="csrf_token"]');
  var rows = form.querySelectorAll("[data-branding-kind]");
  Array.prototype.forEach.call(rows, function (row) {
    fields[row.dataset.brandingKind] = {
      row: row, input: row.querySelector('input[type="file"]'),
      reset: row.querySelector('input[type="checkbox"]'),
      image: row.querySelector("[data-branding-image]"),
      status: row.querySelector("[data-preview-status]"),
      clear: row.querySelector("[data-clear-upload]"),
      generation: 0, selected: null
    };
  });
  function resetRequested(f) { return f.reset && f.reset.checked; }
  function effective(kind) {
    var f = fields[kind];
    if (f.selected) return f.selected;
    if (kind.endsWith("-dark") && (resetRequested(f) || f.row.dataset.custom !== "true")) {
      var light = fields[kind.slice(0, -5)];
      if (light.selected) return light.selected;
      if (!resetRequested(light) && light.row.dataset.custom === "true") return light.row.dataset.savedSrc;
      return f.row.dataset.stockSrc;
    }
    return resetRequested(f) ? f.row.dataset.stockSrc : f.row.dataset.savedSrc;
  }
  function render() {
    Object.keys(fields).forEach(function (kind) {
      var f = fields[kind], src = effective(kind);
      if (f.image.getAttribute("src") !== src) f.image.src = src;
    });
  }
  function status(f, message, error) {
    f.status.textContent = message;
    f.status.classList.toggle("branding-preview-error", !!error);
  }
  async function select(f) {
    var generation = ++f.generation;
    var file = f.input.files[0];
    f.selected = null;
    f.input.setCustomValidity("");
    f.clear.hidden = !file;
    render();
    if (!file) { status(f, "", false); return; }
    if (file.size > 128 * 1024) {
      status(f, "SVG files must be smaller than 128 KiB.", true);
      f.input.setCustomValidity("SVG files must be smaller than 128 KiB.");
      return;
    }
    f.input.setCustomValidity("SVG validation is still in progress.");
    status(f, "Checking SVG…", false);
    var data = new FormData();
    data.append("asset", file);
    if (csrf) data.append("csrf_token", csrf.value);
    try {
      var response = await fetch(form.dataset.previewUrl, {
        method: "POST", body: data, credentials: "same-origin", cache: "no-store"
      });
      var result = await response.json();
      if (generation !== f.generation) return;
      if (!response.ok || typeof result.svg !== "string") throw new Error(result.error || "Could not validate SVG.");
      var src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(result.svg);
      // Render only in an image context; never insert uploaded markup into the DOM.
      var probe = new Image();
      probe.src = src;
      await probe.decode();
      if (generation !== f.generation) return;
      f.selected = src;
      f.input.setCustomValidity("");
      status(f, "Preview · not saved", false);
      render();
    } catch (error) {
      if (generation !== f.generation) return;
      var message = error instanceof Error ? error.message : "Could not preview SVG.";
      f.input.setCustomValidity(message);
      status(f, message, true);
    }
  }
  Object.keys(fields).forEach(function (kind) {
    var f = fields[kind];
    f.input.addEventListener("change", function () { select(f); });
    f.clear.addEventListener("click", function () { f.input.value = ""; select(f); });
    if (f.reset) f.reset.addEventListener("change", render);
  });
  render();
})();
