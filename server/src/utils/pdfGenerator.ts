/**
 * Pure TypeScript Zero-Dependency PDF 1.4 Document Generator
 * Generates standards-compliant, publication-quality tabular PDF reports
 * for Attendance Management and Salary Processing.
 */

export interface PdfTableColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string }>;
  columns: PdfTableColumn[];
  rows: Array<Record<string, any>>;
  orientation?: 'portrait' | 'landscape';
}

export class SimplePdfDocument {
  private objects: string[] = [];
  private pageObjectIds: number[] = [];
  private fontRegularId = 0;
  private fontBoldId = 0;
  private isLandscape = true;
  private pageWidth = 792; // Landscape Letter default
  private pageHeight = 612;

  constructor(orientation: 'portrait' | 'landscape' = 'landscape') {
    this.isLandscape = orientation === 'landscape';
    this.pageWidth = this.isLandscape ? 792 : 612;
    this.pageHeight = this.isLandscape ? 612 : 792;

    // Font 1: Helvetica
    this.fontRegularId = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    );
    // Font 2: Helvetica-Bold
    this.fontBoldId = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    );
  }

  private addObject(content: string): number {
    this.objects.push(content);
    return this.objects.length;
  }

  private escapePdfText(text: string | number | null | undefined): string {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n\t]/g, ' ');
  }

  public generateReport(options: PdfReportOptions): Buffer {
    const { title, subtitle, metadata = [], columns, rows } = options;

    const marginX = 36;
    const marginTop = 36;
    const marginBottom = 36;
    const usableWidth = this.pageWidth - marginX * 2;
    const usableHeight = this.pageHeight - marginTop - marginBottom;

    // Scale column widths to fit usableWidth exactly if needed
    const totalSpecifiedWidth = columns.reduce((acc, c) => acc + c.width, 0);
    const scaleFactor = totalSpecifiedWidth > 0 ? usableWidth / totalSpecifiedWidth : 1;
    const adjustedColumns = columns.map((col) => ({
      ...col,
      width: col.width * scaleFactor,
    }));

    // Pagination setup
    const rowHeight = 18;
    const headerHeight = 22;
    const titleBlockHeight = 70 + (metadata.length > 0 ? 25 : 0);

    const pagesData: Array<{
      isFirstPage: boolean;
      rows: Array<Record<string, any>>;
      pageIndex: number;
    }> = [];

    let currentRowIndex = 0;
    let pageNum = 1;

    while (currentRowIndex < rows.length || (rows.length === 0 && pageNum === 1)) {
      const isFirst = pageNum === 1;
      const availableSpace = usableHeight - (isFirst ? titleBlockHeight : 30) - headerHeight - 20;
      const rowsPerPage = Math.max(1, Math.floor(availableSpace / rowHeight));

      const pageRows = rows.slice(currentRowIndex, currentRowIndex + rowsPerPage);
      pagesData.push({
        isFirstPage: isFirst,
        rows: pageRows,
        pageIndex: pageNum,
      });

      currentRowIndex += pageRows.length;
      pageNum++;
      if (rows.length === 0) break;
    }

    const totalPages = pagesData.length;

    // Render each page stream
    for (const pageData of pagesData) {
      let stream = '';

      // Header Brand bar
      stream += 'q\n';
      stream += '0.08 0.13 0.24 rg\n'; // PU Navy #152238

      let curY = this.pageHeight - marginTop;

      if (pageData.isFirstPage) {
        // University brand title
        stream += 'BT\n';
        stream += `/F2 16 Tf\n`;
        stream += `0.08 0.13 0.24 rg\n`;
        stream += `${marginX} ${curY - 14} Td\n`;
        stream += `(PARUL UNIVERSITY  |  LEAD DESK) Tj\n`;
        stream += 'ET\n';

        curY -= 24;

        // Document Title
        stream += 'BT\n';
        stream += `/F2 13 Tf\n`;
        stream += `0.79 0.58 0.08 rg\n`; // PU Gold #C99514
        stream += `${marginX} ${curY - 11} Td\n`;
        stream += `(${this.escapePdfText(title)}) Tj\n`;
        stream += 'ET\n';

        curY -= 16;

        if (subtitle) {
          stream += 'BT\n';
          stream += `/F1 9 Tf\n`;
          stream += `0.35 0.40 0.47 rg\n`;
          stream += `${marginX} ${curY - 8} Td\n`;
          stream += `(${this.escapePdfText(subtitle)}) Tj\n`;
          stream += 'ET\n';
          curY -= 14;
        }

        // Metadata row
        if (metadata.length > 0) {
          stream += 'BT\n';
          stream += `/F1 8 Tf\n`;
          stream += `0.20 0.25 0.32 rg\n`;
          let metaX = marginX;
          for (const m of metadata) {
            const metaStr = `${m.label}: ${m.value}     `;
            stream += `${metaX} ${curY - 8} Td\n`;
            stream += `(${this.escapePdfText(metaStr)}) Tj\n`;
            metaX += 130;
          }
          stream += 'ET\n';
          curY -= 16;
        }

        // Thin separator rule
        stream += `0.85 0.88 0.92 RG\n`;
        stream += `0.75 w\n`;
        stream += `${marginX} ${curY} m ${this.pageWidth - marginX} ${curY} l S\n`;
        curY -= 10;
      } else {
        // Subsequent page top running title
        stream += 'BT\n';
        stream += `/F2 8 Tf\n`;
        stream += `0.4 0.45 0.5 rg\n`;
        stream += `${marginX} ${curY - 8} Td\n`;
        stream += `(PARUL UNIVERSITY LEAD DESK  -  ${this.escapePdfText(title)}) Tj\n`;
        stream += 'ET\n';
        curY -= 18;
      }

      // Render Table Header
      const tableTopY = curY;
      stream += `0.08 0.13 0.24 rg\n`; // Dark navy background
      stream += `${marginX} ${tableTopY - headerHeight} ${usableWidth} ${headerHeight} re f\n`;

      // Header column text
      let colX = marginX;
      for (const col of adjustedColumns) {
        stream += 'BT\n';
        stream += `/F2 8 Tf\n`;
        stream += `1 1 1 rg\n`; // White text

        const text = this.escapePdfText(col.header);
        const padding = 5;
        let textX = colX + padding;
        if (col.align === 'center') {
          textX = colX + col.width / 2 - (text.length * 4) / 2;
        } else if (col.align === 'right') {
          textX = colX + col.width - padding - text.length * 4.5;
        }

        stream += `${Math.max(colX + 2, textX)} ${tableTopY - headerHeight + 6} Td\n`;
        stream += `(${text}) Tj\n`;
        stream += 'ET\n';

        colX += col.width;
      }

      curY = tableTopY - headerHeight;

      // Render Table Rows
      for (let r = 0; r < pageData.rows.length; r++) {
        const row = pageData.rows[r];
        const rowY = curY;

        // Alternating zebra stripe
        if (r % 2 === 1) {
          stream += `0.96 0.97 0.99 rg\n`;
          stream += `${marginX} ${rowY - rowHeight} ${usableWidth} ${rowHeight} re f\n`;
        }

        // Cell border bottom
        stream += `0.88 0.90 0.94 RG\n0.5 w\n`;
        stream += `${marginX} ${rowY - rowHeight} m ${this.pageWidth - marginX} ${rowY - rowHeight} l S\n`;

        // Render row cells
        let cellX = marginX;
        for (const col of adjustedColumns) {
          const val = row[col.key];
          let text = this.escapePdfText(val !== undefined && val !== null ? val : '-');

          // Truncate long strings to avoid overflowing column
          const maxChars = Math.max(3, Math.floor(col.width / 5));
          if (text.length > maxChars) {
            text = text.substring(0, maxChars - 2) + '..';
          }

          stream += 'BT\n';
          stream += `/F1 7.5 Tf\n`;
          stream += `0.15 0.18 0.22 rg\n`; // Dark slate text

          const padding = 5;
          let textX = cellX + padding;
          if (col.align === 'center') {
            textX = cellX + col.width / 2 - (text.length * 3.8) / 2;
          } else if (col.align === 'right') {
            textX = cellX + col.width - padding - text.length * 4.2;
          }

          stream += `${Math.max(cellX + 2, textX)} ${rowY - rowHeight + 5} Td\n`;
          stream += `(${text}) Tj\n`;
          stream += 'ET\n';

          cellX += col.width;
        }

        curY -= rowHeight;
      }

      // Outer table border
      const tableBottomY = curY;
      stream += `0.80 0.83 0.88 RG\n0.75 w\n`;
      stream += `${marginX} ${tableBottomY} ${usableWidth} ${tableTopY - tableBottomY} re S\n`;

      // Page Footer
      const footerY = marginBottom - 12;
      stream += 'BT\n';
      stream += `/F1 7 Tf\n`;
      stream += `0.45 0.50 0.56 rg\n`;
      stream += `${marginX} ${footerY} Td\n`;
      stream += `(CONFIDENTIAL  -  PARUL UNIVERSITY ATTENDANCE & SALARY AUDIT RECORD) Tj\n`;
      stream += 'ET\n';

      const pageStr = `Page ${pageData.pageIndex} of ${totalPages}`;
      stream += 'BT\n';
      stream += `/F1 7 Tf\n`;
      stream += `0.45 0.50 0.56 rg\n`;
      stream += `${this.pageWidth - marginX - 60} ${footerY} Td\n`;
      stream += `(${pageStr}) Tj\n`;
      stream += 'ET\n';

      stream += 'Q\n';

      // Create stream object
      const contentId = this.addObject(
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`
      );

      // We will create page objects with placeholder parent
      this.pageObjectIds.push(contentId);
    }

    // Now construct PDF hierarchy
    // Pages object placeholder
    const pagesObjIndex = this.objects.length + 1; // Anticipate next id

    const actualPageObjIds: number[] = [];
    for (const contentId of this.pageObjectIds) {
      const pageId = this.addObject(
        `<< /Type /Page /Parent ${pagesObjIndex + this.pageObjectIds.length} 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${this.fontRegularId} 0 R /F2 ${this.fontBoldId} 0 R >> >> >>`
      );
      actualPageObjIds.push(pageId);
    }

    const pagesKids = actualPageObjIds.map((id) => `${id} 0 R`).join(' ');
    const pagesObjId = this.addObject(
      `<< /Type /Pages /Kids [${pagesKids}] /Count ${actualPageObjIds.length} >>`
    );

    const catalogObjId = this.addObject(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

    // Build xref and trailer
    let body = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (let i = 0; i < this.objects.length; i++) {
      offsets.push(Buffer.byteLength(body));
      body += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(body);
    body += `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      body += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    body += `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogObjId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(body);
  }
}

