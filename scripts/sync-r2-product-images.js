import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { execFileSync } from "child_process";

dotenv.config();

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, "swastik_local_final.db");
const EXPORT_PATH = path.join(ROOT, "scripts", "r2-image-names.txt");

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  throw new Error("Missing Cloudflare R2 environment variables.");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// ------------------------------------------------------------
// 1. Fetch ALL R2 object names
// ------------------------------------------------------------

async function fetchAllR2Objects() {
  const names = new Set();
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response = await s3.send(command);

    for (const object of response.Contents || []) {
      if (object.Key) {
        names.add(object.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return names;
}

// ------------------------------------------------------------
// 2. Read ONLY products where is_image != 1
// ------------------------------------------------------------

function readProducts() {
  const output = execFileSync(
    "sqlite3",
    [
      "-separator",
      "\t",
      DB_PATH,
      `
        SELECT id, code, is_image
        FROM product
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND is_image != 1;
      `,
    ],
    {
      encoding: "utf8",
    }
  );

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, code, isImage] = line.split("\t");

      return {
        id: Number(id),
        code: String(code || "").trim(),
        isImage: Number(isImage || 0),
      };
    });
}

// ------------------------------------------------------------
// 3. Update SQLite
// ------------------------------------------------------------

function updateProduct(id, code) {
  const safeCode = String(code || "").trim().replace(/'/g, "''");
  const imageUrl = `${safeCode}.webp`;

  execFileSync(
    "sqlite3",
    [
      DB_PATH,
      `
        UPDATE product
        SET
          image_url = '${imageUrl}',
          is_image = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(id)};
      `,
    ],
    {
      stdio: "ignore",
    }
  );
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

async function main() {
  console.log("");
  console.log("==============================================");
  console.log(" R2 → PRODUCT IMAGE SYNC");
  console.log("==============================================");
  console.log("");

  // ----------------------------------------------------------
  // Fetch R2 objects
  // ----------------------------------------------------------

  console.log("☁️ Fetching R2 object list...");

  const r2Objects = await fetchAllR2Objects();

  console.log(`✓ R2 objects found: ${r2Objects.size}`);

  // ----------------------------------------------------------
  // Export all R2 object names
  // ----------------------------------------------------------

  const imageNames = [...r2Objects].sort();

  fs.writeFileSync(
    EXPORT_PATH,
    imageNames.join("\n") + "\n",
    "utf8"
  );

  console.log(`✓ Exported names to: ${EXPORT_PATH}`);

  // ----------------------------------------------------------
  // Read products
  // ----------------------------------------------------------

  console.log("");
  console.log("📦 Reading products from database...");
  console.log("   Condition: is_image != 1");

  const products = readProducts();

  console.log(`✓ Products checked: ${products.length}`);

  // ----------------------------------------------------------
  // Compare R2 with products
  // ----------------------------------------------------------

  let matched = 0;
  let updated = 0;
  let notFound = 0;

  const matches = [];
  const missing = [];

  for (const product of products) {
    const code = product.code;

    // Exact required R2 filename
    const expectedName = `${code}.webp`;

    if (r2Objects.has(expectedName)) {
      matched++;

      matches.push(expectedName);

      // Update both image_url and is_image
      updateProduct(product.id, code);

      updated++;
    } else {
      notFound++;

      missing.push(expectedName);
    }
  }

  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  console.log("");
  console.log("==============================================");
  console.log(" RESULT");
  console.log("==============================================");
  console.log(`Products checked : ${products.length}`);
  console.log(`R2 matches       : ${matched}`);
  console.log(`Updated          : ${updated}`);
  console.log(`Not found        : ${notFound}`);
  console.log("==============================================");

  // ----------------------------------------------------------
  // Save matched list
  // ----------------------------------------------------------

  fs.writeFileSync(
    path.join(ROOT, "scripts", "r2-matched-images.txt"),
    matches.join("\n") + "\n",
    "utf8"
  );

  // ----------------------------------------------------------
  // Save missing list
  // ----------------------------------------------------------

  fs.writeFileSync(
    path.join(ROOT, "scripts", "r2-missing-images.txt"),
    missing.join("\n") + "\n",
    "utf8"
  );

  // ----------------------------------------------------------
  // Complete
  // ----------------------------------------------------------

  console.log("");
  console.log("✓ Matched list:");
  console.log("  scripts/r2-matched-images.txt");

  console.log("✓ Missing list:");
  console.log("  scripts/r2-missing-images.txt");

  console.log("");
  console.log("✓ Database update completed.");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ SYNC FAILED");
  console.error(error);
  process.exit(1);
});
