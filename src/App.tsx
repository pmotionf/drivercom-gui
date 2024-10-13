import "./App.css";

import { Index, createSignal, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";

import { IconMenu, IconChevronLeftPipe } from "@tabler/icons-solidjs";

import { Button } from "~/components/ui/button";
import { Drawer } from "~/components/ui/drawer";
import { SegmentGroup } from "~/components/ui/segment-group";
import { Text } from "~/components/ui/text";

function App(props) {
  // Necessary for light/dark mode detection
  onMount(() => {
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme = prefersDarkScheme
      ? "dark"
      : "light";
  });

  const navigate = useNavigate();
  const pages = ["Configuration", "Logging"];
  const [page, setPage] = createSignal("");

  return (
    <>
      <Drawer.Root variant="left">
        <Drawer.Trigger
          asChild={(triggerProps) => (
            <Button {...triggerProps()}>
              <IconMenu />
            </Button>
          )}
        />
        <Drawer.Backdrop />
        <Drawer.Positioner style={{ width: "30%", "max-width": "18em" }}>
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
                <Index each={pages}>
                  {(val) => (
                    <SegmentGroup.Item value={val()} style={{ width: "100%" }}>
                      <SegmentGroup.ItemText>{val()}</SegmentGroup.ItemText>
                      <SegmentGroup.ItemControl />
                      <SegmentGroup.ItemHiddenInput />
                    </SegmentGroup.Item>
                  )}
                </Index>
                <SegmentGroup.Indicator />
              </SegmentGroup.Root>
            </Drawer.Body>
            <Drawer.Footer>
              <Text
                as="span"
                size="s"
                fontWeight="light"
                color="{colors.gray.a8}"
              >
                <i>Copyright © 2024 PMF, Inc.</i>
              </Text>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
      {props.children}
    </>
  );
}

export default App;
