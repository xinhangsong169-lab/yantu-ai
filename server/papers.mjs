import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'skills/paper-summary/SKILL.md'), 'utf8');

export async function textFromPdf(base64) {
  const raw = Buffer.from(String(base64 || ''), 'base64');
  if (!raw.length) throw new Error('没有读到 PDF');
  if (raw.length > 8_000_000) throw new Error('PDF 请小于 8MB');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(raw), disableWorker: true, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages = [];
  const count = Math.min(doc.numPages, 12);
  for (let index = 1; index <= count; index += 1) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return pages.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function clip(value, max = 300) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function summarizePaper(env, cloud, { filename, text }) {
  const source = String(text || '').replace(/\u0000/g, '').trim();
  if (source.length < 40) throw new Error('这份资料没有抽出足够的文字。扫描版 PDF 需要先做成可选中文字的文件。');
  const excerpt = source.slice(0, 14000);
  const fallback = {
    title: filename?.replace(/\.(pdf|txt|md)$/i, '') || '未命名资料',
    authors: '',
    year: '',
    answers: '',
    method: '',
    gap: '还没有云端总结。',
    quote: excerpt.slice(0, 120),
    note: excerpt.slice(0, 800),
    sourceName: filename || '上传资料'
  };
  if (!env.DASHSCOPE_API_KEY) return fallback;
  const generated = await cloud(env, [
    { role: 'system', content: skill },
    { role: 'user', content: `文件名：${filename || '未命名'}\n\n原文：\n${excerpt}` }
  ], true);
  const quote = clip(generated.quote, 120);
  const trustedQuote = quote && excerpt.includes(quote) ? quote : excerpt.slice(0, 120);
  return {
    title: clip(generated.title, 200) || fallback.title,
    authors: clip(generated.authors, 120),
    year: /^\d{4}$/.test(String(generated.year || '')) ? String(generated.year) : '',
    answers: clip(generated.answers, 300),
    method: clip(generated.method, 300),
    gap: clip(generated.gap, 300),
    quote: trustedQuote,
    note: trustedQuote,
    sourceName: filename || '上传资料'
  };
}

export function libraryCard(papers) {
  if (!papers.length) {
    return { title: '还没有收入的文献', text: '文献要自己上传。可以在科研页交 PDF 或贴资料，总结只根据那份原文来写。', items: [] };
  }
  return {
    title: '已收入的文献',
    text: `这里有 ${papers.length} 份你上传或保存的资料。总结来自原文，不是联网检索。`,
    items: papers.slice(0, 6).map((paper) => ({
      title: paper.title,
      meta: [paper.authors, paper.year, paper.sourceName].filter(Boolean).join(' · '),
      note: paper.answers || paper.note || ''
    }))
  };
}
