import "./App.css";

import { invoke } from "@tauri-apps/api/core";
import {
  createEffect,
  createSignal,
  Index,
  on,
  onCleanup,
  onMount,
  Show,
  ValidComponent,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import type { RouteSectionProps } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";

import {
  IconChevronLeftPipe,
  IconDeviceAnalytics,
  IconDeviceDesktopSearch,
  IconFileSettings,
  IconGraph,
  IconMenu,
  IconMoonFilled,
  IconSunFilled,
} from "@tabler/icons-solidjs";

import {
  cliVersion,
  driverComVersion,
  globalState,
  GlobalStateContext,
  page,
  Pages,
  setCliVersion,
  setConfigFormFileFormat,
  setDriverComVersion,
  setGlobalState,
  setLogFormFileFormat,
  setLogStartConditionList,
  setLogStartCombinatorList,
  setPage,
  Theme,
  setConfigDescription,
  setConfigTabForm,
  setLogConfigDescription,
  setApiVersion,
  apiVersion,
  setRecentConfigFilePaths,
  setRecentLogFilePaths,
  setIpHistory,
  panelStore,
  pageKeys,
  tabStore,
} from "./store/GlobalState.ts";

import { Button } from "~/components/ui/button.tsx";
import { Drawer } from "~/components/ui/drawer.tsx";
import { SegmentGroup } from "~/components/ui/segment-group.tsx";
import { Text } from "~/components/ui/text.tsx";

import { Command } from "@tauri-apps/plugin-shell";
import { DownloadList } from "./components/DownloadList.tsx";
//@ts-ignore This file is generate after run compiler.
import api from "src-tauri/generated/api.json";
import JSON5 from "json5";
import { killTerminal } from "./services/MmcCliHandler.ts";
import { load } from "@tauri-apps/plugin-store";
import { IpAddress } from "./pages/Monitoring/System/IpHistory.tsx";
import { ConfigTuneType } from "src-tauri/generated/config/ConfigTune.tsx";
import { ConfigCalibrationType } from "src-tauri/generated/config/ConfigCalibration.tsx";
import { ConfigSystemType } from "src-tauri/generated/config/ConfigSystem.tsx";
import { LogConfigType } from "src-tauri/generated/config/LogConfigType.tsx";
import { ConfigType } from "src-tauri/generated/config/ConfigType.tsx";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  AccordionStates,
  GainLockStates,
  LinkStates,
} from "~/pages/Configuration/ConfigForm/ConfigForm.tsx";
import { TabContext } from "~/components/Tab/TabList.tsx";
import { FileHandler } from "./services/FileHandler.ts";

type PageMeta = {
  icon: ValidComponent;
  label: string;
  disabled: boolean;
};

