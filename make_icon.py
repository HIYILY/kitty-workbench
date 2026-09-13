# -*- coding: utf-8 -*-
"""生成 Hello Kitty 粉色 PWA 图标（192 / 512），保存到脚本所在目录。"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))


def make(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 粉色圆角底
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22),
                        fill=(255, 183, 213, 255))

    cx, cy = size * 0.5, size * 0.58
    hr = size * 0.33

    # 耳朵
    d.polygon([(cx - hr * 0.9, cy - hr * 0.5), (cx - hr * 0.68, cy - hr * 1.58),
               (cx - hr * 0.10, cy - hr * 0.98)], fill=(255, 255, 255, 255))
    d.polygon([(cx + hr * 0.9, cy - hr * 0.5), (cx + hr * 0.68, cy - hr * 1.58),
               (cx + hr * 0.10, cy - hr * 0.98)], fill=(255, 255, 255, 255))

    # 胡须（在脸之前画，让脸盖住内侧）
    w = max(1, int(size * 0.012))
    for dy in (-0.18, 0.0, 0.18):
        y = cy + hr * dy
        d.line([cx - hr * 1.32, y - hr * 0.06, cx - hr * 0.85, y], fill=(80, 80, 80, 255), width=w)
        d.line([cx + hr * 1.32, y - hr * 0.06, cx + hr * 0.85, y], fill=(80, 80, 80, 255), width=w)

    # 头
    d.ellipse([cx - hr, cy - hr * 0.86, cx + hr, cy + hr * 0.86], fill=(255, 255, 255, 255))

    # 眼睛
    er = size * 0.034
    for ex in (cx - hr * 0.42, cx + hr * 0.42):
        d.ellipse([ex - er, cy - er * 1.5, ex + er, cy + er * 1.5], fill=(43, 43, 43, 255))

    # 鼻子
    nr = size * 0.028
    d.ellipse([cx - nr, cy + hr * 0.30 - nr * 0.7, cx + nr, cy + hr * 0.30 + nr * 0.7],
              fill=(255, 206, 68, 255))

    # 蝴蝶结（左上）
    bx, by = cx - hr * 0.70, cy - hr * 1.12
    b = size * 0.072
    d.ellipse([bx - b * 1.35, by - b * 0.9, bx - b * 0.12, by + b * 0.9], fill=(255, 79, 150, 255))
    d.ellipse([bx + b * 0.12, by - b * 0.9, bx + b * 1.35, by + b * 0.9], fill=(255, 79, 150, 255))
    d.ellipse([bx - b * 0.45, by - b * 0.45, bx + b * 0.45, by + b * 0.45], fill=(255, 45, 120, 255))

    img.save(path)


make(192, os.path.join(HERE, "icon-192.png"))
make(512, os.path.join(HERE, "icon-512.png"))
print("kitty icons ->", HERE)
