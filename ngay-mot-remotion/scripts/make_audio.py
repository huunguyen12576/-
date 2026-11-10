"""
Procedural soundtrack + SFX for "NGÀY MỘT".

Everything is synthesised from scratch with numpy (no samples, no third-party audio),
so the result is 100% original and free for commercial use.

Every cue is frame-locked to the Remotion timeline (src/timeline.json, 30 fps).
Run:  python3 scripts/make_audio.py   ->  public/audio/soundtrack.wav
"""
import json, os, wave
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
TL = json.load(open(os.path.join(ROOT, 'src', 'timeline.json')))
FPS = TL['fps']
SR = 48000
DUR = TL['duration'] / FPS + 0.2
N = int(SR * DUR)
rng = np.random.default_rng(1234)
SC = {k: v[0] for k, v in TL['scenes'].items()}

music = np.zeros((2, N))
sfx = np.zeros((2, N))


def sec(scene, frame):
    return (SC[scene] + frame) / FPS


def hz(note):
    """'A4' style -> Hz"""
    names = {'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5, 'F': -4, 'F#': -3, 'Gb': -3,
             'G': -2, 'G#': -1, 'Ab': -1, 'A': 0, 'A#': 1, 'Bb': 1, 'B': 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)


def add(buf, t0, sig, gain=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    if sig.ndim == 1:
        l = np.sqrt(0.5 * (1 - pan)); r = np.sqrt(0.5 * (1 + pan))
        sig = np.vstack([sig * l, sig * r]) * np.sqrt(2)
    if i0 < 0:
        sig = sig[:, -i0:]; i0 = 0
    n = min(sig.shape[1], N - i0)
    buf[:, i0:i0 + n] += sig[:, :n] * gain


def env(n, a, d, sustain=1.0, release=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if release is None:
        e = e * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    else:
        rel_start = n / SR - release
        e = e * np.where(t < rel_start, 1, np.maximum(0, 1 - (t - rel_start) / release)) * sustain
    return e


def bandnoise(n, lo, hi, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    x = r.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # soft edges
    m = np.convolve(m, np.hanning(41) / np.hanning(41).sum(), mode='same')
    y = np.fft.irfft(X * m, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


# ------------------------------------------------------------------ instruments
def pad(freqs, dur, gain=0.12, attack=1.2, release=1.6, bright=6, detune=0.004):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for fr in freqs:
        for ch, dt in ((0, -detune), (1, detune)):
            for k in range(1, bright + 1):
                ph = rng.random() * 6.28
                amp = 1 / k ** 1.6
                out[ch] += amp * np.sin(2 * np.pi * fr * k * (1 + dt * (1 + 0.3 * k)) * t + ph + 0.4 * np.sin(2 * np.pi * 0.17 * t))
    e = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, (dur - t) / release))
    swell = 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t)
    return out * e * swell * gain / max(1, len(freqs))


def piano(f0, dur=3.0, gain=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    B = 0.0004
    for k in range(1, 12):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        dec = 2.6 / (1 + 0.45 * k) * (440 / max(f0, 110)) ** 0.3
        y += (1 / k ** 1.25) * np.sin(2 * np.pi * fk * t) * np.exp(-t / dec)
    hammer = bandnoise(n, 800, 5000) * np.exp(-t / 0.012) * 0.15
    y = (y + hammer) * np.minimum(1, t / 0.004)
    return y * gain


def bell(f0, dur=2.5, gain=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, d in ((1, 1, 1.4), (2.0, 0.35, 0.9), (2.76, 0.5, 0.7), (5.4, 0.25, 0.35), (8.93, 0.12, 0.2)):
        if f0 * r > SR / 2.4:
            continue
        y += a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d)
    return y * np.minimum(1, t / 0.002) * gain


def marimba(f0, dur=1.2, gain=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.45) + 0.35 * np.sin(2 * np.pi * f0 * 4 * t) * np.exp(-t / 0.06)
    if f0 * 10 < SR / 2.4:
        y += 0.2 * np.sin(2 * np.pi * f0 * 10 * t) * np.exp(-t / 0.015)
    return y * np.minimum(1, t / 0.002) * gain


def sub_boom(dur=2.2, f_hi=70, f_lo=28, gain=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.7)
    click = bandnoise(n, 60, 2500) * np.exp(-t / 0.03) * 0.6
    rumble = lowpass(rng.standard_normal(n), 180) * np.exp(-t / 0.6)
    rumble /= np.max(np.abs(rumble)) + 1e-9
    return (y + click + rumble * 0.5) * gain


def whoosh(dur=0.7, lo=300, hi=4000, gain=0.35, rev=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    # sweep via 6 overlapping bands
    for i in range(6):
        c = lo * (hi / lo) ** (i / 5)
        band = bandnoise(n, c * 0.7, c * 1.4)
        centre = i / 5 if not rev else 1 - i / 5
        w = np.exp(-((t / dur - centre * 0.8 - 0.1) ** 2) / 0.02)
        y += band * w
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return y * e * gain / 3


def thump(gain=0.6, f_hi=140, f_lo=55, dec=0.12):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    y += bandnoise(n, 200, 3000) * np.exp(-t / 0.01) * 0.4
    return y * gain


def clang(gain=0.45):
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, d in ((523, 1, 0.9), (1187, 0.6, 0.6), (1773, 0.5, 0.45), (2491, 0.35, 0.3), (3340, 0.25, 0.2), (4610, 0.2, 0.12)):
        y += a * np.sin(2 * np.pi * r * t + rng.random()) * np.exp(-t / d)
    y += bandnoise(n, 1500, 8000) * np.exp(-t / 0.02) * 0.6
    return y * gain / 2


def step(gain=0.16, bright=1.0):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 120, 1800 * bright) * np.exp(-t / 0.035) + np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.03) * 0.6
    return y * gain


def breath(dur=0.9, gain=0.08, inhale=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 500, 3200)
    e = np.sin(np.pi * t / dur) ** (1.5 if inhale else 0.8)
    return y * e * gain


def heartbeat(gain=0.8):
    a = thump(gain, 90, 40, 0.09)
    b = thump(gain * 0.7, 80, 38, 0.11)
    out = np.zeros(int(0.6 * SR))
    out[:len(a)] += a
    o = int(0.17 * SR)
    out[o:o + len(b)] += b[:len(out) - o]
    return lowpass(out, 300)


def shimmer(base, gain=0.12, n_notes=6, spacing=0.05):
    out = np.zeros(int((n_notes * spacing + 2.5) * SR))
    for i in range(n_notes):
        b = bell(base * 2 ** ([0, 4, 7, 12, 16, 19, 24, 28][i % 8] / 12), 2.2, gain)
        o = int(i * spacing * SR)
        out[o:o + len(b)] += b
    return out


def water_pour(dur, gain=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 400, 6000)
    gurgle = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + 3 * np.sin(2 * np.pi * 0.8 * t)) * t)
    bub = np.zeros(n)
    for k in range(int(dur * 18)):
        o = int(rng.random() * (n - SR // 10))
        f0 = 500 + rng.random() * 900
        m = int(0.05 * SR)
        tt = np.arange(m) / SR
        bub[o:o + m] += np.sin(2 * np.pi * (f0 + 3000 * tt) * tt) * np.exp(-tt / 0.015) * 0.5
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    return (y * gurgle * 0.6 + bub) * e * gain


def splash(gain=0.4):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 300, 7000) * np.exp(-t / 0.25)
    y += lowpass(rng.standard_normal(n), 250) * np.exp(-t / 0.2) * 0.3
    return y * gain


def tick(gain=0.12, f0=2200):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.006) + bandnoise(n, 3000, 9000) * np.exp(-t / 0.003) * 0.5) * gain


