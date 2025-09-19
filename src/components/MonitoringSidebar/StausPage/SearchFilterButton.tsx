import { Popover } from "~/components/ui/popover";
import { IconButton } from "~/components/ui/icon-button";
import { Stack } from "styled-system/jsx";
import { IconFilter2 } from "@tabler/icons-solidjs";
import { Button } from "~/components/ui/styled/button";
import { SearchBar } from "../SearchBar";
import { createSignal, on, Show } from "solid-js";
import { createEffect } from "solid-js";
import { TagsInputs } from "./TagsInput";

export type SearchFilterButtonType = {
  label: string;
  searchData: string[];
  onApply?: (tagInputs: string[]) => void;
};

export const SearchFilterButton = (props: SearchFilterButtonType) => {
  const [data, setData] = createSignal<string[]>(props.searchData);
  createEffect(
    on(
      () => props.searchData,
      () => {
        setData(props.searchData);
      },
    ),
  );

  const [tagInputs, setTagInputs] = createSignal<string[]>([]);
  return (
    <Popover.Root positioning={{ placement: "bottom-start" }}>
      <Popover.Trigger width="min-content">
        <IconButton size="xs" variant="ghost">
          <IconFilter2 />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content width="12rem" gap="0.5rem">
          <SearchBar
            data={data()}
            label={props.label}
            onCommit={(input) => {
              if (!tagInputs().includes(input)) {
                setTagInputs((prev) => [...prev, input]);
              }
            }}
          />
          <Show when={tagInputs().length > 0}>
            <TagsInputs
              value={tagInputs()}
              onValueChange={(inputs) => setTagInputs(inputs)}
            />
          </Show>
          <Stack width="100%" direction={"row-reverse"} gap="0.5rem">
            <Popover.CloseTrigger>
              <Button
                size="sm"
                padding="0em 0.5em 0em 0.5em"
                height="2em"
                marginRight="0.5rem"
                fontWeight={"medium"}
                onClick={() => {
                  props.onApply?.(tagInputs());
                  setTagInputs([]);
                }}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                padding="0em 0.5em 0em 0.5em"
                height="2em"
                fontWeight={"medium"}
              >
                Cancel
              </Button>
            </Popover.CloseTrigger>
          </Stack>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
};
