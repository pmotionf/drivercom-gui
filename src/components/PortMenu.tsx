import { JSX } from "solid-js";
import { Menu } from "./ui/menu.tsx";
import { Button } from "./ui/styled/button.tsx";

export type PortMenuProps = JSX.HTMLAttributes<HTMLDivElement> & {
  disabled: boolean;
  onGetFromPort?: () => void;
  onSaveToPort?: () => void;
};

export function PortMenu(props: PortMenuProps) {
  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger disabled={props.disabled}>
        {props.children ? (
          props.children
        ) : (
          <Button disabled={props.disabled} variant="ghost">
            Port
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content width="8rem">
          <Menu.Item
            value="Get from port"
            userSelect="none"
            onClick={() => {
              props.onGetFromPort?.();
            }}
          >
            Get from port
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            value="Save to port"
            userSelect="none"
            onClick={() => {
              props.onSaveToPort?.();
            }}
          >
            Save to port
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