def riser(dur, gain=0.2, lo=200, hi=6000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i in range(8):
        c = lo * (hi / lo) ** (i / 7)
        w = np.clip((t / dur) * 8 - i + 1, 0, 1) * (1 - np.clip((t / dur) * 8 - i - 1.5, 0, 1) * 0.6)
        y += bandnoise(n, c * 0.8, c * 1.25) * w
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (2.5 * t / dur)) / SR) * 0.3
    return (y / 4 + tone) * (t / dur) ** 2 * gain


def wind(dur, gain=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 150, 900)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
    e = np.minimum(1, t / 1.0) * np.minimum(1, (dur - t) / 1.0)
    return y * mod * e * gain


def swipe(gain=0.25):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    y = bandnoise(n, 1500, 9000) * np.sin(np.pi * t / 0.35) ** 3
    return y * gain


C = lambda *ns: [hz(n) for n in ns]

# ================================================================== MUSIC
# Pillar scene: dark drone, then a fragile piano theme (A minor)
add(music, 0.0, pad(C('A1', 'E2'), 5.6, gain=0.22, attack=0.05, release=2.5, bright=4))
chords1 = [(sec('pillar', 88), C('A2', 'E3', 'C4', 'B4'), 2.4),
           (sec('pillar', 160), C('F2', 'C3', 'A3', 'E4'), 2.4),
           (sec('pillar', 232), C('C3', 'G3', 'E4', 'D5'), 2.1),
           (sec('pillar', 292), C('G2', 'D3', 'B3', 'E4'), 2.2)]
