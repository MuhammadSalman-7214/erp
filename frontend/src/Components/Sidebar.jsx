import { AiOutlineProduct } from "react-icons/ai";
import {
  RiDashboard3Line,
  RiMoneyDollarCircleLine,
  RiStockLine,
} from "react-icons/ri";
import { FiLogOut, FiShoppingCart } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { PiInvoiceBold } from "react-icons/pi";
import {
  MdOutlineCategory,
  MdOutlinePriceChange,
  MdOutlinePayments,
} from "react-icons/md";
import { CiMenuFries } from "react-icons/ci";
import { TfiSupport } from "react-icons/tfi";
import { IoNotificationsOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/authSlice";
import toast from "react-hot-toast";
import { LuUsers } from "react-icons/lu";
import { Button } from "../UI";
const navItemClass = (isActive) =>
  `flex items-center space-x-3 cursor-pointer p-2 rounded-md transition
   ${
     isActive
       ? "bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
       : "text-gray-700 hover:text-teal-700 hover:bg-gray-100"
   }`;
const NavItem = ({ to, icon, label, sidebarOpen }) => {
  return (
    <NavLink to={to} className={({ isActive }) => navItemClass(isActive)}>
      <div className="relative">
        <span className="text-xl group">
          {icon}

          {/* Tooltip */}
          {!sidebarOpen && (
            <span
              className="absolute left-14 top-1/2 -translate-y-1/2
              bg-gray-900 text-white text-xs px-2 py-1 rounded
              opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-[99999] pointer-events-none"
            >
              {label}
            </span>
          )}
        </span>
      </div>

      {sidebarOpen && <span>{label}</span>}
    </NavLink>
  );
};

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    dispatch(logout())
      .then(() => {
        toast.success("Logout successfully");
        navigator("/login");
      })
      .catch((error) => {
        toast.error("Error in logout");
      });
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white border-r shadow-sm z-50
      transition-all duration-300
      ${sidebarOpen ? "w-64" : "w-14"}`}
    >
      <div className="border-b flex justify-between items-center px-2 py-4 h-[8vh]">
        {sidebarOpen && (
          <h1 className="text-xl font-bold text-teal-700">InventorySouq</h1>
        )}
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <CiMenuFries className="text-xl" />
        </Button>
      </div>

      <nav className="space-y-1 p-2">
        <NavItem
          to="/"
          icon={<RiDashboard3Line />}
          label="Dashboard"
          sidebarOpen={sidebarOpen}
        />

        {user?.role === "manager" && (
          <>
            <NavItem
              to="/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />
            {/* 
            <NavItem
              to="/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/supplier"
              icon={<TfiSupport />}
              label="Vendor"
              sidebarOpen={sidebarOpen}
            />
            <NavItem
              to="/customer"
              icon={<LuUsers />}
              label="Customer"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/sales"
              icon={<RiMoneyDollarCircleLine />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/invoices"
              icon={<PiInvoiceBold />}
              label="Invoices"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/payments"
              icon={<MdOutlinePayments />}
              label="Payments"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/order"
              icon={<FiShoppingCart />}
              label="Order"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/notifications"
              icon={<IoNotificationsOutline />}
              label="Notifications"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/category"
              icon={<MdOutlineCategory />}
              label="Category"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/price-list"
              icon={<MdOutlinePriceChange />}
              label="Price List"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/Userstatus"
              icon={<LuUsers />}
              label="Users"
              sidebarOpen={sidebarOpen}
            />
          </>
        )}

        {user?.role === "admin" && (
          <>
            <NavItem
              to="/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />

            {/* <NavItem
              to="/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/order"
              icon={<FiShoppingCart />}
              label="Purchase Order"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/sales"
              icon={<RiMoneyDollarCircleLine />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/invoices"
              icon={<PiInvoiceBold />}
              label="Invoices"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/payments"
              icon={<MdOutlinePayments />}
              label="Payments"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            />
            <NavItem
              to="/supplier"
              icon={<TfiSupport />}
              label="Vendor"
              sidebarOpen={sidebarOpen}
            />
            <NavItem
              to="/customer"
              icon={<LuUsers />}
              label="Customer"
              sidebarOpen={sidebarOpen}
            />
            {/* 
            <NavItem
              to="/notifications"
              icon={<IoNotificationsOutline />}
              label="Create Notifications"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/category"
              icon={<MdOutlineCategory />}
              label="Category"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/price-list"
              icon={<MdOutlinePriceChange />}
              label="Price List"
              sidebarOpen={sidebarOpen}
            />
          </>
        )}

        {user?.role === "staff" && (
          <ul className="space-y-2">
            <NavItem
              to="/product"
              icon={<AiOutlineProduct />}
              label="Product"
              sidebarOpen={sidebarOpen}
            />

            {/* <NavItem
              to="/activity-log"
              icon={<RxActivityLog />}
              label="Activity Log"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/supplier"
              icon={<TfiSupport />}
              label="Vendor"
              sidebarOpen={sidebarOpen}
            />
            <NavItem
              to="/customer"
              icon={<LuUsers />}
              label="Customer"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/sales"
              icon={<RiMoneyDollarCircleLine />}
              label="Sales"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/order"
              icon={<FiShoppingCart />}
              label="Order"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              to="/payments"
              icon={<MdOutlinePayments />}
              label="Payments"
              sidebarOpen={sidebarOpen}
            />

            {/* <NavItem
              to="/stock-transaction"
              icon={<RiStockLine />}
              label="Stock Transaction"
              sidebarOpen={sidebarOpen}
            /> */}

            <NavItem
              to="/notifications"
              icon={<IoNotificationsOutline />}
              label="Notifications"
              sidebarOpen={sidebarOpen}
            />
          </ul>
        )}
      </nav>

      <div className="absolute bottom-0 w-full">
        <div className="px-2 pb-2">
          <a
            href="https://devsouq.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700 transition hover:bg-teal-100 hover:text-teal-800"
          >
            {sidebarOpen ? "Powered by DevSouq Technologies" : "DevSouq"}
          </a>
        </div>

        <div className="border-t p-2">
          <Button
            onClick={handleLogout}
            className="group relative flex items-center gap-3 w-full p-2 rounded-md text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <FiLogOut className="text-xl" />
            {sidebarOpen && <span>Logout</span>}

            {/* Tooltip */}
            {!sidebarOpen && (
              <span className="absolute left-20 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-[99999]">
                Logout
              </span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
