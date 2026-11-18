(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var header = document.querySelector('.site-header');

  function each(selector, action, scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(selector), action);
  }

  function setupHeader() {
    if (!header) return;
    var toggle = header.querySelector('.nav-toggle');
    var meter = document.querySelector('.scroll-meter');

    function closeMenus(except) {
      each('.has-menu', function (item) {
        if (item === except) return;
        item.classList.remove('open');
        item.querySelector('.nav-link').setAttribute('aria-expanded', 'false');
      }, header);
    }

    function setMenu(item, open) {
      closeMenus(open ? item : null);
      item.classList.toggle('open', open);
      item.querySelector('.nav-link').setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    each('.has-menu', function (item) {
      var trigger = item.querySelector('.nav-link');
      trigger.addEventListener('click', function () {
        setMenu(item, !item.classList.contains('open'));
      });
      if (finePointer) {
        item.addEventListener('pointerenter', function () {
          if (!header.classList.contains('nav-open')) setMenu(item, true);
        });
        item.addEventListener('pointerleave', function () {
          if (!header.classList.contains('nav-open')) setMenu(item, false);
        });
      }
    }, header);

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeMenus(null);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeMenus(null);
      header.classList.remove('nav-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = header.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) closeMenus(null);
      });
      each('.nav-links a', function (link) {
        link.addEventListener('click', function () {
          header.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
          closeMenus(null);
        });
      }, header);
    }

    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 12);
      if (!meter) return;
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      meter.style.transform = 'scaleX(' + (scrollable > 0 ? window.scrollY / scrollable : 0) + ')';
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setupReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      each('.reveal', function (target) { target.classList.add('in'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (target) { observer.observe(target); });
  }

  function mountRidge(canvas) {
    var context = canvas.getContext('2d');
    var host = canvas.parentElement;
    var rows = parseInt(canvas.getAttribute('data-rows'), 10) || 24;
    var palette = JSON.parse(canvas.getAttribute('data-colors')).map(parseColor);
    var wideTop = parseFloat(canvas.getAttribute('data-top')) || 0.5;
    var wideReach = parseFloat(canvas.getAttribute('data-reach')) || 0.3;
    var narrowTop = parseFloat(canvas.getAttribute('data-top-narrow')) || wideTop;
    var narrowReach = parseFloat(canvas.getAttribute('data-reach-narrow')) || wideReach;
    var firstRow = wideTop;
    var reach = wideReach;
    var widePeaks = JSON.parse(canvas.getAttribute('data-peaks'));
    var narrowPeaks = JSON.parse(canvas.getAttribute('data-peaks-narrow') || 'null') || widePeaks;
    var summits = host.querySelectorAll('.summit');
    var segments = 76;
    var width = 0;
    var height = 0;
    var peaks = widePeaks;
    var pointer = { x: 0, y: 0, target: 0, strength: 0 };
    var visible = true;
    var clock = 0;
    var lastFrame = 0;

    function hash(column, row, step) {
      var value = Math.sin(column * 127.1 + row * 311.7 + step * 74.7) * 43758.5453;
      return value - Math.floor(value);
    }

    function grain(column, row, time) {
      var step = Math.floor(time);
      var blend = time - step;
      blend = blend * blend * (3 - 2 * blend);
      return hash(column, row, step) * (1 - blend) + hash(column, row, step + 1) * blend;
    }

    function envelope(x) {
      var total = 0;
      for (var index = 0; index < peaks.length; index++) {
        var offset = x - peaks[index][0];
        total += peaks[index][1] * Math.exp(-(offset * offset) / peaks[index][2]);
      }
      return total;
    }

    function rowBase(depth) {
      return height * (firstRow + (1.05 - firstRow) * depth);
    }

    function rowReach(depth) {
      return height * reach * (1 - 0.78 * depth);
    }

    function pointY(row, column) {
      var x = column / segments;
      var depth = row / (rows - 1);
      var base = rowBase(depth);
      var shape = envelope(x + depth * 0.012) * (0.74 + 0.46 * grain(column, row, clock + row * 0.37)) + 0.1 * grain(column + 53, row, clock);
      var y = base - rowReach(depth) * shape;
      if (pointer.strength > 0.01) {
        var dx = (x * width - pointer.x) / (width * 0.085);
        var dy = (base - pointer.y) / (height * 0.2);
        y -= pointer.strength * height * 0.075 * Math.exp(-dx * dx - dy * dy);
      }
      return y;
    }

    function parseColor(hex) {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    function strokeFor(depth) {
      var position = depth * (palette.length - 1);
      var index = Math.min(Math.floor(position), palette.length - 2);
      var blend = palette.length > 1 ? position - index : 0;
      var from = palette[Math.max(index, 0)];
      var to = palette[Math.min(index + 1, palette.length - 1)];
      var channel = function (slot) { return Math.round(from[slot] + (to[slot] - from[slot]) * blend); };
      return 'rgba(' + channel(0) + ', ' + channel(1) + ', ' + channel(2) + ', ' + (1 - depth * 0.35) + ')';
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1.7;
      context.lineJoin = 'round';
      for (var row = 0; row < rows; row++) {
        context.beginPath();
        context.moveTo(0, pointY(row, 0));
        for (var column = 1; column <= segments; column++) {
          context.lineTo(column / segments * width, pointY(row, column));
        }
        context.strokeStyle = strokeFor(row / (rows - 1));
        context.stroke();
        context.lineTo(width, height + 4);
        context.lineTo(0, height + 4);
        context.closePath();
        context.fillStyle = '#FFFFFF';
        context.fill();
      }
    }

    function placeSummits() {
      Array.prototype.forEach.call(summits, function (summit) {
        var peak = peaks[parseInt(summit.getAttribute('data-peak'), 10)];
        var top = rowBase(0) - rowReach(0) * envelope(peak[0]) * 0.98 - 10;
        summit.style.left = peak[0] * width + 'px';
        summit.style.top = top + 'px';
      });
    }

    function resize() {
      var box = canvas.getBoundingClientRect();
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      var narrow = width < 700;
      peaks = narrow ? narrowPeaks : widePeaks;
      firstRow = narrow ? narrowTop : wideTop;
      reach = narrow ? narrowReach : wideReach;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      placeSummits();
      draw();
    }

    function frame(now) {
      var elapsed = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      if (visible && !document.hidden) {
        clock += elapsed * 0.32;
        pointer.strength += (pointer.target - pointer.strength) * 0.08;
        draw();
      }
      requestAnimationFrame(frame);
    }

    host.addEventListener('pointermove', function (event) {
      var box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.target = 1;
    });
    host.addEventListener('pointerleave', function () { pointer.target = 0; });
    window.addEventListener('resize', resize);
    resize();

    if (reducedMotion) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(canvas);
    }
    requestAnimationFrame(function (now) {
      lastFrame = now;
      requestAnimationFrame(frame);
    });
  }

  function setupTilt() {
    if (!finePointer || reducedMotion) return;
    each('[data-tilt]', function (target) {
      var stage = target.closest('[data-stage]') || target;
      var reach = parseFloat(target.getAttribute('data-tilt')) || 8;
      stage.addEventListener('pointermove', function (event) {
        var box = stage.getBoundingClientRect();
        var across = (event.clientX - box.left) / box.width - 0.5;
        var down = (event.clientY - box.top) / box.height - 0.5;
        target.classList.add('tilting');
        target.style.setProperty('--rx', (-down * reach).toFixed(2) + 'deg');
        target.style.setProperty('--ry', (across * reach).toFixed(2) + 'deg');
        target.style.setProperty('--shift', (-across * 24).toFixed(1) + 'px');
      });
      stage.addEventListener('pointerleave', function () {
        target.classList.remove('tilting');
        target.style.removeProperty('--rx');
        target.style.removeProperty('--ry');
        target.style.removeProperty('--shift');
      });
    });
  }

  function setupServices() {
    var tabs = document.querySelectorAll('.service-tab');
    if (!tabs.length) return;

    function select(tab) {
      Array.prototype.forEach.call(tabs, function (other) {
        var selected = other === tab;
        other.setAttribute('aria-selected', selected ? 'true' : 'false');
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
      });
    }

    function selectFromHash() {
      var tab = location.hash ? document.getElementById(location.hash.slice(1)) : null;
      if (tab && tab.classList.contains('service-tab')) select(tab);
    }

    Array.prototype.forEach.call(tabs, function (tab, index) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        var next = tabs[(index + (event.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length];
        select(next);
        next.focus();
      });
    });
    window.addEventListener('hashchange', selectFromHash);
    selectFromHash();
  }

  function setupRail() {
    var rail = document.querySelector('.rail');
    if (!rail) return;
    var drag = { active: false, startX: 0, startScroll: 0, moved: false };
    var arrows = document.querySelector('.rail-nav');

    function showArrowsWhenScrollable() {
      if (arrows) arrows.hidden = rail.scrollWidth <= rail.clientWidth + 1;
    }
    showArrowsWhenScrollable();
    window.addEventListener('resize', showArrowsWhenScrollable);

    function step() {
      var card = rail.querySelector('.peak');
      return card ? card.getBoundingClientRect().width + 20 : 400;
    }

    each('[data-rail]', function (button) {
      button.addEventListener('click', function () {
        rail.scrollBy({ left: step() * (button.getAttribute('data-rail') === 'next' ? 1 : -1), behavior: 'smooth' });
      });
    });

    rail.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse') return;
      drag.active = true;
      drag.moved = false;
      drag.startX = event.clientX;
      drag.startScroll = rail.scrollLeft;
    });
    window.addEventListener('pointermove', function (event) {
      if (!drag.active) return;
      var distance = event.clientX - drag.startX;
      if (Math.abs(distance) > 6 && !drag.moved) {
        drag.moved = true;
        rail.classList.add('dragging');
      }
      if (drag.moved) rail.scrollLeft = drag.startScroll - distance;
    });
    window.addEventListener('pointerup', function () {
      if (!drag.active) return;
      drag.active = false;
      setTimeout(function () { rail.classList.remove('dragging'); }, 0);
    });
    rail.addEventListener('click', function (event) {
      if (drag.moved) event.preventDefault();
    }, true);

    if (!finePointer) return;
    each('.peak', function (card) {
      card.addEventListener('pointermove', function (event) {
        var box = card.getBoundingClientRect();
        card.style.setProperty('--mx', event.clientX - box.left + 'px');
        card.style.setProperty('--my', event.clientY - box.top + 'px');
      });
    }, rail);
  }

  function setupPricing() {
    var pricing = document.querySelector('[data-tipo-cambio]');
    if (!pricing) return;
    var exchangeRate = parseFloat(pricing.getAttribute('data-tipo-cambio'));
    var currencyButtons = pricing.querySelectorAll('[data-currency]');
    var prices = pricing.querySelectorAll('.price[data-soles]');
    if (!exchangeRate || !currencyButtons.length) return;

    function formatSoles(soles) {
      return 'S/ ' + (soles % 1 === 0 ? soles.toFixed(0) : soles.toFixed(2));
    }

    function showCurrency(currency) {
      var inDollars = currency === 'USD';
      Array.prototype.forEach.call(prices, function (price) {
        var soles = parseFloat(price.getAttribute('data-soles'));
        price.querySelector('[data-amount]').textContent = inDollars ? 'US$ ' + (soles / exchangeRate).toFixed(2) : formatSoles(soles);
        var solesEquivalent = price.querySelector('[data-amount-soles]');
        solesEquivalent.textContent = formatSoles(soles);
        solesEquivalent.hidden = !inDollars;
      });
      Array.prototype.forEach.call(currencyButtons, function (button) {
        button.setAttribute('aria-pressed', button.getAttribute('data-currency') === currency ? 'true' : 'false');
      });
    }

    Array.prototype.forEach.call(currencyButtons, function (button) {
      button.addEventListener('click', function () { showCurrency(button.getAttribute('data-currency')); });
    });
  }

  function setupBrandTabs() {
    var activeTab = document.querySelector('.marcas-bar a[aria-current="page"]');
    if (!activeTab) return;
    var strip = activeTab.parentElement;
    strip.scrollLeft = activeTab.offsetLeft - (strip.clientWidth - activeTab.offsetWidth) / 2;
  }

  function setupContactForm() {
    var form = document.querySelector('.form');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = form.elements.nombre.value.trim();
      var service = form.elements.servicio.value;
      var message = form.elements.mensaje.value.trim();
      var subject = 'Consulta desde eyaqsystems.com: ' + service;
      var body = 'Hola, soy ' + name + '.\n\nMe interesa: ' + service + '\n\n' + message;
      window.location.href = 'mailto:' + form.getAttribute('data-correo') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  each('[data-year]', function (target) { target.textContent = new Date().getFullYear(); });
  setupHeader();
  setupReveal();
  each('canvas.ridge', mountRidge);
  setupTilt();
  setupServices();
  setupRail();
  setupPricing();
  setupBrandTabs();
  setupContactForm();
})();
