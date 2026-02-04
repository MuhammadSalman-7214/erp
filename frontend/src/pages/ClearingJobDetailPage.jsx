// src/pages/ClearingJobDetailPage.jsx - NEW

import React from "react";
import { useParams } from "react-router-dom";

const ClearingJobDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clearing Job Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Job ID: {id}</p>
        <p className="text-gray-600 mt-2">Details coming soon...</p>
      </div>
    </div>
  );
};

export default ClearingJobDetailPage;
