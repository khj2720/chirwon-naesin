import React, { useState } from 'react';
import { UploadCloud, Loader2, Lock, X, Eye, EyeOff } from 'lucide-react';
import { ClassData, parseFile } from '../lib/parser';
import { motion, AnimatePresence } from 'motion/react';

interface UploadScreenProps {
  onUpload: (classes: ClassData[]) => void;
}

export function UploadScreen({ onUpload }: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Decryption States
  const [pendingBuffer, setPendingBuffer] = useState<ArrayBuffer | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setPendingBuffer(null);
    if (!file.name.endsWith('.xlsx')) {
      setError('xlsx 파일만 업로드 가능합니다');
      return;
    }
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      setPendingBuffer(arrayBuffer); // Store buffer for potential manually decryption retry

      // Try parsing without password first
      try {
        const classes = await parseFile(arrayBuffer);
        if (!classes || !classes.length) {
          setError('파일 형식을 인식하지 못했습니다. 나이스 지필평가 학급별 일람표 파일인지 확인해주세요');
          setLoading(false);
          return;
        }
        onUpload(classes);
      } catch (err: any) {
        const errMsg = String(err?.message || '');
        // SheetJS / JSZip password protected/encrypted file errors usually include password, decrypt, or crypto
        if (
          errMsg.toLowerCase().includes('password') || 
          errMsg.toLowerCase().includes('decrypt') || 
          errMsg.toLowerCase().includes('crypto') ||
          errMsg.toLowerCase().includes('wrong password') ||
          errMsg.toLowerCase().includes('encrypted') ||
          errMsg.toLowerCase().includes('decryption')
        ) {
          setShowPasswordModal(true);
          setPassword('');
          setError(null);
          setLoading(false);
        } else {
          // Fallback to normal error handler, but still keep pendingBuffer so they can click "암호 입력하여 열기" if they want
          throw err;
        }
      }
    } catch (err: any) {
      setError('파일 파싱 중 오류가 발생했습니다: ' + err.message);
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingBuffer) return;
    setLoading(true);
    setError(null);
    setShowPasswordModal(false);

    // Give a brief delay for UI smooth transtion and loading spinner to start
    setTimeout(async () => {
      try {
        const classes = await parseFile(pendingBuffer, password);
        if (!classes || !classes.length) {
          setError('파일 형식을 인식하지 못했습니다. 나이스 지필평가 학급별 일람표 파일인지 확인해주세요');
          setLoading(false);
          return;
        }
        onUpload(classes);
      } catch (err: any) {
        setError('올바르지 않은 암호이거나 파일 복호화에 실패했습니다. 암호를 확인 후 다시 업로드해주세요.');
        setLoading(false);
      }
    }, 120);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="sticky top-0 z-20 flex min-h-[52px] items-center justify-between border-b border-divider bg-surface px-6 py-2">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <span>1차 시험 분석</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
        <div className="animate-bounce" aria-hidden="true">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-light text-primary">
            <UploadCloud className="h-12 w-12" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-primary">1차 시험 분석</h1>
        <p className="text-center text-sm text-text-muted">학교 지필평가 학급별 일람표 분석</p>
        
        <div className="flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-xs font-medium text-primary">
          📁 파일은 브라우저에서만 처리되며 서버에 전송되지 않습니다
        </div>

        <label
          className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-all ${
            isDragging ? 'border-primary bg-primary-light' : 'border-border bg-surface hover:border-primary hover:bg-primary-light'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <UploadCloud className="h-10 w-10 text-text-muted" strokeWidth={1.5} />
          <p className="text-sm text-text-muted">여기에 파일을 끌어다 놓거나</p>
          <span className="btn btn-primary pointer-events-none">파일 선택</span>
          <input 
            type="file" 
            accept=".xlsx" 
            className="sr-only" 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="!text-xs !text-text-faint">나이스 지필평가 학급별 일람표 .xlsx</p>
        </label>

        {error && (
          <div className="w-full flex flex-col gap-2 rounded-xl bg-grade-5-bg p-4 text-center text-sm text-grade-5 border border-rose-200/40" role="alert">
            <p className="font-medium">{error}</p>
            {pendingBuffer && (
              <button 
                type="button" 
                onClick={() => {
                  setError(null);
                  setShowPasswordModal(true);
                  setPassword('');
                }}
                className="mt-1.5 self-center inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:underline bg-white/30 px-3 py-1.5 rounded-lg border border-rose-300/30 transition-all cursor-pointer"
              >
                <Lock className="h-3 w-3" />
                <span>암호가 걸린 Excel 파일입니까? 암호 입력하여 열기</span>
              </button>
            )}
          </div>
        )}
        
        {loading && (
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>파일 분석 중...</span>
          </div>
        )}
      </div>

      {/* Password Decryption Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPasswordModal(false);
                setPendingBuffer(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm rounded-2xl border border-divider bg-surface p-6 shadow-xl z-20 text-text"
            >
              <button 
                type="button" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingBuffer(null);
                }}
                className="absolute right-4 top-4 text-text-muted hover:text-text cursor-pointer p-1 rounded-lg hover:bg-surface-offset transition-colors"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4 select-none">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                
                <h2 className="text-base font-black text-text mb-1">암호화된 엑셀 파일 열기</h2>
                <p className="text-xs text-text-muted mb-5 leading-relaxed">
                  이 파일은 비밀번호로 안전하게 암호화되어 보호되고 있습니다. 파일의 암호를 입력해주세요.
                </p>
                
                <form onSubmit={handlePasswordSubmit} className="w-full text-left">
                  <div className="relative mb-4">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      placeholder="문서 비밀번호 입력"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 pr-10 text-xs font-semibold text-text focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1 rounded transition-colors"
                      aria-label="암호 표시 전환"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPendingBuffer(null);
                      }}
                      className="flex-1 btn btn-ghost text-xs cursor-pointer"
                    >
                      취소
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 btn btn-primary text-xs cursor-pointer"
                    >
                      확인
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
