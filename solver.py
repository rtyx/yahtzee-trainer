"""
Yahtzee optimal policy via dynamic programming.

State: (categories_mask, upper)
  - categories_mask: 13-bit int, bit i=1 means category i is already USED
  - upper: int 0..63, capped sum of upper-section scores (cats 0-5)

V[mask][upper] = expected future score playing optimally from this state.

Performance strategy:
- Enumerate 252 dice multisets once; precompute all keep subsets
- Build transition matrix K: K[keep_idx, ms_idx] = probability that keeping
  keep_idx and rerolling produces ms_idx as full outcome. Shape: (#keeps, 252).
  (Rows for all unique keep tuples across all multisets.)
- For a given value-per-outcome vector w (shape 252), the EV for each keep is
  K @ w, and the best keep per starting roll is max over applicable keeps.
- This reduces each reroll step to matrix operations.
"""

import json
import os
import sys
import time
from itertools import product
from math import factorial

import numpy as np

# ---------------------------------------------------------------------------
# Dice multisets
# ---------------------------------------------------------------------------

def all_dice_multisets():
    results = []
    for c1 in range(6):
        for c2 in range(6 - c1):
            for c3 in range(6 - c1 - c2):
                for c4 in range(6 - c1 - c2 - c3):
                    for c5 in range(6 - c1 - c2 - c3 - c4):
                        c6 = 5 - c1 - c2 - c3 - c4 - c5
                        results.append((c1, c2, c3, c4, c5, c6))
    return results


def multinomial_prob(counts, n=None):
    if n is None:
        n = sum(counts)
    if n == 0:
        return 1.0
    num = factorial(n)
    for c in counts:
        num //= factorial(c)
    return num / (6 ** n)


ALL_MULTISETS = all_dice_multisets()  # list of 252 tuples
N_MS = len(ALL_MULTISETS)            # 252
MULTISET_PROBS = np.array([multinomial_prob(c) for c in ALL_MULTISETS], dtype=np.float64)
MULTISET_INDEX = {ms: i for i, ms in enumerate(ALL_MULTISETS)}

# ---------------------------------------------------------------------------
# Keep subsets and transition matrix
# ---------------------------------------------------------------------------

# Build all unique keep tuples across all multisets
_all_keep_set = set()
for ms in ALL_MULTISETS:
    for keep in product(*(range(c + 1) for c in ms)):
        _all_keep_set.add(keep)
ALL_KEEPS_UNIQ = sorted(_all_keep_set)  # list of all unique keep tuples
KEEP_INDEX = {k: i for i, k in enumerate(ALL_KEEPS_UNIQ)}
N_KEEPS = len(ALL_KEEPS_UNIQ)

print(f"Unique keep tuples: {N_KEEPS}", flush=True)

# Precompute k-dice multisets for k=0..5
# k_multisets[k] = list of tuples summing to k
def dice_multisets_of_size(k):
    """All count tuples (c1..c6) with ci>=0, sum=k."""
    if k == 0:
        return [(0, 0, 0, 0, 0, 0)]
    results = []
    for c1 in range(k + 1):
        for c2 in range(k - c1 + 1):
            for c3 in range(k - c1 - c2 + 1):
                for c4 in range(k - c1 - c2 - c3 + 1):
                    for c5 in range(k - c1 - c2 - c3 - c4 + 1):
                        c6 = k - c1 - c2 - c3 - c4 - c5
                        results.append((c1, c2, c3, c4, c5, c6))
    return results

K_MULTISETS = {k: dice_multisets_of_size(k) for k in range(6)}

# Transition matrix T: shape (N_KEEPS, N_MS)
# T[ki, mi] = probability that keeping ALL_KEEPS_UNIQ[ki] and rolling
#             remaining dice yields ALL_MULTISETS[mi] as the full result.
T = np.zeros((N_KEEPS, N_MS), dtype=np.float64)

for ki, keep in enumerate(ALL_KEEPS_UNIQ):
    k_roll = 5 - sum(keep)
    for roll_ms in K_MULTISETS[k_roll]:
        full = tuple(keep[i] + roll_ms[i] for i in range(6))
        if full in MULTISET_INDEX:
            prob = multinomial_prob(roll_ms, k_roll)
            T[ki, MULTISET_INDEX[full]] += prob

# For each starting multiset, list of valid keep indices
VALID_KEEPS = []  # VALID_KEEPS[ms_idx] = list of keep indices valid for that ms
for ms_idx, ms in enumerate(ALL_MULTISETS):
    keeps = [KEEP_INDEX[k]
             for k in product(*(range(c + 1) for c in ms))]
    VALID_KEEPS.append(np.array(keeps, dtype=np.int32))

# ---------------------------------------------------------------------------
# Scoring tables
# ---------------------------------------------------------------------------

