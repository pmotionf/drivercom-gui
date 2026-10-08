import { createSignal } from "solid-js";
import { createDraggable } from "@neodrag/solid";
import { Show, For } from "solid-js";
import { Portal, Dynamic } from "solid-js/web";
import { prettierLabel } from "~/utils/PrettierLabel";
import { css } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { IconGripVertical } from "@tabler/icons-solidjs";

export type CommandListProps = {
  commandsList: string[];
  dragDisabled?: boolean;
  onDragStart?: () => void;
  onDrag?: (clientX: number, clientY: number) => void;
  onDragEnd?: (clientX: number, clientY: number, command: string) => void;
};

export const ScriptList = (props: CommandListProps) => {
  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  // This signal is used to refresh the component.
  // `@neodrag` only handles drag event, so after  a drag ends the component
  // stays where it was dropped. Refreshing it moves it back to its original position.
  const [render, setRender] = createSignal<boolean>(true);

  const [overlayClientX, setoverlayClientX] = createSignal<number | null>(null);
  const [overlayClientY, setoverlayClientY] = createSignal<number | null>(null);
  const [overlayWidth, setOverlayWidth] = createSignal<number | null>(null);
  const [overlayHeight, setOverlayHeight] = createSignal<number | null>(null);
  const [overlayText, setOvelayText] = createSignal<string | null>(null);

  // Offset so the drag overlay doesn't sit directly under the cursor
  // (clientX/clientY point to the exact cursor position).
  const [overlayXGap, setOverlayXGap] = createSignal<number | null>(null);
  const [overlayYGap, setOverlayYGap] = createSignal<number | null>(null);

  // This variables make the overlay component use the same colors as components.
  const hoverBackgroundColor = "gray.3";
  const hoverColor = "fg.default";

  return (
    <Show when={render()}>
      <For each={props.commandsList}>
        {(command) => {
          const label = prettierLabel(command.replace("CARRIER_STATE", "WAIT"));
          return (
            <div
              class={css({
                userSelect: "none",
                display: "flex",
                padding: "0.3rem 0.5rem 0.3rem 0rem",
                borderRadius: "0.3rem",
                background: "transparent",
                cursor: "grab",
                alignItems: "center",
                fontSize: "md",
                color: "fg.muted",
                _hover: {
                  background: hoverBackgroundColor,
                  color: hoverColor,
                },
              })}
              use:dragOptions={{
                bounds: "body",
                disabled: props.dragDisabled,
                onDragStart: (data) => {
                  props.onDragStart?.();
                  const clientX = data.event.clientX;
                  const clientY = data.event.clientY;
                  const rect = data.currentNode.getBoundingClientRect();

                  setOverlayWidth(rect.width);
                  setOverlayHeight(rect.height);
                  // Store the offset only once,  when the drag starts.
                  setOverlayXGap(clientX - rect.left);
                  setOverlayYGap(clientY - rect.top);
                },
                onDrag: (data) => {
                  const clientX = data.event.clientX;
                  const clientY = data.event.clientY;

                  setoverlayClientX(clientX - (overlayXGap() ?? 0));
                  setoverlayClientY(clientY - (overlayYGap() ?? 0));
                  setOvelayText(label);
                  props.onDrag?.(clientX, clientY);
                },
                onDragEnd: (data) => {
                  setoverlayClientX(null);
                  setoverlayClientY(null);
                  setOvelayText(null);
                  setRender(false);
                  const clientX = data.event.clientX;
                  const clientY = data.event.clientY;
                  props.onDragEnd?.(clientX, clientY, command);
                  setRender(true);
                },
              }}
            >
              <div style={{ width: "1rem" }}>
                <Dynamic
                  class={css({
                    width: "1rem",
                    color: "gray.7",
                  })}
                  component={!props.dragDisabled ? IconGripVertical : undefined}
                />
              </div>

              <Text fontSize={"1rem"}>{label}</Text>
            </div>
          );
        }}
      </For>
      {/*
        The component can't be dragged outside its parent, so the overlay
        gives the user a clear visual of where it's being moved.
      */}
      <Show when={overlayClientX() && overlayClientY() && overlayText()}>
        <Portal>
          <div
            class={css({
              userSelect: "none",
              display: "flex",
              padding: "0.3rem 0.5rem 0.3rem 0rem",
              borderRadius: "0.3rem",
              cursor: "grabbing",
              background: hoverBackgroundColor,
              alignItems: "center",
              fontSize: "md",
              color: hoverColor,
              position: "absolute",
            })}
            style={{
              top: `${overlayClientY() ?? 0}px`,
              left: `${overlayClientX() ?? 0}px`,
              width: `${overlayWidth() ?? 0}px`,
              height: `${overlayHeight() ?? 0}px`,
            }}
          >
            <Dynamic
              class={css({
                width: "1rem",
                color: "gray.7",
              })}
              component={IconGripVertical}
            />
            <Text fontSize={"1rem"}>{overlayText()!}</Text>
          </div>
        </Portal>
      </Show>
    </Show>
  );
};
