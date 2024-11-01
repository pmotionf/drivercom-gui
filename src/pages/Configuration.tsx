import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import { FileUpload } from "~/components/ui/file-upload";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";

import { ConfigForm } from "~/components/ConfigForm";

import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

function Configuration() {
  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const [fileName, setFileName] = createSignal("");
  const [fileSelectOpen, setFileSelectOpen] = createSignal(true);

  //json 파일 값 불러오기
  function loadConfig(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string); // JSON 파싱
          setJsonData({ ...data });
          setFileName(file.name);
          getFileName()
        } catch (error) {}
        setFileSelectOpen(false);
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

  // Drag Spilt? doesnt work well 
  const [dragItemData, setDragItemData] = createSignal<string | null>(null);

  function getFileName(){
    // config spilt 
    const div = document.getElementById(fileName())!
    const draggableItems = div.querySelectorAll("fieldset")
    draggableItems.forEach((item) => {
      item.draggable = true;
      item.ondragstart = (e : DragEvent) => drag(e)
    })
  }

  const dragEnter = (e: DragEvent) => {
    e.preventDefault()
  }

  const drag = (e:DragEvent) => {
     const targetId = e.target instanceof HTMLElement ? e.target.id : null;
     setDragItemData(targetId);
  }
  
  const drop = (e:DragEvent) => {
    e.preventDefault();
    const data = dragItemData()
    if(data) {
      const draggedElement = document.getElementById(data);
      if (draggedElement && e.target instanceof HTMLElement) {
        e.target.appendChild(draggedElement);
      }
    }
  }

  console.log(dragItemData)

  return (
    <>
 
      <Portal>
        <Button
          variant="ghost"
          style={{
            position: "fixed",
            "padding-right": "0.8em",
            "padding-left": "0.5em",
            "text-align": "right",
            top: "0px",
            right: "0px",
          }}
          onClick={() => {
            setFileSelectOpen((prev) => !prev);
          }}
        >
          <Show when={fileSelectOpen()} fallback={<IconChevronsDown />}>
            <IconChevronsUp />
          </Show>
        </Button>
      </Portal>
      <Collapsible.Root open={fileSelectOpen()} lazyMount unmountOnExit>
        <Collapsible.Content>
          <FileUpload.Root
            accept="application/json"
            minFileSize={3}
            onFileAccept={loadConfig}
            onFileReject={(details) => {
              if (details.files.length == 0) return;
            }}
          >
            <FileUpload.Dropzone>
              <FileUpload.Label>Drop Config File (Json)</FileUpload.Label>
              <FileUpload.Trigger
                asChild={(triggerProps) => (
                  <Button size="sm" {...triggerProps()} variant="outline">
                    Select
                  </Button>
                )}
              />
            </FileUpload.Dropzone>
            <FileUpload.HiddenInput />
          </FileUpload.Root>
        </Collapsible.Content>
      </Collapsible.Root>
      <Show when={Object.keys(jsonData()).length > 0}>
        <div ondrop = {(e) => drop(e)} ondragover={(e) => dragEnter(e)} style={{ float: "left", width: "50%"}}>
          <ConfigForm label={fileName()} config={jsonData()} />
          
        </div>
        <div ondrop = {(e) => drop(e)} ondragover={(e) => dragEnter(e)} style={{ float: "left", width: "50%"}}>
          <Button draggable onDrag={(e) => drag(e)}>drop here</Button>
          {dragItemData()}
        </div>
      </Show>
 
    </>
  );
}

export default Configuration;
