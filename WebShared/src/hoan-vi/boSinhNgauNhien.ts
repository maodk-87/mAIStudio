/**
 * Bộ sinh ngẫu nhiên XÁC ĐỊNH (SplitMix64, hạt giống FNV-1a 64 bit từ chuỗi UTF-8) — cùng thuật toán với
 * `KTDG.CauHoi.BoSinhNgauNhien`: cùng hạt giống cho cùng dãy số ở FE và BE.
 */
const MAT_NA_64 = (1n << 64n) - 1n;

export class BoSinhNgauNhien {
  private trangThai: bigint;

  constructor(hatGiong: string) {
    let h = 14695981039346656037n;
    for (const b of new TextEncoder().encode(hatGiong)) {
      h ^= BigInt(b);
      h = (h * 1099511628211n) & MAT_NA_64;
    }
    this.trangThai = h;
  }

  tiepUlong(): bigint {
    this.trangThai = (this.trangThai + 0x9e3779b97f4a7c15n) & MAT_NA_64;
    let z = this.trangThai;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MAT_NA_64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MAT_NA_64;
    return z ^ (z >> 31n);
  }

  /** Số nguyên trong [0, gioiHan) */
  tiep(gioiHan: number): number {
    return gioiHan <= 1 ? 0 : Number(this.tiepUlong() % BigInt(gioiHan));
  }
}

/** Fisher–Yates chỉ trên các vị trí không cố định; phần tử cố định giữ nguyên chỉ số */
export function daoGiuCoDinh<T>(ds: readonly T[], coDinh: (x: T) => boolean, rng: BoSinhNgauNhien): T[] {
  const kq = ds.slice();
  const viTriTuDo = kq.map((_, i) => i).filter((i) => !coDinh(kq[i]));
  const giaTri = viTriTuDo.map((i) => kq[i]);
  for (let i = giaTri.length - 1; i > 0; i--) {
    const j = rng.tiep(i + 1);
    [giaTri[i], giaTri[j]] = [giaTri[j], giaTri[i]];
  }
  viTriTuDo.forEach((viTri, k) => {
    kq[viTri] = giaTri[k];
  });
  return kq;
}
