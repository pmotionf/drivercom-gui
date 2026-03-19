import {
  IconChevronRight,
  IconDeviceFloppy,
  IconFileDownload,
  IconFileImport,
  IconRuler2,
  IconRuler2Off,
  IconSettingsShare,
} from "@tabler/icons-solidjs";
import { Command } from "@tauri-apps/plugin-shell";
import {
  createEffect,
  createSignal,
  For,
  on,
  Show,
  useContext,
} from "solid-js";
import { Stack } from "styled-system/jsx";
import { TabPageContext } from "~/components/Tab/TabList";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import {
  configDescription,
  configFormFileFormat,
  configTabForm,
  portCommands,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
  tabStore,
} from "~/store/GlobalState";
import {
  ConfigForm,
  LinkStates,
  GainLockStates,
} from "./ConfigForm/ConfigForm";
import { FileHandler } from "../../services/FileHandler";
import { AccordionStates } from "./ConfigForm/ConfigForm";
import JSON5 from "json5";
import { Spinner } from "~/components/ui/spinner";
import { IconButton } from "~/components/ui/icon-button";
import { toaster } from "~/services/Toaster";
import { Menu } from "~/components/ui/menu";
import { ConfigType } from "src-tauri/generated/config/ConfigType";
import { Button } from "~/components/ui/styled/button";
import { css } from "styled-system/css";
import { detectPort, getConfigFromPort, Port } from "~/services/PortService";
import { prettierLabel } from "~/utils/PrettierLabel";

export type ConfigTabPage = {
  filePath?: string;
  portId?: string;
  configForm?: ConfigType;
  focusedTab?: string;
  configAccordionStatuses?: AccordionStates;
  configLinkedStatuses?: LinkStates;
  configGainLockStatuses?: GainLockStates;
  formName?: string;
  formOverflowY?: Map<string, number>;
  originalFile?: ConfigType;
  changeUnit?: boolean;
};

