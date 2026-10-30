import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { TiDelete } from "react-icons/ti";
import image from "../images/user.png";
import {
  staffUser,
  managerUser,
  adminUser,
  removeusers,
  createTeamMember,
  setJobFunctions,
  setReportsTo,
} from "../features/authSlice";
import toast from "react-hot-toast";
import UserRoleChart from "../lib/Usersgraph";
import { Button, Inputfield } from "../UI";

const emptyTeamMemberForm = { name: "", email: "", password: "", role: "staff" };

const JOB_FUNCTIONS = [
  { value: "inbound", label: "Inbound (Receiving)" },
  { value: "outbound", label: "Outbound (Fulfillment)" },
  { value: "quality", label: "Quality Inspector" },
  { value: "inventory_control", label: "Inventory Control" },
  { value: "finance", label: "Finance" },
  { value: "procurement", label: "Procurement" },
  { value: "sales", label: "Sales" },
  { value: "audit", label: "Audit" },
];

// Shared row for Manager/Staff — tag assignment and reporting-manager are
// only meaningful for roles whose access can actually be narrowed; admins
// already have full access, so they don't get this panel (see AdminRow).
const TeamMemberRow = ({ member, possibleManagers, onRemove }) => {
  const dispatch = useDispatch();
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isSavingManager, setIsSavingManager] = useState(false);

  const currentTags = member.jobFunctions || [];

  const handleToggleTag = async (tag) => {
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    setIsSavingTags(true);
    const result = await dispatch(setJobFunctions({ userId: member.id, jobFunctions: nextTags }));
    setIsSavingTags(false);

    if (!setJobFunctions.fulfilled.match(result)) {
      toast.error(result.payload || "Could not update job functions");
    }
  };

  const handleManagerChange = async (event) => {
    const managerId = event.target.value ? Number(event.target.value) : null;
    setIsSavingManager(true);
    const result = await dispatch(setReportsTo({ userId: member.id, managerId }));
    setIsSavingManager(false);

    if (!setReportsTo.fulfilled.match(result)) {
      toast.error(result.payload || "Could not update reporting manager");
    }
  };

  return (
    <div className="bg-base-100 space-y-2 border-b p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src={member?.ProfilePic || image}
            alt="User"
            className="h-10 w-10 rounded-full bg-base-100"
          />
          <div className="bg-base-100">
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-gray-600">{member.email}</p>
          </div>
        </div>
        <Button
          onClick={() => onRemove(member.id)}
          className="rounded-lg bg-slate-100 p-2 text-red-600 transition hover:bg-red-100"
          title="Delete"
        >
          <MdDelete size={18} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {JOB_FUNCTIONS.map((fn) => {
          const active = currentTags.includes(fn.value);
          return (
            <button
              key={fn.value}
              type="button"
              disabled={isSavingTags}
              onClick={() => handleToggleTag(fn.value)}
              className={`rounded-full border px-2 py-0.5 text-xs transition disabled:opacity-50 ${
                active
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-teal-400"
              }`}
            >
              {fn.label}
            </button>
          );
        })}
      </div>
      {!currentTags.length && (
        <p className="text-xs text-slate-400">
          No job function tags — has full default {member.role} access.
        </p>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Reports to</label>
        <select
          className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          value={member.reports_to_user_id || ""}
          disabled={isSavingManager}
          onChange={handleManagerChange}
        >
          <option value="">— none —</option>
          {possibleManagers
            .filter((m) => m.id !== member.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};

function Userstatus() {
  const { staffuser, manageruser, adminuser, user } = useSelector(
    (state) => state.auth,
  );
  const dispatch = useDispatch();
  const [form, setForm] = useState(emptyTeamMemberForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(staffUser());
    dispatch(managerUser());
    dispatch(adminUser());
  }, [dispatch, removeusers]);

  const handleremove = async (UserId) => {
    dispatch(removeusers(UserId))
      .then(() => {
        toast.success("user remove successffully");
      })
      .catch((err) => {
        toast.error("error in remove user");
      });
  };

  const handleAddTeamMember = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Name, email, and a password of at least 6 characters are required");
      return;
    }

    setIsSubmitting(true);
    const result = await dispatch(createTeamMember(form));
    setIsSubmitting(false);

    if (createTeamMember.fulfilled.match(result)) {
      toast.success(`${form.role === "manager" ? "Manager" : "Staff"} added successfully`);
      setForm(emptyTeamMemberForm);
      dispatch(staffUser());
      dispatch(managerUser());
    } else {
      toast.error(result.payload || "Failed to add team member");
    }
  };

  const possibleManagers = [
    ...(Array.isArray(adminuser) ? adminuser : []),
    ...(Array.isArray(manageruser) ? manageruser : []),
  ];

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col gap-2">
        <UserRoleChart />

        <div className="bg-base-100 p-4 rounded-2xl border shadow-md">
          <h2 className="text-lg text-teal-800 font-semibold mb-3">
            Add Team Member
          </h2>
          <form
            onSubmit={handleAddTeamMember}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <Inputfield
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Inputfield
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Inputfield
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="staff">Staff</option>
                {user?.role !== "manager" && (
                  <option value="manager">Manager</option>
                )}
              </select>
            </div>
            <Button type="submit" loading={isSubmitting}>
              <IoMdAdd /> Add
            </Button>
          </form>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className=" bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Manager
            </h2>
            {manageruser?.length > 0 ? (
              manageruser.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  possibleManagers={possibleManagers}
                  onRemove={handleremove}
                />
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Admin User
            </h2>
            {adminuser?.length > 0 ? (
              adminuser.map((user, index) => (
                <div
                  key={index}
                  className="flex bg-base-100 items-center justify-between space-x-4 p-2 border-b"
                >
                  <div className="flex gap-2 items-center">
                    {" "}
                    <img
                      src={user?.ProfilePic || image}
                      alt="User"
                      className="w-10 h-10 bg-base-100 rounded-full"
                    />
                    <div className="bg-base-100">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-600 text-sm">{user.email}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleremove(user.id)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    <MdDelete size={18} />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Staff User
            </h2>
            {staffuser?.length > 0 ? (
              staffuser.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  possibleManagers={possibleManagers}
                  onRemove={handleremove}
                />
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Userstatus;
