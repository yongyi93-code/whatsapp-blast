'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { normalizePhone, parseRows } = require('../src/recipients');
const { renderTemplate } = require('../src/sender');

test('normalizePhone: 已带国家码的号码原样保留', () => {
  assert.deepStrictEqual(normalizePhone('60123456789', '60'), {
    phone: '60123456789',
    chatId: '60123456789@c.us',
  });
});

test('normalizePhone: 带 + 和空格/横杠的号码被清洗', () => {
  assert.deepStrictEqual(normalizePhone('+60 12-345 6789', '60'), {
    phone: '60123456789',
    chatId: '60123456789@c.us',
  });
});

test('normalizePhone: 本地号前导 0 被替换为默认国家码', () => {
  assert.deepStrictEqual(normalizePhone('0123456789', '60'), {
    phone: '60123456789',
    chatId: '60123456789@c.us',
  });
});

test('normalizePhone: 00 国际前缀被去掉', () => {
  assert.strictEqual(normalizePhone('0060123456789', '60').phone, '60123456789');
});

test('normalizePhone: 科学计数法（Excel 数字）被还原', () => {
  assert.strictEqual(normalizePhone(60123456789, '60').phone, '60123456789');
  assert.strictEqual(normalizePhone('6.0123456789e10', '60').phone, '60123456789');
});

test('normalizePhone: 空值与过短号码返回 null', () => {
  assert.strictEqual(normalizePhone('', '60'), null);
  assert.strictEqual(normalizePhone(null, '60'), null);
  assert.strictEqual(normalizePhone('123', '60'), null);
});

test('parseRows: 提取收件人与变量，跳过非法行', () => {
  const rows = [
    ['phone', 'name', 'order'],
    ['60123456789', '小明', 'A1001'],
    ['', '空号', 'A1002'],
    ['0198887777', '小红', 'A1003'],
  ];
  const { recipients, errors, headers } = parseRows(rows, '60');

  assert.deepStrictEqual(headers, ['phone', 'name', 'order']);
  assert.strictEqual(recipients.length, 2);
  assert.strictEqual(recipients[0].chatId, '60123456789@c.us');
  assert.strictEqual(recipients[0].vars.name, '小明');
  assert.strictEqual(recipients[1].phone, '60198887777');
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].line, 3);
});

test('renderTemplate: 替换变量，缺失项保留并报告', () => {
  const { text, missing } = renderTemplate('你好 {name}，订单 {order}', {
    name: '小明',
    order: '',
  });
  assert.strictEqual(text, '你好 小明，订单 {order}');
  assert.deepStrictEqual(missing, ['order']);
});

test('renderTemplate: 没有占位符时原样返回', () => {
  const { text, missing } = renderTemplate('普通消息', { name: '小明' });
  assert.strictEqual(text, '普通消息');
  assert.deepStrictEqual(missing, []);
});
