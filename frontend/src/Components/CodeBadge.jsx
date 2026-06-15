import React from "react";

const CodeBadge = ({ children }) => {
  return (
    <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
      {children}
    </span>
  );
};

export default CodeBadge;
