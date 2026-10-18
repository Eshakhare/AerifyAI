/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Authentication Modal Adapter
 * Re-exports AuthModal for backwards compatibility.
 */

import React from 'react';
import { ApiClient } from '../../api/ApiClient';
import { Role, SessionInfo } from '../../contracts/types';
import { AuthModal } from './AuthModal';

interface OfficerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: Role, updatedSession?: SessionInfo) => void;
  apiClient?: ApiClient;
}

export const OfficerAuthModal: React.FC<OfficerAuthModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  apiClient
}) => {
  return (
    <AuthModal
      isOpen={isOpen}
      onClose={onClose}
      onLoginSuccess={(user, updatedSession) => {
        onSelectRole(user.role, updatedSession);
      }}
      apiClient={apiClient}
    />
  );
};
