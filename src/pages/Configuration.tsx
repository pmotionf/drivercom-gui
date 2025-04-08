import { createEffect, createSignal, For, Show } from "solid-js";

import { ConfigForm } from "~/components/ConfigForm";
import { IconX } from "@tabler/icons-solidjs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import {
  configFormFileFormat,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Menu } from "~/components/ui/menu";

function Configuration() {
  const [configure, setConfigure] = createSignal({});
  const [formName, setFormName] = createSignal<string>("");
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [filePath, setFilePath] = createSignal<string | undefined>(undefined);

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function getConfigFromPort(): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.get`,
    ]);
    const output = await configGet.execute();
    return { stdout: output.stdout, stderr: output.stderr };
  }

  async function openFileDialog(): Promise<string | undefined> {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      return undefined;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      });
      return undefined;
    }
    return path.replaceAll("\\", "/");
  }

  async function readJsonFile(path: string): Promise<object | undefined> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      return parseFileToObject;
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter(
          (prevFilePath) => prevFilePath !== path,
        );
        return newRecentFiles;
      });
    }
  }

  function checkFileFormat(file: object): string {
    const newFileFormat = Object.entries(file)
      .map((line) => {
        const key = line[0];
        const value = line[1];
        if (typeof value !== "object") return [key, typeof value];
        const parseValue = checkFileFormat(value);
        return [key, parseValue];
      })
      .sort()
      .toString();

    return newFileFormat;
  }

  function compareFileFormat(newFile: object, fileFormat: object): boolean {
    const newFileObject = checkFileFormat(newFile);
    const configFileObject = checkFileFormat(fileFormat);
    return newFileObject === configFileObject;
  }

  function setFormData(data: object, path: string) {
    setConfigure(data);
    setFilePath(path);
    setFormName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path, ...newRecentFiles];
    });
    setIsFormOpen(true);
  }

  async function saveConfigAsFile() {
    const json_str = JSON.stringify(configure(), null, "  ");
    const fileNameFromPath = filePath()
      ? filePath()!
        .match(/[^?!//]+$/)!
        .toString()
      : "";
    const currentFilePath = filePath()
      ? formName() === fileNameFromPath
        ? filePath()
        : filePath()!.replace(fileNameFromPath, formName())
      : formName();

    const path = await save({
      defaultPath: currentFilePath!.split(".").pop()!.toLowerCase() === "json"
        ? `${currentFilePath}`
        : `${currentFilePath}.json`,
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });
    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The specified file path is invalid.",
        type: "error",
      });
      return;
    }
    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The specified file extension is invalid.",
        type: "error",
      });
      return;
    }

    if (!filePath()) {
      const parsePath = path.replaceAll("\\", "/");
      setFilePath(parsePath);
      const currentPathFileName = parsePath.match(/[^//]+$/)!.toString();
      setFormName(currentPathFileName);
    }

    await writeTextFile(path, json_str);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path.replaceAll("\\", "/"), ...newRecentFiles];
    });
  }

  async function saveConfigToPort(): Promise<string> {
    const json_str = JSON.stringify(configure(), null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    const output = await saveConfig.execute();
    return output.stderr;
  }

  // Check recent file list item is hovered
  const [isButtonHovered, setIsButtonHoverd] = createSignal<
    [boolean, number | null]
  >([false, null]);

  function calcCurrentPGain(denominator: number, configure: object) {
    const coil =
      Object.entries(configure).filter((key) => key[0] === "coil").slice(
        0,
      )[0][1];
    if (typeof coil !== "object") return;
    const ls =
      Object.entries(coil).filter((key) => key[0] === "ls").slice(0)[0][1];

    if (typeof ls !== "number") return;

    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const p = wcc * ls;
    return p;
  }

  function calcCurrentIGain(denominator: number, configure: object) {
    const coil =
      Object.entries(configure).filter((key) => key[0] === "coil").slice(
        0,
      )[0][1];
    if (typeof coil !== "object") return;
    const rs =
      Object.entries(coil).filter((key) => key[0] === "rs").slice(0)[0][1];

    if (typeof rs !== "number") return;
    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const i = wcc * rs;
    return i;
  }

  // get Value function 따로 만들기
  // 오브젝트 값 가져오는 단순한 함수

  function calcVelocityPGain(
    denominator: number,
    denominator_pi: number,
    currentDenominator: number,
    configure: object,
  ): { p: number; i: number } | null {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);

    const magnet =
      Object.entries(configure).filter((key) => key[0] === "magnet").slice(
        0,
      )[0][1];
    if (typeof magnet !== "object") return null;
    const pitch =
      Object.entries(magnet).filter((key) => key[0] === "pitch").slice(0)[0][1];
    if (typeof pitch !== "number") return null;
    const radius = pitch / (2.0 * Math.PI);

    const carrier =
      Object.entries(configure).filter((key) => key[0] === "carrier").slice(
        0,
      )[0][1];
    if (typeof carrier !== "object") return null;
    const mass =
      Object.entries(carrier).filter((key) => key[0] === "mass").slice(0)[0][1];
    if (typeof mass !== "number") return null;
    const inertia = (mass / 100) * radius * radius;

    const coil =
      Object.entries(configure).filter((key) => key[0] === "coil").slice(
        0,
      )[0][1];
    if (typeof coil !== "object") return null;
    const kf =
      Object.entries(coil).filter((key) => key[0] === "kf").slice(0)[0][1];
    if (typeof kf !== "number") return null;
    const torque_constant = kf * radius;

    const wsc = wcc / denominator;
    const wpi = wsc / denominator_pi;
    const p = (inertia * wsc) / torque_constant;

    const i = p * wpi;

    return {
      p: p,
      i: i,
    };
  }

  function calcGainPosition(denominator: number, axisConfig: object) {
    const gain = axisConfig["gain" as keyof typeof axisConfig];
    const current =
      Object.entries(gain).filter((key) => key[0] === "current").slice(
        0,
      )[0][1];
    if (typeof current !== "object") return null;

    const currentDenominator =
      Object.entries(current!).filter((key) => key[0] === "denominator").slice(
        0,
      )[0][1];
    if (typeof currentDenominator !== "number") return null;
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);

    const velocity =
      Object.entries(gain).filter((key) => key[0] === "velocity").slice(
        0,
      )[0][1];
    if (typeof velocity !== "object") return null;

    const velocityDenominator =
      Object.entries(velocity!).filter((key) => key[0] === "denominator").slice(
        0,
      )[0][1];
    if (typeof velocityDenominator !== "number") return null;
    const wsc = wcc / velocityDenominator;

    const wpc = wsc / denominator;
    const p = wpc;

    return p;
  }

  const [refresh, setRefresh] = createSignal<boolean>(false);
  const [isRender, setIsRender] = createSignal<boolean>(false);

  createEffect(() => {
    if (refresh()) {
      setIsRender(false);
      setRefresh(false);
      return;
    }
    setIsRender(true);
  });

  const [accordionStatus, setAccordionStatus] = createSignal<string[]>([]);

  return (
    <>
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          height: "100%",
          width: `100%`,
          "overflow-y": "auto",
        }}
      >
        <Toast.Toaster toaster={toaster}>
          {(toast) => (
            <Toast.Root>
              <Toast.Title>{toast().title}</Toast.Title>
              <Toast.Description>{toast().description}</Toast.Description>
              <Toast.CloseTrigger>
                <IconX />
              </Toast.CloseTrigger>
            </Toast.Root>
          )}
        </Toast.Toaster>
        <Stack
          width="44rem"
          marginLeft={`calc((100% - 44rem) / 2)`}
          height="100%"
        >
          <Show when={!isFormOpen()}>
            <Text variant="heading" size="2xl">
              Configuration
            </Text>
            <Stack direction="row" marginTop="1.5rem" gap="1.5rem">
              <Button
                variant="outline"
                padding="4rem"
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(configFormFileFormat()),
                  );
                  setFormName("New File");
                  setConfigure(newEmptyFile);
                  setFilePath(undefined);
                  setIsFormOpen(true);
                }}
              >
                Create New Config
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                onClick={async () => {
                  const path = await openFileDialog();
                  if (!path) return;
                  const object = await readJsonFile(path);
                  const checkObject = compareFileFormat(
                    object!,
                    configFormFileFormat(),
                  );
                  if (!checkObject) {
                    toaster.create({
                      title: "Invalid File",
                      description: "The file is invalid.",
                      type: "error",
                    });
                    return;
                  }
                  setFormData(object!, path);
                }}
              >
                Open File
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                disabled={portId().length === 0}
                onClick={async () => {
                  setFilePath(undefined);
                  const output = await getConfigFromPort();
                  if (output.stderr.length !== 0) {
                    toaster.create({
                      title: "Communication Error",
                      description: output.stderr,
                      type: "error",
                    });
                  } else {
                    const parseConfigToObject = JSON.parse(output.stdout);
                    setFormName(portId());
                    setConfigure(parseConfigToObject);
                    setIsFormOpen(true);
                  }
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentConfigFilePaths().length !== 0}>
              <Text size="xl" marginTop="2rem" fontWeight="bold">
                Recent
              </Text>
              <Stack direction="row" width="100%" marginTop="0.5rem">
                <Text width="16rem" size="sm" fontWeight="light" opacity="50%">
                  File
                </Text>
                <Text size="sm" fontWeight="light" opacity="50%">
                  Path
                </Text>
              </Stack>
              <Stack
                style={{ "overflow-y": "auto" }}
                height="100%"
                width="100%"
                gap="0"
                marginLeft="-0.5rem"
                borderTopWidth="1"
                borderBottomWidth="1"
              >
                <For each={recentConfigFilePaths()}>
                  {(path, index) => (
                    <Button
                      width="100%"
                      variant="ghost"
                      padding="0.5rem"
                      paddingTop="1rem"
                      paddingBottom="1rem"
                      onMouseEnter={() => {
                        setIsButtonHoverd([true, index()]);
                      }}
                      onMouseLeave={() => {
                        setIsButtonHoverd([false, null]);
                      }}
                      bgColor={isButtonHovered()[0] === true &&
                          isButtonHovered()[1] === index()
                        ? "bg.muted"
                        : "bg.canvas"}
                      gap="0"
                    >
                      <Text
                        userSelect="none"
                        onClick={async () => {
                          const object = await readJsonFile(path);
                          setFormData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        size="md"
                        height="2rem"
                        fontWeight="medium"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                          "text-align": "left",
                          "margin-top": "0.4rem",
                          width: "15rem",
                        }}
                      >
                        {path.match(/[^//]+$/)!.toString()}
                      </Text>
                      <Text
                        userSelect="none"
                        size="sm"
                        fontWeight="light"
                        marginLeft="0.5rem"
                        opacity="70%"
                        onClick={async () => {
                          const object = await readJsonFile(path);
                          setFormData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                          "text-align": "left",
                          width: `calc(100% - 17rem)`,
                          "padding-left": "1rem",
                        }}
                      >
                        {path.replace(path.match(/[^?!//]+$/)!.toString(), "")}
                      </Text>
                      <Stack width="2rem">
                        <Show
                          when={isButtonHovered()[0] === true &&
                            isButtonHovered()[1] === index()}
                        >
                          <IconButton
                            padding="0"
                            opacity="50%"
                            variant="ghost"
                            borderRadius="2rem"
                            size="sm"
                            width="1rem"
                            marginRight="1rem"
                            onClick={() => {
                              setRecentConfigFilePaths((prev) => {
                                const updateFilePath = prev.filter((_, i) => {
                                  return i !== index();
                                });
                                return updateFilePath;
                              });
                            }}
                          >
                            <IconX width="1rem" />
                          </IconButton>
                        </Show>
                      </Stack>
                    </Button>
                  )}
                </For>
              </Stack>
            </Show>
          </Show>
          <Show when={isFormOpen()}>
            <div style={{ width: "40rem", "margin-left": "2rem" }}>
              <Show when={isRender()}>
                <Card.Root padding="2rem" paddingTop="3rem" marginBottom="3rem">
                  <ConfigForm
                    label={formName()}
                    onLabelChange={(e) => setFormName(e)}
                    accordionStatus={accordionStatus()}
                    config={configure()}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setAccordionStatus([]);
                    }}
                    onCurrentChange={(
                      denominator,
                      axesIndex,
                      prevAxis,
                      accordionStatus,
                    ) => {
                      const config = configure();
                      const axesValue: Array<object> =
                        config["axes" as keyof typeof config];
                      const newAxis = {
                        gain: {
                          ...Object.values(prevAxis).slice(0)[0],
                          current: {
                            p: calcCurrentPGain(denominator, configure()),
                            i: calcCurrentIGain(denominator, configure()),
                            denominator: denominator,
                          },
                        },
                      };
                      setConfigure({
                        ...configure(),
                        axes: axesValue.map((axis, i) => {
                          if (i === axesIndex) return newAxis;
                          else return axis;
                        }),
                      });
                      setAccordionStatus(
                        accordionStatus ? accordionStatus : [],
                      );
                      setRefresh(true);
                    }}
                    onVelocityChange={(
                      denominator,
                      denominator_pi,
                      axesIndex,
                      prevAxis,
                      accordionStatus,
                    ) => {
                      const gain = Object.values(prevAxis).slice(0)[0];
                      if (typeof gain !== "object") return;
                      const current = Object.entries(gain).filter((key) =>
                        key[0] === "current"
                      )[0][1];
                      if (typeof current !== "object") {
                        return;
                      }
                      const currentDenominator =
                        Object.entries(current!).filter((key) =>
                          key[0] === "denominator"
                        )[0][1];
                      if (typeof denominator !== "number") {
                        return;
                      }

                      const calcVelocity = calcVelocityPGain(
                        denominator,
                        denominator_pi,
                        currentDenominator,
                        configure(),
                      );
                      if (!calcVelocity) return;

                      const config = configure();
                      const axesValue: Array<object> =
                        config["axes" as keyof typeof config];
                      const newAxis = {
                        gain: {
                          ...Object.values(prevAxis).slice(0)[0],
                          velocity: {
                            p: calcVelocity.p,
                            i: calcVelocity.i,
                            denominator: denominator,
                            denominator_pi: denominator_pi,
                          },
                        },
                      };
                      setConfigure({
                        ...configure(),
                        axes: axesValue.map((axis, i) => {
                          if (i === axesIndex) return newAxis;
                          else return axis;
                        }),
                      });

                      setAccordionStatus(
                        accordionStatus ? accordionStatus : [],
                      );
                      setRefresh(true);
                    }}
                    onPositionChange={(
                      denominator,
                      axesIndex,
                      prevAxis,
                      accordionStatus,
                    ) => {
                      const p = calcGainPosition(denominator, prevAxis);
                      if (!p) return;

                      const config = configure();
                      const axesValue: Array<object> =
                        config["axes" as keyof typeof config];
                      const newAxis = {
                        gain: {
                          ...Object.values(prevAxis).slice(0)[0],
                          position: {
                            p: p,
                            denominator: denominator,
                          },
                        },
                      };

                      setConfigure({
                        ...configure(),
                        axes: axesValue.map((axis, i) => {
                          if (i === axesIndex) return newAxis;
                          else return axis;
                        }),
                      });
                      setAccordionStatus(
                        accordionStatus ? accordionStatus : [],
                      );
                      setRefresh(true);
                    }}
                  />
                  <Card.Footer padding={0}>
                    <Stack direction="row-reverse">
                      <Menu.Root>
                        <Menu.Trigger>
                          <Button>Save</Button>
                        </Menu.Trigger>
                        <Menu.Positioner>
                          <Menu.Content width="8rem">
                            <Menu.Item
                              value="Save as file"
                              onClick={() => {
                                saveConfigAsFile();
                              }}
                              userSelect="none"
                            >
                              Save as file
                            </Menu.Item>
                            <Menu.Separator />
                            <Menu.Item
                              value="Save to port"
                              disabled={portId().length === 0}
                              onClick={async () => {
                                const outputError = await saveConfigToPort();
                                if (outputError.length !== 0) {
                                  toaster.create({
                                    title: "Communication Error",
                                    description: outputError,
                                    type: "error",
                                  });
                                  return;
                                }
                                toaster.create({
                                  title: "Communication Success",
                                  description:
                                    "Configuration saved to port successfully.",
                                  type: "error",
                                });
                              }}
                              userSelect="none"
                            >
                              Save to port
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Menu.Root>
                    </Stack>
                  </Card.Footer>
                </Card.Root>
              </Show>
            </div>
          </Show>
        </Stack>
      </div>
    </>
  );
}

export default Configuration;
