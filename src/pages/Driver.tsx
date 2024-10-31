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
  const [version, setVersion] = createSignal("");

  //json value 전달하기
  const navigate = useNavigate();

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
    if (dataString) {
      navigate(`/Configuration?data=${dataString}&port=${port}`);
    }
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
