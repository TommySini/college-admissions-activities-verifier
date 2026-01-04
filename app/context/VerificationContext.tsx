'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Verification } from '../types';

interface VerificationContextType {
  verifications: Verification[];
  sendVerification: (
    verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => void;
  updateVerificationStatus: (
    id: string,
    status: 'accepted' | 'rejected',
    applicantId?: string
  ) => void;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [verifications, setVerifications] = useState<Verification[]>([]);

  // Load verifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('verifications');
    if (stored) {
      try {
        setVerifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load verifications:', e);
      }
    }
  }, []);

  // Save verifications to localStorage
  useEffect(() => {
    if (verifications.length > 0 || localStorage.getItem('verifications')) {
      localStorage.setItem('verifications', JSON.stringify(verifications));
    }
  }, [verifications]);

  const sendVerification = (
    verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => {
    const newVerification: Verification = {
      ...verification,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVerifications((prev) => [...prev, newVerification]);
  };

  const updateVerificationStatus = (
    id: string,
    status: 'accepted' | 'rejected',
    applicantId?: string
  ) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status,
              applicantId: applicantId || v.applicantId,
              updatedAt: new Date().toISOString(),
            }
          : v
      )
    );
  };

  return (
    <VerificationContext.Provider
      value={{
        verifications,
        sendVerification,
        updateVerificationStatus,
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerifications() {
  const context = useContext(VerificationContext);
  if (context === undefined) {
    throw new Error('useVerifications must be used within a VerificationProvider');
  }
  return context;
}
