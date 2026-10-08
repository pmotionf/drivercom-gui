import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  Show,
  splitProps,
} from "solid-js";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { css } from "styled-system/css";

import { LineConfig } from "../../Monitoring";
import { ScenarioCommand } from "../ScenarioPage";
import { MmcCommandBlock } from "./MmcCommandBlock";
import { WaitCommandBlock } from "./WaitCommandBlock";
import { Text } from "~/components/ui/text";
import { createListCollection } from "@ark-ui/solid";

// Scenario page code block component
export function ScenarioScriptBlock(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    lineConfig: LineConfig[];
    commandIndex: number;
    command: ScenarioCommand;
    isRunning: boolean;
    onCommandDelete?: () => void;
    onDragStart?: () => void;
    onCommandDrag?: (clientX: number | null, clientY: number | null) => void;
    onDragEnd?: () => void;
    isCommandDragging?: boolean;
    dragPosition?: { clientX: number; clientY: number };
    onDragEnter?: () => void;
    onDragLeave?: () => void;
    dragDisabled?: boolean;
  },
) {
  const [, rest] = splitProps(props, [
    "lineConfig",
    "command",
    "isRunning",
    "onCommandDelete",
    "onDragStart",
    "onCommandDrag",
    "onDragEnd",
    "isCommandDragging",
    "dragPosition",
    "onDragEnter",
    "onDragLeave",
  ]);
  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  const [showOverlay, setShowOverlay] = createSignal<boolean>(false);
  const [dragStarted, setDragStarted] = createSignal<boolean>(false);
  let commandRef: HTMLDivElement | undefined;
  const [obj] = createStore<ScenarioCommand>(props.command);

  const lineNames = props.lineConfig.map((config, i) => {
    return { label: config.name, value: (i + 1).toString() };
  });
  const lineNamesCollection = createListCollection({ items: lineNames });

  createEffect(
    on(
      () => props.dragPosition,
      () => {
        if (dragStarted()) return;
        if (!props.dragPosition) {
          setShowOverlay(false);
          return;
        }
        if (!commandRef) return;

        const clientX = props.dragPosition.clientX;
        const clientY = props.dragPosition.clientY;

        const clientRect = commandRef.getBoundingClientRect();
        const top = clientRect.top;
        const bottom = clientRect.bottom;
        const left = clientRect.left;
        const right = clientRect.right;

        if (left < clientX && clientX < right) {
          if (top < clientY && clientY < bottom) {
            setShowOverlay(true);
            return;
          }
        }
        setShowOverlay(false);
      },
    ),
  );

  createMemo(() => {
    const dragEnter = showOverlay();
    if (dragEnter) {
      props.onDragEnter?.();
    } else {
      props.onDragLeave?.();
    }
  });

  const [showDeleteButton, setShowDeleteButton] = createSignal<boolean>(false);

  return (
    <div
      {...rest}
      ref={commandRef}
      class={css({
        display: "flex",
        width: "100%",
        minWidth: "57rem",
        borderWidth: props.isRunning ? "1px" : "0px 0px 1px 0px",
        borderColor: props.isRunning ? "accent.8" : "border",
        borderRadius: props.isRunning ? "sm" : 0,
        padding: `0.5rem`,
        alignItems: "center",
        zIndex: dragStarted() ? 10 : 1,
        gap: "0.5rem",
        fontSize: "md",
        _hover: {
          background: "gray.1",
        },
        boxShadow: props.isRunning ? "md" : "0",
      })}
      onMouseEnter={() => {
        setShowDeleteButton(true);
      }}
      onMouseLeave={() => {
        setShowDeleteButton(false);
      }}
      use:dragOptions={{
        onDragStart: () => {
          setDragStarted(true);
          props.onDragStart?.();
        },
        onDrag: (e) => {
          props.onCommandDrag?.(e.event.clientX, e.event.clientY);
        },
        onDragEnd: () => {
          props.onDragEnd?.();
          setDragStarted(false);
          props.onCommandDrag?.(null, null);
        },
        disabled: props.dragDisabled,
      }}
    >
      <Text>{(props.commandIndex + 1).toString()}</Text>
      {obj.case === "mmcCommand" ? (
        <MmcCommandBlock
          command={obj.value.command}
          lineConfig={props.lineConfig}
        />
      ) : (
        <>
          <WaitCommandBlock
            waitCommand={obj}
            lineNameCollection={lineNamesCollection}
          />
        </>
      )}
      <div
        style={{ flex: 1, display: "flex", "flex-direction": "row-reverse" }}
      >
        <Show when={showDeleteButton()}>
          <IconButton
            variant={"plain"}
            size="sm"
            onClick={() => props.onCommandDelete?.()}
          >
            <IconX />
          </IconButton>
        </Show>
      </div>

      <div
        id={"overlay"}
        class={css({
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "gray.9",
          opacity: showOverlay() ? 0.5 : 0,
          pointerEvents: "none",
          transition: "opacity ease-in-out 0.2s",
        })}
      />
    </div>
  );
}
