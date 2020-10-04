# PDF text checker

This is a small web application that retrieves a PDF from a URL and
checks whether it has selectable text that can be extracted by
[PDF.js](https://mozilla.github.io/pdf.js/)

A PDF that has selectable text is suitable for use with tools like [Hypothesis](https://hypothes.is).
PDFs without selectable text will require pre-processing with an
[OCR](https://en.wikipedia.org/wiki/Optical_character_recognition) tool.

**[➡️ View live demo](https://robertknight.github.io/pdf-text-checker/check-pdf-text.html)**

## Usage

Start a local HTTP server with:

```
python3 -m http.server 5002
```

Then browse to http://localhost:5002/check-pdf-text.html. Enter the URL
of a PDF to fetch and check and click "Check PDF".

## Notes

This tool relies on a proxy server to bypass cross-origin restrictions on fetching
URLs. It currently uses https://cors-anywhere.herokuapp.com for this purpose.

Checking whether a PDF's text layer is usable for the purposes of copying and
annotating text is not a binary classification. A PDF may have selectable text
that is garbled or otherwise problematic. This tool uses very basic heuristics
and the result does not guarantee that the PDF will have "usable" text.
