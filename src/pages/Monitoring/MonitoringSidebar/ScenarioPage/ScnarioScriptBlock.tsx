import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
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

export function ScenarioScriptBlock(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    lineConfig: LineConfig[];
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
  },
) {
  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  const itemPadding = "1rem";
  const [showOverlay, setShowOverlay] = createSignal<boolean>(false);
  const [dragStarted, setDragStarted] = createSignal<boolean>(false);
  let commandRef: HTMLDivElement | undefined;
  const [obj] = createStore<ScenarioCommand>(props.command);

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

  return (
    <div
      ref={commandRef}
      class={css({
        display: "flex",
        width: "70rem",
        borderWidth : "0px 1px 1px 0px",
        padding: `${itemPadding}`,
        alignItems: "center",
        background: props.isRunning ? "gray.3" : "gray.1",
        zIndex: dragStarted() ? 10 : 1,
        gap: "0.5rem",
        userSelect: "none"
      })}
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
      }}
    >
      {obj.case === "mmcCommand" ? (
        <MmcCommandBlock
          command={obj.value.command}
          lineConfig={props.lineConfig}
        />
      ) : (
        <>
          <WaitCommandBlock waitCommand = {obj}/>
        </>
      )}
      <IconButton
        position="absolute"
        right={itemPadding}
        onClick={() => props.onCommandDelete?.()}
      >
        <IconX />
      </IconButton>
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