def score(counts, cat):
    dice_sum = sum((i + 1) * c for i, c in enumerate(counts))
    if cat < 6:
        return (cat + 1) * counts[cat]
    elif cat == 6:
        return dice_sum if max(counts) >= 3 else 0
    elif cat == 7:
        return dice_sum if max(counts) >= 4 else 0
    elif cat == 8:
        nonzero = sorted(c for c in counts if c > 0)
        return 25 if nonzero == [2, 3] else 0
    elif cat == 9:
        vals = set(i + 1 for i, c in enumerate(counts) if c > 0)
        return 30 if any({a, a + 1, a + 2, a + 3} <= vals for a in [1, 2, 3]) else 0
    elif cat == 10:
        vals = set(i + 1 for i, c in enumerate(counts) if c > 0)
        return 40 if vals in ({1, 2, 3, 4, 5}, {2, 3, 4, 5, 6}) else 0
    elif cat == 11:
        return 50 if max(counts) == 5 else 0
    elif cat == 12:
        return dice_sum
    return 0


scores_table = np.zeros((N_MS, 13), dtype=np.float64)
upper_table  = np.zeros((N_MS, 13), dtype=np.int32)

for _i, _ms in enumerate(ALL_MULTISETS):
    for _c in range(13):
        scores_table[_i, _c] = score(_ms, _c)
        if _c < 6:
            upper_table[_i, _c] = (_c + 1) * _ms[_c]

# ---------------------------------------------------------------------------
# Value table
# ---------------------------------------------------------------------------

ALL_USED = (1 << 13) - 1

V = np.zeros((1 << 13, 64), dtype=np.float64)

# Base case: all categories used
for u in range(64):
    V[ALL_USED][u] = 35.0 if u >= 63 else 0.0

# ---------------------------------------------------------------------------
# Compute one turn EV using vectorized reroll steps
# ---------------------------------------------------------------------------

def compute_turn_ev_batch(open_mask, upper_arr):
    """
    Compute V[open_mask][upper] for all 64 upper values at once.

    Returns array of shape (64,).

    The key insight: placement_val[ms_idx, u] depends on upper (u), but the
    reroll decisions for reroll1 and reroll2 need the best keep for each ms.
    We vectorize over upper.

    Steps:
      1. Compute placement_val: shape (64, N_MS)
         placement_val[u, ms] = max_c (score[ms,c] + V[open_mask|(1<<c), min(u+ua[ms,c],63)])
      2. Compute reroll1_ev: shape (64, N_MS)
         For each ms, find best keep -> weighted sum over outcomes
         reroll1_ev[u, ms] = max_{k in valid_keeps[ms]} sum_m' T[k,m'] * placement_val[u, m']
      3. Compute turn_ev: shape (64,)
         For each starting ms, best keep over reroll2, weighted by first-roll prob
    """
    n_open = bin(~open_mask & ALL_USED).count('1')  # number of open cats
    open_cats = np.array([c for c in range(13) if not (open_mask & (1 << c))], dtype=np.int32)
    if len(open_cats) == 0:
        return np.zeros(64, dtype=np.float64)

    # ---- Step 1: placement_val[u, ms] for all u in 0..63, all ms ----
    # imm[ms, ci] = scores_table[ms, open_cats[ci]]   shape: (N_MS, n_open)
    imm = scores_table[:, open_cats]  # (N_MS, n_open)
    ua  = upper_table[:, open_cats]   # (N_MS, n_open) int

    # new_upper_arr_full[u, ms, ci] = min(u + ua[ms, ci], 63)
    # We compute new_upper for each (u, ms, ci)
    # ua shape (N_MS, n_open) -> broadcast with u shape (64,)
    # new_upper[u, ms, ci] = min(u + ua[ms,ci], 63)
    # => new_upper shape (64, N_MS, n_open)
    ua_b = ua[np.newaxis, :, :]                    # (1, N_MS, n_open)
    u_b  = np.arange(64, dtype=np.int32)[:, np.newaxis, np.newaxis]  # (64,1,1)
    new_upper_full = np.minimum(u_b + ua_b, 63)   # (64, N_MS, n_open)

    # new_mask for each cat
    new_masks = np.array([open_mask | (1 << int(c)) for c in open_cats], dtype=np.int32)  # (n_open,)

    # future_val[u, ms, ci] = V[new_masks[ci], new_upper_full[u, ms, ci]]
    # We need to index V (shape 8192x64) with new_masks (n_open,) and new_upper_full (64, N_MS, n_open)
    future_val = np.empty((64, N_MS, len(open_cats)), dtype=np.float64)
    for ci, nm in enumerate(new_masks):
        future_val[:, :, ci] = V[nm, new_upper_full[:, :, ci]]  # (64, N_MS)

    # placement_val[u, ms] = max over ci of (imm[ms,ci] + future_val[u,ms,ci])
    imm_b = imm[np.newaxis, :, :]  # (1, N_MS, n_open)
    total_cat = imm_b + future_val  # (64, N_MS, n_open)
    placement_val = total_cat.max(axis=2)  # (64, N_MS)

    # ---- Step 2: reroll1_ev[u, ms] ----
    # For each ms, we pick the best keep ki from VALID_KEEPS[ms]
    # EV for keep ki = T[ki, :] @ placement_val[u, :]
    # We want max over ki in VALID_KEEPS[ms]

    # Compute T @ placement_val.T => shape (N_KEEPS, 64)
    # T: (N_KEEPS, N_MS), placement_val: (64, N_MS)
    # T @ placement_val.T = (N_KEEPS, 64)
    keep_ev = T @ placement_val.T  # (N_KEEPS, 64)

    # reroll1_ev[u, ms] = max over valid keeps for ms
    reroll1_ev = np.empty((64, N_MS), dtype=np.float64)
    for ms_idx in range(N_MS):
        vk = VALID_KEEPS[ms_idx]  # array of keep indices
        # keep_ev[vk, :] shape (len(vk), 64)
        reroll1_ev[:, ms_idx] = keep_ev[vk, :].max(axis=0)  # (64,)

    # ---- Step 3: turn_ev[u] ----
    # Same structure: T @ reroll1_ev.T => (N_KEEPS, 64)
    keep_ev2 = T @ reroll1_ev.T  # (N_KEEPS, 64)

    # For each ms, max over valid keeps
    # Weighted by first-roll probabilities
    turn_ev = np.zeros(64, dtype=np.float64)
    for ms_idx in range(N_MS):
        vk = VALID_KEEPS[ms_idx]
        best_per_u = keep_ev2[vk, :].max(axis=0)  # (64,)
        turn_ev += MULTISET_PROBS[ms_idx] * best_per_u

    return turn_ev


