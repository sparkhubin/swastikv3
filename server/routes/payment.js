import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import { audit, requireCustomerAuth, requirePermission, requireStaffAuth } from "../auth.js";
import { sendWhatsAppEvent } from "../services/whatsapp.js";

const router = express.Router();

function safeEqual(left, right) {
  const a=Buffer.from(String(left||"")), b=Buffer.from(String(right||""));
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
function parseExtra(row){ try{return JSON.parse(row?.extra_config||"{}");}catch{return{};} }
async function gatewaySettings(gateway){ return db.get("SELECT * FROM payment_settings WHERE upper(gateway)=? AND enabled=1 LIMIT 1",[gateway]); }
function publicSetting(row){ return {gateway:row.gateway,enabled:Boolean(row.enabled),environment:row.environment,keyId:row.key_id||"",appId:row.app_id||"",configured:Boolean((row.key_id&&row.secret_key)||(row.app_id&&row.app_secret))}; }
async function combinedSettings(){const rows=await db.query("SELECT * FROM payment_settings");const razorpay=rows.find(row=>row.gateway==="RAZORPAY"),cashfree=rows.find(row=>row.gateway==="CASHFREE");return{enabled:Boolean(cashfree?.enabled),appId:cashfree?.app_id||"",secretKey:"",cashfreeConfigured:Boolean(cashfree?.app_id&&cashfree?.app_secret),razorpayEnabled:Boolean(razorpay?.enabled),razorpayKeyId:razorpay?.key_id||"",razorpayKeySecret:"",razorpayConfigured:Boolean(razorpay?.key_id&&razorpay?.secret_key),environment:razorpay?.environment||cashfree?.environment||"TEST",activeGateway:razorpay?.enabled?"RAZORPAY":cashfree?.enabled?"CASHFREE":""};}
function basic(value){return `Basic ${Buffer.from(value).toString("base64")}`;}

router.get("/payment/settings",requireStaffAuth,requirePermission("settings"),async(_req,res)=>{
  try{res.json(await combinedSettings());}
  catch(error){console.error("Payment settings read failed:",error.message);res.status(500).json({error:"Unable to load payment settings."});}
});

router.post("/payment/settings",requireStaffAuth,requirePermission("settings"),async(req,res)=>{
  const gateway=String(req.body?.gateway||"").toUpperCase();
  if(!gateway){
    try{const razorpay=await db.get("SELECT * FROM payment_settings WHERE gateway='RAZORPAY'"),cashfree=await db.get("SELECT * FROM payment_settings WHERE gateway='CASHFREE'"),environment=String(req.body?.environment||"TEST").toUpperCase();const rSecret=String(req.body?.razorpayKeySecret||"")||razorpay?.secret_key||"",cSecret=String(req.body?.secretKey||"")||cashfree?.app_secret||"",rKey=String(req.body?.razorpayKeyId||razorpay?.key_id||""),cApp=String(req.body?.appId||cashfree?.app_id||"");if(req.body?.razorpayEnabled&&(!rKey||!rSecret))return res.status(400).json({error:"Razorpay credentials are required when enabled."});if(req.body?.enabled&&(!cApp||!cSecret))return res.status(400).json({error:"Cashfree credentials are required when enabled."});await db.transaction(async tx=>{await tx.execute(`INSERT INTO payment_settings (gateway,enabled,environment,key_id,secret_key) VALUES ('RAZORPAY',?,?,?,?) ON CONFLICT(gateway) DO UPDATE SET enabled=excluded.enabled,environment=excluded.environment,key_id=excluded.key_id,secret_key=excluded.secret_key,updated_at=CURRENT_TIMESTAMP`,[Number(Boolean(req.body?.razorpayEnabled)),environment,rKey,rSecret]);await tx.execute(`INSERT INTO payment_settings (gateway,enabled,environment,app_id,app_secret) VALUES ('CASHFREE',?,?,?,?) ON CONFLICT(gateway) DO UPDATE SET enabled=excluded.enabled,environment=excluded.environment,app_id=excluded.app_id,app_secret=excluded.app_secret,updated_at=CURRENT_TIMESTAMP`,[Number(Boolean(req.body?.enabled)),environment,cApp,cSecret]);});await audit("USER",req.staff.id,"UPDATE_PAYMENT_SETTINGS","payment_settings","ALL",{environment},req);return res.json({success:true,settings:await combinedSettings()});}catch(error){console.error("Payment settings update failed:",error.message);return res.status(500).json({error:"Unable to update payment settings."});}
  }
  if(!["RAZORPAY","CASHFREE"].includes(gateway)) return res.status(400).json({error:"Supported gateway is required."});
  try{
    const existing=await db.get("SELECT * FROM payment_settings WHERE gateway=?",[gateway]);
    const enabled=Number(Boolean(req.body.enabled));
    const environment=String(req.body.environment||existing?.environment||"TEST").toUpperCase();
    const keyId=String(req.body.keyId??existing?.key_id??""); const secretKey=String(req.body.secretKey??existing?.secret_key??"");
    const appId=String(req.body.appId??existing?.app_id??""); const appSecret=String(req.body.appSecret??existing?.app_secret??"");
    const extra=typeof req.body.extraConfig==="object"?JSON.stringify(req.body.extraConfig):existing?.extra_config||"{}";
    if(enabled && gateway==="RAZORPAY" && (!keyId||!secretKey)) return res.status(400).json({error:"Razorpay key ID and secret are required when enabled."});
    if(enabled && gateway==="CASHFREE" && (!appId||!appSecret)) return res.status(400).json({error:"Cashfree app ID and secret are required when enabled."});
    await db.execute(`INSERT INTO payment_settings (gateway,enabled,environment,key_id,secret_key,app_id,app_secret,extra_config) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(gateway) DO UPDATE SET enabled=excluded.enabled,environment=excluded.environment,key_id=excluded.key_id,secret_key=excluded.secret_key,app_id=excluded.app_id,app_secret=excluded.app_secret,extra_config=excluded.extra_config,updated_at=CURRENT_TIMESTAMP`,[gateway,enabled,environment,keyId,secretKey,appId,appSecret,extra]);
    await audit("USER",req.staff.id,"UPDATE_PAYMENT_SETTINGS","payment_settings",gateway,{enabled,environment},req);
    res.json({success:true,setting:publicSetting(await db.get("SELECT * FROM payment_settings WHERE gateway=?",[gateway]))});
  }catch(error){console.error("Payment settings update failed:",error.message);res.status(500).json({error:"Unable to update payment settings."});}
});

async function ownedPendingOrder(customerId,orderId,gateway){
  const order=await db.get("SELECT * FROM \"order\" WHERE id=? AND customer_id=?",[orderId,customerId]);
  if(!order){const e=new Error("Order not found.");e.status=404;throw e;}
  if(!["PENDING","UNPAID"].includes(order.payment_status)||order.status!=="PENDING_PAYMENT"){const e=new Error("Order is not awaiting online payment.");e.status=409;throw e;}
  if(!String(order.payment_method).includes(gateway)){const e=new Error("Order payment gateway does not match.");e.status=409;throw e;}
  return order;
}

async function beginTransaction(order,gateway){
  const existing=await db.get("SELECT * FROM payment_transaction WHERE order_id=? AND gateway=? AND status IN ('CREATED','PENDING') ORDER BY id DESC LIMIT 1",[order.id,gateway]);
  if(existing?.gateway_order_id) return existing;
  const result=await db.execute("INSERT INTO payment_transaction (order_id,customer_id,gateway,amount,currency,status) VALUES (?,?,?,?,'INR','CREATED')",[order.id,order.customer_id,gateway,order.grand_total]);
  return db.get("SELECT * FROM payment_transaction WHERE id=?",[result.lastID]);
}

router.post("/razorpay/create-order",requireCustomerAuth,async(req,res)=>{
  try{
    const order=await ownedPendingOrder(req.customer.id,String(req.body?.orderId||""),"RAZORPAY");
    const config=await gatewaySettings("RAZORPAY"); if(!config) return res.status(503).json({error:"Razorpay is not configured."});
    let transaction=await beginTransaction(order,"RAZORPAY");
    if(!transaction.gateway_order_id){
      const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:basic(`${config.key_id}:${config.secret_key}`),"Content-Type":"application/json"},body:JSON.stringify({amount:Math.round(Number(order.grand_total)*100),currency:"INR",receipt:order.id,notes:{order_id:order.id}})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||!body.id){await db.execute("UPDATE payment_transaction SET status='FAILED',failure_reason=?,raw_response=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[`HTTP ${response.status}`,JSON.stringify(body).slice(0,20000),transaction.id]);return res.status(502).json({error:"Razorpay order creation failed."});}
      await db.execute("UPDATE payment_transaction SET gateway_order_id=?,status='PENDING',raw_response=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[body.id,JSON.stringify(body).slice(0,20000),transaction.id]); transaction={...transaction,gateway_order_id:body.id};
    }
    res.json({status:"success",order_id:order.id,razorpay_order_id:transaction.gateway_order_id,amount:Math.round(Number(order.grand_total)*100),currency:"INR",key_id:config.key_id,api_called:true});
  }catch(error){console.error("Razorpay create failed:",error.message);res.status(error.status||500).json({error:error.status?error.message:"Unable to create payment order."});}
});

async function finalizePayment(transaction,paymentId,raw={}){
  let customer;
  await db.transaction(async tx=>{
    const current=await tx.get("SELECT * FROM payment_transaction WHERE id=?",[transaction.id]);
    if(current.status==="PAID") return;
    await tx.execute("UPDATE payment_transaction SET gateway_payment_id=?,status='PAID',raw_response=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",[paymentId,JSON.stringify(raw).slice(0,20000),transaction.id]);
    customer=await tx.get("SELECT * FROM customer WHERE id=?",[transaction.customer_id]);
    if(String(transaction.method||"").startsWith("MEMBERSHIP:")){
      const planId=Number(String(transaction.method).split(":")[1]);
      const plan=await tx.get("SELECT * FROM membership_plan WHERE id=? AND is_active=1",[planId]);
      if(!plan)throw new Error("Membership plan is no longer available");
      if(!await tx.get("SELECT id FROM customer_membership WHERE payment_transaction_id=?",[transaction.id])){
        const membershipNo=`MEM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await tx.execute("UPDATE customer_membership SET status='Expired',updated_at=CURRENT_TIMESTAMP WHERE customer_id=? AND status='Active' AND end_date<date('now')",[transaction.customer_id]);
        await tx.execute("INSERT INTO customer_membership (customer_id,membership_plan_id,membership_no,start_date,end_date,amount_paid,status,payment_transaction_id) VALUES (?,?,?,date('now'),date('now',? || ' days'),?,'Active',?)",[transaction.customer_id,plan.id,membershipNo,String(plan.duration_days),transaction.amount,transaction.id]);
      }
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,title_en,message_en,type) VALUES ('CUSTOMER',?,?,'Membership activated','Your membership payment was verified and membership is active.','MEMBERSHIP_ACTIVATED')",[transaction.customer_id,customer?.phone||""]);
    }else{
      await tx.execute("UPDATE \"order\" SET payment_status='PAID',status='CONFIRMED',status_label='Confirmed',updated_at=CURRENT_TIMESTAMP WHERE id=?",[transaction.order_id]);
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,order_id,title_en,message_en,type) VALUES ('CUSTOMER',?,?,?,'Payment confirmed','Your payment was verified.','PAYMENT_CONFIRMED')",[transaction.customer_id,customer?.phone||"",transaction.order_id]);
    }
  });
  if(customer) sendWhatsAppEvent({purpose:String(transaction.method||"").startsWith("MEMBERSHIP:")?"MEMBERSHIP_ACTIVATED":"PAYMENT_CONFIRMED",to:customer.phone,customerId:customer.id,referenceType:transaction.order_id?"ORDER":"MEMBERSHIP",referenceId:transaction.order_id||transaction.id,variables:[transaction.order_id||transaction.id]}).catch(error=>console.error("Payment WhatsApp event failed:",error.message));
}

async function failPayment(transaction,status,reason,raw={}){
  await db.transaction(async tx=>{
    const order=await tx.get("SELECT * FROM \"order\" WHERE id=?",[transaction.order_id]);
    if(!order){await tx.execute("UPDATE payment_transaction SET status=?,failure_reason=?,raw_response=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[status,String(reason||"").slice(0,2000),JSON.stringify(raw).slice(0,20000),transaction.id]);return;}
    if(["FAILED","CANCELLED"].includes(order.status)) return;
    const items=await tx.query("SELECT product_id,qty FROM order_item WHERE order_id=? AND product_id IS NOT NULL",[order.id]);
    for(const item of items){const inv=await tx.get("SELECT * FROM inventory WHERE product_id=?",[item.product_id]);if(Number(inv.reserved_qty)>=Number(item.qty)){await tx.execute("UPDATE inventory SET reserved_qty=reserved_qty-?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[item.qty,item.product_id]);await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note) VALUES (?,'RELEASE',?,?,?,?,?,'Failed payment release')",[item.product_id,item.qty,inv.stock_qty,inv.stock_qty,'ORDER',order.id]);}}
    await tx.execute("UPDATE payment_transaction SET status=?,failure_reason=?,raw_response=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[status,String(reason||"").slice(0,2000),JSON.stringify(raw).slice(0,20000),transaction.id]);
    await tx.execute("UPDATE \"order\" SET payment_status=?,status='FAILED',status_label='Payment Failed',updated_at=CURRENT_TIMESTAMP WHERE id=?",[status,order.id]);
    if(Number(order.applied_points)>0&&!await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='REDEEM_RESTORE' AND reference_id=?",[order.customer_id,order.id])) await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'REDEEM_RESTORE',?,'Failed payment points restoration')",[order.customer_id,order.applied_points,order.id]);
  });
}

async function refundPayment(transaction,raw={}){
  let customer=null,order=null;
  await db.transaction(async tx=>{
    const current=await tx.get("SELECT * FROM payment_transaction WHERE id=?",[transaction.id]);
    if(!current||current.status==="REFUNDED")return;
    order=current.order_id?await tx.get("SELECT * FROM \"order\" WHERE id=?",[current.order_id]):null;
    customer=current.customer_id?await tx.get("SELECT * FROM customer WHERE id=?",[current.customer_id]):null;
    if(order){
      const items=await tx.query("SELECT product_id,qty FROM order_item WHERE order_id=? AND product_id IS NOT NULL",[order.id]);
      for(const item of items){
        const inv=await tx.get("SELECT * FROM inventory WHERE product_id=?",[item.product_id]);
        if(!inv)continue;
        if(order.status==="DELIVERED"){
          await tx.execute("UPDATE inventory SET stock_qty=stock_qty+?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[item.qty,item.product_id]);
          await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note) VALUES (?,'REFUND_RETURN',?,?,?,?,?,'Gateway-confirmed refund stock return')",[item.product_id,item.qty,inv.stock_qty,Number(inv.stock_qty)+Number(item.qty),'ORDER',order.id]);
        }else if(Number(inv.reserved_qty)>=Number(item.qty)){
          await tx.execute("UPDATE inventory SET reserved_qty=reserved_qty-?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[item.qty,item.product_id]);
          await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note) VALUES (?,'RELEASE',?,?,?,?,?,'Gateway-confirmed refund reservation release')",[item.product_id,item.qty,inv.stock_qty,inv.stock_qty,'ORDER',order.id]);
        }
      }
      if(Number(order.applied_points)>0&&!await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='REDEEM_RESTORE' AND reference_id=?",[order.customer_id,order.id]))await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'REDEEM_RESTORE',?,'Refunded order points restoration')",[order.customer_id,order.applied_points,order.id]);
      const earned=await tx.get("SELECT COALESCE(SUM(points),0) points FROM customer_points WHERE customer_id=? AND type='EARN' AND reference_id=?",[order.customer_id,order.id]);
      if(Number(earned.points)>0&&!await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='REFUND_REVERSAL' AND reference_id=?",[order.customer_id,order.id]))await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'REFUND_REVERSAL',?,'Refunded order earned-points reversal')",[order.customer_id,-Number(earned.points),order.id]);
      await tx.execute("UPDATE \"order\" SET payment_status='REFUNDED',status='REFUNDED',status_label='Refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?",[order.id]);
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,order_id,title_en,message_en,type) VALUES ('CUSTOMER',?,?,?,'Refund confirmed','Your refund was confirmed by the payment provider.','PAYMENT_REFUNDED')",[order.customer_id,order.customer_phone,order.id]);
    }else if(String(current.method||"").startsWith("MEMBERSHIP:")){
      await tx.execute("UPDATE customer_membership SET status='Cancelled',updated_at=CURRENT_TIMESTAMP WHERE payment_transaction_id=? AND status='Active'",[current.id]);
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,title_en,message_en,type) VALUES ('CUSTOMER',?,?,'Membership refund confirmed','Your membership refund was confirmed and the membership was cancelled.','MEMBERSHIP_REFUNDED')",[current.customer_id,customer?.phone||""]);
    }
    await tx.execute("UPDATE payment_transaction SET status='REFUNDED',raw_response=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[JSON.stringify(raw).slice(0,20000),current.id]);
  });
  if(customer)sendWhatsAppEvent({purpose:"PAYMENT_REFUNDED",to:customer.phone,customerId:customer.id,referenceType:order?"ORDER":"MEMBERSHIP",referenceId:order?.id||transaction.id,variables:[order?.id||transaction.id]}).catch(error=>console.error("Refund WhatsApp event failed:",error.message));
}

router.post("/razorpay/verify",requireCustomerAuth,async(req,res)=>{
  try{
    const {razorpay_order_id:gatewayOrderId,razorpay_payment_id:paymentId,razorpay_signature:signature}=req.body||{};
    const transaction=await db.get("SELECT * FROM payment_transaction WHERE gateway='RAZORPAY' AND gateway_order_id=? AND customer_id=?",[gatewayOrderId,req.customer.id]);
    if(!transaction||!paymentId||!signature) return res.status(400).json({error:"Complete payment verification data is required."});
    const config=await gatewaySettings("RAZORPAY"); if(!config) return res.status(503).json({error:"Razorpay is not configured."});
    const expected=crypto.createHmac("sha256",config.secret_key).update(`${gatewayOrderId}|${paymentId}`).digest("hex");
    if(!safeEqual(expected,signature)) return res.status(401).json({error:"Invalid payment signature."});
    const provider=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{Authorization:basic(`${config.key_id}:${config.secret_key}`)}}); const body=await provider.json().catch(()=>({}));
    if(!provider.ok||!["authorized","captured"].includes(body.status)||Number(body.amount)!==Math.round(Number(transaction.amount)*100)) return res.status(409).json({error:"Payment is not confirmed by Razorpay."});
    await finalizePayment(transaction,paymentId,body); res.json({success:true,status:"PAID",orderId:transaction.order_id});
  }catch(error){console.error("Razorpay verify failed:",error.message);res.status(500).json({error:"Unable to verify payment."});}
});

router.post("/razorpay/webhook",async(req,res)=>{
  try{
    const config=await gatewaySettings("RAZORPAY"); if(!config) return res.status(503).end(); const secret=parseExtra(config).webhook_secret; if(!secret)return res.status(503).end();
    const expected=crypto.createHmac("sha256",secret).update(req.rawBody||Buffer.from(JSON.stringify(req.body||{}))).digest("hex"); if(!safeEqual(expected,req.get("x-razorpay-signature")))return res.status(401).end();
    const payment=req.body?.payload?.payment?.entity; const gatewayOrderId=payment?.order_id; const transaction=await db.get("SELECT * FROM payment_transaction WHERE gateway='RAZORPAY' AND gateway_order_id=?",[gatewayOrderId]); if(!transaction)return res.status(200).json({received:true});
    if(req.body.event==="payment.captured"&&Number(payment.amount)===Math.round(Number(transaction.amount)*100)) await finalizePayment(transaction,payment.id,req.body);
    else if(req.body.event==="payment.failed") await failPayment(transaction,"FAILED",payment?.error_description,req.body);
    else if(req.body.event?.includes("refund"))await refundPayment(transaction,req.body);
    res.json({received:true});
  }catch(error){console.error("Razorpay webhook failed:",error.message);res.status(500).end();}
});

function cashfreeBase(config){return String(config.environment).toUpperCase()==="PRODUCTION"?"https://api.cashfree.com":"https://sandbox.cashfree.com";}
function cashfreeHeaders(config){return {"x-client-id":config.app_id,"x-client-secret":config.app_secret,"x-api-version":"2023-08-01","Content-Type":"application/json"};}

router.post("/cashfree/create-order",requireCustomerAuth,async(req,res)=>{
  try{const order=await ownedPendingOrder(req.customer.id,String(req.body?.orderId||""),"CASHFREE");const config=await gatewaySettings("CASHFREE");if(!config)return res.status(503).json({error:"Cashfree is not configured."});let transaction=await beginTransaction(order,"CASHFREE");
    if(!transaction.gateway_order_id){const response=await fetch(`${cashfreeBase(config)}/pg/orders`,{method:"POST",headers:cashfreeHeaders(config),body:JSON.stringify({order_id:order.id,order_amount:Number(order.grand_total),order_currency:"INR",customer_details:{customer_id:String(order.customer_id),customer_phone:order.customer_phone,customer_email:order.customer_email||undefined},order_meta:{notify_url:`${req.protocol}://${req.get('host')}/api/cashfree/webhook`}})});const body=await response.json().catch(()=>({}));if(!response.ok||!body.order_id){await db.execute("UPDATE payment_transaction SET status='FAILED',failure_reason=?,raw_response=? WHERE id=?",[`HTTP ${response.status}`,JSON.stringify(body).slice(0,20000),transaction.id]);return res.status(502).json({error:"Cashfree order creation failed."});}await db.execute("UPDATE payment_transaction SET gateway_order_id=?,status='PENDING',raw_response=? WHERE id=?",[body.order_id,JSON.stringify(body).slice(0,20000),transaction.id]);transaction={...transaction,gateway_order_id:body.order_id};return res.json({status:"success",order_id:body.order_id,payment_session_id:body.payment_session_id,amount:Number(order.grand_total),currency:"INR"});}
    const prior=JSON.parse(transaction.raw_response||"{}");
    if(!prior.payment_session_id)return res.status(409).json({error:"Cashfree payment session is unavailable; cancel this order and retry."});
    res.json({status:"success",order_id:transaction.gateway_order_id,payment_session_id:prior.payment_session_id,amount:Number(order.grand_total),currency:"INR"});
  }catch(error){console.error("Cashfree create failed:",error.message);res.status(error.status||500).json({error:error.status?error.message:"Unable to create payment order."});}
});

router.post("/cashfree/verify-payment",requireCustomerAuth,async(req,res)=>{
  try{const transaction=await db.get("SELECT * FROM payment_transaction WHERE gateway='CASHFREE' AND gateway_order_id=? AND customer_id=?",[req.body?.orderId,req.customer.id]);if(!transaction)return res.status(404).json({error:"Payment transaction not found."});const config=await gatewaySettings("CASHFREE");if(!config)return res.status(503).json({error:"Cashfree is not configured."});const response=await fetch(`${cashfreeBase(config)}/pg/orders/${encodeURIComponent(transaction.gateway_order_id)}/payments`,{headers:cashfreeHeaders(config)});const body=await response.json().catch(()=>[]);const paid=Array.isArray(body)&&body.find(item=>item.payment_status==="SUCCESS"&&Number(item.payment_amount)===Number(transaction.amount));if(!response.ok||!paid)return res.status(409).json({error:"Payment is not confirmed by Cashfree."});await finalizePayment(transaction,paid.cf_payment_id,body);res.json({success:true,status:"PAID",orderId:transaction.order_id});
  }catch(error){console.error("Cashfree verify failed:",error.message);res.status(500).json({error:"Unable to verify payment."});}
});

router.post("/cashfree/webhook",async(req,res)=>{
  try{const config=await gatewaySettings("CASHFREE");if(!config)return res.status(503).end();const timestamp=req.get("x-webhook-timestamp")||"";const signature=req.get("x-webhook-signature")||"";const raw=req.rawBody||Buffer.from(JSON.stringify(req.body||{}));const expected=crypto.createHmac("sha256",config.app_secret).update(timestamp).update(raw).digest("base64");if(!timestamp||!safeEqual(expected,signature))return res.status(401).end();
    const data=req.body?.data;const gatewayOrderId=data?.order?.order_id;const transaction=await db.get("SELECT * FROM payment_transaction WHERE gateway='CASHFREE' AND gateway_order_id=?",[gatewayOrderId]);if(!transaction)return res.json({received:true});const payment=data?.payment;if(payment?.payment_status==="SUCCESS"&&Number(data.order.order_amount)===Number(transaction.amount))await finalizePayment(transaction,payment.cf_payment_id,req.body);else if(["FAILED","USER_DROPPED","CANCELLED"].includes(payment?.payment_status))await failPayment(transaction,payment.payment_status,payment.payment_message,req.body);else if(String(req.body?.type||"").toUpperCase().includes("REFUND")||payment?.payment_status==="REFUNDED")await refundPayment(transaction,req.body);res.json({received:true});
  }catch(error){console.error("Cashfree webhook failed:",error.message);res.status(500).end();}
});

router.post("/payment/orders/:id/cancel",requireCustomerAuth,async(req,res)=>{try{const order=await ownedPendingOrder(req.customer.id,req.params.id,String((await db.get("SELECT payment_method FROM \"order\" WHERE id=?",[req.params.id]))?.payment_method||"").includes("CASHFREE")?"CASHFREE":"RAZORPAY");const transaction=await db.get("SELECT * FROM payment_transaction WHERE order_id=? ORDER BY id DESC LIMIT 1",[order.id])||{id:null,order_id:order.id,customer_id:order.customer_id};if(transaction.id)await failPayment(transaction,"CANCELLED","Cancelled by customer");res.json({success:true});}catch(error){res.status(error.status||500).json({error:error.status?error.message:"Unable to cancel payment."});}});

router.post("/membership/purchase-intent",requireCustomerAuth,async(req,res)=>{
  const gateway=String(req.body?.gateway||"").toUpperCase();
  if(!["RAZORPAY","CASHFREE"].includes(gateway))return res.status(400).json({error:"Supported payment gateway is required."});
  try{const plan=await db.get("SELECT * FROM membership_plan WHERE id=? AND is_active=1",[req.body?.planId]);if(!plan)return res.status(404).json({error:"Membership plan not found."});const config=await gatewaySettings(gateway);if(!config)return res.status(503).json({error:`${gateway} is not configured.`});const created=await db.execute("INSERT INTO payment_transaction (customer_id,gateway,amount,currency,status,method) VALUES (?,?,?,'INR','CREATED',?)",[req.customer.id,gateway,plan.price,`MEMBERSHIP:${plan.id}`]);
    if(gateway==="RAZORPAY"){const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:basic(`${config.key_id}:${config.secret_key}`),"Content-Type":"application/json"},body:JSON.stringify({amount:Math.round(Number(plan.price)*100),currency:"INR",receipt:`MEMBERSHIP-${created.lastID}`})});const body=await response.json().catch(()=>({}));if(!response.ok||!body.id){await db.execute("UPDATE payment_transaction SET status='FAILED',failure_reason=? WHERE id=?",[`HTTP ${response.status}`,created.lastID]);return res.status(502).json({error:"Razorpay membership payment creation failed."});}await db.execute("UPDATE payment_transaction SET gateway_order_id=?,status='PENDING',raw_response=? WHERE id=?",[body.id,JSON.stringify(body).slice(0,20000),created.lastID]);return res.json({status:"success",transactionId:created.lastID,razorpay_order_id:body.id,key_id:config.key_id,amount:Math.round(Number(plan.price)*100),currency:"INR"});}
    const orderId=`MEMBERSHIP-${created.lastID}`;const response=await fetch(`${cashfreeBase(config)}/pg/orders`,{method:"POST",headers:cashfreeHeaders(config),body:JSON.stringify({order_id:orderId,order_amount:Number(plan.price),order_currency:"INR",customer_details:{customer_id:String(req.customer.id),customer_phone:req.customer.phone,customer_email:req.customer.email||undefined}})});const body=await response.json().catch(()=>({}));if(!response.ok||!body.order_id){await db.execute("UPDATE payment_transaction SET status='FAILED',failure_reason=? WHERE id=?",[`HTTP ${response.status}`,created.lastID]);return res.status(502).json({error:"Cashfree membership payment creation failed."});}await db.execute("UPDATE payment_transaction SET gateway_order_id=?,status='PENDING',raw_response=? WHERE id=?",[body.order_id,JSON.stringify(body).slice(0,20000),created.lastID]);res.json({status:"success",transactionId:created.lastID,order_id:body.order_id,payment_session_id:body.payment_session_id,amount:Number(plan.price),currency:"INR"});
  }catch(error){console.error("Membership purchase intent failed:",error.message);res.status(500).json({error:"Unable to create membership payment."});}
});

export default router;
