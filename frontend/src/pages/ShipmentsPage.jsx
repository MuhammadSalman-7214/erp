// src/pages/ShipmentsPage.jsx - NEW

import React from "react";

const ShipmentsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-600 mt-1">Manage import/export shipments</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Shipment
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Shipments module coming soon...</p>
      </div>
    </div>
  );
};

export default ShipmentsPage;
