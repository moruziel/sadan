"""
SADAN Speaker Verification Service — SpeechBrain ECAPA-TDNN
============================================================
Verifies that incoming audio belongs to an enrolled speaker.

• Lazy-loads the model on first use (downloads ~90 MB from HuggingFace once)
• Stores voiceprints in backend/data/speakers.json (persistent)
• Thread-safe: all torch calls are CPU-bound, safe to call from executor

Public API
----------
  get_verifier()                → singleton SpeakerVerifier
  verifier.enroll(name, pcm)    → str  (greeting message)
  verifier.verify(pcm)          → (is_known: bool, name: str, score: float)
  verifier.toggle(enabled)
  verifier.remove(name)
  verifier.list_speakers()      → list[str]
  verifier.enabled              → bool
  verifier.has_speakers()       → bool
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── paths ──────────────────────────────────────────────────────────────────────
_BASE = Path(__file__).parent.parent            # backend/
SPEAKERS_FILE = _BASE / "data" / "speakers.json"
MODEL_SAVEDIR  = str(_BASE / "data" / "spkrec-ecapa-voxceleb")

# ── constants ─────────────────────────────────────────────────────────────────
MODEL_SOURCE    = "speechbrain/spkrec-ecapa-voxceleb"
SAMPLE_RATE     = 16_000       # pipeline input is always 16 kHz PCM-16
# Minimum audio required for a reliable embedding (~1 second)
MIN_AUDIO_BYTES = SAMPLE_RATE * 2   # 16-bit samples → 2 bytes each
# Cosine-similarity threshold.  ≥ THRESHOLD → same speaker.
# SpeechBrain paper reports EER ~0.8% at 0.25 on VoxCeleb1-O.
THRESHOLD       = 0.25


# ── singleton ─────────────────────────────────────────────────────────────────
_instance: Optional["SpeakerVerifier"] = None


def get_verifier() -> "SpeakerVerifier":
    global _instance
    if _instance is None:
        _instance = SpeakerVerifier()
    return _instance


# ── service ───────────────────────────────────────────────────────────────────
class SpeakerVerifier:
    """Speaker verification using SpeechBrain's ECAPA-TDNN model."""

    def __init__(self):
        self._enabled: bool = True
        self._model  = None          # lazy — loaded on first use
        self._voiceprints: dict      = {}   # name → 1-D float32 list
        self._load_speakers()

    # ── public API ──────────────────────────────────────────────────────────

    def enroll(self, name: str, pcm_bytes: bytes) -> str:
        """
        Enroll a speaker from raw PCM audio (16-bit, 16 kHz).
        Returns a Hebrew greeting string.
        """
        if len(pcm_bytes) < MIN_AUDIO_BYTES:
            raise ValueError(f"Need at least {MIN_AUDIO_BYTES // 2000:.1f}s of audio")

        embedding = self._get_embedding(pcm_bytes)
        self._voiceprints[name] = embedding.tolist()
        self._save_speakers()
        logger.info(f"[SpeakerVerify] Enrolled: {name}  dim={len(embedding)}")
        return f"זיהיתי אותך, {name}"

    def verify(self, pcm_bytes: bytes) -> tuple[bool, str, float]:
        """
        Verify audio against enrolled speakers.
        Returns (is_known, best_match_name, score).
        Returns (True, 'unknown', 1.0) when disabled or no speakers enrolled.
        """
        if not self._enabled or not self._voiceprints:
            return True, "unknown", 1.0

        if len(pcm_bytes) < MIN_AUDIO_BYTES:
            return True, "unknown", 1.0   # not enough audio → pass through

        try:
            embedding = self._get_embedding(pcm_bytes)
        except Exception as e:
            logger.warning(f"[SpeakerVerify] embedding failed: {e}")
            return True, "unknown", 1.0   # fail open — don't block pipeline

        best_name  = ""
        best_score = -1.0
        for name, vp_list in self._voiceprints.items():
            import torch
            vp = torch.tensor(vp_list, dtype=torch.float32)
            score = float(_cosine_sim(embedding, vp))
            if score > best_score:
                best_score = score
                best_name  = name

        is_known = best_score >= THRESHOLD
        logger.debug(
            f"[SpeakerVerify] best={best_name} score={best_score:.3f} known={is_known}"
        )
        return is_known, best_name if is_known else "", best_score

    def toggle(self, enabled: bool) -> None:
        self._enabled = enabled
        logger.info(f"[SpeakerVerify] {'enabled' if enabled else 'disabled'}")

    def remove(self, name: str) -> None:
        if name in self._voiceprints:
            del self._voiceprints[name]
            self._save_speakers()
            logger.info(f"[SpeakerVerify] Removed: {name}")

    def list_speakers(self) -> list[str]:
        return list(self._voiceprints.keys())

    def has_speakers(self) -> bool:
        return bool(self._voiceprints)

    @property
    def enabled(self) -> bool:
        return self._enabled

    # ── internal ────────────────────────────────────────────────────────────

    def _get_model(self):
        """Lazy-load SpeechBrain ECAPA model (downloads on first call)."""
        if self._model is None:
            logger.info(f"[SpeakerVerify] Loading model from {MODEL_SOURCE}…")
            try:
                from speechbrain.inference.speaker import EncoderClassifier
                self._model = EncoderClassifier.from_hdf(
                    source=MODEL_SOURCE,
                    savedir=MODEL_SAVEDIR,
                    run_opts={"device": "cpu"},
                )
                logger.info("[SpeakerVerify] ✅ Model loaded")
            except Exception as e:
                logger.error(f"[SpeakerVerify] Model load failed: {e}")
                raise
        return self._model

    def _get_embedding(self, pcm_bytes: bytes):
        """Extract a speaker embedding from raw 16-bit PCM at 16 kHz."""
        import torch
        int16  = np.frombuffer(pcm_bytes, dtype=np.int16)
        f32    = (int16.astype(np.float32) / 32768.0)
        tensor = torch.from_numpy(f32).unsqueeze(0)  # [1, samples]
        model  = self._get_model()
        with torch.no_grad():
            emb = model.encode_batch(tensor)   # [1, 1, emb_dim]
        return emb.squeeze()                    # [emb_dim]

    def _load_speakers(self) -> None:
        if SPEAKERS_FILE.exists():
            try:
                data = json.loads(SPEAKERS_FILE.read_text(encoding="utf-8"))
                self._voiceprints = data
                logger.info(
                    f"[SpeakerVerify] Loaded {len(self._voiceprints)} speaker(s): "
                    f"{list(self._voiceprints.keys())}"
                )
            except Exception as e:
                logger.warning(f"[SpeakerVerify] Failed to load speakers: {e}")
                self._voiceprints = {}

    def _save_speakers(self) -> None:
        SPEAKERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        SPEAKERS_FILE.write_text(
            json.dumps(self._voiceprints, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


# ── helpers ───────────────────────────────────────────────────────────────────

def _cosine_sim(a, b):
    """Cosine similarity between two 1-D torch tensors."""
    import torch
    a = torch.nn.functional.normalize(a.float(), dim=0)
    b = torch.nn.functional.normalize(b.float(), dim=0)
    return torch.dot(a, b)
