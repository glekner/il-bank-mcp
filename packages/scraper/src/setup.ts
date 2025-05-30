import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

function findWorkspaceRoot(): string {
  let currentDir = __dirname;

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8")
        );
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return process.cwd();
}

export function runSetup() {
  console.log("🏦 Bank Leumi MCP Scraper - Setup");
  console.log("=================================\n");

  const workspaceRoot = findWorkspaceRoot();
  const dataDir = path.join(workspaceRoot, "data");

  // Check and create data directory
  if (!fs.existsSync(dataDir)) {
    console.log("✅ Creating data directory...");
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    console.log("✅ Data directory exists");
  }

  // Check for .env file
  const envPath = path.join(workspaceRoot, ".env");
  const envExamplePath = path.join(workspaceRoot, "env.example");

  if (!fs.existsSync(envPath)) {
    console.log("\n⚠️  No .env file found!");

    if (fs.existsSync(envExamplePath)) {
      console.log("   Creating .env from env.example...");
      fs.copyFileSync(envExamplePath, envPath);
      console.log("   ✅ .env file created");
    }

    console.log(
      "\n📝 Please edit the .env file and add your Bank Leumi credentials:"
    );
    console.log(`   ${envPath}`);
    console.log("\n   Required variables:");
    console.log("   - BANK_USERNAME=your_username");
    console.log("   - BANK_PASSWORD=your_password");
  } else {
    console.log("✅ .env file exists");

    // Check if credentials are set
    const hasUsername = !!process.env.BANK_USERNAME;
    const hasPassword = !!process.env.BANK_PASSWORD;

    if (!hasUsername || !hasPassword) {
      console.log("\n⚠️  Bank credentials not configured!");
      console.log("   Please edit your .env file and set:");
      if (!hasUsername) console.log("   - BANK_USERNAME");
      if (!hasPassword) console.log("   - BANK_PASSWORD");
    } else {
      console.log("✅ Bank credentials configured");
    }
  }

  console.log("\n📊 Database Configuration:");
  const dbPath =
    process.env.DATABASE_PATH || path.join(dataDir, "bank-data.db");
  console.log(`   Database path: ${dbPath}`);

  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(
      `   ✅ Database exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
    );
  } else {
    console.log("   Database will be created on first run");
  }

  console.log("\n🚀 Next steps:");
  console.log("   1. Ensure your Bank Leumi credentials are set in .env");
  console.log("   2. Run: yarn scrape");
  console.log("   3. Start the MCP server for AI integration");

  console.log("\n✨ Setup complete!");
}

if (require.main === module) {
  runSetup();
}
