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
 * Read the contents of a `File` into an `ArrayBuffer`.
 *
 * In most recent browsers (Chrome >= 76, Firefox >= 69) `file.arrayBuffer()`
 * can be used. This is not supported in Safari (<= 14) though.
 */
async function readFileToArrayBuffer(file) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (event) => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
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
async function checkPDFTextLayer(urlOrFile) {
  showStatus("Loading PDF library...");
  const pdfjs = await loadPDFJS();

  let doc;

  if (typeof urlOrFile === "string") {
    showStatus(`Loading PDF from ${url}...`);
    const url = urlOrFile;
    const loadingTask = pdfjs.getDocument(corsProxyUrl(url));

    try {
      doc = await loadingTask.promise;
    } catch (err) {
      // TODO - PDF.js seems not to provide useful error information with the
      // promise rejection. We'll need to try to get that some other way.
      showStatus(`Failed to load PDF${err ? `: ${err}` : ""}`);
      return;
    }
  } else {
    const file = urlOrFile;

    showStatus(`Loading PDF from ${file.name}`);

    const fileData = await readFileToArrayBuffer(file);
    const loadingTask = pdfjs.getDocument(fileData);

    try {
      doc = await loadingTask.promise;
    } catch (err) {
      // TODO - PDF.js seems not to provide useful error information with the
      // promise rejection. We'll need to try to get that some other way.
      showStatus(`Failed to load PDF${err ? `: ${err}` : ""}`);
      return;
    }
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

const dropZone = document.getElementById("pdfDropZone");
dropZone.ondragover = (event) => {
  event.preventDefault();
  dropZone.classList.add("has-pending-drop");
};
dropZone.ondragleave = (event) => {
  dropZone.classList.remove("has-pending-drop");
};

dropZone.ondrop = (event) => {
  event.preventDefault();
  dropZone.classList.remove("has-pending-drop");

  for (let item of event.dataTransfer.items) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    checkPDFTextLayer(file);
  }
};

const checkForm = document.getElementById("checkPdfForm");
checkForm.onsubmit = (event) => {
  event.preventDefault();
  const url = document.getElementById("pdfUrlInput").value;
  checkPDFTextLayer(url);
};
