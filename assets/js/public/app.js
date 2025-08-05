// Global variables
const ORDERS_SHEET_NAME = "Orders";
const ORDER_ITEMS_SHEET_NAME = "Order Items";
const SHEET_ID = "1DS_ycmVO8GPIQpvyEIeiwyU4SQtG2OkV_enVJDT4wuc";

function doPost(e) {
  try {
    // Log the entire event object for debugging
    console.log("doPost event object:", JSON.stringify(e));
    
    // Check if postData exists
    if (!e || !e.postData) {
      console.error("No postData found in request");
      return createResponse(false, 'No POST data received. Make sure to send data in the request body.');
    }
    
    // Check if postData.contents exists
    if (!e.postData.contents) {
      console.error("No contents found in postData");
      return createResponse(false, 'No content found in POST data.');
    }
    
    console.log("Raw POST data:", e.postData.contents);
    
    // Parse incoming data
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return createResponse(false, 'Invalid JSON format in request body: ' + parseError.toString());
    }
    
    const action = data.action;
    
    // Log the incoming request
    console.log("doPost received action:", action);
    console.log("doPost received data:", JSON.stringify(data));
    
    // Validate action parameter
    if (!action) {
      return createResponse(false, 'Action parameter is required');
    }
    
    // Handle different actions
    if (action === 'submitOrder') {
      if (!data.order) {
        return createResponse(false, 'Order data is required for submitOrder action');
      }
      return processOrderSubmission(data.order);
    } else if (action === 'updateOrderStatus') {
      if (!data.data) {
        return createResponse(false, 'Update data is required for updateOrderStatus action');
      }
      return updateOrderStatusWithDetails(data.data);
    } else {
      return createResponse(false, 'Invalid action specified. Supported actions: submitOrder, updateOrderStatus');
    }
  } catch (error) {
    console.error("doPost error:", error);
    console.error("Error stack:", error.stack);
    return createResponse(false, 'Error processing request: ' + error.toString());
  }
}

function doGet(e) {
  try {
    // Log the entire event object for debugging
    console.log("doGet event object:", JSON.stringify(e));
    
    // Check if parameter exists
    if (!e || !e.parameter) {
      console.error("No parameters found in request");
      return createResponse(false, 'No parameters received in GET request');
    }
    
    // Parse the query parameters
    const action = e.parameter.action;
    
    console.log("doGet received action:", action);
    console.log("doGet received parameters:", JSON.stringify(e.parameter));
    
    // Validate action parameter
    if (!action) {
      return createResponse(false, 'Action parameter is required');
    }
    
    if (action === 'getOrders') {
      return getOrdersResponse(e.parameter.limit, e.parameter.userId);
    } else if (action === 'getAllOrders') {
      // NEW: Handle getAllOrders action for dashboard
      return getAllOrdersResponse(e.parameter.limit);
    } else if (action === 'getOrderDetails') {
      if (!e.parameter.orderId) {
        return createResponse(false, 'orderId parameter is required for getOrderDetails action');
      }
      return getOrderDetailsResponse(e.parameter.orderId, e.parameter.userId);
    } else if (action === 'getOrderStats') {
      return getOrderStats(e.parameter.userId);
    } else if (action === 'test') {
      // Add a test endpoint
      return createResponse(true, 'Web app is working correctly', {
        timestamp: new Date().toISOString(),
        parameters: e.parameter
      });
    } else {
      return createResponse(false, 'Invalid action specified. Supported actions: getOrders, getAllOrders, getOrderDetails, getOrderStats, test');
    }
  } catch (error) {
    console.error("doGet error:", error);
    console.error("Error stack:", error.stack);
    return createResponse(false, 'Error processing request: ' + error.toString());
  }
}

/**
 * Get ALL orders from ALL users for dashboard analytics
 * This function does NOT filter by user ID - it returns all orders
 */
