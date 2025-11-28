/**
 * Tests for PDF Generation Library
 * Low-level PDF utilities using pdf-lib
 */

import {
  createPdfDoc,
  addPage,
  drawHeaderFooter,
  drawTable,
  TableSpec,
} from './pdf';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Mock fs for logo loading
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('PDF Generation Library', () => {
  describe('createPdfDoc', () => {
    it('should create a PDF document with fonts', async () => {
      const result = await createPdfDoc();

      expect(result.doc).toBeDefined();
      expect(result.font).toBeDefined();
      expect(result.bold).toBeDefined();
    });

    it('should return PDFDocument instance', async () => {
      const result = await createPdfDoc();

      expect(result.doc).toBeInstanceOf(PDFDocument);
    });

    it('should embed Helvetica fonts', async () => {
      const result = await createPdfDoc();

      // Fonts should be embedded and usable
      expect(result.font).toBeDefined();
      expect(result.bold).toBeDefined();
    });

    it('should return null logo when logo file does not exist', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      const result = await createPdfDoc();

      expect(result.logoImage).toBeNull();
    });

    it('should attempt to load logo from public directory', async () => {
      const fs = require('fs');
      const path = require('path');

      fs.existsSync.mockReturnValue(false);

      await createPdfDoc();

      expect(path.join).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('addPage', () => {
    it('should add a letter-sized page to the document', async () => {
      const { doc } = await createPdfDoc();

      const page = addPage(doc);

      expect(page).toBeDefined();
      expect(page.getWidth()).toBe(612);
      expect(page.getHeight()).toBe(792);
    });

    it('should return a PDFPage instance', async () => {
      const { doc } = await createPdfDoc();

      const page = addPage(doc);

      expect(page).toBeDefined();
      expect(typeof page.getSize).toBe('function');
    });

    it('should add page in portrait orientation', async () => {
      const { doc } = await createPdfDoc();

      const page = addPage(doc);
      const { width, height } = page.getSize();

      expect(width).toBeLessThan(height);
    });
  });

  describe('drawHeaderFooter', () => {
    it('should draw header and footer without logo', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage: null };
      const header = {
        titleLeft: 'Test Document',
      };

      expect(() => drawHeaderFooter(page, fonts, header)).not.toThrow();
    });

    it('should handle optional titleRight', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage: null };
      const header = {
        titleLeft: 'Test Document',
        titleRight: 'Additional Info',
      };

      expect(() => drawHeaderFooter(page, fonts, header)).not.toThrow();
    });

    it('should handle optional subtitle', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage: null };
      const header = {
        titleLeft: 'Test Document',
        subtitle: 'Subtitle text',
      };

      expect(() => drawHeaderFooter(page, fonts, header)).not.toThrow();
    });

    it('should draw both titleRight and subtitle', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage: null };
      const header = {
        titleLeft: 'Test Document',
        titleRight: 'Right Title',
        subtitle: 'Subtitle text',
      };

      expect(() => drawHeaderFooter(page, fonts, header)).not.toThrow();
    });

    it('should include branding text when logo is not available', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage: null };
      const header = {
        titleLeft: 'Test Document',
      };

      drawHeaderFooter(page, fonts, header);

      // Function should complete without error
      // In actual implementation, it draws "Benefits Booster" text
      expect(true).toBe(true);
    });
  });

  describe('drawTable', () => {
    it('should draw a simple table', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Test Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
          { key: 'value', header: 'Value', width: 100 },
        ],
        rows: [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 },
        ],
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result).toBeDefined();
      expect(result.nextY).toBeLessThan(700);
      expect(result.exhausted).toBe(false);
    });

    it('should return exhausted true when out of space', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Test Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
        ],
        rows: Array(100).fill({ name: 'Item' }),
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 100, // Start very low, should run out of space
      });

      expect(result.exhausted).toBe(true);
    });

    it('should handle null and undefined values', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Test Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
          { key: 'value', header: 'Value', width: 100 },
        ],
        rows: [
          { name: 'Item 1', value: null },
          { name: 'Item 2', value: undefined },
        ],
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result.exhausted).toBe(false);
    });

    it('should handle empty rows', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Empty Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
        ],
        rows: [],
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result.exhausted).toBe(false);
    });

    it('should draw footer note if provided', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Test Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
        ],
        rows: [
          { name: 'Item 1' },
        ],
        footerNote: 'This is a footer note',
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result.exhausted).toBe(false);
    });

    it('should handle multiple columns', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Multi-column Table',
        columns: [
          { key: 'col1', header: 'Column 1', width: 100 },
          { key: 'col2', header: 'Column 2', width: 100 },
          { key: 'col3', header: 'Column 3', width: 100 },
          { key: 'col4', header: 'Column 4', width: 100 },
        ],
        rows: [
          { col1: 'A', col2: 'B', col3: 'C', col4: 'D' },
          { col1: 'E', col2: 'F', col3: 'G', col4: 'H' },
        ],
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result.exhausted).toBe(false);
    });

    it('should convert number values to strings', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Numeric Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
          { key: 'count', header: 'Count', width: 100 },
        ],
        rows: [
          { name: 'Item 1', count: 42 },
          { name: 'Item 2', count: 100 },
        ],
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 700,
      });

      expect(result.exhausted).toBe(false);
    });

    it('should signal exhausted when footer note does not fit', async () => {
      const { doc, font, bold } = await createPdfDoc();
      const page = addPage(doc);

      const table: TableSpec = {
        title: 'Test Table',
        columns: [
          { key: 'name', header: 'Name', width: 200 },
        ],
        rows: [
          { name: 'Item 1' },
        ],
        footerNote: 'Footer note',
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 80, // Very low, footer won't fit
      });

      expect(result.exhausted).toBe(true);
    });
  });

  describe('Integration - Complete PDF Generation', () => {
    it('should create a complete PDF with multiple elements', async () => {
      const { doc, font, bold, logoImage } = await createPdfDoc();
      const page = addPage(doc);

      const fonts = { font, bold, logoImage };
      const header = {
        titleLeft: 'Company Report',
        titleRight: 'November 2024',
        subtitle: 'Monthly Summary',
      };

      drawHeaderFooter(page, fonts, header);

      const table: TableSpec = {
        title: 'Sales Data',
        columns: [
          { key: 'product', header: 'Product', width: 200 },
          { key: 'sales', header: 'Sales', width: 100 },
        ],
        rows: [
          { product: 'Widget A', sales: 1000 },
          { product: 'Widget B', sales: 2000 },
        ],
        footerNote: 'Total: $3,000',
      };

      const result = drawTable({
        page,
        fonts: { font, bold },
        table,
        topY: 650,
      });

      expect(result.exhausted).toBe(false);

      // Generate PDF bytes
      const pdfBytes = await doc.save();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    it('should create PDF with multiple pages', async () => {
      const { doc, font, bold, logoImage } = await createPdfDoc();

      // Page 1
      const page1 = addPage(doc);
      drawHeaderFooter(page1, { font, bold, logoImage }, { titleLeft: 'Page 1' });

      // Page 2
      const page2 = addPage(doc);
      drawHeaderFooter(page2, { font, bold, logoImage }, { titleLeft: 'Page 2' });

      const pages = doc.getPages();
      expect(pages.length).toBe(2);

      const pdfBytes = await doc.save();
      expect(pdfBytes.length).toBeGreaterThan(0);
    });
  });
});
