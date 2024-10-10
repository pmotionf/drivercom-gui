//config 파일 표시
function showConfig() {
  var input = document.getElementById("avatar");
  var file = input.files[0]; // 선택한 파일 객체
  if (file) {
    const promise = readJSONFile(file);
    promise.then((result) => {
      const dict = result;

      //모든 value 저장
      const all_value = extractValues(dict);

      //html의 모든 ids 저장
      const allElements = document.querySelectorAll(
        'input[type="text"], input[type="number"],  input[type="checkbox"]',
      );
      const ids = [];
      allElements.forEach((element) => {
        ids.push(element.id);
      });

      //값을 변환
      for (let i = 0; i < ids.length; i++) {
        var v = document.getElementById(ids[i]);
        v.value = all_value[i];
        if (v.id.includes("flags")) {
          v.checked = all_value[i];
        }
      }
    });
  }
  const myTable = document.getElementById("table");
  myTable.style.display = "table";
}

//json 파일 읽기
function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      try {
        const json_object = JSON.parse(content); // object 형식으로
        resolve(json_object); // 파싱된 객체를 반환
      } catch (err) {
        reject("JSON 파싱 오류: " + err.message); // 오류 발생 시
      }
    };
    reader.onerror = function () {
      reject("파일 읽기 오류");
    };
    reader.readAsText(file); // 파일을 텍스트 형식으로 읽음
  });
}

//값이 0 혹은 false인 value 만들기
function newValue() {
  //html의 모든 ids 저장
  const allElements = document.querySelectorAll(
    'input[type="text"], input[type="number"],  input[type="checkbox"]',
  );
  const ids = [];
  allElements.forEach((element) => {
    ids.push(element.id);
  });

  //값을 변환
  for (let i = 0; i < ids.length; i++) {
    var v = document.getElementById(ids[i]);
    v.value = 0;
    if (v.id.includes("flags")) {
      v.checked = false;
    }
  }
  const myTable = document.getElementById("table");
  myTable.style.display = "table";
}

//파일 저장
function saveFile() {
  webui.call("sendJson").then((response) => {
    const dict = JSON.parse(response);
    //html의 모든 value 저장
    const allElements = document.querySelectorAll(
      'input[type="text"], input[type="number"], input[type="checkbox"]',
    );
    const values = []; //
    allElements.forEach((element) => {
      if (element.value == "") {
        values.push(0);
      } else if (element.id.includes("flags")) {
        values.push(element.checked);
      } else {
        values.push(element.value);
      }
    });
    extractKey(dict, values);

    //파일 저장
    const blob = new Blob([JSON.stringify(dict, null, "  ")], {
      type: "text/json",
    });
    const url = URL.createObjectURL(blob);
    // 다운로드 링크 생성
    const a = document.createElement("a");
    a.href = url;
    // 현재 날짜와 시간을 가져오기
    const currentDate = new Date();
    // 날짜와 시간을 문자열로 포맷팅
    const formattedDate = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
    // 포맷팅된 날짜와 시간을 출력
    a.download = formattedDate + "config.json"; // 다운로드할 파일 이름
    // 링크 클릭하여 다운로드
    document.body.appendChild(a);
    a.click();
    // 링크 제거
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Blob URL 해제
  });
}

function extractKey(dict, values) {
  let index = 0;
  function traverseDict(obj) {
    for (let key in obj) {
      if (typeof obj[key] == "object") {
        traverseDict(obj[key]);
      } else {
        obj[key] = values[index];
        index++;
      }
    }
  }
  traverseDict(dict);
}

function extractValues(dict) {
  const result = [];
  for (const key in dict) {
    const value = dict[key];
    if (typeof value != "object") {
      result.push(value);
    } else {
      const in_value = extractValues(value);
      result.push(...in_value);
    }
  }
  return result;
}
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("avatar").addEventListener("change", showConfig);
});

