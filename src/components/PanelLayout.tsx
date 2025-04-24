import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { tabLocation } from "./TabList.tsx";
import { createStore } from "solid-js/store";
import { createEffect, on, onMount } from "solid-js";

export type panelContext = {
  id: string;
  size: number;
};

export type panelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  size: panelContext[];
  onSizeChange?: (size: panelContext[]) => void;
  panelContext: object[];
  onPanelContextChange?: (newContext: object[]) => void;
};

export function PanelLayout(props: panelLayoutProps) {
  const [panels, setPanels] = createStore<object[]>(props.panelContext);
  const [panelSize, setPanelSize] = createStore<panelContext[]>(props.size);

  onMount(() => {
    if (panels.length === 0) {
      const uuid = getCryptoUUID();
      setPanels([
        {
          id: uuid,
          tabContext: [],
        },
      ]);
      setPanelSize([{ id: uuid, size: 100 }]);
    }
  });

  createEffect(
    on(
      () => panels.length,
      () => {
        const updatePanelSize: panelContext[] = panels.map((panel) => {
          return {
            id: panel["id" as keyof typeof panel],
            size: 100 / panels.length,
          };
        });
        setPanelSize(updatePanelSize);
      },
      { defer: true },
    ),
  );

  const splitTab = (
    location: tabLocation,
    index: number,
    draggedTab: object,
    panels: object[],
  ): object[] => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();
    const parseDraggedTab: object = Array.isArray(draggedTab)
      ? draggedTab[0]
      : draggedTab;
    const newPanel = {
      id: uuid,
      tabContext: draggedTab,
      focusedTab: parseDraggedTab["id" as keyof typeof parseDraggedTab],
    };
    const deleteDraggedTab = panels.map((panel, i) => {
      if (index !== i) return panel;
      else {
        const tabContext: object[] = panel["tabContext" as keyof typeof panel];
        const deleteTabIndex = tabContext
          .map((tab) => {
            return tab["id" as keyof typeof tab];
          })
          .indexOf(parseDraggedTab["id" as keyof typeof parseDraggedTab]);
        const updateTabContext: object[] = tabContext.filter(
          (_, i) => i !== deleteTabIndex,
        );
        const nextFocusTab: object =
          updateTabContext[
            deleteTabIndex >= updateTabContext.length
              ? deleteTabIndex - 1
              : deleteTabIndex
          ];
        const nextFocusTabId: string =
          nextFocusTab["id" as keyof typeof nextFocusTab];

        return {
          id: panel["id" as keyof typeof panel],
          tabContext: updateTabContext,
          focusedTab: nextFocusTabId,
        };
      }
    });
    const updatePanels = [
      ...deleteDraggedTab.slice(0, panelIndex),
      newPanel,
      ...deleteDraggedTab.slice(panelIndex),
    ];

    return updatePanels;
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  return (
    <>
      <Splitter.Root
        size={panelSize}
        gap="0.5"
        onSizeChange={(panelDetails) => {
          const parseSizeData = panelDetails.size.map((info) => {
            return { id: info.id.toString(), size: Number(info.size) };
          });
          props.onSizeChange?.(parseSizeData);
        }}
      >
        <For each={panels}>
          {(currentPanel, index) => {
            const panelId: string =
              currentPanel["id" as keyof typeof currentPanel];
            const prevPanel: object | null =
              index() === 0 ? null : props.panelContext[index() - 1];
            const prevPanelId =
              prevPanel === null
                ? ""
                : prevPanel["id" as keyof typeof prevPanel];
            return (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${prevPanelId}:${panelId}`}
                    width="4px"
                    padding="0"
                    opacity="0%"
                    transition="opacity 0.3s ease"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "100%")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
                  />
                </Show>
                <Splitter.Panel id={panelId}>
                  <Panel
                    id={panelId}
                    panelContext={currentPanel}
                    onSplitTab={(tabLocation: tabLocation, draggedTab) => {
                      if (
                        tabLocation === "leftSplitter" ||
                        tabLocation === "rightSplitter"
                      ) {
                        const updateTabs = splitTab(
                          tabLocation,
                          index(),
                          draggedTab,
                          props.panelContext,
                        );
                        setPanels(updateTabs);
                      }
                    }}
                  />
                </Splitter.Panel>
              </>
            );
          }}
        </For>
      </Splitter.Root>
    </>
  );
}
