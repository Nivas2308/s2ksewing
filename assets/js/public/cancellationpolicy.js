// Google Sheets Web App URL (you'll replace this with your actual deployed Google Apps Script URL)
      const GOOGLE_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbz7ZzI7hStZLqcBzDSo2gk9F4B2Qo47npGbINcmGYckr_jYDPbOo9sRhoLRC3cqLjsL/exec";

      document.addEventListener("DOMContentLoaded", function () {
        loadPolicyData();

        // Set up FAQ toggle functionality
        document.addEventListener("click", function (e) {
          if (e.target.classList.contains("question")) {
            let answer = e.target.nextElementSibling;
            e.target.classList.toggle('active');
            answer.style.display =
              answer.style.display === "block" ? "none" : "block";
          }
        });
      });

      function loadPolicyData() {
        fetch(GOOGLE_SCRIPT_URL + "?action=getData")
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              updatePolicyContent(data.data);
            } else {
              console.error("Error loading data:", data.error);
              // Use default data if there's an error
              loadDefaultData();
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            // Use default data if fetch fails
            loadDefaultData();
          });
      }

      function loadDefaultData() {
        const defaultData = {
          policyContent:
            "If you wish to cancel your order or booking, please review our policy below:",
          bulletPoints: [
            "Cancellations made within 24 hours of purchase are eligible for a full refund.",
            "Cancellations made after 24 hours but before the service starts may be subject to a partial refund.",
            "No refunds will be issued after the service has started.",
          ],
          faqs: [
            {
              question: "Can I cancel my booking anytime?",
              answer:
                "You can cancel within 24 hours for a full refund. After that, partial refunds may apply.",
            },
            {
              question: "How do I request a cancellation?",
              answer:
                "You can request a cancellation by contacting our support team via email or phone.",
            },
          ],
        };
        updatePolicyContent(defaultData);
      }

      function updatePolicyContent(data) {
        // Update policy intro
        document.getElementById("policy-intro").textContent =
          data.policyContent;

        // Update bullet points
        const bulletsList = document.getElementById("policy-bullets");
        bulletsList.innerHTML = "";

        data.bulletPoints.forEach((point) => {
          const li = document.createElement("li");
          li.textContent = point;
          bulletsList.appendChild(li);
        });

        // Update FAQs
        const faqContainer = document.getElementById("faq-container");
        faqContainer.innerHTML = "";

        data.faqs.forEach((faq) => {
          const questionDiv = document.createElement("div");
          questionDiv.className = "question";
          questionDiv.textContent = faq.question;

          const answerDiv = document.createElement("div");
          answerDiv.className = "answer";
          answerDiv.textContent = faq.answer;

          faqContainer.appendChild(questionDiv);
          faqContainer.appendChild(answerDiv);
        });
      }