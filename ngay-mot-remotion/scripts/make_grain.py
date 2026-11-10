"""Generates film-grain tiles (pure numpy + PIL, no external assets)."""
import numpy as np, os
from PIL import Image
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'grain')
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)
for i in range(4):
    n = rng.normal(0.5, 0.22, (512, 512))
    n = np.clip(n, 0, 1)
    img = (n * 255).astype(np.uint8)
    Image.fromarray(img, 'L').convert('RGB').save(os.path.join(out, f'grain{i}.png'), optimize=True)
print('ok')
