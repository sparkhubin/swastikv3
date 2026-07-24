import React from 'react';
import AdminDashboard from './admin/AdminDashboard';

export default function Admin({ onViewChange }) {
  return <AdminDashboard onViewChange={onViewChange} />;
}
