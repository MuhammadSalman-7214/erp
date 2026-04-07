const THEME_COLOR = "#0f766e";
const THEME_DARK = "#134e4a";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#475569";
const BORDER_COLOR = "#cbd5e1";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMoney = (value, currency = "Rs") => {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
};

const buildContactLine = (label, value) =>
  value
    ? `<div class="footer-item"><span class="footer-dot"></span><span><strong>${escapeHtml(
        label,
      )}:</strong> ${escapeHtml(value)}</span></div>`
    : "";

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const buildInvoicePrintHtml = ({
  documentTitle = "Invoice",
  companyName = "InventoryPro",
  slogan = "",
  brandLine = "DEAL IN ALL KIND OF PLYWOOD AND HARDWARE",
  logoUrl = "/ITLOGO.svg",
  invoiceLabel = "Invoice #",
  invoiceNumber = "",
  issueLabel = "Date",
  issueDate = "",
  dueLabel = "Due Date",
  dueDate = "",
  partyLabel = "Invoice To",
  partyName = "",
  partyCode = "",
  partyPhone = "",
  partyAddress = "",
  paymentMethod = "-",
  items = [],
  showPrices = true,
  showSummaryBox = true,
  currency = "Rs",
  subTotal = 0,
  carage = 0,
  discount = 0,
  totalAmount = 0,
  receivedAmount = 0,
  remainingAmount = 0,
  notes = "",
  footerPhone = "03113208249 / 03005246494",
  footerAddress = "Defence Road Opposite DHA RAHBAR",
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const receivedValue = Number(receivedAmount || 0);
  const remainingValue = Number(remainingAmount || 0);
  const carageValue = Number(carage || 0);
  const safeNotes = escapeHtml(notes).replaceAll("\n", "<br />");
  const partyBlockCode = partyCode
    ? `<div class="details-code">${escapeHtml(partyCode)}</div>`
    : "";
  const emptyRowColSpan = showPrices ? 4 : 2;
  const showBottomSummary = showPrices || showSummaryBox;
  const compactMode = !showPrices;
  const rowsPerPage = compactMode ? 14 : 12;
  const pages = safeItems.length ? chunkArray(safeItems, rowsPerPage) : [[]];

  const renderRow = (item, index) => {
    const name = escapeHtml(item.name || item.productName || "Product");
    const code = escapeHtml(item.code || "");
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const total = Number(item.total || qty * unitPrice || 0);

    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td>
          <div class="item-row">
            <div class="item-name">${name}</div>
            ${code ? `<div class="item-chip">${code}</div>` : ""}
          </div>
        </td>
        <td class="center">${qty}</td>
        ${
          showPrices
            ? `<td class="num">${formatMoney(unitPrice, currency)}</td>
               <td class="num">${formatMoney(total, currency)}</td>`
            : ""
        }
      </tr>
    `;
  };

  const renderSummary = (isLastPage) => {
    if (!isLastPage || !showBottomSummary) return "";

    return `
      <div class="bottom-grid">
        <div>
          ${
            safeNotes
              ? `<div class="notes"><strong>Notes:</strong><br />${safeNotes}</div>`
              : ""
          }
        </div>
        ${
          showPrices
            ? `<div class="totals">
                <table>
                  <tr>
                    <td class="label">Sub Total</td>
                    <td class="value">${escapeHtml(formatMoney(subTotal, currency))}</td>
                  </tr>
                  ${
                    carageValue > 0
                      ? `<tr>
                          <td class="label">Carage</td>
                          <td class="value">${escapeHtml(formatMoney(carageValue, currency))}</td>
                        </tr>`
                      : ""
                  }
                  <tr>
                    <td class="label">Received Amount</td>
                    <td class="value">${escapeHtml(formatMoney(receivedValue, currency))}</td>
                  </tr>
                  <tr>
                    <td class="label">Remaining Amount</td>
                    <td class="value">${escapeHtml(formatMoney(remainingValue, currency))}</td>
                  </tr>
                  <tr class="grand">
                    <td class="label">Total Bill</td>
                    <td class="value">${escapeHtml(formatMoney(totalAmount, currency))}</td>
                  </tr>
                </table>
              </div>`
            : ""
        }
      </div>
    `;
  };

  const renderPage = (pageItems, pageIndex) => {
    const isLastPage = pageIndex === pages.length - 1;
    const rows = pageItems.map((item, index) => renderRow(item, index)).join("");

    return `
      <div class="page${compactMode ? " compact" : ""}">
        <div class="decor-top">
          <div class="decor-pill secondary"></div>
          <div class="decor-pill"></div>
        </div>

        <div class="header">
          <div class="brand">
            ${
              logoUrl
                ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(
                    companyName,
                  )}" />`
                : `<div class="brand-mark">I</div>`
            }
            <div class="brand-copy">
              <h1 class="brand-title">${escapeHtml(companyName)}</h1>
              <div class="brand-line">${escapeHtml(brandLine)}</div>
            </div>
          </div>
        </div>

        <div class="accent-bar"></div>

        <div class="details-row">
          <div class="details-left">
            <div class="details-label">${escapeHtml(partyLabel)}</div>
            <div class="details-name">${escapeHtml(partyName || "Customer")}</div>
            ${partyBlockCode}
            ${
              partyAddress
                ? `<div class="details-muted">${escapeHtml(partyAddress)}</div>`
                : ""
            }
            ${
              partyPhone
                ? `<div class="details-muted">${escapeHtml(partyPhone)}</div>`
                : ""
            }
            <div class="details-line"><strong>Payment Method:</strong> ${escapeHtml(paymentMethod || "-")}</div>
          </div>
          <div class="details-right">
            <div class="meta-row">
              <span>${escapeHtml(invoiceLabel)}</span>
              <span>${escapeHtml(invoiceNumber || "-")}</span>
            </div>
            <div class="meta-row">
              <span>${escapeHtml(issueLabel)}</span>
              <span>${escapeHtml(issueDate ? new Date(issueDate).toLocaleDateString() : "-")}</span>
            </div>
            ${
              dueDate
                ? `<div class="meta-row">
                    <span>${escapeHtml(dueLabel)}</span>
                    <span>${escapeHtml(new Date(dueDate).toLocaleDateString())}</span>
                  </div>`
                : ""
            }
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 10mm;">No</th>
                <th>Item Description</th>
                <th style="width: 16mm;" class="num">Qty</th>
                ${
                  showPrices
                    ? `<th style="width: 24mm;" class="num">Price</th>
                       <th style="width: 28mm;" class="num">Total</th>`
                    : ""
                }
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr><td class="center">-</td><td colspan="${emptyRowColSpan}">No items</td></tr>`
              }
            </tbody>
          </table>
        </div>

        ${renderSummary(isLastPage)}

        <div class="footer">
          <div class="footer-grid">
            ${buildContactLine("Phone", footerPhone)}
            ${buildContactLine("Address", footerAddress)}
          </div>
        </div>
      </div>
    `;
  };

  const pagesHtml = pages
    .map((pageItems, pageIndex) => renderPage(pageItems, pageIndex))
    .join(`<div class="page-break"></div>`);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      * { box-sizing: border-box; }
      @page { size: A5; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 148mm;
        min-height: 210mm;
        background: #e5e7eb;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: ${TEXT_DARK};
      }
      .page {
        position: relative;
        width: 148mm;
        min-height: 210mm;
        padding: 7.2mm 7.2mm 8.8mm;
        background: white;
        overflow: visible;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .page.compact {
        padding: 6.2mm 6.8mm 8.5mm;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
        height: 0;
      }
      .decor-top {
        position: absolute;
        inset: 0 0 auto 0;
        width: 100%;
        height: 16mm;
        pointer-events: none;
      }
      .decor-pill {
        position: absolute;
        top: 0;
        right: 0;
        width: 10mm;
        height: 16mm;
        border-bottom-left-radius: 999px;
        border-bottom-right-radius: 999px;
        background: ${THEME_COLOR};
      }
      .decor-pill.secondary {
        right: 12mm;
        height: 11mm;
        background: ${THEME_DARK};
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 6mm;
        align-items: flex-start;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .brand-logo,
      .brand-mark {
        width: 14mm;
        height: 14mm;
        border-radius: 3mm;
        flex: 0 0 auto;
      }
      .brand-logo {
        object-fit: contain;
      }
      .brand-mark {
        background: linear-gradient(135deg, ${THEME_DARK}, ${THEME_COLOR});
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 5.5mm;
      }
      .brand-copy {
        min-width: 0;
      }
      .brand-title {
        margin: 0;
        font-size: 5.8mm;
        line-height: 1.05;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .brand-line {
        margin-top: 0.6mm;
        font-size: 2.55mm;
        line-height: 1.1;
        font-weight: 700;
        color: ${THEME_DARK};
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .meta {
        text-align: right;
        min-width: 42mm;
        padding-top: 0.5mm;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 3mm;
        font-size: 2.6mm;
        line-height: 1.15;
        margin-bottom: 0.7mm;
      }
      .meta-row span:first-child {
        color: ${TEXT_MUTED};
      }
      .accent-bar {
        width: 100%;
        height: 1.2mm;
        margin: 2.2mm 0 2.2mm;
        background: linear-gradient(180deg, ${THEME_COLOR}, ${THEME_DARK});
      }
      .details-row {
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 5mm;
        align-items: start;
        margin-top: 0.5mm;
      }
      .details-left {
        font-size: 2.55mm;
        line-height: 1.28;
      }
      .details-label {
        font-size: 2.85mm;
        font-weight: 700;
        margin-bottom: 0.5mm;
        color: ${TEXT_DARK};
      }
      .details-name {
        font-size: 3mm;
        font-weight: 800;
        color: ${TEXT_DARK};
        margin-bottom: 0.35mm;
      }
      .details-code {
        display: inline-block;
        margin: 0.3mm 0 0.7mm;
        padding: 0.3mm 1.2mm;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.1);
        color: ${THEME_DARK};
        font-size: 2.35mm;
        font-weight: 700;
      }
      .details-muted {
        color: ${TEXT_MUTED};
        font-size: 2.45mm;
        line-height: 1.2;
      }
      .details-line {
        margin-top: 0.6mm;
        color: ${TEXT_MUTED};
        font-size: 2.45mm;
      }
      .details-right {
        justify-self: end;
        width: 56mm;
        padding-top: 0;
      }
      .details-right .meta-row {
        font-size: 2.45mm;
        margin-bottom: 0.5mm;
      }
      .details-right .meta-row span:first-child {
        min-width: 16mm;
        text-align: left;
      }
      .details-right .meta-row span:last-child {
        text-align: right;
        flex: 1;
      }
      .table-wrap {
        margin-top: 2.2mm;
        border: 0.3mm solid #a9b1bb;
        overflow: hidden;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      thead th {
        background: ${THEME_COLOR};
        color: white;
        font-size: 2.45mm;
        padding: 1.5mm 1.2mm;
        text-align: center;
        font-weight: 700;
      }
      tbody td {
        border-top: 0.25mm solid #a9b1bb;
        padding: 1.4mm 1.2mm;
        vertical-align: top;
        font-size: 2.4mm;
        word-break: break-word;
      }
      tbody tr:first-child td {
        border-top: none;
      }
      .center { text-align: center; }
      .num { text-align: right; white-space: nowrap; }
      thead th:nth-child(1),
      tbody td:nth-child(1) {
        width: 10mm;
      }
      thead th:nth-child(2),
      tbody td:nth-child(2) {
        text-align: left;
      }
      thead th:nth-child(3),
      tbody td:nth-child(3) {
        width: 16mm;
      }
      thead th:nth-child(4),
      tbody td:nth-child(4) {
        width: 24mm;
      }
      thead th:nth-child(5),
      tbody td:nth-child(5) {
        width: 28mm;
      }
      .item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5mm;
      }
      .item-name {
        font-weight: 700;
        color: ${TEXT_DARK};
        min-width: 0;
      }
      .item-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.3mm 1mm;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.1);
        color: ${THEME_DARK};
        font-size: 2.2mm;
        font-weight: 700;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 54mm;
        gap: 5mm;
        margin-top: 2.2mm;
        align-items: start;
      }
      .totals {
        border: 0.3mm solid #a9b1bb;
        overflow: hidden;
        width: 100%;
      }
      .totals table {
        width: 100%;
        table-layout: fixed;
      }
      .totals table td {
        padding: 1.35mm 1.8mm;
        font-size: 2.35mm;
        border-top: 0.25mm solid #a9b1bb;
        vertical-align: middle;
      }
      .totals tr:first-child td {
        border-top: none;
      }
      .totals .label {
        color: ${TEXT_MUTED};
        width: 62%;
        white-space: nowrap;
        text-align: left;
      }
      .totals .value {
        text-align: right;
        font-weight: 700;
        white-space: nowrap;
        width: 38%;
      }
      .totals .grand td {
        background: ${THEME_COLOR};
        color: white;
        font-weight: 800;
      }
      .notes {
        border-top: 1px dashed ${BORDER_COLOR};
        padding-top: 1.8mm;
        font-size: 2.45mm;
        line-height: 1.35;
        color: ${TEXT_MUTED};
      }
      .footer {
        position: absolute;
        left: 7mm;
        right: 7mm;
        bottom: 3.4mm;
      }
      .footer-grid {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        flex-wrap: wrap;
        color: ${TEXT_MUTED};
        font-size: 2.3mm;
      }
      .footer-item {
        display: inline-flex;
        align-items: center;
        gap: 1.5mm;
      }
      .footer-dot {
        width: 1.8mm;
        height: 1.8mm;
        border-radius: 999px;
        background: ${THEME_COLOR};
        flex: 0 0 auto;
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
  </body>
</html>`;
};

export const combineInvoicePagesHtml = (firstPageHtml, secondPageHtml) => {
  const secondBody = String(secondPageHtml || "").match(
    /<body[^>]*>([\s\S]*)<\/body>/i,
  )?.[1];

  if (!secondBody) return firstPageHtml;

  return String(firstPageHtml || "").replace(
    /<\/body>\s*<\/html>\s*$/i,
    `<div class="page-break"></div>${secondBody}</body></html>`,
  );
};
