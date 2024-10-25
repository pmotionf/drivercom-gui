import { createSignal, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Command } from "@tauri-apps/plugin-shell";

function Connect() {
  const [portList, setPortList] = createSignal("");
  const [porttErr, setPortErr] = createSignal("");
  async function connectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.list"]);
    const output = await drivercom.execute();
    setPortList(output.stdout);
    setPortErr(output.stderr);
  }
  return (
    <>
      <Button onclick={connectPort}>connect</Button>
      <Show when={portList() != "" && porttErr() == ""}>
        <Button>{portList()}</Button>
      </Show>
    </>
  );
}

export default Connect;