function getAllOrdersResponse(limitParam) {
  try {
    const limit = parseInt(limitParam) || 1000; // Default to 1000 for dashboard
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    const lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) {
      return createResponse(true, 'No orders found', { orders: [] });
    }
    
    // Get headers to map column indices
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    
    // Get all order data (NO FILTERING BY USER ID)
    const allOrderData = ordersSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Sort by date (most recent first) and limit results
    allOrderData.sort((a, b) => {
      const dateA = new Date(a[headers.indexOf('Date')]);
      const dateB = new Date(b[headers.indexOf('Date')]);
      return dateB - dateA;
    });
    
    const limitedOrders = allOrderData.slice(0, limit);
    
    // Create an array of order objects
    const orders = limitedOrders.map(row => {
      const order = {};
      headers.forEach((header, index) => {
        // Format date fields
        if (header === 'Date' && row[index] instanceof Date) {
          order[header] = row[index].toISOString();
        } 
        // Process Items JSON with better error handling and fallback
        else if (header === 'Items JSON') {
          order[header] = row[index];
          
          try {
            if (typeof row[index] === 'string' && row[index].trim().startsWith("[")) {
              order.items = JSON.parse(row[index]);
              
              const validItems = order.items.every(item => 
                item.price !== undefined && 
                item.quantity !== undefined
              );
              
              if (!validItems) {
                const orderIdIndex = headers.indexOf('Order ID');
                const orderId = row[orderIdIndex];
                const userIdIndex = headers.indexOf('User ID');
                const userId = row[userIdIndex] || "GUEST";
                order.items = getOrderItems(orderId, userId);
              }
            } else {
              const orderIdIndex = headers.indexOf('Order ID');
              const orderId = row[orderIdIndex];
              const userIdIndex = headers.indexOf('User ID');
              const userId = row[userIdIndex] || "GUEST";
              order.items = getOrderItems(orderId, userId);
            }
          } catch (e) {
            console.error('Error parsing Items JSON:', e);
            const orderIdIndex = headers.indexOf('Order ID');
            const orderId = row[orderIdIndex];
            const userIdIndex = headers.indexOf('User ID');
            const userId = row[userIdIndex] || "GUEST";
            order.items = getOrderItems(orderId, userId);
          }
        }
        // Don't include the full JSON in the list view
        else if (header !== 'Full Order JSON') {
          order[header] = row[index];
        }
      });
      return order;
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'All orders retrieved successfully',
      orders: orders,
      totalCount: allOrderData.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return createResponse(false, 'Error retrieving all orders: ' + error.toString());
  }
}

/**
 * Process an order submission and store it in the Orders sheet
 */
function processOrderSubmission(orderData) {
  if (!orderData) {
    return createResponse(false, 'Invalid order data: Order data is missing');
  }
  
  // Ensure customer object exists
  if (!orderData.customer) {
    return createResponse(false, 'Invalid order data: Customer information is missing');
  }
  
  // Ensure order object exists
  if (!orderData.order) {
    return createResponse(false, 'Invalid order data: Order details are missing');
  }
  
  // Set default order status - ALWAYS "Order Placed" when customer places order
  orderData.status = "Order Placed";
  
  // Get user ID - use "GUEST" as default if not provided
  const userId = orderData.userId || orderData.customer.userId || "GUEST";
  
  // Standardize image URLs across the entire order object
  orderData = standardizeImageUrls(orderData);

  // --- COD Charges Logic ---
  let codCharges = 0;
  if (orderData.paymentMethod === 'cod') {
    // Accept 0 as a valid value, not just truthy
    codCharges = (orderData.order.codCharges !== undefined && orderData.order.codCharges !== null)
      ? parseFloat(orderData.order.codCharges) || 0
      : 0;
    // Add to total if not already included
    if (!orderData.order.total || orderData.order.total < (orderData.order.subtotal + orderData.order.tax + orderData.order.shipping - (orderData.order.discount || 0) + codCharges - 0.01)) {
      orderData.order.total = (orderData.order.subtotal + orderData.order.tax + orderData.order.shipping - (orderData.order.discount || 0) + codCharges);
    }
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  
  // Create Orders sheet if it doesn't exist
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(ORDERS_SHEET_NAME);
    
    // Set up headers with reorganized columns and Last Updated column after Comments
    const headers = [
      'Order ID', 
      'Date', 
      'User ID',
      'Customer Name', 
      'Email', 
      'Phone', 
      'Address', 
      'City', 
      'State', 
      'ZIP', 
      'Country', 
      'Payment Method', 
      'Payment Status',
      'Shipping Method',
      'Subtotal', 
      'Tax', 
      'Shipping', 
      'Discount', 
      'COD Charges', // <-- Add COD Charges column
      'Total',
      'Order Status',
      'Courier',
      'Tracking ID',
      'Comments',
      'Last Updated', // Added after Comments
      'Processing Timestamp',
      'Shipped Timestamp',
      'Delivered Timestamp',
      'Notes',
      'Items JSON',
      'Full Order JSON'
    ];
    
    ordersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    ordersSheet.setFrozenRows(1);
    
    // Format the header row
    const headerRange = ordersSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
  }
  
  // Generate order ID if not provided
  if (!orderData.id) {
    orderData.id = generateOrderId();
  }
  
  // Set order date if not provided
  if (!orderData.date) {
    orderData.date = new Date().toISOString();
  }
  
  // Set payment status based on payment method - UPDATED LOGIC
  let paymentStatus = "";
  if (orderData.paymentMethod === 'cod') {
    paymentStatus = "pending_cod";
  } else if (orderData.paymentMethod === 'card') {
    paymentStatus = "pending_payment";
  } else {
    paymentStatus = "pending_payment"; // Default for other payment methods
  }
  
  // Current timestamp for Last Updated
  const currentTimestamp = new Date();
  
  // Prepare order data for insertion
  const orderRow = [
    orderData.id,
    new Date(orderData.date),
    userId, // This will now be "GUEST" if not provided
    `${orderData.customer.firstName} ${orderData.customer.lastName}`,
    orderData.customer.email,
    orderData.customer.phone || '',
    orderData.customer.address,
    orderData.customer.city,
    orderData.customer.state || '',
    orderData.customer.zip,
    orderData.customer.country,
    orderData.paymentMethod,
    paymentStatus, // Updated payment status logic
    orderData.shippingMethod || orderData.order.shippingMethod || 'domestic',
    orderData.order.subtotal,
    orderData.order.tax,
    orderData.order.shipping,
    orderData.order.discount || 0,
    codCharges, // Store COD Charges
    orderData.order.total,
    orderData.status, // Will always be "Order Placed"
    '', // Courier
    '', // Tracking ID
    '', // Comments
    currentTimestamp, // Last Updated - set when order is placed
    '', // Processing Timestamp
    '', // Shipped Timestamp
    '', // Delivered Timestamp
    orderData.customer.notes || '', // Notes
    JSON.stringify([...(orderData.order.items || []), ...(orderData.order.complementaryItems || [])]),
    JSON.stringify(orderData)
  ];
  
  // Insert order data
  ordersSheet.appendRow(orderRow);
  
  // Create or update order items sheet
  storeOrderItems(orderData, userId);
  
  // Send email confirmation if email is provided
  if (orderData.customer.email) {
    sendOrderConfirmationEmail(orderData, codCharges);
  }
  
  // Return success response with order ID
  return createResponse(true, 'Order processed successfully', {
    orderId: orderData.id,
    orderStatus: orderData.status,
    paymentStatus: paymentStatus
  });
}

/**
 * Store order items with User ID
 */
function storeOrderItems(orderData, userId) {
  // Use "GUEST" as default if userId is not provided or is null/empty
  const finalUserId = userId || "GUEST";
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let itemsSheet = ss.getSheetByName(ORDER_ITEMS_SHEET_NAME);
  
  // Create Order Items sheet if it doesn't exist
  if (!itemsSheet) {
    itemsSheet = ss.insertSheet(ORDER_ITEMS_SHEET_NAME);
    
    // Set up headers with User ID column
    const headers = [
      'Order ID', 
      'Date', 
      'User ID',
      'Customer Name',
      'Item Name', 
      'Product ID',
      'Quantity',
      'Price', 
      'Subtotal',
      'Options',
      'Image URL',
      'Parent Item',
      'Is Complementary'
    ];
    
    itemsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    itemsSheet.setFrozenRows(1);
    
    // Format the header row
    const headerRange = itemsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
  }
  
  // Add regular items
  if (orderData.order.items && orderData.order.items.length > 0) {
    orderData.order.items.forEach(item => {
      const imageUrl = item.imageUrl || item.image || 'https://via.placeholder.com/60';
      
      const itemRow = [
        orderData.id,
        new Date(orderData.date),
        finalUserId, // Will be "GUEST" if not provided
        `${orderData.customer.firstName} ${orderData.customer.lastName}`,
        item.name,
        item.productId || '',
        item.quantity,
        item.price,
        item.subtotal || (item.price * item.quantity),
        JSON.stringify(item.options || {}),
        imageUrl,
        '',
        false
      ];
      
      itemsSheet.appendRow(itemRow);
    });
  }
  
  // Add complementary items if they exist
  if (orderData.order.complementaryItems && orderData.order.complementaryItems.length > 0) {
    orderData.order.complementaryItems.forEach(item => {
      const imageUrl = item.imageUrl || item.image || 'https://via.placeholder.com/60';
      
      const itemRow = [
        orderData.id,
        new Date(orderData.date),
        finalUserId, // Will be "GUEST" if not provided
        `${orderData.customer.firstName} ${orderData.customer.lastName}`,
        item.name,
        item.productId || '',
        1,
        item.price || 0,
        item.subtotal || item.price || 0,
        JSON.stringify(item.options || { size: item.size, notes: item.notes }),
        imageUrl,
        item.parentItem || '',
        true
      ];
      
      itemsSheet.appendRow(itemRow);
    });
  }
}

/**
 * Get recent orders for the dashboard (optionally filtered by user ID)
 */
function getOrdersResponse(limitParam, userId) {
  try {
    const limit = parseInt(limitParam) || 10;
    // Use "GUEST" as default if userId is not provided
    const finalUserId = userId || "GUEST";
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    const lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) {
      return createResponse(true, 'No orders found', { orders: [] });
    }
    
    // Get headers to map column indices
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const userIdIndex = headers.indexOf('User ID');
    
    // Get all order data
    const allOrderData = ordersSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Filter by user ID (including GUEST)
    let filteredOrders = allOrderData;
    if (userIdIndex !== -1) {
      filteredOrders = allOrderData.filter(row => row[userIdIndex] === finalUserId);
    }
    
    // Sort by date (most recent first) and limit results
    filteredOrders.sort((a, b) => {
      const dateA = new Date(a[headers.indexOf('Date')]);
      const dateB = new Date(b[headers.indexOf('Date')]);
      return dateB - dateA;
    });
    
    const limitedOrders = filteredOrders.slice(0, limit);
    
    // Create an array of order objects
    const orders = limitedOrders.map(row => {
      const order = {};
      headers.forEach((header, index) => {
        // Format date fields
        if ((header === 'Date' || header === 'Last Updated' || header.endsWith('Timestamp')) && row[index] instanceof Date) {
          order[header] = row[index].toISOString();
        } 
        // Process Items JSON with better error handling and fallback
        else if (header === 'Items JSON') {
          order[header] = row[index];
          
          try {
            if (typeof row[index] === 'string' && row[index].trim().startsWith("[")) {
              order.items = JSON.parse(row[index]);
              
              const validItems = order.items.every(item => 
                item.price !== undefined && 
                item.quantity !== undefined
              );
              
              if (!validItems) {
                const orderIdIndex = headers.indexOf('Order ID');
                const orderId = row[orderIdIndex];
                order.items = getOrderItems(orderId, finalUserId);
              }
            } else {
              const orderIdIndex = headers.indexOf('Order ID');
              const orderId = row[orderIdIndex];
              order.items = getOrderItems(orderId, finalUserId);
            }
          } catch (e) {
            console.error('Error parsing Items JSON:', e);
            const orderIdIndex = headers.indexOf('Order ID');
            const orderId = row[orderIdIndex];
            order.items = getOrderItems(orderId, finalUserId);
          }
        }
        // Don't include the full JSON in the list view
        else if (header !== 'Full Order JSON') {
          order[header] = row[index];
        }
      });
      return order;
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Orders retrieved successfully',
      orders: orders
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return createResponse(false, 'Error retrieving orders: ' + error.toString());
  }
}

/**
 * Get order details by ID (optionally filtered by user ID for security)
 */
function getOrderDetailsResponse(orderId, userId) {
  try {
    if (!orderId) {
      return createResponse(false, 'Order ID is required');
    }
    
    // Use "GUEST" as default if userId is not provided
    const finalUserId = userId || "GUEST";
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    // Get headers to map column indices
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const orderIdIndex = headers.indexOf('Order ID');
    const userIdIndex = headers.indexOf('User ID');
    
    if (orderIdIndex === -1) {
      return createResponse(false, 'Order ID column not found');
    }
    
    // Get all data
    const lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) {
      return createResponse(false, 'No orders found');
    }
    
    const allData = ordersSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Find the order row
    let targetRow = null;
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      if (row[orderIdIndex] === orderId) {
        // Allow lookup by orderId only, ignore userId check
        targetRow = row;
        break;
      }
    }
    
    if (!targetRow) {
      return createResponse(false, `Order with ID ${orderId} not found`);
    }
    
    // Create an order object
    const order = {};
    let fullOrderJSON = null;
    
    headers.forEach((header, index) => {
      if ((header === 'Date' || header === 'Last Updated' || header.endsWith('Timestamp')) && targetRow[index] instanceof Date) {
        order[header] = targetRow[index].toISOString();
      } else if (header === 'Full Order JSON') {
        try {
          fullOrderJSON = JSON.parse(targetRow[index]);
        } catch (e) {
          console.error('Error parsing Full Order JSON:', e);
          fullOrderJSON = null;
        }
      } else {
        order[header] = targetRow[index];
      }
    });
    
    // Add items from Order Items sheet if needed
    if (!order.items || !Array.isArray(order.items)) {
      order.items = getOrderItems(orderId, finalUserId);
    }
    
    // Use the parsed full JSON if available, otherwise use the constructed order object
    const responseData = { ...(fullOrderJSON || {}), ...order };
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Order details retrieved successfully',
      order: responseData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return createResponse(false, 'Error retrieving order details: ' + error.toString());
  }
}

