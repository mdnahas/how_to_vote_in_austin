/* County lookup — progressive enhancement.
   Turns the address form into an on-page county finder using the official
   U.S. Census Geocoder. Plain ES5 for old browsers.

   Rules (see README county-box spec):
   - Separate Street / City / State fields. City is pre-filled "Austin", state "TX".
   - City is REQUIRED before we look up, so an incomplete address cannot return a
     false, over-confident match.
   - We echo the matched address back, and show county AND state, so a wrong
     match is obvious. If the state is not Texas, we warn.
   - No API key, nothing stored. JSONP avoids CORS on a static site.
   - ~6s timeout; on timeout/error/no-match, show the fallback link.
   - With JavaScript off, the plain <form> submits to the same official endpoint. */

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
      "<p>Sorry — we could not look that up right now (" + esc(reason) + ").</p>" +
      "<p>Please check your address and try again, or use the official lookup: " +
      '<a href="https://geocoding.geo.census.gov/geocoder/" rel="noopener">' +
      "U.S. Census address lookup</a> (may be in English only).</p>"
    );
  }

  function lookup(params, onOk, onErr) {
    var name = "censusCb_" + Date.now();
    var script = document.createElement("script");
    var done = false;

    var timer = setTimeout(function () {
      if (done) { return; }
      done = true; cleanup(); onErr("it took too long");
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
        if (!matches || !matches.length) { onErr("we could not find that address"); return; }
        var m = matches[0];
        onOk(m.matchedAddress, m.geographies.Counties[0].NAME, m.geographies.States[0].NAME);
      } catch (e) {
        onErr("we could not read the result");
      }
    };

    script.onerror = function () {
      if (done) { return; }
      done = true; clearTimeout(timer); cleanup();
      onErr("we could not reach the lookup service");
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

    if (!st) { show("<p>Please type your street address.</p>"); street.focus(); return; }
    if (!ci) { show("<p>Please type your city, so we can be sure of your county.</p>"); city.focus(); return; }

    show("<p>Looking up your county…</p>");
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
          '<div class="remember"><p><strong>That does not look like a Texas address.</strong> ' +
          "This guide is for the Austin, Texas area. Please check what you typed.</p></div>";
      }
      show(
        (matched ? '<p class="matched">We found: ' + esc(matched) + "</p>" : "") +
        "<p>You live in <strong>" + esc(county) + ", " + esc(stateName) + "</strong>.</p>" +
        warn +
        '<div class="remember"><p><strong>Please write or memorize your county.</strong> ' +
        "You will need it on the next pages. This website does not save it for you.</p></div>"
      );
    }, function (reason) {
      if (button) { button.disabled = false; }
      fallbackMsg(reason);
    });
  });
})();
