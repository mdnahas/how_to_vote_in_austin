/* Tra cứu quận — cải tiến tiệm tiến.
   Biến biểu mẫu địa chỉ thành công cụ tìm quận ngay trên trang bằng Census Geocoder
   chính thức của Hoa Kỳ. ES5 thuần để tương thích trình duyệt cũ. Nếu tắt JavaScript,
   biểu mẫu <form> thường sẽ gửi đến cùng một điểm cuối chính thức. */

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
      "<p>Xin lỗi — hiện chúng tôi không tra cứu được (" + esc(reason) + ").</p>" +
      "<p>Vui lòng kiểm tra địa chỉ và thử lại, hoặc dùng công cụ tra cứu chính thức: " +
      '<a href="https://geocoding.geo.census.gov/geocoder/" rel="noopener">' +
      "Tra cứu địa chỉ của Cục Điều tra Dân số Hoa Kỳ</a> (có thể chỉ bằng tiếng Anh).</p>"
    );
  }

  function lookup(params, onOk, onErr) {
    var name = "censusCb_" + Date.now();
    var script = document.createElement("script");
    var done = false;

    var timer = setTimeout(function () {
      if (done) { return; }
      done = true; cleanup(); onErr("mất quá nhiều thời gian");
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
        if (!matches || !matches.length) { onErr("chúng tôi không tìm thấy địa chỉ đó"); return; }
        var m = matches[0];
        onOk(m.matchedAddress, m.geographies.Counties[0].NAME, m.geographies.States[0].NAME);
      } catch (e) {
        onErr("chúng tôi không đọc được kết quả");
      }
    };

    script.onerror = function () {
      if (done) { return; }
      done = true; clearTimeout(timer); cleanup();
      onErr("chúng tôi không kết nối được dịch vụ tra cứu");
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

    if (!st) { show("<p>Vui lòng nhập địa chỉ đường phố của bạn.</p>"); street.focus(); return; }
    if (!ci) { show("<p>Vui lòng nhập thành phố của bạn, để chúng tôi chắc chắn về quận của bạn.</p>"); city.focus(); return; }

    show("<p>Đang tra cứu quận của bạn…</p>");
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
          '<div class="remember"><p><strong>Địa chỉ này trông không giống địa chỉ ở Texas.</strong> ' +
          "Hướng dẫn này dành cho khu vực Austin, Texas. Vui lòng kiểm tra những gì bạn đã nhập.</p></div>";
      }
      show(
        (matched ? '<p class="matched">Chúng tôi tìm thấy: ' + esc(matched) + "</p>" : "") +
        "<p>Bạn sống ở <strong>" + esc(county) + ", " + esc(stateName) + "</strong>.</p>" +
        warn +
        '<div class="remember"><p><strong>Vui lòng ghi lại hoặc ghi nhớ quận của bạn.</strong> ' +
        "Bạn sẽ cần nó ở các trang tiếp theo. Trang web này không lưu giúp bạn.</p></div>"
      );
    }, function (reason) {
      if (button) { button.disabled = false; }
      fallbackMsg(reason);
    });
  });
})();
