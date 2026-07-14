"""Strip AI co-author trailers from commit messages."""
import sys

BLOCKED_PREFIXES = (
    "Co-authored-by:",
    "Signed-off-by: Cursor",
)


def main() -> int:
    if len(sys.argv) < 2:
        return 0

    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    filtered = [
        line for line in lines
        if not any(line.lstrip().startswith(prefix) for prefix in BLOCKED_PREFIXES)
        and "cursoragent@cursor.com" not in line
    ]

    while filtered and filtered[-1].strip() == "":
        filtered.pop()

    if filtered and not filtered[-1].endswith("\n"):
        filtered[-1] += "\n"

    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.writelines(filtered)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
