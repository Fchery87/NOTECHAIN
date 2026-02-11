'use client';

import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  verifySecureConnection,
  checkKeyRotationStatus,
} from '../../lib/security/encryptionVerification';

interface EncryptionStatusState {
  secure: boolean;
  protocol: string;
  algorithm: string;
  keyLength: string;
  lastRotation: Date | null;
  nextRotationDue: Date | null;
  daysUntilRotation: number;
  rotationRecommended: boolean;
}

/**
 * Encryption Status Component
 * Displays real-time encryption status indicators
 */
export function EncryptionStatus(): ReactElement {
  const [status, setStatus] = useState<EncryptionStatusState>({
    secure: true,
    protocol: 'HTTPS',
    algorithm: 'XSalsa20-Poly1305',
    keyLength: '256-bit',
    lastRotation: null,
    nextRotationDue: null,
    daysUntilRotation: 90,
    rotationRecommended: false,
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check connection security
    const connection = verifySecureConnection();

    // Check key rotation (would be fetched from secure storage in production)
    const lastRotationDate = localStorage.getItem('@notechain/lastKeyRotation');
    const rotationStatus = checkKeyRotationStatus(
      lastRotationDate ? new Date(lastRotationDate) : undefined
    );

    setStatus({
      secure: connection.secure,
      protocol: connection.secure ? 'HTTPS' : 'HTTP',
      algorithm: 'XSalsa20-Poly1305',
      keyLength: '256-bit',
      lastRotation: rotationStatus.lastRotation,
      nextRotationDue: rotationStatus.nextRotationDue,
      daysUntilRotation: rotationStatus.daysUntilRotation,
      rotationRecommended: rotationStatus.rotationRecommended,
    });
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${status.secure ? 'bg-green-500' : 'bg-rose-500'} animate-pulse`}
          />
          <h3 className="font-medium text-stone-900">Encryption Status</h3>
        </div>
        <span className="text-xs text-stone-500 font-mono">AES-256-GCM Equivalent</span>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-stone-50 rounded-xl">
          <p className="text-xs text-stone-500 mb-1">Connection</p>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status.secure ? 'bg-green-500' : 'bg-rose-500'}`}
            />
            <span
              className={`text-sm font-medium ${status.secure ? 'text-green-700' : 'text-rose-700'}`}
            >
              {status.protocol}
            </span>
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl">
          <p className="text-xs text-stone-500 mb-1">Algorithm</p>
          <p className="text-sm font-medium text-stone-900">{status.algorithm}</p>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl">
          <p className="text-xs text-stone-500 mb-1">Key Length</p>
          <p className="text-sm font-medium text-stone-900">{status.keyLength}</p>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl">
          <p className="text-xs text-stone-500 mb-1">Key Rotation</p>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status.rotationRecommended ? 'bg-amber-500' : 'bg-green-500'}`}
            />
            <span
              className={`text-sm font-medium ${status.rotationRecommended ? 'text-amber-700' : 'text-green-700'}`}
            >
              {status.rotationRecommended ? 'Due' : `${status.daysUntilRotation} days`}
            </span>
          </div>
        </div>
      </div>

      {/* Security Indicators */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-sm">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-stone-700">End-to-end encrypted</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-stone-700">Zero-knowledge architecture</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-stone-700">Authenticated encryption (AEAD)</span>
        </div>
      </div>

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
      >
        {showDetails ? 'Hide details' : 'View details'}
        <svg
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detailed Info */}
      {showDetails && (
        <div className="mt-4 p-4 bg-stone-50 rounded-xl space-y-2">
          <p className="text-xs text-stone-500 font-mono">
            Cipher: XSalsa20-Poly1305 (libsodium-compatible)
          </p>
          <p className="text-xs text-stone-500 font-mono">
            Key Derivation: Argon2id-like (100k iterations)
          </p>
          <p className="text-xs text-stone-500 font-mono">Nonce: 24 bytes (random)</p>
          <p className="text-xs text-stone-500 font-mono">Auth Tag: 16 bytes (Poly1305)</p>
          {status.lastRotation && (
            <p className="text-xs text-stone-500 font-mono">
              Last Rotation: {status.lastRotation.toLocaleDateString()}
            </p>
          )}
          {status.nextRotationDue && (
            <p className="text-xs text-stone-500 font-mono">
              Next Rotation: {status.nextRotationDue.toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Warning if HTTP */}
      {!status.secure && (
        <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-200">
          <p className="text-sm text-rose-700 font-medium">⚠️ Insecure Connection</p>
          <p className="text-xs text-rose-600 mt-1">
            Your connection is not encrypted. Enable HTTPS to protect your data.
          </p>
        </div>
      )}

      {/* Rotation Warning */}
      {status.rotationRecommended && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-700 font-medium">⚠️ Key Rotation Recommended</p>
          <p className="text-xs text-amber-600 mt-1">
            Your encryption keys should be rotated for optimal security.
          </p>
          <button className="mt-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors">
            Rotate Keys
          </button>
        </div>
      )}
    </div>
  );
}

export default EncryptionStatus;
