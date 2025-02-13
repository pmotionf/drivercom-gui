import { Stack } from "styled-system/jsx";
import {LogViewerTabList} from "./LogViewer/LogViewerTabList";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, Show } from "solid-js";

function LogViewer() {
  const [logViewTabListLeft, setLogViewTabListLeft] = createSignal<string[]>([])
  const [logViewTabListRight, setLogViewTabListRight] = createSignal<string[]>([])
  //check drop to other tab
  const [isDropLeft, setIsDropLeft] = createSignal<boolean>(false)
  const [isDropRight, setIsDropRight] = createSignal<boolean>(false)
  const [draggedTabId, setDraggedTabId] = createSignal<[string, string]>()


  return (
    <>
    <Splitter.Root
      size={[
        { id: 'a', size: 50 },
        { id: 'b', size: 50 },
      ]}
      width={"100%"}
      height={"100%"}
    >
      <Splitter.Panel id="a">
        <div style={{"width" : "100%", "height" : "100%"}}>
          <LogViewerTabList
            tabListPosition="left"
            tabList={logViewTabListLeft()}
            onTabListChange={(e) => setLogViewTabListLeft(e)}
            onDraggedTabId={(id) => console.log(id)}
            onDraggedOut={(e) => {
              setIsDropLeft(e)
              console.log(isDropLeft())
            }}
          />
        </div>
      </Splitter.Panel>
      <Show when = {logViewTabListLeft().length !== 0}>
      <Splitter.ResizeTrigger id="a:b" />
      <Splitter.Panel id="b">
        <div style={{"width" : "100%", "height" : "100%"}}>
          <LogViewerTabList
            tabListPosition="right"
            tabList={logViewTabListRight()}
            onTabListChange={(e) => setLogViewTabListRight(e)}
            onDraggedTabId={(id) => console.log(id)}
            onDraggedOut={(e) => {
              setIsDropRight(e)
              console.log(isDropRight())
            }}
          />
        </div>
      </Splitter.Panel>
      </Show>
    </Splitter.Root>
    </>
  );
}

export default LogViewer;
