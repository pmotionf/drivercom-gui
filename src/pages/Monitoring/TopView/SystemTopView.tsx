import { For } from "solid-js";
import { Lines, Systems } from "../Monitoring";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import { onMount, onCleanup } from "solid-js";
import Zoomist from "zoomist";
import "zoomist/css";
import { LineTopView } from "./LineTopView";

export type SystemTopViewProps = {
  line: Lines;
  system: Systems;
};

export type Direction = "column" | "row" | "column-reverse" | "row-reverse";

export type PositionStateStore = {
  line: string;
  isVertical: boolean;
  direction: Direction;
  positionX: number;
  positionY: number;
};

export const SystemTopView = (props: SystemTopViewProps) => {
  const lines = () => props.line;
  const system = () => props.system;

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  const [positionStateStore, setPositionStateStore] = createStore<
    PositionStateStore[]
  >(
    Array.from(lines()).map((line, i) => {
      return {
        line: line.name,
        isVertical: false,
        direction: "column",
        positionX: 0,
        positionY: i * (line.carrierWidth + 100),
      };
    }),
  );

  let containerRef: HTMLDivElement | undefined;
  let zoomistInstance: Zoomist | null = null;

  const linkedList: Map<string, string> = new Map();

  onMount(() => {
    if (containerRef) {
      zoomistInstance = new Zoomist(containerRef, {
        maxScale: 5,
        minScale: 0.5,
        initScale: 1,
        bounds: false,
        wheelable: true,
        draggable: true,
        zoomRatio: 0.1,
      });
    }
  });

  onCleanup(() => {
    zoomistInstance?.destroy();
  });

  return (
    <div
      ref={containerRef}
      class="zoomist-container"
      style={{ width: "100%", height: "100%" }}
      onDblClick={() => {
        if (zoomistInstance !== null) {
          zoomistInstance.reset();
        }
      }}
    >
      <div
        class="zoomist-wrapper"
        style={{ background: "transparent", position: "relative" }}
      >
        <div style={{ width: "100%", height: "100%" }} class="zoomist-image">
          <For each={lines()}>
            {(line, lineIndex) => {
              return (
                <>
                  <LineTopView
                    line={line}
                    system={system()[lineIndex()]}
                    positionStateStore={positionStateStore[lineIndex()]}
                    onStorePosition={(offsetX, offsetY) => {
                      setPositionStateStore(lineIndex(), "positionX", offsetX);
                      setPositionStateStore(lineIndex(), "positionY", offsetY);
                    }}
                    onRotate={() => {
                      setPositionStateStore(
                        lineIndex(),
                        "isVertical",
                        !positionStateStore[lineIndex()].isVertical,
                      );
                      setPositionStateStore(
                        lineIndex(),
                        "direction",
                        positionStateStore[lineIndex()].direction === "column"
                          ? "row"
                          : positionStateStore[lineIndex()].direction === "row"
                            ? "column-reverse"
                            : positionStateStore[lineIndex()].direction ===
                                "column-reverse"
                              ? "row-reverse"
                              : "column",
                      );
                    }}
                  />
                </>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
