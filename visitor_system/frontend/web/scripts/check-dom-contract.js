const fs = require("fs");
const path = require("path");

const webRoot = path.resolve(__dirname, "..");
const mainJsPath = path.join(webRoot, "src", "main.js");
const htmlPaths = [path.join(webRoot, "admin.html"), path.join(webRoot, "visitor.html")];

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function unique(values) {
  return [...new Set(values)];
}

function extractByIdDeps(mainJsText) {
  const matches = [...mainJsText.matchAll(/byId\("([^"]+)"\)/g)];
  return unique(matches.map((m) => m[1])).sort();
}

function extractHtmlIds(htmlText) {
  const matches = [...htmlText.matchAll(/id="([^"]+)"/g)];
  return unique(matches.map((m) => m[1])).sort();
}

function extractNavAnchors(adminHtmlText) {
  const matches = [...adminHtmlText.matchAll(/<a\s+[^>]*href="#([^"]+)"[^>]*>/g)];
  return unique(matches.map((m) => m[1])).sort();
}

function extractSectionIds(adminHtmlText) {
  const matches = [
    ...adminHtmlText.matchAll(/<section\s+[^>]*id="([^"]+)"[^>]*class="[^"]*admin-section[^"]*"[^>]*>/g),
  ];
  return unique(matches.map((m) => m[1])).sort();
}

function main() {
  const mainJsText = readFile(mainJsPath);
  const htmlText = htmlPaths.map((p) => readFile(p)).join("\n");
  const adminHtmlText = readFile(path.join(webRoot, "admin.html"));

  const requiredIds = extractByIdDeps(mainJsText);
  const htmlIds = extractHtmlIds(htmlText);

  const missingFromHtml = requiredIds.filter((id) => !htmlIds.includes(id));
  const extraInHtml = htmlIds.filter((id) => !requiredIds.includes(id));

  const navAnchors = extractNavAnchors(adminHtmlText);
  const sectionIds = extractSectionIds(adminHtmlText);
  const missingSectionsForAnchors = navAnchors.filter((id) => !sectionIds.includes(id));

  console.log(`required ids (main.js): ${requiredIds.length}`);
  console.log(`html ids (admin + visitor): ${htmlIds.length}`);
  console.log(`missing ids: ${missingFromHtml.length}`);
  console.log(`extra ids: ${extraInHtml.length}`);
  console.log(`admin nav anchors: ${navAnchors.length}`);
  console.log(`admin sections: ${sectionIds.length}`);

  if (missingFromHtml.length > 0) {
    console.error("\nMissing ids required by main.js:");
    missingFromHtml.forEach((id) => console.error(`- ${id}`));
  }

  if (missingSectionsForAnchors.length > 0) {
    console.error("\nSidebar anchors without matching section id:");
    missingSectionsForAnchors.forEach((id) => console.error(`- ${id}`));
  }

  // Extra ids are informational only; useful for cleanup but not a hard failure.
  if (extraInHtml.length > 0) {
    console.log("\nExtra ids in HTML (informational):");
    extraInHtml.forEach((id) => console.log(`- ${id}`));
  }

  if (missingFromHtml.length > 0 || missingSectionsForAnchors.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log("\nDOM contract check passed.");
}

main();
