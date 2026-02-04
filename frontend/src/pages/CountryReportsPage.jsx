// src/pages/CountryReportsPage.jsx - NEW

import React from "react";
import { useSelector } from "react-redux";

const CountryReportsPage = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Country Reports</h1>
      <p className="text-gray-600">
        Reports for {user?.country?.name || "all countries"}
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Country reports coming soon...</p>
      </div>
    </div>
  );
};

export default CountryReportsPage;
