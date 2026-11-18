"""Prepare the user-approved deck images for the website. Requires Pillow only.

Keep private sources in references/. Run from any directory after extracting the
deck and placing supplied high-resolution originals in replacements/ and additions/.
"""
from pathlib import Path
from PIL import Image, ImageOps
from base64 import b64encode
from io import BytesIO
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'references/interview-deck-images-2026-11-18'
OUTPUT = ROOT / 'public/images/portfolio'
NAMES = [
    'portrait', 'nycu-mark', 'ntus-mark', 'openhci-workshop', 'auo-internship',
    'auo-hud-illustration', 'foxrag-interface', 'foxrag-frontend', 'foxrag-retrieval',
    'foxrag-backend', 'little-spirit-input', 'little-spirit-result', 'little-spirit-llm',
    'little-spirit-server', 'little-spirit-config', 'racing-team', 'racing-track',
    'racing-cars', 'racing-filming-hq', 'baseball-interface', 'gym-poster',
    'counseling-paper-email-redacted', 'ar-map-award', 'inner-voice-poster', 'motion-capture',
    'vr-attention-paper', 'ar-map-poster', 'feather-title', 'soil-scene',
    'inside-apart-title', 'museum-paper', 'nycu-1001-poster', 'chictrip-affinity',
    'broadcast-control', 'campus-tour-interface', 'racing-communication', 'racing-international-exchange',
]
DOCUMENTS = {21, 22, 23, 24, 26, 27, 31, 32, 33}
CODE_SCREENSHOTS = {8, 9, 10, 13, 14, 15}
COMBINED_SCREENS = {11, 12}
SUPPLIED = {
    19: SOURCE / 'replacements/2W8A5005.JPG',
    # Fail if the approved redacted source is missing; never fall back to the paper with emails.
    22: SOURCE / 'replacements/22-counseling-paper-email-redacted.png',
    37: SOURCE / 'additions/FSAEJ-Day06-0913-2306.jpg',
}


def webp_bytes(picture, quality):
    buffer = BytesIO()
    picture.save(buffer, 'WEBP', quality=quality, method=6)
    return buffer.getvalue()


def paired_screens(screens, thumbnail=False):
    # A self-contained SVG lays out the two original screenshots without redrawing
    # their text. Both stay complete and use the smaller source height.
    height = min(screen['height'] for screen in screens)
    widths = [round(screen['width'] * height / screen['height']) for screen in screens]
    padding, gap = 24, 24
    width, total_height = sum(widths) + padding * 2 + gap, height + padding * 2
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{total_height}" viewBox="0 0 {width} {total_height}">',
             '<title>Little Spirit: input and career suggestion</title>',
             '<rect width="100%" height="100%" fill="#0c1118"/>']
    x = padding
    for screen, item_width in zip(screens, widths):
        data = b64encode(screen['thumbnail' if thumbnail else 'full']).decode('ascii')
        parts.append(f'<image x="{x}" y="{padding}" width="{item_width}" height="{height}" preserveAspectRatio="xMidYMin meet" href="data:image/webp;base64,{data}"/>')
        x += item_width + gap
    parts.append('</svg>')
    return '\n'.join(parts), width, total_height


def main():
    (OUTPUT / 'thumbnails').mkdir(parents=True, exist_ok=True)
    manifest = {}
    screens = {}
    for number, name in enumerate(NAMES, 1):
        if number in CODE_SCREENSHOTS:
            continue
        source = SUPPLIED[number] if number in SUPPLIED else next((SOURCE / 'images').glob(f'{number:02d}_*'))
        with Image.open(source) as original:
            original.load()  # Never silently accept the truncated PPTX image.
            picture = ImageOps.exif_transpose(original).convert('RGB')
            picture.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
            # A fresh image drops source EXIF, comments and other embedded metadata.
            clean = Image.new('RGB', picture.size)
            clean.paste(picture)
            filename = f'{number:02d}-{name}.webp'
            full_bytes = webp_bytes(clean, 92 if number in DOCUMENTS else 85)
            thumbnail = clean.copy()
            thumbnail.thumbnail((640, 640), Image.Resampling.LANCZOS)
            thumb_bytes = webp_bytes(thumbnail, 85)
            if number in COMBINED_SCREENS:
                screens[number] = {'width': clean.width, 'height': clean.height,
                                   'full': full_bytes, 'thumbnail': thumb_bytes}
                continue
            (OUTPUT / filename).write_bytes(full_bytes)
            (OUTPUT / 'thumbnails' / filename).write_bytes(thumb_bytes)
            manifest[f'{number:02d}'] = {
                'src': f'images/portfolio/{filename}',
                'thumbnail': f'images/portfolio/thumbnails/{filename}',
                'width': clean.width, 'height': clean.height,
            }
    filename = '38-little-spirit-input-and-result.svg'
    for thumbnail in (False, True):
        svg, width, height = paired_screens([screens[11], screens[12]], thumbnail)
        destination = OUTPUT / 'thumbnails' if thumbnail else OUTPUT
        (destination / filename).write_text(svg, encoding='utf-8')
    manifest['38'] = {'src': f'images/portfolio/{filename}',
                      'thumbnail': f'images/portfolio/thumbnails/{filename}',
                      'width': width, 'height': height}
    # Remove only known generated derivatives; the private originals are retained.
    for number in CODE_SCREENSHOTS | COMBINED_SCREENS:
        filename = f'{number:02d}-{NAMES[number - 1]}.webp'
        for directory in (OUTPUT, OUTPUT / 'thumbnails'):
            path = (directory / filename).resolve()
            if not path.is_relative_to(OUTPUT.resolve()):
                raise ValueError(f'Asset path escaped output: {path}')
            path.unlink(missing_ok=True)
    for directory in (OUTPUT, OUTPUT / 'thumbnails'):
        (directory / '22-counseling-paper.webp').unlink(missing_ok=True)
    target = ROOT / 'src/data/media-assets.json'
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for path in OUTPUT.rglob('*.webp'):
        with Image.open(path) as picture:
            picture.load()
    files = [p for p in OUTPUT.rglob('*') if p.is_file()]
    print(json.dumps({'images': len(manifest), 'files': len(files),
                      'bytes': sum(p.stat().st_size for p in files)}))


if __name__ == '__main__':
    main()
