from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
SCREENSHOTS = PUBLIC / "screenshots"

BG0 = "#0a1224"
BG1 = "#102445"
CYAN = "#43e0ff"
LIME = "#8eff64"
PINK = "#ff5f8f"
TEXT = "#d8f7ff"


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def vertical_gradient(size: int, top: str, bottom: str) -> Image.Image:
    top_rgb = hex_rgb(top)
    bottom_rgb = hex_rgb(bottom)
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
      t = y / max(size - 1, 1)
      color = tuple(
          round(top_rgb[i] * (1 - t) + bottom_rgb[i] * t) for i in range(3)
      ) + (255,)
      for x in range(size):
          px[x, y] = color
    return img


def draw_bug(
    draw: ImageDraw.ImageDraw, size: int, *, scale: float = 1.0, offset_y: float = 0
) -> None:
    cx = size / 2
    s = size / 64 * scale
    shell = [
        (24 * s + cx - 32 * s, 18 * s + offset_y),
        (40 * s + cx - 32 * s, 18 * s + offset_y),
        (50 * s + cx - 32 * s, 29 * s + offset_y),
        (45 * s + cx - 32 * s, 46 * s + offset_y),
        (19 * s + cx - 32 * s, 46 * s + offset_y),
        (14 * s + cx - 32 * s, 29 * s + offset_y),
    ]
    draw.line(shell + [shell[0]], fill=CYAN, width=max(2, round(4 * s)), joint="curve")

    leg_w = max(2, round(4 * s))

    def line(points: list[tuple[float, float]], fill: str = CYAN, width: int = leg_w) -> None:
        draw.line(points, fill=fill, width=width)

    line([(26 * s + cx - 32 * s, 18 * s + offset_y), (22 * s + cx - 32 * s, 11 * s + offset_y)])
    line(
        [(38 * s + cx - 32 * s, 18 * s + offset_y), (42 * s + cx - 32 * s, 11 * s + offset_y)],
        fill=LIME,
    )
    line([(18 * s + cx - 32 * s, 29 * s + offset_y), (8 * s + cx - 32 * s, 29 * s + offset_y)])
    line(
        [(56 * s + cx - 32 * s, 29 * s + offset_y), (46 * s + cx - 32 * s, 29 * s + offset_y)],
        fill=LIME,
    )
    line([(22 * s + cx - 32 * s, 46 * s + offset_y), (18 * s + cx - 32 * s, 54 * s + offset_y)])
    line(
        [(42 * s + cx - 32 * s, 46 * s + offset_y), (46 * s + cx - 32 * s, 54 * s + offset_y)],
        fill=LIME,
    )

    eye_r = max(2, round(3 * s))
    for ex in (26, 38):
        x = ex * s + cx - 32 * s
        y = 29 * s + offset_y
        draw.ellipse((x - eye_r, y - eye_r, x + eye_r, y + eye_r), fill=PINK)

    smile_w = max(2, round(3 * s))
    draw.arc(
        (
            24 * s + cx - 32 * s,
            34 * s + offset_y,
            40 * s + cx - 32 * s,
            46 * s + offset_y,
        ),
        start=20,
        end=160,
        fill=TEXT,
        width=smile_w,
    )


def save_any_icon(size: int, path: Path) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    card = vertical_gradient(size, BG1, BG0)
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = round(size * 0.22)
    inset = round(size * 0.06)
    mdraw.rounded_rectangle(
        (inset, inset, size - inset, size - inset), radius=radius, fill=255
    )
    img.alpha_composite(card)
    img.putalpha(mask)
    draw = ImageDraw.Draw(img)
    draw_bug(draw, size, scale=0.9, offset_y=size * 0.03)
    img.save(path)


def save_maskable_icon(size: int, path: Path) -> None:
    img = vertical_gradient(size, BG1, BG0)
    draw = ImageDraw.Draw(img)
    draw_bug(draw, size, scale=0.78, offset_y=size * 0.055)
    img.save(path)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)

    save_any_icon(192, ICONS / "icon-192.png")
    save_any_icon(512, ICONS / "icon-512.png")
    save_maskable_icon(192, ICONS / "maskable-192.png")
    save_maskable_icon(512, ICONS / "maskable-512.png")

    Image.open(ICONS / "icon-192.png").save(PUBLIC / "apple-touch-icon.png")
    Image.open(ICONS / "icon-192.png").save(
        PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )

    src = Image.open(ROOT / "screenshot.png").convert("RGB")
    src.save(SCREENSHOTS / "wide.png")
    width, height = src.size
    crop_w = min(width, round(height * 0.62))
    left = (width - crop_w) // 2
    mobile = src.crop((left, 0, left + crop_w, height))
    mobile.save(SCREENSHOTS / "mobile.png")


if __name__ == "__main__":
    main()
