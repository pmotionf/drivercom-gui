import process from "node:process";
import { readdir, rename, rm, unlink } from "node:fs/promises";
import path from "node:path";
import { Open } from "unzipper";

try {
  const componentFolderPath = "src/components";
  const base_path = "src/components/proto";
  const files = await readdir(base_path);
  const protoFolderName = "protocol";

  let mmcApi = "";
  for (const name of files) {
    const extension = ".zip";
    if (name.endsWith(extension)) {
      await Open.file(path.join(base_path, name)).then((d) =>
        d.extract({ path: base_path }),
      );
      mmcApi = name.slice(0, -extension.length);
      unlink(path.join(base_path, name));
    }
  }

  const apiFilePath = path.join(base_path, mmcApi);
  await rename(
    path.join(apiFilePath, protoFolderName),
    path.join(componentFolderPath, protoFolderName),
  );
  await rm(base_path, { recursive: true, force: true });
  await rename(path.join(componentFolderPath, protoFolderName), base_path);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
  process.exit();
}
