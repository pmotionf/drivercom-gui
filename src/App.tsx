import "./App.css";

import { invoke } from "@tauri-apps/api/core";
import {
  createEffect,
  createSignal,
  Index,
  on,
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
  setEnumMappings,
  setEnumSeries,
  setGlobalState,
  setLogFormFileFormat,
  setLogStartConditionList,
  setLogStartCombinatorList,
  setPage,
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
    const drivercom = Command.sidecar("binaries/drivercom", ["version"]);
    const output = await drivercom.execute();
    const outputSplit = output.stdout.split(/\s/);

    const cliVersion = outputSplit[1];
    const drivercomVersion = outputSplit[3];

    setCliVersion(cliVersion);
    setDriverComVersion(drivercomVersion);
  }

  async function parseEnumMappings() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "log.util.list_code_names",
      "--compact",
    ]);
    const output = await drivercom.execute();

    const namedFieldsStr = "named fields:";
    const namedFieldsIndex = output.stdout.search(
      new RegExp(namedFieldsStr, "i"),
    );

    const namedFieldKindsStr = "named field kinds:";
    const namedFieldKindsIndex = output.stdout.search(
      new RegExp(namedFieldKindsStr, "i"),
    );

    const namedFieldsLine = output.stdout
      .slice(namedFieldsIndex + namedFieldsStr.length, namedFieldKindsIndex)
      .trim();
    const namedFieldKindsLines = output.stdout
      .slice(namedFieldKindsIndex + namedFieldKindsStr.length)
      .split("\n");

    const enumMappingsLines = namedFieldKindsLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line[0] == "[");

    const seriesMappings = namedFieldsLine
      .split(",")
      .filter((seriesChunk) => seriesChunk.length > 1)
      .map((e) => {
        return e.split(":");
      });
    setEnumSeries(
      seriesMappings.map((seriesMapping) => [
        seriesMapping[0], // Series name
        seriesMapping[1], // Series enum type name
      ]),
    );

    const enumTypeNames: string[] = enumMappingsLines.map((line) => {
      const closingBracketIndex = line.indexOf("]");
      return line.slice(1, closingBracketIndex);
    });

    const enumCodeMappings: [number, string][][] = enumMappingsLines.map(
      (line) => {
        const equalsIndex = line.indexOf("=");
        const mappingsString = line.slice(equalsIndex + 1);
        const mappingsList = mappingsString
          .split(",")
          .filter((mappingString) => mappingString.length > 0);
        const mappingsSplitList = mappingsList
          .map((mappingString) => mappingString.split(":"))
          .filter((mappingSplit) => mappingSplit.length == 2);
        return mappingsSplitList.map((mappingSplit) => [
          Number(mappingSplit[0]), // Enum integer code
          mappingSplit[1], // Enum name
        ]);
      },
    );

    setEnumMappings(
      enumTypeNames.map((enumTypeName, index) => [
        enumTypeName,
        enumCodeMappings[index],
      ]),
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
    const configEmpty = Command.sidecar("binaries/drivercom", ["config.empty"]);
    const output = await configEmpty.execute();
    const configFormatToJson = JSON.parse(output.stdout);
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
                  </div>
                  <Text
                    as="div"
                    size="sm"
                    fontWeight="light"
                    color="{colors.gray.a10}"
                    textAlign="center"
                    marginTop="0.5rem"
                  >
                    <i>Copyright © 2024 PMF, Inc.</i>
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
    </GlobalStateContext.Provider>
  );
}

export default App;
