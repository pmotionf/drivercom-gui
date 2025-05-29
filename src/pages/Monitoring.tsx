import { onMount } from "solid-js";
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

function Monitoring() {
  const pageId = crypto.randomUUID();
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  onMount(() => {
    /*const client = crypto.randomUUID();
    const host = "192.168.0.7";
    const port = 9001;

    const ser = handler(host, port);
    console.log(ser);

    const con = await connect(client, `${host}:${port}`);
    console.log(con);
    await listen((x) => {
      console.log(x.payload!.event!.message!.data);
    });*/
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
    >
      <Splitter.Panel
        id={`${pageId}-panel`}
        borderWidth="0"
        backgroundColor="transparent"
      >
      </Splitter.Panel>
      <Stack direction="row" gap="0">
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => setShowSideBar(!showSideBar())}
        >
          <Show when={!showSideBar()} fallback={<IconChevronRightPipe />}>
            <IconChevronLeftPipe />
          </Show>
        </IconButton>
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
      </Stack>

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
                  <input
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
              <Button>Save</Button>
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
              <Button>Connect</Button>
            </Stack>
          </Stack>
        </Splitter.Panel>
      </Show>
    </Splitter.Root>
  );
}

export default Monitoring;
