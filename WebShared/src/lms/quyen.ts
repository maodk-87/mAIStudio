/**
 * Kiểm tra permission 3 cấp `[module].[doiTuong].[action]` — bắt buộc check wildcard
 * (docs/10-quy-tac-lap-trinh.md mục 7.2). `*` = toàn quyền.
 */
export function coQuyen(
  quyenCuaUser: readonly string[] | Set<string> | undefined,
  quyenYeuCau?: string,
): boolean {
  if (!quyenYeuCau) return true;
  if (!quyenCuaUser) return false;
  const tap =
    quyenCuaUser instanceof Set ? quyenCuaUser : new Set(quyenCuaUser);
  if (tap.has('*')) return true;
  if (tap.has(quyenYeuCau)) return true;
  const cacPhan = quyenYeuCau.split('.');
  if (cacPhan.length >= 2 && tap.has(`${cacPhan[0]}.${cacPhan[1]}.*`)) {
    return true;
  }
  if (tap.has(`${cacPhan[0]}.*`)) return true;
  return false;
}
