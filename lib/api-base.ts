// client-side fetch 用的 API 前缀
// 本地开发：空字符串（basePath 未启用）
// 生产 /a100 部署：NEXT_PUBLIC_BASE_PATH=/a100
export const API_BASE =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    : "";
