const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, contents) {
  fs.writeFileSync(filePath, contents);
}

function ensureVersionCode(androidAppGradlePath, minVersionCode) {
  let contents = read(androidAppGradlePath);
  const match = contents.match(/versionCode\s+(\d+)/);
  if (!match) return;
  const current = Number(match[1]);
  if (Number.isNaN(current) || current >= minVersionCode) return;
  contents = contents.replace(/versionCode\s+\d+/, `versionCode ${minVersionCode}`);
  write(androidAppGradlePath, contents);
}

function ensureCmakeOverrideInApp(androidAppGradlePath) {
  let contents = read(androidAppGradlePath);
  if (contents.includes("cmakeVersionOverride")) return;
  const anchor = "androidResources {";
  const idx = contents.indexOf(anchor);
  if (idx === -1) return;
  const insertAt = contents.indexOf("}", idx);
  if (insertAt === -1) return;
  const block =
    "\n    externalNativeBuild {\n" +
    "        cmake {\n" +
    "            def cmakeVersionOverride = System.getenv(\"CMAKE_VERSION\")\n" +
    "            if (cmakeVersionOverride != null && cmakeVersionOverride.trim()) {\n" +
    "                version = cmakeVersionOverride\n" +
    "            }\n" +
    "        }\n" +
    "    }\n";
  contents = contents.slice(0, insertAt + 1) + block + contents.slice(insertAt + 1);
  write(androidAppGradlePath, contents);
}

function ensureCmakeOverrideInModule(moduleGradlePath, cmakePathMarker) {
  let contents = read(moduleGradlePath);
  if (contents.includes("cmakeVersionOverride")) return;
  const markerIndex = contents.indexOf(cmakePathMarker);
  if (markerIndex === -1) return;
  const insertAt = contents.lastIndexOf("cmake {", markerIndex);
  if (insertAt === -1) return;
  const insertPos = contents.indexOf("\n", insertAt) + 1;
  const block =
    "            def cmakeVersionOverride = System.getenv(\"CMAKE_VERSION\")\n" +
    "            if (cmakeVersionOverride != null && cmakeVersionOverride.trim()) {\n" +
    "                version = cmakeVersionOverride\n" +
    "            }\n";
  contents = contents.slice(0, insertPos) + block + contents.slice(insertPos);
  write(moduleGradlePath, contents);
}

function ensureRootGradleOverrides(androidRootGradlePath) {
  let contents = read(androidRootGradlePath);

  // Ensure ext values exist and are set.
  if (!contents.includes("ext {")) {
    const insertAfter = contents.indexOf("buildscript");
    if (insertAfter !== -1) {
      const block =
        "\next {\n" +
        "  buildToolsVersion = \"36.0.0\"\n" +
        "  compileSdkVersion = 36\n" +
        "  targetSdkVersion = 36\n" +
        "  ndkVersion = \"29.0.14206865\"\n" +
        "}\n";
      const braceIdx = contents.indexOf("}", insertAfter);
      if (braceIdx !== -1) {
        contents = contents.slice(0, braceIdx + 1) + block + contents.slice(braceIdx + 1);
      }
    }
  } else {
    contents = contents.replace(/buildToolsVersion\s*=\s*\"[^\"]+\"/, 'buildToolsVersion = "36.0.0"');
    contents = contents.replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 36");
    contents = contents.replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 36");
    contents = contents.replace(/ndkVersion\s*=\s*\"[^\"]+\"/, 'ndkVersion = "29.0.14206865"');
  }

  // Ensure subprojects buildToolsVersion override exists.
  if (!contents.includes("subprojects {") || !contents.includes("buildToolsVersion rootProject.ext.buildToolsVersion")) {
    contents +=
      "\nsubprojects { project ->\n" +
      "  project.plugins.withId(\"com.android.application\") {\n" +
      "    project.android {\n" +
      "      buildToolsVersion rootProject.ext.buildToolsVersion\n" +
      "    }\n" +
      "  }\n" +
      "  project.plugins.withId(\"com.android.library\") {\n" +
      "    project.android {\n" +
      "      buildToolsVersion rootProject.ext.buildToolsVersion\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
  }

  write(androidRootGradlePath, contents);
}

const androidAppGradle = path.join(repoRoot, "android", "app", "build.gradle");
if (fs.existsSync(androidAppGradle)) {
  ensureVersionCode(androidAppGradle, 6);
  ensureCmakeOverrideInApp(androidAppGradle);
}

const androidRootGradle = path.join(repoRoot, "android", "build.gradle");
if (fs.existsSync(androidRootGradle)) {
  ensureRootGradleOverrides(androidRootGradle);
}

const modulesToPatch = [
  {
    path: path.join(repoRoot, "node_modules", "expo-modules-core", "android", "build.gradle"),
    marker: 'path "CMakeLists.txt"',
  },
  {
    path: path.join(repoRoot, "node_modules", "react-native-screens", "android", "build.gradle"),
    marker: 'path "CMakeLists.txt"',
  },
  {
    path: path.join(
      repoRoot,
      "node_modules",
      "react-native-gesture-handler",
      "android",
      "build.gradle"
    ),
    marker: 'path "src/main/jni/CMakeLists.txt"',
  },
];

for (const entry of modulesToPatch) {
  if (fs.existsSync(entry.path)) {
    ensureCmakeOverrideInModule(entry.path, entry.marker);
  }
}
