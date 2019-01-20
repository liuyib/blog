window.onload = function() {
  var oTable = document.getElementById("table_wrapper").innerHTML;
  var excelHtml = `
      <html>
      <head>
        <meta charset='utf-8' />
        <style>
          .tableA {
            border-collapse: collapse;
          }
          .tableA .title th{
            height: 50px;
            font-size: 24px;
            font-family: '微软雅黑';
            font-weight: 700;
          }
          .tableA tr th {
            border: 1px #000 solid;
            height: 40px;
            background: #efefef;
          }
          .tableA tr td {
            padding: 0 40px;
            border: 1px #000 solid;
            height: 40px;
            text-align: center;
          }
          .tableA .footer td {
            font-size: 20px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        ${oTable}
      </body>
    </html>
  `;

  var excelBlob = new Blob([excelHtml], { type: "application/vnd.ms-excel" });
  var oA = document.getElementById("down-file");
  
  oA.href = URL.createObjectURL(excelBlob);
  oA.download = "test.xls";

  oA.click = function() {
    this.click();
  };
};
