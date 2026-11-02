"""
Original score + sound design for "Spec Kit" film.
Everything here is synthesized from scratch (oscillators, filtered noise),
so the music and SFX are original works with no third-party samples.

Usage: python scripts/audio.py <project_dir>
Outputs (public/audio/): music.wav, sfx.wav, vo.wav, mix.wav
"""
import json, sys, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
TL = json.load(open(os.path.join(ROOT, "src/timeline.json"), encoding="utf-8"))
DUR = TL["duration"]
N = int(DUR * SR)
rng = np.random.default_rng(7)
cue = {c["id"]: c for c in TL["cues"]}


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s, dtype=float)
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    dd = min(d, max(n - a, 0)); e[a:a + dd] = np.linspace(1, s, dd, endpoint=False)
    if r and n > r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def place(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    if sig.ndim == 1 and buf.ndim == 2:
        sig = np.stack([sig, sig], 1)
    buf[i:j] += sig[: j - i] * gain


def pan(sig, p):  # p in [-1, 1]
    l = np.cos((p + 1) * np.pi / 4); r = np.sin((p + 1) * np.pi / 4)
    return np.stack([sig * l, sig * r], 1)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def reverb_ir(seconds=2.6, damp=3000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t * 3.2)[:, None]
    ir[:, 0] = lp(ir[:, 0], damp); ir[:, 1] = lp(ir[:, 1], damp)
    return ir / np.abs(ir).sum(0).max() * 6


IR = reverb_ir()


def verb(x, wet=0.3):
    out = np.zeros_like(x)
    for c in range(2):
        out[:, c] = fftconvolve(x[:, c], IR[:, c])[: len(x)]
    return x * (1 - wet) + out * wet


# ---------------------------------------------------------------- instruments
def pad(freqs, d, a=1.2, r=1.5, bright=1800, detune=0.004):
    t = t_arr(d); x = np.zeros_like(t)
    for f in freqs:
        for k in (-1, 0, 1):
            ff = f * (1 + k * detune)
            ph = rng.uniform(0, 2 * np.pi)
            # soft saw from a few harmonics
            for h in range(1, 7):
                x += np.sin(2 * np.pi * ff * h * t + ph * h) / (h ** 1.3)
    x = lp(x, bright) / (len(freqs) * 9)
    return x * env_adsr(len(t), a, 0.5, 0.9, r)


def pluck(f, d=0.9, bright=4200):
    t = t_arr(d)
    x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t))
    x *= np.exp(-t * 5.5)
    return lp(x, bright) * 0.5


def piano(f, d=3.0):
    t = t_arr(d)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * (1.2 + h * 0.9)) / h for h in range(1, 7))
    att = np.minimum(1, t / 0.004)
    return x * att * 0.45


def bell(f, d=4.0):
    t = t_arr(d)
    ratios = [(1, 1.0, 1.1), (2.76, 0.5, 2.2), (5.4, 0.25, 3.4), (8.93, 0.12, 5)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dcy) for r, a, dcy in ratios)
    return x * np.minimum(1, t / 0.002) * 0.35


def kick(d=0.5, f0=110, f1=42):
    t = t_arr(d)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * 0.9


def noise(d):
    return rng.standard_normal(int(d * SR))


def hat(d=0.06):
    return hp(noise(d), 7000) * np.exp(-t_arr(d) * 60) * 0.25


def clap(d=0.25):
    x = bp(noise(d), 900, 3500)
    t = t_arr(d)
    e = np.exp(-t * 22) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 30) * (t > 0.012)
    return x * e * 0.35


def boom(d=3.0):
    t = t_arr(d)
    f = 30 + 55 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    n = lp(noise(d), 600) * np.exp(-t * 4) * 0.6
    return (s + n) * 0.9


def whoosh(d=0.8, up=True):
    t = t_arr(d)
    x = noise(d)
    e = np.sin(np.pi * t / d) ** 2
    fc = np.linspace(400, 5000, len(t)) if up else np.linspace(5000, 400, len(t))
    # time-varying lowpass via blocks
    out = np.zeros_like(x)
    blk = 1024
    for i in range(0, len(x), blk):
        out[i:i + blk] = lp(x[max(0, i - 2048):i + blk], fc[i])[-len(x[i:i + blk]):]
    return out * e * 0.35


