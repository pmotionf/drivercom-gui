//import {onMount} from "solid-js";
import { createSignal, JSX, Show } from "solid-js";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Button } from "~/components/ui/button";

type NestedDict = {
  [key: string]: any | NestedDict; // 중첩 딕셔너리 타입 정의
};

function Configuration() {
  const [jsonData, setJsonData] = createSignal<Record<string, any>>({}); //json 파일
  const [newJsonData, setNewJsonData] = createSignal<Record<string, any>>({}); //변경되는 json 파일(save를 누르기 전 까지 적용)
  //json 파일 값 불러오기
  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string); // JSON 파싱
          setJsonData({ ...data });
          setNewJsonData({ ...data });
        } catch (error) {
          console.error("JSON 파싱 에러:", error);
        }
      };
      reader.readAsText(file); // 파일 내용을 텍스트로 읽기
    }
  }

  //변경된 값 반영
  const inputChange = (keyPath: string, event: Event) => {
    const target = event.target as HTMLInputElement;
    const keys = keyPath.split("/");
    setNewJsonData((prevValues) => {
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
  const saveToFile = () => {
    setJsonData(newJsonData());
    const data = JSON.stringify(jsonData(), null, "  ");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    //파일 이름을 시간과 날짜로 설정
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
    a.download = formattedDate + "config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  //테이블 표시하기
  function setTable(dict: NestedDict) {
    const content: JSX.Element[] = [];
    function traverse(obj: NestedDict, keys: string = "") {
      for (let key in obj) {
        if (typeof obj[key] == "object") {
          let obj_k = "";
          if (keys != "") {
            obj_k = keys + "/" + key;
          } else {
            obj_k = key;
          }
          content.push(
            <tr>
              <th colspan="2" class="section-header">
                {" "}
                {key}{" "}
              </th>
            </tr>,
          );
          traverse(obj[key], obj_k);
        } else {
          let val_key = "";
          if (keys != "") {
            val_key = keys + "/" + key;
          } else {
            val_key = key;
          }
          content.push(
            <tr>
              <td>{key}</td>
              <td>
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
              </td>
            </tr>,
          );
        }
      }
    }
    traverse(dict);
    return <table class="styled-table">{content}</table>;
  }

  //저장 버튼
  const btn = (
    <button onClick={saveToFile} class="save-button">
      Save File
    </button>
  );
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
      <div>
        <style>
          {`
          .styled-table {
            width: 50%;
            border-collapse: collapse;
          }

          .styled-table th, .styled-table td {
            border: 1px solid #ddd;
            padding: 8px;
            background-color: white; /* 셀과 헤더의 배경을 흰색으로 */
          }

          .section-header {
            background-color: white; /* 헤더의 배경을 흰색으로 설정 */
          }

          .save-button {
            background-color: #4CAF50; /* 초록색 배경 */
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-size: 16px;
            cursor: pointer;
            border-radius: 5px;
            transition: background-color 0.3s ease;
            margin-top: 10px; /* 위쪽 여백 추가 */
          }

          .save-button:hover {
            background-color: #45a049; /* 호버 시 더 어두운 초록색 */
          }

          .save-button:focus {
            outline: none; /* 포커스 시 외곽선 제거 */
          }
        `}
        </style>
        {btn}
        {setTable(jsonData())}
      </div>
    </div>
  );
}

export default Configuration;
