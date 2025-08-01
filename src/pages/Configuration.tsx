import { configFormFileFormat, Pages, tabContexts } from "~/GlobalState.ts";
import { ConnectButton } from "./Connect/ConnectButton.tsx";
import { Panel } from "~/components/Panel.tsx";
import { PanelLayout } from "~/components/PanelLayout.tsx";
import { TabList } from "~/components/TabList.tsx";
import { TabContext } from "~/components/Tab.tsx";
import { ConfigTabContent } from "./Configuration/ConfigTabContent.tsx";

function Configuration() {
  const createTab = (key: string) => {
    const id = crypto.randomUUID();
    const newTab = {
      id: id,
      tabName: "New File",
      configFile: JSON.parse(JSON.stringify(configFormFileFormat())),
    } as TabContext;

    if (tabContexts.has(key)) {
      const tabCtx = tabContexts.get(key)!;
      tabCtx[1]({
        tabContext: [...tabCtx[0].tabContext, newTab],
        focusedTab: newTab.id,
      });
    }
  };

  return (
    <>
      <PanelLayout id={Pages.Configuration}>
        <Panel>
          <TabList onCreateTab={(key) => createTab(key)}>
            <ConfigTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
      <ConnectButton
        style={{ position: "absolute", right: "0.5rem", top: "1rem" }}
      />
    </>
  );
}

export default Configuration;