def riser(d=3.0):
    t = t_arr(d)
    x = noise(d)
    out = np.zeros_like(x); blk = 2048
    fc = 300 * (40 ** (t / d))
    for i in range(0, len(x), blk):
        out[i:i + blk] = bp(x[max(0, i - 4096):i + blk], max(100, fc[i] * 0.6), min(18000, fc[i] * 1.6))[-len(x[i:i + blk]):]
    tone = np.sin(2 * np.pi * np.cumsum(220 * (2 ** (2 * t / d))) / SR) * 0.15
    return (out * 0.5 + tone) * (t / d) ** 2


def click(f=2500, d=0.03):
    t = t_arr(d)
    return (bp(noise(d), f * 0.6, f * 1.6) * np.exp(-t * 180) * 0.5)


def ui_pop(f=880, d=0.25):
    t = t_arr(d)
    fr = f * (1 + 0.5 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 18) * 0.35


def glitch(d=0.25):
    t = t_arr(d)
    sq = np.sign(np.sin(2 * np.pi * rng.uniform(80, 900) * t))
    x = sq * (rng.random(len(t)) > 0.4)
    x = np.round(x * 4) / 4
    return lp(x, 6000) * np.exp(-t * 6) * 0.18


def error_beep(f, d=0.18):
    t = t_arr(d)
    return np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 14) * 0.08


# ---------------------------------------------------------------- MUSIC
music = np.zeros((N, 2))
sc = TL["scenes"]

# A. Tension 0 -> 7.4 : drone + heartbeat pulse + rising string cluster
d = 7.6
t = t_arr(d)
drone = sum(np.sin(2 * np.pi * f * t) for f in (55, 55.4, 110.2)) / 3
drone = lp(drone + 0.3 * np.sign(np.sin(2 * np.pi * 55 * t)) * 0.2, 400)
drone *= np.minimum(1, t / 1.0) * (0.5 + 0.5 * t / d)
place(music, pan(drone, 0) * 0.45, 0)
cluster = pad([midi(m) for m in (57, 58, 64, 65)], d, a=5.5, r=0.2, bright=2400, detune=0.008)
place(music, pan(cluster, 0) * (0.25 + 0.0), 0)
for i, tb in enumerate(np.arange(0.4, 7.3, 0.6)):  # heartbeat pulse, accelerating slightly
    g = 0.25 + 0.5 * tb / 7.4
    place(music, pan(kick(0.4, 80, 38), 0) * g, tb)
    place(music, pan(kick(0.3, 70, 36), 0) * g * 0.55, tb + 0.18)
place(music, pan(riser(3.4), 0) * 0.55, 4.0)

# B. Impact at "vỡ vụn"
place(music, pan(boom(3.5), 0) * 1.1, cue["c5"]["t0"] - 0.03)
d = 3.2
low = pad([midi(m) for m in (33, 40, 45)], d, a=0.05, r=1.6, bright=500)
place(music, pan(low, 0) * 0.6, cue["c5"]["t0"])

# C. Revelation 11.2 -> 15.2 : silence, then Cmaj9 swell, bell at "Spec Kit"
d = 5.0
swell = pad([midi(m) for m in (48, 55, 59, 62, 64)], d, a=2.2, r=1.2, bright=2600)
place(music, pan(swell, 0) * 0.55, 11.2)
for k, m in enumerate((72, 76, 79, 83)):
    place(music, pan(bell(midi(m), 4), -0.4 + k * 0.27) * 0.35, cue["c8"]["t0"] - 0.05 + k * 0.07)

