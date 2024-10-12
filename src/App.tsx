import "./index.css";

import "./App.css";
import { createSignal, onMount } from "solid-js";
import logo from "./assets/logo.svg";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "~/components/ui/button";
import { Drawer } from "~/components/ui/drawer";

function App() {
  const [greetMsg, setGreetMsg] = createSignal("");
  const [name, setName] = createSignal("");

  // Necessary for light/dark mode detection
  onMount(() => {
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme = prefersDarkScheme
      ? "dark"
      : "light";
  });

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name: name() }));
  }

  return (
    <Drawer.Root variant="left">
      <Drawer.Trigger
        asChild={(triggerProps) => (
          <Button {...triggerProps()}>Open Drawer</Button>
        )}
      />
      <Drawer.Backdrop />
      <Drawer.Positioner style={{ width: "30%", "max-width": "18em" }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>PMF Drivercom</Drawer.Title>
            <Drawer.CloseTrigger
              asChild={(closeProps) => (
                <Button
                  {...closeProps()}
                  variant="ghost"
                  style={{ position: "absolute", top: "3px", right: "4px" }}
                >
                  X
                </Button>
              )}
            />
          </Drawer.Header>
          <Drawer.Body></Drawer.Body>
          <Drawer.Footer>
            <i>Copyright (c) 2024 PMF, Inc.</i>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}

export default App;
