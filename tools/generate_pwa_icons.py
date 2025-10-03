"""Generate Social Risk Audit PWA icons without external dependencies.

The module exposes helpers to produce deterministic PNG icon bytes as well as
Base64 data URIs. This makes it possible to ship the icon artwork in text-only
contexts (e.g. checked into a repository without binary blobs) while still
providing installable PWA icons by copying the generated data URIs into the
manifest.
"""
from __future__ import annotations

import argparse
import base64
import math
import struct
from pathlib import Path
import zlib

DARK = (11, 15, 20)
TEAL = (34, 173, 170)
MINT = (122, 233, 203)
AQUA = (80, 195, 252)


def _chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def _encode_png(pixels: bytearray, size: int) -> bytes:
    header = _chunk(
        b"IHDR",
        struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0),
    )
    data = _chunk(b"IDAT", zlib.compress(bytes(pixels), level=9))
    end = _chunk(b"IEND", b"")
    return b"\x89PNG\r\n\x1a\n" + header + data + end


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _mix(color_a, color_b, t):
    return tuple(int(round(_lerp(a, b, t))) for a, b in zip(color_a, color_b))


def _shield_mask(x: float, y: float) -> float:
    """Return normalized mask value for stylised shield (0..1)."""
    ny = y * 1.1
    if ny < -0.2:
        dist = math.sqrt(x * x + (ny + 0.2) ** 2)
        return 1.0 if dist <= 0.9 else 0.0
    limit = max(0.0, 1.1 - (ny + 0.2))
    return 1.0 if abs(x) <= limit else 0.0


def _keyhole_mask(x: float, y: float) -> float:
    if y < 0.15:
        return 1.0 if x * x + (y - 0.05) ** 2 <= 0.12 ** 2 else 0.0
    return 1.0 if abs(x) <= 0.08 and y <= 0.55 else 0.0


def _generate_pixels(size: int) -> bytearray:
    pixels = bytearray()
    centre = (size - 1) / 2.0
    radius = size * 0.48
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            nx = (x - centre) / radius
            ny = (y - centre) / radius
            distance = math.sqrt(nx * nx + ny * ny)
            glow = max(0.0, 1.0 - distance)
            bg_mix = _mix(DARK, (18, 32, 43), min(1.0, glow * 1.4))

            shield = _shield_mask(nx, ny)
            if shield:
                rim = max(0.0, 1.0 - abs(distance - 0.86) * 8)
                colour = _mix(TEAL, MINT, min(1.0, glow * 1.2))
                if rim > 0.6:
                    colour = _mix(colour, AQUA, rim - 0.6)
                alpha = 255
            else:
                colour = bg_mix
                alpha = 255

            keyhole = _keyhole_mask(nx * 1.05, ny * 1.1)
            if keyhole and shield:
                colour = (255, 255, 255)
                alpha = 255

            pixels.extend((*colour, alpha))
    return pixels


def _icon_bytes(size: int) -> bytes:
    pixels = _generate_pixels(size)
    return _encode_png(pixels, size)


def icon_data_uri(size: int) -> str:
    """Return a PNG data URI for the requested icon size."""
    png = _icon_bytes(size)
    encoded = base64.b64encode(png).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def generate_icons(sizes=(192, 512), output_dir=Path("icons-s")):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    for size in sizes:
        png = _icon_bytes(size)
        path = output_dir / f"icon-{size}.png"
        path.write_bytes(png)
        print(f"Wrote {path} ({size}x{size})")


def _main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sizes",
        nargs="*",
        type=int,
        default=(192, 512),
        help="Square icon dimensions to generate (default: 192 512)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Optional directory where PNG files will be written.",
    )
    parser.add_argument(
        "--print-data-uri",
        action="store_true",
        help="Emit Base64 data URIs for each requested size to stdout.",
    )
    args = parser.parse_args()

    if args.output_dir:
        generate_icons(sizes=args.sizes, output_dir=args.output_dir)

    if args.print_data_uri or not args.output_dir:
        for size in args.sizes:
            print(f"{size}: {icon_data_uri(size)}")


if __name__ == "__main__":
    _main()
