/**
 * Wait for a downloaded PDF file and validate its contents.
 *
 * @param {Buffer} fileBuffer - 自動的にTestimが注入
 * @param {string} fileName   - 自動的にTestimが注入（例： "report.pdf"）
 * @param {string} customPath - 任意指定のダウンロードフォルダ（例： "C:\\Users\\shuka\\Downloads"）
 * @param {number} timeoutMs  - 待機上限時間（例：20000）
 * @param {string} expectedText - PDF内で検証したい文字列
 * @param {number} expectedPages - 期待するページ数
 */

/**
 * Wait for a downloaded PDF file and validate its contents.
 */

const fs = require("fs");
const path = require("path");

async function f(fileBuffer, fileName, customPath, timeoutMs, expectedText, expectedPages) {
  const baseDir = customPath || "C:\\Users\\testuser\\Downloads";
  const timeout = timeoutMs ? parseInt(timeoutMs, 10) : 20000;
  const fullPath = path.join(baseDir, fileName);

  console.log(`⏳ Waiting for file: ${fullPath}`);
  console.log(`🕒 Timeout: ${timeout} ms`);

  const start = Date.now();
  while (!fs.existsSync(fullPath)) {
    await new Promise((r) => setTimeout(r, 500));
    if (Date.now() - start > timeout) {
      throw new Error(`⏰ Timeout waiting for file: ${fullPath}`);
    }
  }

  console.log(`✅ File ready: ${fullPath}`);

  // ✅ Testimが自動で提供する "pdf" 関数を使う
  const data = await pdf(fileBuffer);

  console.log(`📘 PDF pages: ${data.numpages}`);
  if (expectedPages && data.numpages !== parseInt(expectedPages)) {
    throw new Error(`❌ Unexpected number of pages. Expected ${expectedPages}, got ${data.numpages}`);
  }

  if (expectedText && !data.text.includes(expectedText)) {
    throw new Error(`❌ Expected text not found: "${expectedText}"`);
  }

  console.log(`✅ PDF validation passed for ${fileName}`);
}
