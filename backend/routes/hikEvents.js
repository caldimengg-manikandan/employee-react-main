const express = require("express");
const router = express.Router();
const axios = require("axios");
const generateHikToken = require("../utils/hikToken");
const Attendance = require("../models/Attendance");

router.get("/pull-events", async (req, res) => {
  try {
    const token = generateHikToken();

    console.log("Pulling events from Hikvision:", process.env.HIK_BASE_URL);
    console.log("Using credentials:", process.env.HIK_USERNAME);

    // First, try to check if the device is reachable
    const deviceUrl = new URL(process.env.HIK_BASE_URL);
    const isReachable = await checkDeviceReachability(deviceUrl.hostname, deviceUrl.port || '80');
    
    if (!isReachable) {
      console.log("Device is not reachable on the specified port");
      return res.status(503).json({
        success: false,
        error: "Hikvision device is not reachable. Please check if the device is online and the port is correct.",
        suggestion: "Verify the device IP address and port configuration. Common ports are 80, 8000, or 8080."
      });
    }

    const response = await axios.post(
      `${process.env.HIK_BASE_URL}/artemis/api/acs/v1/events`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "X-Ca-Key": process.env.HIK_ROOT_KEY,
          "X-Ca-Signature": token
        },
        timeout: 15000 // 15 second timeout
      }
    );

    console.log("Hikvision response:", response.data);

    // Process and save events to database
    if (response.data && response.data.data) {
      const events = response.data.data;
      let savedCount = 0;

      for (const event of events) {
        try {
          // Convert Hik event to attendance record
          const record = {
            employeeId: event.employeeNo || event.personId || event.employeeId,
            direction: event.eventType === "access_granted" ? "in" : 
                      event.eventType === "access_denied" ? "out" : "in",
            punchTime: event.time || new Date(),
            deviceId: event.readerName || event.deviceName || "hikvision",
            source: "hikvision"
          };

          // Only save if we have employee ID
          if (record.employeeId) {
            await Attendance.create(record);
            savedCount++;
          }
        } catch (saveError) {
          console.error("Error saving individual event:", saveError.message);
        }
      }

      res.status(200).json({
        success: true,
        message: `Successfully pulled and saved ${savedCount} events from Hikvision`,
        events: events,
        savedCount: savedCount
      });
    } else {
      res.status(200).json({
        success: true,
        message: "No events found in Hikvision system",
        events: []
      });
    }

  } catch (err) {
    console.error("Hikvision API Error:", err.message);
    console.error("Full error:", err);
    
    let errorMessage = "Hikvision API request failed";
    let suggestions = [];
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = "Cannot connect to Hikvision device. Connection refused.";
      suggestions = [
        "Check if the device is powered on and network cable is connected",
        "Verify the IP address and port configuration",
        "Ensure the device web service is enabled",
        "Try accessing the device web interface directly"
      ];
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      errorMessage = "Connection to Hikvision device timed out.";
      suggestions = [
        "Device may be offline or not responding",
        "Check network connectivity and firewall settings",
        "Verify the device port configuration",
        "Try pinging the device to confirm network reachability"
      ];
    } else if (err.response?.status === 401) {
      errorMessage = "Authentication failed.";
      suggestions = [
        "Verify API credentials in environment variables",
        "Check if API access is enabled on the device",
        "Ensure the X-Ca-Key and signature are correct"
      ];
    } else if (err.response?.status === 404) {
      errorMessage = "Hikvision API endpoint not found.";
      suggestions = [
        "Verify the API endpoint URL",
        "Check device firmware version and API compatibility",
        "Ensure the Artemis API is available on this device model"
      ];
    } else {
      suggestions = [
        "Check device documentation for API configuration",
        "Verify network settings and firewall rules",
        "Contact device administrator for assistance"
      ];
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: err.message,
      suggestions: suggestions,
      troubleshooting: {
        deviceIp: process.env.HIK_BASE_URL,
        endpoint: `${process.env.HIK_BASE_URL}/artemis/api/acs/v1/events`,
        errorCode: err.code,
        statusCode: err.response?.status
      }
    });
  }
});

