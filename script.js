const number = (id) => {
  const value = Number.parseFloat(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
};

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const units = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function setNote(id, message, warning = false) {
  const note = document.getElementById(id);
  note.textContent = message;
  note.classList.toggle('warning', warning);
}

function calculateMargin() {
  const revenue = number('revenue');
  const productCost = number('product-cost');
  const fulfillment = number('fulfillment-cost');
  const shipping = number('shipping-cost');
  const paymentFee = (revenue * number('payment-percent') / 100) + number('payment-fixed');
  const advertising = number('ad-cost');
  const refunds = revenue * number('refund-percent') / 100;
  const costsBeforeAdvertising = productCost + fulfillment + shipping + paymentFee + refunds;
  const contribution = revenue - costsBeforeAdvertising - advertising;
  const margin = revenue > 0 ? contribution / revenue * 100 : 0;
  const breakEvenAdCost = Math.max(0, revenue - costsBeforeAdvertising);

  document.getElementById('margin-dollars').textContent = dollars.format(contribution);
  document.getElementById('margin-percent').textContent = `${margin.toFixed(1)}%`;
  document.getElementById('break-even-cac').textContent = dollars.format(breakEvenAdCost);

  if (revenue <= 0) {
    setNote('margin-note', 'Add revenue to calculate the order economics.', true);
  } else if (contribution < 0) {
    setNote('margin-note', `At these assumptions, each order loses ${dollars.format(Math.abs(contribution))} after the costs shown.`, true);
  } else {
    setNote('margin-note', `${dollars.format(contribution)} remains per order after the costs shown.`);
  }
}

function calculateRunway() {
  const onHand = number('on-hand');
  const reserved = number('reserved');
  const baseDemand = number('daily-demand');
  const change = number('demand-change') / 100;
  const available = Math.max(0, onHand - reserved);
  const adjustedDemand = Math.max(0, baseDemand * (1 + change));
  const runway = adjustedDemand > 0 ? available / adjustedDemand : 0;

  document.getElementById('available-units').textContent = units.format(available);
  document.getElementById('adjusted-demand').textContent = `${units.format(adjustedDemand)} / day`;
  document.getElementById('runway-days').textContent = adjustedDemand > 0 ? `${units.format(runway)} days` : '—';

  if (adjustedDemand > 0) {
    const stockout = new Date();
    stockout.setDate(stockout.getDate() + Math.floor(runway));
    document.getElementById('stockout-date').textContent = stockout.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setNote('runway-note', runway < 30
      ? 'Less than 30 days of estimated runway. Confirm demand, inbound timing and any inventory that is not actually sellable.'
      : 'Use this as a starting point, then pressure-test promotions, subscriptions, seasonality and inbound reliability.', runway < 30);
  } else {
    document.getElementById('stockout-date').textContent = '—';
    setNote('runway-note', 'Add average daily demand to estimate runway.', true);
  }
}

function calculateReorder() {
  const onHand = number('reorder-on-hand');
  const onOrder = number('on-order');
  const committed = number('committed');
  const demand = number('reorder-demand');
  const leadTime = number('lead-time');
  const safetyDays = number('safety-days');
  const targetDays = number('target-days');
  const position = Math.max(0, onHand + onOrder - committed);
  const reorderPoint = demand * (leadTime + safetyDays);
  const targetStock = demand * (leadTime + safetyDays + targetDays);
  const suggested = Math.max(0, Math.ceil(targetStock - position));
  const shouldOrder = position <= reorderPoint;

  document.getElementById('inventory-position').textContent = units.format(position);
  document.getElementById('reorder-point').textContent = units.format(reorderPoint);
  document.getElementById('suggested-order').textContent = units.format(suggested);
  document.getElementById('reorder-status').textContent = shouldOrder ? 'Review now' : 'Above trigger';

  setNote('reorder-note', shouldOrder
    ? `Inventory position is at or below the calculated reorder point. Review supplier capacity, MOQ, cash, shelf life and actual demand before placing an order.`
    : `Inventory position is ${units.format(position - reorderPoint)} units above the calculated reorder point. Keep watching demand and lead-time changes.`, shouldOrder);
}

document.querySelectorAll('.tool-tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tool-tab').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('.tool-panel').forEach((panel) => {
      const active = panel.id === button.dataset.tool;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  });
});

document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => {
    calculateMargin();
    calculateRunway();
    calculateReorder();
  });
});

document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('submit', (event) => event.preventDefault());
});

calculateMargin();
calculateRunway();
calculateReorder();
