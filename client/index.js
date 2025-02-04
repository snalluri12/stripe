const stripe = Stripe("pk_test_51QniplRpvl1KLhfeoT0xusJyeE4n6LKNkAdrAcitvWYwJojCW6gEjPAiHDt8e4cY2Xl76tH658gSz2qLp09gEc0j005upgjVb8");
let elements;
let clientSecret;
let cart = []; 
let cartButton = document.getElementById("cart-button"); 
let cartDropdown = document.getElementById("cart-dropdown"); 
let cartitems = document.getElementById("cart-items"); 
let cartCount = document.getElementById("cart-count"); 

// Fetch products from the backend
fetch("http://localhost:4242/products")
  .then(response => response.json())
  .then(products => {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";
    products.forEach(product => {
      const productDiv = document.createElement("div");
      productDiv.classList.add("product-item");
      productDiv.innerHTML = `
        <img src="images/${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p><strong>Price:</strong> $${(product.price / 100).toFixed(2)}</p>
        <button onclick="addToCart('${product.id}', '${product.name}', ${product.price})">Add to Cart</button>
      `;
      productList.appendChild(productDiv);
    });
  })
  .catch(error => console.error("Error loading products:", error));


/*syncronous function to add to cart */
function addToCart(id, name, price) {
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart)); 
  updateCartUI();
  listCartItems()
}

/*syncronous function to update cart UI with the products in the cart */
function updateCartUI() {
  // disable checkout button until there is an item in the cart 
  document.getElementById("submit").disabled = true;
  const cartItemsDiv = document.getElementById("cart-items");
  cartItemsDiv.innerHTML = "";
  cart.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.innerHTML = `
      <p>${item.name} (x${item.quantity}) - $${((item.price * item.quantity) / 100).toFixed(2)}</p>
      <button onclick="removeFromCart('${item.id}')">Remove</button>`;
      cartItemsDiv.appendChild(itemDiv);
  });
  // Update cart number 
  cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0); 
  // Enable checkout button only if there is something in the cart 
  const checkoutButton = document.getElementById("submit");
  if(cartCount.textContent > 0 && checkoutButton){
    document.getElementById("submit").disabled = false;
  }
}

/*syncronous function to remove items from cart */
function removeFromCart(id) {
  const item_index = cart.findIndex(item => item.id === id)
  if(cart[item_index].quantity == 1){
    cart = cart.filter(item => item.id !== id);
  }
  else if(cart[item_index].quantity > 1){
    cart[item_index].quantity -= 1; 
  }
  localStorage.setItem("cart", JSON.stringify(cart)); 
  updateCartUI();
  listCartItems();
}

/*syncronous function to list items in cart outside under payment button */
function listCartItems(){
  const paymentSummaryDiv = document.getElementById("payment-summary");
  let summaryHTML = `<h3>Order Summary</h3><ul>`;
  let totalPrice = 0;

  cart.forEach(item => {
    totalPrice += item.price * item.quantity;
    summaryHTML += `
      <p>${item.name} (x${item.quantity}) - $${((item.price * item.quantity) / 100).toFixed(2)}</p>
      <button onclick="removeFromCart('${item.id}')">Remove</button>`;
  });

  summaryHTML += `</ul><h4>Total: $${(totalPrice / 100).toFixed(2)}</h4>`;
  paymentSummaryDiv.innerHTML = summaryHTML;
}
/* Asynchronous function to initialize payment with server*/
async function initializePayment() {
  if (cart.length === 0) {
      console.error("Cart is empty. Cannot proceed to checkout.");
      document.getElementById("payment-message").textContent = "Add items to the cart before checkout.";
      return;
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const response = await fetch("http://localhost:4242/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart })
  });

  if (!response.ok) {
      console.error("Error:", response.status);
      const errorData = await response.json();
      return;
  }

  const responseData = await response.json();
  clientSecret = responseData.clientSecret;

  if (!clientSecret) {
      console.error("Error: No clientSecret received from server.");
      return;
  }

  // show cart items before payment: 
  listCartItems(); 
  
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    }
  };

  // Stripe payment implemented
  elements = stripe.elements({ clientSecret, appearance });
  const options = { /* options */ };
  const paymentElement = elements.create("payment", options);
  paymentElement.mount("#payment-element");

  document.getElementById("submit").disabled = false;
}

/* Asynchronous function to send payment data to server*/
async function handlePaymentSubmit(event) {
  event.preventDefault();

  if (!clientSecret) {
    console.error("Cannot submit payment, clientSecret is missing.");
    document.getElementById("payment-message").textContent = "Error: Payment session expired. Try again.";
    return;
  }
  
  try {
    await elements.submit();
  } catch (submitError) {
    console.error("Error submitting form:", submitError.message);
    document.getElementById("payment-message").textContent = submitError.message;
    return;
  }

  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret: clientSecret,
    confirmParams: { return_url: window.location.origin + "/success.html" },
  });

  if (error) {
    console.error("Payment error:", error.message);
    if(error.type == "canceled_payment"){
      window.location.href = "/canceled.html";
    }
    else{
      document.getElementById("payment-message").textContent = error.message;
    }
    
  }
}

/* Event listeners */
// Refreshing the page updates the cart to empty 
document.addEventListener("DOMContentLoaded", () => {
  updateCartUI();
});

//toggle dropdown when clicking cart 
cartButton.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent closing immediately
    cartDropdown.classList.toggle("show");
});

//remove the dropdown when you click outside 
document.addEventListener("click", (event) => {
  if (!cartButton.contains(event.target) && !cartDropdown.contains(event.target)) {
    cartDropdown.classList.remove("show");
  }
});

//Checkout button exists when page is loaded 
document.addEventListener("DOMContentLoaded", () => {
  const checkoutButton = document.getElementById("submit");
  let paymentInit = false; 
  if(checkoutButton){
    checkoutButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!paymentInit) {
        await initializePayment();
        checkoutButton.innerText = "Pay";
        paymentInit = true; 
      } else {
        handlePaymentSubmit(event);
      }
    });
  }
  else{
    console.error("checkout button not found"); 
  }
  }
);
