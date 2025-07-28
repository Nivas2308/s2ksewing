 // Google Apps Script Web App URL - REPLACE THIS WITH YOUR DEPLOYED SCRIPT URL
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFQGWg83k7nTxCRfqezwQUNl5fU85tGpEVd1m1ARqOiPxskPzmPiLD1oi7giX5v5syRw/exec";
      
      
      // Function to fetch pricing configuration from Google Sheets
      async function fetchPricingConfig() {
        try {
          document.getElementById('loadingMessage').style.display = 'block';
          document.getElementById('shippingTable').style.display = 'none';
          
          const response = await fetch(`${SCRIPT_URL}?action=getPricingConfig`);
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          updateShippingTable(data);
       
          
          document.getElementById('loadingMessage').style.display = 'none';
          document.getElementById('shippingTable').style.display = 'table';
          
          // Update last fetch time
          document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleString()}`;
        } catch (error) {
          console.error('Error fetching pricing data:', error);
          document.getElementById('loadingMessage').textContent = 'Error loading shipping information. Please try again later.';
        }
      }
      
      // Function to update the shipping table with fetched data
      function updateShippingTable(data) {
        const tableBody = document.getElementById('shippingTableBody');
        tableBody.innerHTML = '';
        
        // Add domestic shipping row
        const domesticRow = document.createElement('tr');
        domesticRow.innerHTML = `
          <td>Domestic Shipping</td>
          <td>$${data.shippingCosts.domestic.toFixed(2)}</td>
          <td>$${data.freeShippingThreshold.toFixed(2)}</td>
          <td>${data.deliveryTimes.domestic} business days</td>
        `;
        tableBody.appendChild(domesticRow);
        
        // Add business shipping row
        const businessRow = document.createElement('tr');
        businessRow.innerHTML = `
          <td>Business Shipping</td>
          <td>$${data.shippingCosts.business.toFixed(2)}</td>
          <td>$${data.freeShippingThreshold.toFixed(2)}</td>
          <td>${data.deliveryTimes.business} business days</td>
        `;
        tableBody.appendChild(businessRow);
        
        // Add international shipping row
        const internationalRow = document.createElement('tr');
        internationalRow.innerHTML = `
          <td>International Shipping</td>
          <td>$${data.shippingCosts.international.toFixed(2)}</td>
          <td>$${data.freeShippingThreshold.toFixed(2)}</td>
          <td>${data.deliveryTimes.international} business days</td>
        `;
        tableBody.appendChild(internationalRow);
        
        // Add express shipping row
        const expressRow = document.createElement('tr');
        expressRow.innerHTML = `
          <td>Express Shipping</td>
          <td>$${data.shippingCosts.express.toFixed(2)}</td>
          <td>$${data.freeShippingThreshold.toFixed(2)}</td>
          <td>${data.deliveryTimes.express} business day${data.deliveryTimes.express !== 1 ? 's' : ''}</td>
        `;
        tableBody.appendChild(expressRow);
      }
      
   
      
      // Fetch data on page load
      document.addEventListener('DOMContentLoaded', fetchPricingConfig);
      
      // Refresh data every 5 minutes (300000 ms)
      setInterval(fetchPricingConfig, 300000);