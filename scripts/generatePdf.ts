import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function generatePdf() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  
  const htmlPath = path.resolve(process.cwd(), 'coverage', 'report.html');
  const pdfPath = path.resolve(process.cwd(), 'coverage', 'report.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML report not found');
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  console.log('PDF report generated successfully at', pdfPath);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
