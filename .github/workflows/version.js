module.exports = async ({ github, context }) => {
  const { SHA } = process.env;
  const fs = require("fs").promises;
  const org = "pmotionf";
  const name = "drivercom-gui";

  // Parse `build.zig.zon` for version
  var version;
  const raw = await fs.readFile("./build.zig.zon");
  const lines = raw.toString().split("\n");
  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith(".version")) {
      const parts = line.split("=");
      const version_raw = parts[1];
      const version_cleaned = version_raw
        .replaceAll('"', "")
        .replaceAll(",", "");
      version = version_cleaned.trim();
    }
  });

  // Check if already released
  const releases = await github.rest.git.listMatchingRefs({
    owner: org,
    repo: name,
    ref: "tags/" + version,
  });
  if (releases.data.length > 0) {
    return "";
  }

  return version;
};
