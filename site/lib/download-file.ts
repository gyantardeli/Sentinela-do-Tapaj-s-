/** Exportação sob demanda; não faz cache offline. */
export function downloadFile(content: BlobPart, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], {type: mime}));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
