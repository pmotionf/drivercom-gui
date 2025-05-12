import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { TabLocation } from "./TabList.tsx";
import { onMount } from "solid-js";
import { TabListContext } from "./TabList.tsx";
import { PanelContext } from "~/components/Panel.tsx";
import { panelContexts } from "~/GlobalState.ts";

export type PanelSizeContext = {
  id: string;
  size: number;
};

export type PanelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

// Global state data need to change as a dictionary
// So panel layout has an id, to found the panel Context,
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

  /*createEffect(() => {
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

    if (parseList.length !== getPanelContext(props.id).length) {
      const panelSize = 100 / parseList.length;
      const updatePanelSize = parseList.map((panel) => {
        return { id: panel.id, size: panelSize };
      });
      setPanelContext(props.id, updatePanelSize);
      }
  });*/

  const splitTab = (
    location: TabLocation,
    index: number,
    draggedTab: TabListContext,
    panels: PanelContext[],
  ): PanelContext[] => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();

    const newPanel: PanelContext = {
      id: uuid,
      tabContext: [draggedTab],
      focusedTab: draggedTab.id,
    };

    const deleteDraggedTab: PanelContext[] = panels.map((panel, i) => {
      if (index !== i) return panel;
      else {
        if (!panel.tabContext) return panel;
        const tabContext: TabListContext[] = panel.tabContext;
        const deleteTabIndex = tabContext
          .map((tab) => {
            return tab.id;
          })
          .indexOf(draggedTab.id);
        const updateTabContext: TabListContext[] = tabContext.filter(
          (_, i) => i !== deleteTabIndex,
        );
        const nextFocusTab: TabListContext = updateTabContext[
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
    draggedTab: TabListContext,
    index: number,
    draggedInPanelIndex: number,
    panelList: PanelContext[],
  ): PanelContext[] => {
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
                  id={props.id}
                  index={index()}
                  onSplitTab={(
                    tabLocation: TabLocation,
                    draggedTab,
                    clientX,
                  ) => {}}
                />
              </Splitter.Panel>
            </>
          );
        }}
      </For>
    </Splitter.Root>
  );
}
