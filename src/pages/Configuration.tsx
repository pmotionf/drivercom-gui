//import {onMount} from "solid-js";
import { createSignal, Show } from "solid-js";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Button } from "~/components/ui/button";

type NestedDict = {
  [key: string]: any | NestedDict; // 중첩 딕셔너리 타입 정의
};

function showConfig() {
  const [jsonData, setJsonData] = createSignal<Record<string, any>>({});
  const [jsonValues, setJsonValues] = createSignal(Array(0).fill("0"));

  //json 파일 값 불러오기
  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string); // JSON 파싱
          setJsonData(data);
          const  values  = dictFormalization(data);
          setJsonValues([...values]);

          console.log(jsonData());

        } catch (error) {
          console.error("JSON 파싱 에러:", error);
        }
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

//화면에서 변경된 값 반영하기
const inputChange = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  console.log(typeof target.value);
  setJsonValues((prevValues) => {
    const newValues = [...prevValues]; // 이전 값 복사
    for(let key in newValues[index]){
      if(target.value == "on"){
        newValues[index][key] = target.checked;
      }
      else{
        newValues[index][key] = target.value;
      }
    }
    return newValues; // 새로운 값 반환
  });
};

  //파일 저장하기
  const saveToFile = () => {
    const data = jsonValues()
      .map((value) => `${Object.keys(value)}: ${Object.values(value)}`)
      .join("\n");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json"; // 저장할 파일명
    a.click();
    URL.revokeObjectURL(url);
  };

  //배열로 딕셔너리 저장하기
  function dictFormalization(
    dict: NestedDict,
    values: any = [],
  ) {
    function traverseDict(obj: NestedDict) {
      for (let key in obj) {
        if (typeof obj[key] == "object") {
          traverseDict(obj[key]);
        } else {
          let dit:NestedDict = {};
          dit[key] = obj[key];
          values.push(dit);
        }
      }
    }
    traverseDict(dict);
    return values;
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
          {jsonValues()
            .map((value, index) => (
              <tr>
                <td>{Object.keys(value)}</td>
                <td>
                  {typeof  Object.values(value)[0] == typeof true ? (
                    <input
                      type="checkbox"
                      checked={Object.values(value)[0] as boolean}
                      onInput={(e) => inputChange(index, e)}
                    />
                  ) : (
                    <input
                      type="number"
                      value={Object.values(value)[0] as number}
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
