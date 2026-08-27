import { db } from "../database/db.js";
import fs from "fs";
import path from "path";
import { getBrand } from "../server/utils.js";

// Helper to sanitize price
function parsePrice(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Normalize name for matching
function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function runDeduplicateAndDeleteExisting() {
  console.log("🔍 Scanning for duplicate products in database...");
  await db.init();

  const allRows = await db.query("SELECT * FROM product ORDER BY id ASC");
  console.log(`Current total products in database: ${allRows.length}`);

  // Deduplicate existing records: keep first occurrence of (normalized name + price)
  const seen = new Map();
  const toDeleteIds = [];

  for (const row of allRows) {
    const key = `${normalizeName(row.name_en)}__${Number(row.price).toFixed(2)}`;
    if (seen.has(key)) {
      toDeleteIds.push(row.id);
    } else {
      seen.set(key, row.id);
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`🗑️ Deleting ${toDeleteIds.length} duplicate existing database rows: IDs [${toDeleteIds.slice(0, 10).join(", ")}...]`);
    for (const delId of toDeleteIds) {
      await db.execute("DELETE FROM product WHERE id = ?", [delId]);
    }
    console.log(`✓ Deleted ${toDeleteIds.length} duplicate entries from database.`);
  } else {
    console.log("✓ No duplicate rows found in existing database records.");
  }
}
