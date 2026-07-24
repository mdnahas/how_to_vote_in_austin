/* Búsqueda de condado — mejora progresiva (versión en español).
   Convierte el formulario de dirección en un buscador de condado en la página,
   usando el Geocodificador oficial de la Oficina del Censo de EE. UU.
   ES5 simple, para navegadores antiguos. Ver README para la especificación. */

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

  // "Travis County" -> "Condado de Travis"
  function condado(name) {
    return name.replace(/\s+County$/, function () { return ""; }) !== name
      ? "Condado de " + name.replace(/\s+County$/, "")
      : name;
  }

  function fallbackMsg(reason) {
    show(
      "<p>Lo sentimos: no pudimos hacer la búsqueda en este momento (" + esc(reason) + ").</p>" +
      "<p>Revise su dirección e inténtelo de nuevo, o use la búsqueda oficial: " +
      '<a href="https://geocoding.geo.census.gov/geocoder/" rel="noopener">' +
      "búsqueda de direcciones del Censo de EE. UU.</a> (puede estar solo en inglés).</p>"
    );
  }

  function lookup(params, onOk, onErr) {
    var name = "censusCb_" + Date.now();
    var script = document.createElement("script");
    var done = false;

    var timer = setTimeout(function () {
      if (done) { return; }
      done = true; cleanup(); onErr("tardó demasiado");
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
        if (!matches || !matches.length) { onErr("no pudimos encontrar esa dirección"); return; }
        var m = matches[0];
        onOk(m.matchedAddress, m.geographies.Counties[0].NAME, m.geographies.States[0].NAME);
      } catch (e) {
        onErr("no pudimos leer el resultado");
      }
    };

    script.onerror = function () {
      if (done) { return; }
      done = true; clearTimeout(timer); cleanup();
      onErr("no pudimos comunicarnos con el servicio de búsqueda");
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

    if (!st) { show("<p>Escriba su dirección (calle y número).</p>"); street.focus(); return; }
    if (!ci) { show("<p>Escriba su ciudad, para poder estar seguros de su condado.</p>"); city.focus(); return; }

    show("<p>Buscando su condado…</p>");
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
          '<div class="remember"><p><strong>Esto no parece una dirección de Texas.</strong> ' +
          "Esta guía es para el área de Austin, Texas. Revise lo que escribió.</p></div>";
      }
      show(
        (matched ? '<p class="matched">Encontramos: ' + esc(matched) + "</p>" : "") +
        "<p>Usted vive en <strong>" + esc(condado(county)) + ", " + esc(stateName) + "</strong>.</p>" +
        warn +
        '<div class="remember"><p><strong>Escriba o memorice su condado.</strong> ' +
        "Lo necesitará en las próximas páginas. Este sitio web no lo guarda por usted.</p></div>"
      );
    }, function (reason) {
      if (button) { button.disabled = false; }
      fallbackMsg(reason);
    });
  });
})();
