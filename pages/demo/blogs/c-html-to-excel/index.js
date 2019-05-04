window.onload = function() {
  var oTable = document.getElementById("table").outerHTML;
  var excelHtml = `
      <html>
      <head>
        <meta charset='utf-8' />
        <style>
          #table_wrapper {
            width: 600px;
            text-align: center;
            margin: 50px auto;
          }
          #table {
            width: 600px;
            border: 1px solid #000;
            border-collapse: collapse;
            margin: 0 0 20px 0;
            font-size: 22px;
          }
          #table .title th{
            height: 50px;
            font-family: 'Arial';
            font-weight: 600;
          }
          #table tr th {
            height: 40px;
            border: 1px solid #000;
            background: #efefef;
          }
          #table tr td {
            height: 40px;
            padding: 0 40px;
            border: 1px solid #000;
            text-align: center;
          }
          #table .footer td {
            font-weight: 600;
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
