// src/core/source-map.ts
// Source Map V3 with VLQ encode/decode

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeVLQ(value: number): string {
  const sign = value < 0 ? 1 : 0;
  let vlq = (Math.abs(value) << 1) | sign;
  let encoded = '';
  do {
    let digit = vlq & 0x1f;
    vlq >>= 5;
    if (vlq > 0) digit |= 0x20;
    encoded += BASE64_CHARS[digit];
  } while (vlq > 0);
  return encoded;
}

export function decodeVLQ(encoded: string): number[] {
  const values: number[] = [];
  let current = 0;
  let shift = 0;
  for (const char of encoded) {
    const digit = BASE64_CHARS.indexOf(char);
    if (digit === -1) continue;
    current |= (digit & 0x1f) << shift;
    if ((digit & 0x20) === 0) {
      const sign = (current & 1) ? -1 : 1;
      values.push(sign * (current >> 1));
      current = 0;
      shift = 0;
    } else {
      shift += 5;
    }
  }
  return values;
}

export interface Mapping {
  generatedLine: number;
  generatedColumn: number;
  originalLine: number;
  originalColumn: number;
  source: string;
  name?: string;
}

export interface SourceMapOptions {
  file: string;
  sourceRoot?: string;
}

export class SourceMapBuilder {
  private mappings: Mapping[] = [];
  private sources: string[] = [];
  private sourcesContent: (string | null)[] = [];
  private names: string[] = [];
  private options: SourceMapOptions;

  constructor(options: SourceMapOptions) {
    this.options = options;
  }

  addSource(sourcePath: string, content?: string) {
    const idx = this.sources.indexOf(sourcePath);
    if (idx === -1) {
      this.sources.push(sourcePath);
      this.sourcesContent.push(content || null);
    } else if (content) {
      this.sourcesContent[idx] = content;
    }
  }

  addMapping(mapping: Mapping) {
    this.mappings.push(mapping);
    if (!this.sources.includes(mapping.source)) {
      this.addSource(mapping.source);
    }
    if (mapping.name && !this.names.includes(mapping.name)) {
      this.names.push(mapping.name);
    }
  }

  toJSON(): any {
    return {
      version: 3,
      file: this.options.file,
      sourceRoot: this.options.sourceRoot || '',
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: this.names,
      mappings: this.encodeMappings(),
    };
  }

  toBase64(): string {
    const json = JSON.stringify(this.toJSON());
    const base64 = typeof Buffer !== 'undefined'
      ? Buffer.from(json).toString('base64')
      : btoa(json);
    return `data:application/json;charset=utf-8;base64,${base64}`;
  }

  private encodeMappings(): string {
    // Simplified: group by generatedLine
    const lines: Mapping[][] = [];
    for (const m of this.mappings) {
      const lineIdx = m.generatedLine - 1;
      if (!lines[lineIdx]) lines[lineIdx] = [];
      lines[lineIdx].push(m);
    }

    const lineStrings: string[] = [];
    let prevGenCol = 0;
    let prevSource = 0;
    let prevOrigLine = 0;
    let prevOrigCol = 0;
    let prevName = 0;

    for (const lineMappings of lines) {
      if (!lineMappings || lineMappings.length === 0) {
        lineStrings.push('');
        continue;
      }

      const segments: string[] = [];
      for (const m of lineMappings.sort((a, b) => a.generatedColumn - b.generatedColumn)) {
        const sourceIdx = this.sources.indexOf(m.source);
        const nameIdx = m.name ? this.names.indexOf(m.name) : -1;

        const genColDelta = m.generatedColumn - prevGenCol;
        const sourceDelta = sourceIdx - prevSource;
        const origLineDelta = m.originalLine - prevOrigLine;
        const origColDelta = m.originalColumn - prevOrigCol;
        const nameDelta = nameIdx >= 0 ? nameIdx - prevName : undefined;

        let segment = encodeVLQ(genColDelta);
        segment += encodeVLQ(sourceDelta);
        segment += encodeVLQ(origLineDelta);
        segment += encodeVLQ(origColDelta);
        if (nameDelta !== undefined) {
          segment += encodeVLQ(nameDelta);
        }

        segments.push(segment);
        prevGenCol = m.generatedColumn;
        prevSource = sourceIdx;
        prevOrigLine = m.originalLine;
        prevOrigCol = m.originalColumn;
        if (nameIdx >= 0) prevName = nameIdx;
      }

      lineStrings.push(segments.join(','));
    }

    return lineStrings.join(';');
  }
}

export function decodeMappings(mappings: string): number[][][] {
  const lines = mappings.split(';');
  return lines.map(line => {
    if (!line) return [];
    const segments = line.split(',');
    return segments.map(seg => decodeVLQ(seg));
  });
}
