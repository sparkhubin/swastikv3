import dotenv from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { execFileSync } from "child_process";
import path from "path";

dotenv.config();

const DB_PATH = path.join(process.cwd(), "swastik_local_final.db");

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  console.error("❌ Missing Cloudflare R2 environment variables.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// --------------------------------------------------
// R2: GET ALL IMAGE FILES
// --------------------------------------------------

async function getR2Images() {
  const files = [];
  let continuationToken;

  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of result.Contents || []) {
      if (
        object.Key &&
        /\.(webp|jpg|jpeg|png)$/i.test(object.Key)
      ) {
        files.push(object.Key);
      }
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return [...new Set(files)].sort();
}

// --------------------------------------------------
// DATABASE: GET ALL PRODUCTS
// --------------------------------------------------

function getProducts() {
  const output = execFileSync(
    "sqlite3",
    [
      "-noheader",
      "-separator",
      "\t",
      DB_PATH,
      `
        SELECT id, TRIM(code)
        FROM product
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
        ORDER BY id;
      `,
    ],
    {
      encoding: "utf8",
    }
  );

  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [id, code] = line.split("\t");

      return {
        id: Number(id),
        code: String(code || "").trim(),
      };
    })
    .filter(
      (product) =>
        Number.isInteger(product.id) &&
        product.code
    );
}

// --------------------------------------------------
// FIX KNOWN BAD R2 FILENAME
// --------------------------------------------------

async function fixKnownFilename(r2Set) {
  const oldName = "SW-SW0609 .webp";
  const newName = "SW-SW0609.webp";

  if (!r2Set.has(oldName)) {
    return;
  }

  if (r2Set.has(newName)) {
    console.log(
      `⚠️ Both "${oldName}" and "${newName}" already exist.`
    );
    return;
  }

  console.log("");
  console.log("✏️ Fixing R2 filename:");
  console.log(`   OLD: ${oldName}`);
  console.log(`   NEW: ${newName}`);

  await s3.send(
    new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource:
        `${BUCKET_NAME}/${encodeURIComponent(oldName)}`,
      Key: newName,
    })
  );

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: oldName,
    })
  );

  console.log("✓ Filename fixed.");
}

// --------------------------------------------------
// DELETE R2 ORPHAN IMAGES
// --------------------------------------------------

async function deleteOrphanImages(files) {
  if (files.length === 0) {
    console.log("✓ No orphan images found.");
    return;
  }

  console.log("");
  console.log(
    `🗑️ Deleting ${files.length} R2 orphan images...`
  );
  console.log("");

  for (const file of files) {
    console.log(`DELETE: ${file}`);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file,
      })
    );
  }

  console.log("");
  console.log("✓ R2 orphan cleanup completed.");
}

// --------------------------------------------------
// UPDATE DATABASE
// --------------------------------------------------

function updateDatabase(products, r2Set) {
  const matchedIds = [];
  const missingIds = [];

  for (const product of products) {
    const expectedFile =
      `${product.code}.webp`;

    if (r2Set.has(expectedFile)) {
      matchedIds.push(product.id);
    } else {
      missingIds.push(product.id);
    }
  }

  const matchedList =
    matchedIds.length > 0
      ? matchedIds.join(",")
      : "NULL";

  const missingList =
    missingIds.length > 0
      ? missingIds.join(",")
      : "NULL";

  const sql = `
PRAGMA busy_timeout=10000;

BEGIN IMMEDIATE;

UPDATE product
SET
    image_url = code || '.webp',
    is_image = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (${matchedList});

UPDATE product
SET
    image_url = '',
    is_image = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (${missingList});

COMMIT;
`;

  execFileSync(
    "sqlite3",
    [DB_PATH, sql],
    {
      stdio: "inherit",
    }
  );

  return {
    matched: matchedIds.length,
    missing: missingIds.length,
  };
}

// --------------------------------------------------
// VERIFY DATABASE
// --------------------------------------------------

