const THEME_COLOR = "#0f766e";
const THEME_DARK = "#134e4a";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#475569";
const BORDER_COLOR = "#cbd5e1";
const SOFT_BG = "#f8fafc";

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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const buildContactLine = (label, value) =>
  value
    ? `<div class="footer-item"><span class="footer-dot"></span><span><strong>${escapeHtml(
        label,
      )}:</strong> ${escapeHtml(value)}</span></div>`
    : "";

export const buildInvoicePrintHtml = ({
  documentTitle = "Invoice",
  companyName = "InventoryPro",
  slogan = "Smart billing and stock management",
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
  status = "-",
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
  footerPhone = "0311 3208249",
  footerAddress = "Defence Road Opposite DHA RAHBAR",
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const rows = safeItems
    .map((item, index) => {
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
    })
    .join("");

  const safeNotes = escapeHtml(notes).replaceAll("\n", "<br />");
  const partyBlockCode = partyCode
    ? `<div class="muted">${escapeHtml(partyCode)}</div>`
    : "";

  const receivedValue = Number(receivedAmount || 0);
  const remainingValue = Number(remainingAmount || 0);
  const carageValue = Number(carage || 0);

  const totalQty = safeItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const emptyRowColSpan = showPrices ? 4 : 2;
  const showBottomSummary = showPrices || showSummaryBox;

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
        padding: 10mm 10mm 9mm;
        background: white;
        overflow: hidden;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
        height: 0;
      }
      .decor-top {
        position: absolute;
        top: 0;
        right: 0;
        width: 100%;
        height: 24mm;
        pointer-events: none;
      }
      .decor-pill {
        position: absolute;
        top: 0;
        right: 0;
        width: 12mm;
        height: 24mm;
        border-bottom-left-radius: 999px;
        border-bottom-right-radius: 999px;
        background: ${THEME_COLOR};
      }
      .decor-pill.secondary {
        right: 15mm;
        height: 17mm;
        background: ${THEME_DARK};
      }
      .accent-bar {
        width: 100%;
        height: 2mm;
        margin: 6mm 0 5mm;
        background: linear-gradient(180deg, ${THEME_COLOR}, ${THEME_DARK});
        box-shadow: 0 2px 0 rgba(15, 118, 110, 0.18);
      }
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-top: 0;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-logo {
        width: 18mm;
        height: 18mm;
        object-fit: contain;
        border-radius: 4mm;
      }
      .brand-mark {
        width: 18mm;
        height: 18mm;
        border-radius: 4mm;
        background: linear-gradient(135deg, ${THEME_DARK}, ${THEME_COLOR});
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 7mm;
      }
      .brand-title {
        margin: 0;
        font-size: 8mm;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .brand-subtitle {
        margin-top: 1mm;
        font-size: 3.15mm;
        color: ${TEXT_MUTED};
      }
      .meta {
        text-align: right;
        min-width: 58mm;
        padding-top: 4mm;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 10mm;
        font-size: 3.4mm;
        margin-bottom: 1mm;
        min-width: 56mm;
      }
      .meta-row span:first-child {
        color: ${TEXT_MUTED};
      }
      .details-row {
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 12mm;
        align-items: start;
        margin-top: 2mm;
      }
      .details-left {
        font-size: 3.25mm;
        color: ${TEXT_DARK};
        line-height: 1.35;
      }
      .details-label {
        font-size: 3.8mm;
        font-weight: 700;
        color: ${TEXT_DARK};
        margin-bottom: 1.2mm;
      }
      .details-name {
        font-size: 4mm;
        font-weight: 800;
        color: ${TEXT_DARK};
        margin-bottom: 0.5mm;
      }
      .details-muted {
        color: ${TEXT_MUTED};
        font-size: 3mm;
        line-height: 1.3;
      }
      .details-line {
        margin-top: 1mm;
        font-size: 3.05mm;
        color: ${TEXT_MUTED};
      }
      .details-right {
        justify-self: end;
        width: 72mm;
        padding-top: 1mm;
      }
      .details-right .meta-row {
        margin-bottom: 1.1mm;
        font-size: 3.15mm;
        gap: 6mm;
        min-width: 0;
      }
      .details-right .meta-row span:first-child {
        min-width: 24mm;
        text-align: left;
      }
      .details-right .meta-row span:last-child {
        text-align: right;
        flex: 1;
      }
      .table-wrap {
        margin-top: 6mm;
        border: 1px solid #a9b1bb;
        border-radius: 0;
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
        font-size: 3.15mm;
        padding: 3mm 2.2mm;
        text-align: center;
        font-weight: 700;
        vertical-align: middle;
      }
      tbody td {
        border-top: 0.35mm solid #a9b1bb;
        padding: 2.7mm 2.2mm;
        vertical-align: top;
        font-size: 3.05mm;
        word-break: break-word;
      }
      tbody tr:first-child td {
        border-top: none;
      }
      .center { text-align: center; }
      .num { text-align: right; white-space: nowrap; }
      thead th:nth-child(1),
      tbody td:nth-child(1) {
        width: 12mm;
        text-align: center;
      }
      thead th:nth-child(2),
      tbody td:nth-child(2) {
        width: auto;
        text-align: left;
      }
      thead th:nth-child(3),
      tbody td:nth-child(3) {
        width: 20mm;
        text-align: center;
      }
      thead th:nth-child(4),
      tbody td:nth-child(4) {
        width: 30mm;
        text-align: right;
      }
      thead th:nth-child(5),
      tbody td:nth-child(5) {
        width: 34mm;
        text-align: right;
      }
      .gatepass-box {
        border: 0.35mm solid #a9b1bb;
        padding: 4mm;
        font-size: 3.1mm;
        line-height: 1.45;
      }
      .gatepass-box h3 {
        margin: 0 0 2mm;
        font-size: 3.6mm;
        color: ${THEME_DARK};
      }
      .item-name {
        font-weight: 700;
        color: ${TEXT_DARK};
        margin: 0;
        flex: 1;
        min-width: 0;
      }
      .item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5mm;
      }
      .item-desc {
        color: ${TEXT_MUTED};
        font-size: 2.9mm;
        margin-bottom: 0.7mm;
      }
      .item-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.45mm 1.2mm;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.1);
        color: ${THEME_DARK};
        font-size: 2.6mm;
        font-weight: 700;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 72mm;
        gap: 10mm;
        margin-top: 4mm;
        align-items: start;
      }
      .totals {
        border: 0.35mm solid #a9b1bb;
        border-radius: 0;
        overflow: hidden;
        margin-top: 0;
        align-self: start;
      }
      .totals table td {
        padding: 2.8mm 4mm;
        font-size: 3.1mm;
        border-top: 0.35mm solid #a9b1bb;
      }
      .totals td:first-child {
        width: 60%;
        text-align: left;
      }
      .totals td:last-child {
        width: 40%;
        text-align: right;
        white-space: nowrap;
      }
      .totals table tr:first-child td {
        border-top: none;
      }
      .totals .label {
        color: ${TEXT_MUTED};
      }
      .totals .value {
        text-align: right;
        font-weight: 600;
        white-space: nowrap;
      }
      .totals .grand td {
        background: ${THEME_COLOR};
        color: white;
        font-weight: 800;
      }
      .notes {
        margin-top: 4mm;
        border-top: 1px dashed ${BORDER_COLOR};
        padding-top: 3mm;
        font-size: 3.05mm;
        color: ${TEXT_MUTED};
        line-height: 1.5;
      }
      .footer {
        position: absolute;
        left: 10mm;
        right: 10mm;
        bottom: 6mm;
        padding-top: 4mm;
      }
      .footer-grid {
        display: flex;
        justify-content: space-between;
        gap: 6mm;
        font-size: 2.9mm;
        color: ${TEXT_MUTED};
        flex-wrap: wrap;
      }
      .footer-item {
        display: inline-flex;
        align-items: center;
        gap: 2.4mm;
      }
      .footer-dot {
        width: 2.4mm;
        height: 2.4mm;
        border-radius: 999px;
        background: ${THEME_COLOR};
        flex: 0 0 auto;
      }
      .thankyou {
        margin-top: 3mm;
        text-align: center;
        font-size: 2.9mm;
        color: ${TEXT_MUTED};
      }
    </style>
  </head>
  <body>
    <div class="page">
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
          <div>
            <h1 class="brand-title">${escapeHtml(companyName)}</h1>
            ${
              slogan
                ? `<div class="brand-subtitle">${escapeHtml(slogan)}</div>`
                : ""
            }
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
            <span>${escapeHtml(formatDate(issueDate))}</span>
          </div>
          ${
            dueDate
              ? `<div class="meta-row">
                  <span>${escapeHtml(dueLabel)}</span>
                  <span>${escapeHtml(formatDate(dueDate))}</span>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 12mm;">No</th>
              <th>Item Description</th>
              <th style="width: 20mm;" class="num">Qty</th>
              ${
                showPrices
                  ? `<th style="width: 30mm;" class="num">Price</th>
                     <th style="width: 34mm;" class="num">Total</th>`
                  : ""
              }
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td class="center">-</td><td colspan="${emptyRowColSpan}">No items</td></tr>`}
          </tbody>
        </table>
      </div>

      ${
        showBottomSummary
          ? `<div class="bottom-grid">
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
                  : ``
              }
            </div>`
          : ""
      }

      <div class="thankyou">Thank you for your business.</div>

      <div class="footer">
        <div class="footer-grid">
          ${buildContactLine("Phone", footerPhone)}
          ${buildContactLine("Address", footerAddress)}
        </div>
      </div>
    </div>
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
