// src/hooks/useDecodeVin.ts
import { useState } from "react";
import apiClient from "../services/api-client";
import { CanceledError } from "axios";
import { DecodedVin } from "../src/types/types";

interface DecodeVinResponse {
    message: DecodedVin;
}

const useDecodeVin = () => {
    const [decodedVin, setDecodedVin] = useState<DecodedVin | null>(null);
    const [decodeError, setDecodeError] = useState<string | null>(null);
    const [isDecoding, setDecoding] = useState(false);

    const decodeVin = async (vin: string) => {
        const normalizedVin = vin.trim().toUpperCase();

        if (normalizedVin.length !== 17 || /[IOQ]/.test(normalizedVin)) {
            setDecodeError("AuthenticatedView.Errors.invalid_vin");
            setDecodedVin(null);
            return false;
        }

        try {
            setDecoding(true);
            const { data } = await apiClient.post<DecodeVinResponse>(
                `/api/admin/vehicles/decode-vin/${normalizedVin}`
            );

            setDecodedVin(data.message);
            setDecodeError(null);
            return true;
        } catch (err: unknown) {
            if (err instanceof CanceledError) return;

            const fallback = "AuthenticatedView.Errors.failed_to_decode_vin";

            setDecodeError(fallback);
            setDecodedVin(null);
            return false;
        } finally {
            setDecoding(false);
        }
    };

    return { decodeVin, decodedVin, isDecoding, decodeError };
};

export default useDecodeVin;
