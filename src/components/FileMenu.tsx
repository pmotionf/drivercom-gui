import { JSX } from "solid-js";
import { Menu } from "./ui/menu.tsx";
import { Button } from "./ui/styled/button.tsx";
import { IconChevronRight, IconX } from "@tabler/icons-solidjs";
import { For } from "solid-js/web";
import { Text } from "./ui/text.tsx";
import { IconButton } from "./ui/icon-button.tsx";

export type FileMenuProps = JSX.HTMLAttributes<HTMLDivElement> & {
  filePath: string;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  recentFiles: string[];
  onOpenRecentFile?: (path: string) => void;
  onDeleteRecentPath?: (index: number) => void;
  onReloadFile?: () => void;
  onSaveFile?: () => void;
};

export function FileMenu(props: FileMenuProps) {
  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger>
        {props.children ? (
          props.children
        ) : (
          <Button
            variant="outline"
            borderColor="bg.disabled"
            borderRadius="0.4rem"
          >
            File
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content width="8rem">
          <Menu.Item
            value="New"
            onClick={() => {
              props.onNewFile?.();
            }}
            userSelect="none"
          >
            New
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            value="Open"
            userSelect="none"
            onClick={() => props.onOpenFile?.()}
          >
            Open
          </Menu.Item>
          {props.recentFiles.length === 0 ? (
            <Menu.Item value="disabled recent" disabled>
              Open recent
            </Menu.Item>
          ) : (
            <Menu.Root positioning={{ placement: "right-end" }}>
              <Menu.TriggerItem>
                Open recent
                <IconChevronRight />
              </Menu.TriggerItem>

              <Menu.Positioner>
                <Menu.Content width="15rem">
                  <For each={props.recentFiles}>
                    {(filePath, index) => (
                      <Menu.Item
                        closeOnSelect={false}
                        paddingRight="0.5rem"
                        value={filePath}
                      >
                        <div
                          style={{
                            width: `calc(100% - 2rem)`,
                          }}
                          onClick={() => {
                            props.onOpenRecentFile?.(filePath);
                          }}
                        >
                          <Text
                            width="100%"
                            style={{
                              "white-space": "nowrap",
                              "text-overflow": "ellipsis",
                              display: "block",
                              overflow: "hidden",
                            }}
                          >
                            {filePath.match(/[^//]+$/)!.toString()}
                          </Text>
                          <Text
                            width="100%"
                            style={{
                              "white-space": "nowrap",
                              "text-overflow": "ellipsis",
                              display: "block",
                              overflow: "hidden",
                            }}
                            color="fg.disabled"
                          >
                            {filePath.replace(
                              filePath.match(/[^?!//]+$/)!.toString(),
                              "",
                            )}
                          </Text>
                        </div>
                        <IconButton
                          width="2rem"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            props.onDeleteRecentPath?.(index());
                          }}
                        >
                          <IconX />
                        </IconButton>
                      </Menu.Item>
                    )}
                  </For>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          )}
          <Menu.Separator />
          <Menu.Item
            value="Reload file"
            userSelect="none"
            onClick={() => props.onReloadFile?.()}
            disabled={props.filePath.length === 0}
          >
            Reload file
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            value="Save as file"
            userSelect="none"
            onClick={() => props.onSaveFile?.()}
          >
            Save as file
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
