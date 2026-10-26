/* Keyboard Tester — keys identified by event.code (physical position), drawn on a CSS grid in quarter-key units. Nothing is stored except layout choice. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;

  // [code, label, width in key units] ; [null, null, w] is a gap. Rows: 0 = function row, 1..5 = main rows.
  function K(code, label, w) { return [code, label, w || 1]; }
  function G(w) { return [null, null, w]; }
  function letters(s) { return Array.from(s).map(function (c) { return K("Key" + c, c); }); }
  var FN = [K("Escape", "Esc"), G(1)].concat(["F1", "F2", "F3", "F4"].map(function (f) { return K(f, f); }), [G(0.5)],
    ["F5", "F6", "F7", "F8"].map(function (f) { return K(f, f); }), [G(0.5)], ["F9", "F10", "F11", "F12"].map(function (f) { return K(f, f); }));
  var NUMROW = [K("Backquote", "`")].concat("1234567890".split("").map(function (d) { return K("Digit" + d, d); }), [K("Minus", "-"), K("Equal", "="), K("Backspace", "Backspace", 2)]);
  var BOTTOM = [K("ControlLeft", "Ctrl", 1.25), K("MetaLeft", "Win", 1.25), K("AltLeft", "Alt", 1.25), K("Space", "", 6.25), K("AltRight", "Alt", 1.25), K("MetaRight", "Win", 1.25), K("ContextMenu", "Menu", 1.25), K("ControlRight", "Ctrl", 1.25)];
  var MAIN = {
    ansi: [FN, NUMROW,
      [K("Tab", "Tab", 1.5)].concat(letters("QWERTYUIOP"), [K("BracketLeft", "["), K("BracketRight", "]"), K("Backslash", "\\", 1.5)]),
      [K("CapsLock", "Caps", 1.75)].concat(letters("ASDFGHJKL"), [K("Semicolon", ";"), K("Quote", "'"), K("Enter", "Enter", 2.25)]),
      [K("ShiftLeft", "Shift", 2.25)].concat(letters("ZXCVBNM"), [K("Comma", ","), K("Period", "."), K("Slash", "/"), K("ShiftRight", "Shift", 2.75)]),
      BOTTOM],
    iso: [FN, NUMROW,
      [K("Tab", "Tab", 1.5)].concat(letters("QWERTYUIOP"), [K("BracketLeft", "["), K("BracketRight", "]"), K("Enter", "Enter", 1.5)]),
      [K("CapsLock", "Caps", 1.75)].concat(letters("ASDFGHJKL"), [K("Semicolon", ";"), K("Quote", "'"), K("Backslash", "#"), K("Enter", "", 1.25)]),
      [K("ShiftLeft", "Shift", 1.25), K("IntlBackslash", "\\")].concat(letters("ZXCVBNM"), [K("Comma", ","), K("Period", "."), K("Slash", "/"), K("ShiftRight", "Shift", 2.75)]),
      BOTTOM]
  };
  var NAV = [[K("PrintScreen", "PrtSc"), K("ScrollLock", "ScrLk"), K("Pause", "Pause")],
    [K("Insert", "Ins"), K("Home", "Home"), K("PageUp", "PgUp")],
    [K("Delete", "Del"), K("End", "End"), K("PageDown", "PgDn")],
    [], [G(1), K("ArrowUp", "↑")], [K("ArrowLeft", "←"), K("ArrowDown", "↓"), K("ArrowRight", "→")]];
  var PAD = [[],
    [K("NumLock", "Num"), K("NumpadDivide", "/"), K("NumpadMultiply", "*"), K("NumpadSubtract", "-")],
    [K("Numpad7", "7"), K("Numpad8", "8"), K("Numpad9", "9"), K("NumpadAdd", "+", -1)],
    [K("Numpad4", "4"), K("Numpad5", "5"), K("Numpad6", "6")],
    [K("Numpad1", "1"), K("Numpad2", "2"), K("Numpad3", "3"), K("NumpadEnter", "Enter", -1)],
    [K("Numpad0", "0", 2), K("NumpadDecimal", ".")]];
  var SIZES = { full: 23, tkl: 18.5, main: 15 };

  // Flatten to positioned keys: {code, label, x, y, w, h} in key units (x from the left edge, y = row 0..5).
  function build(layout, size) {
    var keys = [];
    function place(rows, x0) {
      rows.forEach(function (row, y) {
        var x = x0;
        row.forEach(function (k) {
          var tall = k[2] < 0, w = Math.abs(k[2]);
          if (k[0]) keys.push({ code: k[0], label: k[1], x: x, y: y, w: w, h: tall ? 2 : 1 });
          x += w;
        });
      });
    }
    place(MAIN[layout], 0);
    if (size !== "main") place(NAV, 15.5);
    if (size === "full") place(PAD, 19);
    // ISO Enter is two pieces; mark them so they draw as one L-shaped key
    var enters = keys.filter(function (k) { return k.code === "Enter"; });
    if (enters.length === 2) { enters[0].part = "top"; enters[1].part = "bottom"; }
    return keys;
  }
  function uniqueCodes(keys) { return Array.from(new Set(keys.map(function (k) { return k.code; }))); }

  // ---------- state ----------
  var st = { layout: S3.store("kt.layout") === "iso" ? "iso" : "ansi", size: S3.store("kt.size") || (window.innerWidth < 700 ? "main" : "full"), keys: [], down: new Set(), tested: new Set(), max: 0, count: 0, tabSeen: false, extra: new Set() };
  if (!SIZES[st.size]) st.size = "full";
  var kb = $("#kb"), wrap = $("#wrap"), els = {};

  function draw() {
    st.keys = build(st.layout, st.size);
    kb.innerHTML = ""; els = {};
    kb.style.setProperty("--cols", SIZES[st.size] * 4);
    st.keys.forEach(function (k) {
      var el = S3.h("div", { "class": "kt-k" + (k.part ? " kt-enter-" + k.part : "") + (k.w >= 1.75 || k.label.length > 3 ? " kt-wide" : ""), "data-code": k.code,
        style: "grid-column:" + (k.x * 4 + 1) + " / span " + (k.w * 4) + ";grid-row:" + (k.y === 0 ? 1 : k.y + 2) + " / span " + k.h + ";" }, [S3.h("span", null, [k.label])]);
      (els[k.code] = els[k.code] || []).push(el);
      kb.appendChild(el);
    });
    fit(); paint(); stats();
  }
  function fit() {
    var w = wrap.clientWidth || 900;
    kb.style.setProperty("--u", Math.min(52, Math.floor((w / SIZES[st.size]) * 100) / 100) + "px");
  }
  function paint() {
    Object.keys(els).forEach(function (code) {
      els[code].forEach(function (el) { el.classList.toggle("down", st.down.has(code)); el.classList.toggle("tested", st.tested.has(code)); });
    });
  }
  function stats() {
    var codes = uniqueCodes(st.keys), done = codes.filter(function (c) { return st.tested.has(c); }).length;
    $("#sTested").textContent = done; $("#sTotal").textContent = "of " + codes.length + " keys tested";
    $("#sHeld").textContent = st.down.size; $("#sMax").textContent = st.max; $("#sCount").textContent = st.count.toLocaleString();
    $("#bar").style.width = (codes.length ? done / codes.length * 100 : 0) + "%";
    $("#bar").classList.toggle("done", done === codes.length);
    $("#extra").textContent = st.extra.size ? "Also pressed (not on this diagram): " + Array.from(st.extra).join(", ") : "";
  }

  var LOC = ["Standard", "Left", "Right", "Numpad"];
  function showEvent(e) {
    var k = e.key === " " ? "Space" : e.key;
    $("#lkey").textContent = k.length > 12 ? k.slice(0, 12) + "…" : k;
    $("#ikey").textContent = JSON.stringify(e.key); $("#icode").textContent = e.code || "(empty)";
    $("#ikc").textContent = String(e.keyCode || e.which || 0); $("#iloc").textContent = LOC[e.location] || String(e.location);
    var mods = ["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock"].filter(function (m) { return e.getModifierState && e.getModifierState(m); });
    var imod = $("#imod"); imod.innerHTML = "";
    if (!mods.length) imod.textContent = "none";
    mods.forEach(function (m) { imod.appendChild(S3.h("span", { "class": "chip accent" }, [m])); });
  }
  function log(type, e) {
    var ol = $("#log");
    ol.insertBefore(S3.h("li", null, [S3.h("span", { "class": "kt-ev kt-" + type }, [type === "keydown" ? "↓" : "↑"]), " ", S3.h("code", null, [e.code || e.key]), e.repeat ? S3.h("span", { "class": "faint" }, [" repeat"]) : null]), ol.firstChild);
    while (ol.children.length > 12) ol.removeChild(ol.lastChild);
  }
  function isControl(el) { return el && /^(BUTTON|SELECT|INPUT|TEXTAREA|A)$/.test(el.tagName); }

  function onDown(e) {
    var code = e.code || ("key:" + e.key);
    // Let Tab move focus once it has been tested, and let controls keep Enter/Space.
    var passTab = code === "Tab" && st.tabSeen;
    var passCtl = isControl(document.activeElement) && (code === "Enter" || code === "Space" || code === "NumpadEnter");
    if (!passTab && !passCtl) e.preventDefault();
    if (code === "Tab") st.tabSeen = true;
    if (!e.repeat) st.count++;
    st.down.add(code); st.tested.add(code);
    if (!els[code]) st.extra.add(code);
    st.max = Math.max(st.max, st.down.size);
    showEvent(e); log("keydown", e); paint(); stats();
  }
  function onUp(e) {
    var code = e.code || ("key:" + e.key);
    if (!isControl(document.activeElement)) e.preventDefault();
    if (!st.tested.has(code)) { st.tested.add(code); st.count++; if (!els[code]) st.extra.add(code); showEvent(e); } // PrintScreen only sends keyup on Windows
    st.down.delete(code);
    if (code === "MetaLeft" || code === "MetaRight") st.down.clear(); // macOS drops keyups while Cmd is held
    log("keyup", e); paint(); stats();
  }
  window.addEventListener("keydown", onDown, true);
  window.addEventListener("keyup", onUp, true);
  window.addEventListener("blur", function () { st.down.clear(); paint(); stats(); });

  function reset() {
    st.down.clear(); st.tested.clear(); st.extra.clear(); st.max = 0; st.count = 0; st.tabSeen = false;
    $("#log").innerHTML = ""; $("#lkey").textContent = "—";
    ["#ikey", "#icode", "#ikc", "#iloc", "#imod"].forEach(function (s) { $(s).textContent = "—"; });
    paint(); stats();
  }
  $("#reset").addEventListener("click", function () { reset(); this.blur(); });
  $("#clearlog").addEventListener("click", function () { $("#log").innerHTML = ""; });
  function seg(id, key, prop) {
    $$("#" + id + " button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === st[prop]));
      b.addEventListener("click", function () {
        st[prop] = b.dataset.v; S3.store(key, b.dataset.v);
        $$("#" + id + " button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        draw(); b.blur();
      });
    });
  }
  seg("layout", "kt.layout", "layout"); seg("size", "kt.size", "size");
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap); else window.addEventListener("resize", fit);
  draw();

  function fire(type, code, key) { window.dispatchEvent(new KeyboardEvent(type, { code: code, key: key || code, bubbles: true, cancelable: true })); }

  window.S3_DEMO = function () {
    reset();
    "QWERTYASDFGHZXCVB".split("").forEach(function (c) { fire("keydown", "Key" + c, c.toLowerCase()); fire("keyup", "Key" + c, c.toLowerCase()); });
    ["Digit1", "Digit2", "Digit3", "Escape", "F1", "F2", "Space", "ArrowUp", "ArrowLeft", "Numpad5", "Enter"].forEach(function (c) { fire("keydown", c); fire("keyup", c); });
    ["ShiftLeft", "KeyW", "KeyA", "KeyD"].forEach(function (c) { fire("keydown", c, c === "ShiftLeft" ? "Shift" : c.slice(3)); });
  };

  window.S3_SELFTEST = function () {
    var fails = [];
    function check(c, w) { if (!c) fails.push(w); }
    var ansi = build("ansi", "full"), iso = build("iso", "full");
    check(uniqueCodes(ansi).length === 104, "ANSI full has 104 keys: " + uniqueCodes(ansi).length);
    check(uniqueCodes(iso).length === 105, "ISO full has 105 keys: " + uniqueCodes(iso).length);
    check(uniqueCodes(build("ansi", "tkl")).length === 87 && uniqueCodes(build("ansi", "main")).length === 74, "TKL 87 / compact 74");
    check(iso.some(function (k) { return k.code === "IntlBackslash"; }) && !ansi.some(function (k) { return k.code === "IntlBackslash"; }), "ISO extra key");
    check(ansi.filter(function (k) { return k.code === "Enter"; }).length === 1 && iso.filter(function (k) { return k.code === "Enter"; }).length === 2, "Enter shapes");
    // every main row is exactly 15 units wide
    ["ansi", "iso"].forEach(function (l) { MAIN[l].forEach(function (row, i) { var w = row.reduce(function (s, k) { return s + Math.abs(k[2]); }, 0); if (w !== 15) fails.push(l + " row " + i + " is " + w + "u"); }); });
    // no two keys overlap on the grid
    [ansi, iso].forEach(function (keys) {
      var cells = {};
      keys.forEach(function (k) { for (var x = k.x * 4; x < (k.x + k.w) * 4; x++) for (var y = k.y; y < k.y + k.h; y++) { var id = x + "," + y; if (cells[id] && !(k.code === "Enter")) fails.push("overlap " + k.code + "/" + cells[id]); cells[id] = k.code; } });
    });
    // live events: hold three keys, release, check counters and lighting
    var saved = { tested: new Set(st.tested), down: new Set(st.down), max: st.max, count: st.count };
    reset();
    fire("keydown", "KeyA", "a"); fire("keydown", "KeyS", "s"); fire("keydown", "KeyD", "d");
    check(st.down.size === 3 && st.max === 3 && els.KeyA[0].classList.contains("down"), "three keys held");
    fire("keyup", "KeyA", "a"); fire("keyup", "KeyS", "s"); fire("keyup", "KeyD", "d");
    check(st.down.size === 0 && st.tested.size === 3 && st.max === 3 && st.count === 3 && els.KeyS[0].classList.contains("tested") && !els.KeyS[0].classList.contains("down"), "released and tested");
    fire("keyup", "PrintScreen", "PrintScreen");
    check(st.tested.has("PrintScreen") && st.count === 4, "keyup-only key counted");
    fire("keydown", "MediaPlayPause", "MediaPlayPause"); fire("keyup", "MediaPlayPause");
    check(st.extra.has("MediaPlayPause"), "off-diagram key listed");
    reset();
    check(st.tested.size === 0 && st.max === 0, "reset");
    st.tested = saved.tested; st.down = saved.down; st.max = saved.max; st.count = saved.count; paint(); stats();
    if (fails.length) console.error("selftest: " + fails.join("; "));
    return fails.length === 0;
  };
})();
