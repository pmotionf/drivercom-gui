import { IconSettingsShare } from "@tabler/icons-solidjs";
import { createSignal, For, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";
import { toaster } from "~/components/ui/toast.tsx";
import * as Menu from "~/components/ui/menu";
import { detectPort, Port } from "~/services/PortService";

export function SaveToPort(props: { onSaveToPort: (portId: string) => void }) {
  const [ports, setPorts] = createSignal<Port[]>([]);

  return (
    <Menu.Root>
      <Menu.Trigger width="min-content" height={"min-content"}>
        <Tooltip content="Save to port">
          <IconButton
            variant={"plain"}
            size="xs"
            onClick={async () => {
              const detectedPorts = await detectPort();
              setPorts(detectedPorts);
              if (ports().length === 1) {
                props.onSaveToPort(ports()[0].id);
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
        </Tooltip>
      </Menu.Trigger>
      <Show when={ports().length > 1}>
        <Menu.Positioner>
          <Menu.Content>
            <For each={ports()}>
              {(port) => {
                return (
                  <Menu.Item
                    onClick={() => props.onSaveToPort?.(port.id)}
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
      </Show>
    </Menu.Root>
  );
}
