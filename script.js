// PAYSTACK PUBLIC KEY - Get from https://dashboard.paystack.com/#/settings/developer
// For testing, use this test key. Replace with your live key when ready.
const PAYSTACK_PUBLIC_KEY = 'pk_live_07d9097f29652e2b24c1270737198445238cda8b';

// For production, get your actual key from Paystack dashboard
// const PAYSTACK_PUBLIC_KEY = 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

let currentProduct = null;

// Load products from server
async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-grid').innerHTML = '<p style="text-align:center;color:#ffd700;">Error loading products. Make sure server is running.</p>';
    }
}

// Display products
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#ffd700;">No products available. Add some from admin dashboard.</p>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p style="color:#aaa; font-size:0.9rem;">${product.description || ''}</p>
                <div class="product-price">GHS ${product.price}</div>
                <span class="product-stock ${product.stock_status === 'In Stock' ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock_status}
                </span>
                <button class="buy-btn" onclick="openOrderModal(${product.id}, '${product.name}', ${product.price})">
                    ${product.stock_status === 'In Stock' ? 'Order Now' : 'Out of Stock'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Open order modal
function openOrderModal(id, name, price) {
    // Check if product is in stock by checking the button text in the current product card
    // We'll use the stock status from the product data
    
    currentProduct = { id, name, price };
    document.getElementById('productId').value = id;
    document.getElementById('productName').value = name;
    document.getElementById('productPrice').value = price;
    
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    document.getElementById('totalAmount').textContent = (price * quantity).toFixed(2);
    document.getElementById('orderModal').style.display = 'block';
}

// Update total when quantity changes
document.getElementById('quantity').addEventListener('input', function() {
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(this.value) || 1;
    document.getElementById('totalAmount').textContent = (price * quantity).toFixed(2);
});

// Submit order
document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerLocation = document.getElementById('customerLocation').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const productId = document.getElementById('productId').value;
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const totalPrice = quantity * productPrice;
    
    // Validate inputs
    if (!customerName || !customerPhone || !customerLocation) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.pay-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    try {
        // Save order to database
        const orderResponse = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_location: customerLocation,
                product_id: productId,
                product_name: productName,
                quantity: quantity,
                total_price: totalPrice
            })
        });
        
        if (orderResponse.ok) {
            // Initialize Paystack payment
            payWithPaystack(customerName, customerPhone, customerLocation, productName, quantity, totalPrice);
        } else {
            alert('Error saving order. Please try again.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error connecting to server. Make sure server is running.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Paystack payment integration
function payWithPaystack(name, phone, location, product, quantity, amount) {
    // Check if Paystack is loaded
    if (typeof PaystackPop === 'undefined') {
        console.error('Paystack not loaded');
        alert('Payment system is loading. Please refresh the page and try again.');
        return;
    }
    
    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: `${phone}@customer.eyfelghana.com`,
        amount: Math.round(amount * 100), // Paystack uses kobo/pesewas (multiply by 100)
        currency: 'GHS',
        ref: 'EYFEL_' + Date.now() + '_' + Math.floor(Math.random() * 1000000),
        metadata: {
            custom_fields: [
                { display_name: "Customer Name", variable_name: "customer_name", value: name },
                { display_name: "Phone", variable_name: "phone", value: phone },
                { display_name: "Location", variable_name: "location", value: location },
                { display_name: "Product", variable_name: "product", value: product },
                { display_name: "Quantity", variable_name: "quantity", value: quantity.toString() }
            ]
        },
        callback: function(response) {
            // Payment successful
            console.log('Payment successful:', response);
            alert('✅ Payment successful! Your order has been confirmed.\nYou will receive a confirmation call shortly.\nReference: ' + response.reference);
            
            // Reset form and close modal
            document.getElementById('orderModal').style.display = 'none';
            document.getElementById('orderForm').reset();
            document.getElementById('quantity').value = 1;
        },
        onClose: function() {
            // Payment window closed without completing
            console.log('Payment window closed');
            alert('Payment was not completed. You can try again when ready.');
            
            // Re-enable button
            const submitBtn = document.querySelector('.pay-btn');
            if (submitBtn) {
                submitBtn.textContent = 'Proceed to Pay with Paystack';
                submitBtn.disabled = false;
            }
        }
    });
    handler.openIframe();
}

// Close modal
document.querySelector('.close').onclick = () => {
    document.getElementById('orderModal').style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == document.getElementById('orderModal')) {
        document.getElementById('orderModal').style.display = 'none';
    }
};

// Category filtering
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.dataset.category;
        const response = await fetch('http://localhost:3000/api/products');
        let products = await response.json();
        
        if (category !== 'all') {
            products = products.filter(p => p.category === category);
        }
        displayProducts(products);
    });
});

// Load products on page load
loadProducts();

console.log('Paystack script loaded?', typeof PaystackPop !== 'undefined' ? 'Yes' : 'No');