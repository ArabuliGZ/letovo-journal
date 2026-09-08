import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "D:/Letovo site/ШАБЛОН КТП.xlsx";
const outputDir = "D:/Letovo site/outputs/01a08169-35f6-7223-bd79-f58a7812dfce";
const sourceBook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceSheet = sourceBook.worksheets.getItem("Лист1");
const sourceValues = sourceSheet.getRange("A1:H37").values;
const values = sourceValues.map(row => [...row.slice(0, 6), row[7] ?? row[6]]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Лист1");
sheet.getRange("A1").write(values);
sheet.getRange("A1:G37").format.font = { name: "Arial", size: 11 };
sheet.getRange("A1:G1").format.font = { name: "Arial", size: 11, bold: true };
sheet.getRange("A1:G1").format.verticalAlignment = "center";
sheet.getRange("A1:G37").format.rowHeightPx = 24;
sheet.getRange("A1:A37").format.columnWidthPx = 190;
sheet.getRange("B1:B37").format.columnWidthPx = 440;
sheet.getRange("C1:C37").format.columnWidthPx = 120;
sheet.getRange("D1:D37").format.columnWidthPx = 120;
sheet.getRange("E1:E37").format.columnWidthPx = 300;
sheet.getRange("F1:F37").format.columnWidthPx = 150;
sheet.getRange("G1:G37").format.columnWidthPx = 180;
sheet.getRange("C2:D37").format.horizontalAlignment = "center";
sheet.getRange("G2:G37").format.horizontalAlignment = "right";
sheet.freezePanes.freezeRows(1);

const check = await workbook.inspect({ kind: "table", sheetId: "Лист1", range: "A1:G37", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 8, maxChars: 7000 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "Лист1", range: "A1:G37", scale: 1.5, format: "png" });
await fs.writeFile(`${outputDir}/template-after.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/ШАБЛОН КТП.xlsx`);
