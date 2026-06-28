'use strict';

const XLSX = require('xlsx');

// 把任意写法的手机号清洗成纯数字，并按需补国家码。
// 返回 { phone, chatId } 或 null（号码非法）。
function normalizePhone(raw, defaultCountryCode) {
  if (raw === undefined || raw === null) return null;

  let s = String(raw).trim();
  if (!s) return null;

  // 处理 Excel 把号码当数字读出来的科学计数法（如 6.012e10）
  if (/e\+?\d+$/i.test(s) && !Number.isNaN(Number(s))) {
    s = BigInt(Math.round(Number(s))).toString();
  }

  const hadPlus = s.trimStart().startsWith('+');

  // 只保留数字
  let digits = s.replace(/\D/g, '');
  if (!digits) return null;

  // 去掉国际拨号前缀 00（如 0060... -> 60...）
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!hadPlus && digits.startsWith('0')) {
    // 本地号码以 0 开头（如 0123456789）：去掉前导 0，补默认国家码
    digits = defaultCountryCode + digits.replace(/^0+/, '');
  }

  // 太短的不是有效号码（国家码+号码至少 ~8 位）
  if (digits.length < 8 || digits.length > 15) return null;

  return { phone: digits, chatId: `${digits}@c.us` };
}

// 把工作表的二维数组解析成收件人列表。
// rows[0] 是表头；第一列视为手机号，其余列为变量（列名 = 变量名）。
function parseRows(rows, defaultCountryCode) {
  const recipients = [];
  const errors = [];

  if (!rows || rows.length < 2) {
    return { recipients, errors, headers: [] };
  }

  const headers = rows[0].map((h) => String(h ?? '').trim());
  const phoneHeader = headers[0] || 'phone';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue; // 跳过空行
    }

    const normalized = normalizePhone(row[0], defaultCountryCode);
    const lineNo = i + 1; // 1-based，对应 Excel 行号

    // 变量字典：表头列名 -> 单元格值
    const vars = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) vars[key] = row[c] === undefined || row[c] === null ? '' : String(row[c]);
    }

    if (!normalized) {
      errors.push({ line: lineNo, raw: String(row[0] ?? ''), reason: '号码无效，已跳过' });
      continue;
    }

    recipients.push({
      line: lineNo,
      phone: normalized.phone,
      chatId: normalized.chatId,
      vars,
    });
  }

  return { recipients, errors, headers, phoneHeader };
}

// 从上传的 Excel/CSV 文件路径解析收件人。
function parseFile(filePath, defaultCountryCode) {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // header:1 -> 返回二维数组（含表头行）
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  return parseRows(rows, defaultCountryCode);
}

module.exports = { normalizePhone, parseRows, parseFile };
