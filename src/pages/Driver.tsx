import { createSignal, createEffect, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Checkbox } from "~/components/ui/checkbox";
import { FormLabel } from "~/components/ui/form-label";

import { Command } from "@tauri-apps/plugin-shell";

import { IconChevronDown } from "@tabler/icons-solidjs";
import { Accordion } from "~/components/ui/accordion";
import { Box } from "styled-system/jsx";

import { useNavigate } from "@solidjs/router";
import { useLocation } from "@solidjs/router";

function Connect() {
  const [buttonList, setButtonList] = createSignal<string[]>([]);
  const [version, setVersion] = createSignal("");
  const [checkedConfig, setCheckedConfig] = createSignal<string[]>([]);
  const [showCheckboxes, setShowCheckboxes] = createSignal(false);
  const [configError, setConfigError] = createSignal(false);

  const toggleCheckboxes = () => {
    setShowCheckboxes(!showCheckboxes());
  };

  const configure_type = {
    dirver: [
      "driver_cycle",
      "driver_cycle_time",
      "driver_vdc",
      "driver_com_bwd_sent",
      "driver_com_bwd_arrived",
      "driver_com_fwd_sent",
      "driver_com_fwd_arrived",
      "driver_com_bwd_sent_cycles",
      "driver_com_fwd_sent_cycles",
    ] as string[],
    axis: [
      "axis_current_d",
      "axis_current_q",
      "axis_reference_current_d",
      "axis_reference_current_q",
      ".axis_vehicle_id",
      "axis_vehicle_position",
      "axis_average_angle_diff",
    ] as string[],
    sensor: [
      "sensor_alarm",
      "sensor_valid",
      "sensor_active",
      "sensor_angle",
      ".sensor_average_angle",
      "sensor_unwrapped_angle",
      "sensor_distance",
      "sensor_velocity",
    ] as string[],
  };

  //json value 전달하기
  const navigate = useNavigate();

  async function connectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.list"]);
    const output = await drivercom.execute();
    const btn_list = output.stdout.match(/\((\w+)\)/g) as string[];
    setButtonList(btn_list);

    const version = Command.sidecar("binaries/drivercom", ["version"]);
    const version_output = await version.execute();
    setVersion(version_output.stdout);
  }

  function SelectCOnfigure() {
    if (showCheckboxes()) {
      return (
        <div id="configure">
          <Accordion.Root multiple={true}>
            {Object.keys(configure_type).map((key) => (
              <Accordion.Item value={key} ml={"16px"}>
                <Accordion.ItemTrigger>
                  {key}
                  <Accordion.ItemIndicator>
                    <IconChevronDown />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  {configure_type[key as keyof typeof configure_type].map(
                    (value) => (
                      <FormLabel
                        style={{
                          display: "flex",
                          "align-content": "center",
                          "line-height": "1.75em",
                          "justify-content": "space-between",
                        }}
                      >
                        {value}
                        <Checkbox
                          onChange={() => checkboxChange(value)}
                        ></Checkbox>
                      </FormLabel>
                    ),
                  )}
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      );
    }
    return;
  }

  function CreateCommandButton(port: string) {
    return (
      <div id="btn">
        <Button>{"firmware"}</Button>
        <Button onclick={() => SwitchConfigPage(port)}>{"config"}</Button>
        <Button onclick={toggleCheckboxes}>{"log"}</Button>
        <Show when={configError()}>
          <Text>
            {"전달된 config 데이터가 없습니다. 제어기를 확인 해주세요."}
          </Text>
        </Show>
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
    setTimeout(() => {
      if (config_output.stdout == "") {
        setConfigError(true);
        return;
      }
      if (dataString) {
        setConfigError(false);
        navigate(`/Configuration?&data=${dataString}&port=${port}`);
      }
    }, 500);
  }

  const checkboxChange = (value: string) => {
    setCheckedConfig((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      } else {
        return [...prev, value];
      }
    });
    console.log(checkedConfig());
  };

  const location = useLocation();
  createEffect(async () => {
    const params = new URLSearchParams(location.search);
    const port = params.get("port") as string;
    const json_string = params.get("data") as string; // JSON 파싱
    if (json_string) {
      const config = Command.sidecar("binaries/drivercom", [
        "--port",
        port,
        "config.set",
        json_string, //drivercom.cli 수정 필요
      ]);
      const config_output = await config.execute();
      console.log(config_output.stdout);
      console.log(config_output.stderr);
    }
  });

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
                  {SelectCOnfigure()}
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
