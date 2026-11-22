const login = document.querySelector('#staff-coffee-access');
const password = document.querySelector('#staff-coffee-key');
const refresh = document.querySelector('#staff-coffee-refresh');
const status = document.querySelector('#staff-coffee-status');
const list = document.querySelector('#staff-coffee-orders');
const currency = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
let key = '';
let working = false;

function line(tag,text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

async function manage(change) {
  if (working) return;
  working = true;
  refresh.disabled = true;
  status.textContent = 'Consultando pedidos…';
  try {
    if (change) await request(change);
    const {orders} = await request();
    login.hidden = true;
    password.value = '';
    refresh.hidden = false;
    status.textContent = orders.length ? '' : 'No hay pedidos pendientes de entrega.';
    list.replaceChildren(...orders.map(order => {
      const row = document.createElement('article');
      row.className = 'coffee-checkout natural-checkout';
      const delivery = order.fulfillment.method === 'delivery';
      const details = order.fulfillment.deliveryAddress;
      row.append(
        line('h2',order.customer.name),
        line('p',order.id + ' · ' + (delivery ? 'Entrega' : 'Recoge en La Paz')),
        line('p',order.quantity + (order.quantity === 1 ? ' bolsa' : ' bolsas') + ' · ' + currency.format(order.totalAmount)),
        line('p','WhatsApp ' + order.customer.phone),
      );
      if (details) row.append(line('p',[details.street,details.neighborhood,details.city,details.references].filter(Boolean).join(', ')));
      if (order.notes) row.append(line('p',order.notes));
      if (order.status === 'payment_review') row.append(line('p','Revisar el pago en Mercado Pago.'));
      else {
        const ready = order.pickupStatus === 'ready';
        const button = line('button',ready ? 'Marcar entregado' : 'Marcar listo');
        button.type = 'button';
        button.className = 'btn btn--primary';
        button.addEventListener('click',()=>manage({id:order.id,status:ready?'fulfilled':'ready'}));
        row.append(button);
      }
      return row;
    }));
  } catch (error) {
    status.textContent = error.message;
    if (error.status === 401) {
      key = '';
      password.value = '';
      list.replaceChildren();
      login.hidden = false;
      refresh.hidden = true;
    }
  } finally {
    working = false;
    refresh.disabled = false;
  }
}

async function request(change) {
  const response = await fetch('/api/coffee-natural-orders-staff',{
    method:change?'POST':'GET',
    headers:{'X-Admin-Secret':key,...(change?{'Content-Type':'application/json'}:{})},
    ...(change?{body:JSON.stringify(change)}:{}),
    cache:'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo consultar la bandeja.'),{status:response.status});
  return data;
}

login.addEventListener('submit',event=>{
  event.preventDefault();
  if (working) return;
  key = password.value;
  manage();
});
refresh.addEventListener('click',()=>manage());
