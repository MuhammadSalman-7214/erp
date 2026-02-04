// src/pages/CreateShipmentPage.jsx - NEW

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { gettingallSupplier } from "../features/SupplierSlice";
import { fetchCustomers } from "../features/customerSlice";

const CreateShipmentPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { getallSupplier } = useSelector((state) => state.supplier);
  const { customers } = useSelector((state) => state.customers);

  const [shipmentType, setShipmentType] = useState("Import");
  const [transportMode, setTransportMode] = useState("Sea");
  const [goodsValue, setGoodsValue] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [containerNumber, setContainerNumber] = useState("");
  const [containerType, setContainerType] = useState("");
  const [numberOfPackages, setNumberOfPackages] = useState("");
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [freightCharges, setFreightCharges] = useState(0);
  const [insuranceCharges, setInsuranceCharges] = useState(0);
  const [customsDuty, setCustomsDuty] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    dispatch(gettingallSupplier());
    dispatch(fetchCustomers());
  }, [dispatch]);

  const submitShipment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        countryId: user?.countryId?._id || user?.countryId,
        branchId: user?.branchId?._id || user?.branchId,
        shipmentType,
        transportMode,
        goodsValue: Number(goodsValue),
        sellingPrice: Number(sellingPrice),
        supplierId: supplierId || undefined,
        customerId: customerId || undefined,
        incoterm: incoterm || undefined,
        referenceNumber: referenceNumber || undefined,
        containerNumber: containerNumber || undefined,
        containerType: containerType || undefined,
        numberOfPackages: numberOfPackages
          ? Number(numberOfPackages)
          : undefined,
        originCountry: originCountry || undefined,
        destinationCountry: destinationCountry || undefined,
        originPort: originPort || undefined,
        destinationPort: destinationPort || undefined,
        carrierName: carrierName || undefined,
        vesselName: vesselName || undefined,
        flightNumber: flightNumber || undefined,
        freightCharges: Number(freightCharges),
        insuranceCharges: Number(insuranceCharges),
        customsDuty: Number(customsDuty),
        otherExpenses: Number(otherExpenses),
        notes: notes || undefined,
      };
      await axiosInstance.post("/shipment", payload);
      toast.success("Shipment created");
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create shipment");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Shipment</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <form
          onSubmit={submitShipment}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <select
            className="border rounded px-3 py-2"
            value={shipmentType}
            onChange={(e) => setShipmentType(e.target.value)}
          >
            {["Import", "Export", "Domestic"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value)}
          >
            {["Sea", "Air", "Road", "Rail"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Goods Value"
            value={goodsValue}
            onChange={(e) => setGoodsValue(e.target.value)}
          />
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Selling Price"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Select Supplier (optional)</option>
            {(getallSupplier || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select Customer (optional)</option>
            {(customers || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {/* <input
            className="border bg-red-50 rounded px-3 py-2"
            placeholder="Incoterm"
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value)}
          /> */}
          <select
            className="border rounded px-3 py-2"
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value)}
          >
            <option value="">Select Incoterm</option>
            {[
              "EXW",
              "FCA",
              "FAS",
              "FOB",
              "CFR",
              "CIF",
              "CPT",
              "CIP",
              "DAP",
              "DPU",
              "DDP",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            className="border rounded px-3 py-2"
            placeholder="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Container Number"
            value={containerNumber}
            onChange={(e) => setContainerNumber(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Container Type"
            value={containerType}
            onChange={(e) => setContainerType(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Number of Packages"
            value={numberOfPackages}
            onChange={(e) => setNumberOfPackages(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Origin Port"
            value={originPort}
            onChange={(e) => setOriginPort(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Destination Port"
            value={destinationPort}
            onChange={(e) => setDestinationPort(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Origin Country"
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Destination Country"
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Carrier Name"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Vessel Name (Sea)"
            value={vesselName}
            onChange={(e) => setVesselName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Flight Number (Air)"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
          />
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Freight Charges"
            value={freightCharges}
            onChange={(e) => setFreightCharges(e.target.value)}
          />
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Insurance Charges"
            value={insuranceCharges}
            onChange={(e) => setInsuranceCharges(e.target.value)}
          />
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Customs Duty"
            value={customsDuty}
            onChange={(e) => setCustomsDuty(e.target.value)}
          />
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Other Expenses"
            value={otherExpenses}
            onChange={(e) => setOtherExpenses(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-teal-600 text-white rounded">
              Create
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShipmentPage;
