// src/pages/BranchReportsPage.jsx - NEW

import React from "react";
import { useSelector } from "react-redux";

const BranchReportsPage = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Branch Reports</h1>
      <p className="text-gray-600">
        Reports for {user?.branch?.name || "all branches"}
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Branch reports coming soon...</p>
      </div>
    </div>
  );
};

export default BranchReportsPage;