for t0, ch, d in chords1:
    add(music, t0, pad(ch, d + 1.6, gain=0.16, attack=0.7, release=1.4))
theme = [('E5', 92), ('C5', 104), ('B4', 116), ('A4', 130)]
for n_, fr in theme:
    add(music, sec('pillar', fr), piano(hz(n_), 3, 0.18), pan=-0.1)

# Field scene: hopeful pulse that keeps trying; drops away when he quits
field_chords = [(0, C('A2', 'E3', 'C4', 'E4')), (64, C('F2', 'C3', 'A3', 'C4')), (128, C('C3', 'G3', 'E4', 'G4')), (192, C('G2', 'D3', 'B3', 'D4')), (256, C('A2', 'E3', 'C4', 'E4'))]
for fr, ch in field_chords:
    add(music, sec('field', fr), pad(ch, 2.9, gain=0.14, attack=0.4, release=1.0))
# rising bass pulse in 8ths through the montage
for k in range(0, 36):
    fr = 132 + k * 2.8
    if fr > 230:
        break
    add(music, sec('field', fr), piano(hz('A1') * (1 if k % 4 < 2 else 1.335), 0.6, 0.12))
# he walks away: everything drains into a cold, low drone
add(music, sec('field', 300), pad(C('D2', 'A2', 'F3'), 5.2, gain=0.15, attack=1.5, release=2.0, bright=3))
add(music, sec('field', 364), sub_boom(3.0, 55, 26, 0.55))
add(music, sec('field', 364), piano(hz('D3'), 3.5, 0.2))
add(music, sec('field', 364), piano(hz('F3'), 3.5, 0.15))

# Mountain: tense low pad, then an emotional swell resolving to C major
add(music, sec('mountain', 0), pad(C('A1', 'E2', 'C3'), 4.4, gain=0.2, attack=1.0, release=1.2, bright=3))
add(music, sec('mountain', 100), pad(C('F2', 'C3', 'A3', 'E4'), 2.2, gain=0.18, attack=0.8, release=0.8))
add(music, sec('mountain', 150), pad(C('G2', 'D3', 'B3', 'D4'), 1.9, gain=0.2, attack=0.6, release=0.6))
add(music, sec('mountain', 200), pad(C('C2', 'G2', 'E3', 'C4', 'G4', 'E5'), 3.6, gain=0.26, attack=0.08, release=2.0, bright=7))
add(music, sec('mountain', 104), riser(3.25, 0.16))
for i, n_ in enumerate(['E5', 'G5', 'C6', 'E6']):
    add(music, sec('mountain', 200) + i * 0.09, bell(hz(n_), 3.0, 0.07), pan=-0.4 + i * 0.25)
