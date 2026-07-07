import ExcelJS from "exceljs";
import { writeFileSync } from "fs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("rfq_item");
ws.getRow(1).values = ["ID_ITEM", "DESC_MATERIAL", "FORNECEDOR", "VALOR_UNIT"];
ws.getRow(2).values = [1, "Paracetamol 500mg", "EMS", 12.50];
ws.getRow(3).values = [2, "Dipirona 500mg", "Hypera", 8.90];

const buf = await wb.xlsx.writeBuffer();
writeFileSync("test.xlsx", Buffer.from(buf));
console.log("test.xlsx criado:", Buffer.from(buf).length, "bytes");
