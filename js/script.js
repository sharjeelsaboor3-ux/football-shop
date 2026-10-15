
/* ===== Footboots Store JavaScript ===== */

document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    // Product data: keep these values in sync with your HTML cards.
    const products = [
        {
            id: 1,
            name: "Phantom Pro",
            category: "grippers",
            price: 8999,
            image: "img/boot1.png"
        },
        {
            id: 2,
            name: "Velocity Elite",
            category: "grippers",
            price: 11499,
            image: "img/boot2.png"
        },
        {
            id: 3,
            name: "Street Control",
            category: "turf",
            price: 6499,
            image: "img/boot3.png"
        },
        {
            id: 4,
            name: "Future Grip",
            category: "turf",
            price: 7299,
            image: "img/boot4.png"
        }
    ];

    const cards = $$(".product-card");
    const grid = $("#productGrid");

    let activeFilter = "all";
    let searchTerm = "";
    let sortMode = "featured";
    let cart = new Map();
    let wishlist = new Set();
    let toastTimer;

    const money = amount =>
        "Rs. " + amount.toLocaleString("en-PK");

    // ===== Toast Notification =====
    function showToast(message) {
        const toast = $("#toast");

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2400);
    }

    // ===== Mobile Navigation =====
    const menuToggle = $("#menuToggle");
    const navBottom = $("#navBottom");

    function closeMenu() {
        navBottom.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

        menuToggle.setAttribute("aria-expanded", String(!isOpen));
        navBottom.classList.toggle("menu-open", !isOpen);
    });

    $$("#navBottom a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // ===== Search, Filtering and Sorting =====
    function renderProducts() {
        let visibleCards = cards.filter(card => {
            const name = card.dataset.name.toLowerCase();
            const category = card.dataset.category;
            const isSale = card.dataset.sale === "true";

            const matchesSearch = name.includes(searchTerm);
            const matchesFilter =
                activeFilter === "all" ||
                category === activeFilter ||
                (activeFilter === "sale" && isSale);

            return matchesSearch && matchesFilter;
        });

        visibleCards.sort((a, b) => {
            if (sortMode === "price-low") {
                return Number(a.dataset.price) - Number(b.dataset.price);
            }

            if (sortMode === "price-high") {
                return Number(b.dataset.price) - Number(a.dataset.price);
            }

            if (sortMode === "name") {
                return a.dataset.name.localeCompare(b.dataset.name);
            }

            return Number(a.dataset.order) - Number(b.dataset.order);
        });

        // Append in sorted order, without recreating card elements.
        visibleCards.forEach(card => grid.appendChild(card));

        cards.forEach(card => {
            card.hidden = !visibleCards.includes(card);
        });

        $("#resultsCount").textContent =
            `${visibleCards.length} ${visibleCards.length === 1 ? "product" : "products"} found`;

        $("#emptyResults").hidden = visibleCards.length !== 0;
    }

    $("#searchInput").addEventListener("input", event => {
        searchTerm = event.target.value.trim().toLowerCase();
        renderProducts();
    });

    $("#searchForm").addEventListener("submit", event => {
        event.preventDefault();
        searchTerm = $("#searchInput").value.trim().toLowerCase();
        renderProducts();
        $("#products").scrollIntoView({ behavior: "smooth" });
    });

    $$(".filter-btn").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;

            $$(".filter-btn").forEach(btn => {
                const selected = btn === button;
                btn.classList.toggle("active", selected);
                btn.setAttribute("aria-pressed", String(selected));
            });

            renderProducts();
        });
    });

    $$("#navBottom [data-category-link]").forEach(link => {
        link.addEventListener("click", () => {
            const category = link.dataset.categoryLink;

            activeFilter = category;
            searchTerm = "";
            $("#searchInput").value = "";

            $$(".filter-btn").forEach(btn => {
                const selected = btn.dataset.filter === category;
                btn.classList.toggle("active", selected);
                btn.setAttribute("aria-pressed", String(selected));
            });

            renderProducts();
        });
    });

    $("#sortSelect").addEventListener("change", event => {
        sortMode = event.target.value;
        renderProducts();
    });

    $("#resetFilters").addEventListener("click", () => {
        activeFilter = "all";
        searchTerm = "";
        sortMode = "featured";

        $("#searchInput").value = "";
        $("#sortSelect").value = "featured";

        $$(".filter-btn").forEach(btn => {
            const selected = btn.dataset.filter === "all";
            btn.classList.toggle("active", selected);
            btn.setAttribute("aria-pressed", String(selected));
        });

        renderProducts();
    });

    // ===== Shopping Cart =====
    const cartDrawer = $("#cartDrawer");
    const cartBackdrop = $("#cartBackdrop");

    function openCart() {
        cartDrawer.classList.add("open");
        cartBackdrop.classList.add("open");
        cartDrawer.setAttribute("aria-hidden", "false");
        document.body.classList.add("cart-open");
        $("#closeCart").focus();
    }

    function closeCart() {
        cartDrawer.classList.remove("open");
        cartBackdrop.classList.remove("open");
        cartDrawer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("cart-open");
        $("#cartTrigger").focus();
    }

    $("#cartTrigger").addEventListener("click", openCart);
    $("#closeCart").addEventListener("click", closeCart);
    $("#continueShopping").addEventListener("click", closeCart);
    cartBackdrop.addEventListener("click", closeCart);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (cartDrawer.classList.contains("open")) {
                closeCart();
            } else {
                closeMenu();
            }
        }
    });

    function addToCart(id) {
        const product = products.find(item => item.id === id);

        if (!product) return;

        const current = cart.get(id);

        cart.set(id, {
            product,
            quantity: current ? current.quantity + 1 : 1
        });

        renderCart();
        showToast(`${product.name} added to your cart`);
    }

    function changeQuantity(id, amount) {
        const item = cart.get(id);

        if (!item) return;

        item.quantity += amount;

        if (item.quantity <= 0) {
            cart.delete(id);
        } else {
            cart.set(id, item);
        }

        renderCart();
    }

    function renderCart() {
        const container = $("#cartItems");
        container.replaceChildren();

        let totalQuantity = 0;
        let subtotal = 0;

        cart.forEach(({ product, quantity }) => {
            totalQuantity += quantity;
            subtotal += product.price * quantity;

            const item = document.createElement("div");
            item.className = "cart-item";

            const img = document.createElement("img");
            img.src = product.image;
            img.alt = product.name;

            const details = document.createElement("div");

            const title = document.createElement("h3");
            title.textContent = product.name;

            const price = document.createElement("p");
            price.textContent = money(product.price);

            const quantityControl = document.createElement("div");
            quantityControl.className = "quantity-control";

            const minus = document.createElement("button");
            minus.type = "button";
            minus.textContent = "−";
            minus.setAttribute("aria-label", `Remove one ${product.name}`);

            const count = document.createElement("span");
            count.textContent = quantity;

            const plus = document.createElement("button");
            plus.type = "button";
            plus.textContent = "+";
            plus.setAttribute("aria-label", `Add one ${product.name}`);

            minus.addEventListener("click", () =>
                changeQuantity(product.id, -1)
            );

            plus.addEventListener("click", () =>
                changeQuantity(product.id, 1)
            );

            quantityControl.append(minus, count, plus);
            details.append(title, price, quantityControl);

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "remove-item";
            remove.textContent = "Remove";
            remove.setAttribute("aria-label", `Remove ${product.name}`);

            remove.addEventListener("click", () => {
                cart.delete(product.id);
                renderCart();
                showToast(`${product.name} removed`);
            });

            item.append(img, details, remove);
            container.appendChild(item);
        });

        $("#cartCount").textContent = totalQuantity;
        $("#drawerCount").textContent = `(${totalQuantity})`;
        $("#cartTotal").textContent = money(subtotal);

        $("#cartEmpty").hidden = totalQuantity > 0;
        $("#cartSummary").hidden = totalQuantity === 0;
    }

    // Add-to-cart buttons
    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-add]");

        if (button) {
            addToCart(Number(button.dataset.add));
        }
    });

    // ===== Wishlist =====
    grid.addEventListener("click", event => {
        const button = event.target.closest(".wishlist-btn");

        if (!button) return;

        const card = button.closest(".product-card");
        const product = products.find(
            item => item.name === card.dataset.name
        );

        if (!product) return;

        if (wishlist.has(product.id)) {
            wishlist.delete(product.id);
            button.setAttribute("aria-pressed", "false");
            button.textContent = "♡";
            showToast(`${product.name} removed from wishlist`);
        } else {
            wishlist.add(product.id);
            button.setAttribute("aria-pressed", "true");
            button.textContent = "♥";
            showToast(`${product.name} added to wishlist`);
        }

        $("#wishlistCount").textContent = wishlist.size;
    });

    // ===== Scroll Reveal =====
    const revealElements = $$(".reveal");

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12
        });

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    } else {
        revealElements.forEach(element => {
            element.classList.add("visible");
        });
    }

    // ===== Back to Top =====
    const backToTop = $("#backToTop");

    window.addEventListener("scroll", () => {
        backToTop.classList.toggle("visible", window.scrollY > 450);
    }, { passive: true });

    backToTop.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    $(".back-top").addEventListener("click", event => {
        event.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // ===== Demo Checkout =====
    $("#checkoutBtn").addEventListener("click", () => {
        showToast("Checkout is not connected yet. Add a payment backend.");
    });

    // ===== Footer Year =====
    $("#currentYear").textContent = new Date().getFullYear();

    // Initial render
    renderProducts();
    renderCart();
});
