import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiHome } from "react-icons/fi";
import { Button, Inputfield } from "../UI";
import { staffUser } from "../features/authSlice";
import {
  fetchWarehouses,
  fetchLocations,
  createWarehouse,
  createLocation,
  fetchWarehouseAccess,
  grantWarehouseAccess,
  revokeWarehouseAccess,
} from "../features/warehouseSlice";

const LOCATION_TYPES = [
  "zone",
  "aisle",
  "rack",
  "shelf",
  "bin",
  "receiving",
  "qc",
  "staging",
  "quarantine",
  "damaged",
  "returns",
];

const emptyWarehouseForm = { name: "", code: "" };
const emptyLocationForm = { code: "", name: "", location_type: "bin", parent_location_id: "" };

const LocationNode = ({ location, depth = 0 }) => (
  <div>
    <div
      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      style={{ marginLeft: depth * 16 }}
    >
      <span className="font-medium text-slate-800">
        {location.code} <span className="font-normal text-slate-500">— {location.name}</span>
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        {location.location_type}
      </span>
    </div>
    {location.children?.map((child) => (
      <LocationNode key={child.id} location={child} depth={depth + 1} />
    ))}
  </div>
);

const WarehouseSettingsPage = () => {
  const dispatch = useDispatch();
  const { warehouses, locations, access, isLoadingLocations, isLoadingAccess } = useSelector(
    (state) => state.warehouse,
  );
  const { staffuser } = useSelector((state) => state.auth);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [warehouseForm, setWarehouseForm] = useState(emptyWarehouseForm);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isSubmittingWarehouse, setIsSubmittingWarehouse] = useState(false);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    dispatch(fetchWarehouses());
    dispatch(staffUser());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length) {
      setSelectedWarehouseId(String(warehouses[0].id));
    }
  }, [warehouses, selectedWarehouseId]);

  useEffect(() => {
    if (selectedWarehouseId) {
      dispatch(fetchLocations(selectedWarehouseId));
      dispatch(fetchWarehouseAccess(selectedWarehouseId));
    }
  }, [dispatch, selectedWarehouseId]);

  const flatStaffList = useMemo(
    () => (Array.isArray(staffuser) ? staffuser : []),
    [staffuser],
  );
  const availableStaffToGrant = useMemo(
    () =>
      flatStaffList.filter(
        (s) => !access.some((a) => String(a.staff_user_id) === String(s.id)),
      ),
    [flatStaffList, access],
  );
  const flatLocationsForParent = useMemo(() => {
    const flatten = (nodes, acc = []) => {
      for (const node of nodes) {
        acc.push(node);
        if (node.children?.length) flatten(node.children, acc);
      }
      return acc;
    };
    return flatten(locations);
  }, [locations]);

  const handleCreateWarehouse = async (event) => {
    event.preventDefault();
    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setIsSubmittingWarehouse(true);
    const result = await dispatch(createWarehouse(warehouseForm));
    setIsSubmittingWarehouse(false);
    if (createWarehouse.fulfilled.match(result)) {
      toast.success("Warehouse created");
      setWarehouseForm(emptyWarehouseForm);
      setSelectedWarehouseId(String(result.payload.warehouse.id));
    } else {
      toast.error(result.payload || "Could not create warehouse");
    }
  };

  const handleCreateLocation = async (event) => {
    event.preventDefault();
    if (!locationForm.code.trim() || !locationForm.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setIsSubmittingLocation(true);
    const result = await dispatch(
      createLocation({
        warehouseId: selectedWarehouseId,
        ...locationForm,
        parent_location_id: locationForm.parent_location_id || undefined,
      }),
    );
    setIsSubmittingLocation(false);
    if (createLocation.fulfilled.match(result)) {
      toast.success("Location created");
      setLocationForm(emptyLocationForm);
      dispatch(fetchLocations(selectedWarehouseId));
    } else {
      toast.error(result.payload || "Could not create location");
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedStaffId) {
      toast.error("Select a staff member first");
      return;
    }
    setIsGranting(true);
    const result = await dispatch(
      grantWarehouseAccess({ warehouseId: selectedWarehouseId, staffUserId: Number(selectedStaffId) }),
    );
    setIsGranting(false);
    if (grantWarehouseAccess.fulfilled.match(result)) {
      toast.success("Access granted");
      setSelectedStaffId("");
      dispatch(fetchWarehouseAccess(selectedWarehouseId));
    } else {
      toast.error(result.payload || "Could not grant access");
    }
  };

  const handleRevokeAccess = async (staffUserId) => {
    const result = await dispatch(
      revokeWarehouseAccess({ warehouseId: selectedWarehouseId, staffUserId }),
    );
    if (revokeWarehouseAccess.fulfilled.match(result)) {
      toast.success("Access revoked");
    } else {
      toast.error(result.payload || "Could not revoke access");
    }
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex items-center gap-2">
          <FiHome className="text-teal-700" size={22} />
          <h1 className="text-xl font-semibold text-slate-900">Warehouses</h1>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <section className="rounded-2xl border bg-base-100 p-4 shadow-md">
              <h2 className="mb-2 text-sm font-semibold text-teal-800">Your warehouses</h2>
              <ul className="space-y-1">
                {warehouses.map((w) => (
                  <li key={w.id}>
                    <button
                      onClick={() => setSelectedWarehouseId(String(w.id))}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        String(w.id) === selectedWarehouseId
                          ? "bg-teal-600 text-white"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {w.name} <span className="opacity-70">({w.code})</span>
                      {w.is_default ? " · default" : ""}
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-2 border-t pt-3">
                <Inputfield
                  label="New warehouse name"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Inputfield
                  label="Code"
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm((f) => ({ ...f, code: e.target.value }))}
                />
                <Button type="submit" size="sm" className="w-full" loading={isSubmittingWarehouse}>
                  <FiPlus /> Add warehouse
                </Button>
              </form>
            </section>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {selectedWarehouseId ? (
              <>
                <section className="rounded-2xl border bg-base-100 p-4 shadow-md">
                  <h2 className="mb-2 text-sm font-semibold text-teal-800">Locations / bins</h2>
                  {isLoadingLocations ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : locations.length ? (
                    <div className="space-y-1">
                      {locations.map((loc) => (
                        <LocationNode key={loc.id} location={loc} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No locations yet.</p>
                  )}

                  <form
                    onSubmit={handleCreateLocation}
                    className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4"
                  >
                    <Inputfield
                      label="Code"
                      value={locationForm.code}
                      onChange={(e) => setLocationForm((f) => ({ ...f, code: e.target.value }))}
                    />
                    <Inputfield
                      label="Name"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                        value={locationForm.location_type}
                        onChange={(e) =>
                          setLocationForm((f) => ({ ...f, location_type: e.target.value }))
                        }
                      >
                        {LOCATION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Parent (optional)
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                        value={locationForm.parent_location_id}
                        onChange={(e) =>
                          setLocationForm((f) => ({ ...f, parent_location_id: e.target.value }))
                        }
                      >
                        <option value="">None (top-level)</option>
                        {flatLocationsForParent.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="col-span-2 sm:col-span-4"
                      loading={isSubmittingLocation}
                    >
                      <FiPlus /> Add location
                    </Button>
                  </form>
                </section>

                <section className="rounded-2xl border bg-base-100 p-4 shadow-md">
                  <h2 className="mb-2 text-sm font-semibold text-teal-800">Staff access</h2>
                  <p className="mb-2 text-xs text-slate-500">
                    Admins and managers always have full access. Staff need to be granted access to
                    a warehouse before they can use Receiving there.
                  </p>
                  {isLoadingAccess ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : access.length ? (
                    <ul className="space-y-1">
                      {access.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <span>
                            {a.name} <span className="text-slate-500">({a.email})</span>
                          </span>
                          <button
                            onClick={() => handleRevokeAccess(a.staff_user_id)}
                            className="text-red-600 hover:text-red-700"
                            title="Revoke access"
                          >
                            <FiTrash2 />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No staff granted access yet.</p>
                  )}

                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <select
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                    >
                      <option value="">Select a staff member…</option>
                      {availableStaffToGrant.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleGrantAccess} loading={isGranting} size="sm">
                      Grant access
                    </Button>
                  </div>
                </section>
              </>
            ) : (
              <p className="text-sm text-slate-500">Create a warehouse to get started.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseSettingsPage;
