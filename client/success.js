const urlParams = new URLSearchParams(window.location.search);
const paymentIntentId = urlParams.get("payment_intent");
const purchasedItems = JSON.parse(localStorage.getItem("cart")) || [];

if (paymentIntentId) {
  fetch(`http://localhost:4242/payment-status?payment_intent=${paymentIntentId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("✅ Payment status received:", data); // Debugging log

      const messageElement = document.querySelector("#payment-message"); 
      if (!messageElement) {
        console.error("❌ Error: Element with id 'payment-message' not found.");
        return;
      }

      if (data.status === "succeeded") {
        messageElement.textContent = "🎉 Your payment was successful! Thank you for your order.";
        displayOrder(purchasedItems, data.amount_received); 
      } else {
        messageElement.textContent = "⏳ Payment is still processing. Please wait...";
      }
      localStorage.removeItem("cart");
    })
    .catch(error => {
      console.error("❌ Error fetching payment status:", error);
      document.querySelector("#payment-message").textContent = "⚠️ Error fetching payment details. Please try again.";
    });
} else {
  console.error("❌ No payment_intent found in URL.");
}

function displayOrder(items, totalPrice){
  console.log(items); 
  const orderSummary = document.getElementById("order-summary");
  let orderHTML = "<ul>";
  items.forEach(item => {
    orderHTML += `
      <li>
        <strong>${item.name}</strong> (x${item.quantity}) - $${((item.price * item.quantity) / 100).toFixed(2)}
      </li>
    `;
  });
  orderHTML += `</ul><h3>Total Paid: $${(totalPrice / 100).toFixed(2)}</h3>`;

  orderSummary.innerHTML = orderHTML;
}
