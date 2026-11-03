"""Procedural score + sound design, 100% synthesised here (no third-party samples),
so it is free for commercial use. Every hit is placed from out/events.json,
which is exported from the same simulation that drives the picture.

usage: node scripts/export-events.mjs && python3 scripts/make_audio.py
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = json.load(open(os.path.join(ROOT, 'out', 'events.json')))
SR = 48000
FPS = EV['fps']
DUR = EV['duration'] / FPS
N = int(DUR * SR)
K = EV['K']
rng = np.random.default_rng(11)

L = np.zeros(N); R = np.zeros(N)           # dry bus
RL = np.zeros(N); RR = np.zeros(N)         # reverb send

def fs(frame):
    return int(frame / FPS * SR)

def t_(sec):
    return np.arange(int(sec * SR)) / SR

def place(sig, frame, gain=1.0, pan=0.0, verb=0.0):
    i = fs(frame)
    if i >= N or i + len(sig) <= 0:
        return
    s = sig
    if i < 0:
        s = s[-i:]; i = 0
    s = s[: N - i]
    gl = gain * np.sqrt(0.5 * (1 - pan)); gr = gain * np.sqrt(0.5 * (1 + pan))
    L[i:i + len(s)] += s * gl; R[i:i + len(s)] += s * gr
    if verb:
        RL[i:i + len(s)] += s * gl * verb; RR[i:i + len(s)] += s * gr * verb

def fft_filter(x, lo=None, hi=None, order=2):
    n = len(x)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(fr)
    if hi: m *= 1 / np.sqrt(1 + (fr / hi) ** (2 * order))
    if lo: m *= 1 / np.sqrt(1 + (lo / np.maximum(fr, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * m, n)

def noise(sec):
    return rng.standard_normal(int(sec * SR))

def env_exp(n, decay, attack=0.002):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)

# ── sound atoms ────────────────────────────────────────────────
def thump(freq=52, dec=0.16, click=0.35):
    t = t_(0.6)
    ph = 2 * np.pi * np.cumsum(freq * (1 + 1.4 * np.exp(-t * 35))) / SR
    s = np.sin(ph) * env_exp(len(t), dec, 0.001)
    c = fft_filter(noise(0.6), 80, 1400) * env_exp(len(t), 0.018) * click
    return s + c

def crowd_step():
    """Hundreds of feet landing together: low thud + spread-out scuffs."""
    out = thump(50, 0.14, 0.25)
    sc = np.zeros(len(out))
    for _ in range(9):
        d = int(rng.uniform(0, 0.03) * SR)
        b = fft_filter(noise(0.12), 250, 2400) * env_exp(int(0.12 * SR), 0.03)
        sc[d:d + len(b)] += b * rng.uniform(0.04, 0.09)
    return out + sc

def whoosh(sec, f0, f1, q=1.0):
    n = int(sec * SR)
    x = noise(sec)
    # sweep a band-pass by blending fixed bands
    bands = np.geomspace(min(f0, f1), max(f0, f1), 8)
    filt = [fft_filter(x, b / (1.6 * q), b * 1.6 * q) for b in bands]
    pos = np.linspace(0, 1, n)
    if f1 < f0: pos = 1 - pos
    idx = pos * (len(bands) - 1)
    y = np.zeros(n)
    for k, fb in enumerate(filt):
        w = np.clip(1 - np.abs(idx - k), 0, 1)
        y += fb * w
    e = np.sin(np.pi * np.clip(np.linspace(0, 1, n), 0, 1)) ** 1.5
    return y * e

def tone(freqs, sec, dec, amps=None):
    t = t_(sec)
    amps = amps or [1] * len(freqs)
    s = sum(a * np.sin(2 * np.pi * fq * t + i) * np.exp(-t / (dec / (1 + 0.35 * i))) for i, (fq, a) in enumerate(zip(freqs, amps)))
    return s * np.clip(t / 0.004, 0, 1)

def heartbeat():
    a = thump(44, 0.09, 0.08)
    b = thump(40, 0.08, 0.05) * 0.6
    out = np.zeros(int(0.7 * SR))
    out[: len(a)] += a
    d = int(0.2 * SR)
    out[d:d + len(b)] += b[: len(out) - d]
    return fft_filter(out, None, 180)

def gravel(sec, density=140):
    n = int(sec * SR)
    y = np.zeros(n)
    for _ in range(int(density * sec)):
        i = rng.integers(0, n - 2000)
        g = fft_filter(noise(0.04), 900, 6000) * env_exp(int(0.04 * SR), 0.004)
        y[i:i + len(g)] += g * rng.uniform(0.1, 1)
    return y

# ── 1. HOOK: sub drop + impact, the crowd is already marching ──
boom = np.sin(2 * np.pi * np.cumsum(np.geomspace(70, 28, int(2.2 * SR))) / SR) * env_exp(int(2.2 * SR), 0.9, 0.003)
place(boom, 0, 0.9, 0, 0.3)
place(fft_filter(noise(0.5), 40, 900) * env_exp(int(0.5 * SR), 0.08), 0, 0.55, 0, 0.4)
place(whoosh(0.9, 1800, 300), 2, 0.22, 0.4, 0.3)

# ── 2. lock-step march (ducked while the hero perceives) ──────
def march_gain(f):
    g = 0.8 + 0.2 * min(1, f / 120)
    if K['awaken'] - 4 <= f < 268:            # the world goes muffled for him
        g *= 0.28
    if 268 <= f < K['fall']:
        g *= 0.95 + 0.3 * (f - 268) / (K['fall'] - 268)
    if K['fall'] <= f < 500:
        g *= 0.35
    if f >= K['dimStart']:
        g *= max(0, 1 - (f - K['dimStart']) / 50)
    return g

step = crowd_step()
step_muffled = fft_filter(step, None, 300)
for f in EV['steps']:
    g = march_gain(f)
    s = step_muffled if (K['awaken'] - 4 <= f < 268 or K['fall'] <= f < 500) else step
    place(s, f, 0.55 * g, rng.uniform(-0.15, 0.15), 0.12)

# ── 3. score: low drone pad (additive saws, time-varying brightness) ──
t = np.arange(N) / SR
fr = t * FPS
def automation(points):
    xs, ys = zip(*points)
    return np.interp(fr, xs, ys)
amp = automation([(0, 0.55), (150, 0.6), (186, 0.65), (192, 0.08), (262, 0.12), (290, 0.4), (424, 0.95), (446, 1.0), (450, 0.0),
                  (500, 0.0), (512, 0.4), (548, 0.35), (600, 0.0), (690, 0)])
bright = automation([(0, 500), (186, 700), (192, 220), (280, 300), (424, 2400), (448, 3200), (500, 300), (600, 200), (690, 200)])
pad = np.zeros(N)
for base, det in [(36.71, 0), (36.71, 0.35), (55.0, -0.25), (73.42, 0.2)]:
    f0 = base + det
    for h in range(1, 28):
        fh = f0 * h
        if fh > 6000: break
        a = (1 / h) / (1 + (fh / bright) ** 4)
        pad += a * np.sin(2 * np.pi * fh * t + h * 1.7 + det)
pad *= amp * 0.11
# rising tension pulse (Shepard-ish riser) during the struggle
riser = np.zeros(N)
for k in range(5):
    fq = 110 * 2 ** (k + ((fr - 280) / 150).clip(0, 1))
    w = np.exp(-((np.log2(fq / 440)) ** 2) / 1.2)
    riser += w * np.sin(2 * np.pi * np.cumsum(fq) / SR)
riser *= automation([(0, 0), (280, 0), (420, 0.05), (446, 0.07), (449, 0), (690, 0)])
L += pad + riser; R += pad * 0.97 + riser
RL += pad * 0.3; RR += pad * 0.3

# ── 4. awakening: cloth swish, flash of clarity, tinnitus ─────
place(whoosh(0.35, 900, 4000, 1.4), K['pull'] - 2, 0.25, -0.2, 0.2)
place(whoosh(0.5, 3000, 700), K['awaken'], 0.22, -0.1, 0.3)
place(tone([392, 587.3, 784, 1174.7], 4.0, 2.2, [0.5, 0.35, 0.25, 0.12]), K['awaken'], 0.18, 0, 0.6)  # glassy chord
tin = np.sin(2 * np.pi * 3150 * t) * automation([(0, 0), (190, 0), (196, 0.012), (250, 0.008), (275, 0), (690, 0)])
L += tin; R += tin
# cloth lands
place(fft_filter(noise(0.2), 200, 1800) * env_exp(int(0.2 * SR), 0.05), 216, 0.12, -0.1, 0.2)

# ── 5. heartbeat — slow, then racing ──────────────────────────
f = K['awaken'] + 4
while f < K['fall'] - 2:
    prog = (f - K['awaken']) / (K['fall'] - K['awaken'])
    place(heartbeat(), f, 0.55 + 0.35 * prog, 0, 0.1)
    f += int(25 - 11 * prog)
place(heartbeat(), K['fall'] - 2, 1.0, 0, 0.4)

# ── 6. line 1 lands ───────────────────────────────────────────
place(tone([73.42, 146.8, 220.0, 293.7], 5.0, 2.8, [1, 0.5, 0.25, 0.12]), K['line1'], 0.22, 0, 0.5)

# ── 7. the crowd hits him: body impacts, sliding feet ────────
for c in EV['contacts']:
    place(thump(85, 0.08, 0.6), c, 0.42, -0.2, 0.15)
for i, sv in enumerate(EV['shoves']):
    g = 0.35 + 0.05 * i
    place(thump(70, 0.1, 0.5), sv, g, -0.1, 0.15)
    place(fft_filter(noise(0.28), 1500, 6000) * env_exp(int(0.28 * SR), 0.08, 0.02), sv + 1, g * 0.22, 0.1, 0.05)  # scuff
    place(fft_filter(noise(0.12), 300, 1500) * env_exp(int(0.12 * SR), 0.04), sv, g * 0.3, -0.15)       # cloth/grunt texture

# ── 8. the edge gives way + the fall (slow motion) ───────────
place(gravel(1.6, 90), K['edge'] + 4, 0.35, 0.3, 0.3)
place(fft_filter(gravel(2.5, 40), None, 2500), K['fall'] - 6, 0.3, 0.35, 0.5)
fall_w = whoosh(3.6, 1500, 120, 0.8)
place(fall_w, K['fall'], 1.0, 0.25, 0.7)
# the slowed world: a long pitched-down breath
place(fft_filter(noise(2.5), 40, 260) * np.sin(np.linspace(0, np.pi, int(2.5 * SR))), K['fall'] - 8, 0.28, 0, 0.4)
# far, far below: a deep thud — then silence
place(thump(34, 0.6, 0.0) * 0.8, K['fall'] + 64, 0.5, 0.2, 0.9)

# ── 9. others dropping: soft distant whooshes ────────────────
for e in EV['falls']:
    if e['f'] < 0 or e['f'] >= K['dimEnd']:
        continue
    near = e['z'] < 0.5
    g = (0.12 if near else 0.05 * (1 - e['z'] / 13)) * (0.4 if K['awaken'] - 4 <= e['f'] < 268 else 1)
    place(whoosh(0.7 if near else 0.5, 1400, 250), e['f'], g, 0.45, 0.4)

# ── 10. line 2 + aftermath ───────────────────────────────────
place(tone([55.0, 110.0, 164.8, 220.0], 6.0, 3.2, [1, 0.6, 0.3, 0.15]), K['line2'], 0.26, 0, 0.6)
place(fft_filter(noise(1.2), 80, 400) * np.sin(np.linspace(0, np.pi, int(1.2 * SR))) ** 2, K['line2'] - 10, 0.15, 0, 0.3)

# ── 11. end card ─────────────────────────────────────────────
place(tone([146.8, 220.0, 293.7, 349.2], 5.0, 3.0, [0.6, 0.4, 0.3, 0.2]), K['card1'], 0.16, 0, 0.7)
rev_sw = whoosh(0.9, 300, 3000)[::-1] * 0.0 + whoosh(0.9, 300, 2800)
place(rev_sw * np.linspace(0, 1, len(rev_sw)) ** 2, K['card2'] - 26, 0.18, 0, 0.3)
place(thump(48, 0.35, 0.2), K['card2'], 0.5, 0, 0.5)
place(whoosh(0.5, 2500, 500), K['bandDrop'], 0.3, 0.3, 0.3)       # the band slips off
place(tone([293.7, 440.0, 587.3, 880.0, 1174.7], 3.5, 2.2, [0.5, 0.4, 0.3, 0.2, 0.1]), K['bandDrop'] + 6, 0.2, 0, 0.8)

# ── air bed (never digital silence) ───────────────────────────
air = fft_filter(rng.standard_normal(N), 60, 900) * 0.006
L += air; R += np.roll(air, 977)

# ── reverb (synthetic hall IR, FFT convolution) ──────────────
def conv(x, ir):
    n = len(x) + len(ir) - 1
    nf = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[: len(x)]
irn = int(2.8 * SR)
it = np.arange(irn) / SR
irL = rng.standard_normal(irn) * np.exp(-it / 0.7); irR = rng.standard_normal(irn) * np.exp(-it / 0.7)
irL = fft_filter(irL, 120, 5000); irR = fft_filter(irR, 120, 5000)
irL /= np.sqrt(np.sum(irL ** 2)); irR /= np.sqrt(np.sum(irR ** 2))
L += conv(RL, irL) * 0.55; R += conv(RR, irR) * 0.55

# ── master: gentle glue, fade, limit ─────────────────────────
mix_ = np.stack([L, R], 1)
mix_ = fft_filter(mix_[:, 0], 22, None)[:, None] * [1, 0] + fft_filter(mix_[:, 1], 22, None)[:, None] * [0, 1]
fade = np.clip((N - np.arange(N)) / (0.25 * SR), 0, 1)
mix_ *= fade[:, None]
mix_ /= np.max(np.abs(mix_)) + 1e-9
mix_ = np.tanh(mix_ * 1.6) / np.tanh(1.6) * 0.89
pcm = (mix_ * 32767).astype(np.int16)
os.makedirs(os.path.join(ROOT, 'public', 'audio'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'public', 'audio', 'soundtrack.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote soundtrack', DUR, 's')