for n_, fr in [('C4', 200), ('G4', 200), ('E5', 214), ('D5', 232), ('C5', 248)]:
    add(music, sec('mountain', fr), piano(hz(n_), 3, 0.17))

# Bucket: warm piano ostinato that accelerates with the time-lapse, cadence on day 365
add(music, sec('bucket', 0), pad(C('C3', 'G3', 'E4'), 3.6, gain=0.12, attack=0.8))
add(music, sec('bucket', 100), pad(C('A2', 'E3', 'C4'), 3.4, gain=0.12, attack=0.4))
ost = ['C5', 'G4', 'E5', 'G4']
fr = 10.0
k = 0
while fr < 204:
    gap = 15 if fr < 106 else max(2.6, 15 * (1 - (fr - 106) / 98) ** 1.5)
    add(music, sec('bucket', fr), piano(hz(ost[k % 4]), 1.2, 0.09 if fr < 106 else 0.07), pan=0.2 * ((k % 2) * 2 - 1))
    fr += gap
    k += 1
add(music, sec('bucket', 112), riser(3.0, 0.15, 300, 8000))
add(music, sec('bucket', 204), pad(C('C2', 'G2', 'E3', 'G3', 'C4', 'E4', 'G4'), 3.6, gain=0.26, attack=0.03, release=1.8, bright=7))
for n_ in ['C3', 'G3', 'E4', 'C5']:
    add(music, sec('bucket', 204), piano(hz(n_), 3.2, 0.14))
add(music, sec('bucket', 204), shimmer(hz('C6'), 0.06, 6, 0.06), pan=0.3)

# Outro: plagal "amen" F → C and the opening theme, now in major
add(music, sec('outro', 0), pad(C('F2', 'C3', 'A3', 'C4'), 2.6, gain=0.16, attack=0.5, release=0.9))
add(music, sec('outro', 66), pad(C('C2', 'G2', 'E3', 'G3', 'C4', 'E4'), 3.3, gain=0.22, attack=0.15, release=2.4, bright=6))
for n_, fr in [('E5', 10), ('C5', 22), ('D5', 34), ('E5', 70), ('G5', 70), ('C6', 104)]:
    add(music, sec('outro', fr), piano(hz(n_), 3.4, 0.16))

# ================================================================== SFX
# --- pillar
add(sfx, sec('pillar', 0), whoosh(0.25, 80, 600, 0.4, rev=True))
add(sfx, sec('pillar', 6), sub_boom(2.4, 75, 26, 0.95))
add(sfx, sec('pillar', 6), bandnoise(int(0.6 * SR), 600, 5000) * np.exp(-np.arange(int(0.6 * SR)) / SR / 0.08) * 0.35)
for i in range(12):
    add(sfx, sec('pillar', 12) + rng.random() * 0.8, tick(0.05 + 0.04 * rng.random(), 1500 + 2500 * rng.random()), pan=rng.uniform(-0.6, 0.6))
