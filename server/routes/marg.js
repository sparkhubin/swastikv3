import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import { audit, normalizeMobile, requirePermission, requireStaffAuth } from "../auth.js";
import { sendWhatsAppEvent } from "../services/whatsapp.js";

const router=express.Router();
function equal(a,b){const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
router.get("/marg/settings",requireStaffAuth,requirePermission("settings"),async(_req,res)=>{const row=await db.get("SELECT * FROM marg_settings WHERE id=1");res.json(row?{configured:Boolean(row.api_token),pointsRatio:Number(row.points_ratio),autoNotifyWhatsApp:Boolean(row.auto_notify_whatsapp)}:{configured:false,pointsRatio:null,autoNotifyWhatsApp:false});});
router.post("/marg/settings",requireStaffAuth,requirePermission("settings"),async(req,res)=>{const current=await db.get("SELECT * FROM marg_settings WHERE id=1");const token=String(req.body?.apiToken??current?.api_token??"");const ratio=Number(req.body?.pointsRatio??current?.points_ratio);if(!token||!Number.isFinite(ratio)||ratio<=0)return res.status(400).json({error:"A secure API token and positive points ratio are required."});const settings={configured:true,pointsRatio:ratio,autoNotifyWhatsApp:Boolean(req.body?.autoNotifyWhatsApp)};await db.execute(`INSERT INTO marg_settings (id,api_token,points_ratio,auto_notify_whatsapp) VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET api_token=excluded.api_token,points_ratio=excluded.points_ratio,auto_notify_whatsapp=excluded.auto_notify_whatsapp,updated_at=CURRENT_TIMESTAMP`,[token,ratio,Number(settings.autoNotifyWhatsApp)]);await audit("USER",req.staff.id,"UPDATE_MARG_SETTINGS","marg_settings",1,settings,req);res.json({success:true,settings});});
router.get("/marg/logs",requireStaffAuth,requirePermission("settings"),async(_req,res)=>res.json(await db.query("SELECT id,timestamp,type,message,payload FROM marg_log ORDER BY id DESC LIMIT 100")));
router.post("/marg/logs/clear",requireStaffAuth,requirePermission("settings"),async(req,res)=>{await db.execute("DELETE FROM marg_log");await audit("USER",req.staff.id,"CLEAR_MARG_LOGS","marg_log","",{},req);res.json({success:true});});
router.post("/marg/bill",async(req,res)=>{
  try{
    const settings=await db.get("SELECT * FROM marg_settings WHERE id=1");
    if(!settings?.api_token||!equal(req.get("x-marg-token"),settings.api_token))return res.status(401).json({error:"Invalid MARG authentication."});
    const phone=normalizeMobile(req.body?.customerMobile||req.body?.mobile||req.body?.phone);
    const bill=String(req.body?.billNumber||req.body?.billNo||req.body?.invoiceNo||"").trim();
    const amount=Number(req.body?.billAmount);
    if(phone.length!==10||!bill||!Number.isFinite(amount)||amount<0)return res.status(400).json({error:"Customer phone, bill number, and a non-negative bill amount are required."});
    const customer=await db.get("SELECT id,phone FROM customer WHERE phone LIKE ? LIMIT 1",[`%${phone}`]);
    const referenceId=`MARG:${bill}`.slice(0,100);
    const pointsEarned=customer?Math.floor(amount/Number(settings.points_ratio)):0;
    const payload={billNumber:bill,billAmount:amount,pdfUrl:String(req.body?.pdfUrl||"").slice(0,2000),customerMatched:Boolean(customer),pointsEarned};
    await db.transaction(async tx=>{
      const replay=customer&&await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='MARG_EARN' AND reference_id=?",[customer.id,referenceId]);
      if(replay){const error=new Error("This MARG bill was already processed.");error.status=409;throw error;}
      if(customer&&pointsEarned>0)await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'MARG_EARN',?,'Points earned from verified MARG bill')",[customer.id,pointsEarned,referenceId]);
      await tx.execute("INSERT INTO marg_log (type,message,payload) VALUES ('SUCCESS','MARG bill received',?)",[JSON.stringify(payload)]);
    });
    let whatsapp={success:false,skipped:true};
    if(settings.auto_notify_whatsapp&&customer)whatsapp=await sendWhatsAppEvent({purpose:"MARG_BILL",to:customer.phone,customerId:customer.id,referenceType:"MARG_BILL",referenceId:bill,variables:[bill,payload.pdfUrl]});
    res.json({success:true,billNumber:bill,customerMatched:Boolean(customer),pointsEarned,whatsapp});
  }catch(error){console.error("MARG bill processing failed:",error.message);res.status(error.status||500).json({error:error.status?error.message:"Unable to process MARG bill."});}
});
export default router;
