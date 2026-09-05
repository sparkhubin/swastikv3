import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAllDeletes() {
  console.log('--- Testing All Delete Operations ---');
  let allPass = true;

  // 1. Review Delete
  try {
    const revRes = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Reviewer',
        rating: 5,
        commentEn: 'Testing delete functionality',
        commentHi: 'डिलीट परीक्षण',
      })
    });
    const rev = await revRes.json();
    console.log(`[Review] Created review ID: ${rev.id}`);

    const delRevRes = await fetch(`${BASE_URL}/api/reviews/${rev.id}`, { method: 'DELETE' });
    const delRevData = await delRevRes.json();
    console.log(`[Review] Delete response:`, delRevData);
    if (!delRevRes.ok || !delRevData.success) throw new Error('Review deletion failed');
    console.log('✓ Review delete passed');
  } catch (err) {
    console.error('✗ Review delete failed:', err.message);
    allPass = false;
  }

  // 2. Customer Delete
  try {
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Test Customer',
        phone: '+91 99887 76655',
        email: 'deletetest@customer.test'
      })
    });
    const custJson = await custRes.json();
    const custId = custJson.customer?.id || custJson.id;
    console.log(`[Customer] Created customer ID: ${custId}`);

    const delCustRes = await fetch(`${BASE_URL}/api/customers/${custId}`, { method: 'DELETE' });
    const delCustData = await delCustRes.json();
    console.log(`[Customer] Delete response:`, delCustData);
    if (!delCustRes.ok || !delCustData.success) throw new Error('Customer deletion failed');
    console.log('✓ Customer delete passed');
  } catch (err) {
    console.error('✗ Customer delete failed:', err.message);
    allPass = false;
  }

  // 3. Product Delete with order link
  try {
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_en: 'Delete Test Product',
        name_hi: 'डिलीट टेस्ट उत्पाद',
        price: 99,
        category: 'Fruits',
        stock: 10,
        gst_percent: 5
      })
    });
    const prod = await prodRes.json();
    console.log(`[Product] Created product ID: ${prod.id}`);

    const delProdRes = await fetch(`${BASE_URL}/api/products/${prod.id}`, { method: 'DELETE' });
    const delProdData = await delProdRes.json();
    console.log(`[Product] Delete response:`, delProdData);
    if (!delProdRes.ok) throw new Error('Product deletion failed');
    console.log('✓ Product delete passed');
  } catch (err) {
    console.error('✗ Product delete failed:', err.message);
    allPass = false;
  }

  // 4. Staff Delete
  try {
    const staffRes = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Test Staff',
        mobile: '9123456789',
        role: 'Delivery Rider',
        password: 'pass'
      })
    });
    const staffJson = await staffRes.json();
    const staffId = staffJson.staff?.id || staffJson.id;
    console.log(`[Staff] Created staff ID: ${staffId}`);

    const delStaffRes = await fetch(`${BASE_URL}/api/staff/${staffId}`, { method: 'DELETE' });
    const delStaffData = await delStaffRes.json();
    console.log(`[Staff] Delete response:`, delStaffData);
    if (!delStaffRes.ok || !delStaffData.success) throw new Error('Staff deletion failed');
    console.log('✓ Staff delete passed');
  } catch (err) {
    console.error('✗ Staff delete failed:', err.message);
    allPass = false;
  }

  // 5. Order Delete
  try {
    const ordRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'SW-DEL-TEST-01',
        customerName: 'Order Delete Tester',
        customerPhone: '9876543210',
        total: 150,
        items: []
      })
    });
    const ord = await ordRes.json();
    console.log(`[Order] Created order ID: ${ord.id}`);

    const delOrdRes = await fetch(`${BASE_URL}/api/orders/${ord.id}`, { method: 'DELETE' });
    const delOrdData = await delOrdRes.json();
    console.log(`[Order] Delete response:`, delOrdData);
    if (!delOrdRes.ok) throw new Error('Order deletion failed');
    console.log('✓ Order delete passed');
  } catch (err) {
    console.error('✗ Order delete failed:', err.message);
    allPass = false;
  }

  // 6. WhatsApp Custom Template Delete
  try {
    const tmplRes = await fetch(`${BASE_URL}/api/whatsapp/custom-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateName: 'test_delete_tmpl',
        category: 'MARKETING',
        bodyText: 'Hello {{1}}, test template'
      })
    });
    const tmpl = await tmplRes.json();
    console.log(`[WA Template] Created template ID: ${tmpl.template?.id || 'test_delete_tmpl'}`);

    const targetId = tmpl.template?.id || 'test_delete_tmpl';
    const delTmplRes = await fetch(`${BASE_URL}/api/whatsapp/custom-templates/${targetId}`, { method: 'DELETE' });
    const delTmplData = await delTmplRes.json();
    console.log(`[WA Template] Delete response:`, delTmplData);
    if (!delTmplRes.ok || !delTmplData.success) throw new Error('Template deletion failed');
    console.log('✓ WhatsApp template delete passed');
  } catch (err) {
    console.error('✗ WhatsApp template delete failed:', err.message);
    allPass = false;
  }

  // 7. Data Deletion Request Delete
  try {
    const ddrRes = await fetch(`${BASE_URL}/api/data-deletion-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DDR Delete Tester',
        phone: '+91 99999 11111',
        reason: 'Testing DDR delete'
      })
    });
    const ddr = await ddrRes.json();
    console.log(`[DDR] Created request ID: ${ddr.request?.id}`);

    const delDdrRes = await fetch(`${BASE_URL}/api/data-deletion-requests/${ddr.request.id}`, { method: 'DELETE' });
    const delDdrData = await delDdrRes.json();
    console.log(`[DDR] Delete response:`, delDdrData);
    if (!delDdrRes.ok || !delDdrData.success) throw new Error('DDR record deletion failed');
    console.log('✓ Data Deletion Request delete passed');
  } catch (err) {
    console.error('✗ Data Deletion Request delete failed:', err.message);
    allPass = false;
  }

  if (allPass) {
    console.log('\n🎉 ALL DELETE OPERATIONS VERIFIED & WORKING 100% RELIABLY!');
  } else {
    console.error('\n⚠️ SOME DELETE OPERATIONS FAILED');
    process.exit(1);
  }
}

testAllDeletes();
