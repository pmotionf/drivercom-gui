import { createSignal, Show, For } from "solid-js";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Command } from "@tauri-apps/plugin-shell";
import { ConfigForm } from "~/components/ConfigForm";

function Connect() {
  const [portList, setPortList] = createSignal("");
  const [stdErr, setstdtErr] = createSignal("");
  const [buttonList, setButtonList] = createSignal<string[]>([]);
  const [buttonClicked, setButtonClicked] = createSignal<boolean[]>([]);
  const [help, setHelp] = createSignal("");

  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const commands = ["version", "firmware", "config", "log"];

  let log_status = false;

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

  async function logStart(port: string) {
    const log_start = Command.sidecar("binaries/drivercom", [
      "--port",
      port,
      "log.start",
    ]);
    const log_stop_output = await log_start.execute();
    if (log_stop_output) {
      setHelp("logging start");
    }
    console.log(log_stop_output.stderr);
  }
  async function logStop(port: string) {
    const log_stop = Command.sidecar("binaries/drivercom", [
      "--port",
      port,
      "log.stop",
    ]);
    const log_stop_output = await log_stop.execute();
    setHelp(log_stop_output.stderr); //왜 에러상태에 결과값이 나오는지?
  }

  async function commandClick(index: number, port: string) {
    switch (commands[index]) {
      case "version":
        const version = Command.sidecar("binaries/drivercom", [
          commands[index],
        ]);
        const version_output = await version.execute();
        setHelp(version_output.stdout);
        break;
      case "firmware":
        const firmware = Command.sidecar("binaries/drivercom", [
          commands[index],
        ]);
        const firmware_output = await firmware.execute();
        if (firmware_output.stdout) {
          setHelp(firmware_output.stdout);
        } else {
          setHelp(firmware_output.stderr);
        }
        break;
      case "config":
        const config = Command.sidecar("binaries/drivercom", [
          "--port",
          port,
          "config.get",
        ]);
        const config_output = await config.execute();
        let jsonObject = JSON.parse(config_output.stdout);
        setJsonData(jsonObject);
        break;
      case "log":
        log_status = true;
        console.log(log_status);
    }
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
                      <Button
                        onclick={() => commandClick(index(), name.slice(1, -1))}
                      >
                        {item}
                      </Button>
                    </>
                  )}
                </For>
                <Text>{help()}</Text>
                <Show when={Object.keys(jsonData()).length > 0}>
                  <div style={{ display: "flex", "justify-content": "center" }}>
                    <ConfigForm label={"config.get"} config={jsonData()} />
                  </div>
                </Show>

                <Button onclick={() => logStart(name.slice(1, -1))}>
                  {" "}
                  start
                </Button>
                <Button onclick={() => logStop(name.slice(1, -1))}>
                  {" "}
                  stop
                </Button>
              </Show>
            </>
          )}
        </For>
      </Show>
    </>
  );
}

export default Connect;
