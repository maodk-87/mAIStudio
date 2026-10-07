/**
 * CSV mở được bằng Excel: UTF-8 có BOM để Excel nhận đúng tiếng Việt, dòng CRLF (RFC 4180).
 * Đọc CSV (phân tách phẩy/chấm phẩy/tab tự nhận) phục vụ nhập liệu.
 */
import { taiTep, tenTepXuat } from './taiTep';

export type OCsv = string | number | boolean | null | undefined;

const BOM = String.fromCharCode(0xfeff);

function escapeO(v: OCsv): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function taoNoiDungCsv(tieuDe: OCsv[], dong: OCsv[][]): string {
  return [tieuDe, ...dong].map((d) => d.map(escapeO).join(',')).join('\r\n');
}

export function xuatCsv(tenTep: string, tieuDe: OCsv[], dong: OCsv[][]): void {
  taiTep(new Blob([`${BOM}${taoNoiDungCsv(tieuDe, dong)}`], { type: 'text/csv;charset=utf-8' }), tenTepXuat(tenTep, 'csv'));
}

/** Tách CSV thành mảng dòng × ô (hỗ trợ ô trong ngoặc kép, xuống dòng trong ô) */
export function docCsv(noiDung: string): string[][] {
  const vb = noiDung.replace(/^﻿/, '');
  const dongDau = vb.split(/\r?\n/, 1)[0] ?? '';
  const dem = (k: string) => dongDau.split(k).length;
  const phanCach = dem(';') > dem(',') && dem(';') >= dem('\t') ? ';' : dem('\t') > dem(',') ? '\t' : ',';
  const kq: string[][] = [];
  let dong: string[] = [];
  let o = '';
  let trongNgoac = false;
  for (let i = 0; i < vb.length; i++) {
    const c = vb[i];
    if (trongNgoac) {
      if (c === '"') {
        if (vb[i + 1] === '"') {
          o += '"';
          i++;
        } else trongNgoac = false;
      } else o += c;
    } else if (c === '"') trongNgoac = true;
    else if (c === phanCach) {
      dong.push(o);
      o = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && vb[i + 1] === '\n') i++;
      dong.push(o);
      kq.push(dong);
      dong = [];
      o = '';
    } else o += c;
  }
  if (o || dong.length) {
    dong.push(o);
    kq.push(dong);
  }
  return kq.filter((d) => d.some((x) => x.trim() !== ''));
}
