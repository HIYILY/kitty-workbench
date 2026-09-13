# -*- coding: utf-8 -*-
"""生成粉色蝴蝶结 PWA 图标，保存到脚本所在目录。"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))

PINK = (255, 126, 179, 255)
PINK_D = (255, 79, 150, 255)
PINK_L = (255, 143, 187, 255)
HI = (255, 222, 236, 255)


def make(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 浅粉圆角底
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=(255, 227, 239, 255))

    cx, cy = size * 0.5, size * 0.44
    lrx, lry = size * 0.235, size * 0.17
    dx = size * 0.185

    # 飘带
    d.polygon([(cx - size * 0.03, cy + size * 0.05), (cx - size * 0.17, cy + size * 0.34),
               (cx - size * 0.01, cy + size * 0.27)], fill=PINK_L)
    d.polygon([(cx + size * 0.03, cy + size * 0.05), (cx + size * 0.17, cy + size * 0.34),
               (cx + size * 0.01, cy + size * 0.27)], fill=PINK_L)

    # 左右环
    d.ellipse([cx - dx - lrx, cy - lry, cx - dx + lrx, cy + lry], fill=PINK)
    d.ellipse([cx + dx - lrx, cy - lry, cx + dx + lrx, cy + lry], fill=PINK)

    # 高光
    d.ellipse([cx - dx - lrx * 0.55, cy - lry * 0.82, cx - dx + lrx * 0.05, cy - lry * 0.12], fill=HI)
    d.ellipse([cx + dx - lrx * 0.05, cy - lry * 0.82, cx + dx + lrx * 0.55, cy - lry * 0.12], fill=HI)

    # 中心结
    d.rounded_rectangle([cx - size * 0.062, cy - size * 0.088, cx + size * 0.062, cy + size * 0.088],
                        radius=int(size * 0.05), fill=PINK_D)

    img.save(path)


make(192, os.path.join(HERE, "icon-192.png"))
make(512, os.path.join(HERE, "icon-512.png"))
print("bow icons ->", HERE)