/**
 * Get order items from the Order Items sheet (with GUEST handling)
 */
function getOrderItems(orderId, userId) {
  try {
    // Use "GUEST" as default if userId is not provided
    const finalUserId = userId || "GUEST";
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const itemsSheet = ss.getSheetByName(ORDER_ITEMS_SHEET_NAME);
    
    if (!itemsSheet) {
      return [];
    }
    
    const lastRow = itemsSheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    
    // Get headers to map column indices
    const headers = itemsSheet.getRange(1, 1, 1, itemsSheet.getLastColumn()).getValues()[0];
    const orderIdIndex = headers.indexOf('Order ID');
    const userIdIndex = headers.indexOf('User ID');
    const imageUrlIndex = headers.indexOf('Image URL');
    
    if (orderIdIndex === -1) {
      return [];
    }
    
    // Get all rows
    const allData = itemsSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Filter rows for the given order ID and user ID (including GUEST)
    const orderItems = allData.filter(row => {
      const matchesOrderId = row[orderIdIndex] === orderId;
      const matchesUserId = userIdIndex === -1 || row[userIdIndex] === finalUserId;
      return matchesOrderId && matchesUserId;
    });
    
    if (orderItems.length === 0) {
      return [];
    }
    
    // Create array of item objects
    return orderItems.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        if (header === 'Date' && row[index] instanceof Date) {
          item[header] = row[index].toISOString();
        } else if (header === 'Options' && typeof row[index] === 'string') {
          try {
            item[header] = JSON.parse(row[index]);
          } catch (e) {
            item[header] = {};
          }
        } else {
          item[header] = row[index];
        }
      });
      
      // Ensure the image URL is properly transferred
      if (imageUrlIndex !== -1 && row[imageUrlIndex]) {
        item.imageUrl = row[imageUrlIndex];
        item.image = row[imageUrlIndex]; // For backward compatibility
      }
      
      return item;
    });
  } catch (error) {
    console.error("Error getting order items:", error);
    return [];
  }
}

