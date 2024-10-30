import { createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

import { Command } from "@tauri-apps/plugin-shell";

import { IconChevronDown } from "@tabler/icons-solidjs";
import { Accordion } from "~/components/ui/accordion";
import { Box } from "styled-system/jsx";

import { useNavigate } from "@solidjs/router";

function Connect() {
  const [portList, setPortList] = createSignal("");
  const [stdErr, setstdtErr] = createSignal("");
  const [buttonList, setButtonList] = createSignal<string[]>([]);
  const [buttonClicked, setButtonClicked] = createSignal<boolean[]>([]);
  const [help, setHelp] = createSignal("");
  const [inputValue, setInputValue] = createSignal("");
  const [savedValue, setSavedValue] = createSignal("");
  const [version, setVersion] = createSignal("");

  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const commands = ["firmware", "config", "log"];

  const navigate = useNavigate();

  let log_status = false;

  async function connectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.list"]);
    const output = await drivercom.execute();
    const btn_list = output.stdout.match(/\((\w+)\)/g) as string[];
    setButtonList(btn_list);
    setPortList(output.stdout);
    setstdtErr(output.stderr);
    setButtonClicked(btn_list.map(() => false));

    const version = Command.sidecar("binaries/drivercom", ["version"]);
    const version_output = await version.execute();
    setVersion(version_output.stdout);
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
        const jsonObject = JSON.parse(config_output.stdout);
        setJsonData(jsonObject);
        break;
      case "log":
        log_status = true;
        console.log(log_status);
    }
  }

  async function inputCommnad(port: string) {
    const commnd = Command.sidecar("binaries/drivercom", [
      "--port",
      port,
      inputValue(),
    ]);
    const commnd_output = await commnd.execute();
    console.log("out: " + commnd_output.stdout);
    console.log("err: " + commnd_output.stderr);
    setSavedValue(commnd_output.stdout);
    setInputValue("");
  }

  function CreateCommandButton(port: string) {
    return (
      <div id="btn">
        <Button>{"firmware"}</Button>
        <Button onclick={() => SwitchConfigPage(port)}>{"config"}</Button>
        <Button>{"log"}</Button>
      </div>
    );
  }

  async function SwitchConfigPage(port: string) {
    const config = Command.sidecar("binaries/drivercom", [
      "--port",
      port,
      "config.get",
    ]);
    const config_output = await config.execute();
    const dataString = encodeURIComponent(JSON.stringify(config_output.stdout));
    navigate(`/Configuration?data=${dataString}`);
  }

  return (
    <>
      <Text size="xl" fontWeight="bold">
        Controller connection
      </Text>
      <Button onclick={connectPort}>connect</Button>
      <Box
        bg="accent.a2"
        p="4"
        borderRadius="l3"
        mt="6"
        height="100%"
        overflowY="auto"
      >
        <div id="container">
          <Accordion.Root multiple={true}>
            {buttonList().map((item) => (
              <Accordion.Item value={item} ml={"16px"}>
                <Accordion.ItemTrigger>
                  {item.slice(1, -1)}
                  <Accordion.ItemIndicator>
                    <IconChevronDown />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  <Text>{"drivercom version : " + version()}</Text>
                  {CreateCommandButton(item.slice(1, -1))}
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </Box>
    </>
  );
}

export default Connect;
