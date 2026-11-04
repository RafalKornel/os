#!/usr/bin/env python3
"""Recursively rename `omarchy` -> `archy` in file/directory names and in the
contents of text files, preserving the casing of each occurrence.

Examples:
    omarchy     -> archy
    Omrchy     -> Archy
    OMARCHY_ENV -> ARCHY_ENV

Paths embedded in file contents (e.g. /etc/omarchy -> /etc/archy) are handled
automatically because they are just text occurrences.
"""

from __future__ import annotations

import argparse
import os
import re
import sys

NAME_PATTERN = re.compile(rb"omarchy", re.IGNORECASE)

TEXT_EXTENSIONS = {
    ".md",
    ".markdown",
    ".txt",
    ".text",
    ".rst",
    ".conf",
    ".cfg",
    ".ini",
    ".json",
    ".jsonc",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".py",
    ".pyi",
    ".rb",
    ".php",
    ".pl",
    ".pm",
    ".lua",
    ".go",
    ".rs",
    ".c",
    ".h",
    ".cc",
    ".cpp",
    ".cxx",
    ".hpp",
    ".hh",
    ".java",
    ".kt",
    ".kts",
    ".scala",
    ".swift",
    ".cs",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    ".awk",
    ".sed",
    ".sql",
    ".csv",
    ".tsv",
    ".log",
    ".env",
    ".desktop",
    ".service",
    ".socket",
    ".target",
    ".timer",
    ".rules",
    ".vim",
    ".el",
    ".scm",
    ".tex",
    ".bib",
    ".gradle",
    ".properties",
    ".editorconfig",
    ".gitignore",
    ".gitattributes",
    ".dockerignore",
    ".htaccess",
    ".npmrc",
    ".yarnrc",
}

TEXT_FILENAMES = {
    "Makefile",
    "Dockerfile",
    "Containerfile",
    "Procfile",
    "Gemfile",
    "Rakefile",
    "Vagrantfile",
    "Jenkinsfile",
    "LICENSE",
    "COPYING",
    "README",
    "CHANGELOG",
    "AUTHORS",
    "NOTICE",
}


def replace_case(match: re.Match) -> bytes:
    word = match.group(0)
    if word.isupper():
        return b"ARCHY"
    if word.istitle():
        return b"Archy"
    return b"archy"


def new_name(name: str) -> str:
    return NAME_PATTERN.sub(replace_case, name.encode()).decode()


def looks_like_text(path: str) -> bool:
    base = os.path.basename(path)
    ext = os.path.splitext(base)[1].lower()
    if ext in TEXT_EXTENSIONS:
        return True
    if base in TEXT_FILENAMES:
        return True
    if ext:
        return False
    try:
        with open(path, "rb") as handle:
            chunk = handle.read(8192)
    except OSError:
        return False
    if b"\x00" in chunk:
        return False
    try:
        chunk.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def rewrite_contents(path: str, dry_run: bool) -> bool:
    try:
        with open(path, "rb") as handle:
            data = handle.read()
    except OSError as exc:
        print(f"  ! cannot read {path}: {exc}", file=sys.stderr)
        return False

    new_data, count = NAME_PATTERN.subn(replace_case, data)
    if count == 0:
        return False

    if dry_run:
        print(f"  would edit {path} ({count} replacement(s))")
        return True

    try:
        with open(path, "wb") as handle:
            handle.write(new_data)
    except OSError as exc:
        print(f"  ! cannot write {path}: {exc}", file=sys.stderr)
        return False

    print(f"  edited {path} ({count} replacement(s))")
    return True


def rename(old: str, new: str, dry_run: bool) -> str:
    if old == new or not os.path.lexists(old):
        return old
    if os.path.lexists(new):
        print(f"  ! target already exists, skipping {old} -> {new}", file=sys.stderr)
        return old
    if dry_run:
        print(f"  would rename {old} -> {new}")
        return old
    os.rename(old, new)
    print(f"  renamed {old} -> {new}")
    return new


def process(base: str, dry_run: bool) -> None:
    base = os.path.abspath(base)
    if not os.path.isdir(base):
        print(f"error: not a directory: {base}", file=sys.stderr)
        raise SystemExit(2)

    for root, dirs, files in os.walk(base, topdown=False, followlinks=False):
        for fname in files:
            old = os.path.join(root, fname)
            target = os.path.join(root, new_name(fname))
            current = rename(old, target, dry_run)
            if looks_like_text(current):
                rewrite_contents(current, dry_run)

        for dname in dirs:
            old = os.path.join(root, dname)
            target = os.path.join(root, new_name(dname))
            rename(old, target, dry_run)

    parent, name = os.path.split(base)
    renamed_base = new_name(name)
    if renamed_base != name:
        rename(base, os.path.join(parent, renamed_base), dry_run)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recursively replace 'archy' with 'archy' in names and text contents."
    )
    parser.add_argument("directory", help="directory to process recursively")
    parser.add_argument(
        "-n",
        "--dry-run",
        action="store_true",
        help="show what would change without touching anything",
    )
    args = parser.parse_args()
    process(args.directory, args.dry_run)


if __name__ == "__main__":
    main()
