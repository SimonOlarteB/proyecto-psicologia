export function obtenerAppUrl(): string {
  const url = process.env.APP_URL?.replace(/\/+$/, "");

  if (url) {
    return url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL no está configurada.");
  }

  return "http://localhost:3000";
}
