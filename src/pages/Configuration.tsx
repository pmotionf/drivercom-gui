import { createSignal, Show, createEffect } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import { FileUpload } from "~/components/ui/file-upload";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";

import { ConfigForm } from "~/components/ConfigForm";
import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

import { useLocation } from "@solidjs/router";

function Configuration() {
  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const [fileName, setFileName] = createSignal("");
  const [fileSelectOpen, setFileSelectOpen] = createSignal(true);
  const [port, setPort] = createSignal("");

  //Driver 페이지에서 전달되는 값 저장
  const location = useLocation();
  createEffect(() => {
    const params = new URLSearchParams(location.search);
    const port = params.get("port") as string;
    const driver_json = JSON.parse(params.get("data") as string); // JSON 파싱

    if (driver_json) {
      try {
        const driver_data = JSON.parse(driver_json);
        setJsonData({ ...driver_data });
        setFileName("Driver Config");
        setPort(port);
        setFileSelectOpen(false);
      } catch (error) {}
    }
  });

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
        } catch (error) {}
        setFileSelectOpen(false);
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

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
        <div style={{ display: "flex", "justify-content": "center" }}>
          <ConfigForm label={fileName()} config={jsonData()} port={port()} />
        </div>
      </Show>
    </>
  );
}

export default Configuration;
