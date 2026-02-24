import process from "node:process";
import { readdir, rename, rm, unlink } from "node:fs/promises";
import path from "node:path";
import { Open } from "unzipper";

try {
  const base_path = "src/proto";
  const files = await readdir(base_path);

  let mmcApi = "";
  for (const name of files) {
    const extension = ".zip";
    if (name.endsWith(extension)) {
      await Open.file(path.join(base_path, name)).then((d) =>
        d.extract({ path: base_path }),
      );
      mmcApi = name.slice(0, -extension.length);
      unlink(path.join(base_path, name));
    } else {
      await rm(path.join(base_path, name), { recursive: true, force: true });
    }
  }

  const mmcApiFolder = path.join(base_path, mmcApi);
  const mmcFiles = await readdir(mmcApiFolder);
  for (const name of mmcFiles) {
    if (name !== "protobuf") {
      await rm(path.join(mmcApiFolder, name), { recursive: true, force: true });
    }
  }

  const src = path.join(mmcApiFolder, "protobuf");
  const protos = await readdir(src);
  for (const name of protos) {
    await rename(path.join(src, name), path.join(base_path, name));
  }
  await rm(mmcApiFolder, { recursive: true, force: true });
} catch (err) {
  console.error(err);
  process.exitCode = 1;
  process.exit();
}
