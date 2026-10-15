import { IconFileDownload } from "@tabler/icons-solidjs";
import { createSignal, For, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";
import { toaster } from "~/components/ui/toast.tsx";
import * as Menu from "~/components/ui/menu";
import { detectPort } from "~/services/PortService";
import { Portal } from "solid-js/web";
import { Port } from "~/store/GlobalState";

export function GetFromPortButton(props: {
  onGetFromPort: (portId: string) => void;
}) {
  const [ports, setPorts] = createSignal<Port[]>([]);

  return (
    <Menu.Root>
      <Menu.Trigger width="min-content" height={"min-content"}>
        <Tooltip content="Get from port">
          <IconButton
            size="xs"
            variant={"plain"}
            onClick={async () => {
              const detectedPorts = await detectPort();
              setPorts(detectedPorts);
              if (ports().length === 1) {
                props.onGetFromPort?.(ports()[0].id);
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
        </Tooltip>
      </Menu.Trigger>
      <Show when={ports().length > 1}>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <For each={ports()}>
                {(port) => {
                  return (
                    <Menu.Item
                      onClick={() => props.onGetFromPort?.(port.id)}
                      value={port.id}
                      display={"flex"}
                      flexDir={"column"}
                      textAlign={"left"}
                    >
                      <Text width="100%">{port.id}</Text>
                      <Text width="100%" fontWeight="light" textStyle="xs">
                        {port.version}
                      </Text>
                    </Menu.Item>
                  );
                }}
              </For>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Show>
    </Menu.Root>
  );
}
