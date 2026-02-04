// src/pages/ClearingJobsPage.jsx - NEW

import React from "react";

const ClearingJobsPage = ({ agentView = false }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {agentView ? "My Clearing Jobs" : "Clearing Jobs"}
          </h1>
          <p className="text-gray-600 mt-1">Manage customs clearing jobs</p>
        </div>
        {!agentView && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Assign Job
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Clearing jobs module coming soon...</p>
      </div>
    </div>
  );
};

export default ClearingJobsPage;
