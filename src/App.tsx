import "./App.css";

import { invoke } from "@tauri-apps/api/core";
import { createSignal, Index, onMount, Show, ValidComponent } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import type { RouteSectionProps } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";

import {
  IconChevronLeftPipe,
  IconDeviceAnalytics,
  IconFileSettings,
  IconGraph,
  IconMenu,
  IconMoonFilled,
  IconPlugConnected,
  IconPlugConnectedX,
  IconSunFilled,
} from "@tabler/icons-solidjs";

import {
  cliVersion,
  globalState,
  GlobalStateContext,
  portId,
  setCliVersion,
  setConfigFormFileFormat,
  setEnumMappings,
  setEnumSeries,
  setGlobalState,
  setLogFormFileFormat,
  setLogStartCoditionList,
  setLogStartCombinatorList,
  Theme,
} from "./GlobalState.ts";

import { Button } from "~/components/ui/button.tsx";
import { Drawer } from "~/components/ui/drawer.tsx";
import { SegmentGroup } from "~/components/ui/segment-group.tsx";
import { Text } from "~/components/ui/text.tsx";

import { Command } from "@tauri-apps/plugin-shell";

type PageMeta = {
  icon: ValidComponent;
  label: string;
  disabled: boolean;
};

function App(props: RouteSectionProps) {
  // Necessary for light/dark mode detection
  onMount(() => {
    const prefers_dark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    let theme_str: Theme = prefers_dark ? "dark" : "light";

    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      theme_str = localStorage.getItem("theme")! as Theme;
    }

    document.documentElement.dataset.theme = theme_str;
    setGlobalState("theme", theme_str);

    detectCliVersion();
    parseEnumMappings();
    buildEmptyLogConfiguration();
    buildEmptyDriverConfiguration();
    getLogStartCombinator();
    getLogStartCondition();
  });

  async function detectCliVersion() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "version",
    ]);
    const output = await drivercom.execute();
    setCliVersion(output.stdout);
  }

  async function parseEnumMappings() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "log.util.list_code_names",
      "--compact",
    ]);
    const output = await drivercom.execute();

    const outputLines = output.stdout.split("\n");
    const seriesMappingsLine = outputLines[0].trim();
    const enumMappingsLines = outputLines.slice(1).map((line) => line.trim())
      .filter((line) => line.length > 0 && line[0] == "[");

    const seriesMappings = seriesMappingsLine.split(",").filter((seriesChunk) =>
      seriesChunk.length > 0
    ).map((e) => {
      return e.split(":");
    });
    setEnumSeries(seriesMappings.map((seriesMapping) => [
      seriesMapping[0], // Series name
      seriesMapping[1], // Series enum type name
    ]));

    const enumTypeNames: string[] = enumMappingsLines.map((line) => {
      const closingBracketIndex = line.indexOf("]");
      return line.slice(1, closingBracketIndex);
    });

    const enumCodeMappings: [number, string][][] = enumMappingsLines.map(
      (line) => {
        const equalsIndex = line.indexOf("=");
        const mappingsString = line.slice(equalsIndex + 1);
        const mappingsList = mappingsString.split(",").filter((mappingString) =>
          mappingString.length > 0
        );
        const mappingsSplitList = mappingsList.map((mappingString) =>
          mappingString.split(":")
        ).filter((mappingSplit) => mappingSplit.length == 2);
        return mappingsSplitList.map((mappingSplit) => [
          Number(mappingSplit[0]), // Enum integer code
          mappingSplit[1], // Enum name
        ]);
      },
    );

    setEnumMappings(
      enumTypeNames.map((
        enumTypeName,
        index,
      ) => [enumTypeName, enumCodeMappings[index]]),
    );
  }

  async function buildEmptyLogConfiguration() {
    const logConfig = Command.sidecar("binaries/drivercom", [
      "log.config.empty",
    ]);
    const output = await logConfig.execute();
    const logFormatToJson = JSON.parse(output.stdout);
    setLogFormFileFormat(logFormatToJson);
  }

  async function buildEmptyDriverConfiguration() {
    const configEmpty = Command.sidecar("binaries/drivercom", [
      "config.empty",
    ]);
    const output = await configEmpty.execute();
    const configFormatToJson = JSON.parse(output.stdout);
    setConfigFormFileFormat(configFormatToJson);
  }

  async function getLogStartCondition() {
    const logStartCondition = Command.sidecar("binaries/drivercom", [
      `log.config.start.condition.list`,
    ]);
    const output = await logStartCondition.execute();
    const parseOutput = output.stdout.replaceAll("[", "").replaceAll("]", "")
      .split(":");
    const startConditionList = parseOutput[1].split(",").filter((value) =>
      value !== "\n"
    );
    setLogStartCoditionList(startConditionList);
  }

  async function getLogStartCombinator() {
    const logStartCombinator = Command.sidecar("binaries/drivercom", [
      `log.config.start.combinator.list`,
    ]);
    const output = await logStartCombinator.execute();
    const parseOutput = output.stdout.replaceAll("[", "").replaceAll("]", "")
      .split(":");
    const startCombinatorList = parseOutput[1].split(",").filter((value) =>
      value !== "\n"
    );
    setLogStartCombinatorList(startCombinatorList);
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
    connect: {
      icon: (iconProps) => (
        <Show
          when={portId().length > 0}
          fallback={<IconPlugConnectedX {...iconProps} />}
        >
          <IconPlugConnected {...iconProps} />
        </Show>
      ),
      label: "Connect",
      disabled: false,
    },
  };
  const [page, setPage] = createSignal("");

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
                <Drawer.Header position={"relative"}>
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
                      size={"sm"}
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
                      setPage(e.value);
                      navigate("/" + e.value.toLowerCase(), { replace: true });
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
                <Drawer.Footer display={"block"} padding={"0.5rem"}>
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
                  </div>
                  <Text
                    as="div"
                    size="sm"
                    fontWeight="light"
                    color="{colors.gray.a10}"
                    textAlign={"center"}
                    marginTop={"0.5rem"}
                  >
                    <i>Copyright © 2024 PMF, Inc.</i>
                  </Text>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
        <SegmentGroup.Root
          value={page()}
          onValueChange={(e) => {
            setPage(e.value);
            navigate("/" + e.value.toLowerCase(), { replace: true });
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
          width: "calc(100vw - {sidebar_collapsed_width})",
          "margin-left": sidebar_collapsed_width,
        }}
      >
        {props.children}
      </div>
    </GlobalStateContext.Provider>
  );
}

export default App;