function verifyDatabase() {
  const output = execFileSync(
    "sqlite3",
    [
      "-separator",
      "|",
      DB_PATH,
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN is_image = 1 THEN 1 ELSE 0 END) AS with_image,
          SUM(CASE WHEN is_image != 1 THEN 1 ELSE 0 END) AS without_image
        FROM product;
      `,
    ],
    {
      encoding: "utf8",
    }
  ).trim();

  const [total, withImage, withoutImage] =
    output.split("|");

  console.log("");
  console.log("DATABASE VERIFICATION");
  console.log("--------------------------------");
  console.log(`Total products : ${total}`);
  console.log(`With image     : ${withImage}`);
  console.log(`Without image  : ${withoutImage}`);
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  console.log("");
  console.log("================================================");
  console.log("       FINAL DB ↔ CLOUDFLARE R2 SYNC");
  console.log("================================================");
  console.log("");

  // -----------------------------------------------
  // READ DATABASE
  // -----------------------------------------------

  console.log("📦 Reading database...");
  const products = getProducts();

  console.log(
    `✓ Database products: ${products.length}`
  );

  // -----------------------------------------------
  // READ R2
  // -----------------------------------------------

  console.log("");
  console.log("☁️ Reading Cloudflare R2...");
  let r2Images = await getR2Images();

  console.log(
    `✓ R2 image objects: ${r2Images.length}`
  );

  let r2Set = new Set(r2Images);

  // -----------------------------------------------
  // FIX KNOWN BAD FILENAME
  // -----------------------------------------------

  await fixKnownFilename(r2Set);

  // Refresh R2 after rename
  r2Images = await getR2Images();
  r2Set = new Set(r2Images);

  // -----------------------------------------------
  // BUILD EXPECTED FILE LIST FROM DATABASE
  // -----------------------------------------------

  const expectedFiles = new Set(
    products.map(
      (product) =>
        `${product.code}.webp`
    )
  );

  // -----------------------------------------------
  // FIND VALID / ORPHAN / MISSING
  // -----------------------------------------------

  const validR2Images = r2Images.filter(
    (file) =>
      expectedFiles.has(file)
  );

  const orphanR2Images = r2Images.filter(
    (file) =>
      !expectedFiles.has(file)
  );

  const productsWithImage = products.filter(
    (product) =>
      r2Set.has(`${product.code}.webp`)
  );

  const productsWithoutImage = products.filter(
    (product) =>
      !r2Set.has(`${product.code}.webp`)
  );

  // -----------------------------------------------
  // SHOW PLAN
  // -----------------------------------------------

  console.log("");
  console.log("================================================");
  console.log("                  SYNC PLAN");
  console.log("================================================");

  console.log(
    `DB products             : ${products.length}`
  );

  console.log(
    `R2 images               : ${r2Images.length}`
  );

  console.log(
    `Valid DB ↔ R2 images    : ${validR2Images.length}`
  );

  console.log(
    `DB products no image    : ${productsWithoutImage.length}`
  );

  console.log(
    `R2 orphan images        : ${orphanR2Images.length}`
  );

  console.log("================================================");

  // -----------------------------------------------
  // DELETE ORPHAN R2 IMAGES
  // -----------------------------------------------

  await deleteOrphanImages(
    orphanR2Images
  );

  // -----------------------------------------------
  // UPDATE DATABASE
  // -----------------------------------------------

  console.log("");
  console.log("🗄️ Updating database...");

  const result =
    updateDatabase(
      products,
      r2Set
    );

  // -----------------------------------------------
  // VERIFY
  // -----------------------------------------------

  console.log("");
  console.log("================================================");
  console.log("                 COMPLETE");
  console.log("================================================");

  console.log(
    `Products with image : ${result.matched}`
  );

  console.log(
    `Products without    : ${result.missing}`
  );

  console.log(
    `R2 images deleted   : ${orphanR2Images.length}`
  );

  console.log("================================================");

  verifyDatabase();

  console.log("");
  console.log("✅ FINAL SYNC FINISHED.");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ SYNC FAILED");
  console.error(error);
  process.exit(1);
});