/**
 * useUserAccess Hook
 * Client-side hook to get current user's access level and permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { AccessLevel } from '@/types/access-control';

export interface UserAccessInfo {
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
  isInstitutionAdmin: boolean;
  isMentorIncharge: boolean;
  mentorInchargeInstitutionId: string | null;
}

export function useUserAccess() {
  const { user, accessToken } = useAuth();
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccessInfo() {
      if (user && accessToken) {
        // JKKN Role Mapping to Mentor Module Access Levels
        // super_admin, administrator, digital_coordinator → super_admin (full access)
        // principal → institution_admin (institution-level access)
        // hod → hod (department-level oversight)
        // faculty → mentor (standard mentor access)
        // staff, student → blocked from system at login
        const roleMap: Record<string, AccessLevel> = {
          'super_admin': 'super_admin',
          'administrator': 'super_admin',
          'digital_coordinator': 'institution_admin',
          'principal': 'institution_admin',
          'hod': 'hod',
          'faculty': 'mentor',
        };
        let role = roleMap[user.role] as AccessLevel;

        if (!role) {
          console.error(`[useUserAccess] Unknown role: ${user.role}`);
        }

        // Fetch authoritative access info from API
        let isMentorIncharge = false;
        let mentorInchargeInstitutionId: string | null = null;
        let institutionId = user.institution_id || null;
        let departmentId = user.department_id || null;

        try {
          // Use fetchWithAuthRetry to automatically retry on 401 after refreshing token
          const response = await fetchWithAuthRetry('/api/user/access-info', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            isMentorIncharge = data.isMentorIncharge || false;
            mentorInchargeInstitutionId = data.mentorInchargeInstitutionId || null;
            // The API role comes from our DB via getUserAccess() and is
            // authoritative — the localStorage user carries the raw JKKN token
            // role, which omits in-app grants like 'hod'. The server calls the
            // standard mentor level 'faculty'; the client calls it 'mentor'.
            if (data.role) {
              role = data.role === 'faculty' ? 'mentor' : (data.role as AccessLevel);
            }
            institutionId = data.institutionId ?? institutionId;
            departmentId = data.departmentId ?? departmentId;
            console.log('[useUserAccess] ✓ Got access info:', { role, isMentorIncharge, mentorInchargeInstitutionId });
          } else {
            console.error('[useUserAccess] API returned:', response.status);
          }
        } catch (error) {
          console.error('[useUserAccess] Error checking mentor incharge status:', error);
        }

        setAccessInfo({
          role,
          institutionId,
          departmentId,
          isSuperAdmin: role === 'super_admin',
          isInstitutionAdmin: role === 'institution_admin',
          isMentorIncharge,
          mentorInchargeInstitutionId,
        });
      }
      setLoading(false);
    }

    fetchAccessInfo();
  }, [user, accessToken]);

  return { accessInfo, loading };
}

/**
 * Get access level display label
 */
export function getAccessLevelLabel(role: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    super_admin: 'Super Admin',
    institution_admin: 'Institution Admin',
    hod: 'Head of Department',
    mentor: 'Mentor',
    student: 'Student',
  };

  return labels[role] || role;
}

/**
 * Get access level badge color
 */
export function getAccessLevelColor(role: AccessLevel): string {
  const colors: Record<AccessLevel, string> = {
    super_admin: 'bg-red-100 text-red-800',
    institution_admin: 'bg-green-100 text-green-800',
    hod: 'bg-amber-100 text-amber-800',
    mentor: 'bg-blue-100 text-blue-800',
    student: 'bg-gray-100 text-gray-800',
  };

  return colors[role] || colors.student;
}
