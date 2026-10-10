/* GALA roadbook renderer. Reads the inlined payload (#gala-data) and draws every section.
   No route-specific text lives here: everything comes from data. Print reuses these via window.GALA. */
(function () {
  "use strict";
  var TZ = "Asia/Manila";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SVGNS = "http://www.w3.org/2000/svg";
  var SERVICE_ICON = { gas: "i-gas", food: "i-food", restroom: "i-wc", pasalubong: "i-bag" };
  var SERVICE_NAME = { gas: "gas", food: "food", restroom: "restroom", pasalubong: "pasalubong" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(iso) { if (!iso) return ""; var p = iso.split("-"); return +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function now() {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23", month: "numeric" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { day: p.weekday, hour: +p.hour, month: +p.month - 1 };
  }
  // "07:00-19:00" becomes hour words for people
  function hourText(h) { h = parseInt(h, 10); return (h % 12 || 12) + (h < 12 ? "am" : "pm"); }
  function hoursText(hours) { var h = String(hours).split("-"); return hourText(h[0]) + " to " + hourText(h[1]); }
  function codingDaysText(byDay) {
    var ds = Object.keys(byDay);
    return ds.join(",") === "Mon,Tue,Wed,Thu,Fri" ? "Weekdays" : ds.join(", ");
  }
  function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; return el; }

  // shared bits
  function checkedLine(item) {
    if (!item || !item.checked) return "";
    var src = item.source || {};
    var from = src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.name || "source") + "</a>" : esc(src.name || "");
    return '<p class="checked">Checked ' + esc(fmtDate(item.checked)) + (from ? ", from " + from : "") + "</p>" + staleNote(item);
  }
  // stale is re-worked out on the phone, so a fact that ages past the limit after the build still gets flagged
  function daysSince(iso) { return Math.floor((Date.now() - Date.parse(iso + "T00:00:00+08:00")) / 86400000); }
  function isStale(item) {
    var max = (window.GALA && window.GALA.data && window.GALA.data.maxAgeDays) || 45;
    return !!(item && (item.stale || (item.checked && item.status !== "closed" && daysSince(item.checked) > max)));
  }
  function staleNote(item) {
    if (!isStale(item)) return "";
    return '<p class="stale-note">Needs re-check' + (item.staleText ? ": " + esc(item.staleText) : ".") + "</p>";
  }
  function use(id, cls, label) {
    return '<svg class="' + (cls || "") + '"' + (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + '><use href="#' + id + '"/></svg>';
  }
  function roadSign(kind, tons, cls) {
    var label = { warn: "Warning sign", go: "Go sign", stop: "No entry sign", ask: "Not yet confirmed" }[kind];
    var id = { warn: "s-warn", go: "s-go", stop: "s-stop", ask: "s-ask" }[kind];
    var text = kind === "warn" && tons ? '<text x="27" y="32.5" text-anchor="middle" font-family="Overpass, Arial, sans-serif" font-weight="900" font-size="15" fill="#111">' + esc(tons) + "t</text>" : "";
    return '<svg class="' + (cls || "sign") + '" viewBox="0 0 54 54" role="img" aria-label="' + label + '"><use href="#' + id + '"/>' + text + "</svg>";
  }
  function servicesBoard(services) {
    if (!services || !services.length) return "";
    var names = services.map(function (s) { return SERVICE_NAME[s]; });
    return '<span class="board" role="img" aria-label="Services: ' + esc(names.join(", ")) + '">' +
      services.map(function (s) { return '<svg aria-hidden="true"><use href="#' + SERVICE_ICON[s] + '"/></svg>'; }).join("") + "</span>";
  }
  function kmPost(post) {
    if (post && post.km != null) return '<span class="kmpost"><span><small>KM</small><span class="n">' + esc(post.km) + "</span></span></span>";
    return '<span class="kmpost road">' + esc(post && post.label) + "</span>";
  }
  function mapsButton(url) {
    if (!url) return "";
    return '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">' + use("i-pin") + "Open in Google Maps</a>";
  }
  function callAhead() {
    return '<span class="callahead">confirm it\'s open first' + use("u-line") + "</span>";
  }
  function statusBits(item) {
    if (item.status === "closed") return { sign: roadSign("stop", null, "stop-sign"), note: item.note ? '<p class="sign-note">' + esc(item.note) + "</p>" : "" };
    if (item.status === "check") return { sign: "", note: callAhead() + (item.note ? '<p class="stale-note">' + esc(item.note) + "</p>" : "") };
    return { sign: "", note: item.note ? '<p class="stale-note">' + esc(item.note) + "</p>" : "" };
  }
  function uniqueSources(items) {
    var seen = {};
    return items.filter(function (i) { var k = (i.source && i.source.url) + "|" + i.checked + "|" + i.stale; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function featured(item) { return item.featured ? '<span class="featured-tag">Featured</span>' : ""; }

  // HERO
  function renderHero(D) {
    var r = D.route, th = D.theme;
    var brand = th && th.name
      ? (th.logo ? '<img src="' + esc(th.logo) + '" alt="">' : "") + esc(th.name) + "<span>Your road to us, made by GALA</span>"
      : "GALA<span>Roadbook</span>";
    var polas = (r.polaroids || []).map(function (p) {
      var pic = p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.caption) + '" loading="lazy">' : '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#art-' + esc(p.art) + '"/></svg>';
      return '<figure class="polaroid"><span class="tape"></span>' + pic + "<figcaption>" + esc(p.caption) + "</figcaption></figure>";
    }).join("");
    var d = fmtDate(D.latestChecked).split(" ");
    var stamp = '<svg class="stamp" viewBox="0 0 120 120" role="img" aria-label="Facts checked ' + esc(fmtDate(D.latestChecked)) + '">' +
      '<defs><path id="ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>' +
      '<circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<text font-family="Overpass, sans-serif" font-weight="900" font-size="12.5" letter-spacing="2.4" fill="currentColor"><textPath href="#ring">FACTS CHECKED ★ GALA VERIFIED ★</textPath></text>' +
      '<text x="60" y="56" text-anchor="middle" font-family="Overpass, sans-serif" font-weight="900" font-size="20" fill="currentColor">' + esc((d[0] + " " + (d[1] || "")).toUpperCase()) + "</text>" +
      '<text x="60" y="75" text-anchor="middle" font-family="Overpass, sans-serif" font-weight="800" font-size="14" fill="currentColor">' + esc(d[2] || "") + "</text></svg>";
    set("hero-inner", '<p class="brandline">' + brand + "</p>" +
      '<h1 class="title"><span class="from">' + esc(r.title.from) + '</span><span class="to">' + esc(r.title.to) + "</span></h1>" +
      '<p class="tagline">' + esc(r.tagline) + "</p>");
    var hero = document.getElementById("hero");
    if (hero) hero.insertAdjacentHTML("beforeend", stamp + '<div class="polaroids" aria-hidden="true">' + polas + "</div>");
    var p2 = document.getElementById("p2-place"); if (p2) p2.textContent = r.title.to;
  }

  // STAT PLATES
  function renderPlates(D) {
    var n = now();
    set("plates", D.plates.map(function (p) {
      if (p.kind === "coding-today") {
        var today = p.byDay[n.day];

        return '<div class="plate ' + (today ? "coding-on" : "coding-off") + '" data-fact="' + esc(p.factId) + '"><span class="k">' + esc(p.label) + "</span>" +
          '<span class="v">' + (today ? esc(today.join(" & ")) : "None") + "</span>" +
          '<span class="s">' + (today ? "Plates ending in these, " + esc(hoursText(p.hours)) : "It's " + esc(n.day) + ". No number coding today.") + "</span>" + checkedLine(p) + "</div>";
      }
      return '<div class="plate ' + esc(p.style) + '" data-fact="' + esc(p.factId) + '"><span class="k">' + esc(p.label) + '</span><span class="v num">' + esc(p.value) + "</span>" +
        '<span class="s">' + esc(p.note) + "</span>" + checkedLine(p) + "</div>";
    }).join(""));
  }

  // ROAD CHECK
  function renderRoadCheck(D) {
    set("roadcheck", '<span class="tape"></span><span class="tape r"></span><h2 id="roads-h">Road check before you go</h2><ul class="roads">' +
      D.roadCheck.map(function (r) {
        return '<li data-fact="' + esc(r.id) + '">' + roadSign(r.sign, r.tons) + "<div><strong>" + esc(r.label) + "</strong>" +
          "<p>" + esc(r.value) + "</p>" + checkedLine(r) + "</div></li>";
      }).join("") + "</ul>");
  }

  // 01 ON THE WAY
  function mapSvg(D) {
    var m = D.map;
    var labels = m.labels.map(function (l) {
      var cls = l.kind === "road" ? "m-road" : l.kind === "water" ? "m-water" : "m-town";
      return '<text class="' + cls + '" x="' + l.x + '" y="' + l.y + '">' + esc(l.text) + "</text>";
    }).join("");
    var dots = Object.keys(m.stops).map(function (k) {
      var big = k === "start" || k === "end";
      return '<circle class="m-dot" r="' + (big ? 5 : 3.5) + '" cx="' + m.stops[k][0] + '" cy="' + m.stops[k][1] + '"/>';
    }).join("");
    return '<svg viewBox="' + m.viewBox + '" role="img" aria-label="Map of the route">' +
      '<path class="m-land" d="' + m.coast + '"/><path class="m-mtn" d="' + m.mountains + '"/>' +
      '<path class="m-route" d="' + m.line + '"/><path class="m-lit-edge" id="lit-edge" d="' + m.line + '"/><path class="m-lit" id="lit" d="' + m.line + '"/>' +
      dots + labels + '<g class="m-pin" id="pin"><circle r="8"/></g></svg>';
  }
  function stopLi(t) {
    var s = statusBits(t);
    var mapsFor = t.kind === "stop" ? mapsButton(t.mapsUrl) : "";
    return '<li class="stop" data-stop="' + esc(t.id) + '" data-name="' + esc(t.short) + '" data-sub="' + esc(t.sub) + '"' + (t.kind === "stop" ? ' data-fact="' + esc(t.id) + '"' : "") + ">" +
      kmPost(t.post) + "<div><h4>" + esc(t.title) + s.sign + featured(t) + "</h4><p>" + esc(t.body) + "</p>" +
      (t.services.length ? servicesBoard(t.services) : "") + s.note + mapsFor + (t.kind === "stop" ? checkedLine(t) : "") + "</div></li>";
  }
  function renderWay(D) {
    var R = D.receipt;
    var receipt = R ? '<div class="receipt" data-fact="' + esc(R.facts[0].id) + '"><h3>Tolls, Class 1</h3><table class="num">' +
      R.segments.map(function (s) { return "<tr><td>" + esc(s.label) + '<span class="tag">' + esc(s.note) + "</span></td><td>" + esc(s.value) + "</td></tr>"; }).join("") +
      '<tr class="sum"><td>One way</td><td>' + esc(R.total) + "</td></tr></table>" +
      (R.others ? '<p class="checked">' + esc(R.others) + "</p>" : "") + uniqueSources(R.facts).map(checkedLine).join("") + "</div>" : "";
    var note = D.wayNote ? '<p class="margin-note">' + esc(D.wayNote.text) + "</p>" : "";
    var home = D.wayHome.length ? '<div class="wayhome"><h3>On the way home</h3><ol class="timeline">' + D.wayHome.map(stopLi).join("") + "</ol></div>" : "";
    set("way",
      '<div class="mapbox"><div class="map">' + mapSvg(D) +
      '<div class="now" aria-live="polite"><span class="lbl">you\'re reading</span><strong id="now-name"></strong><span class="sub" id="now-sub"></span></div></div>' +
      '<p class="mapnote">' + (D.map.traced ? "Route line from OpenStreetMap." : "Simplified route line.") + " Use the Google Maps buttons to navigate.</p></div>" +
      '<div class="steps">' + receipt + note + "<h3>Stops, in driving order</h3>" +
      '<ol class="timeline" id="timeline">' + D.timeline.map(stopLi).join("") + "</ol>" + home + "</div>");
  }

  // 02 IN TOWN
  function placeLi(p) {
    var sign = p.status === "closed" ? roadSign("stop") : p.status === "check" ? roadSign("ask") : "";
    return '<li data-fact="' + esc(p.id) + '"><strong>' + esc(p.title) + featured(p) + "</strong>" + sign + "<p>" + esc(p.body) + "</p>" +
      (p.status === "closed" && p.note ? '<p class="sign-note">' + esc(p.note) + "</p>" : p.note ? '<p class="stale-note">' + esc(p.note) + "</p>" : "") +
      mapsButton(p.mapsUrl) + checkedLine(p) + "</li>";
  }
  function renderCity(D) {
    var C = D.city;
    if (!C) { var sec = document.getElementById("city"); if (sec && sec.closest("section")) sec.closest("section").hidden = true; return; }
    var first = C.places.slice(0, 3), rest = C.places.slice(3);
    var digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function (d) { return '<button type="button" aria-pressed="false" data-digit="' + d + '">' + d + "</button>"; }).join("");
    var days = ["Today", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return '<button type="button" aria-pressed="' + (d === "Today") + '" data-day="' + d + '">' + d + "</button>"; }).join("");
    var T = D.theme, arriving = T && (T.parking || T.arrival)
      ? '<div class="arriving"><h3>Arriving at ' + esc(T.name) + "</h3>" + (T.arrival ? "<p>" + esc(T.arrival) + "</p>" : "") +
        (T.parking ? "<p><strong>Parking:</strong> " + esc(T.parking) + "</p>" : "") + '<p class="checked">From ' + esc(T.name) + ", " + esc(fmtDate(T.checked)) + "</p></div>"
      : "";
    set("city", arriving +
      (C.coding ?       '<div class="checker" role="group" aria-labelledby="chk-h" data-fact="' + esc(C.coding.id) + '"><h3 id="chk-h">Number coding checker</h3>' +
      '<fieldset><legend>Last digit of your plate</legend><div class="digits" id="digits">' + digits + "</div></fieldset>" +
      '<fieldset><legend>Day</legend><div class="days" id="days">' + days + "</div></fieldset>" +
      '<div class="verdict" id="verdict" aria-live="polite">Tap your plate\'s last digit.</div>' +
      "<p>" + esc(C.coding.value) + "</p>" +
      '<p class="checked">Runs on your phone only. Nothing is saved or sent.</p>' + checkedLine(C.coding) + "</div>" : "") +
      (C.note ? '<p class="margin-note">' + esc(C.note) + "</p>" : "") +
      (C.zone ? '<div data-fact="' + esc(C.zone.id) + '"><h3>' + esc(C.zone.label) + "</h3><p>" + esc(C.zone.value) + "</p>" + checkedLine(C.zone) + "</div>" : "") +
      (C.places.length ? "<div><h3>Must-sees and pasalubong</h3>" + '<ul class="places">' + first.map(placeLi).join("") + "</ul>" +
      (rest.length ? '<details class="more"><summary class="btn alt">See all ' + C.places.length + ' places</summary><ul class="places">' + rest.map(placeLi).join("") + "</ul></details>" : "") + "</div>" : "") +
      C.parking.map(function (f) { return '<div data-fact="' + esc(f.id) + '"><h3>' + esc(f.label) + "</h3><p>" + esc(f.value) + "</p>" + checkedLine(f) + "</div>"; }).join(""));
  }
  function initCodingChecker(D) {
    if (!D.city || !D.city.coding) return;
    var byDay = D.city.coding.data.byDay, h = D.city.coding.data.hours.split("-"), start = parseInt(h[0], 10), end = parseInt(h[1], 10);
    var pick = { digit: null, day: "Today" }, n = now();
    var digitsEl = document.getElementById("digits"), daysEl = document.getElementById("days"), v = document.getElementById("verdict");
    if (!digitsEl) return;
    function press(group, btn) { Array.prototype.forEach.call(group.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); }); }
    function verdict() {
      if (pick.digit === null) { v.className = "verdict"; v.textContent = "Tap your plate's last digit."; return; }
      var day = pick.day === "Today" ? n.day : pick.day, label = pick.day === "Today" ? "Today (" + day + ")" : day;
      var banned = (byDay[day] || []).indexOf(pick.digit) !== -1;
      if (!banned) { v.className = "verdict go"; v.textContent = label + ": plates ending in " + pick.digit + " are free to drive."; return; }
      var msg = label + ": coding for plates ending in " + pick.digit + ". Stay out of the coding zone " + hoursText(D.city.coding.data.hours) + ".";
      if (pick.day === "Today") msg += n.hour < start ? " You're clear until " + hourText(start) + "." : n.hour >= end ? " Coding is over for today." : " Coding is on right now.";
      v.className = "verdict stop"; v.textContent = msg;
    }
    digitsEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; pick.digit = +b.dataset.digit; press(digitsEl, b); verdict(); });
    daysEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; pick.day = b.dataset.day; press(daysEl, b); verdict(); });
  }

  // 03 BEFORE YOU GO
  function renderBeforeYouGo(D) {
    var out = "", m = now().month, W = D.weather;
    if (W) {
      var rain = W.data.rainNormalMm, low = W.data.recordLowC, months = W.data.months, max = Math.max.apply(null, rain);
      var pack = (D.pack || []).slice(0, 1);
      if (rain[m] > 300) pack.push("Umbrella and rain jacket. " + months[m] + " is a wet month.");
      if (low[m] < 10) pack.push("Extra warm layer. Lows near " + Math.round(low[m]) + "°C.");
      pack = pack.concat((D.pack || []).slice(1));
      out += '<div data-fact="' + esc(W.id) + '"><h3>Rain by month</h3><div class="rain" aria-hidden="true">' +
        rain.map(function (mm, i) { return '<div class="' + (i === m ? "now" : "") + '" style="height:' + Math.max(3, Math.round(mm / max * 100)) + '%"></div>'; }).join("") +
        '</div><div class="rain-labels" aria-hidden="true">' + months.map(function (x, i) { return '<span class="' + (i === m ? "now" : "") + '">' + esc(x[0]) + "</span>"; }).join("") + "</div>" +
        "<p>" + esc(months[m]) + " averages " + Math.round(rain[m]) + " mm of rain. Record low " + esc(low[m]) + "°C.</p><p>" + esc(W.value) + "</p>" + checkedLine(W) + "</div>" +
        "<div><h3>Pack for " + esc(months[m]) + '</h3><ul class="pack">' + pack.map(function (p, i) { return '<li><label><input type="checkbox" id="pk' + i + '"><span>' + esc(p) + "</span></label></li>"; }).join("") + "</ul></div>";
    }
    out += '<div class="sos"><h3>Emergency</h3>' + D.emergency.map(function (f) {
      var tel = f.data.tel, shown = f.data.display || tel;
      return '<div class="row" data-fact="' + esc(f.id) + '"><div><strong class="num">' + esc(shown) + "</strong>" + esc(f.value) + checkedLine(f) + '</div><a class="btn" href="tel:' + esc(tel) + '">' + use("i-phone") + "Call</a></div>";
    }).join("") + (D.missingEmergency.length ? '<p class="checked">Still being checked with official sources: ' + esc(D.missingEmergency.join("; ")) + ".</p>" : "") + "</div>";
    if (D.morningCheck.length) out += '<div class="morning"><h3>Morning-of check</h3><ol>' + D.morningCheck.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div>";
    out += "<div><h3>Thanks to</h3>" + (D.creators.length
      ? '<ul class="credits">' + D.creators.map(function (c) { return '<li><a href="' + esc(c.video) + '" target="_blank" rel="noopener">' + esc(c.name) + "</a>, " + esc(c.usedFor) + "</li>"; }).join("") + "</ul>"
      : "<p>No creators credited yet. When a vlogger's video leads us to a stop or tip, we credit them here by name with a link.</p>") + "</div>";
    set("before", out);
  }

  function renderFooter(D) {
    set("foot", '<div class="wrap"><p class="sign-off">Ingat sa byahe!</p>' +
      "<p>Every fact shows where it came from and when we last checked it. Facts older than " + D.maxAgeDays + " days get a \"Needs re-check\" note.</p>" +
      "<p>Places marked Featured are paid placements." + (D.anyFeatured ? "" : " Nothing here is featured yet.") + "</p>" +
      '<a class="btn" href="' + esc(D.pdfHref) + '">Download the printable roadbook (PDF)</a>' +
      (D.theme && D.theme.contact && D.theme.contact.url ? '<a class="btn" href="' + esc(D.theme.contact.url) + '" target="_blank" rel="noopener">Contact ' + esc(D.theme.name) + "</a>" : "") +
      "<p>" + (D.theme && D.theme.name ? "Made by GALA for " + esc(D.theme.name) + ". " : "Made by GALA, Guided Adventures, Local Areas. ") + "Tara sa next GALA.</p></div>");
  }

  // map that follows the stops
  function initMapFollow() {
    var lit = document.getElementById("lit"), edge = document.getElementById("lit-edge"), pin = document.getElementById("pin");
    if (!lit || !lit.getTotalLength) return;
    var D = window.GALA.data, L = lit.getTotalLength(), at = {};
    [lit, edge].forEach(function (p) { p.style.strokeDasharray = L + " " + L; p.style.strokeDashoffset = L; });
    function lengthAt(pt) {
      var best = 0, bd = Infinity;
      for (var s = 0; s <= L; s += 2) { var q = lit.getPointAtLength(s), d = (q.x - pt[0]) * (q.x - pt[0]) + (q.y - pt[1]) * (q.y - pt[1]); if (d < bd) { bd = d; best = s; } }
      return best;
    }
    Object.keys(D.map.stops).forEach(function (k) { at[k] = lengthAt(D.map.stops[k]); });
    var stops = Array.prototype.slice.call(document.querySelectorAll("#timeline .stop")), current = null;
    function show(el) {
      if (!el || el === current) return; current = el;
      stops.forEach(function (s) { s.classList.toggle("is-now", s === el); });
      var k = el.dataset.stop, p = D.map.stops[k];
      if (p) {
        [lit, edge].forEach(function (x) { x.style.strokeDashoffset = Math.max(0, L - at[k]); });
        pin.style.transform = "translate(" + p[0] + "px," + p[1] + "px)";
      }
      document.getElementById("now-name").textContent = el.dataset.name;
      document.getElementById("now-sub").textContent = el.dataset.sub;
    }
    function onScroll() {
      var line = window.innerHeight * 0.55, pick = stops[0];
      stops.forEach(function (s) { if (s.getBoundingClientRect().top < line) pick = s; });
      show(pick);
    }
    window.addEventListener("scroll", function () { window.requestAnimationFrame(onScroll); }, { passive: true });
    show(stops[0]); onScroll();
  }
  function lightWholeRoute() {
    var lit = document.getElementById("lit"), edge = document.getElementById("lit-edge"), pin = document.getElementById("pin");
    [lit, edge].forEach(function (p) { if (p) { p.style.strokeDasharray = "none"; p.style.strokeDashoffset = 0; } });
    var end = window.GALA.data.map.stops.end; if (pin && end) pin.style.transform = "translate(" + end[0] + "px," + end[1] + "px)";
  }

  var raw = document.getElementById("gala-data");
  if (!raw) return;
  var D = JSON.parse(raw.textContent);
  window.GALA = { data: D, esc: esc, fmtDate: fmtDate, checkedLine: checkedLine, roadSign: roadSign, mapSvg: mapSvg,
    servicesBoard: servicesBoard, kmPost: kmPost, uniqueSources: uniqueSources, now: now, isStale: isStale, hoursText: hoursText, codingDaysText: codingDaysText,
    renderHero: renderHero, renderPlates: renderPlates, renderRoadCheck: renderRoadCheck, renderWay: renderWay,
    renderCity: renderCity, renderBeforeYouGo: renderBeforeYouGo, renderFooter: renderFooter, lightWholeRoute: lightWholeRoute };
  if (document.documentElement.dataset.mode === "print") return; // print.html drives its own layout
  renderHero(D); renderPlates(D); renderRoadCheck(D); renderWay(D); renderCity(D); renderBeforeYouGo(D); renderFooter(D);
  initCodingChecker(D); initMapFollow();
})();
