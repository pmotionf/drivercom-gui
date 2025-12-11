import { IconX } from "@tabler/icons-solidjs";
import { Command } from "@tauri-apps/plugin-shell";
import { createEffect, createSignal, on, Show, useContext } from "solid-js";
import { Stack } from "styled-system/jsx";
import { ConfigForm } from "~/components/ConfigForm";
import { FileMenu } from "~/components/FileMenu";
import { PortMenu } from "~/components/PortMenu";
import { TabPageContext } from "~/components/TabList";
import { Button } from "~/components/ui/button";
import { Editable } from "~/components/ui/editable";
import { Text } from "~/components/ui/text";
import { Toast } from "~/components/ui/toast";
import { Tooltip } from "~/components/ui/tooltip";
import {
  configDescription,
  configFormFileFormat,
  portCommands,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
  tabContexts,
} from "~/GlobalState";

import { LinkStates, GainLockStates } from "~/components/ConfigForm";
import { FileHandler } from "../utils/FileHandler";
import { AccordionStates } from "~/components/Form";
import JSON5 from "json5";
import { Spinner } from "~/components/ui/spinner";

export type ConfigTabPage = {
  filePath?: string;
  configForm?: object;
  focusedTab?: string;
  configAccordionStatuses?: AccordionStates;
  configLinkedStatuses?: LinkStates;
  configGainLockStatuses?: GainLockStates;
  formName?: string;
  originalFile?: object;
};

