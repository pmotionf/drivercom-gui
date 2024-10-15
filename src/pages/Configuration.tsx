import { createSignal, Show } from "solid-js";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";

import { Button } from "~/components/ui/button";

type NestedDict = {
  [key: string]: string | NestedDict; // 중첩 딕셔너리 타입 정의
};

function showConfig() {
  const [jsonKeys, setJsonKeys] = createSignal(Array(0).fill("0"));
  const [jsonValues, setJsonValues] = createSignal(Array(0).fill("0"));
  //const[arr, setArr] = createSignal(Array(0).fill("0"));

  //json 파일 값 불러오기
  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string); // JSON 파싱
          const { keys, values } = dictFormalization(data);
          setJsonKeys([...keys]);
          setJsonValues([...values]);
        } catch (error) {
          console.error("JSON 파싱 에러:", error);
        }
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

  //입력값이 변경되면 저장하기
  const inputChange = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement;
    const newValues = [...jsonValues()];
    newValues[index] = target.value; // 값 업데이트
    setJsonValues(newValues);
  };

  //파일 저장하기
  const saveToFile = () => {
    const data = jsonValues()
      .map((value, index) => `${jsonKeys()[index]}: ${value}`)
      .join("\n");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json"; // 저장할 파일명
    a.click();
    URL.revokeObjectURL(url);
  };

  //딕셔너리 키,  value 저장하기
  function dictFormalization(
    dict: NestedDict,
    keys: string[] = [],
    values: any = [],
  ) {
    function traverseDict(obj: NestedDict) {
      for (let key in obj) {
        if (typeof obj[key] == "object") {
          traverseDict(obj[key]);
        } else {
          keys.push(key);
          values.push(obj[key]);
        }
      }
    }
    traverseDict(dict);
    return { keys, values };
  }
  //버튼 만들기
  const btn = <button onClick={saveToFile}>Save File</button>;

  return (
    <div>
      <FileUpload.Root
        accept="application/json" // JSON 파일만 허용
        minFileSize={3}
        onFileAccept={loadLog}
        onFileReject={(details) => {
          if (details.files.length === 0) return;
          let description = "The provided log file is invalid:\n";
          description += details.files[0]; // 파일 이름 추가
        }}
      >
        <FileUpload.Dropzone>
          <FileUpload.Label>Drop Log File (Json)</FileUpload.Label>
          <FileUpload.Trigger
            asChild={(triggerProps) => (
              <Button size="sm" {...triggerProps()} variant="outline">
                <Show when={true} fallback="Change">
                  Select
                </Show>
              </Button>
            )}
          />
        </FileUpload.Dropzone>
        <FileUpload.HiddenInput />
      </FileUpload.Root>
      {jsonValues() && (
        <table class="styled-table">
          {Array(jsonValues().length)
            .fill("0")
            .map((_, index) => (
              <tr>
                <td>{jsonKeys()[index]}</td>
                <td>
                  {typeof jsonValues()[index] == typeof true ? (
                    <input
                      type="checkbox"
                      checked={jsonValues()[index]}
                      onInput={(e) => inputChange(index, e)}
                    />
                  ) : (
                    <input
                      type="number"
                      value={jsonValues()[index]}
                      onInput={(e) => inputChange(index, e)}
                    />
                  )}
                </td>
              </tr>
            ))}
        </table>
      )}
      {btn}
    </div>
  );
}

export default showConfig;
