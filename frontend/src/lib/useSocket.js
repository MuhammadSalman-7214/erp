import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const useSocket = (onNewActivity) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(
      "https://advanced-inventory-management-system-v1.onrender.com",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    );

    socketRef.current.on("newActivityLog", onNewActivity);

    return () => {
      socketRef.current.off("newActivityLog");
      socketRef.current.disconnect();
    };
  }, [onNewActivity]);
};
