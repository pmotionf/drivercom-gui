//csv파일 열기(file 사용)
src="/navigation.js"

function showCsv() {
  var input = document.getElementById("loadCsv");
  var file = input.files[0]; // 선택한 파일 객체
  const state_label = document.getElementById("loading_state");
  state_label.innerHTML = "....loading....";
  if (file) {
    const promise = readCsvFileTest(file);
    promise.then((result) => {
      state_label.innerHTML = "complete!";
      showTestChart(result);
    });
    input.value = null;

    //페이지 이동
    loadPage('page4')
  } else {
    state_label.innerHTML = "....Loading Failed....";
  }
  const myTable = document.getElementById("table");
  myTable.style.display = "none";
}
//csv파일이 바뀔때 마다 함수를 실행
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("loadCsv").addEventListener("change", showCsv);
});

//csv파일의 내용을 읽어와 배열과 딕셔너리 형태로 변환
function readCsvFileTest(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const csvData = e.target.result;
      try {
        let rows = csvData.split("\n");

        //테스트
        let headers = rows[0].split(",").map((col) => col.trim());
        const bool_headers = [[], []];
        const num_headers = [[], []];
        const bool_datas = [];
        const num_datas = [];

        //자료형에 따른 헤더 분리
        rows[1].split(",").forEach((data, index) => {
          const d = data.trim().toLowerCase();
          if (d == "true" || d == "false") {
            bool_headers[0].push(headers[index]);
            bool_headers[1].push(index);
          } else {
            num_headers[0].push(headers[index]);
            num_headers[1].push(index);
          }
        });
        bool_datas.push(bool_headers[0]);
        num_datas.push(num_headers[0]);

        //자료형에 따른 데이터 분리(bool, number)
        rows.slice(1).forEach((row) => {
          const columns = row.split(",").map((col) => col.trim());
          const b_col = [];
          const n_col = [];

          bool_headers[1].forEach((index) => {
            const boolValue = columns[index];
            if (boolValue) {
              var re_value = boolValue.replace(/true/g, `${b_col.length + 1}`);
              re_value = re_value.replace(/false/g, "0");
              b_col.push(re_value);
            }
          });
          num_headers[1].forEach((index) => {
            const numericRow = columns[index];
            n_col.push(numericRow);
          });
          bool_datas.push(b_col.join(",")); //,로 연결된 문자열로 저장
          num_datas.push(n_col.join(","));
        });

        let bool_csv = [];
        let num_csv = [];
        //열 번호 추가
        if (bool_datas[1].length > 0) {
          bool_csv = ["num, " + bool_datas[0]];
        }
        num_csv = ["num, " + num_datas[0]];

        //데이터 추가
        bool_datas.slice(1).forEach((data, index) => {
          if (data.trim()) {
            bool_csv.push(`${index + 1}, ${data}`);
          }
        });
        num_datas.slice(1).forEach((data, index) => {
          if (data.trim()) {
            num_csv.push(`${index + 1}, ${data}`);
          }
        });

        bool_csv = bool_csv.join("\n");
        num_csv = num_csv.join("\n");

        const result = {
          bool_csv: bool_csv,
          num_csv: num_csv,
        };
        console.log(result);
        resolve(result);
      } catch (err) {
        reject("csv 파싱 오류: " + err.message); // 오류 발생 시
      }
    };
    reader.onerror = function () {
      reject("파일 읽기 오류");
    };
    reader.readAsText(file); // 파일을 텍스트 형식으로 읽음
  });
}
//csv파일이 바뀔때 마다 함수를 실행

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("loadCsv").addEventListener("change", showCsv);
});

function showTestChart(data) {
  //CSV 파일에서 데이터 로드
  var header = data["num_csv"].split("\n")[0].split(",");
  var seriesCount = header.length - 1; // 첫 번째 열 = 번호
  var visibilityArray = Array(seriesCount).fill(true);

  //bool  차트 그리기
  if (data["bool_csv"].length > 0) {
    var bool_chart = new Dygraph(
      document.getElementById("boolChart"), // 차트를 표시할 div
      data["bool_csv"], // CSV 파일의 데이터
      {
        title: "Bool Data Chart", //타이틀
        strokeWidth: 2, //선의 두께
        legend: "always", // 범례 항상 표시
        stepPlot: true, //계단형식 그리기
        visibility: visibilityArray,
      },
    );

    //범례 표시(체크박스)
    const legends = bool_chart.getLabels().slice(1);
    const legend_div = document.getElementById("boolLegend");
    legend_div.replaceChildren();
    legends.forEach((legend) => {
      const label = document.createElement("label");
      label.textContent = legend;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = legend;
      input.checked = true;
      label.appendChild(input);
      legend_div.appendChild(label);
    });
  }
  document.getElementById("boolLegend").addEventListener("change", function () {
    const check_inputs = Array.from(
      document.querySelectorAll('#boolLegend input[type="checkbox"]'),
    );
    console.log(check_inputs);
    const check_statues = check_inputs.map((input) => input.checked);

    bool_chart.updateOptions({
      visibility: check_statues,
    });
  });

  //숫자 차트 그리기
  var chart = new Dygraph(
    document.getElementById("numberChart"), // 차트를 표시할 div
    data["num_csv"], // CSV 파일의 데이터
    {
      title: "CSV Data Chart", //타이틀
      strokeWidth: 2, //선의 두께
      legend: "always", // 범례 항상 표시
      visibility: visibilityArray,
    },
  );
  //범례 표시(체크박스)
  const legends = chart.getLabels().slice(1);
  const legend_div = document.getElementById("numLegend");
  legend_div.replaceChildren();
  legends.forEach((legend) => {
    const label = document.createElement("label");
    label.textContent = legend;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = legend;
    input.checked = true;
    label.appendChild(input);
    legend_div.appendChild(label);
  });

  //리셋 줌 버튼
  document
    .getElementById("resetZoomBtn")
    .addEventListener("click", function () {
      chart.resetZoom();
      bool_chart.resetZoom();
    });
  //휠로 줌 설정
  document
    .getElementById("numberChart")
    .addEventListener("wheel", function (event) {
      // 기본 스크롤 동작 방지
      event.preventDefault();

      // 휠 이벤트의 deltaY 값에 따라 줌 처리
      const zoomFactor = event.deltaY > 0 ? 1.5 : 0.5; // 휠 방향에 따라 줌 인/아웃
      const range = chart.xAxisRange(); // 현재 x축 범위
      const midPoint = (range[0] + range[1]) / 2; // 중간 지점 계산

      const newMin = midPoint + (range[0] - midPoint) * zoomFactor; // 새로운 최소값 계산
      const newMax = midPoint + (range[1] - midPoint) * zoomFactor; // 새로운 최대값 계산

      if (newMin <= 0) {
        newMin = 0;
      }

      chart.updateOptions({
        dateWindow: [newMin, newMax],
      });
      bool_chart.updateOptions({
        dateWindow: [newMin, newMax],
      });
    });

  //체크박스를 클릭해 데이터 지우고 보이기
  document.getElementById("numLegend").addEventListener("change", function () {
    const check_inputs = Array.from(
      document.querySelectorAll('#numLegend input[type="checkbox"]'),
    );
    console.log(check_inputs);
    const check_statues = check_inputs.map((input) => input.checked);

    chart.updateOptions({
      visibility: check_statues,
    });
  });

  Dygraph.synchronize(chart, bool_chart, {
    zoom: true, // 줌 동기화
    selection: true, // 선택 포인트 강조 동기화
    range: false, // Y축 범위 동기화 (비활성화)
  });
}
