"""
Tác dụng:
- Tạo baseline chuẩn từ Python để đối chiếu với pipeline ECG CNN bên Node.js.
- Ghi kết quả mẫu ra `baseline_p0_t05.json` và `baseline_p0_t05.csv`.

Vấn đề file này giải quyết:
- Cần một nguồn chân lý cố định để kiểm tra Node có bám đúng preprocessing và suy luận của Python hay không.
- Cách làm: đọc config + dữ liệu ECG + TFJS weights, chạy filter -> detect peak -> cắt segment -> scale -> forward model, rồi ghi kết quả mẫu ra JSON/CSV.

Cách chạy:
- Từ thư mục `server`, chạy: `python model_CNN/scripts/p0_t05_generate_baseline.py`
- Điều kiện: môi trường Python phải có `numpy` và `scipy`.

Các function chính:
- load_json: đọc file JSON có xử lý BOM.
- validate_config: kiểm tra preprocess_config có đủ key và giá trị hợp lệ.
- relu, softmax: các phép toán kích hoạt cơ bản dùng khi forward model.
- conv1d_valid, maxpool1d_valid: mô phỏng các lớp Conv1D/MaxPool1D của model bằng NumPy.
- load_tfjs_weights: đọc weights từ model TFJS export.
- build_bandpass_coeffs: lấy hệ số filter b/a từ preprocess_config.
- load_and_concat_signal: ghép nhiều reading thành một tín hiệu ECG dài.
- detect_and_cut_segments: lọc tín hiệu, tìm peak và cắt segment quanh từng peak.
- forward_segment: chạy forward một segment qua CNN.
- write_outputs: ghi baseline ra file JSON và CSV.
- main: điều phối toàn bộ pipeline tạo baseline.
"""

import csv
import json
from pathlib import Path

import numpy as np
import scipy.signal


