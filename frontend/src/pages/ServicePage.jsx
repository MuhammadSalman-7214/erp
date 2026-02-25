import React from "react";
import { Link } from "react-router-dom";

function ServicePage() {
  return (
    <div className="bg-gray-50 text-teal-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-500 via-teal-700 to-teal-600 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About Our ERP System
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto">
            A complete Enterprise Resource Planning solution designed to
            streamline business operations, automate workflows, and enhance
            financial and operational visibility.
          </p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-teal-900">
              Who We Are
            </h2>
            <p className="mb-4 text-teal-900 leading-relaxed">
              Our ERP platform is engineered to centralize business processes
              including sales, purchases, inventory, accounting, and customer
              management into a unified system.
            </p>
            <p className="text-teal-900 leading-relaxed">
              Built with modern MERN stack architecture, our system ensures
              scalability, security, and real-time data synchronization across
              departments.
            </p>
          </div>
          <div className="bg-white shadow-xl rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-4 text-teal-900">
              Core Capabilities
            </h3>
            <ul className="space-y-3 text-teal-900">
              <li>
                <span className="text-teal-600">✔</span> Sales & Purchase
                Management
              </li>
              <li>
                {" "}
                <span className="text-teal-600">✔</span> Inventory Tracking
              </li>
              <li>
                {" "}
                <span className="text-teal-600">✔</span> Customer & Supplier
                Management
              </li>
              <li>
                {" "}
                <span className="text-teal-600">✔</span> Financial Transactions
                & Reporting
              </li>
              <li>
                {" "}
                <span className="text-teal-600">✔</span> Role-Based Access
                Control
              </li>
              <li>
                {" "}
                <span className="text-teal-600">✔</span> Real-time Dashboard
                Analytics
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
          <div className="p-8 shadow-lg rounded-2xl border">
            <h3 className="text-2xl font-bold mb-4 text-teal-900">
              Our Mission
            </h3>
            <p className="text-teal-900 leading-relaxed">
              To empower businesses with intelligent automation tools that
              eliminate manual inefficiencies, reduce operational costs, and
              improve decision-making through accurate data insights.
            </p>
          </div>

          <div className="p-8 shadow-lg rounded-2xl border">
            <h3 className="text-2xl font-bold mb-4 text-teal-900">
              Our Vision
            </h3>
            <p className="text-teal-900 leading-relaxed">
              To become a reliable ERP ecosystem that supports startups, SMEs,
              and enterprises by delivering scalable, secure, and innovative
              enterprise solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-teal-900">
            Why Choose Our ERP?
          </h2>
          <p className="text-teal-900 max-w-3xl mx-auto">
            Our system is not just software — it is a complete business
            transformation platform designed to optimize workflows and ensure
            financial transparency.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition">
            <h4 className="text-xl font-semibold mb-3 text-teal-900">
              Scalable Architecture
            </h4>
            <p className="text-teal-900">
              Designed with modular architecture allowing seamless expansion as
              your business grows.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition">
            <h4 className="text-xl font-semibold mb-3 text-teal-900">
              Secure Transactions
            </h4>
            <p className="text-teal-900">
              Implements encrypted financial transactions and secure user
              authentication mechanisms.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition">
            <h4 className="text-xl font-semibold mb-3 text-teal-900">
              Real-Time Insights
            </h4>
            <p className="text-teal-900">
              Advanced dashboards and reports to monitor sales, purchases,
              inventory levels, and cash flow instantly.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-teal-500 via-teal-700 to-teal-600 text-white py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Transform Your Business with Smart ERP
          </h2>
          <p className="mb-8 text-lg">
            Automate operations, track transactions, and gain full financial
            control with our enterprise-grade ERP system.
          </p>
          <Link
            to="/login"
            className="bg-white text-teal-900 font-semibold px-8 py-3 rounded-xl hover:bg-gray-200 transition"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}

export default ServicePage;
