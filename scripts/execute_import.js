import { importItems } from "./product_importer.js";
import fs from "fs";
import path from "path";

async function run() {
  const parts = [
    path.join(process.cwd(), "server", "data", "uploaded_products_part1.json"),
    path.join(process.cwd(), "server", "data", "uploaded_products_part2.json"),
    path.join(process.cwd(), "server", "data", "uploaded_products_part3.json"),
    path.join(process.cwd(), "server", "data", "uploaded_products_part4.json")
  ];

  let allItems = [];
  for (let i = 0; i < parts.length; i++) {
    if (fs.existsSync(parts[i])) {
      const data = JSON.parse(fs.readFileSync(parts[i], "utf-8"));
      console.log(`Loaded part ${i + 1}: ${data.length} items`);
      allItems = allItems.concat(data);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total items collected from JSON files: ${allItems.length}`);
  console.log(`========================================\n`);

  const result = await importItems(allItems);

  console.log(`\n========================================`);
  console.log(`IMPORT & CLEANUP COMPLETED:`);
  console.log(`- Total JSON Input: ${result.totalInput}`);
  console.log(`- Existing Duplicates Deleted: ${result.deletedDuplicates}`);
  console.log(`- Skipped Existing: ${result.skipped}`);
  console.log(`- New Products Inserted: ${result.inserted}`);
  console.log(`- Total Products in Database Now: ${result.totalInDb}`);
  console.log(`========================================\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error executing import:", err);
  process.exit(1);
});
