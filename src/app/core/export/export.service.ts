/**
 * ExportService — utilitários para exportar cards/dashboards em diferentes formatos.
 *
 *  - CSV: nativo (Blob + ObjectURL). Sem dependência.
 *  - PNG: html2canvas (lazy-loaded). Captura DOM como imagem.
 *  - PDF: jsPDF + html2canvas (lazy-loaded). Múltiplas páginas A4 se necessário.
 *
 * Implementado com import dinâmico pra que html2canvas/jspdf NÃO entrem
 * no bundle inicial — só são baixados quando o user clica "exportar".
 */
import { Injectable } from '@angular/core';
import type { CardResult } from '../../metabase.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /**
   * Exporta os dados de um card como CSV (compatível com Excel).
   * Usa UTF-8 BOM pra Excel detectar charset corretamente.
   */
  downloadCsv(filename: string, result: CardResult): void {
    const { cols, rows } = result;
    const header = cols.map((c) => csvCell(c.display_name || c.name)).join(',');
    const lines = rows.map((row) =>
      cols.map((c) => csvCell(row[c.name])).join(','),
    );
    const csv = '﻿' + header + '\n' + lines.join('\n');
    this.downloadBlob(`${sanitize(filename)}.csv`, csv, 'text/csv;charset=utf-8');
  }

  /**
   * Captura um elemento DOM como PNG e baixa.
   * Lazy-loads html2canvas (não pesa no bundle até o user clicar).
   */
  async downloadPng(filename: string, element: HTMLElement): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#FFFFFF',
      scale: 2,                       // dobra resolução = nítido em retina
      logging: false,
      useCORS: true,
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      this.downloadBlob(`${sanitize(filename)}.png`, blob, 'image/png');
    });
  }

  /**
   * Captura um elemento DOM e baixa como PDF.
   * Tamanho A4 paisagem. Quebra em múltiplas páginas se altura > limite.
   */
  async downloadPdf(filename: string, element: HTMLElement): Promise<void> {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(element, {
      backgroundColor: '#FAFBFB',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${sanitize(filename)}.pdf`);
  }

  private downloadBlob(filename: string, content: BlobPart, type: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// ── helpers ────────────────────────────────────────────────────────

function csvCell(v: any): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  // Escapa aspas duplicando-as e envolve em aspas se contém vírgula/aspas/quebra
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sanitize(filename: string): string {
  return (filename || 'export')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}
