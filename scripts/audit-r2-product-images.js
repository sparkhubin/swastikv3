import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { execFileSync } from "child_process";

dotenv.config();

const ROOT = process.cwd();

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(ROOT, "swastik_local_final.db");

const REPORT_DIR = path.join(
  ROOT,
  "scripts",
  "r2-audit"
);

const ACCOUNT_ID =
  process.env.CLOUDFLARE_R2_ACCOUNT_ID;

const ACCESS_KEY_ID =
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

const SECRET_ACCESS_KEY =
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

const BUCKET_NAME =
  process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (
  !ACCOUNT_ID ||
  !ACCESS_KEY_ID ||
  !SECRET_ACCESS_KEY ||
  !BUCKET_NAME
) {
  throw new Error(
    "Missing Cloudflare R2 environment variables."
  );
}

if (!fs.existsSync(DB_PATH)) {
  throw new Error(`Database not found: ${DB_PATH}`);
}

fs.mkdirSync(REPORT_DIR, {
  recursive: true,
});

const s3 = new S3Client({
  region: "auto",
  endpoint:
    `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function writeFile(name, content) {
  const filePath = path.join(REPORT_DIR, name);

  fs.writeFileSync(
    filePath,
    content,
    "utf8"
  );

  return filePath;
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getFileName(key) {
  return path.posix.basename(key);
}

function removeExtension(name) {
  return name.replace(
    /\.(webp|jpg|jpeg|png)$/i,
    ""
  );
}

function isImageFile(name) {
  return /\.(webp|jpg|jpeg|png)$/i.test(name);
}

// ------------------------------------------------------------
// 1. Fetch ALL R2 objects
// ------------------------------------------------------------

async function fetchAllR2Objects() {
  const objects = [];

  let continuationToken;

  do {
    const command =
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken:
          continuationToken,
        MaxKeys: 1000,
      });

    const response =
      await s3.send(command);

    for (
      const object of response.Contents || []
    ) {
      if (object.Key) {
        objects.push({
          key: object.Key,
          size: object.Size || 0,
          lastModified:
            object.LastModified || null,
        });
      }
    }

    continuationToken =
      response.IsTruncated
        ? response.NextContinuationToken
        : undefined;

  } while (continuationToken);

  return objects;
}

// ------------------------------------------------------------
// 2. Read ALL products
// ------------------------------------------------------------

function readProducts() {
  const sql = `
    SELECT
      id,
      code,
      image_url,
      is_image
    FROM product
    WHERE code IS NOT NULL
      AND TRIM(code) <> '';
  `;

  const output =
    execFileSync(
      "sqlite3",
      [
        "-separator",
        "\t",
        DB_PATH,
        sql,
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
      const parts =
        line.split("\t");

      return {
        id: Number(parts[0]),
        code: String(parts[1] || "").trim(),
        imageUrl:
          String(parts[2] || "").trim(),
        isImage:
          Number(parts[3] || 0),
      };
    });
}

// ------------------------------------------------------------
// 3. Duplicate DB codes
// ------------------------------------------------------------

function findDuplicateCodes(products) {
  const map = new Map();

  for (const product of products) {
    const code =
      normalizeCode(product.code);

    if (!map.has(code)) {
      map.set(code, []);
    }

    map.get(code).push(product);
  }

  const duplicates = [];

  for (const [code, rows] of map) {
    if (rows.length > 1) {
      duplicates.push({
        code,
        rows,
      });
    }
  }

  return duplicates;
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

async function main() {

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "        R2 ↔ PRODUCT IMAGE AUDIT"
  );
  console.log(
    "================================================"
  );
  console.log("");

  console.log("Database:");
  console.log(DB_PATH);

  console.log("");
  console.log("Bucket:");
  console.log(BUCKET_NAME);

  // ----------------------------------------------------------
  // Fetch R2
  // ----------------------------------------------------------

  console.log("");
  console.log(
    "☁️ Fetching ALL R2 objects..."
  );

  const r2Objects =
    await fetchAllR2Objects();

  console.log(
    `✓ Total R2 objects: ${r2Objects.length}`
  );

  // ----------------------------------------------------------
  // Only image objects
  // ----------------------------------------------------------

  const r2Images =
    r2Objects.filter((object) =>
      isImageFile(object.key)
    );

  console.log(
    `✓ R2 image objects: ${r2Images.length}`
  );

  // ----------------------------------------------------------
  // Read database
  // ----------------------------------------------------------

  console.log("");
  console.log(
    "📦 Reading products..."
  );

  const products =
    readProducts();

  console.log(
    `✓ Products: ${products.length}`
  );

  // ----------------------------------------------------------
  // DB statistics
  // ----------------------------------------------------------

  const dbWithImage =
    products.filter(
      (p) => p.isImage === 1
    );

  const dbWithoutImage =
    products.filter(
      (p) => p.isImage !== 1
    );

  // ----------------------------------------------------------
  // DB code maps
  // ----------------------------------------------------------

  const exactDbMap = new Map();

  const normalizedDbMap = new Map();

  for (const product of products) {

    const code =
      product.code.trim();

    const normalized =
      normalizeCode(code);

    exactDbMap.set(
      code,
      product
    );

    if (!normalizedDbMap.has(normalized)) {
      normalizedDbMap.set(
        normalized,
        []
      );
    }

    normalizedDbMap
      .get(normalized)
      .push(product);
  }

  // ----------------------------------------------------------
  // R2 maps
  // ----------------------------------------------------------

  const r2ExactMap = new Map();

  const r2NormalizedMap = new Map();

  const r2CodeMap = new Map();

  for (const object of r2Images) {

    const filename =
      getFileName(object.key);

    r2ExactMap.set(
      filename,
      object
    );

    const normalizedFilename =
      filename.toUpperCase();

    if (
      !r2NormalizedMap.has(
        normalizedFilename
      )
    ) {
      r2NormalizedMap.set(
        normalizedFilename,
        []
      );
    }

    r2NormalizedMap
      .get(normalizedFilename)
      .push(object);

    const code =
      removeExtension(filename);

    const normalizedCode =
      normalizeCode(code);

    if (!r2CodeMap.has(normalizedCode)) {
      r2CodeMap.set(
        normalizedCode,
        []
      );
    }

    r2CodeMap
      .get(normalizedCode)
      .push(object);
  }

  // ----------------------------------------------------------
  // Results
  // ----------------------------------------------------------

  const exactMatches = [];
  const dbMissingR2 = [];
  const markedButMissing = [];
  const unmarkedButExists = [];
  const r2Orphans = [];
  const extensionMismatch = [];
  const caseMismatch = [];

  // ----------------------------------------------------------
  // DB → R2 analysis
  // ----------------------------------------------------------

  for (const product of products) {

    const code =
      product.code.trim();

    const expected =
      `${code}.webp`;

    // Exact expected filename
    if (r2ExactMap.has(expected)) {

      exactMatches.push({
        id: product.id,
        code,
        expected,
        r2Key:
          r2ExactMap.get(expected).key,
        isImage:
          product.isImage,
        imageUrl:
          product.imageUrl,
      });

      if (product.isImage !== 1) {
        unmarkedButExists.push({
          id: product.id,
          code,
          expected,
        });
      }

      continue;
    }

    // Case-insensitive match
    const normalizedExpected =
      expected.toUpperCase();

    if (
      r2NormalizedMap.has(
        normalizedExpected
      )
    ) {

      const matches =
        r2NormalizedMap.get(
          normalizedExpected
        );

      caseMismatch.push({
        id: product.id,
        code,
        expected,
        r2Keys:
          matches.map(
            (x) => x.key
          ),
      });

      continue;
    }

    // Same code but different extension
    const sameCode =
      r2CodeMap.get(
        normalizeCode(code)
      );

    if (
      sameCode &&
      sameCode.length > 0
    ) {

      extensionMismatch.push({
        id: product.id,
        code,
        expected,
        r2Keys:
          sameCode.map(
            (x) => x.key
          ),
      });

      continue;
    }

    // Completely missing
    dbMissingR2.push({
      id: product.id,
      code,
      expected,
      isImage:
        product.isImage,
      imageUrl:
        product.imageUrl,
    });

    if (product.isImage === 1) {
      markedButMissing.push({
        id: product.id,
        code,
        expected,
        imageUrl:
          product.imageUrl,
      });
    }
  }

  // ----------------------------------------------------------
  // R2 → DB analysis
  // ----------------------------------------------------------

  for (const object of r2Images) {

    const filename =
      getFileName(object.key);

    const code =
      removeExtension(filename);

    const normalized =
      normalizeCode(code);

    const dbRows =
      normalizedDbMap.get(
        normalized
      );

    if (
      !dbRows ||
      dbRows.length === 0
    ) {
      r2Orphans.push({
        key: object.key,
        filename,
        code,
        size: object.size,
        lastModified:
          object.lastModified
            ? object.lastModified
                .toISOString()
            : "",
      });
    }
  }

  // ----------------------------------------------------------
  // Duplicate DB codes
  // ----------------------------------------------------------

  const duplicateDbCodes =
    findDuplicateCodes(products);

  // ----------------------------------------------------------
  // Duplicate R2 filenames
  // ----------------------------------------------------------

  const duplicateR2Filenames = [];

  for (
    const [filename, rows]
    of r2NormalizedMap
  ) {

    if (rows.length > 1) {

      duplicateR2Filenames.push({
        filename,
        keys:
          rows.map(
            (x) => x.key
          ),
      });
    }
  }

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------

  const summary = `

================================================
R2 ↔ PRODUCT IMAGE AUDIT
================================================

DATABASE
------------------------------------------------
Total products                  : ${products.length}
Products is_image = 1           : ${dbWithImage.length}
Products is_image != 1          : ${dbWithoutImage.length}

Unique product codes             : ${normalizedDbMap.size}
Duplicate DB codes               : ${duplicateDbCodes.length}

R2
------------------------------------------------
Total R2 objects                 : ${r2Objects.length}
R2 image objects                 : ${r2Images.length}

MATCH ANALYSIS
------------------------------------------------
Exact DB → R2 matches            : ${exactMatches.length}
DB product → R2 missing         : ${dbMissingR2.length}

is_image=1 but R2 missing       : ${markedButMissing.length}
is_image=0 but R2 exists        : ${unmarkedButExists.length}

Case mismatch                   : ${caseMismatch.length}
Extension mismatch              : ${extensionMismatch.length}

R2 images without DB product    : ${r2Orphans.length}
Duplicate R2 filenames           : ${duplicateR2Filenames.length}

================================================
NO DATABASE CHANGES WERE MADE
================================================
`;

  console.log(summary);

  // ----------------------------------------------------------
  // Save summary
  // ----------------------------------------------------------

  writeFile(
    "summary.txt",
    summary.trim() + "\n"
  );

  // ----------------------------------------------------------
  // Exact matches
  // ----------------------------------------------------------

  writeFile(
    "db-r2-matches.txt",
    exactMatches
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}\t${x.isImage}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // DB missing R2
  // ----------------------------------------------------------

  writeFile(
    "db-missing-r2.txt",
    dbMissingR2
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}\tis_image=${x.isImage}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Marked but missing
  // ----------------------------------------------------------

  writeFile(
    "marked-image-but-r2-missing.txt",
    markedButMissing
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}\t${x.imageUrl}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Unmarked but exists
  // ----------------------------------------------------------

  writeFile(
    "r2-exists-but-is-image-0.txt",
    unmarkedButExists
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // R2 orphan
  // ----------------------------------------------------------

  writeFile(
    "r2-orphan-images.txt",
    r2Orphans
      .map(
        (x) =>
          `${x.key}\t${x.code}\t${x.size}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Case mismatch
  // ----------------------------------------------------------

  writeFile(
    "case-mismatch.txt",
    caseMismatch
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}\t${x.r2Keys.join(",")}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Extension mismatch
  // ----------------------------------------------------------

  writeFile(
    "extension-mismatch.txt",
    extensionMismatch
      .map(
        (x) =>
          `${x.id}\t${x.code}\t${x.expected}\t${x.r2Keys.join(",")}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Duplicate DB
  // ----------------------------------------------------------

  writeFile(
    "duplicate-db-codes.txt",
    duplicateDbCodes
      .map((x) => {
        const rows =
          x.rows
            .map(
              (r) =>
                `${r.id}:${r.code}:is_image=${r.isImage}`
            )
            .join(" | ");

        return `${x.code}\t${rows}`;
      })
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // Duplicate R2
  // ----------------------------------------------------------

  writeFile(
    "duplicate-r2-filenames.txt",
    duplicateR2Filenames
      .map(
        (x) =>
          `${x.filename}\t${x.keys.join(" | ")}`
      )
      .join("\n") +
      "\n"
  );

  // ----------------------------------------------------------
  // All R2 image keys
  // ----------------------------------------------------------

  writeFile(
    "all-r2-image-keys.txt",
    r2Images
      .map((x) => x.key)
      .sort()
      .join("\n") +
      "\n"
  );

  console.log("");
  console.log(
    "Reports generated in:"
  );
  console.log(REPORT_DIR);

  console.log("");
  console.log(
    "✓ No database changes were made."
  );
  console.log("");
}

main().catch((error) => {

  console.error("");
  console.error(
    "❌ AUDIT FAILED"
  );
  console.error(error);

  process.exit(1);
});
