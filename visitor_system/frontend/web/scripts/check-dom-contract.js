const fs = require("fs");
const path = require("path");

const webRoot = path.resolve(__dirname, "..");
const adminHtmlPath = path.join(webRoot, "admin.html");
const adminLoginHtmlPath = path.join(webRoot, "admin-login.html");
const visitorHtmlPath = path.join(webRoot, "visitor.html");
const htmlPaths = [adminHtmlPath, adminLoginHtmlPath, visitorHtmlPath];
const sourcePaths = [
  path.join(webRoot, "src", "main.js"),
  path.join(webRoot, "src", "dom", "elements.js"),
  path.join(webRoot, "src", "pages", "admin", "login-page.js"),
];

const commonRequiredScripts = [
  "./src/runtime/registry.js",
  "./src/config/env.js",
  "./src/services/api.js",
  "./src/utils/shared.js",
  "./src/dom/elements.js",
  "./src/store/admin-state.js",
  "./src/main.js",
];

const adminRequiredScripts = [
  "./src/pages/admin/shell.js",
  "./src/pages/admin/dashboard.js",
  "./src/pages/admin/pending.js",
  "./src/pages/admin/onsite.js",
  "./src/pages/admin/history.js",
  "./src/pages/admin/logs.js",
  "./src/pages/admin/accounts.js",
  ...commonRequiredScripts,
];

const adminLoginRequiredScripts = [
  "./src/runtime/registry.js",
  "./src/config/env.js",
  "./src/services/api.js",
  "./src/utils/shared.js",
  "./src/pages/admin/login-page.js",
];

const visitorRequiredScripts = [
  "./src/pages/visitor/home.js",
  "./src/pages/visitor/pass.js",
  "./src/pages/visitor/apply.js",
  "./src/pages/visitor/query.js",
  ...commonRequiredScripts,
];

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function unique(values) {
  return [...new Set(values)];
}

function extractByIdDeps(sourceText) {
  const matches = [...sourceText.matchAll(/byId\("([^"]+)"\)/g)];
  return unique(matches.map((m) => m[1])).sort();
}

function extractHtmlIds(htmlText) {
  const matches = [...htmlText.matchAll(/id="([^"]+)"/g)];
  return unique(matches.map((m) => m[1])).sort();
}

function extractScriptSrcs(htmlText) {
  const matches = [...htmlText.matchAll(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/g)];
  return matches.map((m) => m[1].split("?")[0]);
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

function extractSectionViews(adminHtmlText) {
  const matches = [
    ...adminHtmlText.matchAll(/<section\s+[^>]*class="[^"]*admin-section[^"]*"[^>]*data-view="([^"]+)"[^>]*>/g),
    ...adminHtmlText.matchAll(/<section\s+[^>]*data-view="([^"]+)"[^>]*class="[^"]*admin-section[^"]*"[^>]*>/g),
  ];
  return unique(matches.map((m) => m[1])).sort();
}

function checkRequiredScripts(scriptSrcs, requiredScripts) {
  return requiredScripts.filter((src) => !scriptSrcs.includes(src));
}

function checkScriptOrder(scriptSrcs, earlier, later) {
  const earlierIndex = scriptSrcs.indexOf(earlier);
  const laterIndex = scriptSrcs.indexOf(later);
  if (earlierIndex === -1 || laterIndex === -1) return false;
  return earlierIndex < laterIndex;
}

