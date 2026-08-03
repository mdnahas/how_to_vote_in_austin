/* 查县 — 渐进增强。
   使用官方的美国人口普查地理编码器（U.S. Census Geocoder），把地址表格变成页内查县工具。
   使用纯 ES5 以兼容旧浏览器。若关闭 JavaScript，普通 <form> 会提交到同一官方端点。 */

(function () {
  "use strict";

  var form = document.getElementById("county-form");
  if (!form) { return; }

  var street = document.getElementById("county-street");
  var city = document.getElementById("county-city");
  var state = document.getElementById("county-state");
  var result = document.getElementById("county-result");
  var button = document.getElementById("county-button");

  function show(html) { result.innerHTML = html; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fallbackMsg(reason) {
    show(
      "<p>抱歉——我们现在无法查询（" + esc(reason) + "）。</p>" +
      "<p>请检查您的地址后重试，或使用官方查询：" +
      '<a href="https://geocoding.geo.census.gov/geocoder/" rel="noopener">' +
      "美国人口普查地址查询</a>（可能只有英文）。</p>"
    );
  }

  function lookup(params, onOk, onErr) {
    var name = "censusCb_" + Date.now();
    var script = document.createElement("script");
    var done = false;

    var timer = setTimeout(function () {
      if (done) { return; }
      done = true; cleanup(); onErr("耗时过长");
    }, 6000);

    function cleanup() {
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (script && script.parentNode) { script.parentNode.removeChild(script); }
    }

    window[name] = function (data) {
      if (done) { return; }
      done = true; clearTimeout(timer); cleanup();
      try {
        var matches = data.result.addressMatches;
        if (!matches || !matches.length) { onErr("我们找不到该地址"); return; }
        var m = matches[0];
        onOk(m.matchedAddress, m.geographies.Counties[0].NAME, m.geographies.States[0].NAME);
      } catch (e) {
        onErr("我们无法读取结果");
      }
    };

    script.onerror = function () {
      if (done) { return; }
      done = true; clearTimeout(timer); cleanup();
      onErr("我们无法连接查询服务");
    };

    script.src =
      "https://geocoding.geo.census.gov/geocoder/geographies/address?" + params +
      "&benchmark=Public_AR_Current&vintage=Current_Current&format=jsonp&callback=" + name;
    document.head.appendChild(script);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var st = (street.value || "").replace(/\s+/g, " ").trim();
    var ci = (city.value || "").replace(/\s+/g, " ").trim();
    var stt = (state.value || "TX").trim();

    if (!st) { show("<p>请输入您的街道地址。</p>"); street.focus(); return; }
    if (!ci) { show("<p>请输入您的城市，以便我们确定您所在的县。</p>"); city.focus(); return; }

    show("<p>正在查找您所在的县…</p>");
    if (button) { button.disabled = true; }

    var params =
      "street=" + encodeURIComponent(st) +
      "&city=" + encodeURIComponent(ci) +
      "&state=" + encodeURIComponent(stt);

    lookup(params, function (matched, county, stateName) {
      if (button) { button.disabled = false; }
      var warn = "";
      if (stateName && stateName.toLowerCase() !== "texas") {
        warn =
          '<div class="remember"><p><strong>这看起来不像是德州的地址。</strong> ' +
          "本指南适用于德州奥斯汀地区。请检查您输入的内容。</p></div>";
      }
      show(
        (matched ? '<p class="matched">我们找到：' + esc(matched) + "</p>" : "") +
        "<p>您住在 <strong>" + esc(county) + "，" + esc(stateName) + "</strong>。</p>" +
        warn +
        '<div class="remember"><p><strong>请写下或记住您所在的县。</strong> ' +
        "接下来的页面会用到。本网站不会替您保存。</p></div>"
      );
    }, function (reason) {
      if (button) { button.disabled = false; }
      fallbackMsg(reason);
    });
  });
})();
