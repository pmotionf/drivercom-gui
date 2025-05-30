import { Button } from "~/components/ui/styled/button.tsx";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { createSignal } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import { createStore } from "solid-js/store";
import { For } from "solid-js/web";
import { Accordion } from "~/components/ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { connect, disconnect } from "@kuyoonjo/tauri-plugin-tcp";
import { onCleanup } from "solid-js";

export type SystemConfig = {
  line: string;
};

function Monitoring() {
  const pageId = crypto.randomUUID();
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  const [systemConfig, setSystemConfig] = createStore<SystemConfig[]>(
    [] as SystemConfig[],
  );
  const inputValues: Map<string, string> = new Map();

  const [inputRender, setInputRender] = createSignal<boolean>(true);
  const refreshInput = () => {
    setInputRender(false);
    setInputRender(true);
  };

  const [isServerConnect, setIsServerConnect] = createSignal<boolean>(false);

  onCleanup(() => {
    disconnect(pageId);
  });

  return (
    <Splitter.Root
      size={[
        { id: `${pageId}-panel`, size: panelSize() },
        {
          id: `${pageId}-sidebar`,
          size: 100 - panelSize(),
        },
      ]}
      onSizeChange={(details) => {
        if (typeof details.size[0].size === "number") {
          setPanelSize(details.size[0].size);
        }
      }}
      gap="0"
      width="100%"
      height="100%"
    >
      <Splitter.Panel
        id={`${pageId}-panel`}
        borderWidth="0"
        backgroundColor="transparent"
      >
        <Accordion.Root
          width="100%"
          height="100%"
          padding="1rem"
          paddingTop="1rem"
          multiple
        >
          <For each={systemConfig}>
            {(config) => (
              <Accordion.Item value={config.line}>
                <Accordion.ItemTrigger>
                  {config.line}
                  <Accordion.ItemIndicator>
                    <ChevronDownIcon />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>Example</Accordion.ItemContent>
              </Accordion.Item>
            )}
          </For>
        </Accordion.Root>
      </Splitter.Panel>

      {/* Resize trigger */}
      <IconButton
        size="sm"
        variant="ghost"
        onClick={() => setShowSideBar(!showSideBar())}
        position="absolute"
        right="0.5rem"
      >
        <Show when={!showSideBar()} fallback={<IconChevronRightPipe />}>
          <IconChevronLeftPipe />
        </Show>
      </IconButton>

      {/* Side bar */}
      <Show when={showSideBar()}>
        <Splitter.ResizeTrigger
          id={`${pageId}-panel:${pageId}-sidebar`}
          class={css({ borderInlineColor: "bg.default" })}
          style={{
            width: "1px",
            "border-radius": "0",
            padding: "0",
            margin: "0",
            "border-inline-width": "2px",
          }}
        />
      </Show>

      <Show when={showSideBar()}>
        <Splitter.Panel
          minWidth="18rem"
          id={`${pageId}-sidebar`}
          borderWidth="0"
          backgroundColor="transparent"
        >
          <Stack direction="column" width="100%" height="100%">
            <Stack
              width="100%"
              borderBottomWidth="2px"
              padding="1rem"
              direction="column"
            >
              {/* Line Area */}
              <Text fontWeight="bold" size="lg">
                Line
              </Text>
              <Stack direction="row" width="100%">
                <Text
                  size="sm"
                  width="20%"
                  color="fg.muted"
                  marginRight="0.5rem"
                  marginTop="0.4rem"
                >
                  ID
                </Text>
                <Stack
                  background="bg.muted"
                  width="80%"
                  borderRadius="0.5rem"
                  height="2rem"
                >
                  <Show when={inputRender()}>
                    <input
                      value={inputValues.get("lineID")
                        ? inputValues.get("lineID")
                        : ""}
                      onInput={(e) => inputValues.set("lineID", e.target.value)}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        outline: "none",
                        "white-space": "nowrap",
                        overflow: "hidden",
                        display: "block",
                        "text-overflow": "ellipsis",
                        "padding-left": "0.5rem",
                      }}
                    />
                  </Show>
                </Stack>
              </Stack>
              <Button
                onClick={() => {
                  const lineID = inputValues.get("lineID");
                  if (typeof lineID === "string") {
                    const lines = systemConfig.map((config) => config.line);
                    if (lines.includes(lineID)) {
                      // Need error message
                      return;
                    }
                    setSystemConfig([...systemConfig, { line: lineID }]);
                  }
                  inputValues.set("lineID", "");
                  refreshInput();
                }}
              >
                Save
              </Button>
            </Stack>
            {/* Connect Area */}
            <Stack padding="1rem" width="100%" borderBottomWidth="2px">
              <Text size="lg" fontWeight="bold">
                Connect
              </Text>
              <Stack direction="row" width="100%">
                <Stack width="50%">
                  <Text
                    size="sm"
                    width="100%"
                    color="fg.muted"
                    marginTop="0.4rem"
                  >
                    IP
                  </Text>
                  <Stack
                    background="bg.muted"
                    width="100%"
                    borderRadius="0.5rem"
                    height="2rem"
                  >
                    <input
                      value={inputValues.get("IP") ? inputValues.get("IP") : ""}
                      onInput={(e) => {
                        if (typeof e.target.value === "string") {
                          inputValues.set("IP", e.target.value);
                        }
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        outline: "none",
                        "white-space": "nowrap",
                        overflow: "hidden",
                        display: "block",
                        "text-overflow": "ellipsis",
                        "padding-left": "0.5rem",
                      }}
                    />
                  </Stack>
                </Stack>
                <Stack width="50%">
                  <Text
                    size="sm"
                    width="100%"
                    color="fg.muted"
                    marginRight="0.5rem"
                    marginTop="0.4rem"
                  >
                    Port
                  </Text>
                  <Stack
                    background="bg.muted"
                    width="100%"
                    borderRadius="0.5rem"
                    height="2rem"
                  >
                    <input
                      value={inputValues.get("port")
                        ? inputValues.get("port")
                        : ""}
                      onInput={(e) => {
                        if (typeof e.target.value === "string") {
                          inputValues.set("port", e.target.value);
                        }
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        outline: "none",
                        "white-space": "nowrap",
                        overflow: "hidden",
                        display: "block",
                        "text-overflow": "ellipsis",
                        "padding-left": "0.5rem",
                      }}
                    />
                  </Stack>
                </Stack>
              </Stack>
              <Button
                variant={isServerConnect() ? "outline" : "solid"}
                onClick={async () => {
                  if (isServerConnect()) {
                    disconnect(pageId);
                    setIsServerConnect(false);
                    return;
                  }
                  const serverIp = inputValues.get("IP");
                  const port = inputValues.get("port");

                  if (typeof serverIp == "string" && typeof port == "string") {
                    const address = `${serverIp}:${port}`;
                    try {
                      await connect(pageId, address);
                      setIsServerConnect(true);
                    } catch {
                      // Need Error Message
                      return;
                    }
                  }
                }}
              >
                {isServerConnect() ? "Cancel" : "Connect"}
              </Button>
            </Stack>
          </Stack>
        </Splitter.Panel>
      </Show>
    </Splitter.Root>
  );
}

export default Monitoring;
