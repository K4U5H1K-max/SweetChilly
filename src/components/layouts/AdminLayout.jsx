import React from 'react';

export default function AdminLayout({ children }) {
  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col font-sans">
      {children}
    </div>
  );
}
