import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  setSaasSessionError,
  clearSaasAuthData,
} from "../../redux/slices/saasAuthSlice";
import {
  setVendorSessionError,
  clearVendorAuthData,
} from "../../redux/slices/vendorAuthSlice";
import { heartBeat, adminLogout } from "../../api/adminApi";
import "./SessionExpires.css";

const SessionExpires = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const saasSessionError = useSelector((state) => state.saasAuth.sessionError);
  const vendorSessionError = useSelector(
    (state) => state.vendorAuth?.sessionError,
  );
  const saasToken = useSelector((state) => state.saasAuth.adminToken);
  const vendorToken = useSelector((state) => state.vendorAuth?.vendorToken);

  const lastActivityRef = useRef(Date.now());
  const heartbeatRef = useRef(Date.now());

  const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour (60 minutes)
  const CHECK_INTERVAL = 5000; // 5 seconds (for better accuracy)

  const isMainVendor = location.pathname.includes("/mainvendor");
  const isAdmin = location.pathname.includes("/saas") && !isMainVendor;
  const isVendor = location.pathname.includes("/vendor") && !isMainVendor;

  const handleLogout = useCallback(async () => {
    try {
      if (isAdmin) {
        await adminLogout();
      }
      // For vendors, there might not be a specific logout call here yet,
      // but we always clear local data
    } catch (error) {
      console.error(
        "Logout API failed (expected if session is already expired):",
        error,
      );
    } finally {
      // Always clear local data and navigate even if the API call fails
      if (isAdmin) {
        dispatch(clearSaasAuthData());
        navigate("/saas-admin");
      } else if (isVendor || isMainVendor) {
        dispatch(clearVendorAuthData());
        navigate(isMainVendor ? "/vendor" : "/");
      }
    }
  }, [isAdmin, isVendor, isMainVendor, dispatch, navigate]);

  const sendHeartbeat = useCallback(async () => {
    try {
      if (saasToken || vendorToken) {
        await heartBeat();
      }
      heartbeatRef.current = Date.now();
    } catch (error) {
      console.error("Heartbeat failed", error);
      // If heartbeat fails with 401, axios interceptor will handle it
    }
  }, [saasToken, vendorToken]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Force immediate heartbeat if it's been a while (throttle to 30s)
    if (now - heartbeatRef.current > 30000) {
      sendHeartbeat();
    }
  }, [sendHeartbeat]);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [saasToken, vendorToken]);

  useEffect(() => {
    const validateSession = async () => {
      if (saasToken || vendorToken) {
        try {
          const response = await heartBeat();

          console.log("Session validation response:", response);

          // If the server returns lastActive: false, or the request fails, the session is invalid
          // This covers the "isActive false" requirement from the backend
          if (response && response.lastActive === false) {
            if (isAdmin) {
              dispatch(setSaasSessionError(true));
            } else if (isVendor || isMainVendor) {
              dispatch(setVendorSessionError(true));
            }
          }
        } catch (error) {
          console.error("Session validation on refresh failed:", error);

          if (error.sessionExpired === true || error.status === 401) {
            if (isAdmin) {
              dispatch(setSaasSessionError(true));
            } else if (isVendor || isMainVendor) {
              dispatch(setVendorSessionError(true));
            }
          }
        }
      }
    };
    validateSession();
  }, [isAdmin, isVendor, isMainVendor, dispatch, saasToken, vendorToken]);

  useEffect(() => {
    if (!saasToken && !vendorToken) return;

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime > INACTIVITY_LIMIT) {
        console.log("Session expired due to inactivity");
        clearInterval(interval); // Stop repeating logic once session is marked as expired
        if (isAdmin) {
          dispatch(setSaasSessionError(true));
        } else if (isVendor || isMainVendor) {
          dispatch(setVendorSessionError(true));
        }
      }
    }, CHECK_INTERVAL);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [
    saasToken,
    vendorToken,
    isAdmin,
    isVendor,
    isMainVendor,
    dispatch,
    updateActivity,
  ]);

  if (!saasSessionError && !vendorSessionError) return null;

  return (
    <div className="session-expires-overlay">
      <div className="session-expires-modal">
        <div className="session-expires-icon">⚠️</div>
        <h3>Session Expired</h3>
        <p>
          Your session has expired due to inactivity. Please log in again to
          continue.
        </p>
        <button className="session-expires-btn" onClick={handleLogout}>
          Log In Again
        </button>
      </div>
    </div>
  );
};

export default SessionExpires;
