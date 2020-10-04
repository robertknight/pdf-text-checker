"use strict";

function range(min, max) {
  const result = [];
  for (let i = min; i < max; i++) {
    result.push(i);
  }
  return result;
}

/**
 * Return a URL that proxies `url` to add CORS headers to allow cross-origin
 * access.
 */
function corsProxyUrl(url) {
  return `https://cors-anywhere.herokuapp.com/${url}`;
}

/**
 * Load the PDF.js library.
 *
 * Returns the entry point to the loaded library.
 * See https://github.com/mozilla/pdf.js/blob/master/src/display/api.js for API.
 */
async function loadPDFJS() {
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  const script = document.createElement("script");
  script.src = "https://unpkg.com/pdfjs-dist@2.5.207/build/pdf.min.js";

  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(window.pdfjsLib));
    script.addEventListener("error", (e) => reject(e.error));
    document.body.appendChild(script);
  });
}

function showStatus(text) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = text;
}

/**
 * Check whether the PDF at `url` has text that PDF.js can extract.
 */
async function checkPDFTextLayer(url) {
  showStatus("Loading PDF library...");
  const pdfjs = await loadPDFJS();

  showStatus(`Loading PDF from ${url}...`);
  const loadingTask = pdfjs.getDocument(corsProxyUrl(url));
  let doc;

  try {
    doc = await loadingTask.promise;
  } catch (err) {
    showStatus(`Failed to load PDF: ${err}`);
    return;
  }

  const getPageText = async (index) => {
    const page = await doc.getPage(index + 1);
    const textContent = await page.getTextContent();
    return textContent.items.map((it) => it.str).join(" ");
  };

  // Check the first N pages. The number of pages checked is a balance between
  // skipping any "banner" pages in front of the content that might not contain
  // text and optimizing the speed of the check.
  const maxPages = Math.min(5, doc.numPages);
  showStatus(`Checking text of first ${maxPages} pages...`);
  let pageTexts;

  try {
    pageTexts = await Promise.all(
      range(0, maxPages).map((i) => getPageText(i))
    );
  } catch (err) {
    showStatus(`Unable to fetch text from pages: ${err}`);
    return;
  }

  // TODO - Add smarter text quality metrics here.
  const hasText = pageTexts.some((pt) => pt.length > 10);

  if (hasText) {
    showStatus("PDF has extractable text");
  } else {
    showStatus("PDF does not have extractable text. You will need to OCR it.");
  }
}

const checkForm = document.getElementById("checkPdfForm");
checkForm.onsubmit = (event) => {
  event.preventDefault();
  const url = document.getElementById("pdfUrlInput").value;
  checkPDFTextLayer(url);
};