// Test connection to Hikvision
router.get("/test-connection", async (req, res) => {
  try {
    const token = generateHikToken();
    
    console.log("Testing Hikvision connection...");
    console.log("Base URL:", process.env.HIK_BASE_URL);
    console.log("Username:", process.env.HIK_USERNAME);
    console.log("Using X-Ca-Key:", process.env.HIK_ROOT_KEY);
    console.log("Generated token:", token);

    // First, try to check if the device is reachable
    const deviceUrl = new URL(process.env.HIK_BASE_URL);
    const isReachable = await checkDeviceReachability(deviceUrl.hostname, deviceUrl.port || '80');
    
    if (!isReachable) {
      console.log("Device is not reachable on the specified port");
      return res.status(503).json({
        success: false,
        error: "Hikvision device is not reachable. Please check if the device is online and the port is correct.",
        suggestion: "Verify the device IP address and port configuration. Common ports are 80, 8000, or 8080."
      });
    }

    const response = await axios.get(
      `${process.env.HIK_BASE_URL}/artemis/api/acs/v1/deviceStatus`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Ca-Key": process.env.HIK_ROOT_KEY,
          "X-Ca-Signature": token
        },
        timeout: 15000
      }
    );

    console.log("Hikvision connection successful!");
    console.log("Device response:", response.data);

    res.status(200).json({
      success: true,
      message: "Successfully connected to Hikvision device",
      deviceInfo: response.data
    });

  } catch (err) {
    console.error("Hikvision Connection Test Error:", err.message);
    console.error("Error details:", {
      code: err.code,
      responseStatus: err.response?.status,
      responseData: err.response?.data,
      config: err.config
    });
    
    let errorMessage = "Failed to connect to Hikvision device";
    let suggestions = [];
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = "Cannot connect to Hikvision device. Connection refused.";
      suggestions = [
        "Check if the device is powered on and network cable is connected",
        "Verify the IP address and port configuration",
        "Ensure the device web service is enabled",
        "Try accessing the device web interface directly"
      ];
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      errorMessage = "Connection to Hikvision device timed out.";
      suggestions = [
        "Device may be offline or not responding",
        "Check network connectivity and firewall settings",
        "Verify the device port configuration",
        "Try pinging the device to confirm network reachability"
      ];
    } else if (err.response?.status === 401) {
      errorMessage = "Authentication failed.";
      suggestions = [
        "Verify API credentials in environment variables",
        "Check if API access is enabled on the device",
        "Ensure the X-Ca-Key and signature are correct"
      ];
    } else if (err.response?.status === 404) {
      errorMessage = "Hikvision API endpoint not found.";
      suggestions = [
        "Verify the API endpoint URL",
        "Check device firmware version and API compatibility",
        "Ensure the Artemis API is available on this device model"
      ];
    } else {
      suggestions = [
        "Check device documentation for API configuration",
        "Verify network settings and firewall rules",
        "Contact device administrator for assistance"
      ];
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: err.message,
      suggestions: suggestions,
      troubleshooting: {
        deviceIp: process.env.HIK_BASE_URL,
        endpoint: `${process.env.HIK_BASE_URL}/artemis/api/acs/v1/deviceStatus`,
        errorCode: err.code,
        statusCode: err.response?.status
      }
    });
  }
});

// Helper function to check device reachability
async function checkDeviceReachability(host, port) {
  try {
    const response = await axios.get(`http://${host}:${port}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept any status code below 500
    });
    return true;
  } catch (err) {
    if (err.response) {
      // Device responded but with an error status - it's reachable
      return true;
    }
    // Connection failed - device not reachable
    console.log(`Device ${host}:${port} not reachable:`, err.message);
    return false;
  }
}

module.exports = router;
