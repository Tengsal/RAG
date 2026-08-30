'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CallingAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  preferredLanguage: string;
  reasonForCall: string;
  consent: boolean;
}

interface FormErrors {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  preferredLanguage?: string;
  reasonForCall?: string;
  consent?: string;
}

const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
];

export function CallingAgentModal({ isOpen, onClose }: CallingAgentModalProps) {
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    preferredLanguage: 'English',
    reasonForCall: 'General inquiry',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus management and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto focus first input after mount
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
      // Reset modal state when closed
      setStep('form');
      setFormData({
        fullName: '',
        phoneNumber: '',
        email: '',
        preferredLanguage: 'English',
        reasonForCall: 'General inquiry',
        consent: false,
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step !== 'loading') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  if (!isOpen) return null;

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value || !value.toString().trim()) return 'Full name is required';
        if (value.toString().trim().length < 2) return 'Name must be at least 2 characters';
        return undefined;

      case 'phoneNumber':
        if (!value || !value.toString().trim()) return 'Phone number is required';
        // Basic phone number validation: allows +, -, spaces, parens, and numbers (at least 7 digits)
        const digitsOnly = value.toString().replace(/\D/g, '');
        if (digitsOnly.length < 7) return 'Please enter a valid phone number (at least 7 digits)';
        return undefined;

      case 'email':
        if (!value || !value.toString().trim()) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.toString().trim())) return 'Please enter a valid email address';
        return undefined;

      case 'preferredLanguage':
        if (!value) return 'Please select a preferred language';
        return undefined;

      case 'reasonForCall':
        if (!value || !value.toString().trim()) return 'Please describe the reason for your call';
        if (value.toString().trim().length < 5) return 'Reason should be at least 5 characters';
        return undefined;

      case 'consent':
        if (!value) return 'You must agree to be contacted to proceed';
        return undefined;

      default:
        return undefined;
    }
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Only name + phone are required for submission; email, reason and
    // consent stay optional UI fields for now.
    (['fullName', 'phoneNumber'] as Array<keyof FormData>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all as touched
    const allTouched: Record<string, boolean> = {};
    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateAll()) return;

    setStep('loading');

    try {
      const res = await fetch('/api/voice/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: formData.fullName, phoneNumber: formData.phoneNumber }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to dispatch call');
      }

      setStep('success');
    } catch (err: any) {
      console.error('[modal] dispatch error:', err);
      setStep('form');
      alert(err.message || 'Failed to request call. Please try again.');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node) && step !== 'loading') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calling-agent-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[28px] border border-white/50 shadow-[0_25px_60px_-15px_rgba(68,65,204,0.3)] overflow-hidden transition-all duration-300"
      >
        {/* Header Ambient Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#4441cc]/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9026c3]/20 rounded-full blur-[60px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative px-6 sm:px-8 pt-7 pb-4 border-b border-[#c7c4d7]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-xl">phone_in_talk</span>
            </div>
            <div>
              <h2
                id="calling-agent-modal-title"
                className="text-lg sm:text-xl font-bold text-[#1a1c1c] tracking-tight"
              >
                Request AI Calling Agent
              </h2>
              <p className="text-xs text-[#464554] opacity-80">
                Direct audio assistant callback
              </p>
            </div>
          </div>

          {step !== 'loading' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#eeeeee] hover:bg-[#e8e8e8] text-[#464554] flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {/* STEP 1: FORM */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#464554] leading-relaxed mb-4">
                Fill out your information below. Our automated AI Voice Agent will prepare your context and initiate an instant callback.
              </p>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                  Full Name <span className="text-[#9026c3]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#777586]">
                    person
                  </span>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="e.g. Alex Johnson"
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#f3f3f4] text-sm text-[#1a1c1c] rounded-xl border transition-all placeholder:text-[#777586]/60 focus:outline-none ${
                      errors.fullName && touched.fullName
                        ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                        : 'border-[#c7c4d7]/50 focus:border-[#4441cc] focus:bg-white'
                    }`}
                  />
                </div>
                {errors.fullName && touched.fullName && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Phone & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                    Phone Number <span className="text-[#9026c3]">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#777586]">
                      call
                    </span>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      onBlur={() => handleBlur('phoneNumber')}
                      placeholder="+1 (555) 019-2834"
                      className={`w-full pl-10 pr-4 py-2.5 bg-[#f3f3f4] text-sm text-[#1a1c1c] rounded-xl border transition-all placeholder:text-[#777586]/60 focus:outline-none ${
                        errors.phoneNumber && touched.phoneNumber
                          ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                          : 'border-[#c7c4d7]/50 focus:border-[#4441cc] focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.phoneNumber && touched.phoneNumber && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                    Email Address <span className="text-[#9026c3]">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#777586]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="alex@example.com"
                      className={`w-full pl-10 pr-4 py-2.5 bg-[#f3f3f4] text-sm text-[#1a1c1c] rounded-xl border transition-all placeholder:text-[#777586]/60 focus:outline-none ${
                        errors.email && touched.email
                          ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                          : 'border-[#c7c4d7]/50 focus:border-[#4441cc] focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                  Preferred Language <span className="text-[#9026c3]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#777586]">
                    translate
                  </span>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                    onBlur={() => handleBlur('preferredLanguage')}
                    className={`w-full pl-10 pr-8 py-2.5 bg-[#f3f3f4] text-sm text-[#1a1c1c] rounded-xl border transition-all focus:outline-none appearance-none cursor-pointer ${
                      errors.preferredLanguage && touched.preferredLanguage
                        ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                        : 'border-[#c7c4d7]/50 focus:border-[#4441cc] focus:bg-white'
                    }`}
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[#777586] pointer-events-none">
                    expand_more
                  </span>
                </div>
                {errors.preferredLanguage && touched.preferredLanguage && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {errors.preferredLanguage}
                  </p>
                )}
              </div>

              {/* Reason for Call */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                  Reason for Call <span className="text-[#9026c3]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.reasonForCall}
                  onChange={(e) => handleChange('reasonForCall', e.target.value)}
                  onBlur={() => handleBlur('reasonForCall')}
                  placeholder="Describe your inquiry (e.g., ADTU admission procedure, fee structures, course details...)"
                  className={`w-full p-3 bg-[#f3f3f4] text-sm text-[#1a1c1c] rounded-xl border transition-all placeholder:text-[#777586]/60 focus:outline-none resize-none ${
                    errors.reasonForCall && touched.reasonForCall
                      ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                      : 'border-[#c7c4d7]/50 focus:border-[#4441cc] focus:bg-white'
                  }`}
                />
                {errors.reasonForCall && touched.reasonForCall && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {errors.reasonForCall}
                  </p>
                )}
              </div>

              {/* Consent Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.consent}
                    onChange={(e) => handleChange('consent', e.target.checked)}
                    onBlur={() => handleBlur('consent')}
                    className="mt-0.5 w-4 h-4 rounded border-[#c7c4d7] text-[#4441cc] focus:ring-[#4441cc] cursor-pointer"
                  />
                  <span className="text-xs text-[#464554] leading-tight select-none">
                    I agree to be contacted regarding my request via voice audio assistant or phone call. <span className="text-[#9026c3]">*</span>
                  </span>
                </label>
                {errors.consent && touched.consent && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {errors.consent}
                  </p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c7c4d7]/30">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#464554] hover:bg-[#eeeeee] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#4441cc] hover:bg-[#3936b8] text-white text-xs font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(68,65,204,0.4)] transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">phone_callback</span>
                  <span>Request a Call</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: LOADING SIMULATION */}
          {step === 'loading' && (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Outer Wave Pulse */}
                <div className="absolute inset-0 rounded-full bg-[#4441cc]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-[#9026c3]/20 animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-xl">
                  <span className="material-symbols-outlined text-2xl animate-bounce">
                    phone_in_talk
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1a1c1c] mb-1">
                  Connecting to AI Voice Agent...
                </h3>
                <p className="text-xs text-[#464554]">
                  Processing caller context for <span className="font-semibold text-[#4441cc]">{formData.fullName}</span>
                </p>
              </div>

              {/* Neural Loading Bar */}
              <div className="w-48 h-2 bg-[#eeeeee] rounded-full overflow-hidden mt-2">
                <div className="h-full w-full neural-progress rounded-full" />
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && (
            <div className="py-4 text-center flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg border border-emerald-200">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#1a1c1c]">Request Received!</h3>
                <p className="text-xs text-[#464554] mt-1 max-w-sm mx-auto">
                  Our AI calling assistant will contact you soon at{' '}
                  <span className="font-semibold text-[#4441cc]">{formData.phoneNumber}</span>.
                </p>
              </div>

              {/* Request Summary Card */}
              <div className="w-full bg-[#f9f9f9] border border-[#c7c4d7]/40 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#777586]">Name:</span>
                  <span className="font-semibold text-[#1a1c1c]">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777586]">Email:</span>
                  <span className="font-semibold text-[#1a1c1c]">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777586]">Language:</span>
                  <span className="font-semibold text-[#1a1c1c]">{formData.preferredLanguage}</span>
                </div>
                <div className="pt-2 border-t border-[#c7c4d7]/30">
                  <span className="text-[#777586] block mb-1">Reason for Call:</span>
                  <p className="text-[#1a1c1c] italic bg-white p-2 rounded-lg border border-[#c7c4d7]/30">
                    "{formData.reasonForCall}"
                  </p>
                </div>
              </div>

              <div className="pt-2 w-full flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#3936b8] shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
