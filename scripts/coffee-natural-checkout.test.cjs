const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { test } = require('node:test');

const providerOrderId = 'ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP9';
const redirect = `https://www.mercadopago.com.mx/checkout/v1/redirect?order_id=${providerOrderId}`;

function ordersFixtures() {
  Object.assign(process.env, {
    COFFEE_NATURAL_PAYMENT_MODE: 'sandbox',
    COFFEE_NATURAL_SITE_URL: 'https://coffee-preview.example.test',
    MERCADOPAGO_ORDERS_APP_ID: '123456',
    MERCADOPAGO_ORDERS_ACCESS_TOKEN: 'orders-test-fixture',
    MERCADOPAGO_ORDERS_WEBHOOK_SECRET: 'orders-signing-fixture',
  });
}

function providerResource(reference, overrides = {}) {
  return {
    id: providerOrderId, type: 'online', processing_mode: 'manual',
    external_reference: reference, total_amount: '350.00', currency: 'MXN',
    integration_data: {application_id: '123456'}, checkout_url: redirect,
    ...overrides,
  };
}

test('natural purchases use Orders and the correct total for pickup and delivery', async () => {
  process.env.URL = 'https://bmoodcoffee.com';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://bmoodcoffee.com';
  process.env.PAYMENT_MODE = 'sandbox';
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'legacy-test-fixture';
  process.env.COFFEE_DELIVERY_FEE = '60';
  ordersFixtures();
  delete process.env.COFFEE_NATURAL_PRICE;
  delete process.env.COFFEE_NATURAL_WEIGHT;

  const shared = require('../netlify/functions/coffee-commerce-shared');
  const written = [];
  shared.initNetlifyBlobs = () => {};
  shared.checkRateLimit = async () => ({ allowed: true });
  shared.setJSON = async (store, _key, data) => {
    if (data.product?.sku === 'BMC-NATURAL') assert.equal(store, 'coffee_orders_sandbox');
    written.push(data);
  };

  const { handler: getProduct } = require('../netlify/functions/coffee-product');
  const { handler: checkout } = require('../netlify/functions/coffee-checkout');
  const productRequest = id => getProduct({
    httpMethod: 'GET', queryStringParameters: id ? { product: id } : {},
  });
  const orderRequest = (product, overrides = {}) => checkout({
    httpMethod: 'POST',
    body: JSON.stringify({
      product, name: 'Cliente de prueba', phone: '2220000000',
      quantity: 1, acceptsTerms: true, ...overrides,
    }),
  });

  const pedidos = [];
  const preferences = [];
  let overrides = {};
  global.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    if (url === 'https://api.mercadopago.com/checkout/preferences') {
      assert.equal(options.headers.Authorization, 'Bearer legacy-test-fixture');
      preferences.push(payload);
      return Response.json({ id: 'legacy', sandbox_init_point:'https://checkout.example.test/legacy' });
    }
    assert.equal(url, 'https://api.mercadopago.com/v1/orders');
    assert.equal(options.headers.Authorization, 'Bearer orders-test-fixture');
    assert.match(options.headers['X-Idempotency-Key'], /^[a-f0-9-]{36}$/);
    pedidos.push(payload);
    return Response.json(providerResource(payload.external_reference, {total_amount:payload.total_amount,...overrides}), {status:201});
  };

  delete process.env.MERCADOPAGO_ORDERS_ACCESS_TOKEN;
  assert.equal(JSON.parse((await productRequest('natural')).body).checkoutAvailable, false);
  assert.equal((await orderRequest('natural')).statusCode, 503);
  ordersFixtures();
  assert.equal((await orderRequest('unknown')).statusCode, 404);
  const natural = JSON.parse((await productRequest('natural')).body);
  assert.equal(natural.checkoutAvailable, true);
  assert.equal(natural.product.unitPrice, 350);
  assert.equal(natural.product.weight, '250 g');

  delete process.env.MERCADOPAGO_ORDERS_WEBHOOK_SECRET;
  assert.equal((await orderRequest('natural')).statusCode, 503);
  ordersFixtures();
  assert.equal((await orderRequest('natural', {expectedTotal:100})).statusCode, 409);
  assert.equal(pedidos.length, 0);

  overrides = {id:providerOrderId.replace('ORDTST','ORD')};
  assert.equal((await orderRequest('natural')).statusCode, 502);
  overrides = {checkout_url:'https://checkout.example.test/order'};
  assert.equal((await orderRequest('natural')).statusCode, 502);
  overrides = {integration_data:{application_id:'543210'}};
  assert.equal((await orderRequest('natural')).statusCode, 502);
  assert.equal(written.length, 0);
  overrides = {};

  const pickup = await orderRequest('natural', {expectedTotal:350});
  const pickupData = JSON.parse(pickup.body);
  assert.equal(pickup.statusCode, 200);
  assert.equal(pickupData.checkoutUrl, redirect);
  const pickupPayload = pedidos.at(-1);
  assert.equal(pickupPayload.payer, undefined);
  assert.deepEqual(pickupPayload.items, [{title:'Café natural Finca Santa Cruz',unit_price:'350.00',quantity:1}]);
  assert.equal(pickupPayload.total_amount, '350.00');
  for (const name of ['success_url','failure_url','pending_url']) {
    const url = new URL(pickupPayload.config.online[name]);
    assert.equal(url.origin, 'https://coffee-preview.example.test');
    assert.equal(url.pathname, '/nuestro-cafe/pago/');
    assert.equal(url.searchParams.get('order'), pickupData.orderId);
  }
  assert.equal(written.at(-1).providerOrderId, providerOrderId);
  assert.equal(written.at(-1).product.sku, 'BMC-NATURAL');

  const delivery = await orderRequest('natural', {
    fulfillmentMethod:'delivery', deliveryStreet:'Dirección simulada', deliveryNeighborhood:'La Paz', expectedTotal:410,
  });
  assert.equal(delivery.statusCode, 200);
  assert.equal(pedidos.at(-1).total_amount, '410.00');
  assert.deepEqual(pedidos.at(-1).items[1], {title:'Entrega en Puebla',unit_price:'60.00',quantity:1});
  assert.equal(written.at(-1).totalAmount, 410);

  const legacyProduct = JSON.parse((await productRequest()).body).product;
  assert.equal((await orderRequest()).statusCode, 400);
  assert.equal((await orderRequest(undefined, {email:'cliente@example.test'})).statusCode, 200);
  assert.equal(preferences[0].items[0].id, legacyProduct.sku);
  assert.equal(preferences[0].items[0].unit_price, legacyProduct.unitPrice);
  assert.equal(new URL(preferences[0].back_urls.success).pathname, '/cafe-lavado/pago-exitoso/');
});

