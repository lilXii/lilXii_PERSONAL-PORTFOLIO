"""Extract embedded PPTX images unchanged, with slide mapping and local previews."""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import math
import posixpath
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image, ImageDraw, ImageFont, ImageOps

NS = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.svg', '.emf', '.wmf'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    output = args.destination.resolve()
    if output.exists() and any(output.iterdir()):
        raise SystemExit(f'Refusing to overwrite non-empty directory: {output}')
    (output / 'images').mkdir(parents=True, exist_ok=True)
    (output / 'thumbnails').mkdir()
    (output / 'contact-sheets').mkdir()

    with zipfile.ZipFile(args.source) as deck:
        names = set(deck.namelist())

        def relationships(part):
            relpath = posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part) + '.rels')
            if relpath not in names:
                return {}
            result = {}
            for rel in ET.fromstring(deck.read(relpath)):
                if rel.get('TargetMode') == 'External':
                    continue
                target = rel.get('Target', '')
                resolved = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(part), target))
                result[rel.get('Id')] = (resolved, rel.get('Type', '').rsplit('/', 1)[-1])
            return result

        def part_images(part, seen=None):
            seen = set() if seen is None else seen
            if part in seen or part not in names:
                return set()
            seen.add(part)
            rels = relationships(part)
            root = ET.fromstring(deck.read(part))
            found = set()
            for element in root.iter():
                for key, value in element.attrib.items():
                    if key.startswith('{' + NS['r'] + '}') and value in rels:
                        target, kind = rels[value]
                        if kind == 'image' and target.startswith('ppt/media/'):
                            found.add(target)
            for target, kind in rels.values():
                if kind in ('slideLayout', 'slideMaster'):
                    found.update(part_images(target, seen))
            return found

        presentation_rels = relationships('ppt/presentation.xml')
        presentation = ET.fromstring(deck.read('ppt/presentation.xml'))
        slide_parts = [presentation_rels[item.get('{' + NS['r'] + '}id')][0]
                       for item in presentation.findall('p:sldIdLst/p:sldId', NS)]
        slides = []
        usage = {}
        for number, part in enumerate(slide_parts, 1):
            root = ET.fromstring(deck.read(part))
            title = ''
            for shape in root.findall('.//p:sp', NS):
                placeholder = shape.find('p:nvSpPr/p:nvPr/p:ph', NS)
                if placeholder is not None and placeholder.get('type') in ('title', 'ctrTitle'):
                    title = ' '.join(node.text or '' for node in shape.findall('.//a:t', NS)).strip()
                    if title:
                        break
            if not title:
                lines = [''.join(node.text or '' for node in paragraph.findall('.//a:t', NS)).strip()
                         for paragraph in root.findall('.//a:p', NS)]
                title = next((line for line in lines if line and not line.isdigit()), f'Slide {number}')
            title = title[:160]
            slide = {'number': number, 'title': title, 'source_part': part}
            slides.append(slide)
            for media in part_images(part):
                usage.setdefault(media, []).append(number)

        media_parts = sorted((name for name in names if name.startswith('ppt/media/') and Path(name).suffix.lower() in IMAGE_EXTENSIONS),
                             key=lambda name: (min(usage.get(name, [9999])), name))
        records = []
        for index, part in enumerate(media_parts, 1):
            data = deck.read(part)
            filename = f'{index:02d}_{posixpath.basename(part)}'
            (output / 'images' / filename).write_bytes(data)
            record = {'id': index, 'file': f'images/{filename}', 'source_part': part,
                      'slides': usage.get(part, []), 'slide_titles': [slides[n - 1]['title'] for n in usage.get(part, [])],
                      'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'width': None, 'height': None,
                      'thumbnail': None}
            try:
                with Image.open(io.BytesIO(data)) as original:
                    record['width'], record['height'] = original.size
                    original.verify()
                with Image.open(io.BytesIO(data)) as original:
                    thumb = ImageOps.exif_transpose(original).convert('RGBA')
                    thumb.thumbnail((640, 440), Image.Resampling.LANCZOS)
                    background = Image.new('RGB', thumb.size, '#edf0f3')
                    background.paste(thumb, mask=thumb.getchannel('A'))
                    record['thumbnail'] = f'thumbnails/{index:02d}.jpg'
                    background.save(output / record['thumbnail'], quality=88)
            except Exception as error:
                record['preview_error'] = str(error)
            # Validate extraction against the bytes stored in the source deck.
            assert hashlib.sha256((output / record['file']).read_bytes()).hexdigest() == record['sha256']
            records.append(record)

    manifest = {'source': args.source.name, 'slide_count': len(slides), 'image_count': len(records),
                'distinct_image_count': len({r['sha256'] for r in records}), 'slides': slides, 'images': records}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    with (output / 'image-index.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(['編號', '圖片檔案', '出現頁碼', '頁面標題', '寬', '高', '檔案大小 bytes', 'SHA256', '圖片檢查'])
        for record in records:
            title = ' / '.join(record['slide_titles'])
            if title.startswith(('=', '+', '-', '@')):
                title = "'" + title
            writer.writerow([record['id'], record['file'], ', '.join(map(str, record['slides'])), title,
                             record['width'], record['height'], record['bytes'], record['sha256'], record.get('preview_error', 'OK')])

    font_path = Path('C:/Windows/Fonts/arial.ttf')
    font = ImageFont.truetype(str(font_path), 17) if font_path.exists() else ImageFont.load_default()
    small = ImageFont.truetype(str(font_path), 13) if font_path.exists() else font
    sheet_paths = []
    for offset in range(0, len(records), 18):
        batch = records[offset:offset + 18]
        sheet = Image.new('RGB', (1200, math.ceil(len(batch) / 3) * 270 + 55), '#f5f7f9')
        draw = ImageDraw.Draw(sheet)
        draw.text((20, 16), f'Embedded images {offset + 1}-{offset + len(batch)} / {len(records)}', font=font, fill='#16232e')
        for cell, record in enumerate(batch):
            x, y = (cell % 3) * 400 + 14, (cell // 3) * 270 + 52
            if record['thumbnail']:
                with Image.open(output / record['thumbnail']) as preview:
                    preview.thumbnail((370, 205), Image.Resampling.LANCZOS)
                    sheet.paste(preview, (x + (370 - preview.width) // 2, y + (205 - preview.height) // 2))
            else:
                draw.text((x + 20, y + 80), 'SOURCE PREVIEW UNAVAILABLE', font=font, fill='#9d351d')
                draw.text((x + 20, y + 110), 'Original file preserved. See index.', font=small, fill='#53636f')
            draw.text((x, y + 212), f"{record['id']:02d}  {Path(record['file']).name}  {record['width']}x{record['height']}", font=font, fill='#16232e')
            pages = ', '.join(map(str, record['slides'])) or 'not referenced'
            draw.text((x, y + 238), 'Slides: ' + pages[:48], font=small, fill='#53636f')
        sheet_path = f'contact-sheets/sheet-{offset // 18 + 1:02d}.jpg'
        sheet.save(output / sheet_path, quality=91)
        sheet_paths.append(sheet_path)

    escape = html.escape
    cards = []
    for record in records:
        pages = ', '.join(map(str, record['slides'])) or '未對應頁碼'
        titles = ' / '.join(record['slide_titles'])
        image = f'<img src="{record["thumbnail"]}" loading="lazy" alt="圖片 {record["id"]:02d} 預覽">' if record['thumbnail'] else '<span>無法產生預覽，原檔已保留。<br>檔案檢查：' + escape(record.get('preview_error', 'Unsupported format')) + '</span>'
        cards.append(f'<article data-pages="{escape(pages)}" data-search="{escape(titles + " " + record["file"])}"><a class="preview" href="{record["file"]}" target="_blank">{image}</a><h2>{record["id"]:02d} · {escape(Path(record["file"]).name)}</h2><p>{record["width"]} × {record["height"]} px · {record["bytes"] // 1024} KB</p><p>出現頁碼：{escape(pages)}</p><p class="titles">{escape(titles)}</p><a href="{record["file"]}" download>下載內嵌原圖 ↗</a></article>')
    page_options = ''.join(f'<option value="{s["number"]}">第 {s["number"]} 頁 · {escape(s["title"][:65])}</option>' for s in slides)
    template = '''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>簡報圖片索引</title>
<style>body{margin:0;background:#f4f6f8;color:#16232e;font-family:Arial,"Microsoft JhengHei",sans-serif}header{padding:30px max(24px,4vw);background:white;border-bottom:1px solid #d8e0e7}h1{font-size:27px;margin:0 0 12px}p{line-height:1.6}header p{color:#52616c}input,select{padding:12px;border:1px solid #acb8c2;border-radius:4px;font:inherit;max-width:100%;box-sizing:border-box}nav{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:22px 0 0}a{color:#146686}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px;padding:28px max(24px,4vw)}article{padding:18px;background:white;border:1px solid #dbe2e7;border-radius:7px;min-width:0}article[hidden]{display:none}.preview{height:220px;display:flex;align-items:center;justify-content:center;background:#edf0f3}.preview img{max-width:100%;max-height:100%;object-fit:contain}h2{font-size:16px;margin:18px 0 8px;overflow-wrap:anywhere}article p{font-size:13px;margin:5px 0;color:#54646f}.titles{min-height:42px}article>a:last-child{display:inline-block;margin-top:12px;font-size:14px}a:focus-visible{outline:3px solid #228aad;outline-offset:3px}</style>
<header><h1>簡報圖片索引</h1><p>__COUNT__ 張內嵌圖片／__SLIDES__ 頁。原圖保留簡報內的檔案格式與解析度；縮圖僅供挑選，沒有套用投影片裁切或遮罩。</p><nav><label>搜尋 <input id="search" type="search" placeholder="專案名稱或檔名"></label><label>來源頁面 <select id="page"><option value="">全部頁面</option>__OPTIONS__</select></label><a href="image-index.csv" download>下載頁碼對照 CSV</a><span id="count"></span></nav></header>
<main>__CARDS__</main><script>const search=document.querySelector('#search'),page=document.querySelector('#page'),cards=[...document.querySelectorAll('article')];function filter(){let count=0;for(const card of cards){const match=card.dataset.search.toLowerCase().includes(search.value.toLowerCase())&&(!page.value||card.dataset.pages.split(', ').includes(page.value));card.hidden=!match;if(match)count++;}document.querySelector('#count').textContent=count+' 張';}search.addEventListener('input',filter);page.addEventListener('change',filter);filter();</script></html>'''
    document = template.replace('__COUNT__', str(len(records))).replace('__SLIDES__', str(len(slides))).replace('__OPTIONS__', page_options).replace('__CARDS__', ''.join(cards))
    (output / 'index.html').write_text(document, encoding='utf-8')
    (output / 'READ-ME.txt').write_text('images/：從 PPTX 抽出的內嵌原圖，逐檔驗證 SHA256 與簡報內檔案一致。\nindex.html：可搜尋與依頁碼篩選的離線縮圖索引。\nimage-index.csv：圖片、尺寸與頁碼對照，可用 Excel 開啟。\ncontact-sheets/：整頁縮圖索引。\n包含照片、截圖、標誌等所有內嵌圖片。未合成投影片的文字與形狀，未套用投影片裁切或遮罩。\n', encoding='utf-8')
    archive = output.with_suffix('.zip')
    if archive.exists():
        raise SystemExit(f'Refusing to overwrite archive: {archive}')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for file in sorted(output.rglob('*')):
            if file.is_file():
                bundle.write(file, arcname=str(Path(output.name) / file.relative_to(output)))
    print(json.dumps({'output': str(output), 'archive': str(archive), 'slides': len(slides), 'images': len(records),
                      'distinct_images': manifest['distinct_image_count'], 'preview_errors': [r['file'] for r in records if not r['thumbnail']],
                      'unmapped_images': [r['file'] for r in records if not r['slides']], 'contact_sheets': sheet_paths}, ensure_ascii=False))


if __name__ == '__main__':
    main()
