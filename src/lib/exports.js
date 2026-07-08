import { genId, fmtDate } from "./helpers.js";

// Format CSV value to handle commas, quotes, newlines
export function formatCSVValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes('"') ||
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Flatten nested/complex record for CSV export
export function flattenRecordForCSV(record) {
  const flat = {};
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      flat[key] = JSON.stringify(value);
    } else if (typeof value === "object" && value !== null) {
      for (const [subKey, subValue] of Object.entries(value)) {
        flat[`${key}_${subKey}`] = subValue;
      }
    } else {
      flat[key] = value;
    }
  }
  return flat;
}

// Export data to CSV file
export function exportToCSV(filename, rows) {
  if (!rows.length) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];
  
  for (const row of rows) {
    const line = headers.map((header) => formatCSVValue(row[header])).join(",");
    csvLines.push(line);
  }
  
  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Open print view
export function openPrintView(docType, data, context = {}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print this document.");
    return;
  }

  let htmlContent = "";
  let title = "";

  if (docType === "invoice") {
    title = `Invoice ${data.invoiceNumber}`;
    htmlContent = generateInvoicePrintHTML(data, context);
  } else if (docType === "receipt") {
    title = `Receipt ${data.paymentNumber || data.receiptNumber}`;
    htmlContent = generateReceiptPrintHTML(data, context);
  } else if (docType === "proposal") {
    title = `Proposal ${data.proposalNumber}`;
    htmlContent = generateProposalPrintHTML(data, context);
  } else if (docType === "generic" || docType === "html") {
    title = context.title || "Document";
    htmlContent = data; // data is HTML string for generic use
  } else {
    // Legacy support: if docType looks like HTML, treat it as content
    if (typeof docType === "string" && (docType.includes("<") || docType.length > 100)) {
      htmlContent = docType;
      title = data || "Document";
    } else {
      title = docType;
      htmlContent = data; // Assume data is HTML string for generic use
    }
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; font-size: 14px; line-height: 1.5; color: #1f2937; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
        .title { font-size: 28px; font-weight: 700; color: #111827; }
        .meta { color: #6b7280; text-align: right; font-size: 13px; }
        .business-info { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 8px; }
        .business-details { color: #6b7280; font-size: 13px; line-height: 1.6; }
        .section { margin: 25px 0; }
        .section-title { font-weight: 700; margin-bottom: 12px; font-size: 16px; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 12px 14px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 13px; text-transform: uppercase; }
        td { font-size: 13px; }
        .totals-row { font-weight: 600; }
        .grand-total { font-size: 16px; font-weight: 700; color: #111827; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
        .amount { text-align: right; font-weight: 600; }
        .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 14px; font-weight: 600; color: #111827; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .client-box { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Generate professional invoice print HTML
function generateInvoicePrintHTML(invoice, context) {
  const currency = context.currency || invoice.currency || "INR";
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "AED" ? "AED " : "$";
  
  const lineItemsTable = invoice.lineItems?.map(item => `
    <tr>
      <td>${item.description || "—"}</td>
      <td style="text-align:center">${item.quantity || 1}</td>
      <td style="text-align:right">${symbol}${Number(item.unitPrice || 0).toFixed(2)}</td>
      <td style="text-align:right">${symbol}${Number(item.discount || 0).toFixed(2)}</td>
      <td style="text-align:right">${item.taxRate || 0}%</td>
      <td style="text-align:right;font-weight:600">${symbol}${Number(item.total || 0).toFixed(2)}</td>
    </tr>
  `).join("") || "<tr><td colspan='6' style='text-align:center;color:#6b7280'>No line items</td></tr>";

  return `
    <div class="header">
      <div>
        <div class="business-info">${context.businessName || "Founder OS CRM"}</div>
        <div class="business-details">
          ${context.ownerName ? `<div>${context.ownerName}</div>` : ""}
          ${context.ownerEmail ? `<div>${context.ownerEmail}</div>` : ""}
          ${context.ownerPhone ? `<div>${context.ownerPhone}</div>` : ""}
          ${context.ownerAddress ? `<div>${context.ownerAddress}</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px;">INVOICE</div>
        <div><span class="label">Invoice #:</span> <span class="value">${invoice.invoiceNumber}</span></div>
        <div><span class="label">Date:</span> <span class="value">${invoice.issueDate || new Date().toISOString().slice(0,10)}</span></div>
        <div><span class="label">Due Date:</span> <span class="value">${invoice.dueDate || "—"}</span></div>
        <div><span class="label">Status:</span> <span class="value">${invoice.status}</span></div>
      </div>
    </div>

    ${invoice.invoiceTitle ? `<div style="font-size:18px;font-weight:600;margin-bottom:20px;color:#374151;">${invoice.invoiceTitle}</div>` : ""}

    <div class="two-col">
      <div class="client-box">
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Bill To</div>
        <div style="font-weight:600;font-size:15px;margin-bottom:5px;">${invoice.clientName || "—"}</div>
        ${invoice.clientCompany ? `<div style="color:#6b7280;margin-bottom:5px;">${invoice.clientCompany}</div>` : ""}
        ${invoice.clientEmail ? `<div style="color:#6b7280;margin-bottom:3px;">${invoice.clientEmail}</div>` : ""}
        ${invoice.clientPhone ? `<div style="color:#6b7280;margin-bottom:3px;">${invoice.clientPhone}</div>` : ""}
        ${invoice.clientAddress ? `<div style="color:#6b7280;">${invoice.clientAddress}</div>` : ""}
      </div>
      <div>
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Project</div>
        <div style="font-weight:600;font-size:15px;">${invoice.projectName || "—"}</div>
        ${invoice.projectId ? `<div style="color:#6b7280;margin-top:5px;font-size:12px;">ID: ${invoice.projectId}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Unit Price</th>
            <th style="text-align:right">Discount</th>
            <th style="text-align:right">Tax</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsTable}
        </tbody>
      </table>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:20px;">
      <div style="width:300px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
          <span class="label">Subtotal</span>
          <span class="value">${symbol}${Number(invoice.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
          <span class="label">Discount</span>
          <span class="value" style="color:#059669;">-${symbol}${Number(invoice.discountTotal || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
          <span class="label">Tax</span>
          <span class="value">${symbol}${Number(invoice.taxTotal || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
          <span class="label">Extra Charges</span>
          <span class="value">${symbol}${Number(invoice.extraCharges || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;background:#f9fafb;margin-top:10px;border-radius:4px;padding:12px;">
          <span class="label" style="font-size:14px;">Grand Total</span>
          <span class="grand-total">${symbol}${Number(invoice.grandTotal || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:10px;">
          <span class="label">Paid</span>
          <span class="value" style="color:#059669;">${symbol}${Number(context.paidAmount || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;">
          <span class="label">Balance Due</span>
          <span class="value" style="color:${context.pendingAmount > 0 ? "#dc2626" : "#059669"};">${symbol}${Number(context.pendingAmount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Payment Terms</div>
      <div style="color:#374151;line-height:1.6;">${invoice.paymentTerms || "—"}</div>
      ${invoice.paymentInstructions ? `
        <div class="section-title" style="margin-top:20px;">Payment Instructions</div>
        <div style="color:#374151;line-height:1.6;">${invoice.paymentInstructions}</div>
      ` : ""}
    </div>

    ${invoice.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <div style="color:#374151;line-height:1.6;">${invoice.notes}</div>
      </div>
    ` : ""}

    <div class="footer">
      ${invoice.footerText || "Thank you for your business!"}
      <div style="margin-top:8px;">Generated on ${new Date().toLocaleDateString()}</div>
    </div>
  `;
}

// Generate professional receipt print HTML
function generateReceiptPrintHTML(payment, context) {
  const currency = context.currency || "INR";
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "AED" ? "AED " : "$";
  
  return `
    <div class="header">
      <div>
        <div class="business-info">${context.businessName || "Founder OS CRM"}</div>
        <div class="business-details">
          ${context.ownerName ? `<div>${context.ownerName}</div>` : ""}
          ${context.ownerEmail ? `<div>${context.ownerEmail}</div>` : ""}
          ${context.ownerPhone ? `<div>${context.ownerPhone}</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px;">PAYMENT RECEIPT</div>
        <div><span class="label">Receipt #:</span> <span class="value">${payment.paymentNumber || payment.receiptNumber || "—"}</span></div>
        <div><span class="label">Date:</span> <span class="value">${payment.date || new Date().toISOString().slice(0,10)}</span></div>
      </div>
    </div>

    <div class="two-col">
      <div class="client-box">
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Received From</div>
        <div style="font-weight:600;font-size:15px;margin-bottom:5px;">${payment.clientName || "—"}</div>
      </div>
      <div>
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Payment Method</div>
        <div style="font-weight:600;font-size:15px;">${payment.method || "—"}</div>
      </div>
    </div>

    <div class="section" style="text-align:center;padding:40px;background:#f9fafb;border-radius:8px;border:2px solid #e5e7eb;">
      <div class="label" style="font-size:16px;margin-bottom:10px;">Amount Received</div>
      <div style="font-size:48px;font-weight:700;color:#059669;">${symbol}${Number(payment.amount || 0).toFixed(2)}</div>
    </div>

    <div class="two-col">
      <div>
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Reference</div>
        <div style="font-weight:600;font-size:15px;">${payment.reference || "—"}</div>
      </div>
      <div>
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Received By</div>
        <div style="font-weight:600;font-size:15px;">${payment.receivedBy || "—"}</div>
      </div>
    </div>

    ${payment.invoiceId ? `
      <div class="section">
        <div class="section-title">Related Invoice</div>
        <div style="font-weight:600;font-size:15px;">${payment.invoiceNumber || payment.invoiceId}</div>
      </div>
    ` : ""}

    ${payment.projectId ? `
      <div class="section">
        <div class="section-title">Related Project</div>
        <div style="font-weight:600;font-size:15px;">${payment.projectName || payment.projectId}</div>
      </div>
    ` : ""}

    ${payment.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <div style="color:#374151;line-height:1.6;">${payment.notes}</div>
      </div>
    ` : ""}

    <div class="footer">
      This receipt serves as confirmation of payment received.
      <div style="margin-top:8px;">Generated on ${new Date().toLocaleDateString()}</div>
    </div>
  `;
}

// Generate professional proposal print HTML
function generateProposalPrintHTML(proposal, context) {
  const currency = context.currency || "INR";
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "AED" ? "AED " : "$";
  
  // deliverables may be a string (textarea) or array — normalize
  const delivArr = Array.isArray(proposal.deliverables)
    ? proposal.deliverables
    : (proposal.deliverables || "").split("\n").map(s => s.trim()).filter(Boolean);
  const deliverablesList = delivArr.length
    ? delivArr.map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("")
    : "<li>No deliverables specified</li>";
  
  return `
    <div class="header">
      <div>
        <div class="business-info">${context.businessName || "Founder OS CRM"}</div>
        <div class="business-details">
          ${context.ownerName ? `<div>${context.ownerName}</div>` : ""}
          ${context.ownerEmail ? `<div>${context.ownerEmail}</div>` : ""}
          ${context.ownerPhone ? `<div>${context.ownerPhone}</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px;">PROPOSAL</div>
        <div><span class="label">Proposal #:</span> <span class="value">${proposal.proposalNumber || "—"}</span></div>
        <div><span class="label">Date:</span> <span class="value">${proposal.date || new Date().toISOString().slice(0,10)}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">${proposal.validityDate || "—"}</span></div>
        <div><span class="label">Status:</span> <span class="value">${proposal.status}</span></div>
      </div>
    </div>

    <div style="font-size:24px;font-weight:700;margin-bottom:30px;color:#111827;">${proposal.title || "—"}</div>

    <div class="two-col">
      <div class="client-box">
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Client</div>
        <div style="font-weight:600;font-size:15px;margin-bottom:5px;">${proposal.clientName || "—"}</div>
        ${proposal.contactId ? `<div style="color:#6b7280;">Contact ID: ${proposal.contactId}</div>` : ""}
      </div>
      <div>
        <div class="section-title" style="font-size:14px;margin-bottom:10px;">Project / Service</div>
        <div style="font-weight:600;font-size:15px;">${proposal.service || "—"}</div>
        ${proposal.projectId ? `<div style="color:#6b7280;margin-top:5px;">Project: ${proposal.projectName || proposal.projectId}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Scope of Work</div>
      <div style="color:#374151;line-height:1.6;">${proposal.scope || "—"}</div>
    </div>

    <div class="section">
      <div class="section-title">Deliverables</div>
      <ul style="color:#374151;line-height:1.6;padding-left:20px;">${deliverablesList}</ul>
    </div>

    <div class="section">
      <div class="section-title">Timeline</div>
      <div style="color:#374151;line-height:1.6;">${proposal.timeline || "—"}</div>
    </div>

    <div class="section">
      <div class="section-title">Milestones</div>
      <div style="color:#374151;line-height:1.6;white-space:pre-wrap;">${proposal.milestones || "—"}</div>
    </div>

    <div class="section">
      <div class="section-title">Pricing</div>
      <div style="color:#374151;line-height:1.6;white-space:pre-wrap;">${proposal.priceBreakdown || "—"}</div>
    </div>

    <div class="section">
      <div class="section-title">Terms & Conditions</div>
      <div style="color:#374151;line-height:1.6;">${proposal.terms || "—"}</div>
    </div>

    ${proposal.assumptions ? `
      <div class="section">
        <div class="section-title">Assumptions</div>
        <div style="color:#374151;line-height:1.6;">${proposal.assumptions}</div>
      </div>
    ` : ""}

    ${proposal.exclusions ? `
      <div class="section">
        <div class="section-title">Exclusions</div>
        <div style="color:#374151;line-height:1.6;">${proposal.exclusions}</div>
      </div>
    ` : ""}

    <div class="footer">
      ${context.businessName || "Founder OS CRM"} | Professional Services Proposal
      <div style="margin-top:8px;">Generated on ${new Date().toLocaleDateString()}</div>
    </div>
  `;
}

