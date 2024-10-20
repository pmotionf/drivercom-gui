import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { token } from "styled-system/tokens";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import { FileUpload } from "~/components/ui/file-upload";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";

import { ConfigForm } from "~/components/ConfigForm";

import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

function Configuration() {
  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const [editJsonData, setEditJsonData] = createSignal<Record<string, any>>({}); //변경되는 json 파일(save를 누르기 전 까지 적용)
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
          setEditJsonData({ ...data });
          setFileName(file.name);
        } catch (error) {}
        setFileSelectOpen(false);
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

  //파일 저장하기
  const saveToFile = async () => {
    setJsonData(editJsonData());
    const data = JSON.stringify(jsonData(), null, "  ");
    const path = await save({
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });
    if (!path) {
      // TODO: Show error toast
      return;
    }
    const extension = path.split(".").pop();
    if (extension != "json") {
      // TODO: Show error toast
      return;
    }
    // TODO: Handle write promise error with toast
    await writeTextFile(path, data);
  };

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
      <Button
        variant="ghost"
        style={{
          "background-color": token("colors.accent.10"),
          color: token("colors.accent.1"),
          "margin-top": "10px",
        }}
        onClick={saveToFile}
      >
        Save File
      </Button>
      <Show when={jsonData()}>
        <div style={{ display: "flex", "justify-content": "center" }}>
          <ConfigForm label={fileName()} config={jsonData()} />
        </div>
      </Show>
    </>
  );
}

export default Configuration;
