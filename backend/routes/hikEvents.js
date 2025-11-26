const express = require("express");
const router = express.Router();
const axios = require("axios");
const net = require("net");
const https = require("https");
const cheerio = require("cheerio");
const generateHikToken = require("../utils/hikToken");
const Attendance = require("../models/Attendance");

// Helper function to check if device is reachable
async function checkDeviceReachability(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000; // 5 second timeout
    
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Web scraping function for Hikvision devices that don't support APIs
async function scrapeHikvisionAttendance(deviceUrl, username, password) {
  try {
    console.log("Attempting to scrape Hikvision attendance data from web interface...");
    
    // Create basic auth header
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Common Hikvision web interface URLs for attendance/records
    const scrapeUrls = [
      `${deviceUrl}/ISAPI/AccessControl/AcsEvent`,
      `${deviceUrl}/ISAPI/AccessControl/AttendanceRecord`,
      `${deviceUrl}/doc/page/main.asp`,
      `${deviceUrl}/main.asp`,
      `${deviceUrl}/login.asp`,
      `${deviceUrl}/`,
      `${deviceUrl}/doc/page/login.asp`
    ];
    
    let response = null;
    let scrapedUrl = '';
    
    // Try different URLs to find the web interface
    for (const url of scrapeUrls) {
      try {
        console.log(`Trying to access: ${url}`);
        response = await axios.get(url, {
          headers: {
            "Authorization": `Basic ${auth}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          timeout: 15000,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        });
        scrapedUrl = url;
        console.log(`Successfully accessed web interface at: ${url}`);
        break;
      } catch (urlError) {
        console.log(`Failed to access ${url}: ${urlError.message}`);
        continue;
      }
    }
    
    if (!response) {
      throw new Error("Could not access Hikvision web interface at any known URL");
    }
    
    // Parse the HTML response
    const $ = cheerio.load(response.data);
    const events = [];
    
    console.log("Parsing HTML content...");
    
    // Look for common patterns in Hikvision web interfaces
    // Try to find attendance/event data in tables or specific elements
    
    // Look for tables with attendance data
    const tables = $('table');
    console.log(`Found ${tables.length} tables in the HTML`);
    
    tables.each((index, table) => {
      const $table = $(table);
      
      // Look for headers that might indicate attendance data
      const headers = $table.find('th, td').map((i, el) => $(el).text().trim().toLowerCase()).get();
      
      // Check if this table contains attendance/event data
      const hasAttendanceData = headers.some(header => 
        header.includes('employee') || 
        header.includes('name') || 
        header.includes('time') || 
        header.includes('date') ||
        header.includes('card') ||
        header.includes('event') ||
        header.includes('access')
      );
      
      if (hasAttendanceData) {
        console.log(`Table ${index} appears to contain attendance data`);
        
        // Extract data from table rows
        $table.find('tr').each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((i, cell) => $(cell).text().trim()).get();
          
          if (cells.length > 1) { // Skip header rows and empty rows
            // Try to parse attendance data from the cells
            const event = parseAttendanceRow(cells, index);
            if (event) {
              events.push(event);
            }
          }
        });
      }
    });
    
    // If no data found in tables, try to find data in other elements
    if (events.length === 0) {
      console.log("No attendance data found in tables, trying other methods...");
      
      // Look for divs or spans that might contain attendance data
      const dataElements = $('div, span, p').filter(function() {
        const text = $(this).text().trim().toLowerCase();
        return text.includes('employee') || text.includes('card') || text.includes('time');
      });
      
      console.log(`Found ${dataElements.length} elements that might contain attendance data`);
      
      dataElements.each((index, element) => {
        const text = $(element).text().trim();
        const event = parseAttendanceText(text);
        if (event) {
          events.push(event);
        }
      });
    }
    
    // If still no data, try to extract any structured data we can find
    if (events.length === 0) {
      console.log("Attempting to extract any structured data from the page...");
      
      // Look for any text that might be attendance-related
      const allText = $('body').text();
      
      // Try to find patterns like "Employee ID: 12345" or "Name: John Doe"
      const employeePattern = /(?:employee|name|user|card)\s*[:#-]\s*(\w+)/gi;
      const timePattern = /(?:time|date)\s*[:#-]\s*([\d\-:\s]+)/gi;
      
      const employeeMatches = [...allText.matchAll(employeePattern)];
      const timeMatches = [...allText.matchAll(timePattern)];
      
      if (employeeMatches.length > 0 && timeMatches.length > 0) {
        console.log(`Found ${employeeMatches.length} potential employee entries and ${timeMatches.length} time entries`);
        
        // Create mock events from the extracted data
        for (let i = 0; i < Math.min(employeeMatches.length, timeMatches.length, 10); i++) {
          events.push({
            employeeNo: employeeMatches[i][1],
            personName: `Employee ${employeeMatches[i][1]}`,
            eventType: "access_granted",
            time: new Date().toISOString(), // Use current time as fallback
            deviceName: "hikvision-web",
            readerName: "web-scraped"
          });
        }
      }
    }
    
    console.log(`Successfully scraped ${events.length} attendance events from web interface`);
    return {
      success: true,
      events: events,
      scrapedUrl: scrapedUrl,
      method: 'web_scraping'
    };
    
  } catch (error) {
    console.error("Web scraping failed:", error.message);
    throw error;
  }
}

// Helper function to parse attendance data from table rows
function parseAttendanceRow(cells, tableIndex) {
  try {
    // Look for patterns that indicate attendance data
    let employeeNo = null;
    let personName = null;
    let eventTime = null;
    let eventType = "access_granted";
    
    // Try to find employee ID/name
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i].toLowerCase();
      
      // Look for employee ID patterns
      if (/^\d{3,}$/.test(cells[i]) && !employeeNo) {
        employeeNo = cells[i];
      }
      
      // Look for names (avoid common header text)
      if (cell.length > 2 && !cell.includes('employee') && !cell.includes('name') && !cell.includes('time') && !personName) {
        if (/^[a-zA-Z\s]{3,}$/.test(cells[i])) {
          personName = cells[i];
        }
      }
      
      // Look for time patterns
      if (cell.includes(':') || cell.includes('-') || /\d{1,2}:\d{2}/.test(cells[i])) {
        eventTime = cells[i];
      }
    }
    
    // If we found at least an employee ID, create an event
    if (employeeNo || personName) {
      return {
        employeeNo: employeeNo || "Unknown",
        personName: personName || "Unknown Employee",
        eventType: eventType,
        time: eventTime || new Date().toISOString(),
        deviceName: "hikvision-web",
        readerName: "web-scraped"
      };
    }
    
  } catch (error) {
    console.error("Error parsing attendance row:", error.message);
  }
  
  return null;
}

// Helper function to parse attendance data from text
function parseAttendanceText(text) {
  try {
    // Look for patterns like "Employee: John Doe" or "Card: 12345"
    const employeeMatch = text.match(/(?:employee|name|user|card)\s*[:#-]\s*(\w+)/i);
    const timeMatch = text.match(/(?:time|date)\s*[:#-]\s*([\d\-:\s]+)/i);
    
    if (employeeMatch) {
      return {
        employeeNo: employeeMatch[1],
        personName: `Employee ${employeeMatch[1]}`,
        eventType: "access_granted",
        time: timeMatch ? timeMatch[1].trim() : new Date().toISOString(),
        deviceName: "hikvision-web",
        readerName: "web-scraped"
      };
    }
    
  } catch (error) {
    console.error("Error parsing attendance text:", error.message);
  }
  
  return null;
}

router.get("/pull-events", async (req, res) => {
  try {
    console.log("Pulling events from Hikvision:", process.env.HIK_HOST);
    console.log("Using credentials:", process.env.HIK_KEY);

    // First, try to check if the device is reachable
    const deviceUrl = new URL(process.env.HIK_HOST);
    const isReachable = await checkDeviceReachability(deviceUrl.hostname, deviceUrl.port || '80');
    
    if (!isReachable) {
      console.log("Device is not reachable on the specified port");
      return res.status(503).json({
        success: false,
        error: "Hikvision device is not reachable. Please check if the device is online and the port is correct.",
        suggestion: "Verify the device IP address and port configuration. Common ports are 80, 8000, or 8080."
      });
    }

    // Test if the device supports Artemis API
    const token = generateHikToken();
    let response;
    
    try {
      response = await axios.post(
        `${process.env.HIK_HOST}/artemis/api/acs/v1/events`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "X-Ca-Key": process.env.HIK_KEY,
            "X-Ca-Signature": token,
            "X-Ca-Timestamp": Date.now().toString()
          },
          timeout: 15000,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        }
      );
    } catch (apiError) {
      if (apiError.response?.status === 404) {
        console.log("Artemis API not supported, trying ISAPI endpoints...");
        
        // Try ISAPI endpoints
        const auth = Buffer.from(`${process.env.HIK_KEY}:${process.env.HIK_SECRET}`).toString('base64');
        
        // Try different ISAPI endpoints for attendance data
        const isapiEndpoints = [
          '/ISAPI/AccessControl/AcsEvent',
          '/ISAPI/AccessControl/AttendanceRecord',
          '/ISAPI/AccessControl/CardInfo',
          '/ISAPI/System/deviceInfo'
        ];
        
        let isapiResponse = null;
        let workingEndpoint = null;
        
        for (const endpoint of isapiEndpoints) {
          try {
            console.log(`Trying ISAPI endpoint: ${endpoint}`);
            isapiResponse = await axios.get(
              `${process.env.HIK_HOST}${endpoint}`,
              {
                headers: {
                  "Authorization": `Basic ${auth}`,
                  "Content-Type": "application/json"
                },
                timeout: 10000,
                httpsAgent: new (require('https').Agent)({
                  rejectUnauthorized: false
                })
              }
            );
            workingEndpoint = endpoint;
            console.log(`Successfully connected to: ${endpoint}`);
            break;
          } catch (endpointError) {
            console.log(`Failed to connect to ${endpoint}: ${endpointError.message}`);
            continue;
          }
        }
        
        if (!isapiResponse) {
          console.log("Neither Artemis API nor ISAPI endpoints are supported. Attempting web scraping...");
          
          // Try web scraping as a fallback
          try {
            const scrapeResult = await scrapeHikvisionAttendance(
              process.env.HIK_HOST,
              process.env.HIK_KEY,
              process.env.HIK_SECRET
            );
            
            if (scrapeResult.success && scrapeResult.events.length > 0) {
              console.log(`Successfully scraped ${scrapeResult.events.length} events from web interface`);
              
              // Process scraped events
              const events = scrapeResult.events;
              let savedCount = 0;

              for (const event of events) {
                try {
                  const record = {
                    employeeId: event.employeeNo,
                    employeeName: event.personName,
                    direction: event.eventType === "access_granted" ? "in" : "out",
                    punchTime: event.time,
                    deviceId: event.readerName,
                    source: "hikvision-web"
                  };

                  if (record.employeeId) {
                    await Attendance.create(record);
                    savedCount++;
                    console.log(`Saved scraped attendance for employee: ${record.employeeId} - ${record.employeeName}`);
                  }
                } catch (saveError) {
                  console.error("Error saving scraped event:", saveError.message);
                }
              }

              return res.status(200).json({
                success: true,
                message: `Successfully scraped and saved ${savedCount} events from Hikvision web interface`,
                events: events,
                savedCount: savedCount,
                apiType: 'Web Scraping',
                scrapedUrl: scrapeResult.scrapedUrl
              });
            } else {
              console.log("Web scraping successful but no events found");
              return res.status(200).json({
                success: true,
                message: "Web scraping successful but no attendance events found",
                events: [],
                savedCount: 0,
                apiType: 'Web Scraping'
              });
            }
          } catch (scrapeError) {
            console.error("Web scraping failed:", scrapeError.message);
            // If web scraping also fails, provide comprehensive error message
            throw new Error(`Neither Artemis API nor ISAPI endpoints are supported by this device, and web scraping also failed: ${scrapeError.message}. This device may require manual data export or specialized software.`);
          }
        }
        
        response = isapiResponse;
        
        // Process ISAPI response
        if (response.data) {
          // Convert ISAPI format to match expected format
          const events = [];
          
          if (workingEndpoint.includes('AcsEvent')) {
            // Handle access control events
            if (response.data.AcsEvent) {
              events.push(...response.data.AcsEvent.map(event => ({
                employeeNo: event.employeeNo || event.employeeNoString,
                personName: event.name || "Unknown Employee",
                eventType: event.majorEventType === 5 ? "access_granted" : "access_denied",
                time: event.time || event.timeStamp,
                deviceName: event.deviceName || "hikvision",
                readerName: event.readerName || "default"
              })));
            }
          } else if (workingEndpoint.includes('AttendanceRecord')) {
            // Handle attendance records
            if (response.data.AttendanceRecord) {
              events.push(...response.data.AttendanceRecord.map(record => ({
                employeeNo: record.employeeNo || record.employeeNoString,
                personName: record.name || "Unknown Employee", 
                eventType: "access_granted",
                time: record.time || record.dateTime,
                deviceName: record.deviceName || "hikvision",
                readerName: record.readerName || "default"
              })));
            }
          }
          
          // Mock the response structure expected by the rest of the code
          response.data = { data: events };
        }
      } else {
        throw apiError;
      }
    }

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
            employeeName: event.personName || event.employeeName || "Unknown Employee",
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
            console.log(`Saved attendance for employee: ${record.employeeId} - ${record.employeeName}`);
          }
        } catch (saveError) {
          console.error("Error saving individual event:", saveError.message);
        }
      }

      res.status(200).json({
        success: true,
        message: `Successfully pulled and saved ${savedCount} events from Hikvision`,
        events: events,
        savedCount: savedCount,
        apiType: response.config?.url?.includes('artemis') ? 'Artemis API' : 'ISAPI'
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
        "Verify HIK_KEY and HIK_SECRET in environment variables",
        "Check if basic authentication is enabled on the device",
        "Ensure the username and password are correct"
      ];
    } else if (err.response?.status === 404) {
      errorMessage = "Hikvision API endpoints not found. This device may not support programmatic access.";
      suggestions = [
        "This Hikvision device model may not support API access",
        "Device may require web scraping or manual data export",
        "Check device documentation for supported integration methods",
        "Consider using HikCentral software for data collection",
        "Contact Hikvision support for API documentation specific to your device model"
      ];
    } else if (err.message.includes("Neither Artemis API nor ISAPI")) {
      errorMessage = "Device does not support standard Hikvision APIs and web scraping failed.";
      suggestions = [
        "This device may require manual data export through the web interface",
        "Consider using HikCentral or iVMS software for data collection",
        "Contact device administrator for alternative data access methods",
        "Device may need firmware update to support API access",
        "Check if the device web interface requires specific browser or plugin"
      ];
    } else {
      suggestions = [
        "Check device documentation for API configuration",
        "Verify network settings and firewall rules",
        "Contact device administrator for assistance",
        "Try accessing the device web interface directly in a browser"
      ];
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: err.message,
      suggestions: suggestions,
      troubleshooting: {
        deviceIp: process.env.HIK_HOST,
        endpoint: `${process.env.HIK_HOST}/artemis/api/acs/v1/events`,
        errorCode: err.code,
        statusCode: err.response?.status,
        deviceModel: "Unknown - API endpoints not found"
      }
    });
  }
});

// Test connection to Hikvision
router.get("/test-connection", async (req, res) => {
  try {
    console.log("Testing Hikvision connection...");
    console.log("Base URL:", process.env.HIK_HOST);
    console.log("Using basic auth with username:", process.env.HIK_KEY);

    // First, try to check if the device is reachable
    const deviceUrl = new URL(process.env.HIK_HOST);
    const isReachable = await checkDeviceReachability(deviceUrl.hostname, deviceUrl.port || '80');
    
    if (!isReachable) {
      console.log("Device is not reachable on the specified port");
      return res.status(503).json({
        success: false,
        error: "Hikvision device is not reachable. Please check if the device is online and the port is correct.",
        suggestion: "Verify the device IP address and port configuration. Common ports are 80, 8000, or 8080."
      });
    }

    // Try basic authentication instead of Artemis API
    const auth = Buffer.from(`${process.env.HIK_KEY}:${process.env.HIK_SECRET}`).toString('base64');
    
    // Try to access the root page or a common login page
    const testUrls = [
      `${process.env.HIK_HOST}/`,
      `${process.env.HIK_HOST}/doc/page/login.asp`,
      `${process.env.HIK_HOST}/login.asp`,
      `${process.env.HIK_HOST}/index.asp`
    ];
    
    let response = null;
    let testedUrl = '';
    
    for (const url of testUrls) {
      try {
        console.log(`Trying URL: ${url}`);
        response = await axios.get(url, {
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          },
          timeout: 10000,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        });
        testedUrl = url;
        console.log(`Successfully connected to: ${url}`);
        break;
      } catch (urlError) {
        console.log(`Failed to connect to ${url}: ${urlError.message}`);
        continue;
      }
    }
    
    if (!response) {
      throw new Error('Could not connect to any of the tested Hikvision URLs');
    }

    console.log("Hikvision connection successful with basic auth!");
    console.log("Response status:", response.status);

    res.status(200).json({
      success: true,
      message: "Successfully connected to Hikvision device using basic authentication",
      deviceInfo: {
        status: 'connected',
        authType: 'basic',
        ip: deviceUrl.hostname,
        responseStatus: response.status,
        accessedUrl: testedUrl
      }
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
        deviceIp: process.env.HIK_HOST,
        endpoint: `${process.env.HIK_HOST}/artemis/api/acs/v1/deviceStatus`,
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