/**
 * Standardize image URLs across the entire order object
 */
function standardizeImageUrls(orderData) {
  if (!orderData) return orderData;
  
  // Process main order items
  if (orderData.order && orderData.order.items && Array.isArray(orderData.order.items)) {
    orderData.order.items = orderData.order.items.map(item => {
      if (!item) return item;
      
      return {
        ...item,
        imageUrl: item.imageUrl || item.image || 'https://via.placeholder.com/60'
      };
    });
  }
  
  // Process complementary items if they exist
  if (orderData.order && orderData.order.complementaryItems && Array.isArray(orderData.order.complementaryItems)) {
    orderData.order.complementaryItems = orderData.order.complementaryItems.map(item => {
      if (!item) return item;
      
      return {
        ...item,
        imageUrl: item.imageUrl || item.image || 'https://via.placeholder.com/60'
      };
    });
  }
  
  return orderData;
}

/**
 * Generate a unique order ID
 */
function generateOrderId() {
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create a standardized API response
 */
function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    ...data
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Update order status with additional tracking details
 */
function updateOrderStatusWithDetails(updateData) {
  try {
    if (!updateData || !updateData.orderId || !updateData.orderStatus) {
      return createResponse(false, 'Invalid update data: Order ID and status are required');
    }
    
    const orderId = updateData.orderId;
    const newStatus = updateData.orderStatus;
    const courier = updateData.courier || '';
    const trackingId = updateData.trackingId || '';
    const comments = updateData.comments || '';
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    // Get headers to map column indices
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const orderIdIndex = headers.indexOf('Order ID');
    const orderStatusIndex = headers.indexOf('Order Status');
    const courierIndex = headers.indexOf('Courier');
    const trackingIndex = headers.indexOf('Tracking ID');
    const commentsIndex = headers.indexOf('Comments');
    const lastUpdatedIndex = headers.indexOf('Last Updated');
    const processingTimestampIndex = headers.indexOf('Processing Timestamp');
    const shippedTimestampIndex = headers.indexOf('Shipped Timestamp');
    const deliveredTimestampIndex = headers.indexOf('Delivered Timestamp');
    const fullJsonIndex = headers.indexOf('Full Order JSON');
    
    if (orderIdIndex === -1 || orderStatusIndex === -1) {
      return createResponse(false, 'Required columns not found in the Orders sheet');
    }
    
    // Get all order IDs
    const lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) {
      return createResponse(false, 'No orders found');
    }
    
    const orderIds = ordersSheet.getRange(2, orderIdIndex + 1, lastRow - 1, 1).getValues();
    
    // Find the row index for the order ID
    let targetRowIndex = -1;
    for (let i = 0; i < orderIds.length; i++) {
      if (orderIds[i][0] === orderId) {
        targetRowIndex = i + 2; // +2 because we start at row 2 and arrays are 0-indexed
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return createResponse(false, `Order with ID ${orderId} not found`);
    }
    
    const now = new Date();
    
    // Update the order status and tracking info
    ordersSheet.getRange(targetRowIndex, orderStatusIndex + 1).setValue(newStatus);
    
    if (courierIndex !== -1) {
      ordersSheet.getRange(targetRowIndex, courierIndex + 1).setValue(courier);
    }
    
    if (trackingIndex !== -1) {
      ordersSheet.getRange(targetRowIndex, trackingIndex + 1).setValue(trackingId);
    }
    
    if (commentsIndex !== -1) {
      ordersSheet.getRange(targetRowIndex, commentsIndex + 1).setValue(comments);
    }
    
    // Update Last Updated timestamp
    if (lastUpdatedIndex !== -1) {
      ordersSheet.getRange(targetRowIndex, lastUpdatedIndex + 1).setValue(now);
    }

    // Update status-specific timestamps if they are not already set
    if (newStatus === "Processing" && processingTimestampIndex !== -1) {
        const currentTimestamp = ordersSheet.getRange(targetRowIndex, processingTimestampIndex + 1).getValue();
        if (!currentTimestamp) {
            ordersSheet.getRange(targetRowIndex, processingTimestampIndex + 1).setValue(now);
        }
    }
    if (newStatus === "Shipped" && shippedTimestampIndex !== -1) {
        const currentTimestamp = ordersSheet.getRange(targetRowIndex, shippedTimestampIndex + 1).getValue();
        if (!currentTimestamp) {
            ordersSheet.getRange(targetRowIndex, shippedTimestampIndex + 1).setValue(now);
        }
    }
    if (newStatus === "Delivered" && deliveredTimestampIndex !== -1) {
        const currentTimestamp = ordersSheet.getRange(targetRowIndex, deliveredTimestampIndex + 1).getValue();
        if (!currentTimestamp) {
            ordersSheet.getRange(targetRowIndex, deliveredTimestampIndex + 1).setValue(now);
        }
    }
    
    // Update Full Order JSON if it exists
    if (fullJsonIndex !== -1) {
      try {
        const currentFullJson = ordersSheet.getRange(targetRowIndex, fullJsonIndex + 1).getValue();
        if (currentFullJson) {
          const fullOrderData = JSON.parse(currentFullJson);
          fullOrderData.status = newStatus;
          fullOrderData.courier = courier;
          fullOrderData.trackingId = trackingId;
          fullOrderData.comments = comments;
          fullOrderData.lastUpdated = now.toISOString();
          
          // Also update timestamps in the JSON
          if (newStatus === "Processing" && !fullOrderData['Processing Timestamp']) {
            fullOrderData['Processing Timestamp'] = now.toISOString();
          }
          if (newStatus === "Shipped" && !fullOrderData['Shipped Timestamp']) {
            fullOrderData['Shipped Timestamp'] = now.toISOString();
          }
          if (newStatus === "Delivered" && !fullOrderData['Delivered Timestamp']) {
            fullOrderData['Delivered Timestamp'] = now.toISOString();
          }

          ordersSheet.getRange(targetRowIndex, fullJsonIndex + 1).setValue(JSON.stringify(fullOrderData));
        }
      } catch (e) {
        console.error('Error updating Full Order JSON:', e);
      }
    }
    
    // Send notification email if order is shipped and tracking ID is provided
    if (newStatus.toLowerCase().includes('shipped') && trackingId) {
      try {
        sendShippingNotification(orderId, trackingId, courier);
      } catch (e) {
        console.error('Error sending shipping notification:', e);
      }
    }
    
    return createResponse(true, 'Order status updated successfully', {
      orderId: orderId,
      orderStatus: newStatus,
      courier: courier,
      trackingId: trackingId,
      comments: comments,
      lastUpdated: now.toISOString()
    });
  } catch (error) {
    console.error("updateOrderStatusWithDetails error:", error);
    return createResponse(false, 'Error updating order status: ' + error.toString());
  }
}

/**
 * Get order statistics for a user (with GUEST handling)
 */
function getOrderStats(userId) {
  try {
    // Use "GUEST" as default if userId is not provided
    const finalUserId = userId || "GUEST";
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    const lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) {
      return createResponse(true, 'No orders found', {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        ordersByStatus: {}
      });
    }
    
    // Get headers to map column indices
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const userIdIndex = headers.indexOf('User ID');
    const totalIndex = headers.indexOf('Total');
    const statusIndex = headers.indexOf('Order Status');
    
    // Get all order data
    const allOrderData = ordersSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Filter by user ID (including GUEST)
    let userOrders = allOrderData;
    if (userIdIndex !== -1) {
      userOrders = allOrderData.filter(row => row[userIdIndex] === finalUserId);
    }
    
    if (userOrders.length === 0) {
      return createResponse(true, 'No orders found for user', {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        ordersByStatus: {}
      });
    }
    
    // Calculate statistics
    const totalOrders = userOrders.length;
    let totalSpent = 0;
    const ordersByStatus = {};
    
    userOrders.forEach(row => {
      // Calculate total spent
      if (totalIndex !== -1 && typeof row[totalIndex] === 'number') {
        totalSpent += row[totalIndex];
      }
      
      // Count orders by status
      if (statusIndex !== -1) {
        const status = row[statusIndex] || 'Unknown';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      }
    });
    
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    return createResponse(true, 'Order statistics retrieved successfully', {
      totalOrders: totalOrders,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      ordersByStatus: ordersByStatus
    });
  } catch (error) {
    console.error("getOrderStats error:", error);
    return createResponse(false, 'Error retrieving order statistics: ' + error.toString());
  }
}

