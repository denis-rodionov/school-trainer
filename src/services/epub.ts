/**
 * Epub Parsing Service
 *
 * Fetches an epub via Firebase Storage SDK bytes, unzips it in the browser
 * with JSZip, follows the OPF spine, and extracts an ordered, flat array of paragraphs.
 *
 * Pure of any UI concern; only depends on fetch + JSZip + native DOMParser.
 */

import JSZip from 'jszip';

// In-memory cache keyed by book id so the same book isn't re-parsed within a session.
const paragraphCache = new Map<string, string[]>();

const resolvePath = (base: string, relative: string): string => {
  // Resolve an OPF-relative href against the directory of the OPF file.
  const baseDir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const combined = `${baseDir}${relative}`;
  const segments: string[] = [];
  for (const part of combined.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      segments.pop();
    } else {
      segments.push(part);
    }
  }
  return segments.join('/');
};

const parseXml = (content: string, mimeType: DOMParserSupportedType): Document => {
  const doc = new DOMParser().parseFromString(content, mimeType);
  return doc;
};

const extractParagraphsFromDoc = (doc: Document): string[] => {
  const paragraphs: string[] = [];
  const nodes = doc.querySelectorAll('p');
  nodes.forEach((node) => {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) {
      paragraphs.push(text);
    }
  });
  return paragraphs;
};

/**
 * Load and flatten a book into an ordered array of non-empty paragraphs.
 *
 * @param url - Download URL for the epub file
 * @returns Ordered array of paragraph strings across the whole book (spine order)
 */
/**
 * Parse epub bytes into an ordered array of non-empty paragraphs.
 */
export const parseEpubBytes = async (buffer: ArrayBuffer): Promise<string[]> => {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Find the OPF path from META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid epub: missing META-INF/container.xml');
  }
  const containerXml = await containerFile.async('text');
  const containerDoc = parseXml(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path');
  if (!opfPath) {
    throw new Error('Invalid epub: no rootfile in container.xml');
  }

  // 2. Parse the OPF: build manifest (id -> href) and read the spine order
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid epub: OPF not found at ${opfPath}`);
  }
  const opfXml = await opfFile.async('text');
  const opfDoc = parseXml(opfXml, 'application/xml');

  const manifest = new Map<string, string>();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifest.set(id, href);
    }
  });

  const spineRefs: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref) {
      spineRefs.push(idref);
    }
  });

  // 3. Read each spine document in order and extract paragraphs
  const paragraphs: string[] = [];
  for (const idref of spineRefs) {
    const href = manifest.get(idref);
    if (!href) continue;
    const docPath = resolvePath(opfPath, href);
    const docFile = zip.file(docPath);
    if (!docFile) continue;
    const html = await docFile.async('text');
    const doc = parseXml(html, 'application/xhtml+xml');
    // Fall back to HTML parsing if XHTML parsing produced a parser error
    const usableDoc = doc.querySelector('parsererror') ? parseXml(html, 'text/html') : doc;
    paragraphs.push(...extractParagraphsFromDoc(usableDoc));
  }

  if (paragraphs.length === 0) {
    throw new Error('No readable paragraphs found in book');
  }

  return paragraphs;
};

/**
 * Load and flatten a book by id, downloading via Firebase Storage SDK then parsing.
 */
export const loadBookParagraphs = async (
  bookId: string,
  buffer: ArrayBuffer
): Promise<string[]> => {
  const cached = paragraphCache.get(bookId);
  if (cached) {
    return cached;
  }

  const paragraphs = await parseEpubBytes(buffer);
  paragraphCache.set(bookId, paragraphs);
  return paragraphs;
};
