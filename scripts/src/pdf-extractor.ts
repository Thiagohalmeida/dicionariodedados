import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Disable worker for Node.js
// GlobalWorkerOptions.workerSrc = undefined; // Not needed in Node.js

async function extractPdfText() {
  const pdfPath = path.resolve(__dirname, "../../docs/catalogo_sumprimentos1.pdf");
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF não encontrado: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Lendo PDF: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  
  console.log("Extraindo texto...");
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = getDocument({ data: uint8Array, verbosity: 0 });
  const pdf = await loadingTask.promise as PDFDocumentProxy;
  
  console.log(`Páginas: ${pdf.numPages}`);
  
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n\n--- PAGE BREAK ---\n\n";
    
    if (pageNum % 10 === 0) {
      console.log(`  Processadas ${pageNum}/${pdf.numPages} páginas...`);
    }
  }
  
  console.log(`Caracteres extraídos: ${fullText.length}`);
  
  const outputPath = path.resolve(__dirname, "../data/catalog-pdf-text.txt");
  fs.writeFileSync(outputPath, fullText, "utf-8");
  console.log(`Texto salvo em: ${outputPath}`);
  
  return fullText;
}

extractPdfText()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  });