# ---------------------------------------------------------------------------
# Backward induction
# ---------------------------------------------------------------------------

def popcount(x):
    return bin(x).count('1')


def compute_policy():
    t_start = time.time()

    masks_by_pc = [[] for _ in range(13)]
    for mask in range(ALL_USED):
        masks_by_pc[popcount(mask)].append(mask)

    total_masks = ALL_USED  # 8191 non-terminal masks
    processed = 0

    for pc in range(12, -1, -1):
        t_pc = time.time()
        n_in_pc = len(masks_by_pc[pc])
        for mask in masks_by_pc[pc]:
            V[mask, :] = compute_turn_ev_batch(mask, np.arange(64))
            processed += 1
            if processed % 500 == 0:
                elapsed = time.time() - t_start
                rate = processed / elapsed
                eta = (total_masks - processed) / rate if rate > 0 else 0
                print(f"  [{processed}/{total_masks}] pc={pc}  "
                      f"elapsed={elapsed:.0f}s  ETA={eta:.0f}s  "
                      f"V[0][0]={V[0][0]:.2f}",
                      flush=True)

        elapsed_pc = time.time() - t_pc
        print(f"  Finished pc={pc} ({n_in_pc} masks) in {elapsed_pc:.1f}s, "
              f"total elapsed={time.time()-t_start:.1f}s", flush=True)

    print(f"Done. {processed} masks, {time.time()-t_start:.1f}s total", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Starting Yahtzee DP solver...", flush=True)
    print(f"  Dice multisets: {N_MS}", flush=True)
    print(f"  State space: {ALL_USED+1} masks x 64 = {(ALL_USED+1)*64} states", flush=True)

    # Timing benchmark
    print("Benchmarking...", flush=True)
    t0 = time.time()
    _ = compute_turn_ev_batch(ALL_USED ^ 1, np.arange(64))
    t1 = time.time()
    print(f"  Batch (1 open cat, all 64 uppers): {t1-t0:.3f}s", flush=True)

    t0 = time.time()
    _ = compute_turn_ev_batch(0, np.arange(64))  # all 13 open
    t1 = time.time()
    per_mask = t1 - t0
    print(f"  Batch (all 13 open, all 64 uppers): {per_mask:.3f}s", flush=True)
    print(f"  Estimated total: {per_mask * ALL_USED:.0f}s = {per_mask * ALL_USED / 60:.1f} min", flush=True)

    compute_policy()

    print(f"Expected total score (V[0][0]): {V[0][0]:.4f}", flush=True)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, "policy.json")
    print(f"Writing {out_path} ...", flush=True)
    with open(out_path, "w") as f:
        json.dump({"V": V.tolist()}, f, separators=(",", ":"))
    print(f"Done. policy.json written ({os.path.getsize(out_path) // 1024} KB)", flush=True)