function main() {
  const sourceText = sourcePaths.map((filePath) => readFile(filePath)).join("\n");
  const htmlText = htmlPaths.map((filePath) => readFile(filePath)).join("\n");
  const adminHtmlText = readFile(adminHtmlPath);
  const adminLoginHtmlText = readFile(adminLoginHtmlPath);
  const visitorHtmlText = readFile(visitorHtmlPath);

  const requiredIds = extractByIdDeps(sourceText);
  const htmlIds = extractHtmlIds(htmlText);
  const adminScriptSrcs = extractScriptSrcs(adminHtmlText);
  const adminLoginScriptSrcs = extractScriptSrcs(adminLoginHtmlText);
  const visitorScriptSrcs = extractScriptSrcs(visitorHtmlText);

  const missingFromHtml = requiredIds.filter((id) => !htmlIds.includes(id));
  const extraInHtml = htmlIds.filter((id) => !requiredIds.includes(id));

  const navAnchors = extractNavAnchors(adminHtmlText);
  const sectionIds = extractSectionIds(adminHtmlText);
  const sectionViews = extractSectionViews(adminHtmlText);
  const validSectionTargets = unique([...sectionIds, ...sectionViews]);
  const missingSectionsForAnchors = navAnchors.filter((id) => !validSectionTargets.includes(id));
  const adminMissingScripts = checkRequiredScripts(adminScriptSrcs, adminRequiredScripts);
  const adminLoginMissingScripts = checkRequiredScripts(adminLoginScriptSrcs, adminLoginRequiredScripts);
  const visitorMissingScripts = checkRequiredScripts(visitorScriptSrcs, visitorRequiredScripts);
  const scriptOrderFailures = [
    [adminScriptSrcs, "./src/runtime/registry.js", "./src/services/api.js", "admin.html"],
    [adminLoginScriptSrcs, "./src/runtime/registry.js", "./src/services/api.js", "admin-login.html"],
    [visitorScriptSrcs, "./src/runtime/registry.js", "./src/services/api.js", "visitor.html"],
    [adminScriptSrcs, "./src/config/env.js", "./src/services/api.js", "admin.html"],
    [adminLoginScriptSrcs, "./src/config/env.js", "./src/services/api.js", "admin-login.html"],
    [visitorScriptSrcs, "./src/config/env.js", "./src/services/api.js", "visitor.html"],
    [adminScriptSrcs, "./src/runtime/registry.js", "./src/main.js", "admin.html"],
    [visitorScriptSrcs, "./src/runtime/registry.js", "./src/main.js", "visitor.html"],
    [adminLoginScriptSrcs, "./src/utils/shared.js", "./src/pages/admin/login-page.js", "admin-login.html"],
    [adminScriptSrcs, "./src/utils/shared.js", "./src/dom/elements.js", "admin.html"],
    [visitorScriptSrcs, "./src/utils/shared.js", "./src/dom/elements.js", "visitor.html"],
    [adminScriptSrcs, "./src/dom/elements.js", "./src/main.js", "admin.html"],
    [visitorScriptSrcs, "./src/dom/elements.js", "./src/main.js", "visitor.html"],
    [adminScriptSrcs, "./src/store/admin-state.js", "./src/main.js", "admin.html"],
    [visitorScriptSrcs, "./src/store/admin-state.js", "./src/main.js", "visitor.html"],
  ].filter(([scripts, earlier, later]) => !checkScriptOrder(scripts, earlier, later));

  console.log(`required ids (bootstrap sources): ${requiredIds.length}`);
  console.log(`html ids (admin + admin-login + visitor): ${htmlIds.length}`);
  console.log(`missing ids: ${missingFromHtml.length}`);
  console.log(`extra ids: ${extraInHtml.length}`);
  console.log(`admin nav anchors: ${navAnchors.length}`);
  console.log(`admin sections: ${sectionIds.length}`);
  console.log(`admin section views: ${sectionViews.length}`);

  if (missingFromHtml.length > 0) {
    console.error("\nMissing ids required by bootstrap sources:");
    missingFromHtml.forEach((id) => console.error(`- ${id}`));
  }

  if (missingSectionsForAnchors.length > 0) {
    console.error("\nSidebar anchors without matching section id:");
    missingSectionsForAnchors.forEach((id) => console.error(`- ${id}`));
  }

  if (adminMissingScripts.length > 0) {
    console.error("\nMissing required scripts in admin.html:");
    adminMissingScripts.forEach((src) => console.error(`- ${src}`));
  }

  if (adminLoginMissingScripts.length > 0) {
    console.error("\nMissing required scripts in admin-login.html:");
    adminLoginMissingScripts.forEach((src) => console.error(`- ${src}`));
  }

  if (visitorMissingScripts.length > 0) {
    console.error("\nMissing required scripts in visitor.html:");
    visitorMissingScripts.forEach((src) => console.error(`- ${src}`));
  }

  if (scriptOrderFailures.length > 0) {
    console.error("\nScript order violations:");
    scriptOrderFailures.forEach(([, earlier, later, htmlFile]) =>
      console.error(`- ${htmlFile}: ${earlier} must appear before ${later}`),
    );
  }

  if (extraInHtml.length > 0) {
    console.log("\nExtra ids in HTML (informational):");
    extraInHtml.forEach((id) => console.log(`- ${id}`));
  }

  if (
    missingFromHtml.length > 0 ||
    missingSectionsForAnchors.length > 0 ||
    adminMissingScripts.length > 0 ||
    adminLoginMissingScripts.length > 0 ||
    visitorMissingScripts.length > 0 ||
    scriptOrderFailures.length > 0
  ) {
    process.exitCode = 1;
    return;
  }

  console.log("\nDOM contract check passed.");
}

main();
