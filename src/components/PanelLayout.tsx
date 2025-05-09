import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { tabLocation } from "./TabList.tsx";
import { createStore } from "solid-js/store";
import { createEffect, createSignal, onMount } from "solid-js";
import { tabContext } from "./TabList.tsx";

export type panelSizeContext = {
  id: string;
  size: number;
};

export type panelContext = {
  id: string;
  tabContext: tabContext[];
  focusedTab?: string;
};

export type panelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  size: panelSizeContext[];
  onSizeChange?: (size: panelSizeContext[]) => void;
  panelContext: panelContext[];
  onPanelContextChange?: (newContext: object[]) => void;
};

export function PanelLayout(props: panelLayoutProps) {
  const [panels, setPanels] = createStore<panelContext[]>(props.panelContext);

  onMount(() => {
    if (panels.length === 0) {
      const uuid = getCryptoUUID();
      setPanels([
        {
          id: uuid,
          tabContext: [],
        },
      ]);
      props.onSizeChange?.([{ id: uuid, size: 100 }]);
    }
  });

  createEffect(() => {
    const tabList = panels;
    if (tabList.length === 1) return;

    let parseList = tabList;
    const zeroTabList = tabList.filter((tab) => {
      return tab.tabContext.length === 0;
    });

    if (zeroTabList.length !== 0) {
      zeroTabList.forEach((deletedTab) => {
        parseList = parseList.filter((tab) => tab.id !== deletedTab.id);
      });
    }

    setPanels(parseList);

    if (parseList.length !== props.size.length) {
      const panelSize = 100 / parseList.length;
      const updatePanelSize = parseList.map((panel) => {
        return { id: panel.id, size: panelSize };
      });
      props.onSizeChange?.(updatePanelSize);
    }
  });

  const splitTab = (
    location: tabLocation,
    index: number,
    draggedTab: tabContext,
    panels: panelContext[],
  ): panelContext[] => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();

    const newPanel: panelContext = {
      id: uuid,
      tabContext: [draggedTab],
      focusedTab: draggedTab.id,
    };

    const deleteDraggedTab: panelContext[] = panels.map((panel, i) => {
      if (index !== i) return panel;
      else {
        if (!panel.tabContext) return panel;
        const tabContext: tabContext[] = panel.tabContext;
        const deleteTabIndex = tabContext
          .map((tab) => {
            return tab.id;
          })
          .indexOf(draggedTab.id);
        const updateTabContext: tabContext[] = tabContext.filter(
          (_, i) => i !== deleteTabIndex,
        );
        const nextFocusTab: tabContext =
          updateTabContext[
            deleteTabIndex >= updateTabContext.length
              ? deleteTabIndex - 1
              : deleteTabIndex
          ];
        const nextFocusTabId: string = nextFocusTab.id ? nextFocusTab.id : "";

        return {
          id: panel.id,
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

  const moveTabToOtherPanel = (
    draggedTab: tabContext,
    index: number,
    draggedInPanelIndex: number,
    panelList: panelContext[],
  ): panelContext[] => {
    if (index === draggedInPanelIndex) return panelList;
    const updatePanels = panelList.map((panel, i) => {
      if (i === draggedInPanelIndex) {
        return {
          ...panel,
          tabContext: [...panel.tabContext, draggedTab],
          focusedTab: draggedTab.id,
        };
      } else if (i === index) {
        const tabContext = panel.tabContext;
        const newTabContext = tabContext.filter(
          (ctx) => ctx.id !== draggedTab.id,
        );

        return {
          ...panel,
          tabContext: newTabContext,
          ...(newTabContext.length > 0 && {
            focusedTab: newTabContext[newTabContext.length - 1].id,
          }),
        };
      }

      return panel;
    });
    return updatePanels;
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  return (
    <Splitter.Root
      size={props.size}
      gap="0.5"
      onSizeChange={(details: { size: object[] }) => {
        const parseDetails: panelSizeContext[] = details.size.map((info) => {
          return {
            id: info["id" as keyof typeof info],
            size: info["size" as keyof typeof info],
          } as panelSizeContext;
        });
        props.onSizeChange?.(parseDetails);
      }}
    >
      <For each={props.size && panels}>
        {(currentPanel, index) => {
          return (
            <>
              <Show when={index() !== 0}>
                <Splitter.ResizeTrigger
                  id={`${panels[index() - 1].id}:${currentPanel.id}`}
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
                  panelContext={currentPanel}
                  onSplitTab={(
                    tabLocation: tabLocation,
                    draggedTab,
                    clientX,
                  ) => {
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
                    } else if (tabLocation === "otherPanel") {
                      let draggedInTabIndex: number | null = null;
                      panels.forEach((panel, index) => {
                        const panelElement = document.getElementById(panel.id);
                        if (panelElement) {
                          if (
                            panelElement.offsetLeft < clientX &&
                            clientX <
                              panelElement.offsetLeft + panelElement.offsetWidth
                          ) {
                            draggedInTabIndex = index;
                          }
                        }
                      });

                      if (draggedInTabIndex === null) return;
                      const updatePanel = moveTabToOtherPanel(
                        draggedTab,
                        index(),
                        draggedInTabIndex,
                        panels,
                      );
                      setPanels(updatePanel);
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