export function ConfigTabContent() {
  const configTabProps = useContext(TabPageContext);
  if (!configTabProps) return;
  if (!tabContexts.get(configTabProps.key)) return;

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const getTabIndex = () => {
    const index = tabContexts
      .get(configTabProps.key)![0]
      .tabContext.map((ctx) => ctx.tab.id)
      .indexOf(configTabProps.tabId);
    return index;
  };

  const getConfigForm = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configForm!;
  };

  const setConfigForm = (config: object) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "configForm",
      config,
    );
  };

  const getFormName = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.formName!;
  };

  const setFormName = (newFormName: string) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "formName",
      newFormName,
    );
  };

  const getTabId = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()].tab
      .id;
  };

  const getFocusedTab = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage?.configTabPage?.focusedTab;
  };

  const setFocusedTab = (focusedTab: string) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "focusedTab",
      focusedTab,
    );
  };

  const getFilePath = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.filePath;
  };

  const setFilePath = (filePath: string | null) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "filePath",
      filePath ? filePath : undefined,
    );
  };

  const getOriginalFile = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.originalFile;
  };

  const setOriginalFile = (filePath: object) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "originalFile",
      filePath,
    );
  };

  const getAccordionStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configAccordionStatuses;
  };

  const getLinkedStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configLinkedStatuses;
  };

  const getGainLockStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configGainLockStatuses;
  };

  const [render, setRender] = createSignal<boolean>(true);

  const fileHandler = new FileHandler();

  async function getConfigFromPort(portId: string): Promise<object> {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `config.get`,
    ]);

    let stdout = "";
    configGet.stdout.on("data", (data) => {
      stdout = stdout + data;
    });

    let stderr = "";
    configGet.stderr.on("data", (data) => {
      stderr = stderr + data;
    });

    const child = await configGet.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      configGet.on("close", () => {
        portCommands.delete(pid);
        return resolve(JSON5.parse(stdout));
      });

      configGet.on("error", () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  function setFormData(data: object, path: string) {
    setConfigForm(data);
    setFilePath(path);
    setFormName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path, ...newRecentFiles];
    });
    setOriginalFile(JSON5.parse(JSON5.stringify(data)));
  }

  async function saveConfigToPort(config: object): Promise<string> {
    const json_str = JSON.stringify(config, null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    const output = await saveConfig.execute();
    return output.stderr;
  }

  let scrollContainer: HTMLDivElement | undefined;
  const scrollToWrongField = (scrollContainer: HTMLDivElement) => {
    const top = Array.from(
      document.querySelectorAll(`[data-name*="config_field_error"]`),
    )[0].parentElement?.offsetTop;

    if (top) {
      const one_rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      scrollContainer.scrollTo({
        top: top - scrollContainer.offsetTop - one_rem,
      });
    }
  };

  const checkAvailablePort = (portId: string): boolean => {
    if (portId.length <= 0) {
      return false;
    }
    if (
      Array.from(portCommands.values()).some(
        (command) => command.port === portId,
      )
    ) {
      toaster.create({
        title: "Communication error",
        description: "Port is already in use.",
        type: "error",
      });
      return false;
    }
    return true;
  };

  createEffect(
    on(
      () => portId(),
      () => {
        if (Array.from(portCommands.values()).length > 0) {
          Array.from(portCommands.values()).forEach((command) => {
            if (command.port !== portId()) {
              command.child.kill();
              portCommands.delete(command.child.pid);
            }
          });
        }
      },
      { defer: true },
    ),
  );

  return (
    <div
      id={configTabProps.key}
      style={{
        "padding-bottom": "0.5rem",
        height: "100%",
        width: `100% `,
        "justify-content": "center",
        display: "flex",
      }}
    >
      <Stack
        style={{
          width: "40%",
          height: `calc(100% - 1rem)`,
          "margin-top": "0.5rem",
          "min-width": "35rem",
          "border-radius": "0.5rem",
          "box-shadow": "0px 0px 15px 1px rgb(0,0,0,0.05)",
          "border-width": "1px",
        }}
        borderColor="bg.muted"
        backgroundColor="bg.default"
      >
        <Stack
          direction="row"
          width="100%"
          height="4em"
          padding="1.5em 1em 1em 1em "
        >
          <Tooltip.Root positioning={{ placement: "bottom-start" }}>
            <Tooltip.Trigger width={`calc(100% - 9rem)`}>
              <Editable.Root
                placeholder="File name"
                value={getFormName()}
                onValueChange={(e) => {
                  setFormName(e.value);
                }}
                activationMode="dblclick"
                onValueCommit={(e) => {
                  setFormName(e.value);
                }}
                fontWeight="bold"
                fontSize="2xl"
              >
                <Editable.Area>
                  <Editable.Input width="100%" />
                  <Editable.Preview
                    width="100%"
                    style={{
                      "white-space": "nowrap",
                      "text-overflow": "ellipsis",
                      display: "block",
                      overflow: "hidden",
                      "text-align": "left",
                    }}
                  />
                </Editable.Area>
              </Editable.Root>
            </Tooltip.Trigger>

            <Show when={getFilePath()}>
              <Tooltip.Positioner>
                <Tooltip.Content backgroundColor="bg.default">
                  <Text color="fg.default">{getFilePath()!}</Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Show>
          </Tooltip.Root>

          <FileMenu
            filePath={getFilePath() ? getFilePath()! : ""}
            recentFiles={recentConfigFilePaths()}
            onNewFile={() => {
              setRender(false);
              const newEmptyFile = JSON5.parse(
                JSON5.stringify(configFormFileFormat()),
              );
              setFormName("New File");
              setConfigForm(newEmptyFile);
              setFilePath(null);
              setRender(true);
            }}
            onOpenFile={async () => {
              const extension = "json5";
              const path = await fileHandler.openFileDialog(extension);
              if (!path) return;
              try {
                setRender(false);
                const file = await fileHandler.readFile(
                  path,
                  configFormFileFormat(),
                );
                setFormData(file, path);
                setRender(true);
              } catch {
                toaster.create({
                  title: "Invalid File",
                  description: "The file is invalid.",
                  type: "error",
                });
                setRecentConfigFilePaths((prev) => {
                  const newRecentFiles = prev.filter(
                    (prevFilePath) => prevFilePath !== path,
                  );
                  return newRecentFiles;
                });
                setRender(true);
                return;
              }
            }}
            onOpenRecentFile={async (filePath: string) => {
              try {
                setRender(false);
                const file = await fileHandler.readFile(
                  filePath,
                  configFormFileFormat(),
                );
                setFormData(file!, filePath);
                setRender(true);
              } catch {
                toaster.create({
                  title: "Invalid File Path",
                  description: "The file path is invalid.",
                  type: "error",
                });
                setRecentConfigFilePaths((prev) => {
                  const newRecentFiles = prev.filter(
                    (prevFilePath) => prevFilePath !== filePath,
                  );
                  return newRecentFiles;
                });
                setRender(true);
                return;
              }
            }}
            onDeleteRecentPath={(index: number) => {
              setRecentConfigFilePaths((prev) => {
                return prev.filter((_, i) => i !== index);
              });
            }}
            onReloadFile={async () => {
              if (!getFilePath()) return;
              try {
                setRender(false);
                const file = await fileHandler.readFile(
                  getFilePath()!,
                  configFormFileFormat(),
                );
                setFormData(file!, getFilePath()!);
                setRender(true);
              } catch {
                toaster.create({
                  title: "Invalid File Path",
                  description: "The file path is invalid.",
                  type: "error",
                });
                setRecentConfigFilePaths((prev) => {
                  const newRecentFiles = prev.filter(
                    (prevFilePath) => prevFilePath !== getFilePath()!,
                  );
                  return newRecentFiles;
                });
                setRender(true);
                return;
              }
            }}
            onSaveFile={async () => {
              try {
                const config = getConfigForm();
                const path = await fileHandler.saveFileDialog(
                  "json5",
                  getFilePath()!,
                  getFormName(),
                  typeof config["id" as keyof typeof config] === "number" &&
                    config["id" as keyof typeof config] > 0 &&
                    typeof config["station" as keyof typeof config] ===
                      "number" &&
                    config["station" as keyof typeof config] > 0
                    ? `Driver ${config["id" as keyof typeof config]} Station ${config["station" as keyof typeof config]}`
                    : undefined,
                );
                await fileHandler.writeFile(
                  path,
                  getConfigForm()!,
                  configFormFileFormat(),
                );
              } catch {
                toaster.create({
                  title: "Invalid File",
                  description: "The file is invalid.",
                  type: "error",
                });
                return;
              }
            }}
          />
          <PortMenu
            portId={portId}
            variant="outline"
            borderColor="bg.disabled"
            onGetFromPort={async () => {
              if (!checkAvailablePort(portId())) return;
              setFilePath(null);
              try {
                setRender(false);
                const config = await getConfigFromPort(portId());
                setFormName(portId());
                setConfigForm(config);
                setOriginalFile(JSON5.parse(JSON.stringify(config)));
                setRender(true);
              } catch (e) {
                setRender(true);
                toaster.create({
                  title: "Communication Error",
                  description: e as string,
                  type: "error",
                });
              }
            }}
            onSaveToPort={async () => {
              if (portId().length === 0) return;
              if (
                scrollContainer &&
                document.querySelectorAll(`[data-name*="config_field_error"]`)
                  .length > 0
              ) {
                scrollToWrongField(scrollContainer);
                toaster.create({
                  title: "Invalid File",
                  description: "The file is invalid.",
                  type: "error",
                });
                return;
              }
              const outputError = await saveConfigToPort(getConfigForm());
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
                description: "Configuration saved to port successfully.",
                type: "error",
              });
            }}
          >
            <Button
              disabled={portId().length === 0}
              variant="outline"
              borderColor="bg.disabled"
              borderRadius="0.4rem"
            >
              Port
            </Button>
          </PortMenu>
        </Stack>
        <Show
          when={render()}
          fallback={
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                "justify-content": "center",
                width: "100%",
                height: "100%",
                "border-top-width": render() ? "0px" : "1px",
              }}
            >
              <Spinner
                display="flex"
                justifySelf={"center"}
                justifyItems={"center"}
                size="xl"
                borderLeftColor={"bg.muted"}
                borderBottomColor={"bg.muted"}
                borderRightColor={"fg.muted"}
                borderTopColor={"fg.muted"}
                borderWidth={"5px"}
              />
              <Text
                marginTop="1em"
                size="lg"
                fontWeight={"bold"}
                maxWidth="50%"
                textAlign="center"
              >
                {getFilePath()
                  ? `Get config from "${getFilePath()}".`
                  : portId().length > 0
                    ? `Get config from "${portId()}".`
                    : `Get new config.`}
              </Text>
              <Text
                display="flex"
                justifySelf={"center"}
                marginTop="0.5em"
                size="md"
              >
                {getFilePath()
                  ? `Opening...`
                  : portId().length > 0
                    ? `Downloading...`
                    : `Opening...`}
              </Text>
            </div>
          }
        >
          <div
            ref={scrollContainer}
            style={{
              width: "100%",
              height: `calc(100% - 4em)`,
            }}
          >
            <ConfigForm
              id={getTabId()}
              description={configDescription()}
              originalFile={getOriginalFile()}
              focusedTab={getFocusedTab()}
              onFocustTabChange={(tabId) => setFocusedTab(tabId)}
              config={getConfigForm()!}
              linkedStatuses={getLinkedStatuses()!}
              accordionStatuses={getAccordionStatuses()!}
              gainLockStatuses={getGainLockStatuses()!}
            />
          </div>
        </Show>
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
      </Stack>
    </div>
  );
}