SLICE_START = 30000
SLICE_END = 59000
TARGET_BEATS = 150
REQUIRED_CONFIG_KEYS = {
    "fs",
    "half_window",
    "segment_len",
    "lowcut",
    "highcut",
    "filter_order",
    "b_coeffs",
    "a_coeffs",
    "rpeak_min_distance_sec",
    "rpeak_min_height",
    "scaler_mean",
    "scaler_scale",
    "classes",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def validate_config(config: dict):
    missing = REQUIRED_CONFIG_KEYS.difference(config.keys())
    if missing:
        raise ValueError(f"Missing config keys: {sorted(missing)}")
    if float(config["scaler_scale"]) == 0:
        raise ValueError("Invalid scaler_scale=0 in preprocess_config.json")
    if int(config["segment_len"]) != (int(config["half_window"]) * 2 + 1):
        raise ValueError("segment_len must equal half_window*2+1")


def relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(x, 0.0)


def softmax(x: np.ndarray) -> np.ndarray:
    x = x - np.max(x)
    exp_x = np.exp(x)
    return exp_x / np.sum(exp_x)


def conv1d_valid(x: np.ndarray, kernel: np.ndarray, bias: np.ndarray) -> np.ndarray:
    k, in_ch, out_ch = kernel.shape
    if x.ndim != 2 or x.shape[1] != in_ch:
        raise ValueError(f"conv1d shape mismatch: x={x.shape}, kernel={kernel.shape}")
    if x.shape[0] < k:
        raise ValueError(f"signal too short for kernel: signal={x.shape[0]}, kernel={k}")

    out_len = x.shape[0] - k + 1
    strides = (x.strides[0], x.strides[0], x.strides[1])
    windows = np.lib.stride_tricks.as_strided(
        x, shape=(out_len, k, in_ch), strides=strides, writeable=False
    )
    out = np.tensordot(windows, kernel, axes=([1, 2], [0, 1]))
    out += bias.reshape(1, out_ch)
    return out


def maxpool1d_valid(x: np.ndarray, pool_size: int = 2, stride: int = 2) -> np.ndarray:
    if x.ndim != 2:
        raise ValueError(f"maxpool expects 2D tensor, got {x.shape}")
    if x.shape[0] < pool_size:
        raise ValueError(f"signal too short for pooling: signal={x.shape[0]}, pool={pool_size}")
    out_len = (x.shape[0] - pool_size) // stride + 1
    strides = (x.strides[0] * stride, x.strides[0], x.strides[1])
    windows = np.lib.stride_tricks.as_strided(
        x, shape=(out_len, pool_size, x.shape[1]), strides=strides, writeable=False
    )
    return windows.max(axis=1)


def load_tfjs_weights(model_json_path: Path):
    model = load_json(model_json_path)
    manifest = model["weightsManifest"][0]
    specs = manifest["weights"]
    bin_path = model_json_path.parent / manifest["paths"][0]

    raw = np.fromfile(bin_path, dtype=np.float32)
    offset = 0
    weights = {}
    for spec in specs:
        shape = tuple(spec["shape"])
        size = int(np.prod(shape))
        end = offset + size
        if end > raw.size:
            raise ValueError(f"Weight buffer overflow at {spec['name']}")
        weights[spec["name"]] = raw[offset:end].reshape(shape)
        offset = end

    if offset != raw.size:
        raise ValueError(f"Unused weight buffer: consumed={offset}, total={raw.size}")
    return weights


def build_bandpass_coeffs(config):
    b = np.asarray(config["b_coeffs"], dtype=np.float64)
    a = np.asarray(config["a_coeffs"], dtype=np.float64)
    if b.size < 2 or a.size < 2:
        raise ValueError("Invalid b_coeffs/a_coeffs in preprocess_config.json")
    if a[0] == 0:
        raise ValueError("Invalid a_coeffs[0]=0 in preprocess_config.json")
    return b, a


def load_and_concat_signal(readings_path: Path) -> np.ndarray:
    data = load_json(readings_path)
    if not isinstance(data, list) or not data:
        raise ValueError("readings_with_id.json must be a non-empty list")
    readings = []
    for index, record in enumerate(data):
        if "reading" not in record:
            raise ValueError(f"Missing 'reading' key at record index {index}")
        arr = np.asarray(record["reading"], dtype=np.float32)
        if arr.size == 0:
            continue
        readings.append(arr)
    if not readings:
        raise ValueError("No reading samples found after parsing JSON")
    return np.concatenate(readings)


def detect_and_cut_segments(signal_slice: np.ndarray, config: dict):
    b, a = build_bandpass_coeffs(config)
    filtered = scipy.signal.filtfilt(b, a, signal_slice)
    min_distance = int(float(config["rpeak_min_distance_sec"]) * float(config["fs"]))
    peaks, _ = scipy.signal.find_peaks(
        filtered,
        height=float(config["rpeak_min_height"]),
        distance=max(1, min_distance),
    )

    half_window = int(config["half_window"])
    segment_len = int(config["segment_len"])
    rows = []
    for peak in peaks:
        start = int(peak - half_window)
        end = int(peak + half_window + 1)
        if start < 0 or end > len(filtered):
            continue
        segment = filtered[start:end]
        if len(segment) != segment_len:
            continue
        rows.append(
            {
                "peak_sample": int(peak),
                "segment_start": start,
                "segment_end": end,
                "segment": segment.astype(np.float32),
            }
        )
    return rows


def forward_segment(segment: np.ndarray, weights: dict) -> np.ndarray:
    x = segment.reshape(-1, 1).astype(np.float32)

    x = relu(conv1d_valid(x, weights["conv1d/kernel"], weights["conv1d/bias"]))
    x = maxpool1d_valid(x, pool_size=2, stride=2)

    x = relu(conv1d_valid(x, weights["conv1d_1/kernel"], weights["conv1d_1/bias"]))
    x = maxpool1d_valid(x, pool_size=2, stride=2)

    x = relu(conv1d_valid(x, weights["conv1d_2/kernel"], weights["conv1d_2/bias"]))
    x = maxpool1d_valid(x, pool_size=2, stride=2)

    x = x.reshape(-1)
    x = relu(np.dot(x, weights["dense/kernel"]) + weights["dense/bias"])
    logits = np.dot(x, weights["dense_1/kernel"]) + weights["dense_1/bias"]
    return softmax(logits)


def write_outputs(rows, output_json_path: Path, output_csv_path: Path):
    output_json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    with output_csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "beat_index",
                "peak_sample",
                "segment_start",
                "segment_end",
                "label",
                "confidence",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def main():
    base_dir = Path(__file__).resolve().parents[1]
    config_path = base_dir / "ecg" / "preprocess_config.json"
    readings_path = base_dir / "ecg" / "readings_with_id.json"
    model_json_path = base_dir / "ecg_tfjs" / "model.json"
    output_json_path = base_dir / "baseline_p0_t05.json"
    output_csv_path = base_dir / "baseline_p0_t05.csv"

    config = load_json(config_path)
    validate_config(config)
    classes = list(config["classes"])
    class_set = set(classes)
    weights = load_tfjs_weights(model_json_path)

    all_signal = load_and_concat_signal(readings_path)
    if len(all_signal) < SLICE_END:
        raise RuntimeError(f"Concatenated signal too short: {len(all_signal)} < {SLICE_END}")
    all_signal = all_signal[SLICE_START:SLICE_END]
    if len(all_signal) != (SLICE_END - SLICE_START):
        raise RuntimeError(f"Unexpected sliced signal length: {len(all_signal)}")

    segment_rows = detect_and_cut_segments(all_signal, config)
    if len(segment_rows) < TARGET_BEATS:
        raise RuntimeError(
            f"Not enough valid segments: {len(segment_rows)} < {TARGET_BEATS}. "
            "Adjust input slice or R-peak params."
        )

    selected_rows = segment_rows[:TARGET_BEATS]
    scaler_mean = float(config["scaler_mean"])
    scaler_scale = float(config["scaler_scale"])
    segments = np.asarray([row["segment"] for row in selected_rows], dtype=np.float32)
    segments_scaled = (segments - scaler_mean) / scaler_scale
    segments_scaled = segments_scaled.reshape(len(segments_scaled), int(config["segment_len"]), 1)

    output_rows = []
    for idx, (meta, segment_scaled) in enumerate(zip(selected_rows, segments_scaled)):
        probs = forward_segment(segment_scaled[:, 0], weights)
        pred_idx = int(np.argmax(probs))
        label = classes[pred_idx]
        confidence = float(np.max(probs))
        if label not in class_set:
            raise RuntimeError(f"Invalid label produced: {label}")
        output_rows.append(
            {
                "beat_index": idx,
                "peak_sample": meta["peak_sample"],
                "segment_start": meta["segment_start"],
                "segment_end": meta["segment_end"],
                "label": label,
                "confidence": round(confidence, 6),
            }
        )

    write_outputs(output_rows, output_json_path, output_csv_path)
    print(f"Sliced signal length: {len(all_signal)}")
    print(f"Detected valid segments: {len(segment_rows)}")
    print(f"Generated baseline rows: {len(output_rows)}")
    print(f"Output JSON: {output_json_path}")
    print(f"Output CSV:  {output_csv_path}")


if __name__ == "__main__":
    main()
