'use client';

import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  performSecurityAudit,
  type SecurityAuditReport,
  type SecurityCheck,
} from '../../lib/security/securityAudit';
import { runEncryptionAudit } from '../../lib/security/encryptionVerification';

interface AuditState {
  report: SecurityAuditReport | null;
  encryptionReport: Awaited<ReturnType<typeof runEncryptionAudit>> | null;
  loading: boolean;
  error: string | null;
}

/**
 * Security Audit Report Component
 * Displays comprehensive security audit results
 */
export function SecurityAuditReport(): ReactElement {
  const [state, setState] = useState<AuditState>({
    report: null,
    encryptionReport: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [report, encryptionReport] = await Promise.all([
        performSecurityAudit(),
        runEncryptionAudit(),
      ]);

      setState({
        report,
        encryptionReport,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Audit failed',
      }));
    }
  };

  if (state.loading) {
    return (
      <div className="p-6 bg-stone-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-600">Running security audit...</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200">
        <h3 className="text-rose-700 font-medium mb-2">Audit Failed</h3>
        <p className="text-rose-600 text-sm">{state.error}</p>
        <button
          onClick={runAudit}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  const { report, encryptionReport } = state;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={`p-6 rounded-2xl border-2 ${
          report?.overallStatus === 'secure'
            ? 'bg-green-50 border-green-200'
            : report?.overallStatus === 'warning'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-rose-50 border-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              report?.overallStatus === 'secure'
                ? 'bg-green-500'
                : report?.overallStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }`}
          />
          <h2 className="text-xl font-serif font-medium text-stone-900">
            Security Status:{' '}
            {report?.overallStatus === 'secure'
              ? 'Secure'
              : report?.overallStatus === 'warning'
                ? 'Warning'
                : 'Vulnerable'}
          </h2>
        </div>
        <p className="mt-2 text-stone-600">
          Last audit: {new Date(report?.timestamp || '').toLocaleString()}
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="text-green-600">✓ {report?.summary.passed} passed</span>
          <span className="text-amber-600">⚠ {report?.summary.warnings} warnings</span>
          <span className="text-rose-600">✗ {report?.summary.failed} failed</span>
        </div>
      </div>

      {/* Security Checks */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
          <h3 className="font-medium text-stone-900">Security Checks</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {report?.checks.map((check, index) => (
            <SecurityCheckItem key={index} check={check} />
          ))}
        </div>
      </div>

      {/* Encryption Status */}
      {encryptionReport && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
            <h3 className="font-medium text-stone-900">Encryption Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-500">Algorithm</p>
                <p className="font-medium text-stone-900">
                  {encryptionReport.encryption.algorithm}
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-500">Key Length</p>
                <p className="font-medium text-stone-900">
                  {encryptionReport.encryption.keyLength} bits
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-500">Authenticated</p>
                <p
                  className={`font-medium ${encryptionReport.encryption.authenticated ? 'text-green-600' : 'text-rose-600'}`}
                >
                  {encryptionReport.encryption.authenticated ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-500">Connection</p>
                <p
                  className={`font-medium ${encryptionReport.connection.secure ? 'text-green-600' : 'text-rose-600'}`}
                >
                  {encryptionReport.connection.secure ? 'HTTPS' : 'HTTP'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {encryptionReport.encryption.details.map((detail, index) => (
                <p key={index} className="text-sm text-stone-600 font-mono">
                  {detail}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {encryptionReport?.recommendations && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h3 className="font-medium text-amber-900 mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {encryptionReport.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-600 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={runAudit}
          className="px-6 py-3 bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-colors font-medium"
        >
          Run New Audit
        </button>
      </div>
    </div>
  );
}

/**
 * Individual security check item
 */
function SecurityCheckItem({ check }: { check: SecurityCheck }): ReactElement {
  return (
    <div className="px-6 py-4 flex items-start gap-4">
      <div
        className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          check.status === 'pass'
            ? 'bg-green-100 text-green-600'
            : check.status === 'warning'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-rose-100 text-rose-600'
        }`}
      >
        {check.status === 'pass' ? '✓' : check.status === 'warning' ? '⚠' : '✗'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-stone-900">{check.name}</h4>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              check.status === 'pass'
                ? 'bg-green-100 text-green-700'
                : check.status === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
            }`}
          >
            {check.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">{check.message}</p>
        {check.details && <p className="mt-1 text-xs text-stone-500">{check.details}</p>}
        {check.owaspCategory && (
          <p className="mt-1 text-xs text-stone-400">{check.owaspCategory}</p>
        )}
      </div>
    </div>
  );
}

export default SecurityAuditReport;