export function ConfigTabContent() {
  const configTabProps = useContext(TabPageContext);
  if (!configTabProps) return;
  if (!tabStore.get(configTabProps.key)) return;

  const getTabIndex = () => {
    const index = tabStore
      .get(configTabProps.key)![0]
      .tabContext.map((ctx) => ctx.tab.id)
      .indexOf(configTabProps.tabId);
    return index;
  };

  const getConfigForm = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configForm!;
  };

  const setConfigForm = (config: object) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "configForm",
      config,
    );
  };

  const getPortId = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.portId;
  };

  const setPortId = (newPortId: string) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "portId",
      newPortId,
    );
  };

  const setTabName = (newName: string) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tab",
      "tabName",
      newName,
    );
  };

  const getTabId = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()].tab
      .id;
  };

  const getFocusedTab = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage?.configTabPage?.focusedTab;
  };

  const setFocusedTab = (focusedTab: string) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "focusedTab",
      focusedTab,
    );
  };

  const getFilePath = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.filePath;
  };

  const setFilePath = (filePath: string | null) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "filePath",
      filePath ? filePath : undefined,
    );
  };

  const getOriginalFile = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.originalFile;
  };

  const setOriginalFile = (filePath: object) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "originalFile",
      filePath,
    );
  };

  const getAccordionStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configAccordionStatuses;
  };

  const getLinkedStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configLinkedStatuses;
  };

  const getGainLockStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configGainLockStatuses;
  };

  const getFormScrollTop = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.formOverflowY;
  };

  const getChangeUnit = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.changeUnit;
  };

  const setChangeUnit = (isChangeUnit: boolean) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "changeUnit",
      isChangeUnit,
    );
  };

  const [render, setRender] = createSignal<boolean>(true);

  const fileHandler = new FileHandler();

  function setFormData(data: ConfigType, path: string) {
    setConfigForm(data);
    setFilePath(path);
    setTabName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path, ...newRecentFiles];
    });
    setOriginalFile(JSON5.parse(JSON5.stringify(data)));
  }

  async function saveConfigToPort(
    config: object,
    portId: string,
  ): Promise<string> {
    const json_str = JSON.stringify(config, null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
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

  createEffect(
    on(
      () => getPortId(),
      () => {
        if (Array.from(portCommands.values()).length > 0) {
          Array.from(portCommands.values()).forEach((command) => {
            if (command.port !== getPortId()) {
              command.child.kill();
              portCommands.delete(command.child.pid);
            }
          });
        }
      },
      { defer: true },
    ),
  );

  const topBarHeight = "2.5rem";

  const saveAsFile = async () => {
    try {
      const path = await fileHandler.saveFileDialog("json5", getFilePath()!);
      await fileHandler.writeFile(
        path,
        getConfigForm()!,
        configFormFileFormat(),
      );
      if (getFilePath() && getFilePath() === path) {
        setRender(false);
        setOriginalFile(JSON5.parse(JSON5.stringify(getConfigForm())));
        setRender(true);
      }
    } catch {
      toaster.create({
        title: "Invalid File",
        description: "The file is invalid.",
        type: "error",
      });
      return;
    }
  };

  const saveToPort = async (portId: string) => {
    if (
      scrollContainer &&
      document.querySelectorAll(`[data-name*="config_field_error"]`).length > 0
    ) {
      scrollToWrongField(scrollContainer);
      toaster.create({
        title: "Invalid File",
        description: "The file is invalid.",
        type: "error",
      });
      return;
    }
    const outputError = await saveConfigToPort(getConfigForm(), portId);
    if (outputError.length !== 0) {
      toaster.create({
        title: "Communication Error",
        description: outputError,
        type: "error",
      });
      return;
    }

    if (getPortId() && getPortId() === portId) {
      setOriginalFile(JSON5.parse(JSON5.stringify(getConfigForm())));
    }
    toaster.create({
      title: "Communication Success",
      description: "Configuration saved to port successfully.",
      type: "error",
    });
  };

  const [ports, setPorts] = createSignal<Port[]>([]);

  const getConfigFromFile = async (path: string) => {
    try {
      setRender(false);
      const file = (await fileHandler.readFile(
        path,
        configFormFileFormat(),
      )) as ConfigType;
      setFormData(file!, path);
      setRender(true);
      setPortId("");
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
      setRender(true);
      return;
    }
  };

  const getFromPort = async (portId: string) => {
    try {
      setRender(false);
      const config = await getConfigFromPort(portId);
      setConfigForm(config);
      setFilePath("");
      setTabName(portId);
      setOriginalFile(JSON5.parse(JSON5.stringify(config)));
      setRender(true);
      setPortId(portId);
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRender(true);
      return;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        "justify-content": "center",
        padding: "0.5rem",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        id={configTabProps.key}
        style={{
          height: "100%",
          width: `40% `,
          "min-width": "35rem",
          "border-radius": "0.2rem",
          "border-width": "1px",
        }}
        class={css({ borderColor: "gray.5" })}
      >
        <Stack
          direction="row"
          width="100%"
          height={topBarHeight}
          gap="0"
          background={"bg.muted"}
        >
          <div style={{ width: `calc(100% - 10rem)` }}>
            <For each={Object.keys(configTabForm())}>
              {(formatKey) => {
                return (
                  <Button
                    variant={"ghost"}
                    onClick={() =>
                      setFocusedTab(`${configTabProps.tabId}.${formatKey}`)
                    }
                    class={css({
                      borderRadius: "0",
                      fontSize: "0.8rem",
                      transition: "background ease-in-out 0.2s",
                      opacity:
                        getFocusedTab() ===
                        `${configTabProps.tabId}.${formatKey}`
                          ? "1"
                          : "0.5",
                      background:
                        getFocusedTab() ===
                        `${configTabProps.tabId}.${formatKey}`
                          ? "bg.default"
                          : "bg.muted",
                      padding: "1rem",
                      height:
                        getFocusedTab() ===
                        `${configTabProps.tabId}.${formatKey}`
                          ? `calc(100% + 1px)`
                          : "100%",
                    })}
                  >
                    {prettierLabel(formatKey)}
                  </Button>
                );
              }}
            </For>
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger
              width="min-content"
              height="min-content"
              style={{
                "border-right-width": "1px",
                "border-left-width": "1px",
              }}
              borderColor={"gray.5"}
            >
              <IconButton
                variant={"ghost"}
                onClick={() => setChangeUnit(!getChangeUnit())}
              >
                <Show when={getChangeUnit()} fallback={<IconRuler2Off />}>
                  <IconRuler2 />
                </Show>
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {"Change length and weight units"}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
          {/*Open file button */}
          <Menu.Root>
            <Menu.Trigger>
              <Tooltip.Root>
                <Tooltip.Trigger width="min-content" height="min-content">
                  <IconButton variant={"ghost"}>
                    <IconFileImport />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>{"Import File"}</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item
                  value={`${getTabId()}.openFile`}
                  onClick={async () => {
                    try {
                      const path = await fileHandler.openFileDialog("json5");
                      await getConfigFromFile(path);
                    } catch {
                      toaster.create({
                        title: "Invalid File Path",
                        description: "The file path is invalid.",
                        type: "error",
                      });
                      return;
                    }
                  }}
                >
                  {"Open File..."}
                </Menu.Item>
                <Show when={recentConfigFilePaths().length >= 1}>
                  <Menu.Root positioning={{ placement: "right-end" }}>
                    <Menu.TriggerItem>
                      <Text width={`calc(100% - 0.5rem)`}>
                        {"Open Recent Files..."}
                      </Text>
                      <IconChevronRight />
                    </Menu.TriggerItem>
                    <Show when={recentConfigFilePaths().length >= 1}>
                      <Menu.Positioner>
                        <Menu.Content>
                          <For each={recentConfigFilePaths()}>
                            {(filePath) => {
                              if (filePath.length < 1) return;
                              const parseFilePath = filePath
                                .replaceAll("\\", "/")
                                .split("/");
                              const fileName = parseFilePath.pop();
                              const restFilePath = parseFilePath
                                .slice(0 - 1)
                                .join("/");
                              return (
                                <Menu.Item
                                  value={filePath}
                                  onClick={async () =>
                                    await getConfigFromFile(filePath)
                                  }
                                >
                                  <div>
                                    <Text>{fileName}</Text>
                                    <Text size="xs" fontWeight="light">
                                      {restFilePath}
                                    </Text>
                                  </div>
                                </Menu.Item>
                              );
                            }}
                          </For>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Show>
                  </Menu.Root>
                </Show>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>

          <Tooltip.Root>
            <Tooltip.Trigger
              width="min-content"
              height={"min-content"}
              borderRightWidth="1px"
              borderColor="grey.5"
            >
              <IconButton
                variant={"ghost"}
                onClick={async () => await saveAsFile()}
              >
                <IconDeviceFloppy />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>{"Save as file"}</Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
          {/*Get from port */}
          <Menu.Root>
            <Menu.Trigger width="min-content" height={"min-content"}>
              <Tooltip.Root>
                <Tooltip.Trigger width="min-content" height={"min-content"}>
                  <IconButton
                    variant={"ghost"}
                    onClick={async () => {
                      const detectedPorts = await detectPort();
                      setPorts(detectedPorts);
                      if (ports().length === 1) {
                        await getFromPort(ports()[0].id);
                      } else if (ports().length === 0) {
                        toaster.create({
                          title: "Invalid Port",
                          description: "No port detected",
                          type: "error",
                        });
                      }
                    }}
                  >
                    <IconFileDownload />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>{"Get from port"}</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            </Menu.Trigger>
            <Show when={ports().length > 1}>
              <Menu.Positioner>
                <Menu.Content>
                  <For each={ports()}>
                    {(port) => {
                      return (
                        <Menu.Item
                          onClick={async () => await getFromPort(port.id)}
                          value={port.id}
                          display={"flex"}
                          flexDir={"column"}
                          textAlign={"left"}
                        >
                          <Text width="100%">{port.id}</Text>
                          <Text width="100%" fontWeight="light" size="xs">
                            {port.version}
                          </Text>
                        </Menu.Item>
                      );
                    }}
                  </For>
                </Menu.Content>
              </Menu.Positioner>
            </Show>
          </Menu.Root>

          {/* Save to port */}
          <Menu.Root>
            <Menu.Trigger width="min-content" height={"min-content"}>
              <Tooltip.Root>
                <Tooltip.Trigger width="min-content" height={"min-content"}>
                  <IconButton
                    variant={"ghost"}
                    onClick={async () => {
                      const detectedPorts = await detectPort();
                      setPorts(detectedPorts);
                      if (ports().length === 1) {
                        await saveToPort(ports()[0].id);
                      } else if (ports().length === 0) {
                        toaster.create({
                          title: "Invalid Port",
                          description: "No port detected",
                          type: "error",
                        });
                      }
                    }}
                  >
                    <IconSettingsShare />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>{"Save to port"}</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            </Menu.Trigger>
            <Show when={ports().length > 1}>
              <Menu.Positioner>
                <Menu.Content>
                  <For each={ports()}>
                    {(port) => {
                      return (
                        <Menu.Item
                          onClick={async () => await saveToPort(port.id)}
                          value={port.id}
                          display={"flex"}
                          flexDir={"column"}
                          textAlign={"left"}
                        >
                          <Text width="100%">{port.id}</Text>
                          <Text width="100%" fontWeight="light" size="xs">
                            {port.version}
                          </Text>
                        </Menu.Item>
                      );
                    }}
                  </For>
                </Menu.Content>
              </Menu.Positioner>
            </Show>
          </Menu.Root>
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
                  : getPortId() && getPortId()!.length > 0
                    ? `Get config from "${getPortId()}".`
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
                  : getPortId() && getPortId()!.length > 0
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
              height: `calc(100% - 2.5rem)`,
              "border-top-width": "1px",
              padding: "0 0.5rem 0.5rem 0.5rem",
            }}
            class={css({ borderColor: "gray.7" })}
          >
            <ConfigForm
              id={getTabId()}
              description={configDescription()}
              originalFile={getOriginalFile()}
              changeUnits={getChangeUnit() ? getChangeUnit() : undefined}
              focusedTab={getFocusedTab()}
              onFocustTabChange={(tabId) => setFocusedTab(tabId)}
              config={getConfigForm()!}
              linkedStatuses={getLinkedStatuses()!}
              accordionStatuses={getAccordionStatuses()!}
              gainLockStatuses={getGainLockStatuses()!}
              formOverflowY={getFormScrollTop()!}
            />
          </div>
        </Show>
      </div>
    </div>
  );
}
