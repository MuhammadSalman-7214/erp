import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const renderBarcodeDataUrl = (code, { width = 2, height = 60 } = {}) => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, String(code || ""), {
    format: "CODE128",
    displayValue: true,
    fontSize: 16,
    width,
    height,
    margin: 8,
  });
  return canvas.toDataURL("image/png");
};

export const printBarcodeLabel = ({ code, productName, variantName, price }) => {
  if (!code) return false;

  const dataUrl = renderBarcodeDataUrl(code);
  const printWindow = window.open("", "_blank", "width=420,height=340");
  if (!printWindow) return false;

  printWindow.document.write(`
    <html>
      <head>
        <title>Label - ${escapeHtml(code)}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 16px; }
          .name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
          .variant { font-size: 11px; color: #475569; margin-bottom: 8px; }
          .price { font-size: 13px; font-weight: 600; margin-top: 6px; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        ${productName ? `<div class="name">${escapeHtml(productName)}</div>` : ""}
        ${variantName ? `<div class="variant">${escapeHtml(variantName)}</div>` : ""}
        <img src="${dataUrl}" alt="${escapeHtml(code)}" />
        ${price ? `<div class="price">Rs. ${escapeHtml(price)}</div>` : ""}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 300);
  };

  return true;
};

const LABELS_PER_ROW = 3;
const LABEL_WIDTH_MM = 60;
const LABEL_HEIGHT_MM = 32;
const PAGE_MARGIN_MM = 8;

export const downloadLabelSheetPdf = (items, fileName = "Barcode-Labels.pdf") => {
  if (!items?.length) return false;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const columnGap =
    (usableWidth - LABELS_PER_ROW * LABEL_WIDTH_MM) / (LABELS_PER_ROW - 1);

  let x = PAGE_MARGIN_MM;
  let y = PAGE_MARGIN_MM;
  let column = 0;

  items.forEach((item) => {
    if (y + LABEL_HEIGHT_MM > pageHeight - PAGE_MARGIN_MM) {
      pdf.addPage();
      x = PAGE_MARGIN_MM;
      y = PAGE_MARGIN_MM;
      column = 0;
    }

    pdf.setDrawColor(203, 213, 225);
    pdf.rect(x, y, LABEL_WIDTH_MM, LABEL_HEIGHT_MM);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(item.productName || "-").slice(0, 32), x + 2, y + 5, {
      maxWidth: LABEL_WIDTH_MM - 4,
    });

    const dataUrl = renderBarcodeDataUrl(item.code, { width: 1.4, height: 40 });
    pdf.addImage(dataUrl, "PNG", x + 4, y + 7, LABEL_WIDTH_MM - 8, 18);

    if (item.price !== undefined && item.price !== null && item.price !== "") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`Rs. ${item.price}`, x + 2, y + LABEL_HEIGHT_MM - 2);
    }

    column += 1;
    if (column >= LABELS_PER_ROW) {
      column = 0;
      x = PAGE_MARGIN_MM;
      y += LABEL_HEIGHT_MM + 4;
    } else {
      x += LABEL_WIDTH_MM + columnGap;
    }
  });

  pdf.save(fileName);
  return true;
};