test('the natural checkout persists one order across retries and fulfillment requires a confirmed payment', async () => {
  ordersFixtures();
  process.env.ADMIN_SECRET = 'staff-fixture';
  const records = new Map();
  const tags = new Map();
  const store = {
    async list() {return {blobs:[...records.keys()].map(key=>({key}))};},
    async get(key) {return structuredClone(records.get(key));},
    async getWithMetadata(key) {return records.has(key)?{data:structuredClone(records.get(key)),etag:String(tags.get(key))}:null;},
    async setJSON(key,value,condition) {
      if (condition.onlyIfNew && records.has(key) || condition.onlyIfMatch && String(tags.get(key))!==condition.onlyIfMatch) return {modified:false};
      records.set(key,structuredClone(value));
      tags.set(key,(tags.get(key)||0)+1);
      return {modified:true};
    },
  };
  const requestId = '31234567-1234-4000-8000-123456789abc';
  const {naturalCheckout} = await import('../netlify/functions/coffee-natural-checkout.mjs');
  const {staffNaturalOrders} = await import('../netlify/functions/coffee-natural-orders-staff.mjs');
  const params={requestId,name:'Pedido de prueba',phone:'2220000000',fulfillmentMethod:'pickup',quantity:1,expectedTotal:350,acceptsTerms:true};
  const originalFetch=globalThis.fetch;
  const keys=[];
  let simulateTimeout=true;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.mercadopago.com/v1/orders');
    keys.push(options.headers['X-Idempotency-Key']);
    assert.equal(records.size,1);
    if (simulateTimeout) {simulateTimeout=false; throw Error('fixture timeout after provider call');}
    return Response.json(providerResource(JSON.parse(options.body).external_reference),{status:201});
  };
  const shop='https://coffee-preview.example.test';
  const checkout=(body,origin=shop)=>naturalCheckout(new Request(shop+'/api/coffee-natural-checkout',{
    method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body),
  }),{ip:'fixture'},()=>store,async()=>({allowed:true}));
  const staff=(body,secret='staff-fixture')=>staffNaturalOrders(new Request(shop+'/api/coffee-natural-orders-staff',{
    method:body?'POST':'GET',headers:{origin:shop,'x-admin-secret':secret},
    ...(body?{body:JSON.stringify(body)}:{}),
  }),()=>store);
  try {
    assert.equal((await checkout(params,'https://foreign.example.test')).status,403);
    assert.equal((await checkout({...params,expectedTotal:1})).status,409);
    assert.equal((await checkout(params)).status,503);
    const retry=await checkout(params);
    assert.equal(retry.status,200);
    const {orderId,checkoutUrl}=await retry.json();
    assert.equal(checkoutUrl,redirect);
    assert.equal((await (await checkout(params)).json()).orderId,orderId);
    assert.deepEqual(keys,[requestId,requestId]);
    assert.equal((await staff()).status,200);
    assert.deepEqual((await (await staff()).json()).orders,[]);
    assert.equal((await staff(undefined,'wrong')).status,401);
    assert.equal((await staff({id:orderId,status:'ready'})).status,409);
    const key='orders/'+orderId+'.json';
    await store.setJSON(key,{...records.get(key),status:'paid',paymentStatus:'paid',pickupStatus:'pending_pickup'},{});
    assert.equal((await (await staff()).json()).orders[0].id,orderId);
    assert.equal((await staff({id:orderId,status:'fulfilled'})).status,409);
    assert.equal((await staff({id:orderId,status:'ready'})).status,200);
    assert.equal((await staff({id:orderId,status:'fulfilled'})).status,200);
    assert.deepEqual((await (await staff()).json()).orders,[]);
  } finally {
    globalThis.fetch=originalFetch;
    delete process.env.ADMIN_SECRET;
  }
});

