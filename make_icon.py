# -*- coding: utf-8 -*-
"""生成可爱小猫（粉色蝴蝶结）PWA 图标，保存到脚本所在目录。"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))

CREAM = (255, 250, 244, 255)
PINK = (255, 143, 184, 255)
PINK_D = (255, 107, 168, 255)
PINK_L = (255, 184, 212, 255)


def make(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=(255, 190, 216, 255))

    cx, cy = size * 0.5, size * 0.58
    hr, vr = size * 0.34, size * 0.29

    # 耳朵（外部）
    d.polygon([(cx - hr * 0.95, cy - vr * 0.45), (cx - hr * 0.80, cy - vr * 1.70),
               (cx - hr * 0.12, cy - vr * 0.95)], fill=CREAM)
    d.polygon([(cx + hr * 0.95, cy - vr * 0.45), (cx + hr * 0.80, cy - vr * 1.70),
               (cx + hr * 0.12, cy - vr * 0.95)], fill=CREAM)
    # 耳朵内部粉色
    d.polygon([(cx - hr * 0.82, cy - vr * 0.55), (cx - hr * 0.72, cy - vr * 1.35),
               (cx - hr * 0.30, cy - vr * 0.92)], fill=PINK_L)
    d.polygon([(cx + hr * 0.82, cy - vr * 0.55), (cx + hr * 0.72, cy - vr * 1.35),
               (cx + hr * 0.30, cy - vr * 0.92)], fill=PINK_L)

    # 头
    d.ellipse([cx - hr, cy - vr, cx + hr, cy + vr], fill=CREAM)

    # 大眼睛 + 高光
    ex = hr * 0.42
    erx, ery = size * 0.052, size * 0.066
    for sx in (cx - ex, cx + ex):
        d.ellipse([sx - erx, cy - ery, sx + erx, cy + ery], fill=(58, 42, 36, 255))
        d.ellipse([sx - erx * 0.60, cy - ery * 0.75, sx - erx * 0.00, cy - ery * 0.15], fill=(255, 255, 255, 255))
        d.ellipse([sx + erx * 0.15, cy + ery * 0.15, sx + erx * 0.55, cy + ery * 0.55], fill=(255, 255, 255, 255))

    # 腮红
    brx, bry = size * 0.062, size * 0.038
    by2 = cy + vr * 0.30
    d.ellipse([cx - hr * 0.84 - brx, by2 - bry, cx - hr * 0.84 + brx, by2 + bry], fill=PINK_L)
    d.ellipse([cx + hr * 0.84 - brx, by2 - bry, cx + hr * 0.84 + brx, by2 + bry], fill=PINK_L)

    # 鼻子
    ny = cy + vr * 0.15
    d.polygon([(cx, ny), (cx - size * 0.024, ny + size * 0.032), (cx + size * 0.024, ny + size * 0.032)], fill=PINK)

    # 粉色蝴蝶结
    bx, by = cx + hr * 0.72, cy - vr * 1.05
    b = size * 0.072
    d.ellipse([bx - b * 1.6, by - b * 0.95, bx - b * 0.10, by + b * 0.95], fill=PINK)
    d.ellipse([bx + b * 0.10, by - b * 0.95, bx + b * 1.6, by + b * 0.95], fill=PINK)
    d.ellipse([bx - b * 0.55, by - b * 0.55, bx + b * 0.55, by + b * 0.55], fill=PINK_D)

    img.save(path)


make(192, os.path.join(HERE, "icon-192.png"))
make(512, os.path.join(HERE, "icon-512.png"))
print("cute cat icons ->", HERE)
