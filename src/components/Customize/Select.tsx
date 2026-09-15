import { ListCollection } from "@ark-ui/solid";
import { For, JSX } from "solid-js";
import { Portal } from "solid-js/web";
import * as ParkUiSelect from "~/components/ui/select";

export function Select(props: {
  listCollection: ListCollection<{ label: string; value: string }>;
  style?: JSX.CSSProperties;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <ParkUiSelect.Root
      style={props.style}
      collection={props.listCollection}
      value={[props.value ?? ""]}
      onValueChange={(e) => {
        props.onValueChange?.(e.value.toString());
      }}
    >
      <ParkUiSelect.HiddenSelect />
      <ParkUiSelect.Control>
        <ParkUiSelect.Trigger>
          <ParkUiSelect.ValueText placeholder="Select Line" />
          <ParkUiSelect.IndicatorGroup>
            <ParkUiSelect.Indicator />
          </ParkUiSelect.IndicatorGroup>
        </ParkUiSelect.Trigger>
      </ParkUiSelect.Control>
      <Portal>
        <ParkUiSelect.Positioner>
          <ParkUiSelect.Content>
            <For each={props.listCollection.items}>
              {(item) => (
                <ParkUiSelect.Item item={item}>
                  {item.label}
                  <ParkUiSelect.ItemIndicator />
                </ParkUiSelect.Item>
              )}
            </For>
          </ParkUiSelect.Content>
        </ParkUiSelect.Positioner>
      </Portal>
    </ParkUiSelect.Root>
  );
}
