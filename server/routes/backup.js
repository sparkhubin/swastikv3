import express from "express";
import { db } from "../../database/db.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router=express.Router();
router.use("/database",requireStaffAuth,requirePermission("settings"));
router.get("/database/status",async(_req,res)=>{try{const products=await db.get("SELECT COUNT(*) count FROM product"),inventory=await db.get("SELECT COUNT(*) count FROM inventory"),orders=await db.get("SELECT COUNT(*) count FROM \"order\""),integrity=await db.get("PRAGMA quick_check");res.json({success:true,activeEngine:db.engine,integrity:integrity.quick_check,stats:{products:Number(products.count),inventory:Number(inventory.count),orders:Number(orders.count)}});}catch(error){console.error("Database status failed:",error.message);res.status(500).json({error:"Unable to inspect database."});}});
router.get("/database/backup",(_req,res)=>res.status(501).json({error:"Online JSON backups are disabled because they expose credentials and authentication records. Use an encrypted filesystem/database backup managed outside the application."}));
router.post("/database/restore",(_req,res)=>res.status(405).json({error:"Online restore is disabled to prevent destructive, schema-incompatible writes."}));
router.post("/database/sync",(_req,res)=>res.status(410).json({error:"The obsolete dual-database synchronization endpoint has been removed."}));
export default router;
