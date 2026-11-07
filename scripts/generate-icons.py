import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_messmate_logo(size=512, maskable=False):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.05 if not maskable else size * 0.02
    corner_r = size * 0.22 if not maskable else 0

    # Draw gradient background squircle
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)

    # Vertical gradient from emerald-600 to teal-700
    c_top = (5, 150, 105)       # Emerald #059669
    c_bot = (15, 118, 110)      # Teal #0f766e

    # Create gradient
    for y in range(size):
        ratio = y / size
        r = int(c_top[0] * (1 - ratio) + c_bot[0] * ratio)
        g = int(c_top[1] * (1 - ratio) + c_bot[1] * ratio)
        b = int(c_top[2] * (1 - ratio) + c_bot[2] * ratio)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask with rounded rect
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    if maskable:
        mask_draw.rectangle([0, 0, size, size], fill=255)
    else:
        mask_draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=corner_r, fill=255)

    img.paste(bg, (0, 0), mask)

    # Re-obtain draw handle
    draw = ImageDraw.Draw(img)

    # Draw subtle inner border ring
    if not maskable:
        draw.rounded_rectangle(
            [pad + 2, pad + 2, size - pad - 2, size - pad - 2],
            radius=corner_r,
            outline=(52, 211, 153, 90),
            width=int(size * 0.015)
        )

    # Center coordinates
    cx = size / 2
    cy = size * 0.44

    scale = size / 512.0

    # Draw Golden Glow behind the cloche/plate
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_r = int(120 * scale)
    glow_draw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=(245, 158, 11, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=25 * scale))
    img.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(img)

    # 1. Base Dining Plate (Silver / Crisp White)
    plate_w = 260 * scale
    plate_h = 32 * scale
    plate_top = cy + 50 * scale
    draw.ellipse(
        [cx - plate_w / 2, plate_top, cx + plate_w / 2, plate_top + plate_h],
        fill=(255, 255, 255, 240),
        outline=(251, 191, 36, 255),  # Gold rim
        width=int(5 * scale)
    )

    # Plate inner bevel
    draw.ellipse(
        [cx - plate_w * 0.38, plate_top + 6 * scale, cx + plate_w * 0.38, plate_top + plate_h - 6 * scale],
        fill=(241, 245, 249, 255)
    )

    # 2. Cloche Dome (Food Serving Cover)
    dome_w = 210 * scale
    dome_h = 130 * scale
    dome_top = cy + 50 * scale - dome_h

    # Cloche arc (upper half ellipse)
    draw.chord(
        [cx - dome_w / 2, dome_top, cx + dome_w / 2, dome_top + dome_h * 2],
        start=180, end=0,
        fill=(255, 255, 255, 255),
        outline=(251, 191, 36, 255),
        width=int(6 * scale)
    )

    # Cloche Handle (Gold ball on top)
    handle_r = 16 * scale
    handle_y = dome_top - handle_r * 0.8
    draw.ellipse(
        [cx - handle_r, handle_y - handle_r, cx + handle_r, handle_y + handle_r],
        fill=(251, 191, 36, 255),
        outline=(245, 158, 11, 255),
        width=int(3 * scale)
    )

    # Handle neck
    draw.rectangle(
        [cx - 5 * scale, handle_y, cx + 5 * scale, dome_top + 4 * scale],
        fill=(251, 191, 36, 255)
    )

    # Cloche shine / reflection arc
    draw.arc(
        [cx - dome_w * 0.42, dome_top + 18 * scale, cx - dome_w * 0.15, dome_top + dome_h * 1.5],
        start=200, end=270,
        fill=(209, 250, 229, 220),
        width=int(7 * scale)
    )

    # 3. Steam swirls rising above cloche
    steam_y = handle_y - 30 * scale
    for sx, offset in [(cx - 45 * scale, -10), (cx + 45 * scale, 10)]:
        draw.arc(
            [sx - 15 * scale, steam_y + offset * scale, sx + 15 * scale, steam_y + 35 * scale + offset * scale],
            start=240, end=60,
            fill=(251, 191, 36, 200),
            width=int(4 * scale)
        )

    # 4. Crossed Fork & Spoon behind or below plate in radiant amber
    fork_color = (255, 255, 255, 230)
    accent_gold = (251, 191, 36, 255)

    # 5. Bold "MessMate" or "M" monogram at bottom of badge
    # Draw an elegant banner ribbon or badge pill
    pill_w = 260 * scale
    pill_h = 56 * scale
    pill_y = size * 0.74
    draw.rounded_rectangle(
        [cx - pill_w / 2, pill_y, cx + pill_w / 2, pill_y + pill_h],
        radius=int(16 * scale),
        fill=(15, 23, 42, 220),     # Dark Slate Navy
        outline=(52, 211, 153, 200),
        width=int(3 * scale)
    )

    # Text: MESSMATE
    try:
        font = ImageFont.truetype("arialbd.ttf", int(30 * scale))
    except Exception:
        font = ImageFont.load_default()

    text = "MessMate"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, pill_y + (pill_h - th) / 2 - 2 * scale), text, fill=(255, 255, 255, 255), font=font)

    return img

def main():
    os.makedirs('public/icons', exist_ok=True)
    os.makedirs('src/app', exist_ok=True)

    # Generate 512x512 standard
    img_512 = create_messmate_logo(512, maskable=False)
    img_512.save('public/icons/icon-512.png', 'PNG')
    img_512.save('public/logo.png', 'PNG')
    img_512.save('src/app/icon.png', 'PNG')
    print("Saved public/icons/icon-512.png & src/app/icon.png")

    # Generate 512x512 maskable (full bleed for Android adaptive icons)
    img_maskable = create_messmate_logo(512, maskable=True)
    img_maskable.save('public/icons/icon-maskable.png', 'PNG')
    print("Saved public/icons/icon-maskable.png")

    # Generate 192x192
    img_192 = img_512.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save('public/icons/icon-192.png', 'PNG')
    print("Saved public/icons/icon-192.png")

    # Generate 180x180 for iOS Apple Touch Icon
    img_180 = img_512.resize((180, 180), Image.Resampling.LANCZOS)
    img_180.save('public/apple-touch-icon.png', 'PNG')
    img_180.save('src/app/apple-icon.png', 'PNG')
    print("Saved public/apple-touch-icon.png & src/app/apple-icon.png")

    # Generate multi-size favicon.ico (16, 32, 48, 64)
    img_512.save(
        'public/favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    img_512.save(
        'src/app/favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("Saved public/favicon.ico & src/app/favicon.ico")

if __name__ == '__main__':
    main()
