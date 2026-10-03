import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Public registration has been permanently removed for production security.
 * Accounts can only be created by an authorized Manager/Admin.
 */
export const RegisterPage: React.FC = () => {
  return <Navigate to="/login" replace />;
};

export default RegisterPage;
