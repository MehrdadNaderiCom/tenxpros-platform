#!/usr/bin/env python3
"""
Generate immutable, block-level narration cues from the exact PCM submitted to
the production narrator.

This is an offline release tool. Runtime code consumes only its small audited
JSON output; it never downloads a model or depends on scratch files. The tool
uses torchaudio's MIT-licensed fairseq Wav2Vec2 English ASR model as a CTC
forced aligner and never changes lesson content or audio.

Example:
  PYTHONPATH=/path/to/torch-libs TORCH_HOME=/path/to/model-cache \
    python3 scripts/generate-academy-follow-along.py \
      --plan /secure/final-generation-plan-v1/paid-generation-plan.json \
      --narration-manifest /secure/final-generation-plan-v1/final-narration-manifest.json \
      --runtime-dir /secure/final-generation-runtime-v1 \
      --output src/data/academy-follow-along/active-elevenlabs-bella.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torchaudio


SCHEMA_VERSION = "tenxpros-academy-follow-along-v1"
ALIGNMENT_METHOD = "torchaudio-wav2vec2-ctc-windowed-v1"
MODEL_ID = "torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H"
SOURCE_SAMPLE_RATE = 24_000
MODEL_SAMPLE_RATE = 16_000
WINDOW_SECONDS = 25.0
MARGIN_SECONDS = 1.0
MIN_CUE_CONFIDENCE = 0.80
MIN_LESSON_MEAN_CONFIDENCE = 0.95
MAX_MP3_PADDING_MILLISECONDS = 100


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def canonical(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


ONES = (
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
)
TENS = (
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
)


def integer_words(value: int) -> str:
    if value < 20:
        return ONES[value]
    if value < 100:
        return TENS[value // 10] + (
            f" {ONES[value % 10]}" if value % 10 else ""
        )
    if value < 1_000:
        return f"{ONES[value // 100]} hundred" + (
            f" {integer_words(value % 100)}" if value % 100 else ""
        )
    if value < 10_000:
        return f"{ONES[value // 1_000]} thousand" + (
            f" {integer_words(value % 1_000)}"
            if value % 1_000
            else ""
        )
    raise ValueError(f"unsupported number in narration: {value}")


def normalized_words(text: str) -> list[str]:
    text = re.sub(
        r"\b\d{1,4}\b",
        lambda match: integer_words(int(match.group(0))),
        text,
    )
    text = (
        unicodedata.normalize("NFKD", text)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    text = re.sub(r"[^a-z']+", " ", text)
    return [
        word.strip("'")
        for word in text.split()
        if word.strip("'")
    ]


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected object")
    return value


def windowed_emission(
    model: torch.nn.Module,
    waveform: torch.Tensor,
) -> tuple[torch.Tensor, torch.Tensor]:
    total_seconds = waveform.shape[1] / MODEL_SAMPLE_RATE
    emissions: list[torch.Tensor] = []
    frame_times: list[torch.Tensor] = []
    core_start = 0.0
    with torch.inference_mode():
        while core_start < total_seconds:
            core_end = min(total_seconds, core_start + WINDOW_SECONDS)
            segment_start = max(0.0, core_start - MARGIN_SECONDS)
            segment_end = min(
                total_seconds, core_end + MARGIN_SECONDS
            )
            sample_start = round(segment_start * MODEL_SAMPLE_RATE)
            sample_end = round(segment_end * MODEL_SAMPLE_RATE)
            emission, _ = model(
                waveform[:, sample_start:sample_end]
            )
            emission = emission[0].cpu()
            count = emission.shape[0]
            segment_duration = (
                sample_end - sample_start
            ) / MODEL_SAMPLE_RATE
            times = segment_start + (
                torch.arange(count, dtype=torch.float64) + 0.5
            ) * (segment_duration / count)
            keep = (times >= core_start) & (times < core_end)
            emissions.append(emission[keep])
            frame_times.append(times[keep])
            core_start = core_end
    return torch.cat(emissions), torch.cat(frame_times)


def align_request(
    *,
    model: torch.nn.Module,
    dictionary: dict[str, int],
    pcm_path: Path,
    blocks: list[dict[str, Any]],
    offset_seconds: float,
) -> list[dict[str, Any]]:
    raw = pcm_path.read_bytes()
    if len(raw) % 2:
        raise ValueError(f"{pcm_path}: invalid PCM byte length")
    pcm = np.frombuffer(raw, dtype="<i2").astype(np.float32)
    waveform = torch.from_numpy(pcm / 32768.0).unsqueeze(0)
    waveform = torchaudio.functional.resample(
        waveform,
        SOURCE_SAMPLE_RATE,
        MODEL_SAMPLE_RATE,
    )
    emission, frame_times = windowed_emission(model, waveform)
    block_words = [
        normalized_words(str(block["spokenText"]))
        for block in blocks
    ]
    if any(not words for words in block_words):
        raise ValueError(f"{pcm_path}: empty normalized block")
    words = [word for group in block_words for word in group]
    target_tokens: list[int] = []
    word_token_ranges: list[tuple[int, int]] = []
    for word_index, word in enumerate(words):
        start = len(target_tokens)
        target_tokens.extend(
            dictionary[character.upper()]
            for character in word
        )
        word_token_ranges.append(
            (start, len(target_tokens))
        )
        if word_index < len(words) - 1:
            target_tokens.append(dictionary["|"])
    log_probabilities = torch.log_softmax(
        emission, dim=-1
    ).unsqueeze(0)
    targets = torch.tensor(
        [target_tokens], dtype=torch.int32
    )
    aligned, alignment_scores = (
        torchaudio.functional.forced_align(
            log_probabilities,
            targets,
            blank=0,
        )
    )
    token_spans = torchaudio.functional.merge_tokens(
        aligned[0],
        alignment_scores[0].exp(),
        blank=0,
    )
    if len(token_spans) != len(target_tokens):
        raise ValueError(
            f"{pcm_path}: token alignment coverage failed"
        )
    word_spans = [
        token_spans[start:end]
        for start, end in word_token_ranges
    ]
    cues: list[dict[str, Any]] = []
    word_index = 0
    for block, words_for_block in zip(blocks, block_words):
        spans = word_spans[
            word_index : word_index + len(words_for_block)
        ]
        word_index += len(words_for_block)
        first = spans[0][0]
        last = spans[-1][-1]
        scores = [
            token.score
            for word in spans
            for token in word
        ]
        start_seconds = (
            offset_seconds
            + float(frame_times[first.start])
        )
        end_seconds = (
            offset_seconds
            + float(frame_times[last.end - 1])
        )
        cues.append(
            {
                "blockIndex": int(block["sequence"]),
                "semanticBlockId": block["semanticBlockId"],
                "sourceHtmlPath": block["sourceHtmlPath"],
                "sourceHash": block["sourceHash"],
                "spokenHash": block["spokenHash"],
                "startMs": round(start_seconds * 1_000),
                "endMs": round(end_seconds * 1_000),
                "confidence": round(
                    sum(scores) / len(scores), 6
                ),
            }
        )
    if word_index != len(word_spans):
        raise ValueError(f"{pcm_path}: word coverage failed")
    return cues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument(
        "--narration-manifest", type=Path, required=True
    )
    parser.add_argument(
        "--runtime-dir", type=Path, required=True
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--slug",
        help=(
            "Align one lesson for an offline QA sample. "
            "Omit for the required full 17-lesson release."
        ),
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_args()
    plan = load_json(arguments.plan)
    narration = load_json(arguments.narration_manifest)
    runtime = arguments.runtime_dir
    if (
        plan.get("schemaVersion")
        != "tenxpros-elevenlabs-final-paid-generation-plan-v1"
        or narration.get("schemaVersion")
        != "tenxpros-elevenlabs-final-narration-manifest-v1"
        or plan.get("narrationManifestHash")
        != narration.get("manifestHash")
    ):
        raise ValueError("frozen release identity failed")
    requests = plan.get("requests")
    lessons = narration.get("lessons")
    if not isinstance(requests, list) or not isinstance(lessons, list):
        raise ValueError("frozen plan shape failed")
    if len(lessons) != 17:
        raise ValueError("expected all 17 Academy lessons")
    selected_lessons = lessons
    if arguments.slug:
        selected_lessons = [
            lesson
            for lesson in lessons
            if lesson.get("slug") == arguments.slug
        ]
        if len(selected_lessons) != 1:
            raise ValueError(
                f"unknown Academy lesson slug: {arguments.slug}"
            )

    bundle = (
        torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
    )
    model = bundle.get_model()
    model.eval()
    dictionary = {
        label: index
        for index, label in enumerate(
            bundle.get_labels()
        )
    }

    output_lessons: list[dict[str, Any]] = []
    total_cues = 0
    for lesson in selected_lessons:
        slug = lesson["slug"]
        asset_manifest_path = (
            runtime / "asset-manifests" / f"{slug}.json"
        )
        asset = load_json(asset_manifest_path)
        mp3_path = runtime / "assets" / f"{slug}.mp3"
        if (
            sha256_bytes(mp3_path.read_bytes())
            != asset["checksumSha256"]
            or asset["contentHash"]
            != lesson["canonicalSanitizedHtmlHash"]
            or asset["spokenScriptHash"]
            != lesson["spokenScriptHash"]
        ):
            raise ValueError(f"{slug}: immutable asset binding failed")
        lesson_requests = sorted(
            [
                (index, request)
                for index, request in enumerate(requests)
                if request["lessonSlug"] == slug
            ],
            key=lambda item: item[1]["chunkIndex"],
        )
        boundaries = {
            int(boundary["chunkIndex"]): boundary
            for boundary in asset["generationMetadata"]["boundaries"]
        }
        provider_requests = {
            int(item["chunkIndex"]): item
            for item in asset["generationMetadata"]["providerRequests"]
        }
        offset_seconds = 0.0
        cues: list[dict[str, Any]] = []
        for global_index, request in lesson_requests:
            ordinal = global_index + 1
            pcm_path = (
                runtime
                / "raw-responses"
                / (
                    f"{ordinal:02d}-{request['id']}.pcm"
                )
            )
            pcm = pcm_path.read_bytes()
            expected_pcm_hash = provider_requests[
                int(request["chunkIndex"])
            ]["rawPcmSha256"]
            if (
                sha256_bytes(pcm) != expected_pcm_hash
                or sha256_text(request["text"])
                != request["textSha256"]
            ):
                raise ValueError(
                    f"{slug}:{request['chunkIndex']}: request binding failed"
                )
            boundary = boundaries.get(
                int(request["chunkIndex"])
            )
            inserted_ms = (
                float(boundary["insertedMilliseconds"])
                if boundary
                else 0.0
            )
            offset_seconds += inserted_ms / 1_000
            first = int(request["firstBlockSequence"])
            last = int(request["lastBlockSequence"])
            request_blocks = lesson["blocks"][first : last + 1]
            if [block["sequence"] for block in request_blocks] != request[
                "blockSequences"
            ]:
                raise ValueError(
                    f"{slug}:{request['chunkIndex']}: block coverage failed"
                )
            cues.extend(
                align_request(
                    model=model,
                    dictionary=dictionary,
                    pcm_path=pcm_path,
                    blocks=request_blocks,
                    offset_seconds=offset_seconds,
                )
            )
            offset_seconds += (
                len(pcm) / 2 / SOURCE_SAMPLE_RATE
            )

        if len(cues) != len(lesson["blocks"]):
            raise ValueError(f"{slug}: cue count failed")
        for index, cue in enumerate(cues):
            if (
                cue["blockIndex"] != index
                or cue["startMs"] < 0
                or cue["endMs"] <= cue["startMs"]
                or (
                    index > 0
                    and cue["startMs"]
                    < cues[index - 1]["endMs"]
                )
            ):
                raise ValueError(f"{slug}: cue monotonicity failed")
        timeline_ms = round(offset_seconds * 1_000)
        mp3_duration_ms = round(
            float(asset["durationSeconds"]) * 1_000
        )
        mp3_padding_ms = mp3_duration_ms - timeline_ms
        if (
            cues[-1]["endMs"] > timeline_ms
            or cues[-1]["endMs"] > mp3_duration_ms
            or abs(
                timeline_ms
                - int(asset["audit"]["rawPcmBytes"])
                / 2
                / SOURCE_SAMPLE_RATE
                * 1_000
            )
            > 2
        ):
            raise ValueError(f"{slug}: final timeline failed")
        confidence = [
            float(cue["confidence"]) for cue in cues
        ]
        mean_confidence = sum(confidence) / len(confidence)
        if (
            min(confidence) < MIN_CUE_CONFIDENCE
            or mean_confidence
            < MIN_LESSON_MEAN_CONFIDENCE
        ):
            raise ValueError(
                f"{slug}: forced-alignment confidence gate failed"
            )
        if not (
            0
            <= mp3_padding_ms
            <= MAX_MP3_PADDING_MILLISECONDS
        ):
            raise ValueError(
                f"{slug}: MP3/raw timeline padding gate failed"
            )
        lowest_cue = min(
            cues, key=lambda cue: float(cue["confidence"])
        )
        lesson_core = {
            "lessonSlug": slug,
            "lessonId": lesson["lessonId"],
            "assetChecksumSha256": asset["checksumSha256"],
            "contentHash": asset["contentHash"],
            "spokenScriptHash": asset["spokenScriptHash"],
            "durationSeconds": asset["durationSeconds"],
            "timelineDurationMs": timeline_ms,
            "cueCount": len(cues),
            "meanConfidence": round(
                mean_confidence, 6
            ),
            "minimumConfidence": round(min(confidence), 6),
            "cues": cues,
        }
        output_lessons.append(
            {
                **lesson_core,
                "manifestHash": sha256_text(
                    canonical(lesson_core)
                ),
            }
        )
        total_cues += len(cues)
        print(
            json.dumps(
                {
                    "aligned": slug,
                    "cues": len(cues),
                    "minimumConfidence": min(confidence),
                    "lowestBlockIndex": lowest_cue[
                        "blockIndex"
                    ],
                    "lowestSourceHtmlPath": lowest_cue[
                        "sourceHtmlPath"
                    ],
                }
            ),
            flush=True,
        )

    release_core = {
        "schemaVersion": SCHEMA_VERSION,
        "releaseId": plan["releaseId"],
        "recipeHash": plan["recipeHash"],
        "sourceContentManifestHash": plan[
            "sourceContentManifestHash"
        ],
        "alignmentMethod": ALIGNMENT_METHOD,
        "modelId": MODEL_ID,
        "modelSampleRate": MODEL_SAMPLE_RATE,
        "lessonCount": len(output_lessons),
        "cueCount": total_cues,
        "lessons": output_lessons,
    }
    output = {
        **release_core,
        "manifestHash": sha256_text(canonical(release_core)),
    }
    if not arguments.slug and total_cues != 954:
        raise ValueError("expected all 954 semantic cues")
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "complete": True,
                "lessons": len(output_lessons),
                "cues": total_cues,
                "manifestHash": output["manifestHash"],
                "output": str(arguments.output),
            }
        )
    )


if __name__ == "__main__":
    main()
