import React from "react";
import { formatDateLabel } from "./dateFormat";

const FormattedTime = ({ timestamp }) => {
  return <span>{formatDateLabel(timestamp)}</span>;
};

export default FormattedTime;
