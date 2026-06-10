// Add product
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('prodName').value);
    formData.append('price', document.getElementById('prodPrice').value);
    formData.append('category', document.getElementById('prodCategory').value);
    formData.append('stock_status', document.getElementById('prodStock').value);
    formData.append('description', document.getElementById('prodDesc').value);
    formData.append('image', document.getElementById('prodImage').files[0]);
    
    const response = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        body: formData
    });
    
    if (response.ok) {
        alert('Product added successfully!');
        document.getElementById('addProductForm').reset();
        loadProductsForAdmin();
    } else {
        alert('Error adding product');
    }
});

// Load products for admin
async function loadProductsForAdmin() {
    const response = await fetch('http://localhost:3000/api/products');
    const products = await response.json();
    
    const tbody = document.getElementById('productsList');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = product.id;
        row.insertCell(1).textContent = product.name;
        row.insertCell(2).textContent = `GHS ${product.price}`;
        
        const statusCell = row.insertCell(3);
        const select = document.createElement('select');
        select.innerHTML = `
            <option value="In Stock" ${product.stock_status === 'In Stock' ? 'selected' : ''}>In Stock</option>
            <option value="Out of Stock" ${product.stock_status === 'Out of Stock' ? 'selected' : ''}>Out of Stock</option>
        `;
        select.onchange = () => updateStockStatus(product.id, select.value);
        statusCell.appendChild(select);
        
        const actionCell = row.insertCell(4);
        actionCell.innerHTML = '<span style="color:#ffd700;">✓ Updated</span>';
    });
}

// Update stock status
async function updateStockStatus(productId, status) {
    const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_status: status })
    });
    
    if (response.ok) {
        alert('Stock status updated!');
    }
}

// Load orders
async function loadOrders() {
    const response = await fetch('http://localhost:3000/api/orders');
    const orders = await response.json();
    
    const tbody = document.getElementById('ordersList');
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = order.customer_name;
        row.insertCell(1).textContent = order.customer_phone;
        row.insertCell(2).textContent = order.customer_location;
        row.insertCell(3).textContent = order.product_name;
        row.insertCell(4).textContent = order.quantity;
        row.insertCell(5).textContent = `GHS ${order.total_price}`;
        row.insertCell(6).textContent = new Date(order.order_date).toLocaleDateString();
    });
}

// Initial load
loadProductsForAdmin();