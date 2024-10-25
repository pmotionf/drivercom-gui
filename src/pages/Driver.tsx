import { Button } from "~/components/ui/button";
import { Command } from "@tauri-apps/plugin-shell";

const drivercom = Command.sidecar("binaries/drivercom");
const output = await drivercom.execute();

function Connect() {
  function portList() {
    console.log("result2: " + output.stdout);
  }
  return <Button onclick={portList}>connect</Button>;
}

export default Connect;
