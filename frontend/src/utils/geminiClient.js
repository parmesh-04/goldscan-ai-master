/*
  OCR Utility — Tesseract.js Bill Text Extraction
  
  This is the ONLY client-side AI operation in GoldScan AI.
  Running OCR in the browser (not the server) is intentional:
    - The purchase bill may contain personal data (name, address, price)
    - Processing it locally keeps it private — it never leaves the device
    - Tesseract.js works offline and requires no API key

  NOTE: All gold jewelry vision analysis (hallmark detection, purity
  estimation, plating detection) happens server-side via the FastAPI
  backend → Gemini 2.5 Flash. The API key is NEVER exposed to the browser.
*/

import { createWorker } from 'tesseract.js';

/**
 * Extracts text from a jewelry purchase bill image using Tesseract OCR.
 * Returns the raw text string, or empty string if OCR fails.
 * Caller should handle the empty-string case gracefully.
 *
 * @param {File} file — The bill image file selected by the user
 * @returns {Promise<string>} — Extracted text (trimmed), or '' on failure
 */
export async function recognizeBillText(file) {
  // Nothing to process if no file was provided
  if (!file) return '';

  let worker;
  try {
    // Create a Tesseract worker with the English language model
    worker = await createWorker('eng');
    const { data } = await worker.recognize(file);
    return data.text.trim();
  } catch (error) {
    // OCR failure is non-fatal — the bill is supplementary evidence only
    console.warn('[GoldScan] Bill OCR failed:', error.message);
    return '';
  } finally {
    // Always terminate the worker to free memory, even if OCR threw
    if (worker) await worker.terminate();
  }
}
