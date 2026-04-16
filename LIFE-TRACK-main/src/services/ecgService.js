import axiosInstance from '../config/axios';

export const DEFAULT_SAMPLE_RATE_HZ = 250;

export const normalizeEcgSignal = (signal) => {
    if (Array.isArray(signal)) {
        return signal.map(Number).filter((value) => Number.isFinite(value));
    }

    if (typeof signal === 'string') {
        try {
            const parsed = JSON.parse(signal);
            if (Array.isArray(parsed)) {
                return parsed.map(Number).filter((value) => Number.isFinite(value));
            }
        } catch (error) {
            return [];
        }
    }

    return [];
};

const normalizeReading = (reading) => {
    if (!reading) {
        return null;
    }

    const rawReadingId = reading.reading_id ?? reading.id ?? 0;
    const numericReadingId = Number(rawReadingId);

    return {
        ...reading,
        reading_id: Number.isFinite(numericReadingId) && numericReadingId !== 0 ? numericReadingId : rawReadingId,
        heart_rate: Number(reading.heart_rate ?? 0) || 0,
        abnormal_detected: Boolean(reading.abnormal_detected),
        ecg_signal: normalizeEcgSignal(reading.ecg_signal),
        alerts: Array.isArray(reading.alerts) ? reading.alerts : [],
    };
};

export const getReadingsHistory = async (userId, limit = 20, offset = 0) => {
    const { data } = await axiosInstance.get(`/readings/history/${userId}`, {
        params: { limit, offset }
    });
    return {
        ...data,
        readings: (data.readings ?? []).map(normalizeReading).filter(Boolean),
    };
};

export const getReadingDetail = async (readingId) => {
    const { data } = await axiosInstance.get(`/readings/detail/${readingId}`);
    return {
        ...data,
        reading: normalizeReading(data.reading),
    };
};

/**
 * Transforms an array of ECG signal points into an SVG path data string
 * @param {number[] | string} signal - array of Y values (often numbers)
 * @param {number} width - The virtual width of the bounding box (default 1000)
 * @param {number} height - The virtual height (default 200)
 * @returns {string} SVG path 'M... L... L...'
 */
export const ecgSignalToSvgPath = (signal, width = 1000, height = 200) => {
    const arr = normalizeEcgSignal(signal);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    if (arr.length === 1) {
        return `M0,${height / 2} L${width},${height / 2}`;
    }

    const minVoltage = Math.min(...arr);
    const maxVoltage = Math.max(...arr);
    const centerVoltage = (maxVoltage + minVoltage) / 2;
    const maxDistanceFromCenter = Math.max(
        Math.abs(maxVoltage - centerVoltage),
        Math.abs(minVoltage - centerVoltage),
        1e-6,
    );
    const halfDrawableHeight = height * 0.4;
    const scaleY = halfDrawableHeight / maxDistanceFromCenter;
    const centerY = height / 2;
    
    const stepX = width / (arr.length - 1);
    
    const parts = arr.map((val, index) => {
        // Keep the waveform centered vertically so skewed live chunks do not hug one edge.
        const y = centerY - ((val - centerVoltage) * scaleY);
        const x = index * stepX;
        const prefix = index === 0 ? 'M' : 'L';
        return `${prefix}${x},${y}`;
    });

    return parts.join(' ');
};