function App(props: RouteSectionProps) {
  // Necessary for light/dark mode detection
  onMount(async () => {
    const prefers_dark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    let theme_str: Theme = prefers_dark ? "dark" : "light";

    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      theme_str = localStorage.getItem("theme")! as Theme;
    }

    document.documentElement.dataset.theme = theme_str;
    setGlobalState("theme", theme_str);

    detectApiVersion();
    await detectCliVersion();
    await buildEmptyLogConfiguration();
    await buildEmptyDriverConfiguration();
    await getLogStartCombinator();
    await getLogStartCondition();
    await getConfigDescription();
    await getLogConfigDescription();
    await prepareConfigTabFormat();
    await getStoreValues();
    await enableDropEvent();
  });

  async function detectCliVersion() {
    const drivercom = Command.sidecar("binaries/drivercom", ["version"]);
    const output = await drivercom.execute();
    const outputSplit = output.stdout.split(/\s/);

    const cliVersion = outputSplit[1];
    const drivercomVersion = outputSplit[3];

    setCliVersion(cliVersion);
    setDriverComVersion(drivercomVersion);
  }

  function detectApiVersion() {
    const findApi = /protobuf-api-/;
    const findApiIndex = api.findIndex(
      (version: object) =>
        "name" in version &&
        typeof version.name === "string" &&
        findApi.test(version.name),
    );

    const apiRegex = /[0-9]+\.[0-9]+\.[0-9]+$/;
    const apiVersionNum = api[findApiIndex].name.match(apiRegex);
    if (apiVersionNum) {
      setApiVersion(apiVersionNum[0]);
    }
  }

  async function buildEmptyLogConfiguration() {
    const logConfig = Command.sidecar("binaries/drivercom", [
      "log.config.empty",
    ]);
    const output = await logConfig.execute();
    const logFormatToJson: LogConfigType = JSON5.parse(output.stdout);
    setLogFormFileFormat(logFormatToJson);
  }

  async function buildEmptyDriverConfiguration() {
    const configEmpty = Command.sidecar("binaries/drivercom", ["config.empty"]);
    const output = await configEmpty.execute();
    const configFormatToJson: ConfigType = JSON5.parse(output.stdout);
    setConfigFormFileFormat(configFormatToJson);
  }

  async function getLogStartCondition() {
    const logStartCondition = Command.sidecar("binaries/drivercom", [
      `log.config.start.condition.list`,
    ]);
    const output = await logStartCondition.execute();
    const parseOutput = output.stdout
      .replaceAll("[", "")
      .replaceAll("]", "")
      .split(":");
    const startConditionList = parseOutput[1]
      .split(",")
      .filter((value) => value !== "\n");
    setLogStartConditionList(startConditionList);
  }

  async function getLogStartCombinator() {
    const logStartCombinator = Command.sidecar("binaries/drivercom", [
      `log.config.start.combinator.list`,
    ]);
    const output = await logStartCombinator.execute();
    const parseOutput = output.stdout
      .replaceAll("[", "")
      .replaceAll("]", "")
      .split(":");
    const startCombinatorList = parseOutput[1]
      .split(",")
      .filter((value) => value !== "\n");
    setLogStartCombinatorList(startCombinatorList);
  }

  async function getConfigDescription() {
    const configDesc = Command.sidecar("binaries/drivercom", [`config.info`]);
    const output = await configDesc.execute();
    const desc = JSON5.parse(output.stdout);
    setConfigDescription(desc);
  }

  async function getLogConfigDescription() {
    const configDesc = Command.sidecar("binaries/drivercom", [`log.info`]);
    const output = await configDesc.execute();
    const desc = JSON5.parse(output.stdout);
    setLogConfigDescription(desc);
  }

  async function getTuneConfig(): Promise<ConfigTuneType> {
    const getTuneConfig = Command.sidecar("binaries/drivercom", [
      `config.empty.tune`,
    ]);
    const output = await getTuneConfig.execute();
    const tuneConfig: ConfigTuneType = JSON5.parse(output.stdout);
    return tuneConfig;
  }

  async function getCalibrationConfig(): Promise<ConfigCalibrationType> {
    const getCalibrationConfig = Command.sidecar("binaries/drivercom", [
      `config.empty.calibration`,
    ]);
    const output = await getCalibrationConfig.execute();
    const calConfig: ConfigCalibrationType = JSON5.parse(output.stdout);
    return calConfig;
  }

  async function getSystemConfig(): Promise<ConfigSystemType> {
    const getSystemConfig = Command.sidecar("binaries/drivercom", [
      `config.empty.system`,
    ]);
    const output = await getSystemConfig.execute();
    const systemConfig: ConfigSystemType = JSON5.parse(output.stdout);
    return systemConfig;
  }

  async function prepareConfigTabFormat() {
    const tuneConfig = await getTuneConfig();
    const calConfig = await getCalibrationConfig();
    const systemConfig = await getSystemConfig();
    const config = {
      system: systemConfig,
      tune: tuneConfig,
      calibration: calConfig,
    };
    setConfigTabForm(config);
  }

  async function getStoreValues() {
    const store = await load("store.json", {
      defaults: {
        configFilePath: undefined,
        logFilePath: undefined,
        ipHistory: undefined,
      },
      autoSave: false,
    });
    const hasConfigRecentFiles = await store.has("configFilePath");
    if (hasConfigRecentFiles) {
      const getRecentConfigs: string[] = (await store.get(
        "configFilePath",
      )) as string[];
      setRecentConfigFilePaths(getRecentConfigs);
    }
    const hasLogRecentFiles = await store.has("logFilePath");
    if (hasLogRecentFiles) {
      const getRecentLogs: string[] = (await store.get(
        "logFilePath",
      )) as string[];
      setRecentLogFilePaths(getRecentLogs);
    }
    const hasIpHistory = await store.has("ipHistory");
    if (hasIpHistory) {
      const getIpHistory = (await store.get("ipHistory")) as IpAddress[];
      setIpHistory(getIpHistory);
    }
  }

  async function enableDropEvent() {
    await getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        if (event.payload.paths.length > 1) return;
        if (page() === Pages.LogViewer || page() === Pages.Configuration) {
          if (pageKeys.has(page())) {
            const panelKey = pageKeys.get(page());
            if (panelKey && panelStore.has(panelKey)) {
              const panels = panelStore.get(panelKey)![0]();
              let tabStoreKey = "";
              for (let i = 0; i < panels.length; i++) {
                const currentPanelId = panels[i].id;
                const element = document.getElementById(
                  `tabs:${currentPanelId}`,
                );

                if (element) {
                  const clientRect = element.getBoundingClientRect();
                  const top = clientRect.top;
                  const bottom = clientRect.bottom;
                  const left = clientRect.left;
                  const right = clientRect.right;
                  const clientPosition = event.payload.position;

                  if (top < clientPosition.y && clientPosition.y < bottom) {
                    if (left < clientPosition.x && clientPosition.x < right) {
                      tabStoreKey = currentPanelId;
                      break;
                    }
                  }
                }
              }

              if (tabStoreKey.length > 0) {
                const id = crypto.randomUUID();
                const tabName = event.payload.paths[0]
                  .replaceAll("\\", "/")
                  .match(/[^?!//]+$/!)!
                  .toString()
                  .split(".")
                  .shift();
                const filePath = event.payload.paths[0].replaceAll("\\", "/");

                let newTab: TabContext | null = null;

                if (tabStore.has(tabStoreKey)) {
                  if (page() === Pages.Configuration) {
                    if (!event.payload.paths[0].endsWith("json5")) return;
                    const accordionStatuses: AccordionStates = new Map();
                    const linkedStatuses: LinkStates = new Map();
                    const gainLockStatuses: GainLockStates = new Map();
                    const formOverflowY: Map<string, number> = new Map();
                    const file = new FileHandler();
                    const newForm = (await file.readFile(
                      event.payload.paths[0],
                    )) as ConfigType;

                    newTab = {
                      tab: {
                        id: id,
                        tabName: tabName!,
                      },
                      tabPage: {
                        configTabPage: {
                          filePath: filePath,
                          portId: "",
                          configForm: newForm,
                          configAccordionStatuses: accordionStatuses,
                          configLinkedStatuses: linkedStatuses,
                          configGainLockStatuses: gainLockStatuses,
                          formName: tabName,
                          originalFile: JSON5.parse(JSON5.stringify(newForm)),
                          formOverflowY: formOverflowY,
                        },
                        logViewerTabPage: null,
                      },
                    };
                  } else if (page() === Pages.LogViewer) {
                    if (!event.payload.paths[0].endsWith("csv")) return;
                    newTab = {
                      tab: {
                        id: id,
                        tabName: tabName!,
                      },
                      tabPage: {
                        logViewerTabPage: {
                          filePath: filePath,
                          plotSplitIndex: [],
                          plotContext: [],
                          plotXScale: [0, 0],
                        },
                        configTabPage: null,
                      },
                    };
                  }
                  if (newTab) {
                    const tabCtx = tabStore.get(tabStoreKey)!;
                    tabCtx[1]({
                      tabContext: [...tabCtx[0].tabContext, newTab],
                      focusedTab: newTab.tab.id,
                    });
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  const [version, setVersion] = createSignal("0.0.0");
  invoke("version").then((ver) => setVersion(ver as string));

  const navigate = useNavigate();

  const pages: { [url: string]: PageMeta } = {
    configuration: {
      icon: IconFileSettings,
      label: "Configuration",
      disabled: false,
    },
    logging: {
      icon: IconGraph,
      label: "Logging",
      disabled: false,
    },
    logViewer: {
      icon: IconDeviceAnalytics,
      label: "Log Viewer",
      disabled: false,
    },
    monitoring: {
      icon: IconDeviceDesktopSearch,
      label: "Monitoring",
      disabled: false,
    },
  };

  const sidebar_collapsed_width = "3rem";
  const sidebar_expanded_width = "18rem";

  const applyTheme = (theme: "light" | "dark") => {
    document.documentElement.dataset.theme = theme;
    setGlobalState("theme", theme);
    localStorage.setItem("theme", theme);
  };

  const toggleTheme = () => {
    applyTheme(globalState.theme === "light" ? "dark" : "light");
  };

  createEffect(
    on(
      () => page(),
      () => {
        if (page() !== Pages.None) {
          navigate("/" + page().toLowerCase(), {
            replace: true,
          });
        }
      },
      { defer: true },
    ),
  );

  onCleanup(async () => {
    await killTerminal();
  });

  return (
    <GlobalStateContext.Provider value={{ globalState, setGlobalState }}>
      <div
        style={{
          width: sidebar_collapsed_width,
          height: "100vh",
          position: "fixed",
        }}
      >
        <Drawer.Root variant="left">
          <Drawer.Trigger
            asChild={(triggerProps) => (
              <Button
                {...triggerProps()}
                style={{
                  "border-radius": "0px",
                  height: sidebar_collapsed_width,
                  width: "100%",
                  padding: "0px",
                }}
              >
                <IconMenu />
              </Button>
            )}
          />
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner
              style={{
                width: "30%",
                "max-width": sidebar_expanded_width,
                "min-width": "12rem",
              }}
            >
              <Drawer.Content>
                <Drawer.Header position="relative">
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "space-between",
                    }}
                  >
                    <Drawer.Title style={{ "padding-top": "0px" }}>
                      Drivercom
                    </Drawer.Title>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{
                        position: "absolute",
                        bottom: "0px",
                        right: "0px",
                        padding: "0px",
                      }}
                      onclick={toggleTheme}
                    >
                      <Show
                        when={globalState.theme === "dark"}
                        fallback={<IconSunFilled />}
                      >
                        <IconMoonFilled />
                      </Show>
                    </Button>
                  </div>
                  <Drawer.CloseTrigger
                    asChild={(closeProps) => (
                      <Button
                        {...closeProps()}
                        variant="ghost"
                        style={{
                          position: "absolute",
                          top: "0px",
                          right: "0px",
                          padding: "0px",
                        }}
                      >
                        <IconChevronLeftPipe />
                      </Button>
                    )}
                  />
                </Drawer.Header>
                <Drawer.Body
                  style={{
                    width: "100%",
                    "padding-top": "0.5em",
                    "padding-left": "0.5em",
                    "padding-right": "0px",
                    "padding-bottom": "0px",
                  }}
                >
                  <SegmentGroup.Root
                    value={page()}
                    onValueChange={(e) => {
                      if (e != null) {
                        setPage(e.value! as Pages);
                      }
                    }}
                    style={{ width: "98%" }}
                  >
                    <Index each={Object.keys(pages)}>
                      {(val) => (
                        <SegmentGroup.Item
                          value={val()}
                          style={{ width: "100%" }}
                          disabled={pages[val()].disabled}
                        >
                          <SegmentGroup.ItemText>
                            <span
                              style={{
                                float: "left",
                                "padding-right": "0.2em",
                              }}
                            >
                              <Dynamic component={pages[val()].icon} />
                            </span>
                            <span style={{ float: "left" }}>
                              {pages[val()].label}
                            </span>
                          </SegmentGroup.ItemText>
                          <SegmentGroup.ItemControl />
                          <SegmentGroup.ItemHiddenInput />
                        </SegmentGroup.Item>
                      )}
                    </Index>
                    <SegmentGroup.Indicator />
                  </SegmentGroup.Root>
                </Drawer.Body>
                <Drawer.Footer display="block" padding="0.5rem">
                  <div
                    id="versions-footer"
                    style={{
                      display: "grid",
                      "grid-template-columns": "6rem auto",
                    }}
                  >
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "padding-left": "0.5rem",
                        "grid-row": 1,
                        "grid-column": 1,
                      }}
                    >
                      <i>GUI Version:</i>
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "grid-row": 1,
                        "grid-column": 2,
                      }}
                    >
                      {version()}
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "padding-left": "0.5rem",
                        "grid-row": 2,
                        "grid-column": 1,
                      }}
                    >
                      <i>CLI Version:</i>
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "grid-row": 2,
                        "grid-column": 2,
                      }}
                    >
                      {cliVersion()}
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "padding-left": "0.5rem",
                        "grid-row": 3,
                        "grid-column": 1,
                      }}
                    >
                      <i>Lib Version:</i>
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "grid-row": 3,
                        "grid-column": 2,
                      }}
                    >
                      {driverComVersion()}
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "padding-left": "0.5rem",
                        "grid-row": 4,
                        "grid-column": 1,
                      }}
                    >
                      <i>API Version:</i>
                    </Text>
                    <Text
                      size="sm"
                      fontWeight="light"
                      color="{colors.gray.a10}"
                      style={{
                        "grid-row": 4,
                        "grid-column": 2,
                      }}
                    >
                      {apiVersion()}
                    </Text>
                  </div>
                  <Text
                    as="div"
                    size="sm"
                    fontWeight="light"
                    color="{colors.gray.a10}"
                    textAlign="center"
                    marginTop="0.5rem"
                  >
                    <i>{`Copyright © 2024-${new Date().getFullYear()} PMF, Inc.`}</i>
                  </Text>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
        <SegmentGroup.Root
          id="collapsed_side_bar"
          value={page()}
          onValueChange={(e) => {
            if (e != null) {
              setPage(e.value! as Pages);
            }
          }}
          style={{
            "padding-top": "0.5rem",
            position: "fixed",
            height: "100vh",
            width: sidebar_collapsed_width,
          }}
          background="{colors.gray.3}"
        >
          <Index each={Object.keys(pages)}>
            {(val) => (
              <SegmentGroup.Item
                value={val()}
                disabled={pages[val()].disabled}
                style={{
                  height: sidebar_collapsed_width,
                  width: "100%",
                  padding: "0px",
                  display: "flex",
                  "align-items": "center",
                }}
              >
                <Dynamic
                  component={pages[val()].icon}
                  size={30}
                  style={{
                    display: "block",
                    margin: "auto",
                  }}
                />
                <SegmentGroup.ItemControl />
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            )}
          </Index>
          <SegmentGroup.Indicator />
        </SegmentGroup.Root>
      </div>
      <div
        style={{
          height: "100vh",
          width: `calc(100vw - ${sidebar_collapsed_width})`,
          "margin-left": sidebar_collapsed_width,
          position: "fixed",
        }}
      >
        {props.children}
      </div>
      <Show when={page() !== Pages.None}>
        <DownloadList
          style={{ position: "absolute", right: "1rem", bottom: "1rem" }}
        />
      </Show>
    </GlobalStateContext.Provider>
  );
}

export default App;
