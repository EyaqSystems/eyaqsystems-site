(function () {
  'use strict';

  function each(selector, action, scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(selector), action);
  }

  function setupPlateLookup() {
    var form = document.querySelector('.plate-form');
    if (!form) return;
    var result = document.querySelector('.plate-result');
    var plateLabel = result.querySelector('[data-plate]');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var plate = form.elements.placa.value.trim().toUpperCase();
      if (!plate) return;
      plateLabel.textContent = plate;
      result.hidden = true;
      window.requestAnimationFrame(function () { result.hidden = false; });
    });
  }

  function setupOwnerDecision() {
    var decision = document.querySelector('.decision');
    if (!decision) return;
    var bookingDay = document.querySelector('.days .target');
    var outcomes = {
      aceptar: ['booked', 'Reserva registrada en el calendario.'],
      rechazar: ['declined', 'Samanta avisa al cliente y le propone otra fecha.'],
      cambio: ['pending', 'Samanta consulta al cliente la nueva hora.']
    };
    each('[data-decision]', function (button) {
      button.addEventListener('click', function () {
        var outcome = outcomes[button.getAttribute('data-decision')];
        bookingDay.className = 'target ' + outcome[0];
        decision.textContent = outcome[1];
        each('[data-decision]', function (other) {
          other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
        });
      });
    });
  }

  function setupPointOfSale() {
    var register = document.querySelector('.pos');
    if (!register) return;
    var lines = register.querySelector('.pos-lines');
    var total = register.querySelector('[data-total]');
    var receipt = register.querySelector('.pos-receipt');
    var sale = {};
    var payment = 'Efectivo';

    function soles(amount) { return 'S/ ' + amount.toFixed(2); }

    function saleTotal() {
      return Object.keys(sale).reduce(function (sum, name) { return sum + sale[name].price * sale[name].quantity; }, 0);
    }

    function renderTicket() {
      var names = Object.keys(sale);
      lines.innerHTML = '';
      if (!names.length) {
        var empty = document.createElement('li');
        empty.className = 'pos-empty';
        empty.textContent = 'Toca un producto';
        lines.appendChild(empty);
      }
      names.forEach(function (name) {
        var line = document.createElement('li');
        var label = document.createElement('span');
        var amount = document.createElement('span');
        label.textContent = name + ' ×' + sale[name].quantity;
        amount.textContent = soles(sale[name].price * sale[name].quantity);
        line.appendChild(label);
        line.appendChild(amount);
        lines.appendChild(line);
      });
      total.textContent = soles(saleTotal());
    }

    each('.pos-products button', function (product) {
      product.addEventListener('click', function () {
        var name = product.getAttribute('data-name');
        var stock = product.querySelector('[data-stock]');
        var taken = sale[name] ? sale[name].quantity : 0;
        if (taken >= parseInt(stock.textContent, 10)) return;
        sale[name] = { price: parseFloat(product.getAttribute('data-price')), quantity: taken + 1, stock: stock };
        receipt.textContent = '';
        renderTicket();
      });
    }, register);

    each('.pos-pay button', function (method) {
      method.addEventListener('click', function () {
        payment = method.textContent;
        each('.pos-pay button', function (other) {
          other.setAttribute('aria-pressed', other === method ? 'true' : 'false');
        }, register);
      });
    }, register);

    register.querySelector('.pos-charge').addEventListener('click', function () {
      var charged = saleTotal();
      if (!charged) {
        receipt.textContent = 'Agrega un producto para cobrar.';
        return;
      }
      Object.keys(sale).forEach(function (name) {
        sale[name].stock.textContent = parseInt(sale[name].stock.textContent, 10) - sale[name].quantity;
      });
      sale = {};
      renderTicket();
      receipt.textContent = 'Venta registrada: ' + soles(charged) + ' con ' + payment + '. Stock actualizado.';
    });

    renderTicket();
  }

  function setupOrderTracking() {
    var valley = document.querySelector('.valley');
    if (!valley) return;
    var stops = valley.querySelectorAll('.stops li');
    var status = valley.querySelector('[data-status]');
    var advance = valley.querySelector('[data-advance]');
    var messages = [
      'Pedido recibido.',
      'El restaurante prepara tu pedido.',
      'El repartidor recogió tu pedido.',
      'Tu pedido está en camino.',
      'Entregado con tu código.'
    ];
    var current = 0;

    function show() {
      valley.style.setProperty('--progress', current);
      Array.prototype.forEach.call(stops, function (stop, index) {
        stop.classList.toggle('done', index <= current);
        stop.classList.toggle('now', index === current);
      });
      status.textContent = messages[current];
      advance.textContent = current === stops.length - 1 ? 'Volver a empezar' : 'Siguiente paso';
    }

    advance.addEventListener('click', function () {
      current = (current + 1) % stops.length;
      show();
    });
    show();
  }

  function setupExpiryOrder() {
    var board = document.querySelector('.fefo');
    if (!board) return;
    var list = board.querySelector('.fefo-list');
    var firstBatches = list.innerHTML;
    var status = board.querySelector('[data-fefo-status]');
    var labelProduct = board.querySelector('[data-label-product]');
    var labelBatch = board.querySelector('[data-label-batch]');
    var labelExpiry = board.querySelector('[data-label-expiry]');

    function showLabel(batch) {
      labelProduct.textContent = batch.getAttribute('data-product');
      labelBatch.textContent = batch.getAttribute('data-batch');
      labelExpiry.textContent = batch.getAttribute('data-expiry');
      labelExpiry.className = 'label-expiry ' + batch.getAttribute('data-state');
      each('button', function (other) {
        other.setAttribute('aria-pressed', other === batch ? 'true' : 'false');
      }, list);
    }

    list.addEventListener('click', function (event) {
      var batch = event.target.closest('button');
      if (batch) showLabel(batch);
    });

    board.querySelector('[data-fefo-out]').addEventListener('click', function () {
      var next = list.querySelector('li');
      var batch = next.querySelector('button');
      status.textContent = 'Salida registrada: ' + batch.getAttribute('data-product') + ' (' + batch.getAttribute('data-batch') + ').';
      list.removeChild(next);
      if (!list.children.length) list.innerHTML = firstBatches;
      showLabel(list.querySelector('button'));
    });
  }

  setupPlateLookup();
  setupOwnerDecision();
  setupPointOfSale();
  setupOrderTracking();
  setupExpiryOrder();
})();
