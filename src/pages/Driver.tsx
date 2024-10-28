import { createSignal, Show, For } from "solid-js";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Command } from "@tauri-apps/plugin-shell";

function Connect() {
  const [portList, setPortList] = createSignal("");
  const [stdErr, setstdtErr] = createSignal("");
  const [buttonList, setButtonList] = createSignal<string[]>([]);
  const [buttonClicked, setButtonClicked] = createSignal<boolean[]>([]);
  const [help, setHelp] = createSignal("");
  const commands = ["version", "firmware", "config", "log"];

  async function connectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.list"]);
    const output = await drivercom.execute();
    const btn_list = output.stdout.match(/\((\w+)\)/g) as string[];
    setButtonList(btn_list);
    setPortList(output.stdout);
    setstdtErr(output.stderr);
    setButtonClicked(btn_list.map(() => false));
  }

  function portClick(index: number) {
    setButtonClicked((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  }

  async function commandClick(index: number) {
    const drivercom = Command.sidecar("binaries/drivercom", [commands[index]]);
    const output = await drivercom.execute();
    setHelp(output.stdout);
    console.log(output.stderr);
  }

  return (
    <>
      <Button onclick={connectPort}>connect</Button>
      <Show when={portList() != "" && stdErr() == ""}>
        <Text>{buttonList()}</Text>
        <For each={buttonList()}>
          {(name, index) => (
            <>
              <Button onclick={() => portClick(index())}>
                {name.slice(1, -1)}
              </Button>{" "}
              <br />
              <Show when={buttonClicked()[index()]}>
                <For each={commands}>
                  {(item, index) => (
                    <>
                      <Button onclick={() => commandClick(index())}>
                        {item}
                      </Button>
                    </>
                  )}
                </For>
                <Text>{help()}</Text>
              </Show>
            </>
          )}
        </For>
      </Show>
    </>
  );
}

export default Connect;