add(sfx, sec('pillar', 22), whoosh(1.5, 200, 2500, 0.22))
add(sfx, sec('pillar', 68), shimmer(hz('E6'), 0.07, 5, 0.04), pan=0.4)
add(sfx, sec('pillar', 88), whoosh(0.6, 400, 5000, 0.14))
add(sfx, sec('pillar', 108), step(0.12))
add(sfx, sec('pillar', 112), whoosh(0.35, 500, 3000, 0.08))
add(sfx, sec('pillar', 133), step(0.2))
add(sfx, sec('pillar', 183), whoosh(0.8, 300, 6000, 0.2))
add(sfx, sec('pillar', 186), shimmer(hz('A5'), 0.06, 4, 0.05), pan=-0.3)
# stair blocks: each one lands with a stone thunk tuned to its height (pentatonic)
penta = [0, 2, 4, 7, 9]
def stair_note(i):
    deg = penta[i % 5] + 12 * (i // 5)
    return hz('A3') * 2 ** (deg / 12)
for i in range(14, -1, -1):
    t0 = sec('pillar', 158 + (14 - i) * 4.2 + 5)
    add(sfx, t0, thump(0.22, 160, 60, 0.07), pan=(i / 15 - 0.5) * 0.8)
    add(sfx, t0, marimba(stair_note(i), 1.0, 0.1), pan=(i / 15 - 0.5) * 0.8)
for k in range(5):  # back-pedal steps
    add(sfx, sec('pillar', 168 + k * 7), step(0.07))
for k in range(2):
    add(sfx, sec('pillar', 236 + k * 7.5), step(0.09))
# climbing plays the staircase scale upwards
for k in range(7):
    t0 = sec('pillar', 250 + k * 13 + 8)
    if t0 > sec('pillar', 330):
        break
    add(sfx, t0, step(0.1))
    add(sfx, t0, marimba(stair_note(k), 1.2, 0.16))
add(sfx, sec('pillar', 316), whoosh(0.7, 200, 3000, 0.2))

# --- field
add(sfx, sec('field', 0), wind(14, 0.035))
from_kicks = [40, 96, 142, 158, 172, 185, 197, 208, 218]
for i, K in enumerate(from_kicks):
    for s_ in (K - 16, K - 11, K - 6):
        add(sfx, sec('field', s_), step(0.06))
    add(sfx, sec('field', K), thump(0.5, 220, 70, 0.08), pan=-0.3)
    add(sfx, sec('field', K), whoosh(0.5, 600, 5000, 0.12), pan=0.2)
    if i == 0:
        add(sfx, sec('field', K + 15), clang(0.55), pan=0.5)
        add(sfx, sec('field', K + 33), thump(0.18, 180, 90, 0.05), pan=0.3)
        add(sfx, sec('field', K + 42), thump(0.08, 180, 90, 0.04), pan=0.3)
    elif i in (1, 5):
        add(sfx, sec('field', K + 2), whoosh(0.9, 400, 6000, 0.12), pan=0.7)
    else:
        if i % 2 == 0:
            add(sfx, sec('field', K + 12), clang(0.3), pan=0.5)
        add(sfx, sec('field', K + 28), thump(0.1, 180, 90, 0.04), pan=0.4)
for k in range(6):  # heavy breathing
    t0 = sec('field', 236 + k * 11)
    add(sfx, t0, breath(0.32, 0.05, True))
    add(sfx, t0 + 0.2, breath(0.3, 0.045, False))
add(sfx, sec('field', 302), marimba(hz('E5'), 0.5, 0.08) + 0)
add(sfx, sec('field', 304), marimba(hz('A5'), 0.5, 0.06))
add(sfx, sec('field', 336), whoosh(0.3, 300, 2000, 0.06))
k = 0
while 344 + k * 8.5 < 410:
    add(sfx, sec('field', 344 + k * 8.5), step(0.07 * (1 - k / 10)), pan=-0.3 - k * 0.05)
    k += 1
add(sfx, sec('field', 360), whoosh(0.6, 80, 800, 0.3, rev=True))
add(sfx, sec('field', 410), whoosh(0.6, 200, 3000, 0.15))

# --- mountain
add(sfx, sec('mountain', 0), wind(9.2, 0.07))
for fr in (8, 39, 71, 102):
    add(sfx, sec('mountain', fr), heartbeat(0.55 if fr < 90 else 0.3))
for k in range(4):
    add(sfx, sec('mountain', 14 + k * 12), breath(0.35, 0.04, k % 2 == 0))
add(sfx, sec('mountain', 70), step(0.08))
add(sfx, sec('mountain', 102), whoosh(3.2, 120, 2500, 0.22))
# the trail lights up: a twinkling ascending run
for k in range(24):
    t0 = sec('mountain', 126 + 88 * (k / 24) ** 0.9)
    deg = penta[k % 5] + 12 * (k // 5)
    add(sfx, t0, bell(hz('C5') * 2 ** (deg / 24), 1.2, 0.022), pan=0.6 - k * 0.04)
add(sfx, sec('mountain', 256), whoosh(0.6, 200, 3000, 0.15))

# --- bucket
for k in range(7):
    add(sfx, sec('bucket', 2 + k * 7.5), step(0.08), pan=-0.4 + k * 0.08)
add(sfx, sec('bucket', 54), whoosh(0.3, 400, 2000, 0.05))
add(sfx, sec('bucket', 60), water_pour(0.95, 0.2), pan=0.3)
add(sfx, sec('bucket', 64), splash(0.08), pan=0.3)


def day_at(f):
    if f < 106:
        return 1
    u = min(1, max(0, (f - 106) / 98))
    u = u * u * (1.6 - 0.6 * u)
    return min(365, round(1 + 364 * u))


last_t = -1
prev = 1
for f in np.arange(106, 205, 0.25):
    d = day_at(f)
    if d != prev:
        t0 = sec('bucket', f)
        if t0 - last_t > 0.045:
            add(sfx, t0, tick(0.06, 2400 + 1200 * (d / 365)), pan=0.1)
            last_t = t0
        prev = d
# time-lapse pours: water bursts
for fr in np.arange(112, 204, 9):
    add(sfx, sec('bucket', fr), water_pour(0.25, 0.06), pan=0.35)
add(sfx, sec('bucket', 202), whoosh(0.4, 300, 6000, 0.15))
add(sfx, sec('bucket', 204), sub_boom(2.0, 90, 35, 0.5))
add(sfx, sec('bucket', 204), splash(0.25), pan=0.3)
add(sfx, sec('bucket', 230), shimmer(hz('G5'), 0.04, 4, 0.05), pan=-0.2)
add(sfx, sec('bucket', 258), whoosh(0.6, 200, 3000, 0.15))

# --- outro
for k in range(4):
    add(sfx, sec('outro', 10 + k * 7), step(0.06))
add(sfx, sec('outro', 44), swipe(0.12), pan=0.2)
add(sfx, sec('outro', 76), step(0.12))
add(sfx, sec('outro', 76), marimba(hz('A4'), 1.4, 0.18))
add(sfx, sec('outro', 70), whoosh(0.7, 300, 5000, 0.12))
add(sfx, sec('outro', 102), shimmer(hz('C6'), 0.05, 6, 0.05), pan=0.35)

# ================================================================== MIX
def reverb(x, seconds=2.6, mix=0.25, seed=5):
    n_ir = int(seconds * SR)
    t = np.arange(n_ir) / SR
    r = np.random.default_rng(seed)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = r.standard_normal(n_ir) * np.exp(-t / (seconds / 6.9))
        ir = lowpass(ir, 6000)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        ir /= np.sqrt(np.sum(ir ** 2))
        L = len(x[ch]) + n_ir
        nfft = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[ch], nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x[ch])]
        out[ch] = y
    return x * (1 - mix) + out * mix * 1.6


music = reverb(music, 3.2, 0.35, 5)
sfx = reverb(sfx, 1.6, 0.18, 9)
mix = music * 0.9 + sfx * 1.0
# gentle bus compression + soft clip
peak = np.max(np.abs(mix))
mix = mix / peak * 1.25
mix = np.tanh(mix) / np.tanh(1.25)
mix *= 10 ** (-1.0 / 20)
# fades
fade = int(0.02 * SR)
mix[:, :fade] *= np.linspace(0, 1, fade)
tail = int(0.6 * SR)
mix[:, -tail:] *= np.linspace(1, 0, tail)

out = os.path.join(ROOT, 'public', 'audio', 'soundtrack.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{DUR:.2f}s')
