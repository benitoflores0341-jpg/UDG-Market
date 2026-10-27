
class UDGMarketSearch extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.suggestions = [
      { name: "Pastel de chocolate", type: "Comida" },
      { name: "Tacos de guisado", type: "Comida" },
      { name: "Pan dulce", type: "Panadería" },
      { name: "Café y bebidas", type: "Bebidas" },
      { name: "Fruta fresca", type: "Frutas" },
      { name: "Kit de útiles escolares", type: "Artículos" },
      { name: "Libretas y cuadernos", type: "Artículos" },
      { name: "Audífonos", type: "Artículos" },
      { name: "Accesorios tecnológicos", type: "Artículos" },
      { name: "Mochilas", type: "Artículos" }
    ];

    this.categories = [
      "Panadería",
      "Comida Rápida",
      "Bebidas",
      "Frutas",
      "Artículos y accesorios"
    ];

    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  connectedCallback() {
    // Evita renderizar dos veces el componente.
    if (this.shadowRoot.querySelector(".container")) return;

    this.render();
    this.bindEvents();
    document.addEventListener("click", this.handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.handleOutsideClick);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: #212930;
          font-family: Arial, sans-serif;
          --arena: #E8DFD8;
          --cream: #F8F4F0;
          --terracotta: #D04836;
          --navy: #212930;
          --border: #D3C7BC;
        }

        * { box-sizing: border-box; }

        .container {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          padding: 18px 16px;
        }

        .search-wrap { position: relative; }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--cream);
          box-shadow: 0 2px 5px #2129300A;
          transition: border-color .2s, box-shadow .2s;
        }

        .search-box:focus-within {
          border-color: var(--terracotta);
          box-shadow: 0 0 0 3px #D048361A;
        }

        .search-icon {
          color: var(--terracotta);
          font-size: 20px;
          flex-shrink: 0;
        }

        input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--navy);
          font-size: 13px;
        }

        input::placeholder { color: #85827F; }

        .clear {
          border: 0;
          background: transparent;
          color: #777;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
        }

        .clear[hidden] { display: none; }

        .suggestions {
          position: absolute;
          z-index: 10;
          top: calc(100% + 7px);
          left: 0;
          right: 0;
          background: var(--cream);
          border: 1px solid var(--border);
          border-radius: 15px;
          box-shadow: 0 12px 28px #2129301C;
          overflow: hidden;
        }

        .suggestions[hidden] { display: none; }

        .suggestion-heading {
          padding: 12px 14px 7px;
          color: #77746F;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .suggestion {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 14px;
          border: 0;
          border-top: 1px solid #EAE1DA;
          background: transparent;
          color: var(--navy);
          text-align: left;
          cursor: pointer;
          font-size: 12px;
        }

        .suggestion:hover,
        .suggestion:focus-visible {
          background: var(--arena);
          outline: none;
        }

        .suggestion-icon {
          color: var(--terracotta);
          font-size: 16px;
        }

        .suggestion-name { flex: 1; }

        .suggestion-type {
          color: #77746F;
          font-size: 10px;
        }

        .empty {
          padding: 14px;
          color: #77746F;
          font-size: 12px;
        }

        .section-label {
          margin: 22px 0 11px;
          font-size: 10px;
          font-weight: 800;
          color: #6B6A67;
          letter-spacing: .8px;
          text-transform: uppercase;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 9px 12px;
          border: 1px solid transparent;
          border-radius: 999px;
          font-family: Georgia, serif;
          font-size: 12px;
          font-style: italic;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          transition: transform .15s, filter .15s;
        }

        .chip:hover {
          transform: translateY(-1px);
          filter: brightness(.97);
        }

        .chip:nth-child(1) {
          background: #F8DED5;
          border-color: #EDBDAE;
        }

        .chip:nth-child(2) {
          background: #F8E7BF;
          border-color: #EBD39A;
        }

        .chip:nth-child(3) {
          background: #D7E9D9;
          border-color: #B7D4BD;
        }

        .chip:nth-child(4) {
          background: #E7DDEF;
          border-color: #D0BDE0;
        }

        .chip:nth-child(5) {
          background: #D9E8E5;
          border-color: #B5D2CC;
        }

        @media (max-width: 360px) {
          .container { padding: 14px 12px; }
          .chip { padding: 8px 10px; }
        }
      </style>

      <div class="container">
        <div class="search-wrap">
          <div class="search-box">
            <span class="search-icon" aria-hidden="true">⌕</span>

            <input
              id="search"
              type="search"
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              aria-autocomplete="list"
              aria-controls="suggestions"
              aria-expanded="false"
              autocomplete="off"
            >

            <button
              class="clear"
              id="clear"
              type="button"
              aria-label="Limpiar búsqueda"
              hidden
            >×</button>
          </div>

          <div
            id="suggestions"
            class="suggestions"
            role="listbox"
            aria-label="Sugerencias"
            hidden
          ></div>
        </div>

        <p class="section-label">Búsquedas frecuentes</p>
        <div class="chips" id="categories"></div>
      </div>
    `;
  }

  bindEvents() {
    const input = this.shadowRoot.querySelector("#search");
    const panel = this.shadowRoot.querySelector("#suggestions");
    const clear = this.shadowRoot.querySelector("#clear");
    const chips = this.shadowRoot.querySelector("#categories");

    this.categories.forEach(category => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "chip";
      button.textContent = category;

      button.addEventListener("click", () => {
        input.value = category;
        clear.hidden = false;
        this.showSuggestions(category);
        input.focus();

        this.dispatchEvent(new CustomEvent("category-select", {
          detail: { category },
          bubbles: true,
          composed: true
        }));
      });

      chips.appendChild(button);
    });

    input.addEventListener("input", () => {
      clear.hidden = !input.value;
      this.showSuggestions(input.value);

      this.dispatchEvent(new CustomEvent("search-input", {
        detail: { query: input.value },
        bubbles: true,
        composed: true
      }));
    });

    clear.addEventListener("click", () => {
      input.value = "";
      clear.hidden = true;
      this.showSuggestions("");
      input.focus();

      input.dispatchEvent(new Event("input", {
        bubbles: true
      }));
    });

    input.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
      }
    });
  }

  handleOutsideClick(event) {
    if (!event.composedPath().includes(this)) {
      const panel = this.shadowRoot.querySelector("#suggestions");
      const input = this.shadowRoot.querySelector("#search");

      if (panel && input) {
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
      }
    }
  }

  normalize(text) {
    return text
      .toLocaleLowerCase("es-MX")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  showSuggestions(query) {
    const input = this.shadowRoot.querySelector("#search");
    const panel = this.shadowRoot.querySelector("#suggestions");
    const term = this.normalize(query.trim());

    panel.replaceChildren();

    if (!term) {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }

    const matches = this.suggestions.filter(item => {
      return this.normalize(item.name).includes(term) ||
        this.normalize(item.type).includes(term);
    }).slice(0, 6);

    const heading = document.createElement("div");
    heading.className = "suggestion-heading";
    heading.textContent = "Sugerencias";
    panel.appendChild(heading);

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Sin sugerencias para esta búsqueda.";
      panel.appendChild(empty);
    } else {
      matches.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "suggestion";
        button.setAttribute("role", "option");

        const icon = document.createElement("span");
        icon.className = "suggestion-icon";
        icon.textContent =
          item.type === "Artículos" ? "▣" : "⌕";

        const name = document.createElement("span");
        name.className = "suggestion-name";
        name.textContent = item.name;

        const type = document.createElement("span");
        type.className = "suggestion-type";
        type.textContent = item.type;

        button.append(icon, name, type);

        button.addEventListener("click", () => {
          input.value = item.name;
          panel.hidden = true;
          input.setAttribute("aria-expanded", "false");

          this.shadowRoot.querySelector("#clear").hidden = false;

          this.dispatchEvent(new CustomEvent("suggestion-select", {
            detail: {
              query: item.name,
              type: item.type
            },
            bubbles: true,
            composed: true
          }));
        });

        panel.appendChild(button);
      });
    }

    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
}

if (!customElements.get("udg-market-search")) {
  customElements.define("udg-market-search", UDGMarketSearch);
}
