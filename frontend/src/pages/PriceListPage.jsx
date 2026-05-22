import { useEffect, useMemo, useState } from "react";
import { MdDelete, MdEdit } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import LoadingButton from "../Components/LoadingButton";
import FormattedTime from "../lib/FormattedTime";
import {
  createPriceListItem,
  deletePriceListItem,
  fetchPriceListItems,
  updatePriceListItem,
} from "../features/priceListSlice";
import { sortByDateValue } from "../lib/dateFormat";
import { validateNumberInput, validateTextInput } from "../lib/formValidation";
import { Button, ConfirmDialog, Inputfield } from "../UI";

const sanitizeFileName = (value) =>
  String(value || "price_list")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "price_list";

const formatOptionalText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "-";
};

function PriceListPage() {
  const dispatch = useDispatch();
  const { items, loading, saving, updating, deleting } = useSelector(
    (state) => state.priceList,
  );
  const [productName, setProductName] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchPriceListItems());
  }, [dispatch]);

  const resetForm = () => {
    setProductName("");
    setSize("");
    setPrice("");
    setSelectedItem(null);
    setErrors({});
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nameCheck = validateField("productName", productName, (value) =>
      validateTextInput(value, "Product name", {
        required: true,
        minLength: 2,
        maxLength: 120,
      }),
    );
    if (!nameCheck.ok) {
      toast.error(nameCheck.message);
      return;
    }

    const sizeCheck = validateField("size", size, (value) =>
      validateTextInput(value, "Size", {
        required: false,
        maxLength: 40,
        allowEmpty: true,
      }),
    );
    if (!sizeCheck.ok) {
      toast.error(sizeCheck.message);
      return;
    }

    const priceCheck = validateField("price", price, (value) =>
      validateNumberInput(value, "Price", {
        min: 0,
        allowZero: true,
      }),
    );
    if (!priceCheck.ok) {
      toast.error(priceCheck.message);
      return;
    }

    try {
      if (selectedItem) {
        await dispatch(
          updatePriceListItem({
            id: selectedItem.id,
            payload: {
              productName: nameCheck.value.toUpperCase(),
              size: sizeCheck.value ? sizeCheck.value.toUpperCase() : null,
              price: priceCheck.value,
            },
          }),
        ).unwrap();
        toast.success("Price item updated");
      } else {
        await dispatch(
          createPriceListItem({
            productName: nameCheck.value.toUpperCase(),
            size: sizeCheck.value ? sizeCheck.value.toUpperCase() : null,
            price: priceCheck.value,
          }),
        ).unwrap();
        toast.success("Price item saved");
      }

      resetForm();
      dispatch(fetchPriceListItems());
    } catch (error) {
      toast.error(error || "Failed to save item");
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setProductName(item.productName || "");
    setSize(item.size || "");
    setPrice(String(item.price ?? ""));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deletePriceListItem(id)).unwrap();
      toast.success("Price item deleted");
      dispatch(fetchPriceListItems());
    } catch (error) {
      toast.error(error || "Failed to delete item");
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = sortByDateValue(items || [], (item) => item.createdAt);
    if (!q) return sorted;
    return sorted.filter((item) => {
      const name = String(item.productName || "").toLowerCase();
      const itemSize = String(item.size || "").toLowerCase();
      const itemPrice = String(item.price ?? "").toLowerCase();
      return name.includes(q) || itemSize.includes(q) || itemPrice.includes(q);
    });
  }, [items, search]);

  const downloadPdf = () => {
    if (!filteredItems.length) {
      toast.error("No price list data to download");
      return;
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const marginX = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const tableWidth = pageWidth - marginX * 2;
    const generatedAt = new Date().toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    pdf.setFillColor(15, 118, 110);
    pdf.rect(0, 0, pageWidth, 18, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Product Price List", marginX, 11);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${generatedAt}`, pageWidth - marginX, 11, {
      align: "right",
    });

    autoTable(pdf, {
      startY: 26,
      head: [["PRODUCT NAME", "SIZE", "PRICE"]],
      body: filteredItems.map((item) => [
        String(item.productName || "-"),
        formatOptionalText(item.size),
        `Rs ${Number(item.price || 0).toLocaleString()}`,
      ]),
      margin: { left: marginX, right: marginX, top: 10, bottom: 12 },
      tableWidth,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
        overflow: "linebreak",
        valign: "middle",
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.58, halign: "left" },
        1: { cellWidth: tableWidth * 0.18, halign: "center" },
        2: { cellWidth: tableWidth * 0.24, halign: "right" },
      },
      didDrawPage: (data) => {
        const footerY = pageHeight - 7;
        pdf.setDrawColor(203, 213, 225);
        pdf.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.setFont("helvetica", "normal");
        pdf.text("Product Price List", marginX, footerY);
        pdf.text(`Page ${data.pageNumber}`, pageWidth - marginX, footerY, {
          align: "right",
        });
      },
    });

    pdf.save(`${sanitizeFileName("price_list")}.pdf`);
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Product Price List
          </h1>
          <p className="text-sm text-slate-500">
            Add product name and price to the separate price list.
          </p>
        </div>
        <Button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 h-10 text-white shadow-md transition hover:bg-slate-800"
        >
          Download PDF
        </Button>
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden p-4">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_0.7fr_0.8fr_auto]"
        >
          <Inputfield
            type="text"
            value={productName}
            onChange={(e) => {
              const value = e.target.value;
              setProductName(value);
              validateField("productName", value, (current) =>
                validateTextInput(current, "Product name", {
                  required: true,
                  minLength: 2,
                  maxLength: 120,
                }),
              );
            }}
            onBlur={(e) =>
              validateField("productName", e.target.value, (current) =>
                validateTextInput(current, "Product name", {
                  required: true,
                  minLength: 2,
                  maxLength: 120,
                }),
              )
            }
            placeholder="Product name"
            autoComplete="off"
            maxLength={120}
            className="w-full h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          {errors.productName && (
            <p className="text-red-500 text-sm -mt-1">{errors.productName}</p>
          )}
          <Inputfield
            type="text"
            value={size}
            onChange={(e) => {
              const value = e.target.value;
              setSize(value);
              validateField("size", value, (current) =>
                validateTextInput(current, "Size", {
                  required: false,
                  maxLength: 40,
                  allowEmpty: true,
                }),
              );
            }}
            onBlur={(e) =>
              validateField("size", e.target.value, (current) =>
                validateTextInput(current, "Size", {
                  required: false,
                  maxLength: 40,
                  allowEmpty: true,
                }),
              )
            }
            placeholder="Size (optional)"
            autoComplete="off"
            maxLength={40}
            className="w-full h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          {errors.size && (
            <p className="text-red-500 text-sm -mt-1">{errors.size}</p>
          )}
          <Inputfield
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => {
              const value = e.target.value;
              setPrice(value);
              validateField("price", value, (current) =>
                validateNumberInput(current, "Price", {
                  min: 0,
                  allowZero: true,
                }),
              );
            }}
            onBlur={(e) =>
              validateField("price", e.target.value, (current) =>
                validateNumberInput(current, "Price", {
                  min: 0,
                  allowZero: true,
                }),
              )
            }
            placeholder="Price"
            className="w-full h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          {errors.price && (
            <p className="text-red-500 text-sm -mt-1">{errors.price}</p>
          )}
          <div className="flex gap-2">
            <LoadingButton
              type="submit"
              loading={saving || updating}
              loadingText={selectedItem ? "Updating..." : "Saving..."}
              className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
            >
              <IoMdAdd className="text-xl mr-2" />
              {selectedItem ? "Update" : "Save"}
            </LoadingButton>
            {selectedItem ? (
              <Button
                type="button"
                onClick={resetForm}
                className="h-10 rounded-xl border border-slate-300 px-4 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-4">
          <Inputfield
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or price..."
            maxLength={120}
            className="w-full h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} showFilters={false} />
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Price Items Found"
                description="Add a product name and price to start building your separate price list."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Product Name</th>
                    <th className="px-5 py-4 font-medium">Size</th>
                    <th className="px-5 py-4 font-medium">Price</th>
                    <th className="px-5 py-4 font-medium">Created At</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {item.productName}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatOptionalText(item.size)}
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-semibold">
                        Rs {Number(item.price || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={item.createdAt} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </Button>
                          <ConfirmDialog
                            title="Delete price item?"
                            description="This will permanently remove this price entry."
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(item.id)}
                          >
                            <Button
                              type="button"
                              disabled={deleting}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition-all duration-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                              title="Delete"
                            >
                              <MdDelete size={18} />
                            </Button>
                          </ConfirmDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceListPage;
