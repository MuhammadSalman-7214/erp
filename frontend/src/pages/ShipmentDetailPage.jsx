// src/pages/ShipmentDetailPage.jsx - NEW

import React from "react";
import { useParams } from "react-router-dom";

const ShipmentDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shipment Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Shipment ID: {id}</p>
        <p className="text-gray-600 mt-2">Details coming soon...</p>
      </div>
    </div>
  );
};

export default ShipmentDetailPage;
