const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractPdfText() {
  const pdfPath = './docs/catalogo_sumprimentos1.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF não encontrado: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Lendo PDF: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  
  console.log("Extraindo texto...");
  const data = await pdfParse(buffer);
  
  console.log(`Páginas: ${data.numpages}`);
  console.log(`Caracteres extraídos: ${data.text.length}`);
  
  const outputPath = './scripts/data/catalog-pdf-text.txt';
  fs.writeFileSync(outputPath, data.text, "utf-8");
  console.log(`Texto salvo em: ${outputPath}`);
  
  return data.text;
}

extractPdfText()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  });