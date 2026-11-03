#!/usr/bin/env python3
"""
Sound design + nhạc nền tổng hợp 100% bằng thuật toán (numpy) — không dùng mẫu âm thanh
của bên thứ ba => toàn quyền sử dụng thương mại.

Đọc build/events.json (sinh từ src/timeline.ts) để mọi SFX khớp đúng từng frame hình.
Xuất public/audio.wav (48 kHz, 16-bit, stereo).
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
rng = np.random.default_rng(7)

data = json.load(open(os.path.join(ROOT, 'build', 'events.json')))
DUR = data['duration']
N = int(DUR * SR) + SR
L = np.zeros(N)
Rr = np.zeros(N)
send = np.zeros(N)  # bus reverb (mono)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.002, d=0.2, shape=1.0):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    return att * np.exp(-t / d) ** shape


def onepole_lp(x, fc):
    """low-pass một cực; fc có thể là mảng (quét tần số)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


def bandpass(x, fc, q=2.0):
    """biquad band-pass, fc có thể quét theo thời gian (tính theo khối 64 mẫu)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for start in range(0, len(x), 64):
        f = fc[start]
        w0 = 2 * np.pi * min(f, SR * 0.45) / SR
        al = np.sin(w0) / (2 * q)
        b0, b2 = al, -al
        a0, a1, a2 = 1 + al, -2 * np.cos(w0), 1 - al
        b0, b2, a1, a2 = b0 / a0, b2 / a0, a1 / a0, a2 / a0
        for i in range(start, min(start + 64, len(x))):
            xi = x[i]
            yi = b0 * xi + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1 = x1, xi
            y2, y1 = y1, yi
            y[i] = yi
    return y


def place(sig, at, gain=1.0, pan=0.0, rev=0.15):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    L[i:i + len(sig)] += sig * gain * gl
    Rr[i:i + len(sig)] += sig * gain * gr
    send[i:i + len(sig)] += sig * gain * rev


# ------------------------------------------------------------------ SFX
def thud(pitch=1.0):
    t = t_(0.32)
    f = (62 + 70 * np.exp(-t / 0.025)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.09)
    slap = onepole_lp(rng.standard_normal(len(t)), 2400) * env(len(t), 0.0005, 0.012) * 1.6
    rub = bandpass(rng.standard_normal(len(t)), 900 * pitch, 3) * env(len(t), 0.001, 0.03) * 0.8
    return np.tanh((body * 1.1 + slap + rub) * 1.3) * 0.8


def boom(soft=False):
    d = 2.4 if not soft else 1.6
    t = t_(d)
    f = 30 + 55 * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.004, 0.75 if not soft else 0.5)
    n = onepole_lp(rng.standard_normal(len(t)), 300) * env(len(t), 0.002, 0.25) * 0.9
    return np.tanh((s + n) * 1.6) * (0.9 if not soft else 0.55)


def whoosh(pitch=1.0, dur=0.55):
    t = t_(dur)
    u = t / dur
    fc = (300 + 2600 * np.sin(np.pi * u) ** 2) * pitch
    n = bandpass(rng.standard_normal(len(t)), fc, 1.4)
    e = np.sin(np.pi * u) ** 1.6
    return n * e * 0.9


def shot(pitch=1.0, dur=0.42):
    t = t_(dur)
    u = t / dur
    fc = (1800 - 1100 * u) * pitch
    n = bandpass(rng.standard_normal(len(t)), fc, 1.2) * (np.exp(-u * 3.5) * np.clip(u * 30, 0, 1))
    grip = onepole_lp(rng.standard_normal(len(t)), 3000) * env(len(t), 0.0005, 0.01)
    return n * 0.9 + grip * 0.5


def clank(pitch=1.0):
    t = t_(1.1)
    parts = [(487, 0.35, 1.0), (1093, 0.22, 0.7), (1689, 0.18, 0.55), (2471, 0.12, 0.4), (3315, 0.08, 0.3), (4120, 0.05, 0.2)]
    s = np.zeros(len(t))
    for f, d, a in parts:
        s += a * np.sin(2 * np.pi * f * pitch * t + rng.uniform(0, 6)) * np.exp(-t / d)
    click = hp(rng.standard_normal(len(t)), 2000) * env(len(t), 0.0003, 0.006)
    knock = np.sin(2 * np.pi * 140 * t) * env(len(t), 0.001, 0.04)
    return (s * 0.32 + click * 0.9 + knock * 0.5) * env(len(t), 0.0005, 2.0)


def swish():
    t = t_(0.5)
    u = t / 0.5
    n = hp(rng.standard_normal(len(t)), 3000)
    e = np.clip(u * 12, 0, 1) * np.exp(-u * 6)
    chh = bandpass(rng.standard_normal(len(t)), 5200, 2) * np.exp(-u * 9)
    rim = np.sin(2 * np.pi * 1880 * t) * np.exp(-t / 0.05) * 0.08
    return (n * e * 0.6 + chh * 0.8 + rim)


def tick(pitch=1.0):
    t = t_(0.06)
    return np.sin(2 * np.pi * 1900 * pitch * t) * env(len(t), 0.0005, 0.012) * 0.6


def text_slam():
    t = t_(0.6)
    s = np.sin(2 * np.pi * (48 + 40 * np.exp(-t / 0.05)) * t) * env(len(t), 0.002, 0.2)
    n = onepole_lp(rng.standard_normal(len(t)), 1200) * env(len(t), 0.001, 0.05)
    return np.tanh((s + n * 0.6) * 2) * 0.7


def rise():
    t = t_(0.7)
    u = t / 0.7
    s = np.sin(2 * np.pi * (220 + 440 * u ** 2) * t) * np.sin(np.pi * u) ** 2 * 0.2
    n = bandpass(rng.standard_normal(len(t)), 500 + 3000 * u, 2) * np.sin(np.pi * u) ** 2 * 0.5
    return s + n


def heart():
    t = t_(0.45)
    def beat(off, a):
        tt = np.clip(t - off, 0, None)
        return a * np.sin(2 * np.pi * 52 * tt) * (t >= off) * np.exp(-tt / 0.06) * np.clip(tt / 0.004, 0, 1)
    return np.tanh((beat(0, 1.0) + beat(0.16, 0.7)) * 1.8) * 0.8


def deflate():
    t = t_(1.6)
    f = 196 * np.exp(-t / 1.4)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    s *= env(len(t), 0.08, 0.7)
    air = onepole_lp(rng.standard_normal(len(t)), 900) * env(len(t), 0.05, 0.4) * 0.4
    return (s * 0.35 + air) * 0.9


def catch():
    t = t_(0.15)
    return onepole_lp(rng.standard_normal(len(t)), 1600) * env(len(t), 0.0005, 0.02) * 1.2 + np.sin(2 * np.pi * 180 * t) * env(len(t), 0.001, 0.03) * 0.5


def riser(dur):
    t = t_(dur)
    u = t / dur
    s = np.zeros(len(t))
    for k, base in enumerate([110, 165, 220, 330]):
        f = base * (1 + 1.2 * u ** 2)
        s += np.sin(2 * np.pi * np.cumsum(f) / SR + k) * (0.5 / (k + 1))
    n = bandpass(rng.standard_normal(len(t)), 400 + 6000 * u ** 2, 1.5) * 0.6
    e = u ** 1.8
    return (s * 0.5 + n) * e


def reverse_swell(dur=0.5):
    t = t_(dur)
    u = t / dur
    n = hp(rng.standard_normal(len(t)), 1500) * u ** 3
    tone = np.sin(2 * np.pi * 587.33 * t) * u ** 4 * 0.2
    return n * 0.5 + tone


def chord(freqs, dur=4.0, bright=1.0):
    t = t_(dur)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0, 0.004):
            ff = f * (1 + det)
            s += np.sin(2 * np.pi * ff * t) + 0.3 * bright * np.sin(4 * np.pi * ff * t) * np.exp(-t / 0.6)
    s /= len(freqs) * 3
    return s * env(len(t), 0.01, dur * 0.45)


def note(freq, dur=2.5):
    t = t_(dur)
    s = sum(a * np.sin(2 * np.pi * freq * k * t) * np.exp(-t / (0.9 / k)) for k, a in [(1, 1), (2, 0.35), (3, 0.12), (4, 0.06)])
    return s * env(len(t), 0.003, 1.2) * 0.4


def land():
    return thud(0.6) * 0.7


def tag_hit():
    t = t_(1.2)
    s = np.sin(2 * np.pi * 73.4 * t) * env(len(t), 0.002, 0.4)
    return np.tanh(s * 2) * 0.6 + chord([293.66, 440.0], 1.2, 0.5) * 0.5


# ------------------------------------------------------------------ đặt SFX theo sự kiện
for e in data['events']:
    ty, at = e['type'], e['t']
    g = e.get('gain', 1.0)
    pan = e.get('pan', 0.0)
    p = e.get('pitch', 1.0)
    if ty == 'thud':
        place(thud(p * rng.uniform(0.97, 1.03)), at, g * 0.85, pan, 0.08)
    elif ty == 'boom':
        place(boom(), at, g * 0.9, 0, 0.3)
    elif ty == 'boomSoft':
        place(boom(True), at, g, 0, 0.3)
    elif ty == 'whoosh':
        place(whoosh(p), at - 0.2, g * 0.5, 0, 0.25)
    elif ty in ('shot',):
        place(shot(p), at - 0.03, g * 0.55, pan, 0.15)
    elif ty == 'shotSlow':
        place(shot(0.6, 1.3), at - 0.03, g * 0.7, pan, 0.4)
    elif ty == 'clank':
        place(clank(p), at, g * 0.75, pan, 0.35)
    elif ty == 'swish':
        place(swish(), at, g * 0.8, pan, 0.3)
    elif ty in ('tick', 'counter'):
        place(tick(p), at, g, 0, 0.1)
    elif ty == 'textSlam':
        place(text_slam(), at, g, 0, 0.3)
    elif ty == 'rise':
        place(rise(), at, g * 0.6, pan, 0.3)
    elif ty == 'heart':
        place(heart(), at, g * 0.9, 0, 0.1)
    elif ty == 'deflate':
        place(deflate(), at, g * 0.8, 0, 0.5)
    elif ty == 'catch':
        place(catch(), at, g * 0.6, pan, 0.05)
    elif ty == 'riser':
        place(riser(1.75), at, g * 0.55, 0, 0.4)
    elif ty == 'reverseSwell':
        place(reverse_swell(), at - 0.5, g * 0.6, 0, 0.4)
    elif ty == 'chord':  # khoảnh khắc vào rổ: Rê thứ → Rê TRƯỞNG (giải toả cảm xúc)
        place(chord([146.83, 220.0, 293.66, 369.99, 440.0, 587.33], 6.5, 1.2), at, g * 0.5, 0, 0.6)
    elif ty == 'note':
        place(note(p), at, g * 0.6, 0, 0.7)
    elif ty == 'land':
        place(land(), at, g, -0.3, 0.1)
    elif ty == 'tagHit':
        place(tag_hit(), at, g * 0.7, 0, 0.5)

# ------------------------------------------------------------------ nền nhạc (drone Rê thứ)
fps = data['fps']
T = np.arange(N) / SR


def auto(points):
    """đường tự động hoá âm lượng: [(giây, giá trị), ...]"""
    xs, ys = zip(*points)
    return np.interp(T, xs, ys)


f2s = lambda fr: fr / fps
drone = np.zeros(N)
for f, a in [(73.42, 1.0), (110.0, 0.55), (146.83, 0.4), (174.61, 0.28)]:  # D2 A2 D3 F3
    lfo = 1 + 0.003 * np.sin(2 * np.pi * 0.07 * T + f)
    drone += a * np.sin(2 * np.pi * f * T * lfo)
    drone += a * 0.5 * np.sin(2 * np.pi * f * 1.003 * T)
air = onepole_lp(rng.standard_normal(N), 700) * 0.25
pad = (drone / 3.5 + air) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.25 * T))
pad_gain = auto([
    (0, 0.0), (f2s(14), 0.0), (f2s(18), 0.25), (f2s(60), 0.35), (f2s(250), 0.4), (f2s(330), 0.3), (f2s(380), 0.45),
    (f2s(586), 0.7), (f2s(600), 0.05), (f2s(650), 0.0), (f2s(652), 0.0), (f2s(700), 0.15), (f2s(762), 0.2), (DUR, 0.0),
])
pad *= pad_gain * 0.22

# nhịp pulse thấp (120 BPM) — đẩy năng lượng ở hàng 3, tắt ngúm trước cú ném cuối
pulse = np.zeros(N)
beat = heart()[: int(0.3 * SR)] * 0.6
for k in range(200):
    at = f2s(380) + k * 0.5
    if at > f2s(598):
        break
    if k % 2 == 0 or at > f2s(535):
        i = int(at * SR)
        pulse[i:i + len(beat)] += beat
pulse *= auto([(0, 0), (f2s(380), 0.3), (f2s(535), 0.6), (f2s(596), 0.8), (f2s(600), 0)])

# hoà âm cuối: Rê trưởng ấm áp cho phần thông điệp
outro = np.zeros(N)
o = chord([146.83, 220.0, 293.66, 369.99], 7.0, 0.4)
i0 = int(f2s(770) * SR)
outro[i0:i0 + len(o)] += o[: N - i0]
outro *= 0.35

L += pad + pulse + outro
Rr += pad * 0.96 + pulse + outro
send += (pad + outro) * 0.2

# ------------------------------------------------------------------ reverb (IR tổng hợp, FFT convolution)
ir_len = int(2.2 * SR)
ti = np.arange(ir_len) / SR
irL = rng.standard_normal(ir_len) * np.exp(-ti / 0.55)
irR = rng.standard_normal(ir_len) * np.exp(-ti / 0.55)
irL = onepole_lp(irL, 5000)
irR = onepole_lp(irR, 5000)
irL /= np.sqrt(np.sum(irL ** 2))
irR /= np.sqrt(np.sum(irR ** 2))
n_fft = 1 << int(np.ceil(np.log2(N + ir_len)))
S_ = np.fft.rfft(send, n_fft)
wetL = np.fft.irfft(S_ * np.fft.rfft(irL, n_fft), n_fft)[:N]
wetR = np.fft.irfft(S_ * np.fft.rfft(irR, n_fft), n_fft)[:N]
L += wetL * 0.5
Rr += wetR * 0.5

# ------------------------------------------------------------------ master
mix = np.stack([L, Rr])[:, : int(DUR * SR)]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89  # ~ -1 dBFS
fade = int(0.4 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)
pcm = (mix.T * 32767).astype(np.int16)
out = os.path.join(ROOT, 'public', 'audio.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{DUR:.2f}s')
