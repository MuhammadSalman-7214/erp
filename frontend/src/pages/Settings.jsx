import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Building2,
  Camera,
  Mail,
  RefreshCcw,
  Save,
  Upload,
  UserRound,
} from "lucide-react";
import { Button, Inputfield, Textarea } from "../UI";
import { updateCompanyInfo, updateProfile } from "../features/authSlice";

const emptyForm = {
  companyName: "",
  companyDescription: "",
  companyLogo: "",
};

function Settings() {
  const dispatch = useDispatch();
  const { user, isupdateCompanyInfo } = useSelector((state) => state.auth);
  const companyFileRef = useRef(null);
  const personalFileRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [companyPreview, setCompanyPreview] = useState("");
  const [personalPreview, setPersonalPreview] = useState("");
  const [companyFileName, setCompanyFileName] = useState("");
  const [personalFileName, setPersonalFileName] = useState("");

  useEffect(() => {
    setForm({
      companyName: user?.companyName || "",
      companyDescription: user?.companyDescription || "",
      companyLogo: user?.companyLogo || "",
    });
    setCompanyPreview(user?.companyLogo || "");
    setPersonalPreview(user?.ProfilePic || "");
    setCompanyFileName("");
    setPersonalFileName("");
  }, [
    user?.companyName,
    user?.companyDescription,
    user?.companyLogo,
    user?.ProfilePic,
  ]);

  const companyInitials =
    (form.companyName || user?.name || "C")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";

  const personalInitials =
    (user?.name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const readImageAsDataUrl = (file, onDone) => {
    if (!file.type?.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onDone(String(reader.result || ""));
    reader.onerror = () => toast.error("Failed to read the image file.");
    reader.readAsDataURL(file);
  };

  const openCompanyPicker = () => {
    companyFileRef.current?.click();
  };

  const openPersonalPicker = () => {
    personalFileRef.current?.click();
  };

  const handleCompanyLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    readImageAsDataUrl(file, (dataUrl) => {
      setForm((prev) => ({ ...prev, companyLogo: dataUrl }));
      setCompanyPreview(dataUrl);
      setCompanyFileName(file.name);
    });
  };

  const handlePersonalPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    readImageAsDataUrl(file, async (dataUrl) => {
      setPersonalPreview(dataUrl);
      setPersonalFileName(file.name);

      try {
        await dispatch(updateProfile(dataUrl)).unwrap();
        toast.success("Profile photo updated.");
      } catch (error) {
        toast.error(error || "Failed to update profile photo.");
      }
    });
  };

  const resetCompany = () => {
    setForm({
      companyName: user?.companyName || "",
      companyDescription: user?.companyDescription || "",
      companyLogo: user?.companyLogo || "",
    });
    setCompanyPreview(user?.companyLogo || "");
    setCompanyFileName("");

    if (companyFileRef.current) {
      companyFileRef.current.value = "";
    }
  };

  const resetPersonal = () => {
    setPersonalPreview(user?.ProfilePic || "");
    setPersonalFileName("");

    if (personalFileRef.current) {
      personalFileRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const companyName = form.companyName.trim();
    if (!companyName) {
      toast.error("Company name is required.");
      return;
    }

    try {
      await dispatch(
        updateCompanyInfo({
          companyName,
          companyDescription: form.companyDescription.trim(),
          companyLogo: form.companyLogo || "",
        }),
      ).unwrap();

      toast.success("Company information saved.");
      setCompanyFileName("");
    } catch (error) {
      toast.error(error || "Failed to save company information.");
    }
  };

  return (
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mx-auto flex w-full flex-col gap-4">
        <section className="rounded-lg border border-slate-200/70 bg-white/90 p-5 shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] transition-all duration-300 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                <UserRound className="h-3.5 w-3.5" />
                Personal info
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full mt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center w-5/12">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500 text-2xl font-bold text-white ring-4 ring-white shadow-[0_12px_30px_rgba(79,70,229,0.14)]">
                {personalPreview ? (
                  <img
                    src={personalPreview}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  personalInitials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  Profile photo
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload a clean photo or avatar for your account.
                </p>

                <input
                  ref={personalFileRef}
                  id="personal-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePersonalPhotoChange}
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={openPersonalPicker}
                  >
                    <Camera className="h-4 w-4" />
                    Change photo
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPersonal}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {personalFileName || "PNG, JPG, WEBP or SVG up to 5MB"}
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4 w-7/12">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserRound className="h-4 w-4 text-indigo-600" />
                  Name
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {user?.name || "Guest user"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Mail className="h-4 w-4 text-sky-600" />
                  Email
                </div>
                <p className="mt-2 break-all text-sm leading-6 text-slate-500">
                  {user?.email || "guest@example.com"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200/70 bg-white/90 p-5 shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] transition-all duration-300 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                <Building2 className="h-3.5 w-3.5" />
                Company info
              </div>
            </div>
          </div>

          <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <div className="rounded-[24px] border border-dashed border-teal-200 bg-teal-50/60 p-4">
                  <div className="flex h-36 items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-inner">
                    {companyPreview ? (
                      <img
                        src={companyPreview}
                        alt="Company logo preview"
                        className="h-full w-full object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-2xl font-bold text-white shadow-[0_16px_34px_rgba(13,148,136,0.24)]">
                        {companyInitials}
                      </div>
                    )}
                  </div>

                  <input
                    ref={companyFileRef}
                    id="company-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCompanyLogoChange}
                  />

                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={openCompanyPicker}
                    >
                      <Upload className="h-4 w-4" />
                      Upload logo
                    </Button>

                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        {companyFileName || "PNG, JPG, WEBP or SVG up to 5MB"}
                      </span>
                      {companyPreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, companyLogo: "" }));
                            setCompanyPreview("");
                            setCompanyFileName("");
                            if (companyFileRef.current) {
                              companyFileRef.current.value = "";
                            }
                          }}
                          className="font-semibold text-rose-500 transition hover:text-rose-600"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Inputfield
                  label="Company name"
                  placeholder="Enter your company name"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      companyName: event.target.value,
                    }))
                  }
                  uppercase={false}
                  wrapperClassName="w-full"
                  inputClassName="py-3"
                />

                <Textarea
                  label="Description"
                  placeholder="Write a short description of your business"
                  value={form.companyDescription}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      companyDescription: event.target.value,
                    }))
                  }
                  uppercase={false}
                  rows={6}
                  wrapperClassName="w-full"
                  textareaClassName="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetCompany}
                className="w-full sm:w-auto"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                type="submit"
                loading={isupdateCompanyInfo}
                loadingText="Saving..."
                className="w-full sm:w-auto"
                variant="primary"
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Settings;
