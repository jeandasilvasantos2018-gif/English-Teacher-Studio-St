import React, { useState } from 'react';
import { testSupabaseConnection, SupabaseTestResult } from '../services/supabaseTest';
import { Database, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

interface SupabaseTestProps {
  onBack?: () => void;
}

export const SupabaseTest: React.FC<SupabaseTestProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupabaseTestResult | null>(null);

  const handleTestConnection = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await testSupabaseConnection();
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        error: err,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Supabase Connection Test
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Página temporária para testar a integração do cliente Supabase.
            </p>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Verificação de Conexão
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clique no botão abaixo para executar a consulta de teste na tabela <code className="font-mono text-indigo-600 dark:text-indigo-400">profiles</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={loading}
          className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Testing Connection...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>Test Supabase Connection</span>
            </>
          )}
        </button>

        {result && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {result.success ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-800 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Supabase connection successful</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Dados retornados da consulta:
                </p>
                <pre className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-rose-800 dark:text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Supabase connection failed</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Detalhes do erro:
                </p>
                <pre className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-rose-200/60 dark:border-rose-800/60 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                  {JSON.stringify(result.error, null, 2) || String(result.error)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
