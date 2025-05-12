import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { TabLocation } from "./TabList.tsx";
import { onMount } from "solid-js";
import { panelContexts, tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { TabListContext } from "./TabList.tsx";
import { TabContext } from "./Tab.tsx";

export type PanelSizeContext = {
  id: string;
  size: number;
};

export type PanelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

export function PanelLayout(props: PanelLayoutProps) {
  if (!panelContexts.has(props.id)) return;

  const setPanelContext = (key: string, updateContext: PanelSizeContext[]) => {
    panelContexts.get(key)?.[1](updateContext);
  };
  const getPanelContext = (key: string): PanelSizeContext[] => {
    const panelContext = panelContexts.get(key)![0]();
    return panelContext;
  };

  onMount(() => {
    if (getPanelContext(props.id).length === 0) {
      const uuid = getCryptoUUID();
      setPanelContext(props.id, [{ id: uuid, size: 100 }]);
    }
  });

  const splitTab = (
    location: TabLocation,
    index: number,
    panels: PanelSizeContext[],
  ): { panelContext: PanelSizeContext[]; nextTabListId: string } => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();

    const currentLength = panels.length + 1;
    const newSize = 100 / currentLength;

    const newPanel: PanelSizeContext = {
      id: uuid,
      size: newSize,
    };

    const newSizePanels = panels.map((panel) => {
      return {
        id: panel.id,
        size: newSize,
      };
    });

    const updatePanels = [
      ...newSizePanels.slice(0, panelIndex),
      newPanel,
      ...newSizePanels.slice(panelIndex),
    ];
    return { panelContext: updatePanels, nextTabListId: newPanel.id };
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  return (
    <Splitter.Root
      size={getPanelContext(props.id)}
      gap="0.5"
      onSizeChange={(details: { size: object[] }) => {
        const parseDetails: PanelSizeContext[] = details.size.map((info) => {
          return {
            id: info["id" as keyof typeof info],
            size: info["size" as keyof typeof info],
          } as PanelSizeContext;
        });
        setPanelContext(props.id, parseDetails);
      }}
    >
      <For each={getPanelContext(props.id)}>
        {(currentPanel, index) => {
          return (
            <>
              <Show when={index() !== 0}>
                <Splitter.ResizeTrigger
                  id={`${
                    getPanelContext(props.id)[index() - 1].id
                  }:${currentPanel.id}`}
                  width="4px"
                  padding="0"
                  opacity="0%"
                  transition="opacity 0.3s ease"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "100%";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0%";
                  }}
                />
              </Show>
              <Splitter.Panel
                id={currentPanel.id}
                style={{ width: "100%", height: "100%" }}
              >
                <Panel
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  id={currentPanel.id}
                  index={index()}
                  onDeletePanel={() => {
                    const currentPanel = getPanelContext(props.id);
                    if (currentPanel.length > 1) {
                      setPanelContext(
                        props.id,
                        currentPanel.filter((_, i) => i !== index()),
                      );
                    }
                  }}
                  onSplitTab={(
                    tabLocation: TabLocation,
                    draggedTab,
                    mouseX,
                  ) => {
                    if (
                      tabLocation === "leftSplitter" ||
                      tabLocation === "rightSplitter"
                    ) {
                      const newSplit = splitTab(
                        tabLocation,
                        index(),
                        getPanelContext(props.id),
                      );
                      tabContexts.set(
                        newSplit.nextTabListId,
                        createStore<TabListContext>({
                          tabContext: [draggedTab] as TabContext[],
                          focusedTab: draggedTab.id,
                        }),
                      );
                      setPanelContext(props.id, newSplit.panelContext);
                    }

                    if (tabLocation === "otherPanel") {
                      let nextPanelIndex: number = 0;
                      getPanelContext(props.id).forEach((panel, i) => {
                        const panelElement = document.getElementById(
                          `${panel.id}`,
                        );

                        if (
                          panelElement!.offsetLeft < mouseX &&
                          mouseX <
                            panelElement!.offsetLeft + panelElement!.offsetWidth
                        ) {
                          nextPanelIndex = i;
                        }
                      });

                      const nextPanelId = getPanelContext(props.id)[
                        nextPanelIndex
                      ].id;
                      const prevTabContext = tabContexts.get(nextPanelId)?.[0];
                      tabContexts.get(nextPanelId)?.[1]("tabContext", [
                        ...prevTabContext!.tabContext,
                        draggedTab,
                      ]);
                      tabContexts.get(nextPanelId)?.[1](
                        "focusedTab",
                        draggedTab.id,
                      );
                    }
                  }}
                />
              </Splitter.Panel>
            </>
          );
        }}
      </For>
    </Splitter.Root>
  );
}
