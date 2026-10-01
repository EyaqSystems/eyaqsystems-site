/* EYAQ Systems — interacción del sitio, sin dependencias externas. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Menú móvil ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- Sombra del header al bajar ---------- */
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Aparición al hacer scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Inclinación 3D al pasar el mouse ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform =
            'perspective(1000px) rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' +
            (px * max).toFixed(2) + 'deg) translateZ(0)';
        });
      });
      el.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .5s ease';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  }

  /* ---------- Año del footer ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Globo 3D del hero (canvas 2D con proyección en perspectiva) ---------- */
  var canvas = document.getElementById('globe');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var COLORS = {
    navy: [22, 35, 63],
    blue: [27, 127, 215],
    green: [47, 163, 79],
    orange: [240, 152, 43]
  };

  var small = window.innerWidth < 640;
  var N = small ? 220 : 380;
  var pts = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var rad = Math.sqrt(1 - y * y);
    var th = golden * i;
    var roll = Math.random();
    var col = roll < 0.62 ? COLORS.navy : roll < 0.84 ? COLORS.blue : roll < 0.97 ? COLORS.green : COLORS.orange;
    pts.push({ x: Math.cos(th) * rad, y: y, z: Math.sin(th) * rad, c: col, s: roll > 0.97 ? 2.2 : 1.4 });
  }

  var links = [];
  var LINK = small ? 0.30 : 0.24;
  for (var a = 0; a < N; a++) {
    for (var b = a + 1; b < N; b++) {
      var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, dz = pts[a].z - pts[b].z;
      if (dx * dx + dy * dy + dz * dz < LINK * LINK) links.push([a, b]);
    }
  }

  var rings = [
    { tilt: 1.15, speed: 0.55, color: COLORS.blue, r: 1.22 },
    { tilt: -0.55, speed: -0.38, color: COLORS.green, r: 1.32 },
    { tilt: 0.25, speed: 0.27, color: COLORS.orange, r: 1.42 }
  ];

  var W = 0, H = 0, R = 0, dpr = 1;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.27;
  }
  resize();
  window.addEventListener('resize', resize);

  var rotY = 0, rotX = -0.32;
  var mx = 0, my = 0, tx = 0, ty = 0;
  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5);
      my = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  var proj = new Array(N);
  var FOV = 8;

  function project(x, y, z, ry, rx) {
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var y2 = y * cx - z1 * sx;
    var z2 = y * sx + z1 * cx;
    var k = FOV / (FOV + z2);
    return { x: W / 2 + x1 * R * k, y: H / 2 + y2 * R * k, z: z2, k: k };
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    tx += (mx * 0.6 - tx) * 0.05;
    ty += (my * 0.4 - ty) * 0.05;
    var ry = rotY + tx;
    var rx = rotX + ty;

    for (var i = 0; i < N; i++) proj[i] = project(pts[i].x, pts[i].y, pts[i].z, ry, rx);

    // anillos de órbita detrás del globo
    rings.forEach(function (ring) { drawRing(ring, t, ry, rx, true); });

    ctx.lineWidth = 0.7;
    for (var l = 0; l < links.length; l++) {
      var p = proj[links[l][0]], q = proj[links[l][1]];
      var depth = (2 - (p.z + q.z) / 2) / 3;
      if (depth < 0.18) continue;
      ctx.strokeStyle = rgba(COLORS.navy, 0.16 * depth);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }

    for (var j = 0; j < N; j++) {
      var pp = proj[j];
      var d = (1 - pp.z) / 2;
      ctx.fillStyle = rgba(pts[j].c, 0.18 + 0.75 * d);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, pts[j].s * pp.k, 0, Math.PI * 2);
      ctx.fill();
    }

    rings.forEach(function (ring) { drawRing(ring, t, ry, rx, false); });
  }

  function drawRing(ring, t, ry, rx, back) {
    var steps = 90;
    ctx.lineWidth = 1;
    for (var s = 0; s < steps; s++) {
      var a0 = (s / steps) * Math.PI * 2, a1 = ((s + 1) / steps) * Math.PI * 2;
      var p0 = ringPoint(ring, a0, ry, rx), p1 = ringPoint(ring, a1, ry, rx);
      if ((p0.z > 0) !== back) continue;
      ctx.strokeStyle = rgba(ring.color, back ? 0.12 : 0.32);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    var sat = ringPoint(ring, t * ring.speed, ry, rx);
    if ((sat.z > 0) === back) {
      ctx.fillStyle = rgba(ring.color, back ? 0.35 : 1);
      ctx.beginPath();
      ctx.arc(sat.x, sat.y, 4.2 * sat.k, 0, Math.PI * 2);
      ctx.fill();
      if (!back) {
        ctx.fillStyle = rgba(ring.color, 0.18);
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 10 * sat.k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function ringPoint(ring, ang, ry, rx) {
    var x = Math.cos(ang) * ring.r;
    var z = Math.sin(ang) * ring.r;
    var y = z * Math.sin(ring.tilt);
    z = z * Math.cos(ring.tilt);
    return project(x, y, z, ry, rx);
  }

  if (reduce) { draw(0); return; }

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; })
      .observe(canvas);
  }

  var last = performance.now(), clock = 0;
  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (visible && !document.hidden) {
      clock += dt;
      rotY += dt * 0.18;
      draw(clock);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