test('signed Orders webhooks confirm only matching funds and update the order without retries overwriting it', async () => {
  ordersFixtures();
  const localId = 'BMC-LOCAL-0123ABCD';
  let stored = {id:localId, providerOrderId, status:'pending_payment', paymentStatus:'pending', totalAmount:350, currency:'MXN'};
  let resource = providerResource(localId, {status:'processed', status_detail:'accredited', total_paid_amount:'100.00'});
  let reads = 0;
  let concurrentEdit = false;
  const getStore = name => {
    assert.equal(name,'coffee_orders_sandbox');
    return {
      getWithMetadata: async (key, options) => {
        assert.equal(key, `orders/${localId}.json`);
        assert.equal(options.consistency, 'strong');
        return {data:{...stored},etag:'known-etag'};
      },
      setJSON: async (_key,value,options) => {
        assert.equal(options.onlyIfMatch,'known-etag');
        if (concurrentEdit) return {modified:false};
        stored = value;
        return {modified:true};
      },
    };
  };
  global.fetch = async (url, options) => {
    assert.equal(url, `https://api.mercadopago.com/v1/orders/${providerOrderId}`);
    assert.equal(options.headers.Authorization, 'Bearer orders-test-fixture');
    reads += 1;
    return Response.json(resource);
  };
  const { ordersWebhook } = await import('../netlify/functions/coffee-mercadopago-orders-webhook.mjs');
  function notification(secret = process.env.MERCADOPAGO_ORDERS_WEBHOOK_SECRET) {
    const timestamp = String(Date.now());
    const signature = createHmac('sha256',secret).update(
      `id:${providerOrderId.toLowerCase()};request-id:fixture-request;ts:${timestamp};`,
    ).digest('hex');
    const url = new URL('https://coffee-preview.example.test/.netlify/functions/coffee-mercadopago-orders-webhook');
    url.search = new URLSearchParams({'data.id':providerOrderId,type:'order'});
    return ordersWebhook(new Request(url, {method:'POST',
      headers:{'x-request-id':'fixture-request','x-signature':`ts=${timestamp},v1=${signature}`}}), getStore);
  }

  assert.equal((await notification('different-fixture')).status,401);
  assert.equal(reads,0);
  assert.equal((await (await notification()).json()).ignored,'amount_mismatch');
  assert.equal(stored.status,'pending_payment');
  resource = {...resource,status:'action_required',status_detail:'waiting_retry',
    transactions:{payments:[{status:'failed',status_detail:'rejected_by_issuer'}]}};
  assert.equal((await notification()).status,200);
  assert.equal(stored.status,'payment_failed');
  resource = {...resource,status:'processed',status_detail:'accredited',total_paid_amount:'350.00'};
  concurrentEdit = true;
  assert.equal((await notification()).status,503);
  concurrentEdit = false;
  assert.equal((await notification()).status,200);
  assert.equal(stored.status,'paid');
  assert.equal(stored.pickupStatus,'pending_pickup');
  assert.equal((await (await notification()).json()).unchanged,true);
  resource = {...resource,status:'failed',status_detail:'rejected_by_issuer'};
  assert.equal((await (await notification()).json()).unchanged,true);
  assert.equal(stored.status,'paid');
  resource = {...resource,status:'refunded',status_detail:'refunded'};
  assert.equal((await notification()).status,200);
  assert.equal(stored.status,'payment_review');
  assert.equal(stored.pickupStatus,'not_ready');
});

