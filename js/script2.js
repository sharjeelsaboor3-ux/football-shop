
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const productSection = $("main > section:nth-child(2)");
  const cartSidebar = $("aside");

  if (!productSection || !cartSidebar) {
    console.error("FootBoots: product section or cart sidebar not found.");
    return;
  }

  // Each direct child span inside a product row represents a product.
  const productSlots = $$(
    ":scope > div > span",
    productSection
  ).filter(slot => $("article", slot));

  const products = productSlots.map((slot, index) => {
    const article = $("article", slot);
    const image = $("img", article);

    const heading = $("h3", article);
    const titleLink = $("strong a", article);

    const name =
      heading?.textContent.trim() ||
      titleLink?.textContent.trim() ||
      $$("p", article)
        .map(p => p.textContent.trim())
        .find(text => text && !text.startsWith("$")) ||
      `Football Boots ${index + 1}`;

    const priceElement = $("strong", article);
    const priceText =
      priceElement?.textContent.trim() ||
      $$("p", article)
        .map(p => p.textContent.trim())
        .find(text => text.includes("$")) ||
      "0";

    const originalPriceText = $("del", article)?.textContent || "";

    const price =
      Number(priceText.replace(/[^0-9.]/g, "")) || 0;

    const originalPrice =
      Number(originalPriceText.replace(/[^0-9.]/g, "")) || 0;

    // Ignore empty image URLs and broken placeholder images.
    const imageURL = image?.getAttribute("src") || "";

    return {
      id: index + 1,
      name,
      price,
      originalPrice,
      image: imageURL,
      article,
      slot
    };
  });

  const cart = new Map();
  const wishlist = new Set();

  let toastTimer;

  const money = value =>
    "$" + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  // Set up product cards and attach accessible button labels.
  products.forEach(product => {
    product.article.dataset.productId = product.id;

    const buttons = $$("button", product.article);

    buttons.forEach(button => {
      button.type = "button";
    });

    const addButton = buttons.find(button =>
      button.textContent.toLowerCase().includes("add to cart")
    );

    if (addButton) {
      addButton.classList.add("add-to-cart");
      addButton.dataset.productId = product.id;
    }

    // Existing heart buttons, including the heart in a list.
    const heartCandidates = [
      ...$$("button", product.article),
      ...$$("li", product.article)
    ];

    heartCandidates.forEach(element => {
      if (element.dataset.heartReady) return;

      const heartText = element.textContent.trim();

      const isHeart =
        heartText === "♡" ||
        heartText === "♥";

      if (!isHeart || element.tagName !== "BUTTON") return;

      element.dataset.heartReady = "true";
      element.classList.add("wishlist-button");
      element.setAttribute(
        "aria-label",
        "Add " + product.name + " to wishlist"
      );
    });

    // Show missing images as neutral product placeholders.
    $$("img", product.article).forEach(img => {
      img.addEventListener("error", () => {
        img.style.visibility = "hidden";
      });

      if (!img.getAttribute("src")) {
        img.style.visibility = "hidden";
      }
    });
  });

  // Create the backdrop and notification.
  const backdrop = document.createElement("div");
  backdrop.className = "cart-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.appendChild(backdrop);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  // Create cart content elements.
  let emptyMessage = $("h3", cartSidebar);

  if (emptyMessage) {
    emptyMessage.id = "cartEmpty";
    emptyMessage.textContent = "Your cart is empty";
  }

  const cartItems = document.createElement("div");
  cartItems.id = "cartItems";

  if (emptyMessage) {
    emptyMessage.after(cartItems);
  } else {
    cartSidebar.appendChild(cartItems);
  }

  const cartFooter = document.createElement("div");
  cartFooter.className = "cart-footer";

  cartFooter.innerHTML = `
    <div class="cart-total">
      <span>Total</span>
      <span id="cartTotal">$0</span>
    </div>
    <button id="checkoutBtn" type="button">Checkout</button>
  `;

  cartSidebar.appendChild(cartFooter);

  // Open and close the cart.
  function openCart() {
    cartSidebar.classList.add("open");
    backdrop.classList.add("open");
    document.body.classList.add("cart-open");
    cartSidebar.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    cartSidebar.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.classList.remove("cart-open");
    cartSidebar.setAttribute("aria-hidden", "true");
  }

  // Make the existing cart link open the sidebar.
  const cartLink = $('#lower_navbar a[href="cart"]');

  if (cartLink) {
    cartLink.href = "#cart";
    cartLink.setAttribute("aria-label", "Open shopping cart");

    cartLink.addEventListener("click", event => {
      event.preventDefault();
      openCart();
    });
  }

  backdrop.addEventListener("click", closeCart);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCart();
  });

  // Add an item to the cart.
  function addToCart(id) {
    const product = products.find(item => item.id === id);

    if (!product) return;

    const current = cart.get(id);

    if (current) {
      current.quantity += 1;
    } else {
      cart.set(id, {
        product,
        quantity: 1
      });
    }

    renderCart();
    showToast(product.name + " added to cart");
  }

  function changeQuantity(id, change) {
    const item = cart.get(id);

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
      cart.delete(id);
    }

    renderCart();
  }

  function renderCart() {
    cartItems.replaceChildren();

    let total = 0;
    let count = 0;

    cart.forEach(({ product, quantity }, id) => {
      total += product.price * quantity;
      count += quantity;

      const row = document.createElement("div");
      row.className = "cart-item";

      const image = document.createElement("img");
      image.alt = product.name;
      image.src = product.image || "data:,";
      image.addEventListener("error", () => {
        image.style.visibility = "hidden";
      });

      const details = document.createElement("div");

      const title = document.createElement("h4");
      title.textContent = product.name;

      const price = document.createElement("p");
      price.textContent = money(product.price * quantity);

      const controls = document.createElement("div");
      controls.className = "quantity-control";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease quantity");
      minus.addEventListener("click", () => changeQuantity(id, -1));

      const amount = document.createElement("span");
      amount.textContent = quantity;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase quantity");
      plus.addEventListener("click", () => changeQuantity(id, 1));

      controls.append(minus, amount, plus);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.textContent = "Remove";

      remove.addEventListener("click", () => {
        cart.delete(id);
        renderCart();
        showToast("Item removed");
      });

      details.append(title, price, controls, remove);
      row.append(image, details);
      cartItems.appendChild(row);
    });

    if (emptyMessage) {
      emptyMessage.hidden = count > 0;
    }

    $("#cartTotal").textContent = money(total);

    // Show the item count by the cart icon.
    if (cartLink) {
      let badge = $(".cart-count", cartLink);

      if (!badge) {
        badge = document.createElement("span");
        badge.className = "cart-count";

        Object.assign(badge.style, {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          marginLeft: "5px",
          borderRadius: "50%",
          background: "#b8f34a",
          color: "#111",
          fontSize: "11px",
          fontWeight: "800"
        });

        cartLink.appendChild(badge);
      }

      badge.textContent = count;
      badge.hidden = count === 0;

      cartLink.setAttribute(
        "aria-label",
        `Shopping cart, ${count} items`
      );
    }
  }

  // Handle product buttons with one event listener.
  productSection.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const article = button.closest("article");

    if (!article) return;

    const id = Number(article.dataset.productId);
    const product = products.find(item => item.id === id);

    if (!product) return;

    if (button.classList.contains("add-to-cart")) {
      addToCart(id);
      return;
    }

    if (button.classList.contains("wishlist-button")) {
      if (wishlist.has(id)) {
        wishlist.delete(id);
        button.classList.remove("wishlisted");
        button.textContent = "♡";
        showToast("Removed from wishlist");
      } else {
        wishlist.add(id);
        button.classList.add("wishlisted");
        button.textContent = "♥";
        showToast("Added to wishlist");
      }
    }
  });

  // Search by product name.
  const searchInput = $('#lower_navbar input[type="text"]');

  if (searchInput) {
    searchInput.setAttribute("aria-label", "Search football boots");

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();

      products.forEach(product => {
        const matches = product.name.toLowerCase().includes(query);
        product.slot.hidden = !matches;
      });
    });
  }

  // Show wishlist items when the heart link in the navbar is clicked.
  const wishlistLink = $('#lower_navbar a[href="wishlist"]');

  if (wishlistLink) {
    wishlistLink.addEventListener("click", event => {
      event.preventDefault();

      products.forEach(product => {
        product.slot.hidden = !wishlist.has(product.id);
      });

      showToast(
        wishlist.size
          ? `Showing ${wishlist.size} wishlist item(s)`
          : "Your wishlist is empty"
      );

      productSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Demo checkout only; no real order or payment is created.
  $("#checkoutBtn").addEventListener("click", () => {
    if (cart.size === 0) {
      showToast("Your cart is empty");
      return;
    }

    showToast("Checkout is not connected yet");
  });

  // Prevent placeholder links from jumping to the top.
  $$('a[href="findstore"], a[href="join_us"], a[href="help"]').forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showToast("This page is not available yet");
    });
  });

  // Initial state.
  cartSidebar.setAttribute("aria-hidden", "true");
  renderCart();

  console.log("FootBoots script2.js loaded successfully.");
});
