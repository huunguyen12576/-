"""
Original sound design, synthesised from scratch (no samples) -> 100% owned,
safe for commercial use. Every cue is locked to src/timeline.json.

    python3 scripts/make_audio.py   ->  public/audio/soundtrack.wav
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "timeline.json")))
SR = 48000
FPS = T["fps"]
DUR = T["duration"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def sec(frame):
    return frame / FPS


def env_adsr(n, a, d, s, r, sustain_len):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sl = max(0, int(sustain_len * SR))
    e = np.concatenate([
        np.linspace(0, 1, max(a, 1)),
        np.linspace(1, s, max(d, 1)),
        np.full(sl, s),
        np.linspace(s, 0, max(r, 1)),
    ])
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    lg = gain * np.cos((pan + 1) * np.pi / 4)
    rg = gain * np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * lg
    R[i:i + len(sig)] += sig * rg


def lowpass(x, cutoff):
    # one-pole, cutoff may be array
    a = np.exp(-2 * np.pi * np.asarray(cutoff) / SR)
    y = np.zeros_like(x)
    prev = 0.0
    if np.ndim(a) == 0:
        for i in range(len(x)):
            prev = (1 - a) * x[i] + a * prev
            y[i] = prev
    else:
        for i in range(len(x)):
            prev = (1 - a[i]) * x[i] + a[i] * prev
            y[i] = prev
    return y


def fast_lp(x, cutoff, passes=2):
    # vectorised-ish lowpass using FFT (for long buffers)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / (1 + (fr / cutoff) ** (2 * passes))
    return np.fft.irfft(X * H, len(x))


def bandpass_fft(x, lo, hi):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / (1 + (fr / hi) ** 4) * (1 - 1 / (1 + (fr / lo) ** 4))
    return np.fft.irfft(X * H, len(x))


def tt(d):
    return np.arange(int(d * SR)) / SR


def note(f):
    return 440 * 2 ** ((f - 69) / 12)


# ---------------------------------------------------------------- music bed
def pad(freqs, t0, d, gain, bright=1200, pan_spread=0.5, attack=1.5, release=2.0):
    t = tt(d)
    sig_l = np.zeros_like(t)
    sig_r = np.zeros_like(t)
    for k, fr in enumerate(freqs):
        for det, side in ((-0.18, 0), (0.18, 1)):
            ff = fr * 2 ** (det / 12)
            ph = rng.random() * 6.28
            w = np.sin(2 * np.pi * ff * t + ph) + 0.28 * np.sin(4 * np.pi * ff * t + ph) + 0.12 * np.sin(6 * np.pi * ff * t)
            if side == 0:
                sig_l += w
            else:
                sig_r += w
    e = env_adsr(len(t), attack, 0.5, 0.85, release, d - attack - 0.5 - release)
    sig_l = fast_lp(sig_l * e, bright) / len(freqs)
    sig_r = fast_lp(sig_r * e, bright) / len(freqs)
    i = int(t0 * SR)
    n = min(len(t), N - i)
    L[i:i + n] += sig_l[:n] * gain
    R[i:i + n] += sig_r[:n] * gain


# Night: suspended, unresolved (A minor add9 drone)
pad([note(45), note(52), note(59), note(64), note(71)], 0.0, sec(T["thoughts"][0]) + 1.5, 0.16, bright=900, attack=0.6)
# Spiral: darker, rising tension cluster that grows brighter
sp0 = sec(T["thoughts"][0]) - 0.5
sp1 = sec(T["alarm"])
pad([note(41), note(48), note(53), note(56), note(60)], sp0, sp1 - sp0 + 0.2, 0.15, bright=1500, attack=2.5, release=0.15)
# rising sine "anxiety" tone (Shepard-ish glide)
t = tt(sp1 - sp0)
k = t / t[-1]
fglide = 220 * 2 ** (k * 1.0)
tone = np.sin(2 * np.pi * np.cumsum(fglide) / SR) * (k ** 2) * 0.06
tone += np.sin(2 * np.pi * np.cumsum(fglide * 1.5) / SR) * (k ** 3) * 0.03
add(tone * np.minimum(1, (len(t) - np.arange(len(t))) / (0.05 * SR)), sp0)
# Morning: warm, open major (F maj9 -> C)
m0 = sec(T["alarm"]) + 0.6
pad([note(53), note(60), note(64), note(67), note(72)], m0, sec(T["twist"][0]) - m0 + 0.8, 0.14, bright=2400, attack=1.2, release=1.0)
# Twist: a single unresolved low note (the doubt creeps back)
tw = sec(T["twist"][0])
pad([note(44), note(51), note(56)], tw, sec(T["outro"]) - tw + 1.0, 0.13, bright=800, attack=0.4, release=1.0)


# Outro piano-ish motif
def piano(f, t0, d=3.5, g=0.18, pan=0.0):
    t = tt(d)
    s = np.zeros_like(t)
    for h, a in ((1, 1), (2, 0.42), (3, 0.18), (4, 0.09), (5, 0.04)):
        s += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t * (1.6 + h * 0.9))
    s *= np.minimum(1, t / 0.004)
    add(s, t0, g, pan)


o = sec(T["outroWords"])
for i, n_ in enumerate([69, 72, 76, 74, 72, 71]):  # one note per word: 6 words
    piano(note(n_), sec(T["outroWords"] + 10 + i * 5), 2.4, 0.11, pan=-0.4 + i * 0.16)
g0 = sec(T["outroGhosts"])
for i in range(10):  # ghost thoughts: dissonant, quieter, cluttered
    piano(note([61, 63, 66, 68, 70, 73, 75, 62, 67, 71][i]), g0 + i * 2.2 / FPS, 1.6, 0.05, pan=(i % 3 - 1) * 0.6)
fin = sec(T["outroFinal"])
for n_, d_ in ((41, 0), (48, 0.02), (57, 0.05), (60, 0.08), (64, 0.11), (67, 0.15), (72, 0.6)):
    piano(note(n_), fin + d_, 5.5, 0.14)
pad([note(41), note(48), note(57), note(64), note(67)], fin, DUR - fin, 0.12, bright=2000, attack=0.8, release=1.6)

# ---------------------------------------------------------------- room tone
noise = rng.standard_normal(N)
room = fast_lp(noise, 380) * 0.035
night_env = np.ones(N)
L += room
R += fast_lp(rng.standard_normal(N), 380) * 0.035

# ---------------------------------------------------------------- SFX


def buzz(t0):
    t = tt(0.32)
    s = np.sign(np.sin(2 * np.pi * 172 * t)) * 0.5 + np.sin(2 * np.pi * 86 * t)
    s = fast_lp(s, 600) * (np.sin(np.pi * t / 0.32) ** 0.5)
    add(s, t0, 0.35)


def ding(t0, g=0.32, pan=0.0, base=1318.5):
    t = tt(1.6)
    s = (np.sin(2 * np.pi * base * t) * np.exp(-t * 4) + 0.6 * np.sin(2 * np.pi * base * 1.5 * t) * np.exp(-(t - 0.09).clip(0) * 4) * (t > 0.09)
         + 0.15 * np.sin(2 * np.pi * base * 2.76 * t) * np.exp(-t * 9))
    add(s * np.minimum(1, t / 0.002), t0, g, pan)


def whoosh(t0, d=0.7, g=0.25, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    k = t / d
    cut = 300 + (k if up else 1 - k) * 3800
    s = lowpass(n, cut) * np.sin(np.pi * k) ** 2
    add(s, t0, g * 1.6)


def tap(t0, g=0.08, pan=0.4):
    t = tt(0.04)
    s = rng.standard_normal(len(t)) * np.exp(-t * 160)
    add(fast_lp(s, 3000), t0, g, pan)


def rustle(t0, d=1.0, g=0.14, pan=0.0):
    t = tt(d)
    n = rng.standard_normal(len(t))
    am = (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t + rng.random() * 6)) * np.sin(np.pi * t / d)
    add(bandpass_fft(n, 500, 2600) * am, t0, g, pan)


def pop(t0, pitch, g=0.22, pan=-0.3):
    t = tt(0.18)
    f = pitch * (1 + 1.2 * np.exp(-t * 40))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26)
    add(s, t0, g, pan)


def heartbeat(t0, g):
    for off, amp in ((0.0, 1.0), (0.16, 0.7)):
        t = tt(0.25)
        f = 52 + 30 * np.exp(-t * 30)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)
        add(s, t0 + off, g * amp)


def tick(t0, g=0.12):
    t = tt(0.05)
    s = np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 120) + rng.standard_normal(len(t)) * np.exp(-t * 200) * 0.3
    add(s, t0, g, 0.0)


def alarm(t0):
    for i in range(4):
        t = tt(0.14)
        s = np.sign(np.sin(2 * np.pi * 1046 * t)) * 0.5
        s = fast_lp(s, 4000) * np.minimum(1, t / 0.004) * np.minimum(1, (0.14 - t) / 0.01)
        add(s, t0 + i * (10 / FPS), 0.13)


def chirp(t0, pan, g=0.06):
    for j in range(rng.integers(2, 4)):
        d = 0.07 + rng.random() * 0.05
        t = tt(d)
        f0 = 3200 + rng.random() * 1500
        f = f0 + 1600 * np.sin(np.pi * t / d) * (1 if j % 2 else -0.5)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2
        add(s, t0 + j * (d + 0.03), g, pan)


def thud(t0, g=0.4):
    t = tt(0.3)
    f = 90 + 80 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
    s += fast_lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 30) * 0.6
    add(s, t0, g, -0.35)


def sigh(t0, d=1.4, g=0.12):
    t = tt(d)
    n = rng.standard_normal(len(t))
    e = np.sin(np.pi * t / d) ** 1.5 * np.exp(-t * 0.8)
    add(bandpass_fft(n, 300, 1400) * e, t0, g, -0.35)


def boom(t0, g=0.45):
    t = tt(3.0)
    f = 44 + 30 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    add(s * np.minimum(1, t / 0.01), t0, g)


def riser(t0, d, g=0.12):
    t = tt(d)
    n = rng.standard_normal(len(t))
    k = t / d
    s = lowpass(n, 200 + 5000 * k ** 2) * k ** 2
    add(s, t0, g)


# hook
buzz(sec(T["buzz"][0]))
buzz(sec(T["buzz"][1]))
ding(sec(T["notif1"]), 0.34, 0.0)
whoosh(sec(T["split"]), 1.0, 0.22, up=False)
ding(sec(T["split"] + 6), 0.12, -0.6, 1318.5)
ding(sec(T["split"] + 8), 0.12, 0.6, 1318.5)
# chill types & replies, phone down, lies down
for i in range(7):
    tap(sec(T["chillTyping"] + i * 2.4), 0.07, 0.5)
ding(sec(T["chillSend"]), 0.14, 0.5, 1760)
whoosh(sec(T["chillCardAway"]), 0.4, 0.12)
tap(sec(T["chillPhoneDown"] + 8), 0.2, 0.5)
rustle(sec(T["chillLieDown"]), 1.3, 0.18, 0.5)
# title hit
boom(sec(T["titleSame"]), 0.18)
# spiral: pops climb in pitch with each new thought
for i, fr in enumerate(T["thoughts"]):
    pop(sec(fr), 420 * 2 ** (i / 10), 0.24, -0.25)
# heartbeats (same schedule as video)
beats = []
tb = T["thoughts"][0]
while tb < T["alarm"] - 4:
    beats.append(round(tb))
    k = (tb - T["thoughts"][0]) / (T["alarm"] - T["thoughts"][0])
    tb += 27 + (11 - 27) * k
for b in beats:
    k = (b - T["thoughts"][0]) / (T["alarm"] - T["thoughts"][0])
    heartbeat(sec(b), 0.25 + 0.4 * k)
# clock jumps
for fr, _ in T["clock"][1:]:
    tick(sec(fr), 0.14)
# rustles on the overthinker's restless pose changes
for k_, fr in T["otPoses"].items():
    rustle(sec(fr), 0.8, 0.12, -0.4)
riser(sec(T["alarm"]) - 2.2, 2.2, 0.10)
# morning
alarm(sec(T["alarm"]))
# drop everything into silence for a beat (cut tension) -> birds
for i in range(9):
    chirp(sec(T["alarm"]) + 1.0 + i * 0.75 + rng.random() * 0.3, rng.uniform(-0.8, 0.8))
whoosh(sec(T["collapse"]), 0.8, 0.14, up=False)
rustle(sec(T["chillWake"]), 1.2, 0.14, 0.5)
ding(sec(T["notif2"]), 0.3, 0.0, 1568)
piano(note(84), sec(T["chillHappy"]), 1.6, 0.07, 0.5)
piano(note(88), sec(T["chillHappy"]) + 0.08, 1.6, 0.06, 0.5)
boom(sec(T["titleDiff"]), 0.16)
sigh(sec(T["otRelief"]))
thud(sec(T["phoneDrop"]) + 0.12, 0.35)
thud(sec(T["phoneDrop"]) + 0.3, 0.12)
pop(sec(T["twist"][0]), 300, 0.22)
pop(sec(T["twist"][1]), 250, 0.22)
rustle(sec(T["headDown"]), 0.6, 0.1, -0.4)
whoosh(sec(T["outro"]), 1.4, 0.16, up=True)
boom(sec(T["outroFinal"]), 0.4)

# ---------------------------------------------------------------- ducking at the alarm "breath" + master
st = np.stack([L, R], axis=1)
# master fades
fi = int(0.05 * SR)
st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo0 = int(sec(T["fadeOut"]) * SR)
st[fo0:] *= np.linspace(1, 0, N - fo0)[:, None]
# soft clip + normalise to -1 dBFS
peak = np.max(np.abs(st))
st = st / peak * 1.25
st = np.tanh(st)
st = st / np.max(np.abs(st)) * 10 ** (-1 / 20)

out = os.path.join(ROOT, "public", "audio", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
print("wrote", out, f"{DUR:.2f}s")