# D. Groove 15.2 -> 48.3 (96 BPM), E. Bright 48.3 -> 63.2
BPM = 96.0; beat = 60 / BPM; bar = 4 * beat
prog_D = [(45, [57, 60, 64, 67]), (41, [57, 60, 64, 65]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]  # Am7 Fmaj7 C G
prog_E = [(48, [60, 64, 67, 71]), (43, [59, 62, 67, 69]), (45, [60, 64, 69, 72]), (41, [60, 65, 69, 72])]  # Cmaj7 G Am F
start = sc["idea"][0]
end_groove = sc["stats"][0]
tb = start; ci = 0
while tb < end_groove - 0.01:
    bright_sec = tb >= sc["results"][0]
    prog = prog_E if bright_sec else prog_D
    root, chord = prog[ci % 4]
    dur = min(2 * bar, end_groove - tb)
    level = 0.33 if tb < sc["steps"][0] else 0.4
    place(music, pan(pad([midi(m) for m in chord], dur + 1.2, a=0.6, r=1.2, bright=2000 if not bright_sec else 3200), 0) * level, tb)
    bass_t = t_arr(dur)
    bass = lp(np.sin(2 * np.pi * midi(root - 12) * bass_t) + 0.3 * np.sin(4 * np.pi * midi(root - 12) * bass_t), 300)
    bass *= env_adsr(len(bass_t), 0.05, 0.3, 0.8, 0.3)
    place(music, pan(bass, 0) * 0.45, tb)
    # arpeggio in 8ths
    arp = chord + [chord[1] + 12, chord[2] + 12]
    for s in range(int(dur / (beat / 2))):
        ts = tb + s * beat / 2
        if ts > sc["steps"][0] - 0.01 or bright_sec:
            note = arp[(s * 3) % len(arp)] + (12 if bright_sec else 0)
            place(music, pan(pluck(midi(note)), 0.35 * np.sin(s)) * (0.16 if not bright_sec else 0.18), ts)
    # drums
    for b in range(int(dur / beat)):
        tt = tb + b * beat
        if tt >= sc["steps"][0] - 0.01:
            if b % 2 == 0:
                place(music, pan(kick(), 0) * 0.42, tt)
            place(music, pan(hat(), 0.3) * 0.5, tt + beat / 2)
            if tt >= sc["commands"][0] and b % 2 == 1:
                place(music, pan(clap(), 0) * 0.35, tt)
    tb += 2 * bar; ci += 1

# F. Riser into stats, hit at "145 nghìn sao"
hit_t = cue["c38"]["t0"]
place(music, pan(riser(hit_t - sc["stats"][0] + 0.1), 0) * 0.6, sc["stats"][0] - 0.1)
place(music, pan(pad([midi(m) for m in (52, 59, 64, 67)], hit_t - sc["stats"][0] + 0.3, a=2.0, r=0.3, bright=2400), 0) * 0.35, sc["stats"][0])
place(music, pan(boom(2.5), 0) * 0.55, hit_t - 0.02)
place(music, pan(kick(0.6), 0) * 0.6, hit_t - 0.02)
stat_pad = pad([midi(m) for m in (48, 55, 60, 64, 67, 72)], sc["insight"][0] - hit_t + 1.0, a=0.05, r=1.0, bright=3500)
place(music, pan(stat_pad, 0) * 0.45, hit_t)
for k, m in enumerate((84, 88, 91)):
    place(music, pan(bell(midi(m), 3), -0.3 + k * 0.3) * 0.25, hit_t + k * 0.06)

# G. Insight 69.7 -> 74.9 : stripped piano + soft pad (Fmaj7 -> Em7 -> Dm7 -> Csus2)
ins0 = sc["insight"][0]
place(music, pan(pad([midi(m) for m in (41, 53, 57, 64)], 6.2, a=1.5, r=2.0, bright=1400), 0) * 0.35, ins0)
pn = [(0.0, 65), (0.0, 57), (0.6, 69), (1.2, 72), (2.6, 64), (2.6, 55), (3.2, 67), (3.8, 71), (4.6, 62), (4.6, 53), (5.0, 69), (5.4, 72)]
for dt, m in pn:
    place(music, pan(piano(midi(m), 3.5), -0.2 + (m % 5) * 0.1) * 0.4, ins0 + 0.2 + dt)

# H. CTA resolve 74.9 -> 80 : Cadd9 + bell
c0 = sc["cta"][0]
place(music, pan(pad([midi(m) for m in (36, 48, 55, 62, 64, 67)], 5.0, a=0.4, r=2.6, bright=2600), 0) * 0.5, c0)
for k, m in enumerate((60, 67, 74, 76)):
    place(music, pan(piano(midi(m), 4.5), -0.3 + k * 0.2) * 0.45, c0 + 0.05 + k * 0.11)
place(music, pan(bell(midi(84), 4.5), 0.2) * 0.25, c0 + 0.5)

music = verb(music, 0.28)
# global fade
fade = np.ones(N); fl = int(2.2 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
music *= fade[:, None]

# ---------------------------------------------------------------- SFX
sfx = np.zeros((N, 2))
# typing the vague prompt (hook): chars appear 0.35 -> 2.25
n_chars = 46
for i in range(n_chars):
    tt = 0.35 + i * (1.9 / n_chars) + rng.uniform(-0.01, 0.01)
    place(sfx, pan(click(rng.uniform(1800, 3200)), rng.uniform(-0.3, 0.3)) * 0.5, tt)
# enter
place(sfx, pan(kick(0.25, 160, 80), 0) * 0.4, 2.55)
place(sfx, pan(click(1200, 0.05), 0) * 0.8, 2.55)
place(sfx, pan(whoosh(0.9), 0) * 0.6, 2.6)
# errors pinging during collapse
for k, tt in enumerate(np.arange(5.0, 7.3, 0.19)):
    place(sfx, pan(error_beep(rng.choice([440, 466, 523, 392])), rng.uniform(-0.7, 0.7)) * (0.5 + k * 0.05), tt)
# debris after impact
for tt in np.sort(rng.uniform(7.45, 9.2, 40)):
    place(sfx, pan(click(rng.uniform(300, 1500), 0.05), rng.uniform(-0.8, 0.8)) * rng.uniform(0.2, 0.6), tt)
# vibe coding glitches
for tt in np.arange(8.85, 10.4, 0.23):
    place(sfx, pan(glitch(rng.uniform(0.08, 0.2)), rng.uniform(-0.5, 0.5)) * 0.9, tt + rng.uniform(0, 0.08))
# transitions
for tt, up in [(sc["idea"][0] - 0.45, True), (sc["steps"][0] - 0.4, True), (sc["commands"][0] - 0.4, True),
               (sc["results"][0] - 0.4, False), (sc["agents"][0] - 0.4, True), (sc["insight"][0] - 0.5, False),
               (sc["cta"][0] - 0.4, True)]:
    place(sfx, pan(whoosh(0.8, up), 0) * 0.55, tt)
# spec lines drawing (idea)
for k, tt in enumerate(np.arange(17.4, 21.5, 0.42)):
    place(sfx, pan(click(4200, 0.02), 0.2) * 0.35, tt)
# steps chimes
for k, cid in enumerate(["c13", "c14", "c15", "c17"]):
    place(sfx, pan(ui_pop(midi(72 + [0, 4, 7, 12][k])), 0) * 0.55, cue[cid]["t0"] - 0.05)
# unlock
place(sfx, pan(click(900, 0.06), 0) * 0.9, cue["c17"]["t0"] - 0.1)
place(sfx, pan(click(2400, 0.04), 0) * 0.9, cue["c17"]["t0"] - 0.04)
# command cards
for k, cid in enumerate(["c19", "c21", "c23", "c25", "c27", "c29"]):
    place(sfx, pan(ui_pop(midi(67 + [0, 2, 4, 7, 9, 12][k]), 0.3), 0) * 0.6, cue[cid]["t0"] - 0.08)
    place(sfx, pan(whoosh(0.4), 0) * 0.25, cue[cid]["t0"] - 0.25)
# results
for cid in ["c32", "c33", "c34"]:
    place(sfx, pan(whoosh(0.5, False), 0) * 0.35, cue[cid]["t0"] - 0.2)
    place(sfx, pan(ui_pop(midi(64), 0.3), 0) * 0.35, cue[cid]["t0"])
# agent chips
for k, tt in enumerate(np.sort(rng.uniform(60.9, 62.6, 30))):
    place(sfx, pan(ui_pop(rng.uniform(900, 1800), 0.12), rng.uniform(-0.8, 0.8)) * 0.18, tt)
for cid in ["c35a", "c35b", "c35c", "c35d", "c35e"]:
    place(sfx, pan(ui_pop(1200, 0.2), 0) * 0.4, cue[cid]["t0"])
# star counter ticks
for tt in np.arange(hit_t, hit_t + 1.3, 0.045):
    place(sfx, pan(click(5200, 0.015), 0) * 0.25, tt)
place(sfx, pan(ui_pop(1400, 0.4), 0) * 0.5, cue["c39"]["t0"])
# CTA arrow bounce
for tt in (cue["c43"]["t0"], cue["c43"]["t0"] + 0.8):
    place(sfx, pan(ui_pop(660, 0.25), 0) * 0.35, tt)
sfx = verb(sfx, 0.15)

# ---------------------------------------------------------------- VO
vo_raw, vsr = sf.read(os.path.join(ROOT, "public/audio/vo_raw.wav"))
if vo_raw.ndim > 1:
    vo_raw = vo_raw.mean(1)
if vsr != SR:
    vo_raw = resample_poly(vo_raw, SR, vsr)
# gentle cleanup: HPF, slight presence & warmth, soft compression
v = hp(vo_raw, 70)
v = v + 0.25 * bp(v, 2500, 6000) + 0.15 * lp(v, 220)
env = np.sqrt(np.abs(lp(v ** 2, 15)) + 1e-9)
thr = np.percentile(env[env > 1e-4], 70)
gain = np.where(env > thr, (thr / env) ** 0.35, 1.0)
v = v * gain
v = v / (np.abs(v).max() + 1e-9) * 0.9
vo = np.zeros((N, 2))
place(vo, np.stack([v, v], 1), TL["voOffset"])
vo_room = verb(vo, 0.08)  # very light "environment" so voice sits in the space

# ---------------------------------------------------------------- MIX
def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

vo_env = np.sqrt(np.abs(lp(vo_room.mean(1) ** 2, 6)) + 1e-12)
active = (vo_env > 0.02).astype(float)
duck = lp(active, 3) .clip(0, 1)
duck_gain = 1 - 0.55 * duck  # ~ -7 dB under voice
# emotional sections: let the score breathe a bit more
boost = np.ones(N)
for name, g in (("reveal", 1.6), ("stats", 1.5), ("insight", 2.4), ("cta", 2.4)):
    a, b = TL["scenes"][name]; boost[int(a * SR):int(b * SR)] = g
boost = lp(boost, 2)
duck_gain = duck_gain * boost
mix = vo_room * 1.0 + music * 0.32 * duck_gain[:, None] + sfx * 1.15 * (1 - 0.3 * duck)[:, None]
peak = np.abs(mix).max()
mix = mix / peak * 0.89
os.makedirs(os.path.join(ROOT, "public/audio"), exist_ok=True)
for name, x in (("music", music), ("sfx", sfx), ("vo", vo_room), ("mix", mix)):
    y = x / max(1e-9, np.abs(x).max()) * 0.89 if name != "mix" else x
    sf.write(os.path.join(ROOT, f"public/audio/{name}.wav"), y.astype(np.float32), SR, subtype="PCM_24")
print("music", rms_db(music), "sfx", rms_db(sfx), "vo", rms_db(vo_room), "mix", rms_db(mix))

if os.environ.get("AUDIO_REPORT"):
    for name, (a, b) in TL["scenes"].items():
        i, j = int(a * SR), int(b * SR)
        mv = music[i:j] * 0.32 * duck_gain[i:j, None]
        print(f"{name:9s} vo {rms_db(vo_room[i:j]):6.1f}  music {rms_db(mv):6.1f}  sfx {rms_db(sfx[i:j]*1.15):6.1f}")
