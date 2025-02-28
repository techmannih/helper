import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

const nextjsDir = path.join(import.meta.dirname, "../nextjs");
console.log("Pulling production environment file...");
execSync("vercel env pull .env.production.local --environment=production --yes", {
  cwd: nextjsDir,
  stdio: "inherit",
});

dotenv.config({ path: path.join(nextjsDir, ".env.production.local") });

const tauriConfig = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
const VERSION = tauriConfig.version;

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_PRIVATE_STORAGE_BUCKET_NAME;
const BASE_PATH = "src-tauri/target";

const files = [
  {
    path: `${BASE_PATH}/universal-apple-darwin/release/bundle/dmg/Helper_${VERSION}_universal.dmg`,
    key: `public/desktop-apps/Helper_universal.dmg`,
    contentType: "application/x-apple-diskimage",
    platform: "darwin-universal",
  },
  {
    path: `${BASE_PATH}/universal-apple-darwin/release/bundle/macos/Helper.app.tar.gz`,
    key: `public/desktop-apps/Helper_universal.app.tar.gz`,
    contentType: "application/gzip",
    sigPath: `${BASE_PATH}/universal-apple-darwin/release/bundle/macos/Helper.app.tar.gz.sig`,
    platform: "darwin-universal",
  },
  {
    path: `${BASE_PATH}/x86_64-pc-windows-msvc/release/bundle/nsis/Helper_${VERSION}_x64-setup.exe`,
    key: `public/desktop-apps/Helper_x64-setup.exe`,
    contentType: "application/x-msdownload",
    sigPath: `${BASE_PATH}/x86_64-pc-windows-msvc/release/bundle/nsis/Helper_${VERSION}_x64-setup.exe.sig`,
    platform: "windows-x86_64",
  },
  {
    path: `${BASE_PATH}/release/bundle/appimage/Helper_${VERSION}_amd64.AppImage`,
    key: `public/desktop-apps/Helper_amd64.AppImage`,
    contentType: "application/x-executable",
    sigPath: `${BASE_PATH}/release/bundle/appimage/Helper_${VERSION}_amd64.AppImage.sig`,
    platform: "linux-x86_64-appimage",
  },
  {
    path: `${BASE_PATH}/release/bundle/deb/Helper_${VERSION}_amd64.deb`,
    key: `public/desktop-apps/Helper_amd64.deb`,
    contentType: "application/vnd.debian.binary-package",
    platform: "linux-x86_64",
  },
  {
    path: `${BASE_PATH}/release/bundle/rpm/Helper-${VERSION}-1.x86_64.rpm`,
    key: `public/desktop-apps/Helper-1.x86_64.rpm`,
    contentType: "application/x-rpm",
    platform: "linux-x86_64-rpm",
  },
];

async function uploadFile(file) {
  const fileContent = fs.readFileSync(file.path);
  const params = {
    Bucket: BUCKET_NAME,
    Key: file.key,
    Body: fileContent,
    ContentType: file.contentType,
    ACL: "public-read",
  };

  await s3Client.send(new PutObjectCommand(params));
  console.log(`Successfully uploaded ${file.key}`);
}

async function createUpdateJson() {
  const platforms = {};

  for (const file of files.filter((file) => file.sigPath)) {
    const signature = fs.readFileSync(file.sigPath, "utf-8");
    const downloadUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${file.key}`;

    platforms[file.platform] = {
      signature,
      url: downloadUrl,
      version: VERSION,
    };
  }

  const updateJson = {
    version: VERSION,
    pub_date: new Date().toISOString(),
    platforms,
  };

  const params = {
    Bucket: BUCKET_NAME,
    Key: "public/desktop-apps/update.json",
    Body: JSON.stringify(updateJson, null, 2),
    ContentType: "application/json",
  };

  await s3Client.send(new PutObjectCommand(params));
  console.log("Successfully uploaded public/desktop-apps/update.json");
}

async function uploadAllFiles() {
  try {
    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        throw new Error(`File not found: ${file.path}`);
      }
      await uploadFile(file);
    }

    await createUpdateJson();
  } finally {
    const envPath = path.join(nextjsDir, ".env.production.local");
    if (fs.existsSync(envPath)) {
      console.log("Cleaning up environment file...");
      fs.unlinkSync(envPath);
    }
  }
}

uploadAllFiles().catch((error) => {
  console.error(error);
  process.exit(1);
});
