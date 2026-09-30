/*
 * 선수 사진 로딩 · 얼굴 크롭 · 원형 아바타 스프라이트 생성
 * - 사진이 없거나 로딩에 실패하면 클럽 컬러 유니폼 아바타로 대체한다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};

  // 얼굴 중심 크롭 보정값: [중심 x(폭 비율), 중심 y(높이 비율), 크기(폭 비율)]
  F.PHOTO_CROPS = F.PHOTO_CROPS || {};

  F.photoCrop = function (id, w, h) {
    var o = F.PHOTO_CROPS[id], cx, cy, s;
    if (o) { cx = o[0] * w; cy = o[1] * h; s = o[2] * w; }
    else if (h >= w) { s = w * 0.6; cx = w * 0.5; cy = h * 0.27; }
    else { s = h * 0.75; cx = w * 0.5; cy = h * 0.4; }
    s = Math.min(s * 0.92, w, h); // 얼굴이 원 안에서 조금 더 크게 보이도록 살짝 확대
    return { sx: Math.max(0, Math.min(w - s, cx - s / 2)), sy: Math.max(0, Math.min(h - s, cy - s / 2)), s: s };
  };

  var images = {}, listeners = [];
  F.photoImage = function (id) { var e = images[id]; return e && e.ok ? e.img : null; };
  F.onPhotoLoad = function (fn) { listeners.push(fn); };

  F.loadPhotos = function (ids, done) {
    var credits = F.PHOTO_CREDITS || {}, pending = 0, finished = false;
    function end() { if (!finished && pending === 0) { finished = true; if (done) done(); } }
    ids.forEach(function (id) {
      var c = credits[id]; if (!c || images[id]) return;
      var img = new Image(), entry = { img: img, ok: false };
      images[id] = entry; pending++;
      img.decoding = 'async';
      img.onload = function () { entry.ok = true; pending--; listeners.forEach(function (fn) { fn(id); }); end(); };
      img.onerror = function () { pending--; end(); };
      img.src = c.file;
    });
    end();
  };

  /* 사각형 초상 캔버스 (경기장 배치칸과 같은 둥근 모서리 사각형, 크기별 캐시) */
  var portraitCache = {};
  F.PORTRAIT_RADIUS = 0.14; // 한 변 대비 모서리 반지름
  F.portrait = function (id, size) {
    size = Math.max(8, Math.round(size));
    var img = F.photoImage(id), key = id + '@' + size + (img ? 'p' : 'f');
    if (portraitCache[key]) return portraitCache[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var g = cv.getContext('2d'), p = F.BY_ID[id], rad = size * F.PORTRAIT_RADIUS;
    g.save(); roundRect(g, 0, 0, size, size, rad); g.clip();
    if (img) {
      var cr = F.photoCrop(id, img.naturalWidth, img.naturalHeight);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, cr.sx, cr.sy, cr.s, cr.s, 0, 0, size, size);
    } else {
      drawFallback(g, p, size);
    }
    g.restore();
    portraitCache[key] = cv;
    return cv;
  };
  F.clearPortraitCache = function () { portraitCache = {}; };

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
  }

  function drawFallback(g, p, size) {
    var club = (F.CLUBS && F.CLUBS[p.club]) || { c1: '#335', c2: '#ccd' };
    var grd = g.createLinearGradient(0, 0, 0, size);
    grd.addColorStop(0, club.c1); grd.addColorStop(1, shade(club.c1, -0.35));
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    g.fillStyle = club.c2; g.fillRect(size * 0.44, 0, size * 0.12, size);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.arc(size / 2, size * 0.42, size * 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(size / 2, size * 0.95, size * 0.36, size * 0.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '800 ' + Math.round(size * 0.3) + 'px "Black Han Sans", "Malgun Gothic", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var initials = p.en.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    g.fillText(initials, size / 2, size * 0.52);
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c : 255 - c) * amt))); };
    return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
  }
  F.shade = shade;
})(typeof window !== 'undefined' ? window : globalThis);
