import { createSignal, JSX, Show, createEffect } from "solid-js";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";
import { Portal } from "solid-js/web";
import { token } from "styled-system/tokens";
import { Table } from "~/components/ui/table";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

type NestedDict = {
  [key: string]: any | NestedDict; // 중첩 딕셔너리 타입 정의
};

type ConfigProps = Table.RootProps & {
  dict: object;
};

function Configuration() {
  const [jsonData, setJsonData] = createSignal({}); //json 파일
  const [editJsonData, setEditJsonData] = createSignal<Record<string, any>>({}); //변경되는 json 파일(save를 누르기 전 까지 적용)
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
        } catch (error) {}
        setFileSelectOpen(false);
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

  //변경된 값 반영
  const inputChange = (keyPath: string, event: Event) => {
    const target = event.target as HTMLInputElement;
    const keys = keyPath.split("/");
    setEditJsonData((prevValues) => {
      const newValues: NestedDict = { ...prevValues }; // 이전 값 복사
      let lastKey = String(keys.pop());
      let targetObject: NestedDict = newValues;
      for (let key of keys) {
        targetObject = targetObject[key];
      }
      if (target.value == "on") {
        targetObject[lastKey] = target.checked;
      } else {
        targetObject[lastKey] = target.value;
      }
      return newValues; // 새로운 값 반환
    });
  };

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

  //테이블 표시하기
  function ConfigTable(props: ConfigProps) {
    const [data, setData] = createSignal(props.dict);
    const [content, setContent] = createSignal<JSX.Element[]>([]);

    createEffect(() => {
      setData(props.dict);
      traverse(data());
    });

    function traverse(obj: NestedDict, keys: string = "") {
      for (let key in obj) {
        if (typeof obj[key] == "object") {
          let obj_k = "";
          if (keys != "") {
            obj_k = keys + "/" + key;
          } else {
            obj_k = key;
          }
          setContent((prev) => [
            ...prev,
            <Table.Row
              style={{
                border: "ActiveBorder",
                "font-weight": "bold",
                "text-align": "center",
                "background-color": token("colors.accent.4"),
              }}
            >
              <Table.Cell>{key}</Table.Cell>
            </Table.Row>,
          ]);
          traverse(obj[key], obj_k);
        } else {
          let val_key = "";
          if (keys != "") {
            val_key = keys + "/" + key;
          } else {
            val_key = key;
          }
          setContent((prev) => [
            ...prev,
            <Table.Row>
              <Table.Cell>{key}</Table.Cell>
              <Table.Cell>
                {typeof obj[key] == typeof true ? (
                  <input
                    type="checkbox"
                    checked={obj[key]}
                    onInput={(e) => inputChange(val_key, e)}
                  />
                ) : (
                  <input
                    type="number"
                    value={obj[key]}
                    onInput={(e) => inputChange(val_key, e)}
                  />
                )}
              </Table.Cell>
            </Table.Row>,
          ]);
        }
      }
    }
    return (
      <Table.Root style={{ width: "50%" }}>
        <Table.Body>{content()}</Table.Body>
      </Table.Root>
    );
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
          <ConfigTable dict={jsonData()} />
        </div>
      </Show>
    </>
  );
}
export default Configuration;