test('the payment callback confirms the signed amount and preserves an approved order', async () => {
  const shared = require('../netlify/functions/coffee-commerce-shared');
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'fixture-signing-key';
  const stored = new Map([['orders/local-order.json', {
    status: 'pending_payment', paymentStatus: 'pending', totalAmount: 295.90, paymentId: 'local-payment',
  }]]);
  shared.initNetlifyBlobs = () => {};
  shared.getJSON = async (_store, key) => structuredClone(stored.get(key));
  shared.setJSON = async (_store, key, value) => stored.set(key, structuredClone(value));
  const { handler: webhook } = require('../netlify/functions/coffee-mercadopago-webhook');

  let providerLookups = 0;
  let transactionAmount = 100;
  let paymentStatus = 'approved';
  global.fetch = async url => {
    assert.equal(url, 'https://api.mercadopago.com/v1/payments/12345');
    providerLookups += 1;
    return Response.json({ id: 12345, external_reference: 'local-order', status: paymentStatus,
      transaction_amount: transactionAmount, currency_id: 'MXN' });
  };
  const notification = (id, secret = process.env.MERCADOPAGO_WEBHOOK_SECRET) => {
    const ts = '1760000000';
    const requestId = `request-${id}`;
    const signature = createHmac('sha256', secret)
      .update(`id:12345;request-id:${requestId};ts:${ts};`).digest('hex');
    return webhook({
      httpMethod: 'POST', headers: { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${signature}` },
      queryStringParameters: { 'data.id': '12345' },
      body: JSON.stringify({ id, type: 'payment', data: {id: 12345} }),
    });
  };

  assert.equal((await notification(1, 'wrong-key')).statusCode, 401);
  assert.equal(stored.size, 1);
  assert.equal(providerLookups, 0);
  assert.equal(JSON.parse((await notification(2)).body).processed, false);
  assert.equal(stored.get('orders/local-order.json').status, 'pending_payment');
  transactionAmount = 295.90;
  assert.equal(JSON.parse((await notification(3)).body).processed, true);
  assert.equal(stored.get('orders/local-order.json').status, 'paid');
  paymentStatus = 'rejected';
  assert.equal(JSON.parse((await notification(4)).body).ignored, 'order_already_paid');
  assert.equal(stored.get('payments/local-payment.json').status, 'paid');
  assert.equal(stored.get('orders/local-order.json').status, 'paid');
});
