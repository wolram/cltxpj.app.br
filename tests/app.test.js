const test = require('node:test');
const assert = require('node:assert');
const { formatCurrencyInput, parseCurrency, formatMoney } = require('../js/app.js');

test('formatCurrencyInput', async (t) => {
    await t.test('should format numeric string to BRL currency', () => {
        const result = formatCurrencyInput('1000'); // 10.00
        // Use regex to handle different types of spaces in toLocaleString
        assert.match(result, /R\$\s?10,00/);
    });

    await t.test('should handle strings with non-digits', () => {
        const result = formatCurrencyInput('R$ 1.234,56');
        // "123456" / 100 = 1234.56
        assert.match(result, /R\$\s?1\.234,56/);
    });

    await t.test('should handle empty string as 0,00', () => {
        const result = formatCurrencyInput('');
        assert.match(result, /R\$\s?0,00/);
    });

    await t.test('should format large numbers correctly', () => {
        const result = formatCurrencyInput('123456789'); // 1.234.567,89
        assert.match(result, /R\$\s?1\.234\.567,89/);
    });
});

test('parseCurrency', async (t) => {
    await t.test('should parse BRL string to number', () => {
        assert.strictEqual(parseCurrency('R$ 1.234,56'), 1234.56);
    });

    await t.test('should handle empty string', () => {
        assert.strictEqual(parseCurrency(''), 0);
    });
});

test('formatMoney', async (t) => {
    await t.test('should format number to BRL string', () => {
        const result = formatMoney(1234.56);
        assert.match(result, /R\$\s?1\.234,56/);
    });
});