/**
 * Send order confirmation email to customer
 */
function sendOrderConfirmationEmail(orderData, codCharges) {
  try {
    const customerName = `${orderData.customer.firstName} ${orderData.customer.lastName}`;
    const customerEmail = orderData.customer.email;
    const orderId = orderData.id;
    
    // Create items list for email
    let itemsList = '';
    if (orderData.order.items && orderData.order.items.length > 0) {
      itemsList = orderData.order.items.map(item => {
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 10px; vertical-align: middle;">
              ${item.name}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      }).join('');
    }
    
    // Add complementary items if they exist
    if (orderData.order.complementaryItems && orderData.order.complementaryItems.length > 0) {
      const compItems = orderData.order.complementaryItems.map(item => {
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 10px; vertical-align: middle;">
              ${item.name} <span style="color: #28a745; font-weight: bold;">(Additional)</span>
            </td>
           <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      }).join('');
      itemsList += compItems;
    }
    
    // Create email body
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Order Confirmation</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${customerName},</p>
          
          <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 10px 0 0;"><strong>Order Date:</strong> ${new Date(orderData.date).toLocaleDateString()}</p>
            <p style="margin: 10px 0 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Payment'}</p>
          </div>
          
          <h3>Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          <div style="border-top: 2px solid #dee2e6; padding-top: 15px;">
            <table style="width: 100%; margin-left: auto; width: 300px;">
              <tr>
                <td style="padding: 5px 0; text-align: right;"><strong>Subtotal:</strong></td>
                <td style="padding: 5px 0; text-align: right; width: 100px;">$${orderData.order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; text-align: right;"><strong>Tax:</strong></td>
                <td style="padding: 5px 0; text-align: right;">$${orderData.order.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; text-align: right;"><strong>Shipping:</strong></td>
                <td style="padding: 5px 0; text-align: right;">$${orderData.order.shipping.toFixed(2)}</td>
              </tr>
              ${orderData.order.discount > 0 ? `
              <tr>
                <td style="padding: 5px 0; text-align: right; color: #28a745;"><strong>Discount:</strong></td>
                <td style="padding: 5px 0; text-align: right; color: #28a745;">-$${orderData.order.discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${(codCharges && codCharges > 0) ? `
              <tr>
                <td style="padding: 5px 0; text-align: right; color: #ff9800;"><strong>COD Charges:</strong></td>
                <td style="padding: 5px 0; text-align: right; color: #ff9800;">$${codCharges.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1px solid #dee2e6;">
                <td style="padding: 10px 0; text-align: right; font-size: 18px;"><strong>Total:</strong></td>
                <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold;">$${orderData.order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <h3>Shipping Address:</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p style="margin: 0;">
              ${customerName}<br>
              ${orderData.customer.address}<br>
              ${orderData.customer.city}, ${orderData.customer.state} ${orderData.customer.zip}<br>
              ${orderData.customer.country}<br>
              Phone: ${orderData.customer.phone}
            </p>
          </div>
          
          ${orderData.customer.notes ? `
          <h3>Order Notes:</h3>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0;">${orderData.customer.notes}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 30px;">We'll send you another email when your order ships. If you have any questions, please contact our customer service.</p>
          
          <p>Thank you for your business!</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;
    
    // Send the email
    MailApp.sendEmail({
      to: customerEmail,
      subject: `Order Confirmation - ${orderId}`,
      htmlBody: body
    });
    
    console.log(`Order confirmation email sent to ${customerEmail} for order ${orderId}`);
    return true;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return false;
  }
}


/**
 * Send shipping notification email
 */
function sendShippingNotification(orderId, trackingId, courier) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    if (!ordersSheet) {
      console.error('Orders sheet not found for shipping notification');
      return;
    }
    
    // Get order details
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const orderIdIndex = headers.indexOf('Order ID');
    const emailIndex = headers.indexOf('Email');
    const customerNameIndex = headers.indexOf('Customer Name');
    
    if (orderIdIndex === -1 || emailIndex === -1) {
      console.error('Required columns not found for shipping notification');
      return;
    }
    
    const lastRow = ordersSheet.getLastRow();
    const allData = ordersSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Find the order
    const orderRow = allData.find(row => row[orderIdIndex] === orderId);
    if (!orderRow) {
      console.error(`Order ${orderId} not found for shipping notification`);
      return;
    }
    
    const customerEmail = orderRow[emailIndex];
    const customerName = orderRow[customerNameIndex];
    
    if (!customerEmail) {
      console.log('No email address found for shipping notification');
      return;
    }
    
    const subject = `Your Order Has Been Shipped - ${orderId}`;
    const emailBody = `
Dear ${customerName},

Great news! Your order has been shipped and is on its way to you.

Shipping Details:
Order ID: ${orderId}
Courier: ${courier}
Tracking ID: ${trackingId}
Status: Shipped

You can track your package using the tracking ID provided above on the courier's website.

Thank you for your business!

Best regards,
Your Store Team
    `;
    
    // Send email
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: emailBody
    });
    
    console.log(`Shipping notification sent to ${customerEmail} for order ${orderId}`);
  } catch (error) {
    console.error('Error sending shipping notification:', error);
  }
}