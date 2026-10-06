import sys, json, wave
import numpy as np
spec = json.load(open(sys.argv[1])); out = sys.argv[2]
SR = 44100; D = spec['duration']; N = int(SR * (D + 0.5))
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
bpm = spec.get('bpm', 120); beat = 60 / bpm
def add(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    s = sig[: N - i] * g
    L[i:i + len(s)] += s * (1 - max(pan, 0)); R[i:i + len(s)] += s * (1 + min(pan, 0))
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def kick():
    n = int(.35 * SR); x = np.arange(n) / SR
    f = 50 + 110 * np.exp(-x * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.2 * np.sin(ph) * np.exp(-x * 9))
def hat(dec=.03):
    n = int(.12 * SR); w = rng.standard_normal(n); w = np.diff(np.concatenate([[0], w]))
    return w * env(n, .001, dec) * .35
def clap():
    n = int(.25 * SR); w = rng.standard_normal(n) * env(n, .002, .07)
    for k in (1, 2): w[int(k * .011 * SR):] += rng.standard_normal(n - int(k * .011 * SR)) * env(n - int(k * .011 * SR), .001, .02) * .6
    return np.convolve(w, np.ones(6) / 6, 'same') * .55
def bass(freq, dur):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * x)) * .5 + np.sin(2 * np.pi * freq * x) * .5
    s = np.convolve(s, np.ones(24) / 24, 'same')
    return s * env(n, .005, dur * .7) * .32
def whoosh(dur=.35, up=True):
    n = int(dur * SR); w = rng.standard_normal(n); x = np.arange(n) / n
    e = np.sin(np.pi * x) ** 2
    out = np.zeros(n); y = 0
    for i in range(n):
        a = .02 + .3 * (x[i] if up else 1 - x[i]); y += a * (w[i] - y); out[i] = y
    return out * e * 1.6
def impact():
    k = kick() * 1.3; n = int(.6 * SR); w = rng.standard_normal(n) * env(n, .001, .12) * .35
    s = np.zeros(n); s[:len(k)] += k; return s + np.convolve(w, np.ones(30) / 30, 'same')
def ding(f=1318.5):
    n = int(.9 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2.01 * x) + .3 * np.sin(2 * np.pi * f * 3 * x)) * env(n, .002, .25) * .28
def riser(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 200 * (8 ** (x / dur))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .15 + rng.standard_normal(n) * .08 * (x / dur)) * (x / dur) ** 2
K, H, C = kick(), hat(), clap()
notes = spec.get('bassline', [55, 55, 65.4, 49])
nb = int(D / beat) + 1
oa = spec.get('outro', {}).get('a', D)
drop = spec.get('drop', 0)
for b in range(nb):
    t = b * beat
    if t >= D: break
    full = t >= drop
    add(K, t, .9 if full else .5)
    if full:
        add(H, t + beat / 2, .8, .3)
        add(hat(.015), t + beat / 4, .3, -.3); add(hat(.015), t + 3 * beat / 4, .3, -.3)
        if b % 2 == 1: add(C, t, .7)
        add(bass(notes[(b // 4) % len(notes)], beat * .9), t + beat / 2)
    else:
        add(H, t + beat / 2, .5)
for sh in spec['shots']:
    if sh['a'] <= 0: continue
    if sh.get('whip'): add(whoosh(.28), sh['a'] - .2, .55)
    elif sh.get('flash', .55): add(hat(.08), sh['a'], .9)
for f in spec.get('fx', []):
    if f['type'] == 'count': add(ding(), f['a'] + .05, 1); add(ding(1760), f['a'] + .6, .7)
    if f['type'] == 'stamp': add(impact(), f['a'], .6)
    if f['type'] == 'big': add(impact(), f['a'], .5)
    if f['type'] == 'confetti': add(whoosh(.5, False), f['a'], .4)
if oa < D:
    add(riser(1.0), oa - 1.0, 1); add(impact(), oa, 1)
m = np.stack([L, R], 1); m /= max(1e-9, np.abs(m).max()) / .89
m = np.tanh(m * 1.2) / np.tanh(1.2)
fade = int(.3 * SR); m[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m * 32767).astype('<i2').tobytes())
