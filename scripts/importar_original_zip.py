#!/usr/bin/env python3
"""Importa o snapshot original do Sentinela em apps/site-original sem sobrescrever V2.2.

Uso: python scripts/importar_original_zip.py /caminho/pacote.zip
     python scripts/importar_original_zip.py /caminho/pacote.zip --verify-only

Não migra banco, credenciais, rotinas agendadas ou a publicação ChatGPT Sites.
"""
import argparse
import hashlib
import json
import pathlib
import stat
import sys
import zipfile

EXPECTED_SHA256 = "2a1c0144f9068cde3485f4cfd96eaab46e4eb2dcdf8833b79af076ce8fb2df5b"
EXPECTED_ROOTS = {"apps", "CONSOLIDACAO_GITHUB.md", "MANIFESTO_SHA256.json"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_path(filename):
    rel = pathlib.PurePosixPath(filename)
    if not filename or filename.startswith("/") or "\\" in filename or ".." in rel.parts:
        raise ValueError("Caminho de ZIP inseguro: " + filename)
    if rel.parts[0] not in EXPECTED_ROOTS:
        raise ValueError("Arquivo fora do pacote aprovado: " + filename)
    if rel.parts[0] == "apps" and rel.parts[:2] != ("apps", "site-original"):
        raise ValueError("Destino inesperado: " + filename)
    return pathlib.Path(*rel.parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arquivo", type=pathlib.Path)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1]
    bundle = args.arquivo.read_bytes()

    if digest(bundle) != EXPECTED_SHA256:
        raise SystemExit("SHA-256 do arquivo não coincide com o snapshot aprovado.")

    with zipfile.ZipFile(args.arquivo) as z:
        if z.testzip() is not None:
            raise SystemExit("ZIP com erro de integridade.")
        manifest = json.loads(z.read("MANIFESTO_SHA256.json"))
        entries = {item["path"]: item for item in manifest["files"]}
        if len(entries) != 244 or len(entries) != len(manifest["files"]):
            raise SystemExit("Manifesto com quantidade ou caminhos inesperados.")

        checked = []
        for item in z.infolist():
            if item.is_dir():
                continue
            rel = validate_path(item.filename)
            if stat.S_IFMT(item.external_attr >> 16) == stat.S_IFLNK:
                raise SystemExit("Links simbólicos não são aceitos: " + item.filename)
            body = z.read(item)
            if item.filename in entries and digest(body) != entries[item.filename]["sha256"]:
                raise SystemExit("SHA-256 inválido para " + item.filename)
            checked.append((rel, body))

        if len(entries.keys() & set(str(rel).replace("\\", "/") for rel, _ in checked)) != 244:
            raise SystemExit("Arquivos-fonte incompletos.")

        conflicts = []
        for rel, body in checked:
            out = root / rel
            if out.exists() and (not out.is_file() or out.read_bytes() != body):
                conflicts.append(str(rel))
        if conflicts:
            raise SystemExit("Não sobrescrevi arquivos existentes divergentes:\n" + "\n".join(conflicts[:25]))
        if not args.verify_only:
            for rel, body in checked:
                out = root / rel
                if not out.exists():
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(body)
        print(f"{len(entries)} arquivos-fonte conferidos; " +
              ("verificação apenas" if args.verify_only else "importação concluída") +
              ". Revise git status antes de commitar. Nenhum deploy executado.")


if __name__ == "__main__":
    main()
