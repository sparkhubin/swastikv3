import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const scrypt=promisify(crypto.scrypt);
async function passwordHash(password){const salt=crypto.randomBytes(16).toString("hex");const value=await scrypt(password,salt,64);return `scrypt$${salt}$${Buffer.from(value).toString("hex")}`;}

test("final-schema authentication, isolation, stock, order, delivery, points, membership, payment and WhatsApp controls",async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),"swastik-test-"));
  const databasePath=path.join(directory,"test.db");
  await fs.copyFile(path.resolve("swastik_local_final.db"),databasePath);
  process.env.DATABASE_PATH=databasePath;
  process.env.NODE_ENV="production";
  const [{db},{createServer}]=await Promise.all([import("../database/db.js"),import("../server/app.js")]);
  await db.init();
  const roleAdmin=await db.get("SELECT id FROM role WHERE lower(name)='admin' LIMIT 1");
  const roleRider=await db.get("SELECT id FROM role WHERE lower(name)='rider' LIMIT 1");
  const adminPassword="Test-Admin-Password-42"; const riderPassword="Test-Rider-Password-42"; const customerPassword="Test-Customer-Password-42";
  let customerA,customerB,riderId,deliveryId,product;
  await db.transaction(async tx=>{
    customerA=(await tx.execute("INSERT INTO customer (name,phone,email,password_hash,status) VALUES ('Test Customer A','9000000001','a@test.invalid',?,'Active')",[await passwordHash(customerPassword)])).lastID;
    customerB=(await tx.execute("INSERT INTO customer (name,phone,email,password_hash,status) VALUES ('Test Customer B','9000000002','b@test.invalid',?,'Active')",[await passwordHash(customerPassword)])).lastID;
    await tx.execute("INSERT INTO \"user\" (full_name,phone_number,password_hash,role_id,status,is_master_admin) VALUES ('Test Administrator','9000000010',?,?,'Active',1)",[await passwordHash(adminPassword),roleAdmin.id]);
    riderId=(await tx.execute("INSERT INTO \"user\" (full_name,phone_number,password_hash,role_id,status,is_master_admin) VALUES ('Test Rider','9000000011',?,?,'Active',0)",[await passwordHash(riderPassword),roleRider.id])).lastID;
    deliveryId=(await tx.execute("INSERT INTO delivery_staff (user_id,name,phone,status) VALUES (?,'Test Rider','9000000011','ACTIVE')",[riderId])).lastID;
    product=await tx.get("SELECT p.*,i.stock_qty,i.reserved_qty FROM product p JOIN inventory i ON i.product_id=p.id WHERE p.is_active=1 AND i.stock_qty-i.reserved_qty>=10 ORDER BY p.id LIMIT 1");
  });
  const app=await createServer();
  const server=await new Promise(resolve=>{const value=app.listen(0,"127.0.0.1",()=>resolve(value));});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const request=async(endpoint,{cookie,token,...options}={})=>{const headers=new Headers(options.headers||{});if(cookie)headers.set("cookie",cookie);if(token)headers.set("authorization",`Bearer ${token}`);const response=await fetch(`${base}${endpoint}`,{...options,headers});const body=await response.json().catch(()=>({}));return{response,body,cookie:response.headers.get("set-cookie")};};
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();await fs.rm(directory,{recursive:true,force:true});});

  const products=await request("/products");assert.equal(products.response.status,200);assert.equal(products.body.length,3731);assert.equal(products.body[0].stockCount,products.body[0].stockQty-products.body[0].reservedQty);
  assert.equal((await request("/orders")).response.status,401);assert.equal((await request("/customers")).response.status,401);
  const admin=await request("/auth/staff/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mobile:"9000000010",password:adminPassword})});assert.equal(admin.response.status,200);assert.ok(admin.body.token);assert.equal("password_hash" in admin.body.user,false);
  const rider=await request("/auth/staff/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mobile:"9000000011",password:riderPassword})});assert.equal(rider.response.status,200);
  assert.equal((await request("/staff",{token:rider.body.token})).response.status,403);
  const loginA=await request("/auth/customer/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phoneNumber:"9000000001",password:customerPassword})});assert.equal(loginA.response.status,200);assert.ok(loginA.cookie);
  const loginB=await request("/auth/customer/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phoneNumber:"9000000002",password:customerPassword})});assert.equal(loginB.response.status,200);
  assert.equal((await request("/auth/customer/me",{cookie:loginA.cookie})).body.customer.id,customerA);
  const profileUpdate=await request("/customers/me",{cookie:loginA.cookie,method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Updated Customer A",email:"updated-a@test.invalid",address:"Updated Test Address"})});assert.equal(profileUpdate.response.status,200);assert.equal(profileUpdate.body.customer.id,customerA);

  const tempProduct=await request("/products",{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:"TEST-TEMP-PRODUCT",nameEn:"Temporary integration product",price:10,gstPercent:5,stockCount:3})});assert.equal(tempProduct.response.status,201);assert.equal(tempProduct.body.stockCount,3);
  assert.equal((await request("/products/bulk-stock",{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({updates:[{id:tempProduct.body.id,stockCount:5}]})})).response.status,200);
  assert.equal((await request(`/products/${tempProduct.body.id}`,{token:admin.body.token,method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({stockCount:-1})})).response.status,409);

  const orderPayload={customerId:customerB,paymentMethod:"COD",shippingAddress:"Test Address",subtotal:0,total:0,items:[{productId:product.id,qty:2,price:0,gstPercent:0}]};
  const created=await request("/orders",{cookie:loginA.cookie,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(orderPayload)});assert.equal(created.response.status,201);assert.equal(created.body.customerId,customerA);assert.equal(created.body.subtotal,Number(product.price)*2);assert.notEqual(created.body.grandTotal,0);
  const inventoryReserved=await db.get("SELECT * FROM inventory WHERE product_id=?",[product.id]);assert.equal(Number(inventoryReserved.reserved_qty),Number(product.reserved_qty)+2);assert.ok(await db.get("SELECT id FROM stock_movement WHERE reference_id=? AND type='RESERVE'",[created.body.id]));
  assert.equal((await request(`/orders/${created.body.id}`,{cookie:loginB.cookie})).response.status,403);
  const tooMuch=await request("/orders",{cookie:loginA.cookie,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...orderPayload,items:[{productId:product.id,qty:999999}]})});assert.equal(tooMuch.response.status,409);

  const assigned=await request(`/orders/${created.body.id}/assignment`,{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({deliveryStaffId:riderId})});assert.equal(assigned.response.status,200);assert.equal(assigned.body.deliveryStaffId,riderId);
  const riderOrders=await request("/orders",{token:rider.body.token});assert.equal(riderOrders.body.length,1);
  const delivered=await request(`/orders/${created.body.id}/transit`,{token:rider.body.token,method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({status:"DELIVERED"})});assert.equal(delivered.response.status,200);assert.equal(delivered.body.statusCode,"DELIVERED");
  const inventoryDelivered=await db.get("SELECT * FROM inventory WHERE product_id=?",[product.id]);assert.equal(Number(inventoryDelivered.stock_qty),Number(product.stock_qty)-2);assert.equal(Number(inventoryDelivered.reserved_qty),Number(product.reserved_qty));

  const adjustment=await request(`/customers/${customerA}/points`,{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({points:25,referenceId:"TEST-ADJUSTMENT"})});assert.equal(adjustment.response.status,201);
  const points=await request(`/customers/${customerA}/points`,{cookie:loginA.cookie});assert.equal(points.body.balance,25);assert.equal((await request(`/customers/${customerA}/points`,{cookie:loginB.cookie})).response.status,403);
  const plan=(await db.execute("INSERT INTO membership_plan (name,duration_days,price) VALUES ('Test Plan',30,100)")).lastID;
  const membership=await request(`/customers/${customerA}/memberships`,{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({planId:plan,membershipNumber:"TEST-MEMBER",amountPaid:100})});assert.equal(membership.response.status,201);
  assert.equal((await request(`/customers/${customerA}/memberships`,{cookie:loginA.cookie})).body.length,1);assert.equal((await request(`/customers/${customerA}/memberships`,{cookie:loginB.cookie})).response.status,403);
  assert.equal((await request(`/customers/${customerA}/memberships/cancel-active`,{token:admin.body.token,method:"POST"})).response.status,200);
  assert.equal((await request(`/customers/${customerA}/memberships`,{cookie:loginA.cookie})).body[0].status,"Cancelled");
  const changedPassword="Changed-Customer-Password-84";const passwordChange=await request("/auth/customer/password",{cookie:loginA.cookie,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword:customerPassword,newPassword:changedPassword})});assert.equal(passwordChange.response.status,200);assert.equal((await request("/auth/customer/me",{cookie:loginA.cookie})).response.status,401);const reloginA=await request("/auth/customer/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phoneNumber:"9000000001",password:changedPassword})});assert.equal(reloginA.response.status,200);
  const margToken="integration-marg-token";assert.equal((await request("/marg/settings",{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({apiToken:margToken,pointsRatio:10,autoNotifyWhatsApp:false})})).response.status,200);
  const margBill=await request("/marg/bill",{method:"POST",headers:{"content-type":"application/json","x-marg-token":margToken},body:JSON.stringify({customerMobile:"9000000001",billNumber:"MARG-INTEGRATION-1",billAmount:100})});assert.equal(margBill.response.status,200);assert.equal(margBill.body.pointsEarned,10);assert.equal((await request("/marg/bill",{method:"POST",headers:{"content-type":"application/json","x-marg-token":margToken},body:JSON.stringify({customerMobile:"9000000001",billNumber:"MARG-INTEGRATION-1",billAmount:100})})).response.status,409);
  assert.equal((await request("/razorpay/webhook",{method:"POST",headers:{"content-type":"application/json"},body:"{}"})).response.status,503);
  const whatsapp=await request("/whatsapp/send",{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({to:"9000000001",message:"Test"})});assert.equal(whatsapp.response.status,502);assert.ok(await db.get("SELECT id FROM whatsapp_log WHERE event_type='MANUAL' AND status='FAILED'"));
  const notification=await db.get("SELECT id FROM notification WHERE recipient_type='CUSTOMER' AND recipient_id=? LIMIT 1",[customerA]);assert.ok(notification);assert.equal((await request(`/notifications/${notification.id}/read`,{cookie:loginB.cookie,method:"PUT"})).response.status,404);
  assert.equal((await request("/data-deletion-requests")).response.status,401);
  const deletion=await request("/data-deletion-requests",{cookie:reloginA.cookie,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customerId:customerB,name:"Spoofed",phone:"9000000002",email:"spoof@test.invalid",reason:"Privacy request",notes:"Erase personal data"})});assert.equal(deletion.response.status,201);assert.equal(deletion.body.request.customerId,customerA);assert.equal(deletion.body.request.name,"Updated Customer A");
  const ownDeletionList=await request("/data-deletion-requests",{cookie:reloginA.cookie});assert.equal(ownDeletionList.body.length,1);const otherDeletionList=await request("/data-deletion-requests",{cookie:loginB.cookie});assert.equal(otherDeletionList.body.length,0);
  const adminDeletionList=await request("/data-deletion-requests",{token:admin.body.token});assert.equal(adminDeletionList.body.length,1);
  const approvedDeletion=await request(`/data-deletion-requests/${deletion.body.request.id}/approve`,{token:admin.body.token,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({adminNotes:"Identity erased after verification."})});assert.equal(approvedDeletion.response.status,200);assert.equal(approvedDeletion.body.request.status,"Approved & Deleted");assert.equal(approvedDeletion.body.request.phone,"");
  assert.equal((await request("/auth/customer/me",{cookie:reloginA.cookie})).response.status,401);
  const erasedCustomer=await db.get("SELECT name,email,address,status,password_hash FROM customer WHERE id=?",[customerA]);assert.deepEqual(erasedCustomer,{name:"",email:"",address:"",status:"Deleted",password_hash:""});
  const retainedOrder=await db.get("SELECT customer_id,customer_name,customer_phone,customer_email,shipping_address FROM \"order\" WHERE id=?",[created.body.id]);assert.equal(retainedOrder.customer_id,customerA);assert.equal(retainedOrder.customer_phone,"");assert.equal(retainedOrder.shipping_address,"");
  assert.ok(await db.get("SELECT id FROM customer_points WHERE customer_id=?",[customerA]));assert.ok(await db.get("SELECT id FROM customer_membership WHERE customer_id=?",[customerA]));
  const publicSettings=await request("/settings");assert.equal(Object.keys(publicSettings.body).some(key=>key.startsWith("privacy_deletion_request_")),false);
  assert.deepEqual(await db.query("PRAGMA foreign_key_check"),[]);
});
