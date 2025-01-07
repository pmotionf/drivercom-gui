import { IconX } from "@tabler/icons-solidjs";
import { createSignal, JSX, Show } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Editable } from "~/components/ui/editable";
import { IconButton } from "~/components/ui/icon-button";

export type TabEditableProps = JSX.HTMLAttributes<HTMLElement> & {
  tabName: string;
  onDelete?: () => void;
  onTabNameChange?: (tabName: string) => void;
};

/// Editable tab name inside tab.
export function TabEditable(props: TabEditableProps) {
  const [tabName, setTabName] = createSignal(props.tabName);

  return (
    <Editable.Root
      defaultValue={tabName()}
      onValueCommit={(v) => {
        setTabName(v.value);
        props.onTabNameChange?.(tabName());
      }}
      activationMode="dblclick"
      paddingTop="0.1rem"
    >
      <Stack direction={"row"}>
        <Editable.Area>
          <Editable.Input />
          <Editable.Preview />
        </Editable.Area>
        <Editable.Context>
          {(editable) => (
            <Editable.Control>
              <Show
                when={editable().editing}
                fallback={
                  <IconButton
                    variant="ghost"
                    size={"xs"}
                    onClick={() => {
                      props.onDelete?.();
                    }}
                    borderRadius="1rem"
                  >
                    <IconX />
                  </IconButton>
                }
              >
                <>
                  <Editable.CancelTrigger
                    asChild={(triggerProps) => (
                      <IconButton
                        {...triggerProps()}
                        variant="ghost"
                        size="xs"
                        borderRadius="1rem"
                      >
                        <IconX />
                      </IconButton>
                    )}
                  />
                </>
              </Show>
            </Editable.Control>
          )}
        </Editable.Context>
      </Stack>
    </Editable.Root>
  );
}
