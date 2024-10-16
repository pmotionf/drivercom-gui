import "./App.css";

import { invoke } from "@tauri-apps/api/core";
import type { JSX } from "solid-js";
import { Index, createSignal, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import type { RouteSectionProps } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";

import {
  IconChevronLeftPipe,
  IconFileSettings,
  IconGraph,
  IconMenu,
} from "@tabler/icons-solidjs";

import { Button } from "~/components/ui/button";
import { Drawer } from "~/components/ui/drawer";
import { SegmentGroup } from "~/components/ui/segment-group";
import { Text } from "~/components/ui/text";

type PageMeta = {
  icon: () => JSX.Element;
  label: string;
};

function App(props: RouteSectionProps) {
  // Necessary for light/dark mode detection
  onMount(() => {
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme = prefersDarkScheme
      ? "dark"
      : "light";
  });

  const [version, setVersion] = createSignal("0.0.0");
  invoke("version").then((ver) => setVersion(ver as string));

  const [cliVersion, setCliVersion] = createSignal("0.0.0");

  const navigate = useNavigate();
  const pages: { [url: string]: PageMeta } = {
    configuration: {
      icon: () => <IconFileSettings />,
      label: "Configuration",
    },
    logging: {
      icon: () => <IconGraph />,
      label: "Logging",
    },
  };
  const [page, setPage] = createSignal("");

  const sidebar_collapsed_width = "3em";
  const sidebar_expanded_width = "18em";

  return (
    <>
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
                  margin: "0px",
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
              style={{ width: "30%", "max-width": sidebar_expanded_width }}
            >
              <Drawer.Content>
                <Drawer.Header>
                  <Drawer.Title style={{ "padding-top": "0px" }}>
                    Drivercom
                  </Drawer.Title>
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
                        >
                          <SegmentGroup.ItemText>
                            <span
                              style={{
                                float: "left",
                                "padding-right": "0.2em",
                              }}
                            >
                              {pages[val()].icon()}
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
            position: "fixed",
            height: "100vh",
            width: sidebar_collapsed_width,
          }}
          background="{colors.gray.3}"
        >
          <Index each={Object.keys(pages)}>
            {(val) => (
              <SegmentGroup.Item value={val()}>
                <SegmentGroup.ItemText>
                  {pages[val()].icon()}
                </SegmentGroup.ItemText>
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
    </>
  );
}

export default App;
