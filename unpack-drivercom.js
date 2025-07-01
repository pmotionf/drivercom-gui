import process from "node:process";
import { readdir } from "node:fs/promises";
import { unlink } from "node:fs/promises";
import { rename } from "node:fs/promises";
import path from "node:path";
import { Open } from "unzipper";
import { execSync } from "node:child_process";

const extension = process.platform === "win32" ? ".exe" : "";
const rustInfo = execSync("rustc -vV");
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
if (!targetTriple) {
  console.error("Failed to determine platform target triple");
  process.exitCode = 1;
  process.exit();
}

const base_path = "src-tauri/binaries";

let platform = process.platform;
const binaryName = "drivercom";
const newBinaryName = "drivercom-" + targetTriple;
switch (process.platform) {
  case "linux":
    {
      platform = "linux";
    }
    break;
  case "win32":
    {
      platform = "windows";
    }
    break;
  default:
    {
      console.error("unsupported OS %s", process.platform());
      process.exitCode = 1;
      process.exit();
    }
    break;
}

try {
  const files = await readdir(base_path);
  for (const name of files) {
    if (name.endsWith(".zip") && name.startsWith(platform)) {
      await Open.file(path.join(base_path, name)).then((d) =>
        d.extract({ path: base_path }),
      );
      unlink(path.join(base_path, name));
    } else {
      unlink(path.join(base_path, name));
    }
  }

  const to_rename = path.join(base_path, binaryName + extension);
  const renamed = path.join(base_path, newBinaryName + extension);

  await rename(to_rename, renamed);
  if (platform === "windows") {
    await rename(
      path.join(base_path, binaryName + ".pdb"),
      path.join(base_path, newBinaryName + ".pdb"),
    );
  } else if (platform === "linux") {
    // Requires marking file as executable
    execSync("chmod +x " + renamed);
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
  process.exit();
}
