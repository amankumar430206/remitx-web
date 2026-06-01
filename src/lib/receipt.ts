import { jsPDF } from 'jspdf'
import type { Payment } from '@/api/payments'

function fmt(amount: string | number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function statusColor(s: string): string {
  switch (s) {
    case 'completed': case 'approved': return '#10B981'
    case 'processing':                 return '#3B82F6'
    case 'pending_approval':           return '#F59E0B'
    case 'rejected': case 'failed':    return '#EF4444'
    default:                           return '#9CA3AF'
  }
}

// ─── HTML receipt (used for PDF print) ───────────────────────────────────────

export function buildReceiptHtml(p: Payment): string {
  const sc = statusColor(p.status)
  const hasFee = parseFloat(p.fee_amount) > 0
  const totalDebit = parseFloat(p.source_amount) + parseFloat(p.fee_amount)
  const rate = parseFloat(p.exchange_rate).toFixed(4)
  const now = new Date().toLocaleString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const rows = [
    { label: 'Status',          value: statusLabel(p.status),                        color: sc },
    { label: 'Recipient',       value: p.beneficiary_name ?? '—' },
    { label: 'Country',         value: p.beneficiary_country_code ?? '—' },
    null,
    { label: 'Transfer amount', value: fmt(p.source_amount, p.source_currency) },
    { label: 'Transfer fee',    value: hasFee ? fmt(p.fee_amount, p.source_currency) : fmt('0', p.source_currency) },
    ...(hasFee ? [{ label: 'Total debit', value: fmt(String(totalDebit), p.source_currency), bold: true }] : []),
    { label: 'Exchange rate',   value: `1 ${p.source_currency} = ${rate} ${p.dest_currency}` },
    { label: 'They receive',    value: fmt(p.dest_amount, p.dest_currency), bold: true },
    null,
    { label: 'Purpose',         value: p.purpose_code },
    ...(p.reference ? [{ label: 'Reference', value: p.reference, mono: true }] : []),
    { label: 'Submitted',       value: fmtDate(p.created_at) },
    ...(p.completed_at ? [{ label: 'Completed', value: fmtDate(p.completed_at) }] : []),
    null,
    { label: 'Payment ID',      value: p.id, mono: true, small: true },
  ] as Array<{ label: string; value: string; color?: string; bold?: boolean; mono?: boolean; small?: boolean } | null>

  const rowsHtml = rows.map(r => {
    if (r === null) return '<tr><td colspan="2" class="divider"></td></tr>'
    return `
      <tr>
        <td class="label">${r.label}</td>
        <td class="value${r.bold ? ' bold' : ''}${r.mono ? ' mono' : ''}${r.small ? ' small' : ''}"
            ${r.color ? `style="color:${r.color}"` : ''}>
          ${r.value}
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RemitX Payment Receipt</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    padding: 32px 24px;
    max-width: 520px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .logo {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .logo-arrow { color: white; font-size: 20px; font-weight: 900; }
  .brand { flex: 1; }
  .brand-name { font-size: 18px; font-weight: 800; color: #1e293b; letter-spacing: -0.3px; }
  .brand-sub  { font-size: 11px; color: #94a3b8; margin-top: 1px; }
  .receipt-label { font-size: 11px; font-weight: 700; color: #6366f1; letter-spacing: 0.8px; text-transform: uppercase; }

  .hero {
    background: linear-gradient(135deg, #1a1040 0%, #0f1a3a 100%);
    border-radius: 16px;
    padding: 28px 24px;
    text-align: center;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: rgba(99,102,241,0.15);
  }

  .hero-label { font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
  .hero-amount { font-size: 38px; font-weight: 800; color: #f1f5f9; letter-spacing: -1.5px; line-height: 1; margin-bottom: 8px; }
  .hero-route {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-bottom: 14px;
  }
  .hero-ccy {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6);
  }
  .hero-arrow { color: rgba(255,255,255,0.3); font-size: 14px; }
  .hero-dest-amt { font-size: 13px; font-weight: 700; color: #34d399; }
  .status-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: ${sc}22; border: 1px solid ${sc}44;
    border-radius: 100px; padding: 4px 12px;
    font-size: 12px; font-weight: 700; color: ${sc};
  }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: ${sc}; }

  .card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    margin-bottom: 20px;
  }

  table { width: 100%; border-collapse: collapse; }
  td { padding: 11px 16px; font-size: 13px; vertical-align: top; }
  td.label { color: #64748b; width: 42%; }
  td.value { color: #1e293b; font-weight: 600; text-align: right; }
  td.value.bold { font-weight: 800; color: #0f172a; }
  td.value.mono { font-family: 'Courier New', monospace; font-size: 11px; color: #475569; word-break: break-all; }
  td.value.small { font-size: 10px; }
  tr { border-bottom: 1px solid #f1f5f9; }
  tr:last-child { border-bottom: none; }
  td.divider { padding: 0; height: 1px; background: #e2e8f0; }

  .footer {
    text-align: center;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }
  .footer p { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .footer strong { color: #64748b; }
  .generated { font-size: 10px; color: #cbd5e1; margin-top: 8px; }

  @media print {
    body { background: white; padding: 0; }
  }
</style>
</head>
<body>

  <div class="header">
    <div class="logo"><span class="logo-arrow">⇄</span></div>
    <div class="brand">
      <div class="brand-name">RemitX</div>
      <div class="brand-sub">International Payment Platform</div>
    </div>
    <div class="receipt-label">Receipt</div>
  </div>

  <div class="hero">
    <div class="hero-label">You sent</div>
    <div class="hero-amount">${fmt(p.source_amount, p.source_currency)}</div>
    <div class="hero-route">
      <div class="hero-ccy">${p.source_currency}</div>
      <span class="hero-arrow">→</span>
      <div class="hero-ccy">${p.dest_currency}</div>
      <div class="hero-dest-amt">${fmt(p.dest_amount, p.dest_currency)}</div>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      ${statusLabel(p.status)}
    </div>
  </div>

  <div class="card">
    <table>
      ${rowsHtml}
    </table>
  </div>

  <div class="footer">
    <p>This is an official payment receipt issued by <strong>RemitX</strong>.<br/>
    Please retain for your records.</p>
    <div class="generated">Generated on ${now}</div>
  </div>

</body>
</html>`
}

// ─── Plain text receipt (used for clipboard copy) ────────────────────────────

export function buildReceiptText(p: Payment): string {
  const hasFee = parseFloat(p.fee_amount) > 0
  const totalDebit = (parseFloat(p.source_amount) + parseFloat(p.fee_amount)).toFixed(2)
  const rate = parseFloat(p.exchange_rate).toFixed(4)
  const sep = '─'.repeat(38)

  const lines = [
    'REMITX PAYMENT RECEIPT',
    sep,
    `Status:           ${statusLabel(p.status)}`,
    `Recipient:        ${p.beneficiary_name ?? '—'}`,
    `Country:          ${p.beneficiary_country_code ?? '—'}`,
    sep,
    `You sent:         ${fmt(p.source_amount, p.source_currency)}`,
    `Transfer fee:     ${hasFee ? fmt(p.fee_amount, p.source_currency) : fmt('0', p.source_currency)}`,
    ...(hasFee ? [`Total debit:      ${fmt(totalDebit, p.source_currency)}`] : []),
    `Exchange rate:    1 ${p.source_currency} = ${rate} ${p.dest_currency}`,
    `They receive:     ${fmt(p.dest_amount, p.dest_currency)}`,
    sep,
    `Purpose:          ${p.purpose_code}`,
    ...(p.reference ? [`Reference:        ${p.reference}`] : []),
    `Submitted:        ${fmtDate(p.created_at)}`,
    ...(p.completed_at ? [`Completed:        ${fmtDate(p.completed_at)}`] : []),
    sep,
    `Payment ID:       ${p.id}`,
    sep,
    'RemitX — International Payment Platform',
  ]

  return lines.join('\n')
}

// ─── Text-style HTML (monospace, matches copy-as-text output) ────────────────

export function buildTextReceiptHtml(p: Payment): string {
  const text = buildReceiptText(p)
  const now = new Date().toLocaleString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  // Escape HTML special chars so the raw text renders safely
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>RemitX Payment Receipt</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    background: #ffffff;
    color: #1e293b;
    padding: 48px 40px;
    max-width: 600px;
    margin: 0 auto;
    font-size: 13px;
    line-height: 1.7;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  .generated {
    margin-top: 32px;
    font-size: 10px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
  }
  @media print {
    body { padding: 24px; }
  }
</style>
</head>
<body>
  <pre>${escaped}</pre>
  <div class="generated">Generated on ${now}</div>
</body>
</html>`
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function _printHtml(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;opacity:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  iframe.onload = () => {
    iframe.contentWindow!.focus()
    iframe.contentWindow!.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
    }, 2000)
  }
}

/** Opens the browser print dialog with the styled visual receipt. */
export function printReceiptAsPdf(p: Payment): void {
  _printHtml(buildReceiptHtml(p))
}

/** Opens the browser print dialog with the plain text-format receipt. */
export function printReceiptAsTextPdf(p: Payment): void {
  _printHtml(buildTextReceiptHtml(p))
}


/** Generates a PDF receipt and triggers a direct browser download — no preview. */
export function downloadReceiptPdf(p: Payment): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw   = doc.internal.pageSize.getWidth()   // 210
  const mx   = 20   // left/right margin
  const cw   = pw - mx * 2                        // content width = 170
  let y      = 20

  const hex  = (h: string) => {
    const v = h.replace('#', '')
    return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)] as [number,number,number]
  }
  const sc   = statusColor(p.status)
  const scRgb = hex(sc)

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(99, 102, 241)
  doc.roundedRect(mx, y, 10, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('R', mx + 3.5, y + 7)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(15)
  doc.text('RemitX', mx + 14, y + 7.5)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Payment Receipt', pw - mx, y + 7.5, { align: 'right' })

  y += 14
  doc.setDrawColor(226, 232, 240)
  doc.line(mx, y, pw - mx, y)
  y += 10

  // ── Hero box ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 52)
  doc.roundedRect(mx, y, cw, 46, 4, 4, 'F')

  doc.setTextColor(170, 175, 200)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('YOU SENT', pw / 2, y + 9, { align: 'center' })

  doc.setTextColor(241, 245, 249)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(p.source_amount, p.source_currency), pw / 2, y + 22, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 200, 160)
  doc.text(`${p.dest_currency}  ${fmt(p.dest_amount, p.dest_currency)}`, pw / 2, y + 31, { align: 'center' })

  // Status pill
  const sLabel = statusLabel(p.status).toUpperCase()
  const pillW  = doc.getTextWidth(sLabel) + 10
  doc.setFillColor(...scRgb)
  doc.roundedRect(pw / 2 - pillW / 2, y + 35, pillW, 6, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(sLabel, pw / 2, y + 39.5, { align: 'center' })

  y += 54

  // ── Data rows ─────────────────────────────────────────────────────────────
  const hasFee   = parseFloat(p.fee_amount) > 0
  const totalDeb = (parseFloat(p.source_amount) + parseFloat(p.fee_amount)).toFixed(2)
  const rate     = parseFloat(p.exchange_rate).toFixed(4)

  const rows: Array<{ label: string; value: string; bold?: boolean; color?: string } | 'divider'> = [
    { label: 'Transfer amount', value: fmt(p.source_amount, p.source_currency) },
    { label: 'Fee',             value: hasFee ? fmt(p.fee_amount, p.source_currency) : fmt('0', p.source_currency) },
    ...(hasFee ? [{ label: 'Total debit', value: fmt(totalDeb, p.source_currency), bold: true }] : []),
    { label: 'Exchange rate',   value: `1 ${p.source_currency} = ${rate} ${p.dest_currency}` },
    { label: 'They receive',    value: fmt(p.dest_amount, p.dest_currency), bold: true, color: '#10B981' },
    'divider',
    { label: 'Recipient',       value: p.beneficiary_name ?? '-' },
    { label: 'Country',         value: p.beneficiary_country_code ?? '-' },
    ...(p.beneficiary_bank_name       ? [{ label: 'Bank',        value: p.beneficiary_bank_name }]       : []),
    ...(p.beneficiary_account_number  ? [{ label: 'Account no.', value: p.beneficiary_account_number }]  : []),
    ...(p.beneficiary_iban            ? [{ label: 'IBAN',        value: p.beneficiary_iban }]            : []),
    ...(p.beneficiary_swift_bic       ? [{ label: 'SWIFT/BIC',   value: p.beneficiary_swift_bic }]       : []),
    'divider',
    { label: 'Purpose',         value: p.purpose_code },
    ...(p.reference ? [{ label: 'Reference', value: p.reference }] : []),
    { label: 'Submitted',       value: fmtDate(p.created_at) },
    ...(p.completed_at ? [{ label: 'Completed', value: fmtDate(p.completed_at) }] : []),
    'divider',
    { label: 'Payment ID',      value: p.id },
  ]

  for (const row of rows) {
    if (row === 'divider') {
      doc.setDrawColor(226, 232, 240)
      doc.line(mx, y + 2, pw - mx, y + 2)
      y += 6
      continue
    }
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(row.label, mx, y)

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    if (row.color) {
      doc.setTextColor(...hex(row.color))
    } else {
      doc.setTextColor(15, 23, 42)
    }
    doc.text(row.value, pw - mx, y, { align: 'right' })

    doc.setDrawColor(241, 245, 249)
    doc.line(mx, y + 2, pw - mx, y + 2)
    y += 7
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 8
  doc.setDrawColor(226, 232, 240)
  doc.line(mx, y, pw - mx, y)
  y += 6
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('This is an official payment receipt issued by RemitX. Please retain for your records.', pw / 2, y, { align: 'center' })
  y += 5
  doc.text(`Generated on ${new Date().toLocaleString()}`, pw / 2, y, { align: 'center' })

  doc.save(`remitx-receipt-${p.reference ?? p.id.slice(0, 8)}.pdf`)
}

/** Copies the plain-text receipt to clipboard. Returns true on success. */
export async function copyReceiptText(p: Payment): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReceiptText(p))
    return true
  } catch {
    return false
  }
}
