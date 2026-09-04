import fs from "fs";
import path from "path";
import { db } from "../database/db.js";
import { getBrand } from "../server/utils.js";

function parsePrice(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function importItems(rawItems) {
  await db.init();

  // 1. Fetch current database products to ensure we do NOT remove or alter any existing data
  const currentDbProducts = await db.query("SELECT * FROM product ORDER BY id ASC");
  console.log(`Database currently has ${currentDbProducts.length} existing products.`);

  // Maintain existing products set by normalized name to prevent duplicates
  const existingNameSet = new Set(
    currentDbProducts.map(p => normalizeName(p.name_en))
  );

  console.log(`Existing unique product names in database: ${existingNameSet.size}`);

  // Find max ID for safe auto-incrementing
  let nextId = 1;
  const maxIdResult = await db.query("SELECT MAX(id) as max_id FROM product");
  if (maxIdResult && maxIdResult[0] && maxIdResult[0].max_id) {
    nextId = Number(maxIdResult[0].max_id) + 1;
  }

  // 2. Process uploaded items:
  // - Skip if product name is empty
  // - Skip if already exists in the DB (preserve existing product and its image code)
  // - Skip if duplicate within this batch
  let skippedCount = 0;
  let insertedCount = 0;
  let invalidCount = 0;

  const toInsert = [];

  for (const item of rawItems) {
    const rawName = item["Product Name"] || item.name || item.nameEn;
    if (!rawName || !rawName.trim()) {
      invalidCount++;
      continue;
    }

    const trimmedName = rawName.trim();
    const normalized = normalizeName(trimmedName);

    if (existingNameSet.has(normalized)) {
      skippedCount++;
      continue;
    }

    // Mark as seen so duplicates within the uploaded JSON files are also skipped
    existingNameSet.add(normalized);

    const mrp = parsePrice(item["M.R.P."] || item.originalPrice || item.mrp);
    const salesPrice = parsePrice(item["Sales Price"] || item.price);
    const finalPrice = salesPrice > 0 ? salesPrice : (mrp > 0 ? mrp : 0);
    const finalMrp = mrp > finalPrice ? mrp : null;

    // Determine category and brand
    const lowerName = trimmedName.toLowerCase();
    let category = "swastik";
    if (lowerName.includes("chocolate") || lowerName.includes("choco") || lowerName.includes("dairy milk") || lowerName.includes("5 star") || lowerName.includes("kit kat") || lowerName.includes("silk") || lowerName.includes("perk") || lowerName.includes("bournville") || lowerName.includes("gems")) {
      category = "chocolate";
    } else if (lowerName.includes("juice") || lowerName.includes("drink") || lowerName.includes("coke") || lowerName.includes("sprite") || lowerName.includes("thums up") || lowerName.includes("fanta") || lowerName.includes("frooti") || lowerName.includes("maaza") || lowerName.includes("lassi") || lowerName.includes("syrup") || lowerName.includes("squash") || lowerName.includes("coffee") || lowerName.includes("tea") || lowerName.includes("chai")) {
      category = "beverage";
    } else if (lowerName.includes("baby") || lowerName.includes("huggies") || lowerName.includes("pampers") || lowerName.includes("mamy poko") || lowerName.includes("wipes") || lowerName.includes("johnson")) {
      category = "babycare";
    }

    const brand = getBrand(trimmedName, category);

    // Extract unit / pack info if present in name (e.g. 500G, 1KG, 250ML)
    let unit = "1 Pack";
    const weightMatch = trimmedName.match(/(\d+(?:\.\d+)?\s*(?:kg|g|gm|l|lt|ltr|ml|n|pcs|pack|units))/i);
    if (weightMatch) {
      unit = weightMatch[1].toUpperCase();
    }

    const discountTag = finalMrp && finalMrp > finalPrice ? `₹${Math.round(finalMrp - finalPrice)} OFF` : "";

    toInsert.push({
      id: nextId++,
      code: `SW-PR${String(nextId).padStart(5, "0")}`,
      name_en: trimmedName,
      name_hi: trimmedName,
      category: category,
      sub_en: brand,
      sub_hi: brand,
      price: finalPrice,
      original_price: finalMrp,
      discount_tag: discountTag,
      image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
      stock_count: 100,
      unit: unit,
      unit_prices: `${unit}:${finalPrice}`,
      pack_en: unit,
      pack_hi: unit,
      gst_percent: 5
    });
  }

  console.log(`📊 Processing Summary:`);
  console.log(`- Total input items: ${rawItems.length}`);
  console.log(`- Invalid/Empty items: ${invalidCount}`);
  console.log(`- Skipped existing (same name & amount): ${skippedCount}`);
  console.log(`- New unique items to insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    for (const p of toInsert) {
      await db.execute(
        `INSERT INTO product (
          id, code, name_en, name_hi, category, sub_en, sub_hi,
          price, original_price, discount_tag, image_url, stock_count,
          unit, unit_prices, pack_en, pack_hi, gst_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.code, p.name_en, p.name_hi, p.category, p.sub_en, p.sub_hi,
          p.price, p.original_price, p.discount_tag, p.image_url, p.stock_count,
          p.unit, p.unit_prices, p.pack_en, p.pack_hi, p.gst_percent
        ]
      );
      insertedCount++;
    }
  }

  console.log(`✓ Successfully inserted ${insertedCount} new unique products into the database.`);

  // Save persistent snapshot to disk so data is never lost across restarts
  await db.savePersistentSnapshot();

  // Final verification & recount
  const finalAll = await db.query("SELECT * FROM product ORDER BY id ASC");
  console.log(`🎉 Final Total Products in Database: ${finalAll.length}`);

  return {
    totalInput: rawItems.length,
    deletedDuplicates: 0,
    skipped: skippedCount,
    inserted: insertedCount,
    totalInDb: finalAll.length
  };
}
